import { beforeAll, describe, expect, it } from 'vitest';
import { SEED_IDS } from '../../src/db/seed-data.js';
import { expectDbError, getDb, resetAndSeed } from '../helpers/db.js';

describe('database constraints', () => {
  const db = getDb();

  beforeAll(async () => {
    await resetAndSeed(db);
  });

  describe('users & country configuration', () => {
    it('requires E.164 phone numbers', async () => {
      await expectDbError(
        db.user.create({ data: { phone: '08031234567' } }),
        /users_phone_e164|users_phone_matches_country/,
      );
    });

    it('validates the phone against the country configuration', async () => {
      // Valid E.164 but not a valid Nigerian mobile number.
      await expectDbError(
        db.user.create({ data: { phone: '+2346031234567' } }),
        /users_phone_matches_country/,
      );
      await expect(db.user.create({ data: { phone: '+2348091234567' } })).resolves.toBeTruthy();
    });

    it('only allows sign-up in enabled countries', async () => {
      await expectDbError(
        db.user.create({ data: { phone: '+233241234567', countryCode: 'GH' } }),
        /users_country_enabled/,
      );
    });

    it('rejects unknown countries', async () => {
      await expectDbError(
        db.user.create({ data: { phone: '+2348091234568', countryCode: 'ZZ' } }),
        /Foreign key|fkey/,
      );
    });

    it('stores emails in lowercase only', async () => {
      await expectDbError(
        db.user.create({ data: { phone: '+2348091234569', email: 'Ada@JobTok.test' } }),
        /users_email_format/,
      );
    });

    it('requires a reason when suspending a user', async () => {
      await expectDbError(
        db.user.update({ where: { id: SEED_IDS.user('ada') }, data: { isSuspended: true } }),
        /users_suspension_reason_required/,
      );
    });

    it('enforces username format', async () => {
      const user = await db.user.create({ data: { phone: '+2348091234570' } });
      await expectDbError(
        db.profile.create({ data: { userId: user.id, username: 'Bad Name!' } }),
        /profiles_username_format/,
      );
    });
  });

  describe('posts & media', () => {
    const base = () => ({ userId: SEED_IDS.user('ada'), postType: 'showcase' as const });

    it('caps showcase videos at 60 seconds', async () => {
      await expectDbError(
        db.post.create({ data: { ...base(), videoDurationSeconds: 61 } }),
        /posts_video_duration_range/,
      );
      await expect(
        db.post.create({ data: { ...base(), videoDurationSeconds: 60 } }),
      ).resolves.toBeTruthy();
    });

    it('stores only object-storage URLs, never inline media', async () => {
      await expectDbError(
        db.post.create({ data: { ...base(), videoUrl: 'data:video/mp4;base64,AAAA' } }),
        /posts_video_url_format/,
      );
    });

    it('does not allow negative flag counts', async () => {
      await expectDbError(
        db.post.create({ data: { ...base(), flagCount: -1 } }),
        /posts_flag_count_non_negative/,
      );
    });
  });

  describe('jobs', () => {
    const base = () => ({
      employerId: SEED_IDS.employer('bola'),
      title: 'Painter',
      description: 'Interior painting.',
      employmentType: 'gig' as const,
    });

    it('requires salary_min <= salary_max', async () => {
      await expectDbError(
        db.job.create({ data: { ...base(), salaryMin: 200000, salaryMax: 100000 } }),
        /jobs_salary_range/,
      );
    });

    it('requires at least one opening and a valid currency code', async () => {
      await expectDbError(
        db.job.create({ data: { ...base(), openings: 0 } }),
        /jobs_openings_positive/,
      );
      await expectDbError(
        db.job.create({ data: { ...base(), salaryCurrency: 'ngn' } }),
        /jobs_salary_currency_format/,
      );
    });

    it('links one job to at most one video post', async () => {
      await expectDbError(
        db.job.create({ data: { ...base(), postId: SEED_IDS.bolaJobPost } }),
        /Unique constraint|post_id/,
      );
    });
  });

  describe('messaging', () => {
    it('stores conversation participants in canonical order (one conversation per pair)', async () => {
      const [a, b] = [SEED_IDS.user('ada'), SEED_IDS.user('bola')].sort() as [string, string];
      await expectDbError(
        db.conversation.create({ data: { participantOne: b, participantTwo: a } }),
        /conversations_participants_ordered/,
      );
      await expectDbError(
        db.conversation.create({ data: { participantOne: a, participantTwo: b } }),
        /Unique constraint|participant/,
      );
    });

    it('only participants can send messages', async () => {
      await expectDbError(
        db.message.create({
          data: {
            conversationId: SEED_IDS.adaBolaConversation,
            senderId: SEED_IDS.user('chidi'),
            content: 'Hello',
          },
        }),
        /messages_sender_is_participant/,
      );
    });

    it('rejects empty messages', async () => {
      await expectDbError(
        db.message.create({
          data: {
            conversationId: SEED_IDS.adaBolaConversation,
            senderId: SEED_IDS.user('ada'),
            content: '   ',
          },
        }),
        /messages_has_payload/,
      );
    });

    it('updates the conversation last_message_at on new messages', async () => {
      const msg = await db.message.create({
        data: {
          conversationId: SEED_IDS.adaBolaConversation,
          senderId: SEED_IDS.user('ada'),
          content: 'When can I start?',
        },
      });
      const convo = await db.conversation.findUniqueOrThrow({
        where: { id: SEED_IDS.adaBolaConversation },
      });
      expect(convo.lastMessageAt?.getTime()).toBe(msg.createdAt.getTime());
    });

    it('requires read_at when a message is marked read', async () => {
      const [msg] = await db.message.findMany({ take: 1 });
      await expectDbError(
        db.message.update({ where: { id: msg!.id }, data: { isRead: true } }),
        /messages_read_at_consistent/,
      );
    });
  });

  describe('interactions & moderation', () => {
    it('users cannot follow themselves', async () => {
      const id = SEED_IDS.user('ada');
      await expectDbError(
        db.follow.create({ data: { followerId: id, followingId: id } }),
        /follows_not_self/,
      );
    });

    it('a user can report the same entity only once', async () => {
      const data = {
        reporterId: SEED_IDS.user('chidi'),
        reportedEntityType: 'job' as const,
        reportedEntityId: SEED_IDS.bolaJob,
        reason: 'suspected_scam',
      };
      await db.report.create({ data });
      await expectDbError(db.report.create({ data }), /Unique constraint|reporter_id/);
    });

    it('reports need a reason', async () => {
      await expectDbError(
        db.report.create({
          data: {
            reporterId: SEED_IDS.user('ada'),
            reportedEntityType: 'post',
            reportedEntityId: SEED_IDS.bolaJobPost,
            reason: ' ',
          },
        }),
        /reports_reason_not_blank/,
      );
    });
  });
});
