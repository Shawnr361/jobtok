import type { AuthClient } from '@jobtok/types';
import type { Db } from '../../db/client.js';
import { HttpError } from '../../lib/http.js';
import type { AuthDeps } from './auth.config.js';
import {
  InvalidAccessTokenError,
  generateToken,
  sha256,
  signAccessToken,
  verifyAccessToken,
} from './crypto.js';

export interface SessionMeta {
  client: AuthClient;
  userAgent?: string | undefined;
  ipAddress?: string | undefined;
}

export interface IssuedSession {
  sessionId: string;
  userId: string;
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const unauthorized = (code = 'unauthorized', message = 'Please sign in to continue.') =>
  new HttpError(401, code, message);

export class SessionService {
  constructor(
    private readonly db: Db,
    private readonly deps: AuthDeps,
  ) {}

  private refreshExpiry(now: Date) {
    return new Date(now.getTime() + this.deps.config.refreshTokenTtlDays * DAY_MS);
  }

  private async issueAccessToken(userId: string, sessionId: string, now: Date) {
    return signAccessToken(
      this.deps.config.accessTokenSecret,
      { userId, sessionId },
      now,
      this.deps.config.accessTokenTtlSeconds,
    );
  }

  /** Starts a new session (sign-in). */
  async create(userId: string, meta: SessionMeta): Promise<IssuedSession> {
    const now = this.deps.clock.now();
    const refreshToken = generateToken();
    const expiresAt = this.refreshExpiry(now);
    const session = await this.db.authSession.create({
      data: {
        userId,
        client: meta.client,
        refreshTokenHash: sha256(refreshToken),
        userAgent: meta.userAgent?.slice(0, 255) ?? null,
        ipAddress: meta.ipAddress?.slice(0, 64) ?? null,
        createdAt: now,
        lastUsedAt: now,
        expiresAt,
      },
    });
    await this.db.user.update({ where: { id: userId }, data: { lastActiveAt: now } });
    const access = await this.issueAccessToken(userId, session.id, now);
    return {
      sessionId: session.id,
      userId,
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshToken,
      refreshTokenExpiresAt: expiresAt,
    };
  }

  /**
   * Exchanges a refresh token for a new access token and a new refresh token (rotation).
   * Re-using an already-rotated refresh token revokes the whole session, because it means
   * the token was copied.
   */
  async refresh(refreshToken: string): Promise<IssuedSession> {
    const now = this.deps.clock.now();
    const hash = sha256(refreshToken);
    const session = await this.db.authSession.findUnique({
      where: { refreshTokenHash: hash },
      include: { user: { select: { isSuspended: true } } },
    });

    if (!session) {
      const reused = await this.db.authSession.findUnique({
        where: { previousRefreshTokenHash: hash },
      });
      if (reused && !reused.revokedAt) {
        await this.revoke(reused.id, 'refresh_token_reuse');
      }
      throw unauthorized('invalid_refresh_token', 'Your session has ended. Please sign in again.');
    }
    if (session.revokedAt)
      throw unauthorized('invalid_refresh_token', 'Your session has ended. Please sign in again.');
    if (session.expiresAt <= now) {
      await this.revoke(session.id, 'expired');
      throw unauthorized('session_expired', 'Your session has expired. Please sign in again.');
    }
    if (session.user.isSuspended) {
      await this.revoke(session.id, 'user_suspended');
      throw new HttpError(
        403,
        'account_suspended',
        'This account has been suspended. Please contact support if you think this is a mistake.',
      );
    }

    const nextToken = generateToken();
    const expiresAt = this.refreshExpiry(now);
    // Compare-and-swap on the current hash: a concurrent refresh with the same token loses.
    const { count } = await this.db.authSession.updateMany({
      where: { id: session.id, refreshTokenHash: hash, revokedAt: null },
      data: {
        refreshTokenHash: sha256(nextToken),
        previousRefreshTokenHash: hash,
        lastUsedAt: now,
        expiresAt,
      },
    });
    if (count !== 1)
      throw unauthorized('invalid_refresh_token', 'Your session has ended. Please sign in again.');

    const access = await this.issueAccessToken(session.userId, session.id, now);
    return {
      sessionId: session.id,
      userId: session.userId,
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshToken: nextToken,
      refreshTokenExpiresAt: expiresAt,
    };
  }

  async revoke(sessionId: string, reason: string) {
    await this.db.authSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: this.deps.clock.now(), revokeReason: reason },
    });
  }

  async revokeByRefreshToken(refreshToken: string, reason: string) {
    await this.db.authSession.updateMany({
      where: { refreshTokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: this.deps.clock.now(), revokeReason: reason },
    });
  }

  async revokeAllForUser(userId: string, reason: string) {
    await this.db.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: this.deps.clock.now(), revokeReason: reason },
    });
  }

  /**
   * Validates an access token *and* its session, so logout and revocation take effect
   * immediately rather than when the JWT expires.
   */
  async authenticate(accessToken: string) {
    const now = this.deps.clock.now();
    let claims;
    try {
      claims = await verifyAccessToken(this.deps.config.accessTokenSecret, accessToken, now);
    } catch (err) {
      if (err instanceof InvalidAccessTokenError && err.reason === 'expired') {
        throw unauthorized('token_expired', 'Your session has expired. Please sign in again.');
      }
      throw unauthorized('invalid_token', 'Please sign in again.');
    }
    const session = await this.db.authSession.findUnique({
      where: { id: claims.sessionId },
      include: { user: true },
    });
    if (!session || session.userId !== claims.userId || session.revokedAt) {
      throw unauthorized('session_revoked', 'Your session has ended. Please sign in again.');
    }
    if (session.expiresAt <= now)
      throw unauthorized('session_expired', 'Your session has expired. Please sign in again.');
    if (session.user.isSuspended) {
      throw new HttpError(
        403,
        'account_suspended',
        'This account has been suspended. Please contact support if you think this is a mistake.',
      );
    }
    return { sessionId: session.id, user: session.user };
  }
}
