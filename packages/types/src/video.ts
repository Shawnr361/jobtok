// Video posts: real work, shown on video. The API never returns storage keys, sizes or other
// internal fields in public shapes; playback and thumbnail URLs are signed and expire.
import type { ISODateString } from './entities.js';
import type { SkillCategoryRef, SkillRef } from './profile.js';

export const VIDEO_LIMITS = {
  /** Spec: 60-second videos. */
  maxDurationSeconds: 60,
  minDurationSeconds: 1,
  caption: 150,
  description: 500,
  skills: 5,
  tools: 10,
  materials: 10,
  tips: 5,
  learnItem: 80,
  tipItem: 200,
  city: 100,
  region: 100,
} as const;

/** Containers accepted after inspecting the file itself (never the client's claim). */
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'] as const;

export const VIDEO_STATUSES = ['awaiting_upload', 'processing', 'ready', 'failed'] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

export const VIDEO_VISIBILITIES = ['public', 'private'] as const;
export type VideoVisibility = (typeof VIDEO_VISIBILITIES)[number];

export const FEED_TABS = ['for_you', 'following', 'learn', 'trending', 'near'] as const;
export type FeedTabKey = (typeof FEED_TABS)[number];

/** Signals the app may report. Likes, saves and follows are recorded by their own endpoints. */
export const CLIENT_INTERACTIONS = [
  'impression',
  'play',
  'complete',
  'share',
  'profile_visit',
] as const;
export type ClientInteraction = (typeof CLIENT_INTERACTIONS)[number];

export interface VideoCreator {
  profileId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  city: string | null;
}

export interface VideoLearn {
  tools: string[];
  materials: string[];
  tips: string[];
}

/** A published video as anyone can see it. */
export interface VideoPost {
  id: string;
  caption: string;
  description: string | null;
  category: SkillCategoryRef | null;
  skills: SkillRef[];
  location: { city: string | null; region: string | null; countryCode: string };
  learn: VideoLearn;
  visibility: VideoVisibility;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  /** Signed, expiring. May be relative to the API origin (development storage). */
  playbackUrl: string | null;
  thumbnailUrl: string | null;
  publishedAt: ISODateString | null;
  createdAt: ISODateString;
  creator: VideoCreator | null;
  stats: { likes: number; saves: number };
  viewer: { liked: boolean; saved: boolean; followingCreator: boolean; isMine: boolean } | null;
}

/** The owner's view, including drafts and processing state. */
export interface MyVideo extends VideoPost {
  status: VideoStatus;
  isPublished: boolean;
  /** Human-readable reason when processing failed. */
  processingError: string | null;
}

/** Where and how to send the file after creating the post. */
export interface VideoUploadTarget {
  method: 'PUT';
  /** Relative to the API origin. Requires the same bearer token. */
  url: string;
  maxBytes: number;
  accept: readonly string[];
}

export interface VideoDetailsInput {
  caption: string;
  description?: string | null;
  categorySlug?: string | null;
  skillIds?: string[];
  city?: string | null;
  region?: string | null;
  visibility?: VideoVisibility;
  tools?: string[];
  materials?: string[];
  tips?: string[];
}

export interface FeedPage {
  items: VideoPost[];
  nextCursor: string | null;
  /** Set on the Near You tab when we don't know the viewer's city yet. */
  needsCity?: boolean;
}
