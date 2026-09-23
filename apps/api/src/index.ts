import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createDb } from './db/client.js';
import { authDepsFromEnv } from './modules/auth/auth.config.js';

const env = loadEnv();
const db = env.DATABASE_URL ? createDb(env.DATABASE_URL) : undefined;
if (!db) console.warn('DATABASE_URL is not set; database and auth routes are disabled.');

const auth = db ? authDepsFromEnv(env) : undefined;
if (auth) {
  const dev = [auth.sms, auth.email, auth.google].filter((p) => p.isDevelopmentOnly);
  for (const p of dev) {
    console.warn(
      `[auth] DEVELOPMENT-ONLY provider active: ${p.name} (not a real delivery/identity service)`,
    );
  }
  if (!auth.google.isConfigured)
    console.warn('[auth] Google sign-in disabled: GOOGLE_CLIENT_IDS is not set');
}

const app = createApp(env, { db, auth });

// Express 5 reports listen failures (e.g. port already in use) through the callback.
const server = app.listen(env.PORT, (err?: Error) => {
  if (err) {
    console.error(`JobTok API failed to start on port ${env.PORT}:`, err.message);
    process.exit(1);
  }
  console.log(`JobTok API listening on http://localhost:${env.PORT}/api/v1`);
});

const shutdown = () => {
  server.close(() => {
    void db?.$disconnect().finally(() => process.exit(0));
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
