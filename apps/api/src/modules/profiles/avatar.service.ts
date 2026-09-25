// Profile photos. The upload is streamed to a temp file (with a hard size cap), sniffed and
// re-encoded by the processor into a square JPEG without metadata, then stored under a fresh
// key so old copies in any cache simply stop being referenced.
import type { MyCreatorProfile } from '@jobtok/types';
import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Transform, type Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { Db } from '../../db/client.js';
import { HttpError } from '../../lib/http.js';
import { VideoRejected, type VideoProcessor } from '../videos/processor.js';
import type { VideoStorage } from '../videos/storage.js';
import type { ProfileService } from './profile.service.js';

/** Phone photos are usually 2–6 MB; anything bigger is almost certainly not a photo. */
export const AVATAR_MAX_BYTES = 10 * 1024 * 1024;

export interface AvatarDeps {
  storage: VideoStorage | null;
  processor: VideoProcessor | null;
}

class TooLarge extends Error {}

export class AvatarService {
  constructor(
    private readonly db: Db,
    private readonly deps: AvatarDeps,
    private readonly profiles: ProfileService,
    private readonly maxBytes = AVATAR_MAX_BYTES,
  ) {}

  private requireMedia() {
    const { storage, processor } = this.deps;
    if (!storage || !processor) {
      throw new HttpError(
        503,
        'photo_uploads_unavailable',
        'Profile photos can’t be uploaded on this server yet. Please try again later.',
      );
    }
    return { storage, processor };
  }

  private tooLarge() {
    const mb = Math.round(this.maxBytes / (1024 * 1024));
    return new HttpError(
      413,
      'photo_too_large',
      `That photo is too big. Photos can be up to ${mb} MB.`,
    );
  }

  /** Replaces the caller's profile photo. Returns their updated profile. */
  async set(
    userId: string,
    body: Readable,
    declaredLength: number | null,
  ): Promise<MyCreatorProfile> {
    const { storage, processor } = this.requireMedia();
    if (declaredLength !== null && declaredLength > this.maxBytes) throw this.tooLarge();
    const profileId = await this.profiles.ensureProfile(userId);

    const work = path.join(tmpdir(), `jobtok-avatar-${randomUUID()}`);
    const out = `${work}.jpg`;
    const key = `avatars/${randomUUID()}.jpg`;
    let stored = false;
    try {
      let bytes = 0;
      const max = this.maxBytes;
      const counter = new Transform({
        transform(chunk: Buffer, _enc, cb) {
          bytes += chunk.length;
          if (bytes > max) cb(new TooLarge());
          else cb(null, chunk);
        },
      });
      await pipeline(body, counter, createWriteStream(work));
      if (bytes < 100) throw new VideoRejected('That file is empty. Choose a photo.');

      await processor.avatar(work, out);
      await storage.put(key, out);
      stored = true;

      const before = await this.db.profile.findUnique({
        where: { id: profileId },
        select: { avatarStorageKey: true },
      });
      await this.db.profile.update({ where: { id: profileId }, data: { avatarStorageKey: key } });
      // The old file is no longer referenced; removing it is best-effort.
      if (before?.avatarStorageKey) await storage.delete(before.avatarStorageKey).catch(() => {});
    } catch (err) {
      if (stored) await storage.delete(key).catch(() => {});
      if (err instanceof TooLarge) throw this.tooLarge();
      if (err instanceof VideoRejected) throw new HttpError(400, 'photo_rejected', err.message);
      throw err;
    } finally {
      await rm(work, { force: true });
      await rm(out, { force: true });
    }
    return this.mine(userId);
  }

  /** Removes the caller's profile photo (initials show again). */
  async remove(userId: string): Promise<MyCreatorProfile> {
    const row = await this.db.profile.findUnique({
      where: { userId },
      select: { id: true, avatarStorageKey: true },
    });
    if (row?.avatarStorageKey) {
      await this.db.profile.update({ where: { id: row.id }, data: { avatarStorageKey: null } });
      await this.deps.storage?.delete(row.avatarStorageKey).catch(() => {});
    }
    return this.mine(userId);
  }

  private async mine(userId: string): Promise<MyCreatorProfile> {
    const profile = await this.profiles.getMine(userId);
    if (!profile) throw new HttpError(404, 'profile_not_found', 'We couldn’t find your profile.');
    return profile;
  }
}
