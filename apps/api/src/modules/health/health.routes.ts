import type { DatabaseHealth, HealthStatus } from '@jobtok/types';
import { Router } from 'express';
import type { Db } from '../../db/client.js';
import { HttpError, ok } from '../../lib/http.js';

export function createHealthRouter(db?: Db) {
  const router = Router();

  router.get('/', (_req, res) => {
    const body: HealthStatus = {
      status: 'ok',
      service: 'jobtok-api',
      version: process.env.npm_package_version ?? '0.0.0',
      time: new Date().toISOString(),
    };
    ok(res, body);
  });

  router.get('/db', async (_req, res) => {
    if (!db) {
      throw new HttpError(503, 'database_not_configured', 'DATABASE_URL is not set');
    }
    const started = performance.now();
    try {
      const [row] = await db.$queryRaw<{ migrations: number }[]>`
        SELECT count(*)::int AS migrations
          FROM _prisma_migrations
         WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
      const body: DatabaseHealth = {
        status: 'ok',
        latencyMs: Math.round(performance.now() - started),
        migrations: row?.migrations ?? 0,
      };
      ok(res, body);
    } catch (err) {
      console.error('Database health check failed:', err);
      throw new HttpError(503, 'database_unavailable', 'Database is not reachable');
    }
  });

  return router;
}
