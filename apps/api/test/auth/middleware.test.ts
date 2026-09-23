import express from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { assertProductionSafe, loadEnv } from '../../src/config/env.js';
import { errorHandler } from '../../src/lib/http.js';
import {
  authenticate,
  capabilitiesFor,
  requireAuth,
  requireEmailVerified,
  requirePhoneVerified,
  requireRole,
} from '../../src/modules/auth/auth.middleware.js';
import { DevConsoleEmailProvider } from '../../src/modules/auth/providers/email.js';
import { DevConsoleSmsProvider } from '../../src/modules/auth/providers/sms.js';
import { SessionService } from '../../src/modules/auth/session.service.js';
import { SEED_IDS } from '../../src/db/seed-data.js';
import { createTestAuth, type TestAuth } from '../helpers/auth.js';
import { getDb, resetAndSeed } from '../helpers/db.js';

describe('authorization foundation', () => {
  const db = getDb();
  let t: TestAuth;
  let app: express.Express;
  let sessions: SessionService;

  beforeAll(async () => {
    await resetAndSeed(db);
    t = await createTestAuth();
    sessions = new SessionService(db, t.deps);
    // A stand-in for future product routes.
    app = express();
    app.use(authenticate(sessions));
    app.get('/public', (req, res) => res.json({ signedIn: Boolean(req.auth) }));
    app.get('/private', requireAuth, (req, res) => res.json(req.auth));
    app.get('/phone-only', requirePhoneVerified, (_req, res) => res.json({ ok: true }));
    app.get('/email-only', requireEmailVerified, (_req, res) => res.json({ ok: true }));
    app.get('/admin', requireRole('admin'), (_req, res) => res.json({ ok: true }));
    app.use(errorHandler);
  });

  async function tokenFor(userId: string) {
    return (await sessions.create(userId, { client: 'mobile' })).accessToken;
  }

  it('lets anonymous requests through public routes and blocks private ones', async () => {
    expect((await request(app).get('/public')).body).toEqual({ signedIn: false });
    const res = await request(app).get('/private');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('rejects an invalid bearer token even on public routes', async () => {
    const res = await request(app).get('/public').set('Authorization', 'Bearer garbage');
    expect(res.status).toBe(401);
  });

  it('exposes who the user is, their verification state and capabilities', async () => {
    const token = await tokenFor(SEED_IDS.user('chidi'));
    const res = await request(app).get('/private').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      userId: SEED_IDS.user('chidi'),
      role: 'both',
      activeMode: 'seeker',
      verification: { phone: true, email: true, id: false, business: false },
      capabilities: { seeker: true, employer: true, admin: false },
    });
  });

  it('gates on phone verification (mandatory before using the product)', async () => {
    const user = await db.user.create({ data: { email: 'nophone@example.com' } });
    const token = await tokenFor(user.id);
    const res = await request(app).get('/phone-only').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('phone_verification_required');
    expect(
      (await request(app).get('/email-only').set('Authorization', `Bearer ${token}`)).status,
    ).toBe(403);
    const ok = await request(app)
      .get('/phone-only')
      .set('Authorization', `Bearer ${await tokenFor(SEED_IDS.user('ada'))}`);
    expect(ok.status).toBe(200);
  });

  it('gates on role', async () => {
    const seeker = await tokenFor(SEED_IDS.user('ada'));
    expect((await request(app).get('/admin').set('Authorization', `Bearer ${seeker}`)).status).toBe(
      403,
    );
    const admin = await tokenFor(SEED_IDS.user('admin'));
    expect((await request(app).get('/admin').set('Authorization', `Bearer ${admin}`)).status).toBe(
      200,
    );
  });

  it('derives capabilities from role', () => {
    expect(capabilitiesFor('seeker')).toEqual({ seeker: true, employer: false, admin: false });
    expect(capabilitiesFor('employer')).toEqual({ seeker: false, employer: true, admin: false });
    expect(capabilitiesFor('both')).toEqual({ seeker: true, employer: true, admin: false });
    expect(capabilitiesFor('admin')).toEqual({ seeker: false, employer: false, admin: true });
  });
});

describe('unauthorized access to auth endpoints', () => {
  it('protected auth routes require a valid session', async () => {
    const db = getDb();
    const t = await createTestAuth();
    const { createTestApp } = await import('../helpers/auth.js');
    const api = createTestApp(db, t);
    expect((await api.mobile().get('/me')).status).toBe(401);
    expect(
      (await api.mobile().post('/otp/send').send({ phone: '08031234567', purpose: 'verify_phone' }))
        .status,
    ).toBe(401);
    expect((await api.mobile().post('/refresh').send({})).status).toBe(401);
  });
});

describe('production safety', () => {
  const base = { NODE_ENV: 'production', DATABASE_URL: 'postgresql://x' } as NodeJS.ProcessEnv;

  it('refuses to start with development adapters or missing secrets', () => {
    expect(() => loadEnv(base)).toThrow(/JWT_ACCESS_SECRET|SMS_PROVIDER=dev/);
    const env = loadEnv({ NODE_ENV: 'development' } as NodeJS.ProcessEnv);
    expect(() =>
      assertProductionSafe({
        ...env,
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: 'x'.repeat(32),
        AUTH_HASH_SECRET: 'y'.repeat(32),
        AUTH_DEV_GOOGLE: true,
      }),
    ).toThrow(/AUTH_DEV_GOOGLE/);
  });

  it('development adapters cannot be constructed in production', () => {
    expect(() => new DevConsoleSmsProvider('production')).toThrow();
    expect(() => new DevConsoleEmailProvider('production')).toThrow();
  });
});
