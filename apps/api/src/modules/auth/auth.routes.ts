import {
  AUTH_CLIENT_HEADER,
  OTP_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  type AuthClient,
  type AuthSessionResponse,
  type OtpSendResponse,
} from '@jobtok/types';
import { Router, type CookieOptions, type Request, type Response } from 'express';
import { z } from 'zod';
import type { Db } from '../../db/client.js';
import { HttpError, ok } from '../../lib/http.js';
import { createRateLimiter } from '../../lib/rate-limit.js';
import type { AuthDeps } from './auth.config.js';
import { authenticate, bearerToken, getAuth, requireAuth } from './auth.middleware.js';
import { AuthService, normalizeEmail, type SignInResult } from './auth.service.js';
import { maskPhone, toAuthUser } from './presenters.js';
import type { IssuedSession } from './session.service.js';

export const REFRESH_COOKIE = 'jobtok_rt';
export const REGISTER_MESSAGE =
  'Check your email to verify your address, then sign in. If you already have an account, we sent sign-in help to that address instead.';
export const VERIFICATION_MESSAGE =
  'If this email belongs to an account that still needs verifying, a new link has been sent.';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

// ─── Validation ─────────────────────────────────────────────────────────────

const email = z.string().trim().toLowerCase().max(255).pipe(z.email('Enter a valid email address'));
const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`)
  .refine((p) => p.trim().length > 0, 'Password cannot be blank');
const phone = z.string().trim().min(6).max(25);
const country = z.string().length(2).optional();
const purpose = z.enum(['login', 'verify_phone']).default('login');
const opaqueToken = z.string().min(20).max(200);

const schemas = {
  register: z.object({ email, password }),
  login: z.object({ email, password: z.string().min(1).max(PASSWORD_MAX_LENGTH) }),
  otpSend: z.object({ phone, country, purpose }),
  otpVerify: z.object({
    phone,
    country,
    purpose,
    code: z
      .string()
      .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), `Enter the ${OTP_LENGTH}-digit code`),
  }),
  refresh: z.object({ refreshToken: opaqueToken.optional() }).default({}),
  google: z.object({ idToken: z.string().min(10).max(4096) }),
  emailVerify: z.object({ token: opaqueToken }),
  passwordForgot: z.object({ email }),
  passwordReset: z.object({ token: opaqueToken, password }),
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function clientOf(req: Request): AuthClient {
  return req.get(AUTH_CLIENT_HEADER)?.toLowerCase() === 'mobile' ? 'mobile' : 'web';
}

export function createAuthRouter(db: Db, deps: AuthDeps) {
  const service = new AuthService(db, deps);
  const router = Router();
  const limits = deps.config.rateLimits;

  const cookieOptions = (expires?: Date): CookieOptions => ({
    httpOnly: true,
    secure: deps.config.secureCookies,
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    ...(expires ? { expires } : {}),
  });

  async function respondWithSession(
    req: Request,
    res: Response,
    issued: IssuedSession,
    isNewUser: boolean,
    status = 200,
  ) {
    const client = clientOf(req);
    const user = toAuthUser(await service.loadUser(issued.userId));
    const body: AuthSessionResponse = {
      user,
      accessToken: issued.accessToken,
      accessTokenExpiresAt: issued.accessTokenExpiresAt.toISOString(),
      refreshTokenExpiresAt: issued.refreshTokenExpiresAt.toISOString(),
      isNewUser,
    };
    if (client === 'mobile') {
      body.refreshToken = issued.refreshToken; // stored by the app in the device keychain
    } else {
      res.cookie(REFRESH_COOKIE, issued.refreshToken, cookieOptions(issued.refreshTokenExpiresAt));
    }
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, body, status);
  }

  async function signIn(req: Request, res: Response, result: SignInResult, status = 200) {
    const issued = await service.sessions.create(result.userId, {
      client: clientOf(req),
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    });
    return respondWithSession(req, res, issued, result.isNewUser, status);
  }

  /** Cookie-based refresh is only accepted from our own web origins (CSRF protection). */
  function readRefreshToken(req: Request, bodyToken: string | undefined): string | null {
    if (bodyToken) return bodyToken;
    const cookieToken = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    if (!cookieToken) return null;
    const origin = req.get('origin');
    if (!origin || !deps.config.allowedOrigins.includes(origin)) {
      throw new HttpError(403, 'origin_not_allowed', 'Request origin is not allowed');
    }
    return cookieToken;
  }

  const byEmail = (req: Request) =>
    typeof req.body?.email === 'string' ? normalizeEmail(req.body.email) : undefined;
  const byPhone = (req: Request) =>
    typeof req.body?.phone === 'string' ? req.body.phone.replace(/\D/g, '').slice(-10) : undefined;

  const limit = {
    login: createRateLimiter({ ...limits.login, name: 'login' }),
    loginAccount: createRateLimiter({
      ...limits.login,
      name: 'login-acct',
      key: byEmail,
      keyOnly: true,
    }),
    register: createRateLimiter({ ...limits.register, name: 'register' }),
    otpSend: createRateLimiter({ ...limits.otpSend, name: 'otp-send' }),
    otpVerify: createRateLimiter({ ...limits.otpVerify, name: 'otp-verify' }),
    otpVerifyPhone: createRateLimiter({
      ...limits.otpVerify,
      name: 'otp-verify-ph',
      key: byPhone,
      keyOnly: true,
    }),
    passwordReset: createRateLimiter({ ...limits.passwordReset, name: 'pw-reset' }),
    general: createRateLimiter({ ...limits.general, name: 'auth' }),
  };

  router.use(limit.general);
  // Applied per route, so an expired token never blocks refresh or logout.
  const auth = authenticate(service.sessions);

  // ─── Email + password ───────────────────────────────────────────────────

  router.post('/register', limit.register, async (req, res) => {
    const body = schemas.register.parse(req.body);
    await service.registerWithEmail(body.email, body.password);
    // Identical for new and already-registered emails (no account discovery, no session).
    ok(res, { message: REGISTER_MESSAGE }, 202);
  });

  router.post('/login', limit.login, limit.loginAccount, async (req, res) => {
    const body = schemas.login.parse(req.body);
    const result = await service.loginWithEmail(body.email, body.password);
    await signIn(req, res, result);
  });

  // ─── Phone OTP ──────────────────────────────────────────────────────────

  router.post('/otp/send', limit.otpSend, auth, async (req, res) => {
    const body = schemas.otpSend.parse(req.body);
    if (body.purpose === 'verify_phone' && !req.auth) {
      throw new HttpError(401, 'unauthorized', 'Sign in to verify a phone number');
    }
    const phoneNumber = await service.otp.normalizePhone(body.phone, body.country);
    const sent = await service.otp.send({
      phone: phoneNumber,
      purpose: body.purpose,
      userId: body.purpose === 'verify_phone' ? getAuth(req).userId : null,
      ip: req.ip,
    });
    const response: OtpSendResponse = { sentTo: maskPhone(phoneNumber), ...sent };
    ok(res, response, 202);
  });

  router.post('/otp/verify', limit.otpVerify, limit.otpVerifyPhone, auth, async (req, res) => {
    const body = schemas.otpVerify.parse(req.body);
    const phoneNumber = await service.otp.normalizePhone(body.phone, body.country);
    if (body.purpose === 'verify_phone') {
      const { userId } = getAuth(req);
      await service.otp.verify({
        phone: phoneNumber,
        code: body.code,
        purpose: 'verify_phone',
        userId,
      });
      await service.attachVerifiedPhone(userId, phoneNumber);
      return ok(res, { user: toAuthUser(await service.loadUser(userId)) });
    }
    await service.otp.verify({
      phone: phoneNumber,
      code: body.code,
      purpose: 'login',
      userId: null,
    });
    const result = await service.signInWithPhone(phoneNumber);
    await signIn(req, res, result, result.isNewUser ? 201 : 200);
  });

  // ─── Google ─────────────────────────────────────────────────────────────

  router.post('/google', limit.login, auth, async (req, res) => {
    const body = schemas.google.parse(req.body);
    const result = await service.signInWithGoogle(body.idToken, req.auth?.userId ?? null);
    if (req.auth) {
      // Linking to the signed-in account: no new session needed.
      return ok(res, { user: toAuthUser(await service.loadUser(req.auth.userId)) });
    }
    await signIn(req, res, result, result.isNewUser ? 201 : 200);
  });

  // ─── Sessions ───────────────────────────────────────────────────────────

  router.post('/refresh', async (req, res) => {
    const body = schemas.refresh.parse(req.body ?? {});
    const token = readRefreshToken(req, body.refreshToken);
    if (!token) throw new HttpError(401, 'invalid_refresh_token', 'Session is no longer valid');
    try {
      const issued = await service.sessions.refresh(token);
      await respondWithSession(req, res, issued, false);
    } catch (err) {
      res.clearCookie(REFRESH_COOKIE, cookieOptions());
      throw err;
    }
  });

  /** Revokes the session identified by a valid access token, else by the refresh token. */
  router.post('/logout', async (req, res) => {
    const access = bearerToken(req);
    const session = access ? await service.sessions.authenticate(access).catch(() => null) : null;
    if (session) {
      await service.sessions.revoke(session.sessionId, 'logout');
    } else {
      const body = schemas.refresh.parse(req.body ?? {});
      const cookieToken = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
      const token = body.refreshToken ?? cookieToken;
      if (token) await service.sessions.revokeByRefreshToken(token, 'logout');
    }
    res.clearCookie(REFRESH_COOKIE, cookieOptions());
    res.status(204).end();
  });

  router.get('/me', auth, requireAuth, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    ok(res, { user: toAuthUser(await service.loadUser(getAuth(req).userId)) });
  });

  // ─── Email verification & password reset ────────────────────────────────

  /** Resend the verification link: for the signed-in user, or by email (enumeration-safe). */
  router.post('/email/verification', limit.passwordReset, auth, async (req, res) => {
    if (req.auth) {
      await service.sendEmailVerification(req.auth.userId);
    } else {
      const body = schemas.passwordForgot.parse(req.body);
      await service.resendEmailVerification(body.email);
    }
    ok(res, { message: VERIFICATION_MESSAGE }, 202);
  });

  router.post('/email/verify', limit.otpVerify, async (req, res) => {
    const body = schemas.emailVerify.parse(req.body);
    await service.verifyEmail(body.token);
    // No account details: the caller only proved they hold the link.
    ok(res, { verified: true });
  });

  router.post('/password/forgot', limit.passwordReset, async (req, res) => {
    const body = schemas.passwordForgot.parse(req.body);
    await service.requestPasswordReset(body.email);
    // Same response whether or not the account exists.
    ok(res, { message: 'If an account exists for this email, a reset link has been sent.' }, 202);
  });

  router.post('/password/reset', limit.passwordReset, async (req, res) => {
    const body = schemas.passwordReset.parse(req.body);
    await service.resetPassword(body.token, body.password);
    res.clearCookie(REFRESH_COOKIE, cookieOptions());
    res.status(204).end();
  });

  return router;
}
