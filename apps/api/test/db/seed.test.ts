import { COUNTRIES, LAUNCH_CATEGORIES } from '@jobtok/types';
import { beforeAll, describe, expect, it } from 'vitest';
import { seed } from '../../src/db/seed.js';
import { SEED_IDS, SKILLS_BY_CATEGORY, seedId } from '../../src/db/seed-data.js';
import { getDb, truncateAll } from '../helpers/db.js';

const TABLES = [
  'countries',
  'categories',
  'skills',
  'users',
  'profiles',
  'employer_profiles',
  'posts',
  'portfolio_items',
  'jobs',
  'applications',
  'application_status_history',
  'conversations',
  'messages',
  'notifications',
] as const;

async function counts(db: ReturnType<typeof getDb>) {
  const out: Record<string, number> = {};
  for (const t of TABLES) {
    const [r] = await db.$queryRawUnsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM "${t}"`);
    out[t] = r!.n;
  }
  return out;
}

describe('seedId', () => {
  it('is deterministic and UUID-shaped', () => {
    expect(seedId('x')).toBe(seedId('x'));
    expect(seedId('x')).not.toBe(seedId('y'));
    expect(seedId('x')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

describe('seed: reference data only', () => {
  const db = getDb();

  beforeAll(async () => {
    await truncateAll(db);
  });

  it('seeds countries, categories and skills without fixtures', async () => {
    const summary = await seed(db, { withFixtures: false });
    const totalSkills = Object.values(SKILLS_BY_CATEGORY).flat().length;
    expect(summary).toEqual({
      countries: Object.keys(COUNTRIES).length,
      categories: LAUNCH_CATEGORIES.length,
      skills: totalSkills,
      users: 0,
    });
    expect(await db.user.count()).toBe(0);
    expect(await db.skill.count()).toBe(totalSkills);
  });
});

describe('seed: full development data', () => {
  const db = getDb();

  beforeAll(async () => {
    await truncateAll(db);
  });

  it('is idempotent: a second run changes nothing', async () => {
    await seed(db);
    const first = await counts(db);
    const firstIds = (await db.skill.findMany({ orderBy: { slug: 'asc' } })).map((s) => s.id);

    await seed(db);
    expect(await counts(db)).toEqual(first);
    expect((await db.skill.findMany({ orderBy: { slug: 'asc' } })).map((s) => s.id)).toEqual(
      firstIds,
    );
    expect(first).toMatchObject({
      countries: 3,
      categories: 7,
      users: 4,
      applications: 1,
      application_status_history: 2,
      messages: 2,
    });
  });

  it('enables Nigeria only and stores country config', async () => {
    const enabled = await db.country.findMany({ where: { isEnabled: true } });
    expect(enabled.map((c) => c.code)).toEqual(['NG']);
    expect(enabled[0]).toMatchObject({
      dialCode: '+234',
      currencyCode: 'NGN',
      currencySymbol: '₦',
    });
  });

  it('seeds all launch categories in spec order, each with skills', async () => {
    const cats = await db.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { skills: true } } },
    });
    expect(cats.map((c) => c.name)).toEqual(LAUNCH_CATEGORIES.map((c) => c.name));
    for (const c of cats) expect(c._count.skills, c.slug).toBeGreaterThanOrEqual(6);
    expect(await db.skill.count({ where: { categoryId: null } })).toBe(0);
  });

  it('seeds a coherent hiring story (visual application → reviewing → conversation)', async () => {
    const app = await db.application.findUniqueOrThrow({
      where: { id: SEED_IDS.adaApplication },
      include: { statusHistory: { orderBy: { createdAt: 'asc' } }, job: true, conversations: true },
    });
    expect(app.status).toBe('reviewing');
    expect(app.attachedPostIds).toEqual([SEED_IDS.adaShowcase]);
    expect(app.attachedPortfolioId).toBe(SEED_IDS.adaPortfolio);
    expect(app.statusHistory.map((h) => [h.oldStatus, h.newStatus, h.changedBy])).toEqual([
      [null, 'applied', SEED_IDS.user('ada')],
      ['applied', 'reviewing', SEED_IDS.user('bola')],
    ]);
    expect(app.conversations).toHaveLength(1);
    expect(app.conversations[0]!.lastMessageAt).not.toBeNull();
  });
});
