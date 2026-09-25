// The only place profile rows become API responses. Fields are listed explicitly, so new
// columns (and anything on the user row: email, phone, password hash...) never leak by default.
import {
  AVAILABILITY_OPTIONS,
  PROFILE_STEPS,
  type Availability,
  type MyCreatorProfile,
  type ProfileCompletion,
  type ProfileLink,
  type ProfileProject,
  type ProfileStep,
  type ProfileVideo,
  type PublicCreatorProfile,
  type SkillRef,
} from '@jobtok/types';
import type { Prisma } from '../../generated/prisma/client.js';

/** Everything a profile response needs, and nothing private from the user row. */
export const profileInclude = {
  country: { select: { name: true } },
  skills: {
    include: { skill: { include: { category: { select: { slug: true, name: true } } } } },
    orderBy: { createdAt: 'asc' },
  },
  links: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
  portfolioItems: { orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }] },
  user: {
    select: {
      createdAt: true,
      isPhoneVerified: true,
      isSuspended: true,
      _count: { select: { followers: true, following: true } },
    },
  },
} satisfies Prisma.ProfileInclude;

export type ProfileRow = Prisma.ProfileGetPayload<{ include: typeof profileInclude }>;

type SkillRow = Prisma.SkillGetPayload<{
  include: { category: { select: { slug: true; name: true } } };
}>;
type LinkRow = ProfileRow['links'][number];
type ProjectRow = ProfileRow['portfolioItems'][number];
export type VideoRow = {
  id: string;
  title: string | null;
  /** Already signed by the service (never a storage key). */
  thumbnailUrl: string | null;
  videoDurationSeconds: number | null;
  visibility: 'public' | 'private';
  createdAt: Date;
};

export function toSkillRef(skill: SkillRow): SkillRef {
  return {
    id: skill.id,
    name: skill.name,
    slug: skill.slug,
    category: skill.category ? { slug: skill.category.slug, name: skill.category.name } : null,
  };
}

export function toLink(link: LinkRow): ProfileLink {
  return { id: link.id, label: link.label, url: link.url };
}

export function toProject(item: ProjectRow): ProfileProject {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    link: item.externalLink,
    projectDate: item.projectDate ? item.projectDate.toISOString().slice(0, 10) : null,
    featured: item.isPinned,
    videoPostId: item.postId,
  };
}

function toVideo(post: VideoRow): ProfileVideo {
  return {
    id: post.id,
    title: post.title,
    thumbnailUrl: post.thumbnailUrl,
    durationSeconds: post.videoDurationSeconds,
    visibility: post.visibility,
    createdAt: post.createdAt.toISOString(),
  };
}

function availabilityOf(value: string | null): Availability | null {
  return AVAILABILITY_OPTIONS.find((a) => a === value) ?? null;
}

export function toPublicProfile(
  row: ProfileRow,
  videos: { items: VideoRow[]; total: number },
  /** Signs media storage keys (the uploaded photo); returns null when storage is off. */
  mediaUrl: (key: string) => string | null = () => null,
): PublicCreatorProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.fullName,
    headline: row.headline,
    bio: row.bio,
    // An uploaded photo wins over any older external avatar link.
    avatarUrl: row.avatarStorageKey ? mediaUrl(row.avatarStorageKey) : row.avatarUrl,
    // City level only: latitude/longitude are never part of a response.
    location: {
      city: row.locationCity,
      region: row.locationState,
      countryCode: row.locationCountry,
      countryName: row.country?.name ?? null,
    },
    availability: availabilityOf(row.availability),
    skills: row.skills.map((s) => toSkillRef(s.skill)),
    links: row.links.map(toLink),
    projects: row.portfolioItems.map(toProject),
    videos: videos.items.map(toVideo),
    stats: {
      followers: row.user._count.followers,
      following: row.user._count.following,
      videos: videos.total,
    },
    joinedAt: row.user.createdAt.toISOString(),
  };
}

/**
 * Progressive, skippable steps. Completion is about helping people get discovered; it is not a
 * trust signal and never marks anyone as verified or skilled.
 */
export function completionOf(row: ProfileRow, videoCount: number): ProfileCompletion {
  const done: Record<ProfileStep, boolean> = {
    name: Boolean(row.fullName || row.firstName),
    what_you_do: Boolean(row.headline),
    location: Boolean(row.locationCity),
    skills: row.skills.length > 0,
    work: row.portfolioItems.length > 0 || row.links.length > 0,
    create: videoCount > 0,
  };
  const steps = PROFILE_STEPS.map((key) => ({ key, done: done[key] }));
  const finished = steps.filter((s) => s.done).length;
  return {
    percent: Math.round((finished / steps.length) * 100),
    steps,
    next: steps.find((s) => !s.done)?.key ?? null,
  };
}

export function toMyProfile(
  row: ProfileRow,
  videos: { items: VideoRow[]; total: number },
  mediaUrl: (key: string) => string | null = () => null,
): MyCreatorProfile {
  return {
    ...toPublicProfile(row, videos, mediaUrl),
    firstName: row.firstName,
    lastName: row.lastName,
    isPublic: row.user.isPhoneVerified && !row.user.isSuspended,
    completion: completionOf(row, videos.total),
  };
}
