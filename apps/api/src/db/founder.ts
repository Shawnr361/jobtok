import { normalizePhoneNumber } from '@jobtok/types';
import type { Db } from './client.js';

/** The founder's public identity. @kenny is reserved, so only this command can assign it. */
export const FOUNDER = {
  username: 'kenny',
  fullName: 'Kehinde Adeeyo',
  firstName: 'Kehinde',
  lastName: 'Adeeyo',
} as const;

export interface FounderResult {
  userId: string;
  username: string;
  fullName: string;
  /** 1 means no account was registered before this one. */
  registrationRank: number;
  accountsBefore: number;
}

export class FounderError extends Error {}

/**
 * Makes an existing account the JobTok founder: admin role, @kenny, Kehinde Adeeyo.
 * The account must already exist (signed in once), so its phone was proven by OTP.
 * Safe to run again. Refuses if @kenny already belongs to someone else.
 */
export async function assignFounder(
  db: Db,
  who: { phone?: string; email?: string },
): Promise<FounderResult> {
  let where: { phone: string } | { email: string };
  if (who.phone) {
    // Full international numbers are used as typed; local ones (0803…) are read as Nigerian.
    const typed = who.phone.trim().replace(/[\s().-]/g, '');
    const ng = await db.country.findUnique({ where: { code: 'NG' } });
    const phone = /^\+[1-9]\d{7,14}$/.test(typed)
      ? typed
      : ng &&
        normalizePhoneNumber(typed, {
          dialCode: ng.dialCode,
          nationalNumberPattern: new RegExp(ng.phonePattern),
        });
    if (!phone) throw new FounderError(`"${who.phone}" doesn't look like a valid phone number.`);
    where = { phone };
  } else if (who.email) {
    where = { email: who.email.trim().toLowerCase() };
  } else {
    throw new FounderError('Give the phone number or email of the account.');
  }

  const user = await db.user.findUnique({ where, select: { id: true, createdAt: true } });
  if (!user) {
    throw new FounderError(
      'No account uses that yet. Sign in on the app with it first, then run this again.',
    );
  }

  const holder = await db.profile.findUnique({
    where: { username: FOUNDER.username },
    select: { userId: true },
  });
  if (holder && holder.userId !== user.id) {
    throw new FounderError(`@${FOUNDER.username} already belongs to another account.`);
  }

  const names = {
    username: FOUNDER.username,
    fullName: FOUNDER.fullName,
    firstName: FOUNDER.firstName,
    lastName: FOUNDER.lastName,
  };
  await db.$transaction(async (tx) => {
    const me = await tx.user.update({
      where: { id: user.id },
      data: { role: 'admin' },
      select: { countryCode: true },
    });
    await tx.profile.upsert({
      where: { userId: user.id },
      update: names,
      create: { userId: user.id, locationCountry: me.countryCode, ...names },
    });
  });

  const accountsBefore = await db.user.count({ where: { createdAt: { lt: user.createdAt } } });
  return {
    userId: user.id,
    username: FOUNDER.username,
    fullName: FOUNDER.fullName,
    registrationRank: accountsBefore + 1,
    accountsBefore,
  };
}
