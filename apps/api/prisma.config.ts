import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// Prisma 7 does not load .env automatically.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Optional so `prisma generate` works without a database (CI, fresh clones).
    url: process.env.DATABASE_URL ?? '',
  },
});
