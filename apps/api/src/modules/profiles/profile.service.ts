import { randomInt } from 'node:crypto';
import {
  PROFILE_LIMITS,
  USERNAME_PATTERN,
  type MyCreatorProfile,
  type ProfileLink,
  type ProfileProject,
  type PublicCreatorProfile,
  type SkillCategory,
  type SkillRef,
  type UsernameCheck,
} from '@jobtok/types';
import type { z } from 'zod';
import type { Db } from '../../db/client.js';
import { slugify } from '../../db/seed-data.js';
import { Prisma } from '../../generated/prisma/client.js';
import { HttpError } from '../../lib/http.js';
import {
  profileInclude,
  toLink,
  toMyProfile,
  toProject,
  toPublicProfile,
  toSkillRef,
  type ProfileRow,
} from './profile.presenters.js';
import {
  USERNAME_FORMAT_MESSAGE,
  isReservedUsername,
  normalizeUsername,
} from './profile.validation.js';
import type {
  addLinkSchema,
  addSkillSchema,
  profileUpdateSchema,
  projectCreateSchema,
  projectUpdateSchema,
  skillSearchSchema,
} from './profile.validation.js';

type ProfileUpdateInput = z.output<typeof profileUpdateSchema>;
type AddSkillInput = z.output<typeof addSkillSchema>;
type AddLinkInput = z.output<typeof addLinkSchema>;
type ProjectCreateInput = z.output<typeof projectCreateSchema>;
type ProjectUpdateInput = z.output<typeof projectUpdateSchema>;
type SkillSearch = z.output<typeof skillSearchSchema>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/**
 * My Work: real videos only, meaning uploaded, checked by our pipeline and published.
 * Private ones appear on the owner's own profile only.
 */
const VIDEO_WHERE = {
  isPublished: true,
  isFlagged: false,
  status: 'ready',
  videoStorageKey: { not: null },
  postType: { in: ['showcase', 'project'] },
} satisfies Prisma.PostWhereInput;
const MAX_PROFILE_VIDEOS = 30;

function isUniqueViolation(err: unknown, field?: string): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') return false;
  if (!field) return true;
  return JSON.stringify(err.meta ?? {}).includes(field);
}

const notFound = () => new HttpError(404, 'profile_not_found', 'We couldn’t find that profile.');

/** Profile, skill, link and project rules. Every write is scoped to the caller's own profile. */
export class ProfileService {
  constructor(
    private readonly db: Db,
    /** Signs thumbnail URLs; absent when video storage isn't configured. */
    private readonly mediaUrl: (key: string) => string | null = () => null,
  ) {}

  // ─── Reading ────────────────────────────────────────────────────────────────

  private async videosFor(userId: string, { includePrivate }: { includePrivate: boolean }) {
    const where: Prisma.PostWhereInput = {
      userId,
      ...VIDEO_WHERE,
      ...(includePrivate ? {} : { visibility: 'public' }),
    };
    const [items, total] = await Promise.all([
      this.db.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: MAX_PROFILE_VIDEOS,
        select: {
          id: true,
          title: true,
          thumbnailStorageKey: true,
          videoDurationSeconds: true,
          visibility: true,
          createdAt: true,
        },
      }),
      this.db.post.count({ where }),
    ]);
    return {
      items: items.map((v) => ({
        id: v.id,
        title: v.title,
        thumbnailUrl: v.thumbnailStorageKey ? this.mediaUrl(v.thumbnailStorageKey) : null,
        videoDurationSeconds: v.videoDurationSeconds,
        visibility: v.visibility,
        createdAt: v.createdAt,
      })),
      total,
    };
  }

  private async mine(row: ProfileRow): Promise<MyCreatorProfile> {
    return toMyProfile(
      row,
      await this.videosFor(row.userId, { includePrivate: true }),
      this.mediaUrl,
    );
  }

  private loadByUser(userId: string) {
    return this.db.profile.findUnique({ where: { userId }, include: profileInclude });
  }

  /** The caller's own profile, or null if they haven't started one yet. */
  async getMine(userId: string): Promise<MyCreatorProfile | null> {
    const row = await this.loadByUser(userId);
    return row ? this.mine(row) : null;
  }

  /**
   * Anyone can view a creator by profile id or username. Only accounts with a verified phone
   * (trust) that aren't suspended are public; everyone else looks like "not found".
   */
  private async publicRow(handle: string) {
    const key = handle.trim().toLowerCase();
    const row = await this.db.profile.findUnique({
      where: UUID.test(key) ? { id: key } : { username: key },
      include: profileInclude,
    });
    if (!row || !row.user.isPhoneVerified || row.user.isSuspended) throw notFound();
    return row;
  }

  async getPublic(handle: string, viewerId: string | null = null): Promise<PublicCreatorProfile> {
    const row = await this.publicRow(handle);
    const profile = toPublicProfile(
      row,
      await this.videosFor(row.userId, { includePrivate: false }),
      this.mediaUrl,
    );
    if (!viewerId) return profile;
    const isMe = viewerId === row.userId;
    const following =
      !isMe &&
      (await this.db.follow.count({
        where: { followerId: viewerId, followingId: row.userId },
      })) > 0;
    // A real profile visit by someone else is a discovery signal.
    if (!isMe) {
      await this.db.interactionEvent.create({
        data: { type: 'profile_visit', userId: viewerId, creatorId: row.userId },
      });
    }
    return { ...profile, viewer: { following, isMe } };
  }

  /** Follow or unfollow a public creator. You can't follow yourself. */
  async setFollow(viewerId: string, handle: string, on: boolean) {
    const row = await this.publicRow(handle);
    if (row.userId === viewerId) {
      throw new HttpError(400, 'cannot_follow_yourself', 'That’s you!');
    }
    if (on) {
      const created = await this.db.follow.createMany({
        data: [{ followerId: viewerId, followingId: row.userId }],
        skipDuplicates: true,
      });
      if (created.count) {
        await this.db.interactionEvent.create({
          data: { type: 'follow', userId: viewerId, creatorId: row.userId },
        });
      }
    } else {
      await this.db.follow.deleteMany({ where: { followerId: viewerId, followingId: row.userId } });
    }
    return {
      following: on,
      followers: await this.db.follow.count({ where: { followingId: row.userId } }),
    };
  }

  // ─── Profile basics ─────────────────────────────────────────────────────────

  /** Suggests a free handle from the person's name, e.g. "ada.okafor" or "creator_4821". */
  private async freeUsername(from: string | null | undefined): Promise<string> {
    const base =
      (from ?? '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.+|\.+$/g, '')
        .slice(0, 20)
        .replace(/\.+$/g, '') || 'creator';
    const candidates = [
      ...(base.length >= 3 && base !== 'creator' ? [base] : []),
      ...Array.from({ length: 6 }, () => `${base}_${randomInt(1000, 99999)}`),
    ];
    for (const name of candidates) {
      if (!USERNAME_PATTERN.test(name) || isReservedUsername(name)) continue;
      const taken = await this.db.profile.findUnique({ where: { username: name } });
      if (!taken) return name;
    }
    return `creator_${randomInt(100000, 999999999)}`;
  }

  /**
   * Checks a username before saving: format, reserved words, then whether someone has it.
   * Saving checks again (and the unique index decides races), so this is only guidance.
   */
  async checkUsername(userId: string, raw: string): Promise<UsernameCheck> {
    const username = normalizeUsername(raw);
    if (!USERNAME_PATTERN.test(username)) {
      return { username, available: false, reason: 'invalid', message: USERNAME_FORMAT_MESSAGE };
    }
    const owner = await this.db.profile.findUnique({
      where: { username },
      select: { userId: true },
    });
    if (owner?.userId === userId) {
      return { username, available: true, mine: true, message: 'This is your username.' };
    }
    if (isReservedUsername(username)) {
      return {
        username,
        available: false,
        reason: 'reserved',
        message: 'That username isn’t available',
      };
    }
    if (owner) {
      return {
        username,
        available: false,
        reason: 'taken',
        message: 'That username is taken. Try another one.',
      };
    }
    return { username, available: true, message: `@${username} is available` };
  }

  /** The caller's profile id, creating an empty profile (with a free handle) the first time. */
  ensureProfile(userId: string): Promise<string> {
    return this.ensureProfileId(userId);
  }

  /** Returns the caller's profile id, creating an empty profile the first time. */
  private async ensureProfileId(userId: string, nameHint?: string | null): Promise<string> {
    const existing = await this.db.profile.findUnique({ where: { userId }, select: { id: true } });
    if (existing) return existing.id;
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { countryCode: true },
    });
    if (!user) throw new HttpError(401, 'unauthorized', 'Please sign in to continue.');
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const created = await this.db.profile.create({
          data: {
            userId,
            username: await this.freeUsername(nameHint),
            locationCountry: user.countryCode,
          },
          select: { id: true },
        });
        return created.id;
      } catch (err) {
        // Another request created it first, or the handle was just taken: look again.
        if (!isUniqueViolation(err)) throw err;
        const now = await this.db.profile.findUnique({ where: { userId }, select: { id: true } });
        if (now) return now.id;
      }
    }
    throw new HttpError(409, 'profile_conflict', 'Please try that again.');
  }

  /** Create or update the caller's profile. Omitted fields stay as they are. */
  async upsertMine(
    userId: string,
    input: ProfileUpdateInput,
  ): Promise<{ profile: MyCreatorProfile; created: boolean }> {
    if (input.countryCode !== undefined) {
      const country = await this.db.country.findUnique({ where: { code: input.countryCode } });
      if (!country) throw new HttpError(400, 'invalid_country', 'Pick a country from the list.');
    }

    const fields: Prisma.ProfileUncheckedUpdateInput = {};
    if (input.displayName !== undefined) fields.fullName = input.displayName;
    if (input.firstName !== undefined) fields.firstName = input.firstName;
    if (input.lastName !== undefined) fields.lastName = input.lastName;
    if (input.headline !== undefined) fields.headline = input.headline;
    if (input.bio !== undefined) fields.bio = input.bio;
    if (input.city !== undefined) fields.locationCity = input.city;
    if (input.region !== undefined) fields.locationState = input.region;
    if (input.countryCode !== undefined) fields.locationCountry = input.countryCode;
    if (input.availability !== undefined) fields.availability = input.availability;
    const usernameTaken = () =>
      new HttpError(409, 'username_taken', 'That username is taken. Try another one.');

    const existing = await this.db.profile.findUnique({ where: { userId }, select: { id: true } });
    if (existing) {
      try {
        const row = await this.db.profile.update({
          where: { id: existing.id },
          data: {
            ...fields,
            ...(input.username !== undefined ? { username: input.username } : {}),
          },
          include: profileInclude,
        });
        return { profile: await this.mine(row), created: false };
      } catch (err) {
        if (isUniqueViolation(err, 'username')) throw usernameTaken();
        throw err;
      }
    }

    // First save: one insert, so a rejected save never leaves a half-made profile behind.
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { countryCode: true },
    });
    if (!user) throw new HttpError(401, 'unauthorized', 'Please sign in to continue.');
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const row = await this.db.profile.create({
          data: {
            ...(fields as Prisma.ProfileUncheckedCreateInput),
            userId,
            username:
              input.username ?? (await this.freeUsername(input.displayName ?? input.firstName)),
            locationCountry: input.countryCode ?? user.countryCode,
          },
          include: profileInclude,
        });
        return { profile: await this.mine(row), created: true };
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        if (isUniqueViolation(err, 'user_id')) return this.upsertMine(userId, input); // raced
        if (input.username !== undefined) throw usernameTaken();
        // A generated handle was taken a moment ago: pick another.
      }
    }
    throw new HttpError(409, 'profile_conflict', 'Please try that again.');
  }

  // ─── Skills ─────────────────────────────────────────────────────────────────

  private async mySkills(profileId: string): Promise<SkillRef[]> {
    const rows = await this.db.profileSkill.findMany({
      where: { profileId },
      orderBy: { createdAt: 'asc' },
      include: { skill: { include: { category: { select: { slug: true, name: true } } } } },
    });
    return rows.map((r) => toSkillRef(r.skill));
  }

  /** Finds a skill by id, or by name (creating an uncurated one if it's new). */
  private async resolveSkill(input: AddSkillInput) {
    if ('skillId' in input) {
      const skill = await this.db.skill.findUnique({ where: { id: input.skillId } });
      if (!skill) throw new HttpError(404, 'skill_not_found', 'We couldn’t find that skill.');
      return skill;
    }
    const name = input.name;
    const slug = slugify(name);
    if (slug.length < 2) throw new HttpError(400, 'invalid_skill', 'Type a skill, like Welding.');
    // Validate the whole request before reusing or creating anything.
    const category = input.categorySlug
      ? await this.db.category.findUnique({ where: { slug: input.categorySlug } })
      : null;
    if (input.categorySlug && !category) {
      throw new HttpError(400, 'invalid_category', 'Pick a category from the list.');
    }
    const existing = await this.db.skill.findUnique({ where: { slug } });
    if (existing) return existing;

    try {
      return await this.db.skill.create({
        data: { name, slug, categoryId: category?.id ?? null, isCurated: false },
      });
    } catch (err) {
      // Same name added by someone else a moment ago (or differing only by case).
      if (!isUniqueViolation(err)) throw err;
      const again = await this.db.skill.findFirst({
        where: { OR: [{ slug }, { name: { equals: name, mode: 'insensitive' } }] },
      });
      if (!again) throw err;
      return again;
    }
  }

  async addSkill(userId: string, input: AddSkillInput): Promise<SkillRef[]> {
    const profileId = await this.ensureProfileId(userId);
    const skill = await this.resolveSkill(input);

    const count = await this.db.profileSkill.count({ where: { profileId } });
    if (count >= PROFILE_LIMITS.skills) {
      throw new HttpError(
        422,
        'too_many_skills',
        `You can show up to ${PROFILE_LIMITS.skills} skills. Remove one to add another.`,
      );
    }
    try {
      await this.db.profileSkill.create({ data: { profileId, skillId: skill.id } });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new HttpError(
          409,
          'skill_already_added',
          `${skill.name} is already on your profile.`,
        );
      }
      throw err;
    }
    return this.mySkills(profileId);
  }

  async removeSkill(userId: string, skillId: string): Promise<SkillRef[]> {
    const profile = await this.db.profile.findUnique({ where: { userId }, select: { id: true } });
    const { count } = profile
      ? await this.db.profileSkill.deleteMany({ where: { profileId: profile.id, skillId } })
      : { count: 0 };
    if (count === 0) {
      throw new HttpError(404, 'skill_not_on_profile', 'That skill isn’t on your profile.');
    }
    return this.mySkills(profile!.id);
  }

  // ─── Links ──────────────────────────────────────────────────────────────────

  private async myLinks(profileId: string): Promise<ProfileLink[]> {
    const rows = await this.db.profileLink.findMany({
      where: { profileId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(toLink);
  }

  async addLink(userId: string, input: AddLinkInput): Promise<ProfileLink[]> {
    const profileId = await this.ensureProfileId(userId);
    const count = await this.db.profileLink.count({ where: { profileId } });
    if (count >= PROFILE_LIMITS.links) {
      throw new HttpError(
        422,
        'too_many_links',
        `You can add up to ${PROFILE_LIMITS.links} links. Remove one to add another.`,
      );
    }
    try {
      await this.db.profileLink.create({
        data: { profileId, label: input.label, url: input.url, sortOrder: count },
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new HttpError(409, 'link_already_added', 'That link is already on your profile.');
      }
      throw err;
    }
    return this.myLinks(profileId);
  }

  async removeLink(userId: string, linkId: string): Promise<ProfileLink[]> {
    const profile = await this.db.profile.findUnique({ where: { userId }, select: { id: true } });
    // Scoped to the caller's profile: someone else's link id simply isn't found.
    const { count } = profile
      ? await this.db.profileLink.deleteMany({ where: { id: linkId, profileId: profile.id } })
      : { count: 0 };
    if (count === 0) throw new HttpError(404, 'link_not_found', 'We couldn’t find that link.');
    return this.myLinks(profile!.id);
  }

  // ─── Projects (portfolio items) ─────────────────────────────────────────────

  private async myProjects(profileId: string): Promise<ProfileProject[]> {
    const rows = await this.db.portfolioItem.findMany({
      where: { profileId },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(toProject);
  }

  async addProject(userId: string, input: ProjectCreateInput): Promise<ProfileProject[]> {
    const profileId = await this.ensureProfileId(userId);
    const count = await this.db.portfolioItem.count({ where: { profileId } });
    if (count >= PROFILE_LIMITS.projects) {
      throw new HttpError(
        422,
        'too_many_projects',
        `You can add up to ${PROFILE_LIMITS.projects} projects.`,
      );
    }
    await this.db.portfolioItem.create({
      data: {
        profileId,
        title: input.title,
        description: input.description ?? null,
        externalLink: input.link ?? null,
        projectDate: input.projectDate ? new Date(`${input.projectDate}T00:00:00Z`) : null,
        isPinned: input.featured ?? false,
      },
    });
    return this.myProjects(profileId);
  }

  async updateProject(
    userId: string,
    projectId: string,
    input: ProjectUpdateInput,
  ): Promise<ProfileProject[]> {
    const profile = await this.db.profile.findUnique({ where: { userId }, select: { id: true } });
    const data: Prisma.PortfolioItemUpdateManyMutationInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.link !== undefined) data.externalLink = input.link;
    if (input.projectDate !== undefined) {
      data.projectDate = input.projectDate ? new Date(`${input.projectDate}T00:00:00Z`) : null;
    }
    if (input.featured !== undefined) data.isPinned = input.featured;
    const { count } = profile
      ? await this.db.portfolioItem.updateMany({
          where: { id: projectId, profileId: profile.id },
          data,
        })
      : { count: 0 };
    if (count === 0) {
      throw new HttpError(404, 'project_not_found', 'We couldn’t find that project.');
    }
    return this.myProjects(profile!.id);
  }

  async removeProject(userId: string, projectId: string): Promise<ProfileProject[]> {
    const profile = await this.db.profile.findUnique({ where: { userId }, select: { id: true } });
    const { count } = profile
      ? await this.db.portfolioItem.deleteMany({ where: { id: projectId, profileId: profile.id } })
      : { count: 0 };
    if (count === 0) {
      throw new HttpError(404, 'project_not_found', 'We couldn’t find that project.');
    }
    return this.myProjects(profile!.id);
  }

  // ─── Skill taxonomy ─────────────────────────────────────────────────────────

  /** Search skills to add. Curated skills come first. */
  async searchSkills({ q, category, limit }: SkillSearch): Promise<SkillRef[]> {
    const rows = await this.db.skill.findMany({
      where: {
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
        ...(category ? { category: { slug: category } } : {}),
      },
      orderBy: [{ isCurated: 'desc' }, { name: 'asc' }],
      take: limit,
      include: { category: { select: { slug: true, name: true } } },
    });
    return rows.map(toSkillRef);
  }

  async categories(): Promise<SkillCategory[]> {
    const rows = await this.db.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { skills: true } } },
    });
    return rows.map((c) => ({ slug: c.slug, name: c.name, skillCount: c._count.skills }));
  }
}
