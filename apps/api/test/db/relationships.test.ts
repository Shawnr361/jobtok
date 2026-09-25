import { beforeEach, describe, expect, it } from 'vitest';
import { SEED_IDS } from '../../src/db/seed-data.js';
import { expectDbError, getDb, resetAndSeed } from '../helpers/db.js';

describe('core relationships', () => {
  const db = getDb();

  beforeEach(async () => {
    await resetAndSeed(db);
  });

  describe('unified user account', () => {
    it('one user can hold both a job seeker and an employer profile', async () => {
      const chidi = await db.user.findUniqueOrThrow({
        where: { id: SEED_IDS.user('chidi') },
        include: { profile: true, employerProfile: true },
      });
      expect(chidi.role).toBe('both');
      expect(chidi.profile?.username).toBe('chidi.designs');
      expect(chidi.employerProfile).not.toBeNull();
    });

    it('switching active mode keeps both profiles and all history', async () => {
      const id = SEED_IDS.user('chidi');
      await db.user.update({ where: { id }, data: { activeMode: 'employer' } });
      await db.user.update({ where: { id }, data: { activeMode: 'seeker' } });
      const chidi = await db.user.findUniqueOrThrow({
        where: { id },
        include: { profile: true, employerProfile: true },
      });
      expect(chidi.profile).not.toBeNull();
      expect(chidi.employerProfile).not.toBeNull();
    });

    it('a seeker upgrades to "both" to use employer mode, without losing the seeker profile', async () => {
      const id = SEED_IDS.user('ada');
      await expectDbError(
        db.user.update({ where: { id }, data: { activeMode: 'employer' } }),
        /users_active_mode_matches_role/,
      );
      await db.user.update({ where: { id }, data: { role: 'both', activeMode: 'employer' } });
      await db.employerProfile.create({ data: { userId: id } });
      const ada = await db.user.findUniqueOrThrow({
        where: { id },
        include: { profile: true, employerProfile: true },
      });
      expect(ada.profile?.username).toBe('ada.builds');
      expect(ada.employerProfile).not.toBeNull();
    });

    it('a role change cannot drop a capability the user already has', async () => {
      await expectDbError(
        db.user.update({
          where: { id: SEED_IDS.user('chidi') },
          data: { role: 'seeker', activeMode: 'seeker' },
        }),
        /users_role_keeps_capabilities/,
      );
    });

    it('a user has at most one profile of each kind', async () => {
      await expectDbError(
        db.profile.create({ data: { userId: SEED_IDS.user('ada'), username: 'ada.second' } }),
        /Unique constraint|user_id/,
      );
    });
  });

  describe('foreign keys and cascades', () => {
    it('rejects rows that reference missing parents', async () => {
      await expectDbError(
        db.post.create({
          data: { userId: '00000000-0000-4000-8000-000000000000', postType: 'showcase' },
        }),
        /Foreign key|posts_user_id_fkey/,
      );
    });

    it('deleting a user removes their profile, posts, applications and messages', async () => {
      const ada = SEED_IDS.user('ada');
      await db.user.delete({ where: { id: ada } });
      expect(await db.profile.count({ where: { userId: ada } })).toBe(0);
      expect(await db.post.count({ where: { userId: ada } })).toBe(0);
      expect(await db.application.count({ where: { id: SEED_IDS.adaApplication } })).toBe(0);
      expect(await db.message.count({ where: { senderId: ada } })).toBe(0);
      // The employer's job is untouched.
      expect(await db.job.count({ where: { id: SEED_IDS.bolaJob } })).toBe(1);
    });

    it('deleting a job video post keeps the job (post_id set to NULL)', async () => {
      await db.post.delete({ where: { id: SEED_IDS.bolaJobPost } });
      const job = await db.job.findUniqueOrThrow({ where: { id: SEED_IDS.bolaJob } });
      expect(job.postId).toBeNull();
    });

    it('deleting an application keeps the conversation (application_id set to NULL)', async () => {
      await db.application.delete({ where: { id: SEED_IDS.adaApplication } });
      const convo = await db.conversation.findUniqueOrThrow({
        where: { id: SEED_IDS.adaBolaConversation },
      });
      expect(convo.applicationId).toBeNull();
    });

    it('a country in use cannot be deleted', async () => {
      await expectDbError(db.country.delete({ where: { code: 'NG' } }), /Foreign key|fkey/);
    });

    it('skills link to categories, profiles, posts and jobs', async () => {
      const carpentry = await db.skill.findUniqueOrThrow({
        where: { slug: 'carpentry' },
        include: { category: true, profiles: true, postTags: true, jobSkills: true },
      });
      expect(carpentry.category?.slug).toBe('build-and-make');
      expect(carpentry.profiles.map((p) => p.profileId)).toContain(SEED_IDS.profile('ada'));
      expect(carpentry.postTags.map((t) => t.postId)).toContain(SEED_IDS.adaShowcase);
      expect(carpentry.jobSkills.map((j) => j.jobId)).toContain(SEED_IDS.bolaJob);
    });
  });
});
