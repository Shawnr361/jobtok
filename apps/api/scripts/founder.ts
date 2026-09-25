// Makes your account the JobTok founder: admin, @kenny, Kehinde Adeeyo.
// Sign in on the app once first, then run from the repo root:
//   npm run founder -- --phone 08031234567
//   npm run founder -- --email you@example.com
import { createDb } from '../src/db/client.js';
import { FounderError, assignFounder } from '../src/db/founder.js';

const args = process.argv.slice(2);
const value = (flag: string) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const phone = value('--phone');
const email = value('--email');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Run this from the repo root with npm run founder.');
  process.exit(1);
}
if (!phone && !email) {
  console.error('Usage: npm run founder -- --phone <number>   (or --email <address>)');
  process.exit(1);
}

const db = createDb(process.env.DATABASE_URL);
try {
  const r = await assignFounder(db, { phone, email });
  console.log(`Done. @${r.username} (${r.fullName}) is now the JobTok admin.`);
  console.log(
    r.registrationRank === 1
      ? 'This is the first account registered on this database.'
      : `Note: ${r.accountsBefore} account(s) on this database were registered before this one.`,
  );
} catch (err) {
  console.error(err instanceof FounderError ? err.message : err);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
