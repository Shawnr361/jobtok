import { generateKeyPair } from 'jose';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SEED_IDS } from '../../src/db/seed-data.js';
import { DevGoogleVerifier, GoogleOidcVerifier } from '../../src/modules/auth/providers/google.js';
import {
  GOOGLE_CLIENT_ID,
  createTestApp,
  createTestAuth,
  registerVerified,
  type TestAuth,
} from '../helpers/auth.js';
import { getDb, resetAndSeed } from '../helpers/db.js';

describe('Google sign-in (OIDC ID token exchange)', () => {
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

  const google = (idToken: string, accessToken?: string) => {
    const r = api.mobile().post('/google');
    return (accessToken ? r.set('Authorization', `Bearer ${accessToken}`) : r).send({ idToken });
  };

  it('creates a new account with the verified Google email and links the identity', async () => {
    const idToken = await t.google.sign({
      sub: 'g-new-1',
      email: 'Newbie@Gmail.com',
      email_verified: true,
    });
    const res = await google(idToken);
    expect(res.status).toBe(201);
    expect(res.body.data.isNewUser).toBe(true);
    expect(res.body.data.user).toMatchObject({
      email: 'newbie@gmail.com',
      linkedProviders: ['google'],
      hasPassword: false,
      verification: { email: true, phone: false },
    });
  });

  it('signs the same Google account into the same user next time', async () => {
    const idToken = await t.google.sign({
      sub: 'g-repeat',
      email: 'repeat@gmail.com',
      email_verified: true,
    });
    const first = await google(idToken);
    const second = await google(idToken);
    expect(second.status).toBe(200);
    expect(second.body.data.user.id).toBe(first.body.data.user.id);
    expect(await db.oAuthAccount.count({ where: { providerAccountId: 'g-repeat' } })).toBe(1);
  });

  it('links to an existing user whose email is verified, instead of creating a duplicate', async () => {
    const idToken = await t.google.sign({
      sub: 'g-ada',
      email: 'ada@jobtok.test',
      email_verified: true,
    });
    const res = await google(idToken);
    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(SEED_IDS.user('ada'));
    expect(res.body.data.user.linkedProviders).toEqual(['google']);
    expect(await db.user.count({ where: { email: 'ada@jobtok.test' } })).toBe(1);
  });

  it('does not auto-link to an account whose email was never verified', async () => {
    await api
      .mobile()
      .post('/register')
      .send({ email: 'unverified@gmail.com', password: 'a-strong-password' })
      .expect(202);
    const idToken = await t.google.sign({
      sub: 'g-unverified',
      email: 'unverified@gmail.com',
      email_verified: true,
    });
    const res = await google(idToken);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('account_link_requires_sign_in');
    expect(await db.oAuthAccount.count({ where: { providerAccountId: 'g-unverified' } })).toBe(0);
  });

  it('links Google to the signed-in user (explicit linking)', async () => {
    const reg = await registerVerified(t, api, 'linker@example.com');
    const idToken = await t.google.sign({
      sub: 'g-linker',
      email: 'different@gmail.com',
      email_verified: true,
    });
    const res = await google(idToken, reg.accessToken);
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({
      email: 'linker@example.com',
      linkedProviders: ['google'],
    });
  });

  it('refuses to link a Google account that belongs to another user', async () => {
    const idToken = await t.google.sign({
      sub: 'g-taken',
      email: 'taken@gmail.com',
      email_verified: true,
    });
    await google(idToken).expect(201);
    const reg = await registerVerified(t, api, 'thief@example.com');
    const res = await google(idToken, reg.accessToken);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('google_account_in_use');
  });

  it('rejects tokens with a bad signature, wrong audience, wrong issuer or expired', async () => {
    const { privateKey } = await generateKeyPair('RS256');
    const claims = { sub: 'g-bad', email: 'bad@gmail.com', email_verified: true };
    const cases = [
      await t.google.sign(claims, { key: privateKey }),
      await t.google.sign(claims, { aud: 'someone-else.apps.googleusercontent.com' }),
      await t.google.sign(claims, { iss: 'https://evil.example' }),
      await t.google.sign(claims, { expiresInSeconds: -60 }),
      'not.a.valid.jwt.token',
    ];
    for (const idToken of cases) {
      const res = await google(idToken);
      expect(res.status, idToken.slice(0, 20)).toBe(401);
      expect(res.body.error.code).toBe('invalid_google_token');
    }
    expect(await db.oAuthAccount.count({ where: { providerAccountId: 'g-bad' } })).toBe(0);
  });

  it('refuses to create an account from a Google identity without a verified email', async () => {
    const idToken = await t.google.sign({
      sub: 'g-noemail',
      email: 'x@gmail.com',
      email_verified: false,
    });
    const res = await google(idToken);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('google_email_unverified');
  });

  it('returns 503 when Google is not configured', async () => {
    const unconfigured = await createTestAuth({ google: new GoogleOidcVerifier([]) });
    const res = await createTestApp(db, unconfigured)
      .mobile()
      .post('/google')
      .send({ idToken: 'anything-long-enough' });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('google_not_configured');
  });

  describe('development-only verifier', () => {
    it('cannot be constructed in production', () => {
      expect(
        () => new DevGoogleVerifier(new GoogleOidcVerifier([GOOGLE_CLIENT_ID]), 'production'),
      ).toThrow();
    });

    it('accepts dev tokens (clearly namespaced) and still verifies real ones', async () => {
      const dev = new DevGoogleVerifier(t.google.verifier, 'development');
      await expect(dev.verify('dev-google:alice:Alice@Example.com')).resolves.toEqual({
        subject: 'dev-alice',
        email: 'alice@example.com',
        emailVerified: true,
      });
      const real = await t.google.sign({
        sub: 'g-real',
        email: 'real@gmail.com',
        email_verified: true,
      });
      await expect(dev.verify(real)).resolves.toMatchObject({ subject: 'g-real' });
    });
  });
});
