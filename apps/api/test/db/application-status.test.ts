import {
  APPLICATION_STATUSES,
  canTransitionApplication,
  type ApplicationStatus,
} from '@jobtok/types';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { transitionApplication } from '../../src/modules/applications/application-status.js';
import { HttpError } from '../../src/lib/http.js';
import { SEED_IDS } from '../../src/db/seed-data.js';
import { expectDbError, getDb, resetAndSeed } from '../helpers/db.js';

const PIPELINE: ApplicationStatus[] = [
  'applied',
  'reviewing',
  'shortlisted',
  'interview',
  'offer',
  'hired',
];

/** Status path from `applied` to `target` using only valid single steps. */
function pathTo(target: ApplicationStatus): ApplicationStatus[] {
  if (target === 'rejected') return ['rejected'];
  return PIPELINE.slice(1, PIPELINE.indexOf(target) + 1);
}

describe('application status state machine', () => {
  const db = getDb();
  const appId = SEED_IDS.adaApplication;
  const employer = SEED_IDS.user('bola');

  async function freshApplicationAt(status: ApplicationStatus) {
    await db.application.deleteMany({ where: { id: appId } });
    await db.application.create({
      data: { id: appId, jobId: SEED_IDS.bolaJob, applicantId: SEED_IDS.profile('ada') },
    });
    for (const step of pathTo(status)) {
      await db.$executeRaw`UPDATE applications SET status = ${step}::application_status WHERE id = ${appId}::uuid`;
    }
  }

  beforeAll(async () => {
    await resetAndSeed(db);
  });

  describe('database trigger matches the spec table for every status pair', () => {
    const pairs = APPLICATION_STATUSES.flatMap((from) =>
      APPLICATION_STATUSES.filter((to) => to !== from).map((to) => [from, to] as const),
    );

    it.each(pairs)('%s → %s', async (from, to) => {
      await freshApplicationAt(from);
      const attempt = db.application.update({ where: { id: appId }, data: { status: to } });
      if (canTransitionApplication(from, to)) {
        await expect(attempt).resolves.toMatchObject({ status: to });
      } else {
        await expectDbError(attempt, /applications_status_transition|Invalid application status/);
      }
    });
  });

  describe('transitionApplication service', () => {
    beforeEach(async () => {
      await freshApplicationAt('applied');
    });

    it('walks the full pipeline to HIRED and records every step with the actor', async () => {
      for (const to of PIPELINE.slice(1)) {
        const updated = await transitionApplication(db, appId, to, employer);
        expect(updated.status).toBe(to);
      }
      const history = await db.applicationStatusHistory.findMany({
        where: { applicationId: appId },
        orderBy: { createdAt: 'asc' },
      });
      expect(history.map((h) => h.newStatus)).toEqual(PIPELINE);
      expect(history.slice(1).every((h) => h.changedBy === employer)).toBe(true);
      expect(history[0]!.changedBy).toBe(SEED_IDS.user('ada'));
    });

    it('rejects skipping a stage with a 409 and leaves the status unchanged', async () => {
      const err = await transitionApplication(db, appId, 'offer', employer).catch((e) => e);
      expect(err).toBeInstanceOf(HttpError);
      expect(err).toMatchObject({ status: 409, code: 'invalid_status_transition' });
      const app = await db.application.findUniqueOrThrow({ where: { id: appId } });
      expect(app.status).toBe('applied');
    });

    it('treats HIRED and REJECTED as final', async () => {
      await transitionApplication(db, appId, 'rejected', employer);
      const err = await transitionApplication(db, appId, 'reviewing', employer).catch((e) => e);
      expect(err).toMatchObject({ status: 409 });
    });

    it('returns 404 for a missing application', async () => {
      const err = await transitionApplication(
        db,
        '00000000-0000-4000-8000-000000000000',
        'reviewing',
        employer,
      ).catch((e) => e);
      expect(err).toMatchObject({ status: 404, code: 'application_not_found' });
    });

    it('does not write history when the status does not change', async () => {
      await db.application.update({ where: { id: appId }, data: { coverMessage: 'Updated note' } });
      expect(await db.applicationStatusHistory.count({ where: { applicationId: appId } })).toBe(1);
    });
  });

  describe('application creation rules', () => {
    beforeEach(async () => {
      await db.application.deleteMany({ where: { jobId: SEED_IDS.bolaJob } });
      await db.job.update({
        where: { id: SEED_IDS.bolaJob },
        data: { isActive: true, applicationDeadline: null },
      });
    });

    it('new applications must start as APPLIED', async () => {
      await expectDbError(
        db.application.create({
          data: {
            jobId: SEED_IDS.bolaJob,
            applicantId: SEED_IDS.profile('ada'),
            status: 'shortlisted',
          },
        }),
        /applications_initial_status/,
      );
    });

    it('a candidate can apply to a job only once', async () => {
      const data = { jobId: SEED_IDS.bolaJob, applicantId: SEED_IDS.profile('ada') };
      await db.application.create({ data });
      await expectDbError(db.application.create({ data }), /Unique constraint|job_id/);
    });

    it('inactive jobs and passed deadlines do not accept applications', async () => {
      const data = { jobId: SEED_IDS.bolaJob, applicantId: SEED_IDS.profile('ada') };
      await db.job.update({ where: { id: SEED_IDS.bolaJob }, data: { isActive: false } });
      await expectDbError(db.application.create({ data }), /applications_job_active/);
      await db.job.update({
        where: { id: SEED_IDS.bolaJob },
        data: { isActive: true, applicationDeadline: new Date('2020-01-01') },
      });
      await expectDbError(db.application.create({ data }), /applications_job_deadline/);
      await db.job.update({
        where: { id: SEED_IDS.bolaJob },
        data: { applicationDeadline: null },
      });
    });

    it('users cannot apply to their own job', async () => {
      const chidiJob = await db.job.create({
        data: {
          employerId: SEED_IDS.employer('chidi'),
          title: 'Logo refresh',
          description: 'Refresh a small brand logo.',
          employmentType: 'freelance',
        },
      });
      await expectDbError(
        db.application.create({
          data: { jobId: chidiJob.id, applicantId: SEED_IDS.profile('chidi') },
        }),
        /applications_not_own_job/,
      );
    });

    it('attached posts and portfolio items must belong to the applicant', async () => {
      await expectDbError(
        db.application.create({
          data: {
            jobId: SEED_IDS.bolaJob,
            applicantId: SEED_IDS.profile('chidi'),
            attachedPostIds: [SEED_IDS.adaShowcase],
          },
        }),
        /applications_posts_owner/,
      );
      await expectDbError(
        db.application.create({
          data: {
            jobId: SEED_IDS.bolaJob,
            applicantId: SEED_IDS.profile('chidi'),
            attachedPortfolioId: SEED_IDS.adaPortfolio,
          },
        }),
        /applications_portfolio_owner/,
      );
    });

    it('the job and applicant of an application cannot be changed', async () => {
      await db.application.create({
        data: { id: appId, jobId: SEED_IDS.bolaJob, applicantId: SEED_IDS.profile('ada') },
      });
      await expectDbError(
        db.application.update({
          where: { id: appId },
          data: { applicantId: SEED_IDS.profile('chidi') },
        }),
        /applications_immutable_parties/,
      );
    });
  });
});
