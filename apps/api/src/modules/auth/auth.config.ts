import { randomBytes } from 'node:crypto';
import type { Env } from '../../config/env.js';
import { createEmailProvider, type EmailProvider } from './providers/email.js';
import { createGoogleVerifier, type GoogleIdTokenVerifier } from './providers/google.js';
import { createSmsProvider, type SmsProvider } from './providers/sms.js';

export interface RateLimitRule {
  windowMs: number;
  limit: number;
}

export interface AuthConfig {
  accessTokenSecret: Uint8Array;
  hashSecret: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlDays: number;
  /** Secure cookies (HTTPS only). On in production. */
  secureCookies: boolean;
  /** Origins allowed to use the cookie-based refresh (CSRF protection). */
  allowedOrigins: string[];
  appWebUrl: string;
  otp: {
    ttlSeconds: number;
    maxAttempts: number;
    resendCooldownSeconds: number;
    /** Max codes sent to one phone per hour. */
    maxPerPhonePerHour: number;
  };
  emailVerificationTtlHours: number;
  passwordResetTtlMinutes: number;
  /** Per-IP limits for each sensitive endpoint group. */
  rateLimits: {
    login: RateLimitRule;
    register: RateLimitRule;
    otpSend: RateLimitRule;
    otpVerify: RateLimitRule;
    passwordReset: RateLimitRule;
    general: RateLimitRule;
  };
}

export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };

/** Everything the auth module needs. Tests replace providers and the clock. */
export interface AuthDeps {
  config: AuthConfig;
  sms: SmsProvider;
  email: EmailProvider;
  google: GoogleIdTokenVerifier;
  clock: Clock;
}

export const DEFAULT_RATE_LIMITS: AuthConfig['rateLimits'] = {
  login: { windowMs: 15 * 60_000, limit: 10 },
  register: { windowMs: 60 * 60_000, limit: 10 },
  otpSend: { windowMs: 15 * 60_000, limit: 5 },
  otpVerify: { windowMs: 15 * 60_000, limit: 15 },
  passwordReset: { windowMs: 60 * 60_000, limit: 5 },
  general: { windowMs: 60_000, limit: 100 },
};

function devSecret(name: string, value: string | undefined): string {
  if (value) return value;
  console.warn(
    `[auth] ${name} is not set; using a random per-process value (development only). ` +
      'Sessions will not survive an API restart.',
  );
  return randomBytes(32).toString('base64url');
}

export function authConfigFromEnv(env: Env): AuthConfig {
  return {
    accessTokenSecret: new TextEncoder().encode(
      devSecret('JWT_ACCESS_SECRET', env.JWT_ACCESS_SECRET),
    ),
    hashSecret: devSecret('AUTH_HASH_SECRET', env.AUTH_HASH_SECRET),
    accessTokenTtlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
    secureCookies: env.NODE_ENV === 'production',
    allowedOrigins: env.CORS_ORIGINS,
    appWebUrl: env.APP_WEB_URL,
    otp: { ttlSeconds: 300, maxAttempts: 5, resendCooldownSeconds: 60, maxPerPhonePerHour: 5 },
    emailVerificationTtlHours: 24,
    passwordResetTtlMinutes: 30,
    rateLimits: DEFAULT_RATE_LIMITS,
  };
}

export function authDepsFromEnv(env: Env): AuthDeps {
  return {
    config: authConfigFromEnv(env),
    sms: createSmsProvider(env),
    email: createEmailProvider(env),
    google: createGoogleVerifier(env),
    clock: systemClock,
  };
}
