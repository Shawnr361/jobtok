import type { ApiResponse } from '@jobtok/types';
import type { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

export interface RateLimitOptions {
  windowMs: number;
  limit: number;
  /** Extra key part (e.g. the email being attempted). Defaults to the client IP only. */
  key?: (req: Request) => string | undefined;
  /** Count per `key` across all IPs (e.g. attempts against one account). */
  keyOnly?: boolean;
  name: string;
}

/**
 * Fixed-window limiter with the standard error envelope.
 * Uses the in-memory store: correct for a single API instance. With several instances,
 * pass a shared store (e.g. rate-limit-redis on REDIS_URL, per spec).
 */
export function createRateLimiter({ windowMs, limit, key, keyOnly, name }: RateLimitOptions) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => {
      const ip = ipKeyGenerator(req.ip ?? 'unknown');
      const extra = key?.(req);
      if (!extra) return `${name}:${ip}`;
      return keyOnly ? `${name}:k:${extra}` : `${name}:${ip}:${extra}`;
    },
    handler: (_req, res) => {
      const body: ApiResponse<never> = {
        ok: false,
        error: {
          code: 'rate_limited',
          message: "You're going a little fast. Please wait a moment and try again.",
        },
      };
      res.status(429).json(body);
    },
  });
}
