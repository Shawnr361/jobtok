import { execFile } from 'node:child_process';
import { Readable } from 'node:stream';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { AvatarService } from '../../src/modules/profiles/avatar.service.js';
import { ProfileService } from '../../src/modules/profiles/profile.service.js';
import { AVATAR_SIZE } from '../../src/modules/videos/processor.js';
import { createTestApp, createTestAuth, phoneSignIn, type TestAuth } from '../helpers/auth.js';
import { getDb, resetAndSeed } from '../helpers/db.js';
import { createTestVideoDeps, makeImageFixtures, type ImageFixtures } from '../helpers/video.js';

function ffprobe(
  file: string,
): Promise<{ width: number; height: number; codec: string; tags: string }> {
  return new Promise((resolve, reject) =>
    execFile(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'stream=width,height,codec_name:format_tags',
        '-of',
        'json',
        file,
      ],
      { windowsHide: true },
      (err, out) => {
        if (err) return reject(err);
        const j = JSON.parse(out) as {
          streams: { width: number; height: number; codec_name: string }[];
          format?: { tags?: Record<string, string> };
        };
        resolve({
          width: j.streams[0]!.width,
          height: j.streams[0]!.height,
          codec: j.streams[0]!.codec_name,
          tags: JSON.stringify(j.format?.tags ?? {}),
        });
      },
    ),
  );
}

describe('profile photos', () => {
  const db = getDb();
  let t: TestAuth;
  let media: Awaited<ReturnType<typeof createTestVideoDeps>>;
  let api: ReturnType<typeof createTestApp>;
  let img: ImageFixtures;
  let ada: { token: string; userId: string };
  let bola: { token: string; userId: string };

  const put = (token: string | null, body: Buffer, type = 'image/jpeg') => {
    const r = request(api.app).put('/api/v1/profiles/me/avatar').set('Content-Type', type);
    return (token ? r.set('Authorization', `Bearer ${token}`) : r).send(body);
  };
  const keyOf = async (userId: string) =>
    (await db.profile.findUnique({ where: { userId }, select: { avatarStorageKey: true } }))
      ?.avatarStorageKey ?? null;

  beforeAll(async () => {
    await resetAndSeed(db);
    t = await createTestAuth();
    media = await createTestVideoDeps();
    api = createTestApp(db, t, media);
    img = await makeImageFixtures();
    const a = await phoneSignIn(t, api, '08035557001');
    ada = { token: a.accessToken, userId: a.user.id };
    const b = await phoneSignIn(t, api, '08035557002');
    bola = { token: b.accessToken, userId: b.user.id };
  });

  it('turns an uploaded JPEG into a square JPEG without metadata, and shows it', async () => {
    const res = await put(ada.token, img.jpeg).expect(200);
    const url: string = res.body.data.profile.avatarUrl;
    expect(url).toMatch(/^\/api\/v1\/media\/avatars\/[0-9a-f-]{36}\.jpg\?exp=\d+&sig=/);

    const key = await keyOf(ada.userId);
    expect(key).toMatch(/^avatars\/[0-9a-f-]{36}\.jpg$/);
    const onDisk = await ffprobe(media.storage.pathFor(key!));
    expect(onDisk).toMatchObject({ width: AVATAR_SIZE, height: AVATAR_SIZE, codec: 'mjpeg' });
    expect(onDisk.tags).not.toContain('secret-location');

    // The signed link really serves the photo.
    const served = await request(api.app).get(url).expect(200);
    expect(served.headers['content-type']).toBe('image/jpeg');
    expect(served.body.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));

    // Everyone sees it on the public profile.
    const handle = res.body.data.profile.username;
    const pub = await request(api.app).get(`/api/v1/profiles/${handle}`).expect(200);
    expect(pub.body.data.profile.avatarUrl).toMatch(/\/media\/avatars\//);
    expect(JSON.stringify(pub.body)).not.toContain('avatarStorageKey');
  });

  it('accepts PNG and WebP, replaces the old photo and deletes its file', async () => {
    const first = await keyOf(ada.userId);
    await put(ada.token, img.png, 'image/png').expect(200);
    const second = await keyOf(ada.userId);
    expect(second).not.toBe(first);
    expect(await media.storage.size(first!)).toBeNull();

    await put(ada.token, img.webp, 'image/webp').expect(200);
    const third = await keyOf(ada.userId);
    expect(await media.storage.size(second!)).toBeNull();
    expect(await media.storage.size(third!)).toBeGreaterThan(1000);
  });

  it('creates the profile on the first photo if there was none', async () => {
    expect(await db.profile.findUnique({ where: { userId: bola.userId } })).toBeNull();
    const res = await put(bola.token, img.png, 'image/png').expect(200);
    expect(res.body.data.profile.avatarUrl).toMatch(/\/media\/avatars\//);
  });

  it.each([
    { name: 'a GIF', file: (i: ImageFixtures) => i.gif, message: /JPG, PNG or WebP/ },
    {
      name: 'a fake JPEG',
      file: (i: ImageFixtures) => i.fakeJpeg,
      // Junk after a JPEG header: ffprobe may read nonsense dimensions or nothing at all.
      message: /couldn’t read|couldn’t use|too small/,
    },
    { name: 'a tiny image', file: (i: ImageFixtures) => i.tiny, message: /too small/ },
    {
      name: 'plain text',
      file: () => Buffer.from('not a photo '.repeat(50)),
      message: /JPG, PNG or WebP/,
    },
  ])('rejects $name with a clear reason and keeps the current photo', async ({ file, message }) => {
    const before = await keyOf(ada.userId);
    const res = await put(ada.token, file(img));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('photo_rejected');
    expect(res.body.error.message).toMatch(message);
    expect(await keyOf(ada.userId)).toBe(before);
  });

  it('refuses photos over 10 MB, declared or streamed', async () => {
    // Straight at the service: over HTTP the server cuts the upload off before the client
    // finishes sending, which the test client reports as a socket error.
    const service = new AvatarService(db, media, new ProfileService(db));
    const big = Buffer.concat([img.jpeg, Buffer.alloc(11 * 1024 * 1024)]);
    const before = await keyOf(ada.userId);
    for (const [body, declared] of [
      [Readable.from([big]), null],
      [Readable.from([img.jpeg]), big.length],
    ] as const) {
      await expect(service.set(ada.userId, body, declared)).rejects.toMatchObject({
        status: 413,
        code: 'photo_too_large',
      });
    }
    expect(await keyOf(ada.userId)).toBe(before);
  });

  it('requires sign-in and never touches someone else’s photo', async () => {
    expect((await put(null, img.jpeg)).status).toBe(401);
    const adaKey = await keyOf(ada.userId);
    await put(bola.token, img.jpeg).expect(200);
    expect(await keyOf(ada.userId)).toBe(adaKey);
  });

  it('removes the photo and its file', async () => {
    const key = await keyOf(ada.userId);
    const res = await request(api.app)
      .delete('/api/v1/profiles/me/avatar')
      .set('Authorization', `Bearer ${ada.token}`)
      .expect(200);
    expect(res.body.data.profile.avatarUrl).toBeNull();
    expect(await keyOf(ada.userId)).toBeNull();
    expect(await media.storage.size(key!)).toBeNull();
  });

  it('says clearly when the server has no media storage', async () => {
    const bare = createTestApp(db, t);
    const res = await request(bare.app)
      .put('/api/v1/profiles/me/avatar')
      .set('Authorization', `Bearer ${ada.token}`)
      .set('Content-Type', 'image/jpeg')
      .send(img.jpeg);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('photo_uploads_unavailable');
  });

  it('rejects a storage key that is not an avatar key at the database', async () => {
    await expect(
      db.profile.update({
        where: { userId: bola.userId },
        data: { avatarStorageKey: '../../etc/passwd' },
      }),
    ).rejects.toThrow();
  });
});
