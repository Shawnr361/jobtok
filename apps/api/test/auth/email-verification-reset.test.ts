import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, createTestAuth, registerVerified, type TestAuth } from '../helpers/auth.js';
import { getDb, resetAndSeed } from '../helpers/db.js';

describe('email verification & password reset', () => {
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

  /** Registration only (unverified, no session). */
  async function register(email: string, password = 'a-strong-password') {
    await api.mobile().post('/register').send({ email, password }).expect(202);
  }

  describe('email verification', () => {
    it('verifies the email with the emailed link token', async () => {
      await register('verify.flow@example.com');
      const token = t.email.lastToken('verify.flow@example.com', '/verify-email');
      const res = await api.web().post('/email/verify').send({ token });
      expect(res.status).toBe(200);
      // Only the outcome: holding a link does not reveal account details.
      expect(res.body.data).toEqual({ verified: true });
      const row = await db.user.findUniqueOrThrow({ where: { email: 'verify.flow@example.com' } });
      expect(row.isEmailVerified).toBe(true);
    });

    it('stores only a hash of the token', async () => {
      await register('verify.hash@example.com');
      const token = t.email.lastToken('verify.hash@example.com', '/verify-email');
      const rows = await db.authToken.findMany({ where: { email: 'verify.hash@example.com' } });
      expect(rows).toHaveLength(1);
      expect(rows[0]!.tokenHash).not.toBe(token);
    });

    it('rejects reused, expired and unknown tokens', async () => {
      await register('verify.once@example.com');
      const token = t.email.lastToken('verify.once@example.com', '/verify-email');
      await api.web().post('/email/verify').send({ token }).expect(200);
      expect((await api.web().post('/email/verify').send({ token })).body.error.code).toBe(
        'invalid_or_expired_token',
      );

      await register('verify.late@example.com');
      const late = t.email.lastToken('verify.late@example.com', '/verify-email');
      t.clock.advance(25 * 60 * 60 * 1000);
      expect((await api.web().post('/email/verify').send({ token: late })).status).toBe(400);

      expect(
        (
          await api
            .web()
            .post('/email/verify')
            .send({ token: 'y'.repeat(43) })
        ).status,
      ).toBe(400);
    });

    it('resends a link by email while signed out, and only the newest link works', async () => {
      await register('verify.resend@example.com');
      const first = t.email.lastToken('verify.resend@example.com', '/verify-email');
      await api
        .mobile()
        .post('/email/verification')
        .send({ email: 'verify.resend@example.com' })
        .expect(202);
      const second = t.email.lastToken('verify.resend@example.com', '/verify-email');
      expect(second).not.toBe(first);
      expect((await api.web().post('/email/verify').send({ token: first })).status).toBe(400);
      expect((await api.web().post('/email/verify').send({ token: second })).status).toBe(200);
    });

    it('resend gives one response for unknown, verified and unverified emails', async () => {
      await register('resend.pending@example.com');
      const sentBefore = t.email.sent.length;
      const pending = await api
        .mobile()
        .post('/email/verification')
        .send({ email: 'resend.pending@example.com' });
      const unknown = await api
        .mobile()
        .post('/email/verification')
        .send({ email: 'resend.nobody@example.com' });
      const verified = await api
        .mobile()
        .post('/email/verification')
        .send({ email: 'ada@jobtok.test' });
      for (const r of [pending, unknown, verified]) expect(r.status).toBe(202);
      expect(unknown.body).toEqual(pending.body);
      expect(verified.body).toEqual(pending.body);
      // Only the account that actually needs it gets a link.
      expect(t.email.sent.length).toBe(sentBefore + 1);
      expect(t.email.sent.at(-1)!.to).toBe('resend.pending@example.com');
    });

    it('resend while signed out needs a valid email', async () => {
      expect((await api.mobile().post('/email/verification').send({})).status).toBe(400);
    });
  });

  describe('password reset', () => {
    it('gives the same response for unknown emails and sends nothing', async () => {
      const unknown = await api
        .web()
        .post('/password/forgot')
        .send({ email: 'nobody@example.com' });
      await register('reset.known@example.com');
      const sentBefore = t.email.sent.length;
      const known = await api
        .web()
        .post('/password/forgot')
        .send({ email: 'reset.known@example.com' });
      expect(unknown.status).toBe(202);
      expect(known.status).toBe(202);
      expect(unknown.body).toEqual(known.body);
      expect(t.email.sent.length).toBe(sentBefore + 1);
      expect(t.email.sent.some((m) => m.to === 'nobody@example.com')).toBe(false);
    });

    it('resets the password, signs out every session and marks the email verified', async () => {
      const s = await registerVerified(t, api, 'reset.flow@example.com', 'old-password-123');
      await api
        .web()
        .post('/password/forgot')
        .send({ email: 'reset.flow@example.com' })
        .expect(202);
      const token = t.email.lastToken('reset.flow@example.com', '/reset-password');

      await api
        .web()
        .post('/password/reset')
        .send({ token, password: 'new-password-456' })
        .expect(204);

      expect(
        (await api.mobile().get('/me').set('Authorization', `Bearer ${s.accessToken}`)).status,
      ).toBe(401);
      expect(
        (await api.mobile().post('/refresh').send({ refreshToken: s.refreshToken })).status,
      ).toBe(401);
      expect(
        (
          await api
            .web()
            .post('/login')
            .send({ email: 'reset.flow@example.com', password: 'old-password-123' })
        ).status,
      ).toBe(401);
      const login = await api
        .web()
        .post('/login')
        .send({ email: 'reset.flow@example.com', password: 'new-password-456' });
      expect(login.status).toBe(200);
      expect(login.body.data.user.verification.email).toBe(true);
    });

    it('reset links are single-use and expire after 30 minutes', async () => {
      await register('reset.once@example.com');
      await api
        .web()
        .post('/password/forgot')
        .send({ email: 'reset.once@example.com' })
        .expect(202);
      const token = t.email.lastToken('reset.once@example.com', '/reset-password');
      await api
        .web()
        .post('/password/reset')
        .send({ token, password: 'new-password-456' })
        .expect(204);
      expect(
        (await api.web().post('/password/reset').send({ token, password: 'another-pass-789' }))
          .status,
      ).toBe(400);

      t.clock.advance(61_000);
      await api
        .web()
        .post('/password/forgot')
        .send({ email: 'reset.once@example.com' })
        .expect(202);
      const late = t.email.lastToken('reset.once@example.com', '/reset-password');
      t.clock.advance(31 * 60 * 1000);
      expect(
        (
          await api
            .web()
            .post('/password/reset')
            .send({ token: late, password: 'another-pass-789' })
        ).status,
      ).toBe(400);
    });

    it('validates the new password', async () => {
      await register('reset.weak@example.com');
      await api
        .web()
        .post('/password/forgot')
        .send({ email: 'reset.weak@example.com' })
        .expect(202);
      const token = t.email.lastToken('reset.weak@example.com', '/reset-password');
      expect(
        (await api.web().post('/password/reset').send({ token, password: 'short' })).status,
      ).toBe(400);
    });

    it('an email verification token cannot reset a password', async () => {
      await register('reset.wrongpurpose@example.com');
      const token = t.email.lastToken('reset.wrongpurpose@example.com', '/verify-email');
      expect(
        (await api.web().post('/password/reset').send({ token, password: 'new-password-456' }))
          .status,
      ).toBe(400);
    });
  });
});
