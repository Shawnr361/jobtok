import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { APPLICATION_STATUSES, EMPLOYMENT_TYPES, POST_TYPES } from '@jobtok/types';
import { describe, expect, inject, it } from 'vitest';
import { runPrisma } from '../global-setup.js';
import { getDb } from '../helpers/db.js';

const migrationsDir = resolve(import.meta.dirname, '../../prisma/migrations');
const migrationNames = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const EXPECTED_TABLES = [
  'application_status_history',
  'applications',
  'auth_sessions',
  'auth_tokens',
  'categories',
  'conversations',
  'countries',
  'employer_profiles',
  'follows',
  'interaction_events',
  'job_skills',
  'jobs',
  'likes',
  'messages',
  'notifications',
  'oauth_accounts',
  'otp_challenges',
  'portfolio_items',
  'post_tags',
  'posts',
  'profile_links',
  'profile_skills',
  'profiles',
  'reports',
  'saves',
  'skills',
  'users',
];

// Indexes from spec Part 4 §5 plus the discovery/moderation indexes added in Step 2.
const EXPECTED_INDEXES = [
  'idx_posts_created_at',
  'idx_posts_user_id',
  'idx_posts_post_type',
  'idx_posts_feed',
  'idx_posts_location',
  'idx_jobs_location',
  'idx_jobs_employment_type',
  'idx_jobs_is_active',
  'idx_jobs_employer_id',
  'idx_applications_job_id',
  'idx_applications_applicant_id',
  'idx_applications_status',
  'idx_application_status_history_application_id',
  'idx_messages_conversation_id',
  'idx_conversations_participant_one',
  'idx_conversations_participant_two',
  'idx_notifications_user_unread',
  'idx_reports_status',
  'idx_reports_entity',
  'idx_profiles_location',
  'idx_profile_skills_skill_id',
  'idx_job_skills_skill_id',
  'idx_post_tags_skill_id',
  'users_phone_key',
  'users_email_key',
  'profiles_username_key',
  'applications_job_id_applicant_id_key',
  'conversations_participant_one_participant_two_key',
];

const EXPECTED_TRIGGERS = [
  'users_validate_country_phone',
  'users_protect_capabilities',
  'applications_validate_insert',
  'applications_validate_attachments',
  'applications_enforce_status_transition',
  'applications_record_status_history',
  'messages_validate_sender',
  'messages_touch_conversation',
];

describe('migrations', () => {
  const db = getDb();

  it('applied every migration in prisma/migrations, in order', async () => {
    const rows = await db.$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name FROM _prisma_migrations
       WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
       ORDER BY migration_name`;
    expect(migrationNames.length).toBeGreaterThanOrEqual(2);
    expect(rows.map((r) => r.migration_name)).toEqual(migrationNames);
  });

  it('`prisma migrate status` reports the database up to date', () => {
    const out = runPrisma(['migrate', 'status'], inject('databaseUrl'));
    expect(out).toMatch(/Database schema is up to date/);
  }, 120_000);

  it('has no drift between schema.prisma and the migrated database', () => {
    // --exit-code: 0 = no difference, 2 = difference (throws).
    const out = runPrisma(
      [
        'migrate',
        'diff',
        '--from-config-datasource',
        '--to-schema',
        'prisma/schema.prisma',
        '--exit-code',
      ],
      inject('databaseUrl'),
    );
    expect(out).toMatch(/No difference|empty/i);
  }, 120_000);

  it('creates every spec table', async () => {
    const rows = await db.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
       ORDER BY tablename`;
    expect(rows.map((r) => r.tablename)).toEqual(EXPECTED_TABLES);
  });

  it('creates enums that match @jobtok/types', async () => {
    const enumValues = async (type: string) =>
      (
        await db.$queryRawUnsafe<{ v: string }[]>(
          `SELECT e.enumlabel AS v FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = $1 ORDER BY e.enumsortorder`,
          type,
        )
      ).map((r) => r.v);
    expect(await enumValues('application_status')).toEqual([...APPLICATION_STATUSES]);
    expect(await enumValues('post_type')).toEqual([...POST_TYPES]);
    expect(await enumValues('employment_type')).toEqual([...EMPLOYMENT_TYPES]);
  });

  it('creates the MVP query indexes', async () => {
    const rows = await db.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`;
    const names = rows.map((r) => r.indexname);
    for (const idx of EXPECTED_INDEXES) expect(names, idx).toContain(idx);
  });

  it('installs the integrity triggers', async () => {
    const rows = await db.$queryRaw<{ tgname: string }[]>`
      SELECT tgname FROM pg_trigger WHERE NOT tgisinternal`;
    const names = rows.map((r) => r.tgname);
    for (const t of EXPECTED_TRIGGERS) expect(names, t).toContain(t);
  });

  it('never stores media binaries: no bytea columns exist', async () => {
    const [row] = await db.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM information_schema.columns
       WHERE table_schema = 'public' AND data_type = 'bytea'`;
    expect(row?.n).toBe(0);
  });
});
