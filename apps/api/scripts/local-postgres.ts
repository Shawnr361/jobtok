// Runs a real PostgreSQL 17 server from npm binaries (embedded-postgres) for machines
// without Docker. Same credentials/port as docker-compose.yml, so DATABASE_URL is identical.
// Usage: npm run db:embedded   (Ctrl+C to stop; data persists in apps/api/.pgdata)
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const databaseDir = resolve(import.meta.dirname, '../.pgdata');
const port = Number(process.env.PGPORT ?? 5432);

const pg = new EmbeddedPostgres({
  databaseDir,
  port,
  user: 'jobtok',
  password: 'jobtok',
  persistent: true,
  // Windows defaults to WIN1252; JobTok stores UTF-8 (₦, names, messages).
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  onLog: () => {},
});

const fresh = !existsSync(resolve(databaseDir, 'PG_VERSION'));
if (fresh) await pg.initialise();
await pg.start();

const client = pg.getPgClient('postgres');
await client.connect();
const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = 'jobtok'");
if (!rowCount) await pg.createDatabase('jobtok');
await client.end();

console.log(`PostgreSQL running: postgresql://jobtok:jobtok@localhost:${port}/jobtok`);
console.log('Press Ctrl+C to stop.');

const shutdown = async () => {
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
