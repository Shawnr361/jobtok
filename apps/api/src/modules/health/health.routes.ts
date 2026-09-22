import type { HealthStatus } from '@jobtok/types';
import { Router } from 'express';
import { ok } from '../../lib/http.js';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  const body: HealthStatus = {
    status: 'ok',
    service: 'jobtok-api',
    version: process.env.npm_package_version ?? '0.0.0',
    time: new Date().toISOString(),
  };
  ok(res, body);
});
