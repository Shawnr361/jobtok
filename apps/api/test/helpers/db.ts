import { afterAll, expect, inject } from 'vitest';
import { createDb, type Db } from '../../src/db/client.js';
import { seed } from '../../src/db/seed.js';

let db: Db | undefined;

/** Shared Prisma client for a test file; disconnected automatically after the file. */
export function getDb(): Db {
  if (!db) {
    db = createDb(inject('databaseUrl'));
    afterAll(async () => {
      await db?.$disconnect();
      db = undefined;
    });
  }
  return db;
}

/** Empties every application table (keeps migration history). */
export async function truncateAll(client: Db) {
  const rows = await client.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
     WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const tables = rows.map((r) => `"${r.tablename}"`).join(', ');
  await client.$executeRawUnsafe(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
}

export async function resetAndSeed(client: Db) {
  await truncateAll(client);
  await seed(client);
}

/** Asserts that a database operation is rejected by the named constraint/trigger rule. */
export async function expectDbError(op: Promise<unknown>, constraint: string | RegExp) {
  const err = await op.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(err, `expected rejection by ${String(constraint)}`).toBeInstanceOf(Error);
  const text = `${(err as Error).message} ${JSON.stringify((err as { meta?: unknown }).meta ?? {})}`;
  expect(text).toMatch(constraint);
}
