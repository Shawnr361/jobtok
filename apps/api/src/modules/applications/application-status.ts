import { canTransitionApplication, type ApplicationStatus } from '@jobtok/types';
import type { Db } from '../../db/client.js';
import { HttpError } from '../../lib/http.js';

/**
 * Moves an application to a new status on behalf of `actorId`.
 * The check here gives a clean 409; the database trigger enforces the same rules and
 * records the change (with actor) in application_status_history.
 */
export async function transitionApplication(
  db: Db,
  applicationId: string,
  to: ApplicationStatus,
  actorId: string,
) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('jobtok.actor_id', ${actorId}, true)`;
    const [current] = await tx.$queryRaw<{ status: ApplicationStatus }[]>`
      SELECT status FROM applications WHERE id = ${applicationId}::uuid FOR UPDATE`;
    if (!current) {
      throw new HttpError(404, 'application_not_found', "We couldn't find that application.");
    }
    if (!canTransitionApplication(current.status, to)) {
      throw new HttpError(
        409,
        'invalid_status_transition',
        `This application can't move from ${current.status} to ${to}.`,
      );
    }
    return tx.application.update({ where: { id: applicationId }, data: { status: to } });
  });
}
