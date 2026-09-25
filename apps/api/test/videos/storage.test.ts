import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { assertProductionSafe, loadEnv } from '../../src/config/env.js';
import {
  LocalDiskStorage,
  MediaSigner,
  videoStorageFromEnv,
} from '../../src/modules/videos/storage.js';
import { createTestApp, createTestAuth } from '../helpers/auth.js';
import { getDb } from '../helpers/db.js';
import { createTestVideoDeps, makeVideoFixtures, randomUuid } from '../helpers/video.js';

describe('video storage', () => {
  describe('configuration', () => {
    it('refuses local storage in production', () => {
      const env = loadEnv({ NODE_ENV: 'development', VIDEO_STORAGE: 'local' });
      expect(() => assertProductionSafe({ ...env, NODE_ENV: 'production' })).toThrow(
        /VIDEO_STORAGE=local is development-only/,
      );
      expect(() =>
        videoStorageFromEnv({ ...env, NODE_ENV: 'production', VIDEO_STORAGE: 'local' }),
      ).toThrow();
    });

    it('disables uploads (with a reason) when storage is not configured', () => {
      const env = loadEnv({ NODE_ENV: 'development' });
      const setup = videoStorageFromEnv(env);
      expect(setup.storage).toBeNull();
      expect(setup.unavailableReason).toMatch(/not configured/);
    });

    it('marks local storage as development-only', () => {
      const env = loadEnv({ NODE_ENV: 'development', VIDEO_STORAGE: 'local' });
      expect(videoStorageFromEnv(env).storage?.isDevelopmentOnly).toBe(true);
    });
  });

  describe('local disk storage', () => {
    it('only accepts server-shaped keys (no path traversal)', () => {
      const s = new LocalDiskStorage('/tmp/jobtok-test', new MediaSigner('x'.repeat(40)));
      for (const bad of [
        '../secrets.txt',
        'videos/../../etc/passwd',
        'videos/abc.mp4',
        `videos/${randomUuid()}.exe`,
        `/abs/videos/${randomUuid()}.mp4`,
        `videos\\${randomUuid()}.mp4`,
      ]) {
        expect(() => s.pathFor(bad), bad).toThrow();
      }
      const good = `videos/${randomUuid()}.mp4`;
      expect(s.pathFor(good)).toBe(path.resolve('/tmp/jobtok-test', good));
    });
  });

  describe('signed media URLs', () => {
    it('expire and cannot be forged or reused for another file', () => {
      let now = 1_000_000_000_000;
      const signer = new MediaSigner('a'.repeat(40), () => now);
      const key = `videos/${randomUuid()}.mp4`;
      const { exp, sig } = signer.sign(key, 60);
      expect(signer.verify(key, exp, sig)).toBe(true);
      expect(signer.verify(`videos/${randomUuid()}.mp4`, exp, sig)).toBe(false);
      expect(signer.verify(key, exp + 1, sig)).toBe(false);
      expect(new MediaSigner('b'.repeat(40), () => now).verify(key, exp, sig)).toBe(false);
      now += 61_000;
      expect(signer.verify(key, exp, sig)).toBe(false);
    });
  });

  describe('media route', () => {
    const db = getDb();
    let app: ReturnType<typeof createTestApp>['app'];
    let deps: Awaited<ReturnType<typeof createTestVideoDeps>>;
    let key: string;
    let size: number;

    beforeAll(async () => {
      const [t, d, fx] = await Promise.all([
        createTestAuth(),
        createTestVideoDeps(),
        makeVideoFixtures(),
      ]);
      deps = d;
      app = createTestApp(db, t, deps).app;
      key = `videos/${randomUuid()}.mp4`;
      const src = path.join(fx.dir, 'upload.mp4');
      await writeFile(src, fx.mp4);
      await deps.storage.put(key, src);
      size = fx.mp4.length;
    });

    it('streams a file for a valid signed URL, with byte ranges for seeking', async () => {
      const url = deps.storage.url(key, 60);
      const full = await request(app).get(url).expect(200);
      expect(full.headers['content-type']).toBe('video/mp4');
      expect(Number(full.headers['content-length'])).toBe(size);
      expect(full.headers['cross-origin-resource-policy']).toBe('cross-origin');

      const part = await request(app).get(url).set('Range', 'bytes=0-99').expect(206);
      expect(part.headers['content-range']).toBe(`bytes 0-99/${size}`);
      expect(Number(part.headers['content-length'])).toBe(100);
    });

    it('refuses unsigned, tampered, expired or path-like requests', async () => {
      const url = deps.storage.url(key, 60);
      expect((await request(app).get(`/api/v1/media/${key}`)).status).toBe(403);
      expect((await request(app).get(url.replace(/sig=[^&]+/, 'sig=forged'))).status).toBe(403);
      const expired = deps.signer.sign(key, -10);
      expect(
        (await request(app).get(`/api/v1/media/${key}?exp=${expired.exp}&sig=${expired.sig}`))
          .status,
      ).toBe(403);
      const traversal = deps.signer.sign('../package.json', 60);
      expect(
        (
          await request(app).get(
            `/api/v1/media/..%2Fpackage.json?exp=${traversal.exp}&sig=${traversal.sig}`,
          )
        ).status,
      ).toBeGreaterThanOrEqual(400);
    });

    it('returns 404 for a signed key that does not exist', async () => {
      const missing = deps.storage.url(`videos/${randomUuid()}.mp4`, 60);
      expect((await request(app).get(missing)).status).toBe(404);
    });
  });
});
