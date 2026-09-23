// Entry point for `prisma db seed` / `npm run db:seed`.
import { createDb } from '../src/db/client.js';
import { seed } from '../src/db/seed.js';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const db = createDb(url);
try {
  const summary = await seed(db, { withFixtures: process.env.SEED_FIXTURES !== 'false' });
  console.log('Seed complete:', summary);
} finally {
  await db.$disconnect();
}
