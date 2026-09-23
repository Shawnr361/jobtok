import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SEED_DEV_PASSWORD } from '../../src/db/seed-data.js';
import {
  TEST_ORIGIN,
  createTestApp,
  createTestAuth,
  phoneSignIn,
  type TestAuth,
} from '../helpers/auth.js';
import { getDb, resetAndSeed } from '../helpers/db.js';

const DAY = 24 * 60 * 60 * 1000;

describe('sessions', () => {
  const db = getDb();
  let t: TestAuth;
  let api: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    await resetAndSeed(db);
  });
  beforeEach(async () => {
    t = await createTestAuth();
    api = createTestApp(db, t);
  });

  const me = (token?: string) => {
    const r = api.mobile().get('/me');
    return token ? r.set('Authorization', `Bearer ${token}`) : r;
  };

  describe('authenticated user retrieval', () => {
    it('returns the signed-in user', async () => {
      const s = await phoneSignIn(t, api, '08036660001');
      const res = await me(s.accessToken);
      expect(res.status).toBe(200);
      expect(res.body.data.user).toMatchObject({
        id: s.user.id,
        phone: '+2348036660001',
        hasPassword: false,
      });
      expect(res.headers['cache-control']).toBe('no-store');
    });

    it('rejects requests without a token, with a malformed token, or with a forged token', async () => {
      expect((await me()).status).toBe(401);
      expect((await me('not-a-jwt')).body.error.code).toBe('invalid_token');
      const other = await createTestAuth({
        config: {
          accessTokenSecret: new TextEncoder().encode('a-completely-different-secret-value-123'),
        },
      });
      const forged = await phoneSignIn(other, createTestApp(db, other), '08036660002');
      expect((await me(forged.accessToken)).status).toBe(401);
    });
  });

  describe('expiry', () => {
    it('rejects access tokens after they expire', async () => {
      const s = await phoneSignIn(t, api, '08036660003');
      t.clock.advance(15 * 60 * 1000);
      const res = await me(s.accessToken);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('token_expired');
    });

    it('ends sessions whose refresh window has passed', async () => {
      const s = await phoneSignIn(t, api, '08036660004');
      t.clock.advance(31 * DAY);
      const res = await api.mobile().post('/refresh').send({ refreshToken: s.refreshToken });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('session_expired');
    });
  });

  describe('refresh', () => {
    it('rotates the refresh token (mobile)', async () => {
      const s = await phoneSignIn(t, api, '08036660005');
      const res = await api.mobile().post('/refresh').send({ refreshToken: s.refreshToken });
      expect(res.status).toBe(200);
      const next = res.body.data;
      expect(next.refreshToken).not.toBe(s.refreshToken);
      expect((await me(next.accessToken)).status).toBe(200);
    });

    it('treats reuse of a rotated refresh token as theft and revokes the session', async () => {
      const s = await phoneSignIn(t, api, '08036660006');
      const rotated = (await api.mobile().post('/refresh').send({ refreshToken: s.refreshToken }))
        .body.data;
      const replay = await api.mobile().post('/refresh').send({ refreshToken: s.refreshToken });
      expect(replay.status).toBe(401);
      // The legitimate holder's tokens are revoked too.
      expect(
        (await api.mobile().post('/refresh').send({ refreshToken: rotated.refreshToken })).status,
      ).toBe(401);
      expect((await me(rotated.accessToken)).status).toBe(401);
    });

    it('refreshes web sessions from the HTTP-only cookie, only for allowed origins', async () => {
      const login = await api
        .web()
        .post('/login')
        .send({ email: 'ada@jobtok.test', password: SEED_DEV_PASSWORD });
      const cookie = login.headers['set-cookie']![0]!.split(';')[0]!;
      const noOrigin = await request(api.app).post('/api/v1/auth/refresh').set('Cookie', cookie);
      expect(noOrigin.status).toBe(403);
      const evil = await request(api.app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookie)
        .set('Origin', 'https://evil.example');
      expect(evil.status).toBe(403);
      const good = await request(api.app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookie)
        .set('Origin', TEST_ORIGIN);
      expect(good.status).toBe(200);
      expect(good.body.data.refreshToken).toBeUndefined();
      expect(good.headers['set-cookie']![0]).toMatch(/^jobtok_rt=/);
    });

    it('rejects unknown refresh tokens', async () => {
      const res = await api
        .mobile()
        .post('/refresh')
        .send({ refreshToken: 'x'.repeat(43) });
      expect(res.status).toBe(401);
    });
  });

  describe('logout', () => {
    it('invalidates the access token and refresh token immediately', async () => {
      const s = await phoneSignIn(t, api, '08036660007');
      await api
        .mobile()
        .post('/logout')
        .set('Authorization', `Bearer ${s.accessToken}`)
        .expect(204);
      expect((await me(s.accessToken)).body.error.code).toBe('session_revoked');
      expect(
        (await api.mobile().post('/refresh').send({ refreshToken: s.refreshToken })).status,
      ).toBe(401);
    });

    it('works with only the refresh token (e.g. expired access token)', async () => {
      const s = await phoneSignIn(t, api, '08036660008');
      t.clock.advance(16 * 60 * 1000);
      await api.mobile().post('/logout').send({ refreshToken: s.refreshToken }).expect(204);
      expect(
        (await api.mobile().post('/refresh').send({ refreshToken: s.refreshToken })).status,
      ).toBe(401);
    });

    it('only ends the current device session', async () => {
      const a = await phoneSignIn(t, api, '08036660009');
      const b = await phoneSignIn(t, api, '08036660009');
      await api
        .mobile()
        .post('/logout')
        .set('Authorization', `Bearer ${a.accessToken}`)
        .expect(204);
      expect((await me(b.accessToken)).status).toBe(200);
    });

    it('clears the web refresh cookie', async () => {
      const res = await api.web().post('/logout');
      expect(res.status).toBe(204);
      expect(res.headers['set-cookie']![0]).toMatch(/jobtok_rt=;.*Expires=Thu, 01 Jan 1970/);
    });
  });

  describe('suspension', () => {
    it('blocks existing sessions of a suspended user', async () => {
      const s = await phoneSignIn(t, api, '08036660010');
      await db.user.update({
        where: { id: s.user.id },
        data: { isSuspended: true, suspensionReason: 'test' },
      });
      expect((await me(s.accessToken)).status).toBe(403);
      expect(
        (await api.mobile().post('/refresh').send({ refreshToken: s.refreshToken })).status,
      ).toBe(403);
    });
  });
});
