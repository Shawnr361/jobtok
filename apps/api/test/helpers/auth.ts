// Test doubles for the auth module. These never leave the test suite.
import { exportJWK, generateKeyPair, SignJWT, createLocalJWKSet, type JWK } from 'jose';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import type { Db } from '../../src/db/client.js';
import {
  DEFAULT_RATE_LIMITS,
  type AuthConfig,
  type AuthDeps,
  type Clock,
} from '../../src/modules/auth/auth.config.js';
import type { EmailMessage, EmailProvider } from '../../src/modules/auth/providers/email.js';
import {
  GoogleOidcVerifier,
  type GoogleIdTokenVerifier,
} from '../../src/modules/auth/providers/google.js';
import type { SmsProvider } from '../../src/modules/auth/providers/sms.js';

export const TEST_ORIGIN = 'http://localhost:3000';
export const GOOGLE_CLIENT_ID = 'test-client.apps.googleusercontent.com';

/** Records messages instead of sending them. */
export class CaptureSms implements SmsProvider {
  readonly name = 'test-capture';
  readonly isDevelopmentOnly = true;
  readonly sent: { to: string; message: string }[] = [];
  async send(to: string, message: string) {
    this.sent.push({ to, message });
  }
  lastCode(to: string): string {
    const msg = [...this.sent].reverse().find((m) => m.to === to);
    const code = msg?.message.match(/\b(\d{6})\b/)?.[1];
    if (!code) throw new Error(`No OTP sent to ${to}`);
    return code;
  }
}

export class CaptureEmail implements EmailProvider {
  readonly name = 'test-capture';
  readonly isDevelopmentOnly = true;
  readonly sent: EmailMessage[] = [];
  async send(message: EmailMessage) {
    this.sent.push(message);
  }
  lastToken(to: string, path: string): string {
    const msg = [...this.sent].reverse().find((m) => m.to === to && m.text.includes(path));
    const url = msg?.text.match(/https?:\/\/\S+/)?.[0];
    const token = url ? new URL(url).searchParams.get('token') : null;
    if (!token) throw new Error(`No ${path} link sent to ${to}`);
    return token;
  }
}

export class TestClock implements Clock {
  private t: number;
  constructor(start = Date.now()) {
    this.t = start;
  }
  now() {
    return new Date(this.t);
  }
  advance(ms: number) {
    this.t += ms;
  }
}

/** A stand-in for Google's signing keys, so the real OIDC verifier can be tested offline. */
export async function createFakeGoogle(clock: Clock) {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'RS256', use: 'sig' };
  const verifier = new GoogleOidcVerifier(
    [GOOGLE_CLIENT_ID],
    createLocalJWKSet({ keys: [jwk] }),
    () => clock.now(),
  );
  const sign = async (
    claims: { sub: string; email?: string; email_verified?: boolean },
    opts: { aud?: string; iss?: string; expiresInSeconds?: number; key?: CryptoKey } = {},
  ) => {
    const iat = Math.floor(clock.now().getTime() / 1000);
    return new SignJWT({ email: claims.email, email_verified: claims.email_verified })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setSubject(claims.sub)
      .setIssuer(opts.iss ?? 'https://accounts.google.com')
      .setAudience(opts.aud ?? GOOGLE_CLIENT_ID)
      .setIssuedAt(iat)
      .setExpirationTime(iat + (opts.expiresInSeconds ?? 3600))
      .sign(opts.key ?? privateKey);
  };
  return { verifier, sign };
}

const RELAXED_LIMITS: AuthConfig['rateLimits'] = Object.fromEntries(
  Object.keys(DEFAULT_RATE_LIMITS).map((k) => [k, { windowMs: 60_000, limit: 10_000 }]),
) as AuthConfig['rateLimits'];

export interface TestAuth {
  deps: AuthDeps;
  sms: CaptureSms;
  email: CaptureEmail;
  clock: TestClock;
  google: Awaited<ReturnType<typeof createFakeGoogle>>;
}

export async function createTestAuth(
  overrides: {
    config?: Partial<AuthConfig>;
    google?: GoogleIdTokenVerifier;
  } = {},
): Promise<TestAuth> {
  const clock = new TestClock();
  const sms = new CaptureSms();
  const email = new CaptureEmail();
  const google = await createFakeGoogle(clock);
  const config: AuthConfig = {
    accessTokenSecret: new TextEncoder().encode('test-access-secret-at-least-32-characters!!'),
    hashSecret: 'test-hash-secret-at-least-32-characters!!!!',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlDays: 30,
    secureCookies: false,
    allowedOrigins: [TEST_ORIGIN],
    appWebUrl: 'http://localhost:3000',
    otp: { ttlSeconds: 300, maxAttempts: 5, resendCooldownSeconds: 60, maxPerPhonePerHour: 5 },
    emailVerificationTtlHours: 24,
    passwordResetTtlMinutes: 30,
    rateLimits: RELAXED_LIMITS,
    ...overrides.config,
  };
  return {
    deps: { config, sms, email, google: overrides.google ?? google.verifier, clock },
    sms,
    email,
    clock,
    google,
  };
}

export function createTestApp(db: Db, auth: TestAuth) {
  const app = createApp({ CORS_ORIGINS: [TEST_ORIGIN] }, { db, auth: auth.deps });
  return {
    app,
    /** Mobile-style client: refresh token in the body. */
    mobile: () => ({
      post: (path: string) =>
        request(app).post(`/api/v1/auth${path}`).set('x-jobtok-client', 'mobile'),
      get: (path: string) =>
        request(app).get(`/api/v1/auth${path}`).set('x-jobtok-client', 'mobile'),
    }),
    /** Web-style client: refresh token in an HTTP-only cookie. */
    web: () => ({
      post: (path: string) => request(app).post(`/api/v1/auth${path}`).set('Origin', TEST_ORIGIN),
      get: (path: string) => request(app).get(`/api/v1/auth${path}`).set('Origin', TEST_ORIGIN),
    }),
  };
}

/** Signs in with phone OTP (mobile client) and returns the session body. */
export async function phoneSignIn(
  t: TestAuth,
  api: ReturnType<typeof createTestApp>,
  phone: string,
) {
  await api.mobile().post('/otp/send').send({ phone }).expect(202);
  const e164 = `+234${phone.replace(/\D/g, '').replace(/^0/, '').replace(/^234/, '')}`;
  const res = await api
    .mobile()
    .post('/otp/verify')
    .send({ phone, code: t.sms.lastCode(e164) });
  if (res.status >= 300) throw new Error(`phone sign-in failed: ${JSON.stringify(res.body)}`);
  // Let the per-phone resend cooldown pass for later requests in the same test.
  t.clock.advance(61_000);
  return res.body.data as {
    accessToken: string;
    refreshToken: string;
    isNewUser: boolean;
    user: { id: string; phone: string };
  };
}

/**
 * Email sign-up the way a real user completes it: register (no session), open the emailed
 * verification link, then sign in with the password (mobile client).
 */
export async function registerVerified(
  t: TestAuth,
  api: ReturnType<typeof createTestApp>,
  email: string,
  password = 'a-strong-password',
) {
  await api.mobile().post('/register').send({ email, password }).expect(202);
  const token = t.email.lastToken(email.trim().toLowerCase(), '/verify-email');
  await api.web().post('/email/verify').send({ token }).expect(200);
  const res = await api.mobile().post('/login').send({ email, password });
  if (res.status !== 200) throw new Error(`login failed: ${JSON.stringify(res.body)}`);
  return res.body.data as {
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string };
  };
}
