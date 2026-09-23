import { createRemoteJWKSet, errors as joseErrors, jwtVerify, type JWTVerifyGetKey } from 'jose';
import type { Env } from '../../../config/env.js';

/** Identity claims taken from a Google ID token *after* its signature was verified. */
export interface GoogleIdentity {
  /** Stable Google account id (`sub`). */
  subject: string;
  email: string | null;
  emailVerified: boolean;
}

export interface GoogleIdTokenVerifier {
  readonly name: string;
  readonly isDevelopmentOnly: boolean;
  readonly isConfigured: boolean;
  /** Returns the identity, or throws InvalidGoogleTokenError. */
  verify(idToken: string): Promise<GoogleIdentity>;
}

export class InvalidGoogleTokenError extends Error {}
export class GoogleNotConfiguredError extends Error {}

export const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
export const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

/**
 * Production verifier: checks an OIDC ID token issued by Google — RS256 signature against
 * Google's published keys, issuer, audience (our client IDs) and expiry. Client-supplied
 * claims are never trusted without this check.
 */
export class GoogleOidcVerifier implements GoogleIdTokenVerifier {
  readonly name = 'google-oidc';
  readonly isDevelopmentOnly = false;

  constructor(
    private readonly clientIds: string[],
    private readonly keys: JWTVerifyGetKey = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL)),
    private readonly now: () => Date = () => new Date(),
  ) {}

  get isConfigured() {
    return this.clientIds.length > 0;
  }

  async verify(idToken: string): Promise<GoogleIdentity> {
    if (!this.isConfigured) throw new GoogleNotConfiguredError('GOOGLE_CLIENT_IDS is not set');
    try {
      const { payload } = await jwtVerify(idToken, this.keys, {
        issuer: GOOGLE_ISSUERS,
        audience: this.clientIds,
        algorithms: ['RS256'],
        currentDate: this.now(),
        clockTolerance: 5,
      });
      if (typeof payload.sub !== 'string' || !payload.sub) {
        throw new InvalidGoogleTokenError('Token has no subject');
      }
      const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : null;
      return {
        subject: payload.sub,
        email,
        emailVerified: email !== null && payload.email_verified === true,
      };
    } catch (err) {
      if (err instanceof InvalidGoogleTokenError) throw err;
      if (err instanceof joseErrors.JOSEError) {
        throw new InvalidGoogleTokenError(`Google token rejected: ${err.code}`);
      }
      throw err;
    }
  }
}

/**
 * DEVELOPMENT ONLY — NOT GOOGLE. Accepts fake tokens shaped `dev-google:<subject>:<email>`
 * so the Google sign-in flow (account creation/linking) can be exercised locally without
 * Google credentials. Enabled only with AUTH_DEV_GOOGLE=true; refused in production.
 * Real Google tokens are still verified by the wrapped production verifier.
 */
export class DevGoogleVerifier implements GoogleIdTokenVerifier {
  readonly name = 'dev-google (NOT GOOGLE)';
  readonly isDevelopmentOnly = true;
  readonly isConfigured = true;
  static readonly PREFIX = 'dev-google:';

  constructor(
    private readonly real: GoogleIdTokenVerifier,
    nodeEnv: string,
  ) {
    if (nodeEnv === 'production') throw new Error('DevGoogleVerifier cannot be used in production');
  }

  async verify(idToken: string): Promise<GoogleIdentity> {
    if (!idToken.startsWith(DevGoogleVerifier.PREFIX)) return this.real.verify(idToken);
    const [subject, email] = idToken.slice(DevGoogleVerifier.PREFIX.length).split(':');
    if (!subject || !email) throw new InvalidGoogleTokenError('Malformed dev token');
    return { subject: `dev-${subject}`, email: email.toLowerCase(), emailVerified: true };
  }
}

export function createGoogleVerifier(env: Env): GoogleIdTokenVerifier {
  const real = new GoogleOidcVerifier(env.GOOGLE_CLIENT_IDS);
  return env.AUTH_DEV_GOOGLE ? new DevGoogleVerifier(real, env.NODE_ENV) : real;
}
