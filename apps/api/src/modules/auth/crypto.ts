import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify, errors as joseErrors } from 'jose';
import { OTP_LENGTH } from '@jobtok/types';

// ─── Passwords (Argon2id, OWASP-recommended parameters) ─────────────────────

const ARGON2_OPTIONS = {
  algorithm: 2, // Argon2id
  memoryCost: 19_456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return argon2Hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2Verify(hash, password);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | undefined;
/**
 * Runs a full Argon2 verification against a throwaway hash so that "unknown email" takes
 * as long as "wrong password" (prevents account discovery by timing).
 */
export async function burnPasswordCheck(password: string) {
  dummyHash ??= hashPassword(randomBytes(16).toString('hex'));
  await verifyPassword(await dummyHash, password);
}

// ─── Random tokens & hashes ─────────────────────────────────────────────────

/** 256-bit random, URL-safe token (refresh, email verification, password reset). */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/** SHA-256 hex. Enough for high-entropy random tokens. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Uniformly random numeric code (no modulo bias). */
export function generateOtp(): string {
  return randomInt(0, 10 ** OTP_LENGTH)
    .toString()
    .padStart(OTP_LENGTH, '0');
}

/**
 * Keyed hash for OTP codes. A 6-digit code has little entropy, so a plain hash could be
 * brute-forced from a database leak; the server-side key prevents that.
 */
export function hashOtp(secret: string, challengeScope: string, code: string): string {
  return createHmac('sha256', secret).update(`${challengeScope}:${code}`).digest('hex');
}

export function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// ─── Access tokens (JWT, HS256) ─────────────────────────────────────────────

export const JWT_ISSUER = 'jobtok-api';
export const JWT_AUDIENCE = 'jobtok';

export interface AccessTokenClaims {
  userId: string;
  sessionId: string;
}

export async function signAccessToken(
  secret: Uint8Array,
  claims: AccessTokenClaims,
  now: Date,
  ttlSeconds: number,
): Promise<{ token: string; expiresAt: Date }> {
  const iat = Math.floor(now.getTime() / 1000);
  const exp = iat + ttlSeconds;
  const token = await new SignJWT({ sid: claims.sessionId, typ: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.userId)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(secret);
  return { token, expiresAt: new Date(exp * 1000) };
}

export class InvalidAccessTokenError extends Error {
  constructor(readonly reason: 'expired' | 'invalid') {
    super(`Access token ${reason}`);
  }
}

export async function verifyAccessToken(
  secret: Uint8Array,
  token: string,
  now: Date,
): Promise<AccessTokenClaims> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ['HS256'],
      currentDate: now,
    });
    if (
      payload.typ !== 'access' ||
      typeof payload.sub !== 'string' ||
      typeof payload.sid !== 'string'
    ) {
      throw new InvalidAccessTokenError('invalid');
    }
    return { userId: payload.sub, sessionId: payload.sid };
  } catch (err) {
    if (err instanceof InvalidAccessTokenError) throw err;
    if (err instanceof joseErrors.JWTExpired) throw new InvalidAccessTokenError('expired');
    throw new InvalidAccessTokenError('invalid');
  }
}
