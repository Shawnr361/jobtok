import { Readable } from 'node:stream';
import { VIDEO_LIMITS } from '@jobtok/types';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  createTestApp,
  createTestAuth,
  phoneSignIn,
  registerVerified,
  type TestAuth,
} from '../helpers/auth.js';
import { VideoService } from '../../src/modules/videos/video.service.js';
import { getDb, resetAndSeed } from '../helpers/db.js';
import {
  createTestVideoDeps,
  makeVideoFixtures,
  randomUuid,
  type VideoFixtures,
} from '../helpers/video.js';

type Deps = Awaited<ReturnType<typeof createTestVideoDeps>>;

const PRIVATE_KEYS = [
  'videoStorageKey',
  'thumbnailStorageKey',
  'storageKey',
  'videoSizeBytes',
  'sizeBytes',
  'userId',
  'isFlagged',
  'flagCount',
  'email',
  'phone',
  'passwordHash',
];

function allKeys(value: unknown, into = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => allKeys(v, into));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      into.add(k);
      allKeys(v, into);
    }
  }
  return into;
}

describe('video posts', () => {
  const db = getDb();
  let t: TestAuth;
  let deps: Deps;
  let fx: VideoFixtures;
  let api: ReturnType<typeof createTestApp>;
  let amaka: { token: string; userId: string };
  let bola: { token: string; userId: string };
  let weldingId: string;

  const as = (token?: string) => {
    const wrap = (r: request.Test) => (token ? r.set('Authorization', `Bearer ${token}`) : r);
    return {
      get: (p: string) => wrap(request(api.app).get(`/api/v1${p}`)),
      post: (p: string) => wrap(request(api.app).post(`/api/v1${p}`)),
      patch: (p: string) => wrap(request(api.app).patch(`/api/v1${p}`)),
      put: (p: string) => wrap(request(api.app).put(`/api/v1${p}`)),
      delete: (p: string) => wrap(request(api.app).delete(`/api/v1${p}`)),
    };
  };

  /** Create → upload → (optionally) publish, the way the app does it. */
  async function postVideo(
    token: string,
    details: Record<string, unknown> = {},
    { file, publish = true }: { file?: Buffer; publish?: boolean } = {},
  ) {
    const created = await as(token)
      .post('/videos')
      .send({ caption: 'Building a gate from raw steel', ...details })
      .expect(201);
    const { video, upload } = created.body.data;
    const up = await as(token)
      .put(upload.url.replace('/api/v1', ''))
      .set('Content-Type', 'video/mp4')
      .send(file ?? fx.mp4);
    if (up.status !== 200) return { id: video.id as string, upload: up };
    if (publish) await as(token).post(`/videos/${video.id}/publish`).expect(200);
    return { id: video.id as string, upload: up };
  }

  beforeAll(async () => {
    await resetAndSeed(db);
    [t, deps, fx] = await Promise.all([
      createTestAuth(),
      createTestVideoDeps(),
      makeVideoFixtures(),
    ]);
    api = createTestApp(db, t, deps);
    const a = await phoneSignIn(t, api, '08036660101');
    amaka = { token: a.accessToken, userId: a.user.id };
    const b = await phoneSignIn(t, api, '08036660102');
    bola = { token: b.accessToken, userId: b.user.id };
    weldingId = (await db.skill.findUniqueOrThrow({ where: { slug: 'welding-and-fabrication' } }))
      .id;
    await as(amaka.token).patch('/profiles/me').send({ username: 'amaka.welds', city: 'Kaduna' });
  });

  describe('creating a video post', () => {
    it('requires sign-in', async () => {
      const res = await as().post('/videos').send({ caption: 'x' });
      expect(res.status).toBe(401);
    });

    it('requires a verified phone', async () => {
      const email = await registerVerified(t, api, 'nophone@example.com');
      const res = await as(email.accessToken).post('/videos').send({ caption: 'x' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('phone_verification_required');
    });

    it('saves the details as an unpublished draft and returns where to upload', async () => {
      const res = await as(amaka.token)
        .post('/videos')
        .send({
          caption: '  Watch me build this   custom gate ',
          categorySlug: 'skilled-trades',
          skillIds: [weldingId, weldingId],
          tools: ['Arc welder', 'Angle grinder', ''],
          tips: ['Tack everything before you weld it solid.'],
        })
        .expect(201);
      const { video, upload } = res.body.data;
      expect(video).toMatchObject({
        caption: 'Watch me build this custom gate',
        category: { slug: 'skilled-trades' },
        skills: [{ id: weldingId }], // de-duplicated
        learn: {
          tools: ['Arc welder', 'Angle grinder'],
          tips: ['Tack everything before you weld it solid.'],
        },
        location: { city: 'Kaduna' }, // from the profile
        status: 'awaiting_upload',
        isPublished: false,
        playbackUrl: null,
      });
      expect(upload).toMatchObject({ method: 'PUT', url: `/api/v1/videos/${video.id}/file` });
      const row = await db.post.findUniqueOrThrow({ where: { id: video.id } });
      expect(row).toMatchObject({
        userId: amaka.userId,
        isPublished: false,
        status: 'awaiting_upload',
      });
    });

    it.each([
      { body: {}, why: 'missing caption' },
      { body: { caption: '   ' }, why: 'blank caption' },
      { body: { caption: 'x'.repeat(VIDEO_LIMITS.caption + 1) }, why: 'caption too long' },
      { body: { caption: 'ok', skillIds: ['not-a-uuid'] }, why: 'bad skill id' },
      {
        body: { caption: 'ok', skillIds: Array.from({ length: 6 }, randomUuid) },
        why: 'too many skills',
      },
      { body: { caption: 'ok', visibility: 'friends' }, why: 'bad visibility' },
      {
        body: { caption: 'ok', tools: Array.from({ length: 11 }, (_, i) => `t${i}`) },
        why: 'too many tools',
      },
      { body: { caption: 'ok', userId: randomUuid() }, why: 'client-chosen owner' },
      { body: { caption: 'ok', status: 'ready' }, why: 'client-chosen status' },
      { body: { caption: 'ok', isPublished: true }, why: 'client-chosen publication' },
      {
        body: { caption: 'ok', videoStorageKey: '../../etc/passwd' },
        why: 'client-chosen storage key',
      },
      { body: { caption: 'ok', createdAt: '2020-01-01' }, why: 'client-chosen date' },
    ])('rejects $why', async ({ body }) => {
      const res = await as(amaka.token).post('/videos').send(body);
      expect(res.status).toBe(400);
    });

    it('rejects unknown categories and skills', async () => {
      const cat = await as(amaka.token)
        .post('/videos')
        .send({ caption: 'ok', categorySlug: 'nope' });
      expect(cat.status).toBe(400);
      expect(cat.body.error.code).toBe('invalid_category');
      const skill = await as(amaka.token)
        .post('/videos')
        .send({ caption: 'ok', skillIds: [randomUuid()] });
      expect(skill.status).toBe(400);
      expect(skill.body.error.code).toBe('invalid_skill');
    });
  });

  describe('uploading and processing', () => {
    it('stores a real MP4, reads its real metadata and makes a thumbnail', async () => {
      const { id, upload } = await postVideo(amaka.token, {}, { publish: false });
      expect(upload.status).toBe(200);
      expect(upload.body.data.video).toMatchObject({
        status: 'ready',
        isPublished: false,
        durationSeconds: 3,
        width: 240,
        height: 426,
      });
      expect(upload.body.data.video.playbackUrl).toMatch(
        /^\/api\/v1\/media\/videos\/.+\.mp4\?exp=\d+&sig=/,
      );
      expect(upload.body.data.video.thumbnailUrl).toMatch(
        /^\/api\/v1\/media\/thumbnails\/.+\.jpg\?/,
      );

      const row = await db.post.findUniqueOrThrow({ where: { id } });
      expect(row).toMatchObject({
        videoStorageKey: `videos/${id}.mp4`,
        thumbnailStorageKey: `thumbnails/${id}.jpg`,
        videoMimeType: 'video/mp4',
        videoSizeBytes: fx.mp4.length,
      });
      expect(await deps.storage.size(`videos/${id}.mp4`)).toBe(fx.mp4.length);
    });

    it('detects QuickTime from the file itself, whatever the client claims', async () => {
      const { id, upload } = await postVideo(amaka.token, {}, { file: fx.mov, publish: false });
      expect(upload.status).toBe(200);
      const row = await db.post.findUniqueOrThrow({ where: { id } });
      expect(row).toMatchObject({
        videoMimeType: 'video/quicktime',
        videoStorageKey: `videos/${id}.mov`,
      });
    });

    it.each([
      ['text', 'Please upload an MP4 or MOV video.'],
      ['audioOnly', 'That file has no video in it. Try another one.'],
      [
        'oldCodec',
        'That video uses a format phones can’t play yet. Record it again with your camera app.',
      ],
      [
        'tooLong',
        `Videos can be up to ${VIDEO_LIMITS.maxDurationSeconds} seconds. Trim it and try again.`,
      ],
      ['truncated', 'We couldn’t read that video. It may be damaged. Try another one.'],
    ] as const)(
      'rejects %s with a clear reason and leaves nothing in storage',
      async (name, reason) => {
        const { id, upload } = await postVideo(amaka.token, {}, { file: fx[name], publish: false });
        expect(upload.status).toBe(422);
        expect(upload.body.error).toMatchObject({ code: 'video_rejected', message: reason });
        const row = await db.post.findUniqueOrThrow({ where: { id } });
        expect(row).toMatchObject({
          status: 'failed',
          processingError: reason,
          videoStorageKey: null,
        });
        expect(await deps.storage.size(`videos/${id}.mp4`)).toBeNull();
        expect(await deps.storage.size(`thumbnails/${id}.jpg`)).toBeNull();
        // A failed video can't be published...
        const pub = await as(amaka.token).post(`/videos/${id}/publish`);
        expect(pub.status).toBe(409);
        // ...but a good file can be uploaded again.
        await as(amaka.token).put(`/videos/${id}/file`).send(fx.mp4).expect(200);
      },
    );

    it('refuses a declared-too-big file before reading any of it', async () => {
      const capped = createTestApp(db, t, { ...deps, maxBytes: 20_000 });
      const created = await request(capped.app)
        .post('/api/v1/videos')
        .set('Authorization', `Bearer ${amaka.token}`)
        .send({ caption: 'Big one' })
        .expect(201);
      const id = created.body.data.video.id;
      const res = await request(capped.app)
        .put(`/api/v1/videos/${id}/file`)
        .set('Authorization', `Bearer ${amaka.token}`)
        .send(fx.mp4);
      expect(res.status).toBe(413);
      expect(res.body.error.code).toBe('video_too_large');
      // Nothing was received, so the draft simply waits for a smaller file.
      expect((await db.post.findUniqueOrThrow({ where: { id } })).status).toBe('awaiting_upload');
    });

    it('stops a streamed upload as soon as it passes the limit, and cleans up', async () => {
      const service = new VideoService(db, { ...deps, maxBytes: 20_000 });
      const { video } = await service.create(amaka.userId, { caption: 'Streamed' });
      const chunks = Readable.from([fx.mp4.subarray(0, 15_000), fx.mp4.subarray(15_000)]);
      await expect(
        service.receiveUpload(amaka.userId, video.id, chunks, null),
      ).rejects.toMatchObject({
        status: 413,
        code: 'video_too_large',
      });
      const row = await db.post.findUniqueOrThrow({ where: { id: video.id } });
      expect(row).toMatchObject({ status: 'failed', videoStorageKey: null });
      expect(await deps.storage.size(`videos/${video.id}.mp4`)).toBeNull();
    });

    it('does not accept a second upload for a ready video', async () => {
      const { id } = await postVideo(amaka.token, {}, { publish: false });
      const again = await as(amaka.token).put(`/videos/${id}/file`).send(fx.mp4);
      expect(again.status).toBe(409);
      expect(again.body.error.code).toBe('video_already_uploaded');
    });

    it('says clearly when video storage is not configured', async () => {
      const off = createTestApp(db, t, {
        storage: null,
        processor: null,
        unavailableReason: 'Video storage is not configured on this server',
        maxBytes: 0,
        urlTtlSeconds: 3600,
        signer: deps.signer,
      });
      const res = await request(off.app)
        .post('/api/v1/videos')
        .set('Authorization', `Bearer ${amaka.token}`)
        .send({ caption: 'x' });
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('video_uploads_unavailable');
    });
  });

  describe('ownership', () => {
    it("lets nobody else upload to, edit, publish or delete someone's video", async () => {
      const created = await as(amaka.token).post('/videos').send({ caption: 'Mine' }).expect(201);
      const id = created.body.data.video.id;
      expect((await as(bola.token).put(`/videos/${id}/file`).send(fx.mp4)).status).toBe(404);
      await as(amaka.token).put(`/videos/${id}/file`).send(fx.mp4).expect(200);
      expect((await as(bola.token).post(`/videos/${id}/publish`)).status).toBe(404);
      expect((await as(bola.token).patch(`/videos/${id}`).send({ caption: 'Hacked' })).status).toBe(
        404,
      );
      expect((await as(bola.token).delete(`/videos/${id}`)).status).toBe(404);
      expect((await as().delete(`/videos/${id}`)).status).toBe(401);
      const row = await db.post.findUniqueOrThrow({ where: { id } });
      expect(row).toMatchObject({ title: 'Mine', userId: amaka.userId, isPublished: false });
      expect(await deps.storage.size(`videos/${id}.mp4`)).not.toBeNull();
    });

    it('lets the owner edit details and delete the video and its files', async () => {
      const { id } = await postVideo(amaka.token);
      const edited = await as(amaka.token)
        .patch(`/videos/${id}`)
        .send({ caption: 'Gate, day two', skillIds: [], categorySlug: null })
        .expect(200);
      expect(edited.body.data.video).toMatchObject({
        caption: 'Gate, day two',
        skills: [],
        category: null,
      });

      await as(amaka.token).delete(`/videos/${id}`).expect(200);
      expect(await db.post.count({ where: { id } })).toBe(0);
      expect(await deps.storage.size(`videos/${id}.mp4`)).toBeNull();
      expect(await deps.storage.size(`thumbnails/${id}.jpg`)).toBeNull();
      expect((await as(amaka.token).get(`/videos/${id}`)).status).toBe(404);
    });
  });

  describe('publishing, visibility and the feed', () => {
    let publicId: string;
    let privateId: string;
    let draftId: string;

    beforeAll(async () => {
      await db.post.deleteMany({ where: { userId: { in: [amaka.userId, bola.userId] } } });
      draftId = (await postVideo(amaka.token, { caption: 'Unpublished draft' }, { publish: false }))
        .id;
      privateId = (await postVideo(amaka.token, { caption: 'Just for me', visibility: 'private' }))
        .id;
      publicId = (
        await postVideo(amaka.token, {
          caption: 'Building a gate from raw steel',
          categorySlug: 'skilled-trades',
          skillIds: [weldingId],
          tools: ['Arc welder'],
        })
      ).id;
    });

    it('shows only published, public, ready videos in the feed', async () => {
      const res = await as(bola.token).get('/feed').expect(200);
      const ids = res.body.data.items.map((v: { id: string }) => v.id);
      expect(ids).toContain(publicId);
      expect(ids).not.toContain(privateId);
      expect(ids).not.toContain(draftId);
      const item = res.body.data.items.find((v: { id: string }) => v.id === publicId);
      expect(item).toMatchObject({
        caption: 'Building a gate from raw steel',
        creator: { username: 'amaka.welds' },
        category: { slug: 'skilled-trades' },
        skills: [{ id: weldingId }],
        stats: { likes: 0, saves: 0 },
        viewer: { liked: false, saved: false, followingCreator: false, isMine: false },
      });
      expect(item.playbackUrl).toBeTruthy();
    });

    it('never leaks storage keys, sizes, flags or owner data in public responses', async () => {
      const feed = await as(bola.token).get('/feed');
      const one = await as(bola.token).get(`/videos/${publicId}`).expect(200);
      for (const body of [feed.body, one.body]) {
        const keys = allKeys(body);
        for (const k of PRIVATE_KEYS) expect(keys.has(k), k).toBe(false);
        for (const k of ['status', 'processingError', 'isPublished'])
          expect(keys.has(k), k).toBe(false);
      }
    });

    it('hides drafts and private videos from everyone but the owner', async () => {
      expect((await as(bola.token).get(`/videos/${draftId}`)).status).toBe(404);
      expect((await as(bola.token).get(`/videos/${privateId}`)).status).toBe(404);
      expect((await as().get(`/videos/${privateId}`)).status).toBe(404);
      const mine = await as(amaka.token).get(`/videos/${privateId}`).expect(200);
      expect(mine.body.data.video).toMatchObject({ visibility: 'private', status: 'ready' });
      const list = await as(amaka.token).get('/videos/mine').expect(200);
      expect(list.body.data.videos.map((v: { id: string }) => v.id)).toEqual(
        expect.arrayContaining([publicId, privateId, draftId]),
      );
    });

    it('filters the Learn, Near You and Following tabs', async () => {
      const learn = await as(bola.token).get('/feed?tab=learn').expect(200);
      expect(learn.body.data.items.map((v: { id: string }) => v.id)).toEqual([publicId]);

      const nearNoCity = await as(bola.token).get('/feed?tab=near').expect(200);
      expect(nearNoCity.body.data).toMatchObject({ items: [], needsCity: true });
      await as(bola.token).patch('/profiles/me').send({ city: 'kaduna' });
      const near = await as(bola.token).get('/feed?tab=near').expect(200);
      expect(near.body.data.items.map((v: { id: string }) => v.id)).toEqual([publicId]);

      expect((await as(bola.token).get('/feed?tab=following')).body.data.items).toEqual([]);
      await as(bola.token).post('/profiles/amaka.welds/follow').expect(200);
      const following = await as(bola.token).get('/feed?tab=following').expect(200);
      expect(following.body.data.items[0]).toMatchObject({
        id: publicId,
        viewer: { followingCreator: true },
      });
    });

    it('records real likes, saves and watch signals', async () => {
      const liked = await as(bola.token).post(`/videos/${publicId}/like`).expect(200);
      expect(liked.body.data).toEqual({ liked: true, likes: 1 });
      await as(bola.token).post(`/videos/${publicId}/like`).expect(200); // idempotent
      await as(bola.token).post(`/videos/${publicId}/save`).expect(200);
      await as(bola.token).post(`/videos/${publicId}/events`).send({ type: 'play' }).expect(202);
      await as(bola.token)
        .post(`/videos/${publicId}/events`)
        .send({ type: 'complete', watchMs: 3000 })
        .expect(202);
      const bad = await as(bola.token).post(`/videos/${publicId}/events`).send({ type: 'like' });
      expect(bad.status).toBe(400); // likes only via the like endpoint

      const events = await db.interactionEvent.findMany({
        where: { postId: publicId, userId: bola.userId },
        orderBy: { createdAt: 'asc' },
      });
      expect(events.map((e) => e.type)).toEqual(['like', 'save', 'play', 'complete']);
      expect(events.every((e) => e.creatorId === amaka.userId)).toBe(true);

      const feed = await as(bola.token).get('/feed');
      const item = feed.body.data.items.find((v: { id: string }) => v.id === publicId);
      expect(item).toMatchObject({
        stats: { likes: 1, saves: 1 },
        viewer: { liked: true, saved: true },
      });

      const unliked = await as(bola.token).delete(`/videos/${publicId}/like`).expect(200);
      expect(unliked.body.data).toEqual({ liked: false, likes: 0 });
      // No interaction with videos you can't see.
      expect((await as(bola.token).post(`/videos/${privateId}/like`)).status).toBe(404);
    });

    it('ranks Trending by real engagement, not follower counts', async () => {
      const res = await as(bola.token).get('/feed?tab=trending').expect(200);
      expect(res.body.data.items[0].id).toBe(publicId);
    });

    it('rejects a tampered cursor', async () => {
      expect((await as(bola.token).get('/feed?cursor=nonsense')).status).toBe(400);
    });
  });

  describe('profile integration', () => {
    it('shows public videos under My Work and counts the first real video for completion', async () => {
      const fresh = await phoneSignIn(t, api, '08036660103');
      await as(fresh.accessToken)
        .patch('/profiles/me')
        .send({ username: 'new.creator' })
        .expect(201);
      const before = await as(fresh.accessToken).get('/profiles/me');
      const step = (body: typeof before.body) =>
        body.data.profile.completion.steps.find((s: { key: string }) => s.key === 'create').done;
      expect(step(before.body)).toBe(false);

      // Creating a draft and uploading are not enough: only publishing counts.
      const { id } = await postVideo(
        fresh.accessToken,
        { caption: 'My first video' },
        { publish: false },
      );
      expect(step((await as(fresh.accessToken).get('/profiles/me')).body)).toBe(false);
      await as(fresh.accessToken).post(`/videos/${id}/publish`).expect(200);
      const after = await as(fresh.accessToken).get('/profiles/me');
      expect(step(after.body)).toBe(true);
      expect(after.body.data.profile.videos).toMatchObject([
        { id, title: 'My first video', visibility: 'public' },
      ]);
      expect(after.body.data.profile.videos[0].thumbnailUrl).toMatch(
        /^\/api\/v1\/media\/thumbnails\//,
      );

      const pub = await as(bola.token).get('/profiles/new.creator').expect(200);
      expect(pub.body.data.profile.videos.map((v: { id: string }) => v.id)).toEqual([id]);
      expect(pub.body.data.profile.stats.videos).toBe(1);
    });

    it('keeps private videos off the public profile', async () => {
      const mine = await as(amaka.token).get('/profiles/me');
      const pub = await as(bola.token).get('/profiles/amaka.welds');
      const vis = (list: { visibility: string }[]) => list.map((v) => v.visibility);
      expect(vis(mine.body.data.profile.videos)).toContain('private');
      expect(vis(pub.body.data.profile.videos)).not.toContain('private');
    });

    it('lets people follow and unfollow real creators (not themselves)', async () => {
      const self = await as(amaka.token).post('/profiles/amaka.welds/follow');
      expect(self.status).toBe(400);
      const view = await as(bola.token).get('/profiles/amaka.welds').expect(200);
      expect(view.body.data.profile.viewer).toEqual({ following: true, isMe: false });
      const off = await as(bola.token).delete('/profiles/amaka.welds/follow').expect(200);
      expect(off.body.data).toEqual({ following: false, followers: 0 });
    });
  });
});
