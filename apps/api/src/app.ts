import { AUTH_CLIENT_HEADER } from '@jobtok/types';
import { randomBytes } from 'node:crypto';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import type { Env } from './config/env.js';
import type { Db } from './db/client.js';
import { errorHandler, notFoundHandler } from './lib/http.js';
import type { AuthDeps } from './modules/auth/auth.config.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createHealthRouter } from './modules/health/health.routes.js';
import { createProfilesRouter, createSkillsRouter } from './modules/profiles/profile.routes.js';
import { MediaSigner } from './modules/videos/storage.js';
import {
  createFeedRouter,
  createMediaRouter,
  createVideosRouter,
} from './modules/videos/video.routes.js';
import type { VideoDeps } from './modules/videos/video.service.js';

export interface AppDeps {
  db?: Db;
  /** Required (with db) to mount /api/v1/auth, /profiles, /skills, /videos and /feed. */
  auth?: AuthDeps;
  /** Video storage/processing. Without it, uploads answer "not available" (503). */
  videos?: VideoDeps & { signer: MediaSigner };
}

type AppEnv = Pick<Env, 'CORS_ORIGINS'> & Partial<Pick<Env, 'TRUST_PROXY'>>;

// Modular monolith: each domain (auth, profiles, jobs, feed, ...) mounts its router under /api/v1.
export function createApp(env: AppEnv, deps: AppDeps = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY ?? 0);
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true, // web refresh cookie
      allowedHeaders: ['Content-Type', 'Authorization', AUTH_CLIENT_HEADER],
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  const v1 = Router();
  v1.use('/health', createHealthRouter(deps.db));
  if (deps.db && deps.auth) {
    const videos = deps.videos ?? {
      storage: null,
      processor: null,
      unavailableReason: 'Video storage is not configured on this server',
      maxBytes: 0,
      urlTtlSeconds: 3600,
      signer: new MediaSigner(randomBytes(32).toString('base64url')),
    };
    const mediaUrl = (key: string) =>
      videos.storage ? videos.storage.url(key, videos.urlTtlSeconds) : null;
    v1.use('/auth', createAuthRouter(deps.db, deps.auth));
    v1.use('/profiles', createProfilesRouter(deps.db, deps.auth, mediaUrl, videos));
    v1.use('/skills', createSkillsRouter(deps.db, deps.auth));
    v1.use('/videos', createVideosRouter(deps.db, deps.auth, videos));
    v1.use('/feed', createFeedRouter(deps.db, deps.auth, videos));
    v1.use('/media', createMediaRouter(videos, videos.signer));
  }
  app.use('/api/v1', v1);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
