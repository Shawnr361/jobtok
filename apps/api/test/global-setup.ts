// Provides a freshly migrated PostgreSQL database for the test run.
// - TEST_DATABASE_URL set (e.g. Docker/CI): uses it. It must point at a disposable database.
// - Otherwise: starts a throwaway embedded PostgreSQL 17 on port 54329 and deletes it afterwards.
// Migrations are applied with `prisma migrate deploy`, exactly as in production.
import EmbeddedPostgres from 'embedded-postgres';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

const apiRoot = resolve(import.meta.dirname, '..');

export function runPrisma(args: string[], databaseUrl: string) {
  return execFileSync(process.execPath, [require_prisma_cli(), ...args], {
    cwd: apiRoot,
    // No update/telemetry network calls from the CLI during tests.
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      CHECKPOINT_DISABLE: '1',
      PRISMA_HIDE_UPDATE_MESSAGE: '1',
    },
    encoding: 'utf8',
    stdio: 'pipe',
  });
}

function require_prisma_cli() {
  return resolve(apiRoot, '../../node_modules/prisma/build/index.js');
}

export default async function setup(project: TestProject) {
  let databaseUrl = process.env.TEST_DATABASE_URL;
  let teardown = async () => {};

  if (!databaseUrl) {
    const port = Number(process.env.TEST_PGPORT ?? 54329);
    const dir = mkdtempSync(join(tmpdir(), 'jobtok-test-pg-'));
    const pg = new EmbeddedPostgres({
      databaseDir: dir,
      port,
      user: 'jobtok',
      password: 'jobtok',
      persistent: false,
      initdbFlags: ['--encoding=UTF8', '--locale=C'],
      onLog: () => {},
    });
    await pg.initialise();
    await pg.start();
    await pg.createDatabase('jobtok_test');
    databaseUrl = `postgresql://jobtok:jobtok@localhost:${port}/jobtok_test`;
    teardown = async () => {
      await pg.stop();
      try {
        rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 });
      } catch {
        // Windows can hold the data dir briefly after shutdown; it lives in the OS temp dir.
        console.warn(`Could not remove test database dir ${dir}`);
      }
    };
  }

  runPrisma(['migrate', 'deploy'], databaseUrl);
  project.provide('databaseUrl', databaseUrl);

  return teardown;
}
