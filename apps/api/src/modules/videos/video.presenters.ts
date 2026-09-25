// The only place post rows become video responses. Fields are listed explicitly: storage keys,
// file sizes, flags and the owner's private data never leave the server.
import type { MyVideo, VideoPost, VideoStatus, VideoVisibility } from '@jobtok/types';
import type { Prisma } from '../../generated/prisma/client.js';
import { toSkillRef } from '../profiles/profile.presenters.js';

/** Used where no viewer is signed in: matches nobody. */
const NO_ONE = '00000000-0000-0000-0000-000000000000';

export function videoInclude(viewerId: string | null) {
  const me = viewerId ?? NO_ONE;
  return {
    category: { select: { slug: true, name: true } },
    tags: {
      include: { skill: { include: { category: { select: { slug: true, name: true } } } } },
    },
    user: {
      select: {
        isPhoneVerified: true,
        isSuspended: true,
        profile: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            avatarStorageKey: true,
            locationCity: true,
          },
        },
      },
    },
    likes: { where: { userId: me }, select: { userId: true } },
    saves: { where: { userId: me }, select: { userId: true } },
    _count: { select: { likes: true, saves: true } },
  } satisfies Prisma.PostInclude;
}

export type VideoRow = Prisma.PostGetPayload<{ include: ReturnType<typeof videoInclude> }>;

export interface PresentContext {
  viewerId: string | null;
  /** Creator user ids the viewer follows. */
  following: ReadonlySet<string>;
  /** Signed URL for a storage key, or null when storage isn't available. */
  url: (key: string) => string | null;
}

export function toVideoPost(row: VideoRow, ctx: PresentContext): VideoPost {
  const profile = row.user.profile;
  const playable = row.status === 'ready' && row.videoStorageKey !== null;
  return {
    id: row.id,
    caption: row.title ?? '',
    description: row.description,
    category: row.category ? { slug: row.category.slug, name: row.category.name } : null,
    skills: row.tags.map((t) => toSkillRef(t.skill)),
    location: {
      city: row.locationCity,
      region: row.locationState,
      countryCode: row.locationCountry,
    },
    learn: {
      tools: row.learnTools ?? [],
      materials: row.learnMaterials ?? [],
      tips: row.learnTips ?? [],
    },
    visibility: row.visibility as VideoVisibility,
    durationSeconds: row.videoDurationSeconds,
    width: row.videoWidth,
    height: row.videoHeight,
    playbackUrl: playable ? ctx.url(row.videoStorageKey!) : null,
    thumbnailUrl: playable && row.thumbnailStorageKey ? ctx.url(row.thumbnailStorageKey) : null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    creator: profile
      ? {
          profileId: profile.id,
          username: profile.username,
          displayName: profile.fullName,
          avatarUrl: profile.avatarStorageKey
            ? ctx.url(profile.avatarStorageKey)
            : profile.avatarUrl,
          city: profile.locationCity,
        }
      : null,
    stats: { likes: row._count.likes, saves: row._count.saves },
    viewer: ctx.viewerId
      ? {
          liked: row.likes.length > 0,
          saved: row.saves.length > 0,
          followingCreator: ctx.following.has(row.userId),
          isMine: row.userId === ctx.viewerId,
        }
      : null,
  };
}

export function toMyVideo(row: VideoRow, ctx: PresentContext): MyVideo {
  return {
    ...toVideoPost(row, ctx),
    status: row.status as VideoStatus,
    isPublished: row.isPublished,
    processingError: row.processingError,
  };
}
