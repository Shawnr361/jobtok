// Creator profiles: a living portfolio (videos, projects, skills), not a CV.
// Two shapes on purpose: PublicCreatorProfile is what anyone can see; MyCreatorProfile adds
// fields only the owner sees. Neither ever carries email, phone or any auth data.
import type { Availability, CategorySlug } from './enums.js';
import type { ISODateString } from './entities.js';

export const PROFILE_LIMITS = {
  displayName: 60,
  firstName: 50,
  lastName: 50,
  /** "What do you do?" */
  headline: 100,
  bio: 500,
  city: 100,
  region: 100,
  usernameMin: 3,
  usernameMax: 30,
  skills: 30,
  skillName: 60,
  links: 10,
  linkLabel: 40,
  url: 500,
  projects: 50,
  projectTitle: 120,
  projectDescription: 1000,
} as const;

/** 3-30 lowercase letters, numbers, dots and underscores; no dot at either end or twice. */
export const USERNAME_PATTERN = /^(?=.{3,30}$)(?!.*\.\.)[a-z0-9_](?:[a-z0-9._]*[a-z0-9_])?$/;

/** Result of checking a username before saving it (GET /profiles/username-check). */
export interface UsernameCheck {
  /** The name as it would be saved (trimmed, lowercase, without a leading @). */
  username: string;
  available: boolean;
  /** Why it can't be used; absent when available. */
  reason?: 'invalid' | 'reserved' | 'taken';
  /** True when it's already the caller's own username. */
  mine?: boolean;
  /** A short, human message to show under the field. */
  message: string;
}

export interface SkillCategoryRef {
  slug: CategorySlug | string;
  name: string;
}

export interface SkillRef {
  id: string;
  name: string;
  slug: string;
  category: SkillCategoryRef | null;
}

export interface ProfileLink {
  id: string;
  label: string;
  url: string;
}

export interface ProfileProject {
  id: string;
  title: string;
  description: string | null;
  link: string | null;
  /** YYYY-MM-DD */
  projectDate: string | null;
  featured: boolean;
  /** The video that shows this project, once videos exist. */
  videoPostId: string | null;
}

/** A published video on the creator's profile (My Work). */
export interface ProfileVideo {
  id: string;
  title: string | null;
  /** Signed and expiring, when a thumbnail exists. */
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  /** Private videos only ever appear on the owner's own profile. */
  visibility: 'public' | 'private';
  createdAt: ISODateString;
}

/** City level only. Precise coordinates are never returned. */
export interface ProfileLocation {
  city: string | null;
  region: string | null;
  countryCode: string;
  countryName: string | null;
}

export interface PublicCreatorProfile {
  id: string;
  username: string;
  displayName: string | null;
  /** What they do, in their own words. */
  headline: string | null;
  bio: string | null;
  avatarUrl: string | null;
  location: ProfileLocation;
  availability: Availability | null;
  skills: SkillRef[];
  links: ProfileLink[];
  projects: ProfileProject[];
  videos: ProfileVideo[];
  stats: { followers: number; following: number; videos: number };
  joinedAt: ISODateString;
  /** Only when the request is signed in. */
  viewer?: { following: boolean; isMe: boolean } | null;
}

export const PROFILE_STEPS = [
  'name',
  'what_you_do',
  'location',
  'skills',
  'work',
  'create',
] as const;
export type ProfileStep = (typeof PROFILE_STEPS)[number];

/** Progressive and skippable. Completion says nothing about skill or trust. */
export interface ProfileCompletion {
  percent: number;
  steps: { key: ProfileStep; done: boolean }[];
  /** First unfinished step, or null when everything is done. */
  next: ProfileStep | null;
}

export interface MyCreatorProfile extends PublicCreatorProfile {
  firstName: string | null;
  lastName: string | null;
  /** Public profiles need a verified phone (trust), independent of completeness. */
  isPublic: boolean;
  completion: ProfileCompletion;
}

/** PATCH /profiles/me. Omit a field to leave it; send null to clear it. */
export interface ProfileUpdate {
  username?: string;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  headline?: string | null;
  bio?: string | null;
  city?: string | null;
  region?: string | null;
  countryCode?: string;
  availability?: Availability | null;
}

export interface ProjectInput {
  title: string;
  description?: string | null;
  link?: string | null;
  projectDate?: string | null;
  featured?: boolean;
}

export interface SkillCategory {
  slug: string;
  name: string;
  skillCount: number;
}
