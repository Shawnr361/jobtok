import type { ActiveMode, UserRole, Verification } from '@jobtok/types';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { HttpError } from '../../lib/http.js';
import type { SessionService } from './session.service.js';

/** What later routes can know about the caller. Full seeker/employer rules come later. */
export interface AuthContext {
  userId: string;
  sessionId: string;
  role: UserRole;
  activeMode: ActiveMode;
  verification: Verification;
  /** Derived from role. Foundation for RBAC; not yet enforced by product routes. */
  capabilities: { seeker: boolean; employer: boolean; admin: boolean };
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

export function capabilitiesFor(role: UserRole): AuthContext['capabilities'] {
  return {
    seeker: role === 'seeker' || role === 'both',
    employer: role === 'employer' || role === 'both',
    admin: role === 'admin',
  };
}

/**
 * Reads `Authorization: Bearer <access token>` and sets `req.auth`. Requests without a
 * token pass through unauthenticated; a present-but-invalid token is rejected with 401.
 */
export function authenticate(sessions: SessionService): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const token = bearerToken(req);
    if (!token) return next();
    const { sessionId, user } = await sessions.authenticate(token);
    req.auth = {
      userId: user.id,
      sessionId,
      role: user.role,
      activeMode: user.activeMode,
      verification: {
        phone: user.isPhoneVerified,
        email: user.isEmailVerified,
        id: user.isIdVerified,
        business: user.isBusinessVerified,
      },
      capabilities: capabilitiesFor(user.role),
    };
    next();
  };
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.auth) throw new HttpError(401, 'unauthorized', 'Please sign in to continue.');
  next();
};

/** Phone verification is mandatory before using the product (spec: trust model). */
export const requirePhoneVerified: RequestHandler = (req, _res, next) => {
  if (!req.auth) throw new HttpError(401, 'unauthorized', 'Please sign in to continue.');
  if (!req.auth.verification.phone) {
    throw new HttpError(
      403,
      'phone_verification_required',
      'Please verify your phone number first.',
    );
  }
  next();
};

export const requireEmailVerified: RequestHandler = (req, _res, next) => {
  if (!req.auth) throw new HttpError(401, 'unauthorized', 'Please sign in to continue.');
  if (!req.auth.verification.email) {
    throw new HttpError(
      403,
      'email_verification_required',
      'Please confirm your email address first.',
    );
  }
  next();
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) throw new HttpError(401, 'unauthorized', 'Please sign in to continue.');
    if (!roles.includes(req.auth.role)) {
      throw new HttpError(403, 'forbidden', "You don't have access to this.");
    }
    next();
  };
}

export function getAuth(req: Request): AuthContext {
  if (!req.auth) throw new HttpError(401, 'unauthorized', 'Please sign in to continue.');
  return req.auth;
}
