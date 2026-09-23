import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import type { Env } from './config/env.js';
import type { Db } from './db/client.js';
import { errorHandler, notFoundHandler } from './lib/http.js';
import { createHealthRouter } from './modules/health/health.routes.js';

export interface AppDeps {
  db?: Db;
}

// Modular monolith: each domain (auth, profiles, jobs, feed, ...) mounts its router under /api/v1.
export function createApp(env: Pick<Env, 'CORS_ORIGINS'>, deps: AppDeps = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  const v1 = Router();
  v1.use('/health', createHealthRouter(deps.db));
  app.use('/api/v1', v1);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
