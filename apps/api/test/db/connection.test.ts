import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { createDb } from '../../src/db/client.js';
import { getDb } from '../helpers/db.js';

describe('database connection', () => {
  const db = getDb();

  it('connects to PostgreSQL 17 with UTF-8 encoding', async () => {
    const [row] = await db.$queryRaw<{ version: string; encoding: string }[]>`
      SELECT version(), pg_encoding_to_char(encoding) AS encoding
        FROM pg_database WHERE datname = current_database()`;
    expect(row?.version).toMatch(/^PostgreSQL 17\./);
    expect(row?.encoding).toBe('UTF8');
  });

  it('round-trips non-ASCII text (₦, names)', async () => {
    const [row] = await db.$queryRaw<{ v: string }[]>`SELECT ${'₦150,000 · Chịnwé'}::text AS v`;
    expect(row?.v).toBe('₦150,000 · Chịnwé');
  });
});

describe('GET /api/v1/health/db', () => {
  it('reports ok with the number of applied migrations', async () => {
    const app = createApp({ CORS_ORIGINS: [] }, { db: getDb() });
    const res = await request(app).get('/api/v1/health/db');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, data: { status: 'ok' } });
    expect(res.body.data.migrations).toBeGreaterThanOrEqual(2);
    expect(typeof res.body.data.latencyMs).toBe('number');
  });

  it('returns 503 when no database is configured', async () => {
    const app = createApp({ CORS_ORIGINS: [] });
    const res = await request(app).get('/api/v1/health/db');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'database_not_configured' } });
  });

  it('returns 503 when the database is unreachable', async () => {
    const dead = createDb('postgresql://jobtok:jobtok@127.0.0.1:1/nowhere?connect_timeout=2');
    const app = createApp({ CORS_ORIGINS: [] }, { db: dead });
    const res = await request(app).get('/api/v1/health/db');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'database_unavailable' } });
    await dead.$disconnect();
  });
});
