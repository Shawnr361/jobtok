import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SEED_IDS } from '../../src/db/seed-data.js';
import {
  createTestApp,
  createTestAuth,
  phoneSignIn,
  registerVerified,
  type TestAuth,
} from '../helpers/auth.js';
import { getDb, resetAndSeed } from '../helpers/db.js';

describe('phone OTP', () => {
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

  describe('sending codes', () => {
    it('normalises Nigerian numbers and never returns the code', async () => {
      const res = await api.mobile().post('/otp/send').send({ phone: '0803 555 0101' });
      expect(res.status).toBe(202);
      expect(res.body.data).toEqual({
        sentTo: '+234803*****01',
        expiresInSeconds: 300,
        resendAfterSeconds: 60,
      });
      expect(t.sms.sent).toHaveLength(1);
      expect(t.sms.sent[0]!.to).toBe('+2348035550101');
      const code = t.sms.lastCode('+2348035550101');
      expect(JSON.stringify(res.body)).not.toContain(code);
    });

    it('responds identically for registered and unregistered numbers', async () => {
      const registered = await api.mobile().post('/otp/send').send({ phone: '08031110002' }); // seed "chidi"
      const unregistered = await api.mobile().post('/otp/send').send({ phone: '08035559999' });
      expect(registered.status).toBe(202);
      expect(unregistered.status).toBe(202);
      const shape = (b: { data: Record<string, unknown> }) => ({ ...b.data, sentTo: undefined });
      expect(shape(registered.body)).toEqual(shape(unregistered.body));
      expect(Object.keys(registered.body.data).sort()).toEqual(
        Object.keys(unregistered.body.data).sort(),
      );
    });

    it('stores only a keyed hash of the code', async () => {
      await api.mobile().post('/otp/send').send({ phone: '+2348035550102' }).expect(202);
      const code = t.sms.lastCode('+2348035550102');
      const row = await db.otpChallenge.findFirstOrThrow({ where: { phone: '+2348035550102' } });
      expect(row.codeHash).toMatch(/^[0-9a-f]{64}$/);
      expect(row.codeHash).not.toContain(code);
    });

    it('rejects invalid numbers and countries that are not enabled', async () => {
      const bad = await api.mobile().post('/otp/send').send({ phone: '0603 555 0101' });
      expect(bad.status).toBe(400);
      expect(bad.body.error.code).toBe('invalid_phone');
      const gh = await api.mobile().post('/otp/send').send({ phone: '0241234567', country: 'GH' });
      expect(gh.status).toBe(400);
      expect(gh.body.error.code).toBe('country_not_supported');
      expect(t.sms.sent).toHaveLength(0);
    });

    it('enforces a resend cooldown and an hourly cap per number', async () => {
      const phone = '+2348035550103';
      await api.mobile().post('/otp/send').send({ phone }).expect(202);
      const again = await api.mobile().post('/otp/send').send({ phone });
      expect(again.status).toBe(429);
      expect(again.body.error.code).toBe('otp_cooldown');
      for (let i = 1; i < 5; i++) {
        t.clock.advance(61_000);
        await api.mobile().post('/otp/send').send({ phone }).expect(202);
      }
      t.clock.advance(61_000);
      const capped = await api.mobile().post('/otp/send').send({ phone });
      expect(capped.status).toBe(429);
      expect(capped.body.error.code).toBe('otp_limit');
    });

    it('rate limits OTP requests per IP', async () => {
      const strict = await createTestAuth({
        config: {
          rateLimits: { ...t.deps.config.rateLimits, otpSend: { windowMs: 60_000, limit: 2 } },
        },
      });
      const limited = createTestApp(db, strict);
      await limited.mobile().post('/otp/send').send({ phone: '+2348035550201' }).expect(202);
      await limited.mobile().post('/otp/send').send({ phone: '+2348035550202' }).expect(202);
      const res = await limited.mobile().post('/otp/send').send({ phone: '+2348035550203' });
      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('rate_limited');
    });
  });

  describe('verifying codes', () => {
    it('creates a phone-verified account on first sign-in and reuses it afterwards', async () => {
      const first = await phoneSignIn(t, api, '08035550104');
      expect(first.isNewUser).toBe(true);
      expect(first.user).toMatchObject({ phone: '+2348035550104', verification: { phone: true } });
      const second = await phoneSignIn(t, api, '+234 803 555 0104');
      expect(second.isNewUser).toBe(false);
      expect(second.user.id).toBe(first.user.id);
      expect(await db.user.count({ where: { phone: '+2348035550104' } })).toBe(1);
    });

    it('signs existing users in by phone (no duplicate account)', async () => {
      const res = await phoneSignIn(t, api, '08031110001'); // seeded user "ada"
      expect(res.user.id).toBe(SEED_IDS.user('ada'));
      expect(res.isNewUser).toBe(false);
    });

    it('rejects a wrong code without revealing more than the remaining attempts', async () => {
      const phone = '+2348035550105';
      await api.mobile().post('/otp/send').send({ phone }).expect(202);
      const code = t.sms.lastCode(phone);
      const wrong = code === '000000' ? '111111' : '000000';
      const res = await api.mobile().post('/otp/verify').send({ phone, code: wrong });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatchObject({
        code: 'otp_invalid',
        details: { attemptsRemaining: 4 },
      });
    });

    it('rejects expired codes', async () => {
      const phone = '+2348035550106';
      await api.mobile().post('/otp/send').send({ phone }).expect(202);
      const code = t.sms.lastCode(phone);
      t.clock.advance(301_000);
      const res = await api.mobile().post('/otp/verify').send({ phone, code });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('otp_invalid');
    });

    it('locks the code after 5 wrong attempts, even for the right code', async () => {
      const phone = '+2348035550107';
      await api.mobile().post('/otp/send').send({ phone }).expect(202);
      const code = t.sms.lastCode(phone);
      const wrong = code === '000000' ? '111111' : '000000';
      for (let i = 0; i < 4; i++) {
        await api.mobile().post('/otp/verify').send({ phone, code: wrong }).expect(400);
      }
      const fifth = await api.mobile().post('/otp/verify').send({ phone, code: wrong });
      expect(fifth.status).toBe(429);
      const right = await api.mobile().post('/otp/verify').send({ phone, code });
      expect(right.status).toBe(429);
      expect(right.body.error.code).toBe('otp_attempts_exceeded');
    });

    it('accepts a code only once, and only the newest code', async () => {
      const phone = '+2348035550108';
      await api.mobile().post('/otp/send').send({ phone }).expect(202);
      const oldCode = t.sms.lastCode(phone);
      t.clock.advance(61_000);
      await api.mobile().post('/otp/send').send({ phone }).expect(202);
      const newCode = t.sms.lastCode(phone);
      if (oldCode !== newCode) {
        await api.mobile().post('/otp/verify').send({ phone, code: oldCode }).expect(400);
      }
      await api.mobile().post('/otp/verify').send({ phone, code: newCode }).expect(201);
      await api.mobile().post('/otp/verify').send({ phone, code: newCode }).expect(400);
    });
  });

  describe('adding a phone to an email account', () => {
    async function emailUser(email: string) {
      return (await registerVerified(t, api, email)).accessToken;
    }

    it('requires sign-in', async () => {
      const res = await api
        .mobile()
        .post('/otp/send')
        .send({ phone: '+2348035550109', purpose: 'verify_phone' });
      expect(res.status).toBe(401);
    });

    it('verifies and attaches the phone to the same user', async () => {
      const token = await emailUser('adds.phone@example.com');
      const phone = '+2348035550110';
      await api
        .mobile()
        .post('/otp/send')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone, purpose: 'verify_phone' })
        .expect(202);
      const res = await api
        .mobile()
        .post('/otp/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone, purpose: 'verify_phone', code: t.sms.lastCode(phone) });
      expect(res.status).toBe(200);
      expect(res.body.data.user).toMatchObject({
        email: 'adds.phone@example.com',
        phone,
        verification: { phone: true },
      });
    });

    it('rejects a phone that already belongs to another account', async () => {
      const token = await emailUser('duplicate.phone@example.com');
      const phone = '+2348031110001'; // seeded user "ada"
      t.clock.advance(61_000); // an earlier test sent this number a code
      await api
        .mobile()
        .post('/otp/send')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone, purpose: 'verify_phone' })
        .expect(202);
      const res = await api
        .mobile()
        .post('/otp/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone, purpose: 'verify_phone', code: t.sms.lastCode(phone) });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('phone_in_use');
      const ada = await db.user.findUniqueOrThrow({ where: { id: SEED_IDS.user('ada') } });
      expect(ada.phone).toBe(phone);
    });

    it('a login code cannot be used to verify a phone on another account (and vice versa)', async () => {
      const token = await emailUser('purpose.bound@example.com');
      const phone = '+2348035550111';
      await api.mobile().post('/otp/send').send({ phone }).expect(202); // purpose: login
      const res = await api
        .mobile()
        .post('/otp/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone, purpose: 'verify_phone', code: t.sms.lastCode(phone) });
      expect(res.status).toBe(400);
    });
  });
});
