import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Transform, type Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  ACCEPTED_VIDEO_TYPES,
  VIDEO_LIMITS,
  type ClientInteraction,
  type FeedPage,
  type MyVideo,
  type VideoPost,
  type VideoUploadTarget,
} from '@jobtok/types';
import type { z } from 'zod';
import type { Db } from '../../db/client.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { HttpError } from '../../lib/http.js';
import type { RateLimitRule } from '../auth/auth.config.js';
import { ProfileService } from '../profiles/profile.service.js';
import { VideoRejected, type VideoProcessor } from './processor.js';
import type { VideoStorage } from './storage.js';
import { toMyVideo, toVideoPost, videoInclude, type VideoRow } from './video.presenters.js';
import type {
  createVideoSchema,
  feedQuerySchema,
  interactionSchema,
  updateVideoSchema,
} from './video.validation.js';

type CreateInput = z.output<typeof createVideoSchema>;
type UpdateInput = z.output<typeof updateVideoSchema>;
type FeedQuery = z.output<typeof feedQuerySchema>;
type InteractionInput = z.output<typeof interactionSchema>;

export interface VideoDeps {
  storage: VideoStorage | null;
  processor: VideoProcessor | null;
  /** Why uploads are unavailable, if they are. */
  unavailableReason: string | null;
  maxBytes: number;
  /** How long playback/thumbnail URLs stay valid. */
  urlTtlSeconds: number;
  /** Per-IP limits for creating posts and uploading files (defaults: 30 per hour each). */
  rateLimits?: { create: RateLimitRule; upload: RateLimitRule };
}

/** Work videos anyone can watch: processed, published, public, unflagged, trusted creator. */
const PUBLIC_VIDEO = {
  status: 'ready',
  isPublished: true,
  visibility: 'public',
  isFlagged: false,
  videoStorageKey: { not: null },
  postType: { in: ['showcase', 'project'] },
  user: { isPhoneVerified: true, isSuspended: false },
} satisfies Prisma.PostWhereInput;

/** Posts made by the video pipeline (legacy/external-URL posts are never treated as videos). */
const PIPELINE_VIDEO = {
  postType: { in: ['showcase', 'project'] },
  OR: [{ videoStorageKey: { not: null } }, { status: { not: 'ready' } }],
} satisfies Prisma.PostWhereInput;

const MAX_UNFINISHED = 10;
/** A "processing" row older than this is treated as abandoned (e.g. the server restarted). */
const STALE_PROCESSING_MS = 10 * 60_000;

class TooLarge extends Error {}

const notFound = () => new HttpError(404, 'video_not_found', 'We couldn’t find that video.');

export class VideoService {
  private readonly profiles: ProfileService;

  constructor(
    private readonly db: Db,
    private readonly deps: VideoDeps,
  ) {
    this.profiles = new ProfileService(db);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  url = (key: string): string | null =>
    this.deps.storage ? this.deps.storage.url(key, this.deps.urlTtlSeconds) : null;

  private requireUploads(): { storage: VideoStorage; processor: VideoProcessor } {
    const { storage, processor } = this.deps;
    if (!storage || !processor) {
      throw new HttpError(
        503,
        'video_uploads_unavailable',
        'Posting videos isn’t available on this server yet. Please try again later.',
      );
    }
    return { storage, processor };
  }

  private async followingOf(viewerId: string | null, creatorIds: string[]) {
    if (!viewerId || creatorIds.length === 0) return new Set<string>();
    const rows = await this.db.follow.findMany({
      where: { followerId: viewerId, followingId: { in: creatorIds } },
      select: { followingId: true },
    });
    return new Set(rows.map((r) => r.followingId));
  }

  private async present(rows: VideoRow[], viewerId: string | null): Promise<VideoPost[]> {
    const following = await this.followingOf(viewerId, [...new Set(rows.map((r) => r.userId))]);
    return rows.map((r) => toVideoPost(r, { viewerId, following, url: this.url }));
  }

  private async presentMine(row: VideoRow, userId: string): Promise<MyVideo> {
    return toMyVideo(row, { viewerId: userId, following: new Set(), url: this.url });
  }

  private loadOwn(userId: string, id: string) {
    return this.db.post.findFirst({
      where: { id, userId, ...PIPELINE_VIDEO },
      include: videoInclude(userId),
    });
  }

  private uploadTarget(id: string): VideoUploadTarget {
    return {
      method: 'PUT',
      url: `/api/v1/videos/${id}/file`,
      maxBytes: this.deps.maxBytes,
      accept: ACCEPTED_VIDEO_TYPES,
    };
  }

  /** Category slug -> id, and checks every skill exists. Null clears the category. */
  private async resolveTaxonomy(input: { categorySlug?: string | null; skillIds?: string[] }) {
    let categoryId: string | null | undefined;
    if (input.categorySlug === null || input.categorySlug === '') categoryId = null;
    else if (input.categorySlug !== undefined) {
      const category = await this.db.category.findUnique({ where: { slug: input.categorySlug } });
      if (!category) throw new HttpError(400, 'invalid_category', 'Pick a category from the list.');
      categoryId = category.id;
    }
    if (input.skillIds?.length) {
      const found = await this.db.skill.count({ where: { id: { in: input.skillIds } } });
      if (found !== input.skillIds.length) {
        throw new HttpError(400, 'invalid_skill', 'Pick skills from the list.');
      }
    }
    return { categoryId };
  }

  // ─── Creating & uploading ───────────────────────────────────────────────────

  /** Step 1: save the details and get somewhere to send the file. Nothing is public yet. */
  async create(
    userId: string,
    input: CreateInput,
  ): Promise<{ video: MyVideo; upload: VideoUploadTarget }> {
    this.requireUploads();
    const unfinished = await this.db.post.count({
      where: { userId, ...PIPELINE_VIDEO, status: { in: ['awaiting_upload', 'failed'] } },
    });
    if (unfinished >= MAX_UNFINISHED) {
      throw new HttpError(
        429,
        'too_many_unfinished_videos',
        'You have several videos that were never uploaded. Finish or delete some first.',
      );
    }
    const { categoryId } = await this.resolveTaxonomy(input);
    // Every creator gets a profile (and a handle) with their first video.
    const profileId = await this.profiles.ensureProfile(userId);
    const profile = await this.db.profile.findUniqueOrThrow({
      where: { id: profileId },
      select: { locationCity: true, locationState: true, locationCountry: true },
    });

    const post = await this.db.post.create({
      data: {
        userId,
        postType: 'showcase',
        title: input.caption,
        description: input.description ?? null,
        categoryId: categoryId ?? null,
        locationCity: input.city === undefined ? profile.locationCity : input.city,
        locationState: input.region === undefined ? profile.locationState : input.region,
        locationCountry: profile.locationCountry,
        visibility: input.visibility ?? 'public',
        learnTools: input.tools ?? [],
        learnMaterials: input.materials ?? [],
        learnTips: input.tips ?? [],
        status: 'awaiting_upload',
        isPublished: false,
        tags: { create: (input.skillIds ?? []).map((skillId) => ({ skillId })) },
      },
      include: videoInclude(userId),
    });
    return { video: await this.presentMine(post, userId), upload: this.uploadTarget(post.id) };
  }

  /**
   * Step 2: receive the file, inspect it and store it. The post becomes `ready` only when the
   * file really is an acceptable video; otherwise it becomes `failed` with a reason and nothing
   * is left in storage.
   */
  async receiveUpload(
    userId: string,
    id: string,
    body: Readable,
    declaredLength: number | null,
  ): Promise<MyVideo> {
    const { storage, processor } = this.requireUploads();
    if (declaredLength !== null && declaredLength > this.deps.maxBytes) {
      throw this.tooLarge();
    }

    // Claim the post atomically so two uploads can't race.
    const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS);
    const claimed = await this.db.post.updateMany({
      where: {
        id,
        userId,
        postType: { in: ['showcase', 'project'] },
        OR: [
          { status: { in: ['awaiting_upload', 'failed'] } },
          { status: 'processing', updatedAt: { lt: staleBefore } },
        ],
      },
      data: { status: 'processing', processingError: null },
    });
    if (claimed.count === 0) {
      const own = await this.loadOwn(userId, id);
      if (!own) throw notFound();
      throw new HttpError(
        409,
        own.status === 'processing' ? 'video_processing' : 'video_already_uploaded',
        own.status === 'processing'
          ? 'We’re still checking this video.'
          : 'This video has already been uploaded.',
      );
    }

    const work = path.join(tmpdir(), `jobtok-upload-${randomUUID()}`);
    const thumbPath = `${work}.jpg`;
    const stored: string[] = [];
    try {
      const size = await this.saveBody(body, work);
      if (size < 1024) throw new VideoRejected('That file is empty. Try another video.');

      const probe = await processor.probe(work);
      const videoKey = `videos/${id}.${probe.container}`;
      await storage.put(videoKey, work);
      stored.push(videoKey);

      let thumbKey: string | null = null;
      const at = Math.min(1, probe.durationSeconds / 2);
      if (await processor.thumbnail(work, thumbPath, at)) {
        thumbKey = `thumbnails/${id}.jpg`;
        await storage.put(thumbKey, thumbPath);
        stored.push(thumbKey);
      }

      const seconds = Math.min(
        VIDEO_LIMITS.maxDurationSeconds,
        Math.max(VIDEO_LIMITS.minDurationSeconds, Math.round(probe.durationSeconds)),
      );
      const row = await this.db.post.update({
        where: { id },
        data: {
          status: 'ready',
          videoStorageKey: videoKey,
          thumbnailStorageKey: thumbKey,
          videoMimeType: probe.mimeType,
          videoSizeBytes: size,
          videoWidth: probe.width,
          videoHeight: probe.height,
          videoDurationSeconds: seconds,
          processingError: null,
        },
        include: videoInclude(userId),
      });
      return this.presentMine(row, userId);
    } catch (err) {
      // Nothing half-finished stays in storage.
      await Promise.all(stored.map((k) => storage.delete(k).catch(() => {})));
      const reason =
        err instanceof VideoRejected
          ? err.message
          : err instanceof TooLarge
            ? this.tooLarge().message
            : 'Something went wrong while checking your video. Please try again.';
      await this.db.post
        .update({ where: { id }, data: { status: 'failed', processingError: reason } })
        .catch(() => {});
      if (err instanceof TooLarge) throw this.tooLarge();
      if (err instanceof VideoRejected) throw new HttpError(422, 'video_rejected', reason);
      throw err;
    } finally {
      await rm(work, { force: true }).catch(() => {});
      await rm(thumbPath, { force: true }).catch(() => {});
    }
  }

  private tooLarge() {
    const mb = Math.round(this.deps.maxBytes / (1024 * 1024));
    return new HttpError(
      413,
      'video_too_large',
      `That video is too big. Videos can be up to ${mb} MB.`,
    );
  }

  /** Streams the request body to a temp file, stopping as soon as it passes the size limit. */
  private async saveBody(body: Readable, dest: string): Promise<number> {
    let bytes = 0;
    const max = this.deps.maxBytes;
    const counter = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        bytes += chunk.length;
        if (bytes > max) cb(new TooLarge());
        else cb(null, chunk);
      },
    });
    await pipeline(body, counter, createWriteStream(dest));
    return bytes;
  }

  /** Step 3: make a ready video visible (public, or on your own profile if private). */
  async publish(userId: string, id: string): Promise<MyVideo> {
    const own = await this.loadOwn(userId, id);
    if (!own) throw notFound();
    if (own.status !== 'ready') {
      throw new HttpError(
        409,
        'video_not_ready',
        own.status === 'failed'
          ? 'This video didn’t upload properly. Upload it again first.'
          : 'This video isn’t ready yet.',
      );
    }
    const row = await this.db.post.update({
      where: { id },
      data: { isPublished: true, publishedAt: own.publishedAt ?? new Date() },
      include: videoInclude(userId),
    });
    return this.presentMine(row, userId);
  }

  async update(userId: string, id: string, input: UpdateInput): Promise<MyVideo> {
    const own = await this.loadOwn(userId, id);
    if (!own) throw notFound();
    const { categoryId } = await this.resolveTaxonomy(input);
    const data: Prisma.PostUncheckedUpdateInput = {};
    if (input.caption !== undefined) data.title = input.caption;
    if (input.description !== undefined) data.description = input.description;
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (input.city !== undefined) data.locationCity = input.city;
    if (input.region !== undefined) data.locationState = input.region;
    if (input.visibility !== undefined) data.visibility = input.visibility;
    if (input.tools !== undefined) data.learnTools = input.tools;
    if (input.materials !== undefined) data.learnMaterials = input.materials;
    if (input.tips !== undefined) data.learnTips = input.tips;

    const row = await this.db.$transaction(async (tx) => {
      if (input.skillIds !== undefined) {
        await tx.postTag.deleteMany({ where: { postId: id } });
        if (input.skillIds.length) {
          await tx.postTag.createMany({
            data: input.skillIds.map((skillId) => ({ postId: id, skillId })),
          });
        }
      }
      return tx.post.update({ where: { id }, data, include: videoInclude(userId) });
    });
    return this.presentMine(row, userId);
  }

  /** Deletes the post and its files. Someone else's video looks exactly like a missing one. */
  async remove(userId: string, id: string): Promise<void> {
    const own = await this.loadOwn(userId, id);
    if (!own) throw notFound();
    await this.db.post.delete({ where: { id } });
    const keys = [own.videoStorageKey, own.thumbnailStorageKey].filter((k): k is string => !!k);
    if (this.deps.storage) {
      await Promise.all(keys.map((k) => this.deps.storage!.delete(k).catch(() => {})));
    }
  }

  // ─── Reading ────────────────────────────────────────────────────────────────

  async listMine(userId: string): Promise<MyVideo[]> {
    const rows = await this.db.post.findMany({
      where: { userId, ...PIPELINE_VIDEO },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: videoInclude(userId),
    });
    return Promise.all(rows.map((r) => this.presentMine(r, userId)));
  }

  /** The owner always sees their own video; everyone else only a public, playable one. */
  async getOne(id: string, viewerId: string | null): Promise<VideoPost | MyVideo> {
    if (viewerId) {
      const own = await this.loadOwn(viewerId, id);
      if (own) return this.presentMine(own, viewerId);
    }
    const row = await this.db.post.findFirst({
      where: { id, ...PUBLIC_VIDEO },
      include: videoInclude(viewerId),
    });
    if (!row) throw notFound();
    return (await this.present([row], viewerId))[0]!;
  }

  private async visible(id: string, viewerId: string) {
    const row = await this.db.post.findFirst({
      where: {
        id,
        OR: [PUBLIC_VIDEO, { userId: viewerId, status: 'ready', isPublished: true }],
      },
      select: { id: true, userId: true },
    });
    if (!row) throw notFound();
    return row;
  }

  // ─── Feed ───────────────────────────────────────────────────────────────────

  /**
   * Newest public work first (no follower-count ranking). Trending uses real engagement from
   * the last two weeks. Recommendations will build on the interaction log later.
   */
  async feed(viewerId: string | null, q: FeedQuery): Promise<FeedPage> {
    const where: Prisma.PostWhereInput = { ...PUBLIC_VIDEO };

    if (q.tab === 'following') {
      if (!viewerId) return { items: [], nextCursor: null };
      const follows = await this.db.follow.findMany({
        where: { followerId: viewerId },
        select: { followingId: true },
      });
      if (!follows.length) return { items: [], nextCursor: null };
      where.userId = { in: follows.map((f) => f.followingId) };
    } else if (q.tab === 'learn') {
      where.AND = [
        {
          OR: [
            { learnTools: { isEmpty: false } },
            { learnMaterials: { isEmpty: false } },
            { learnTips: { isEmpty: false } },
          ],
        },
      ];
    } else if (q.tab === 'near') {
      const me = viewerId
        ? await this.db.profile.findUnique({
            where: { userId: viewerId },
            select: { locationCity: true },
          })
        : null;
      if (!me?.locationCity) return { items: [], nextCursor: null, needsCity: true };
      where.locationCity = { equals: me.locationCity, mode: 'insensitive' };
    } else if (q.tab === 'trending') {
      return this.trending(viewerId, q);
    }

    const cursor = decodeCursor(q.cursor);
    if (cursor && 't' in cursor) {
      const t = new Date(cursor.t);
      where.OR = [{ publishedAt: { lt: t } }, { publishedAt: t, id: { lt: cursor.id } }];
    }
    const rows = await this.db.post.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: q.limit + 1,
      include: videoInclude(viewerId),
    });
    const page = rows.slice(0, q.limit);
    const last = page.at(-1);
    return {
      items: await this.present(page, viewerId),
      nextCursor:
        rows.length > q.limit && last?.publishedAt
          ? encodeCursor({ t: last.publishedAt.toISOString(), id: last.id })
          : null,
    };
  }

  private async trending(viewerId: string | null, q: FeedQuery): Promise<FeedPage> {
    const since = new Date(Date.now() - 14 * 24 * 60 * 60_000);
    const candidates = await this.db.post.findMany({
      where: { ...PUBLIC_VIDEO, publishedAt: { gte: since } },
      select: { id: true, _count: { select: { likes: true, saves: true } } },
      take: 500,
      orderBy: { publishedAt: 'desc' },
    });
    const events = await this.db.interactionEvent.groupBy({
      by: ['postId', 'type'],
      where: {
        postId: { in: candidates.map((c) => c.id) },
        type: { in: ['share', 'complete'] },
        createdAt: { gte: since },
      },
      _count: { _all: true },
    });
    const extra = new Map<string, number>();
    for (const e of events) {
      const w = e.type === 'share' ? 3 : 0.5;
      extra.set(e.postId!, (extra.get(e.postId!) ?? 0) + w * e._count._all);
    }
    const scored = candidates
      .map((c) => ({
        id: c.id,
        score: c._count.likes + 2 * c._count.saves + (extra.get(c.id) ?? 0),
      }))
      .sort((a, b) => b.score - a.score);
    const cursor = decodeCursor(q.cursor);
    const offset = cursor && 'o' in cursor ? cursor.o : 0;
    const ids = scored.slice(offset, offset + q.limit).map((s) => s.id);
    const rows = await this.db.post.findMany({
      where: { id: { in: ids } },
      include: videoInclude(viewerId),
    });
    rows.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    return {
      items: await this.present(rows, viewerId),
      nextCursor: offset + q.limit < scored.length ? encodeCursor({ o: offset + q.limit }) : null,
    };
  }

  // ─── Interactions ───────────────────────────────────────────────────────────

  async setLike(userId: string, id: string, on: boolean) {
    const post = await this.visible(id, userId);
    if (on) {
      const created = await this.db.like.createMany({
        data: [{ userId, postId: id }],
        skipDuplicates: true,
      });
      if (created.count) await this.log(userId, post, 'like');
    } else {
      await this.db.like.deleteMany({ where: { userId, postId: id } });
    }
    return {
      liked: on,
      likes: await this.db.like.count({ where: { postId: id } }),
    };
  }

  async setSave(userId: string, id: string, on: boolean) {
    const post = await this.visible(id, userId);
    if (on) {
      const created = await this.db.save.createMany({
        data: [{ userId, postId: id }],
        skipDuplicates: true,
      });
      if (created.count) await this.log(userId, post, 'save');
    } else {
      await this.db.save.deleteMany({ where: { userId, postId: id } });
    }
    return {
      saved: on,
      saves: await this.db.save.count({ where: { postId: id } }),
    };
  }

  /** Records a watch/share signal the app observed. */
  async record(userId: string, id: string, input: InteractionInput): Promise<void> {
    const post = await this.visible(id, userId);
    await this.log(userId, post, input.type, input.watchMs);
  }

  private async log(
    userId: string,
    post: { id: string; userId: string },
    type: ClientInteraction | 'like' | 'save',
    watchMs?: number,
  ) {
    await this.db.interactionEvent.create({
      data: { type, userId, postId: post.id, creatorId: post.userId, watchMs: watchMs ?? null },
    });
  }
}

type Cursor = { t: string; id: string } | { o: number };

function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c)).toString('base64url');
}

function decodeCursor(raw: string | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Record<string, unknown>;
    if (typeof c.t === 'string' && typeof c.id === 'string' && !Number.isNaN(Date.parse(c.t))) {
      return { t: c.t, id: c.id };
    }
    if (typeof c.o === 'number' && Number.isInteger(c.o) && c.o >= 0) return { o: c.o };
  } catch {
    // fall through
  }
  throw new HttpError(400, 'invalid_cursor', 'Please refresh and try again.');
}
