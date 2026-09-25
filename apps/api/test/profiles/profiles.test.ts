import { PROFILE_LIMITS, SKILL_CATEGORIES } from '@jobtok/types';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { assignFounder } from '../../src/db/founder.js';
import { SEED_IDS } from '../../src/db/seed-data.js';
import {
  createTestApp,
  createTestAuth,
  phoneSignIn,
  registerVerified,
  type TestAuth,
} from '../helpers/auth.js';
import { getDb, resetAndSeed } from '../helpers/db.js';

const PRIVATE_KEYS = [
  'email',
  'phone',
  'passwordHash',
  'password_hash',
  'refreshToken',
  'refreshTokenHash',
  'codeHash',
  'isSuspended',
  'suspensionReason',
  'latitude',
  'longitude',
  'userId',
  'role',
  'activeMode',
  'authSessions',
  'otpChallenges',
];

/** Every key anywhere in a JSON value. */
function allKeys(value: unknown, into = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => allKeys(v, into));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      into.add(k);
      allKeys(v, into);
    }
  }
  return into;
}

describe('creator profiles', () => {
  const db = getDb();
  let t: TestAuth;
  let api: ReturnType<typeof createTestApp>;
  let alice: { token: string; userId: string; phone: string };
  let bob: { token: string; userId: string };

  const as = (token?: string) => ({
    get: (path: string) => {
      const r = request(api.app).get(`/api/v1${path}`);
      return token ? r.set('Authorization', `Bearer ${token}`) : r;
    },
    patch: (path: string) => {
      const r = request(api.app).patch(`/api/v1${path}`);
      return token ? r.set('Authorization', `Bearer ${token}`) : r;
    },
    post: (path: string) => {
      const r = request(api.app).post(`/api/v1${path}`);
      return token ? r.set('Authorization', `Bearer ${token}`) : r;
    },
    delete: (path: string) => {
      const r = request(api.app).delete(`/api/v1${path}`);
      return token ? r.set('Authorization', `Bearer ${token}`) : r;
    },
  });

  beforeAll(async () => {
    await resetAndSeed(db);
    t = await createTestAuth();
    api = createTestApp(db, t);
    const a = await phoneSignIn(t, api, '08035550101');
    alice = { token: a.accessToken, userId: a.user.id, phone: a.user.phone };
    const b = await phoneSignIn(t, api, '08035550102');
    bob = { token: b.accessToken, userId: b.user.id };
  });

  describe('own profile', () => {
    it('starts empty: GET /me returns null before anything is saved', async () => {
      const res = await as(alice.token).get('/profiles/me').expect(200);
      expect(res.body).toEqual({ ok: true, data: { profile: null } });
    });

    it('creates the profile on first save and persists it to PostgreSQL', async () => {
      const res = await as(alice.token)
        .patch('/profiles/me')
        .send({
          displayName: '  Amaka   Obi ',
          firstName: 'Amaka',
          lastName: 'Obi',
          headline: 'I cook for weddings and big events',
          city: 'Kaduna',
          region: 'Kaduna',
        })
        .expect(201);
      const p = res.body.data.profile;
      expect(p).toMatchObject({
        displayName: 'Amaka Obi', // whitespace tidied
        firstName: 'Amaka',
        lastName: 'Obi',
        headline: 'I cook for weddings and big events',
        location: { city: 'Kaduna', region: 'Kaduna', countryCode: 'NG', countryName: 'Nigeria' },
        isPublic: true,
        stats: { followers: 0, following: 0, videos: 0 },
      });
      expect(p.username).toMatch(/^amaka\.obi/);

      const row = await db.profile.findUniqueOrThrow({ where: { userId: alice.userId } });
      expect(row).toMatchObject({ fullName: 'Amaka Obi', locationCity: 'Kaduna' });
    });

    it('updates only the fields sent, and null clears a field', async () => {
      await as(alice.token)
        .patch('/profiles/me')
        .send({ bio: 'Party jollof\n\n\n\nfor 300 guests.', region: null, availability: 'busy' })
        .expect(200);
      const res = await as(alice.token).get('/profiles/me').expect(200);
      expect(res.body.data.profile).toMatchObject({
        displayName: 'Amaka Obi',
        headline: 'I cook for weddings and big events',
        bio: 'Party jollof\n\nfor 300 guests.', // blank lines capped at one
        location: { city: 'Kaduna', region: null },
        availability: 'busy',
      });
    });

    it('lets people pick their own username, and keeps usernames unique', async () => {
      await as(alice.token).patch('/profiles/me').send({ username: 'Amaka.Cooks' }).expect(200);
      const mine = await as(alice.token).get('/profiles/me');
      expect(mine.body.data.profile.username).toBe('amaka.cooks');

      const taken = await as(bob.token).patch('/profiles/me').send({ username: 'amaka.cooks' });
      expect(taken.status).toBe(409);
      expect(taken.body.error.code).toBe('username_taken');
    });

    it('tracks progressive completion without calling anyone verified', async () => {
      const res = await as(alice.token).get('/profiles/me');
      const { completion } = res.body.data.profile;
      expect(completion.steps).toEqual([
        { key: 'name', done: true },
        { key: 'what_you_do', done: true },
        { key: 'location', done: true },
        { key: 'skills', done: false },
        { key: 'work', done: false },
        { key: 'create', done: false },
      ]);
      expect(completion).toMatchObject({ percent: 50, next: 'skills' });
      expect(JSON.stringify(res.body)).not.toMatch(/verified/i);
    });
  });

  describe('validation', () => {
    it.each([
      { body: { username: 'ab' }, why: 'too short' },
      { body: { username: 'has space' }, why: 'spaces' },
      { body: { username: '.dotstart' }, why: 'leading dot' },
      { body: { username: 'double..dot' }, why: 'double dot' },
      { body: { username: 'admin' }, why: 'reserved' },
      { body: { firstName: 'Ken123' }, why: 'numbers in a first name' },
      { body: { lastName: '<script>' }, why: 'symbols in a last name' },
      { body: { city: 'Lagos#1' }, why: 'symbols in a city' },
      { body: { displayName: 'Kenny 💯' }, why: 'emoji in a display name' },
      { body: { headline: 'x'.repeat(PROFILE_LIMITS.headline + 1) }, why: 'headline too long' },
      { body: { bio: 'x'.repeat(PROFILE_LIMITS.bio + 1) }, why: 'bio too long' },
      { body: { availability: 'looking_for_job' }, why: 'unknown availability' },
      { body: { countryCode: 'Nigeria' }, why: 'country not a code' },
      { body: { isAdmin: true }, why: 'unknown field' },
      { body: { userId: SEED_IDS.user('ada') }, why: 'cannot target another user' },
    ])('rejects $why', async ({ body }) => {
      const res = await as(bob.token).patch('/profiles/me').send(body);
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    it('accepts real names with Yoruba marks, apostrophes and hyphens', async () => {
      const res = await as(alice.token)
        .patch('/profiles/me')
        .send({ firstName: 'Adéọlá', lastName: "O'Neil-Adéèyọ̀", city: 'Port Harcourt' })
        .expect(200);
      expect(res.body.data.profile).toMatchObject({ firstName: 'Adéọlá' });
    });

    it('rejects a country that JobTok does not know', async () => {
      const res = await as(bob.token).patch('/profiles/me').send({ countryCode: 'ZZ' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('invalid_country');
    });

    it('supports countries beyond Nigeria that exist in the country table', async () => {
      await as(bob.token)
        .patch('/profiles/me')
        .send({ countryCode: 'gh', city: 'Accra' })
        .expect(201);
      const res = await as(bob.token).get('/profiles/me');
      expect(res.body.data.profile.location).toMatchObject({
        countryCode: 'GH',
        city: 'Accra',
        countryName: 'Ghana',
      });
    });
  });

  describe('authorization', () => {
    it('requires sign-in for every /me route', async () => {
      const calls = [
        as().get('/profiles/me'),
        as().patch('/profiles/me').send({ headline: 'x' }),
        as().post('/profiles/me/skills').send({ name: 'Welding' }),
        as().post('/profiles/me/links').send({ label: 'Site', url: 'https://example.com' }),
        as().post('/profiles/me/projects').send({ title: 'x' }),
      ];
      for (const res of await Promise.all(calls)) {
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('unauthorized');
      }
    });

    it('rejects a forged token', async () => {
      const res = await as('not-a-real-token').patch('/profiles/me').send({ headline: 'x' });
      expect(res.status).toBe(401);
    });

    it("cannot change or delete another person's links or projects", async () => {
      const links = await as(alice.token)
        .post('/profiles/me/links')
        .send({ label: 'Instagram', url: 'https://instagram.com/amaka.cooks' })
        .expect(201);
      const linkId = links.body.data.links[0].id;
      const projects = await as(alice.token)
        .post('/profiles/me/projects')
        .send({ title: 'Wedding for 300 guests' })
        .expect(201);
      const projectId = projects.body.data.projects[0].id;

      expect((await as(bob.token).delete(`/profiles/me/links/${linkId}`)).status).toBe(404);
      expect((await as(bob.token).delete(`/profiles/me/projects/${projectId}`)).status).toBe(404);
      expect(
        (await as(bob.token).patch(`/profiles/me/projects/${projectId}`).send({ title: 'Mine' }))
          .status,
      ).toBe(404);

      expect(await db.profileLink.count({ where: { id: linkId } })).toBe(1);
      const project = await db.portfolioItem.findUniqueOrThrow({ where: { id: projectId } });
      expect(project.title).toBe('Wedding for 300 guests');
    });
  });

  describe('skills', () => {
    it('adds a curated skill by id', async () => {
      const skill = await db.skill.findUniqueOrThrow({ where: { slug: 'catering' } });
      const res = await as(alice.token)
        .post('/profiles/me/skills')
        .send({ skillId: skill.id })
        .expect(201);
      expect(res.body.data.skills).toEqual([
        {
          id: skill.id,
          name: 'Catering',
          slug: 'catering',
          category: { slug: 'food', name: 'Food' },
        },
      ]);
    });

    it('adds a new skill by name (uncurated) and reuses it for the next person', async () => {
      const first = await as(alice.token)
        .post('/profiles/me/skills')
        .send({ name: 'Suya Grilling', categorySlug: 'food' })
        .expect(201);
      const added = first.body.data.skills.find(
        (s: { name: string }) => s.name === 'Suya Grilling',
      );
      expect(added.category).toEqual({ slug: 'food', name: 'Food' });
      const row = await db.skill.findUniqueOrThrow({ where: { slug: 'suya-grilling' } });
      expect(row.isCurated).toBe(false);

      await as(bob.token).post('/profiles/me/skills').send({ name: 'suya   grilling' }).expect(201);
      expect(await db.skill.count({ where: { slug: 'suya-grilling' } })).toBe(1);
    });

    it('rejects duplicates, by id or by name', async () => {
      const skill = await db.skill.findUniqueOrThrow({ where: { slug: 'catering' } });
      const byId = await as(alice.token).post('/profiles/me/skills').send({ skillId: skill.id });
      expect(byId.status).toBe(409);
      expect(byId.body.error.code).toBe('skill_already_added');
      const byName = await as(alice.token).post('/profiles/me/skills').send({ name: 'CATERING' });
      expect(byName.status).toBe(409);
      expect(await db.profileSkill.count({ where: { skillId: skill.id } })).toBe(1);
    });

    it('removes a skill, and says so when the skill is not on the profile', async () => {
      const skill = await db.skill.findUniqueOrThrow({ where: { slug: 'suya-grilling' } });
      const res = await as(alice.token).delete(`/profiles/me/skills/${skill.id}`).expect(200);
      expect(res.body.data.skills.map((s: { slug: string }) => s.slug)).toEqual(['catering']);
      const again = await as(alice.token).delete(`/profiles/me/skills/${skill.id}`);
      expect(again.status).toBe(404);
      expect(again.body.error.code).toBe('skill_not_on_profile');
      // The skill itself stays in the taxonomy (Bob still has it).
      expect(await db.skill.count({ where: { id: skill.id } })).toBe(1);
    });

    it('rejects unknown skill ids and invalid names', async () => {
      const unknown = await as(alice.token)
        .post('/profiles/me/skills')
        .send({ skillId: '00000000-0000-4000-8000-000000000000' });
      expect(unknown.status).toBe(404);
      expect((await as(alice.token).post('/profiles/me/skills').send({ name: ' ' })).status).toBe(
        400,
      );
      expect((await as(alice.token).post('/profiles/me/skills').send({})).status).toBe(400);
      expect(
        (
          await as(alice.token)
            .post('/profiles/me/skills')
            .send({ name: 'Pottery', categorySlug: 'nope' })
        ).status,
      ).toBe(400);
    });

    it(`caps a profile at ${PROFILE_LIMITS.skills} skills`, async () => {
      const t2 = await phoneSignIn(t, api, '08035550103');
      const skills = await db.skill.findMany({
        take: PROFILE_LIMITS.skills + 1,
        orderBy: { slug: 'asc' },
      });
      for (const s of skills.slice(0, PROFILE_LIMITS.skills)) {
        await as(t2.accessToken).post('/profiles/me/skills').send({ skillId: s.id }).expect(201);
      }
      const over = await as(t2.accessToken)
        .post('/profiles/me/skills')
        .send({ skillId: skills[PROFILE_LIMITS.skills]!.id });
      expect(over.status).toBe(422);
      expect(over.body.error.code).toBe('too_many_skills');
    });
  });

  describe('portfolio links', () => {
    it('adds https:// when missing and normalizes the link', async () => {
      const res = await as(alice.token)
        .post('/profiles/me/links')
        .send({ label: 'Website', url: 'amakacooks.ng/menu' })
        .expect(201);
      expect(res.body.data.links.map((l: { url: string }) => l.url)).toContain(
        'https://amakacooks.ng/menu',
      );
    });

    it.each([
      'javascript:alert(1)',
      'data:text/html,hi',
      'ftp://files.example.com',
      'http://localhost:3000',
      'http://127.0.0.1/admin',
      'https://user:pass@example.com',
      'not a link',
      `https://example.com/${'a'.repeat(PROFILE_LIMITS.url)}`,
    ])('rejects %s', async (url) => {
      const res = await as(alice.token).post('/profiles/me/links').send({ label: 'Bad', url });
      expect(res.status).toBe(400);
    });

    it('rejects duplicate links and removes links', async () => {
      const dup = await as(alice.token)
        .post('/profiles/me/links')
        .send({ label: 'Again', url: 'https://instagram.com/amaka.cooks' });
      expect(dup.status).toBe(409);
      const mine = await as(alice.token).get('/profiles/me');
      const website = mine.body.data.profile.links.find(
        (l: { label: string }) => l.label === 'Website',
      );
      const res = await as(alice.token).delete(`/profiles/me/links/${website.id}`).expect(200);
      expect(res.body.data.links.map((l: { label: string }) => l.label)).toEqual(['Instagram']);
    });
  });

  describe('projects', () => {
    it('creates, features, updates and deletes projects', async () => {
      const created = await as(alice.token)
        .post('/profiles/me/projects')
        .send({
          title: 'Small chops for a naming ceremony',
          description: 'Puff-puff, samosa and spring rolls for 120 guests.',
          link: 'https://instagram.com/p/abc',
          projectDate: '2026-08-15',
          featured: true,
        })
        .expect(201);
      const featured = created.body.data.projects[0];
      expect(featured).toMatchObject({
        title: 'Small chops for a naming ceremony',
        link: 'https://instagram.com/p/abc',
        projectDate: '2026-08-15',
        featured: true,
        videoPostId: null,
      });

      const updated = await as(alice.token)
        .patch(`/profiles/me/projects/${featured.id}`)
        .send({ featured: false, description: null })
        .expect(200);
      expect(
        updated.body.data.projects.find((p: { id: string }) => p.id === featured.id),
      ).toMatchObject({
        featured: false,
        description: null,
      });

      await as(alice.token).delete(`/profiles/me/projects/${featured.id}`).expect(200);
      expect(await db.portfolioItem.count({ where: { id: featured.id } })).toBe(0);
    });

    it('validates project input', async () => {
      const bad = [
        {},
        { title: '' },
        { title: 'x'.repeat(PROFILE_LIMITS.projectTitle + 1) },
        { title: 'Ok', projectDate: '15/08/2026' },
        { title: 'Ok', link: 'javascript:alert(1)' },
      ];
      for (const body of bad) {
        const res = await as(alice.token).post('/profiles/me/projects').send(body);
        expect(res.status, JSON.stringify(body)).toBe(400);
      }
      const empty = await as(alice.token)
        .patch('/profiles/me/projects/00000000-0000-4000-8000-000000000000')
        .send({});
      expect(empty.status).toBe(400);
    });
  });

  describe('public creator profile', () => {
    it('is available by username or id, without signing in', async () => {
      const byName = await as().get('/profiles/amaka.cooks').expect(200);
      const profile = byName.body.data.profile;
      expect(profile).toMatchObject({
        username: 'amaka.cooks',
        displayName: 'Amaka Obi',
        headline: 'I cook for weddings and big events',
        skills: [{ slug: 'catering' }],
        links: [{ label: 'Instagram' }],
      });
      const byId = await as().get(`/profiles/${profile.id}`).expect(200);
      expect(byId.body.data.profile.id).toBe(profile.id);
      // Usernames are case-insensitive.
      await as().get('/profiles/AMAKA.COOKS').expect(200);
    });

    it('never exposes private or authentication data', async () => {
      const res = await as(bob.token).get('/profiles/amaka.cooks').expect(200);
      const keys = allKeys(res.body);
      for (const k of PRIVATE_KEYS) expect(keys.has(k), k).toBe(false);
      // Owner-only fields are absent too.
      for (const k of ['firstName', 'lastName', 'completion', 'isPublic']) {
        expect(keys.has(k), k).toBe(false);
      }
      const text = JSON.stringify(res.body);
      expect(text).not.toContain(alice.phone);
      expect(text).not.toContain('0355501'); // no fragment of the phone number either
    });

    it('does not expose owner-only or auth data on /me beyond the owner fields', async () => {
      const res = await as(alice.token).get('/profiles/me');
      const keys = allKeys(res.body);
      for (const k of PRIVATE_KEYS) expect(keys.has(k), k).toBe(false);
    });

    it('hides profiles of people whose phone is not verified yet', async () => {
      const session = await registerVerified(t, api, 'newcreator@example.com');
      await as(session.accessToken)
        .patch('/profiles/me')
        .send({ username: 'email.only', headline: 'Painter' })
        .expect(201);
      const mine = await as(session.accessToken).get('/profiles/me');
      expect(mine.body.data.profile.isPublic).toBe(false);
      const res = await as().get('/profiles/email.only');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('profile_not_found');
    });

    it('hides suspended accounts', async () => {
      await db.user.update({
        where: { id: bob.userId },
        data: { isSuspended: true, suspensionReason: 'Test suspension' },
      });
      const bobProfile = await db.profile.findUniqueOrThrow({ where: { userId: bob.userId } });
      expect((await as().get(`/profiles/${bobProfile.username}`)).status).toBe(404);
      await db.user.update({
        where: { id: bob.userId },
        data: { isSuspended: false, suspensionReason: null },
      });
    });

    it('returns 404 for unknown profiles', async () => {
      expect((await as().get('/profiles/nobody.here')).status).toBe(404);
      expect((await as().get('/profiles/00000000-0000-4000-8000-000000000000')).status).toBe(404);
    });

    it('shows only real, published, public, unflagged work videos', async () => {
      // Rows shaped the way the upload pipeline leaves them (see test/videos for the real flow).
      const key = () => `videos/${crypto.randomUUID()}.mp4`;
      const base = {
        userId: alice.userId,
        title: 'Jollof for 300',
        isPublished: true,
        status: 'ready' as const,
      };
      await db.post.createMany({
        data: [
          { ...base, postType: 'showcase', title: 'Plating 300 plates', videoStorageKey: key() },
          {
            ...base,
            postType: 'showcase',
            isPublished: false,
            title: 'Draft',
            videoStorageKey: key(),
          },
          {
            ...base,
            postType: 'showcase',
            isFlagged: true,
            title: 'Flagged',
            videoStorageKey: key(),
          },
          {
            ...base,
            postType: 'showcase',
            visibility: 'private',
            title: 'Private',
            videoStorageKey: key(),
          },
          { ...base, postType: 'showcase', title: 'Legacy link, never uploaded' },
          { ...base, postType: 'service', title: 'Not a work video', videoStorageKey: key() },
        ],
      });
      const res = await as().get('/profiles/amaka.cooks').expect(200);
      expect(res.body.data.profile.videos.map((v: { title: string }) => v.title)).toEqual([
        'Plating 300 plates',
      ]);
      expect(res.body.data.profile.stats.videos).toBe(1);

      const mine = await as(alice.token).get('/profiles/me');
      const create = mine.body.data.profile.completion.steps.find(
        (s: { key: string }) => s.key === 'create',
      );
      expect(create.done).toBe(true);
    });
  });

  describe('skill taxonomy', () => {
    it('lists every category with its skill count', async () => {
      const res = await as().get('/skills/categories').expect(200);
      expect(res.body.data.categories.map((c: { slug: string }) => c.slug)).toEqual(
        SKILL_CATEGORIES.map((c) => c.slug),
      );
      for (const c of res.body.data.categories) expect(c.skillCount).toBeGreaterThanOrEqual(3);
    });

    it('searches skills, curated ones first, and filters by category', async () => {
      const res = await as().get('/skills?q=weld').expect(200);
      expect(res.body.data.skills[0]).toMatchObject({ name: 'Welding & Fabrication' });
      const food = await as().get('/skills?category=food&limit=100').expect(200);
      expect(
        food.body.data.skills.every(
          (s: { category: { slug: string } }) => s.category.slug === 'food',
        ),
      ).toBe(true);
      expect((await as().get('/skills?limit=5000')).status).toBe(400);
    });
  });

  describe('username check', () => {
    const check = (token: string, name: string) =>
      as(token).get(`/profiles/username-check?username=${encodeURIComponent(name)}`);

    it('requires sign-in', async () => {
      expect((await as().get('/profiles/username-check?username=abc')).status).toBe(401);
    });

    it('says when a name is free, normalising case, spaces and a leading @', async () => {
      const res = await check(bob.token, '  @Bola.Tiles ').expect(200);
      expect(res.body.data).toEqual({
        username: 'bola.tiles',
        available: true,
        message: '@bola.tiles is available',
      });
    });

    it('rejects badly formed names with the format rule', async () => {
      for (const name of [
        'ab',
        'has space',
        '.dot',
        'dot.',
        'two..dots',
        'dash-name',
        'é_accent',
      ]) {
        const res = await check(bob.token, name).expect(200);
        expect(res.body.data).toMatchObject({ available: false, reason: 'invalid' });
      }
      expect((await check(bob.token, 'x'.repeat(101))).status).toBe(400);
    });

    it('rejects reserved names and anything posing as JobTok', async () => {
      for (const name of [
        'admin',
        'Support',
        'kenny',
        'jobtok.help',
        'the_job_tok',
        'real.jobtok',
      ]) {
        const res = await check(bob.token, name).expect(200);
        expect(res.body.data).toMatchObject({ available: false });
        expect(['reserved', 'invalid']).toContain(res.body.data.reason);
      }
      const save = await as(bob.token).patch('/profiles/me').send({ username: 'kenny' });
      expect(save.status).toBe(400);
    });

    it('says when someone else has it, and when it is already yours', async () => {
      const taken = await check(bob.token, 'amaka.cooks').expect(200);
      expect(taken.body.data).toMatchObject({ available: false, reason: 'taken' });
      const mine = await check(alice.token, 'AMAKA.COOKS').expect(200);
      expect(mine.body.data).toMatchObject({ available: true, mine: true });
    });

    it('never suggests a reserved name when making one up', async () => {
      const k = await phoneSignIn(t, api, '08035550104');
      const res = await as(k.accessToken)
        .patch('/profiles/me')
        .send({ displayName: 'Kenny' })
        .expect(201);
      expect(res.body.data.profile.username).toMatch(/^kenny_\d+$/);
    });
  });

  describe('founder account', () => {
    it('makes an existing account the admin @kenny, Kehinde Adeeyo, and can run again', async () => {
      const f = await phoneSignIn(t, api, '08035550109');
      const first = await assignFounder(db, { phone: '0803 555 0109' });
      expect(first).toMatchObject({ userId: f.user.id, username: 'kenny' });
      await assignFounder(db, { phone: '+2348035550109' });

      const user = await db.user.findUniqueOrThrow({
        where: { id: f.user.id },
        include: { profile: true },
      });
      expect(user.role).toBe('admin');
      expect(user.profile).toMatchObject({
        username: 'kenny',
        fullName: 'Kehinde Adeeyo',
        firstName: 'Kehinde',
        lastName: 'Adeeyo',
      });

      const pub = await as().get('/profiles/kenny').expect(200);
      expect(pub.body.data.profile).toMatchObject({ username: 'kenny' });
      expect(allKeys(pub.body).has('role')).toBe(false);
      const mine = await as(f.accessToken).get('/profiles/username-check?username=kenny');
      expect(mine.body.data).toMatchObject({ available: true, mine: true });
    });

    it('refuses unknown accounts and never hands @kenny to a second person', async () => {
      await expect(assignFounder(db, { phone: '08035550999' })).rejects.toThrow(/Sign in/);
      await expect(assignFounder(db, { phone: '08035550102' })).rejects.toThrow(/already belongs/);
      const bobRow = await db.user.findUniqueOrThrow({ where: { id: bob.userId } });
      expect(bobRow.role).not.toBe('admin');
    });
  });
});
