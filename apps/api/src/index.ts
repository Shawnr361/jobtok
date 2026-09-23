import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createDb } from './db/client.js';

const env = loadEnv();
const db = env.DATABASE_URL ? createDb(env.DATABASE_URL) : undefined;
if (!db) console.warn('DATABASE_URL is not set; database routes will return 503.');

const app = createApp(env, { db });

const server = app.listen(env.PORT, () => {
  console.log(`JobTok API listening on http://localhost:${env.PORT}/api/v1`);
});

const shutdown = () => {
  server.close(() => {
    void db?.$disconnect().finally(() => process.exit(0));
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
