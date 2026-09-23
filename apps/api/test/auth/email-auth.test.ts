import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SEED_DEV_PASSWORD } from '../../src/db/seed-data.js';
import { createTestApp, createTestAuth, registerVerified, type TestAuth } from '../helpers/auth.js';
import { getDb, resetAndSeed } from '../helpers/db.js';

describe('email + password', () => {
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

  describe('registration', () => {
    it('creates an unverified account and returns no session or password data', async () => {
      const res = await api
        .web()
        .post('/register')
        .send({ email: 'New.User@Example.com ', password: 'a-strong-password' });
      expect(res.status).toBe(202);
      expect(Object.keys(res.body.data)).toEqual(['message']);
      expect(res.headers['set-cookie']).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toMatch(/argon2|passwordHash|accessToken/);
      const row = await db.user.findUniqueOrThrow({ where: { email: 'new.user@example.com' } });
      expect(row).toMatchObject({ isEmailVerified: false, phone: null, role: 'seeker' });
    });

    it('stores only an Argon2id hash in the database', async () => {
      await api
        .web()
        .post('/register')
        .send({ email: 'hash.check@example.com', password: 'a-strong-password' })
        .expect(202);
      const row = await db.user.findUniqueOrThrow({ where: { email: 'hash.check@example.com' } });
      expect(row.passwordHash).toMatch(/^\$argon2id\$/);
      expect(row.passwordHash).not.toContain('a-strong-password');
    });

    it('sends an email verification link', async () => {
      await api
        .web()
        .post('/register')
        .send({ email: 'verify.me@example.com', password: 'a-strong-password' })
        .expect(202);
      expect(t.email.lastToken('verify.me@example.com', '/verify-email')).toMatch(
        /^[A-Za-z0-9_-]{43}$/,
      );
    });

    it('validates email format and password length', async () => {
      const bad = await api
        .web()
        .post('/register')
        .send({ email: 'not-an-email', password: 'a-strong-password' });
      expect(bad.status).toBe(400);
      const short = await api
        .web()
        .post('/register')
        .send({ email: 'short@example.com', password: 'short' });
      expect(short.status).toBe(400);
      expect(JSON.stringify(short.body)).not.toContain('"short"');
    });
  });

  describe('duplicate emails (account discovery protection)', () => {
    it('responds identically for a new and an already-registered email', async () => {
      const fresh = await api
        .web()
        .post('/register')
        .send({ email: 'brand.new@example.com', password: 'a-strong-password' });
      const existing = await api
        .web()
        .post('/register')
        .send({ email: 'ADA@jobtok.test', password: 'a-strong-password' });
      expect(existing.status).toBe(fresh.status);
      expect(existing.body).toEqual(fresh.body);
      expect(existing.headers['set-cookie']).toEqual(fresh.headers['set-cookie']);
    });

    it('does not create a second account or change the existing password', async () => {
      const before = await db.user.findUniqueOrThrow({ where: { email: 'ada@jobtok.test' } });
      await api
        .web()
        .post('/register')
        .send({ email: 'ada@jobtok.test', password: 'attacker-password' })
        .expect(202);
      const after = await db.user.findUniqueOrThrow({ where: { email: 'ada@jobtok.test' } });
      expect(await db.user.count({ where: { email: 'ada@jobtok.test' } })).toBe(1);
      expect(after.passwordHash).toBe(before.passwordHash);
      const login = await api
        .web()
        .post('/login')
        .send({ email: 'ada@jobtok.test', password: SEED_DEV_PASSWORD });
      expect(login.status).toBe(200);
    });

    it('emails the real owner of the address instead of a verification link', async () => {
      await api
        .web()
        .post('/register')
        .send({ email: 'ada@jobtok.test', password: 'attacker-password' })
        .expect(202);
      const notice = t.email.sent.find((m) => m.to === 'ada@jobtok.test');
      expect(notice?.subject).toBe('You already have a JobTok account');
      expect(notice?.text).toContain('/forgot-password');
      expect(notice?.text).not.toContain('token=');
    });

    it('"register, then log in with the same password" cannot reveal whether the email was taken', async () => {
      const attempt = async (email: string) => {
        await api.web().post('/register').send({ email, password: 'probe-password-1' });
        return api.web().post('/login').send({ email, password: 'probe-password-1' });
      };
      const taken = await attempt('ada@jobtok.test');
      const free = await attempt('never.used.before@example.com');
      expect(taken.status).toBe(401);
      expect(free.status).toBe(401);
      expect(taken.body).toEqual(free.body);
    });
  });

  describe('login', () => {
    it('signs in with the right password once the email is verified', async () => {
      const res = await api
        .web()
        .post('/login')
        .send({ email: 'ada@jobtok.test', password: SEED_DEV_PASSWORD });
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('ada@jobtok.test');
      expect(res.body.data.isNewUser).toBe(false);
      // Web: refresh token only in an HTTP-only, SameSite=Strict cookie.
      expect(res.body.data.refreshToken).toBeUndefined();
      const cookie = res.headers['set-cookie']?.[0] ?? '';
      expect(cookie).toMatch(/^jobtok_rt=/);
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/SameSite=Strict/);
      expect(cookie).toMatch(/Path=\/api\/v1\/auth/);
    });

    it('returns the refresh token in the body for mobile clients', async () => {
      const res = await api
        .mobile()
        .post('/login')
        .send({ email: 'ada@jobtok.test', password: SEED_DEV_PASSWORD });
      expect(res.status).toBe(200);
      expect(res.body.data.refreshToken).toEqual(expect.any(String));
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('completes the full sign-up: register, verify email, sign in', async () => {
      const s = await registerVerified(t, api, 'full.flow@example.com');
      expect(s.user.email).toBe('full.flow@example.com');
      expect(s.accessToken).toEqual(expect.any(String));
    });

    it('treats a correct password on an unverified email like any other failure', async () => {
      await api
        .web()
        .post('/register')
        .send({ email: 'not.yet@example.com', password: 'a-strong-password' })
        .expect(202);
      const unverified = await api
        .web()
        .post('/login')
        .send({ email: 'not.yet@example.com', password: 'a-strong-password' });
      const wrong = await api
        .web()
        .post('/login')
        .send({ email: 'ada@jobtok.test', password: 'wrong-password' });
      expect(unverified.status).toBe(401);
      expect(unverified.body).toEqual(wrong.body);
    });

    it('rejects a wrong password and an unknown email with the same generic error', async () => {
      const wrong = await api
        .web()
        .post('/login')
        .send({ email: 'ada@jobtok.test', password: 'wrong-password' });
      const unknown = await api
        .web()
        .post('/login')
        .send({ email: 'nobody@jobtok.test', password: 'wrong-password' });
      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(wrong.body.error).toEqual(unknown.body.error);
      expect(wrong.body.error.code).toBe('invalid_credentials');
    });

    it('refuses suspended accounts', async () => {
      await registerVerified(t, api, 'suspend.me@example.com');
      await db.user.update({
        where: { email: 'suspend.me@example.com' },
        data: { isSuspended: true, suspensionReason: 'test' },
      });
      const res = await api
        .web()
        .post('/login')
        .send({ email: 'suspend.me@example.com', password: 'a-strong-password' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('account_suspended');
    });
  });

  describe('rate limiting', () => {
    it('throttles repeated login attempts against one account', async () => {
      const strict = await createTestAuth({
        config: {
          rateLimits: { ...t.deps.config.rateLimits, login: { windowMs: 60_000, limit: 3 } },
        },
      });
      const limited = createTestApp(db, strict);
      for (let i = 0; i < 3; i++) {
        await limited
          .web()
          .post('/login')
          .send({ email: 'ada@jobtok.test', password: 'guess' })
          .expect(401);
      }
      const res = await limited
        .web()
        .post('/login')
        .send({ email: 'ada@jobtok.test', password: SEED_DEV_PASSWORD });
      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('rate_limited');
    });

    it('throttles registration per IP', async () => {
      const strict = await createTestAuth({
        config: {
          rateLimits: { ...t.deps.config.rateLimits, register: { windowMs: 60_000, limit: 2 } },
        },
      });
      const limited = createTestApp(db, strict);
      for (const n of [1, 2]) {
        await limited
          .web()
          .post('/register')
          .send({ email: `rl.${n}@example.com`, password: 'a-strong-password' })
          .expect(202);
      }
      const res = await limited
        .web()
        .post('/register')
        .send({ email: 'rl.3@example.com', password: 'a-strong-password' });
      expect(res.status).toBe(429);
    });
  });
});
