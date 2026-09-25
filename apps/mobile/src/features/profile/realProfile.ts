// Maps a real creator profile from the API onto the shared ProfileView layout.
// Real profiles never borrow sample-creator data, images or numbers.
import type { Availability, ProfileStep, PublicCreatorProfile, SkillRef } from '@jobtok/types';
import { Linking } from 'react-native';
import type { IconName } from '../../components/primitives';
import type { Skill } from '../demo/data';
import { mediaUrl } from '../../lib/video/videoApi';
import type { ProfileProjectCard, ProfileStat, ProfileWorkTile } from './ProfileView';

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  open_to_projects: 'Taking on projects',
  open_to_collaborate: 'Open to collaborating',
  busy: 'Busy right now',
};

/** Onboarding steps, in the order people meet them. Every one can be skipped. */
export const STEP_COPY: Record<ProfileStep, { label: string; icon: IconName }> = {
  name: { label: 'Add your name', icon: 'badge' },
  what_you_do: { label: 'Tell people what you do', icon: 'work-outline' },
  location: { label: 'Add your city', icon: 'location-on' },
  skills: { label: 'Add what you’re good at', icon: 'auto-awesome' },
  work: { label: 'Add a project or a link to your work', icon: 'folder-special' },
  create: { label: 'Post your first video', icon: 'videocam' },
};

export function nameOf(p: { displayName: string | null; username: string }): string {
  return p.displayName ?? `@${p.username}`;
}

/** The @handle line under the name (skipped when the name already is the handle). */
export function handleOf(p: { displayName: string | null; username: string }): string {
  return p.displayName ? `@${p.username}` : '';
}

export function initialsOf(name: string): string {
  const letters = name
    .replace(/^@/, '')
    .split(/[\s._]+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase());
  return (letters.slice(0, 2).join('') || '?').slice(0, 2);
}

export function locationOf(p: PublicCreatorProfile): string | undefined {
  const parts = [p.location.city, p.location.region, p.location.countryName].filter(Boolean);
  return parts.length ? parts.join(', ') : undefined;
}

export function statsOf(p: PublicCreatorProfile): ProfileStat[] {
  return [
    { value: String(p.stats.followers), label: 'Followers' },
    { value: String(p.stats.following), label: 'Following' },
    { value: String(p.stats.videos), label: 'Videos' },
  ];
}

export function skillsOf(skills: SkillRef[]): Skill[] {
  return skills.map((s, i) => ({ label: s.name, tone: i === 0 ? 'secondary' : 'neutral' }));
}

function open(url: string) {
  void Linking.openURL(url).catch(() => {});
}

export function linksOf(p: PublicCreatorProfile) {
  return p.links.map((l) => ({ key: l.id, label: l.label, onOpen: () => open(l.url) }));
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function projectsOf(p: PublicCreatorProfile): ProfileProjectCard[] {
  return p.projects.map((pr) => ({
    key: pr.id,
    kicker: pr.featured ? 'Featured work' : 'Project',
    title: pr.title,
    tag: pr.projectDate?.slice(0, 4),
    summary: pr.description ?? '',
    meta: pr.link ? hostOf(pr.link) : '',
    tone: pr.featured ? 'secondary' : 'primary',
    ...(pr.link ? { onOpen: () => open(pr.link!) } : {}),
  }));
}

/** My Work: real videos. Thumbnails are signed URLs from the API. */
export function videosOf(
  p: PublicCreatorProfile,
  open?: (videoId: string) => void,
): ProfileWorkTile[] {
  return p.videos.map((v) => ({
    key: v.id,
    title: v.title ?? 'Untitled video',
    image: v.thumbnailUrl ? { uri: mediaUrl(v.thumbnailUrl)! } : null,
    locked: v.visibility === 'private',
    ...(open ? { onPress: () => open(v.id) } : {}),
    ...(v.durationSeconds != null
      ? {
          duration: `${Math.floor(v.durationSeconds / 60)}:${String(v.durationSeconds % 60).padStart(2, '0')}`,
        }
      : {}),
  }));
}
