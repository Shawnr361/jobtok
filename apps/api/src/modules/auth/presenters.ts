import type { AuthUser, OAuthProvider } from '@jobtok/types';
import type { User as DbUser } from '../../generated/prisma/client.js';

type UserWithProviders = DbUser & { oauthAccounts?: { provider: OAuthProvider }[] };

/** Public shape of the signed-in user. Password hashes and internal fields never leave here. */
export function toAuthUser(user: UserWithProviders): AuthUser {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role,
    activeMode: user.activeMode,
    verification: {
      phone: user.isPhoneVerified,
      email: user.isEmailVerified,
      id: user.isIdVerified,
      business: user.isBusinessVerified,
    },
    createdAt: user.createdAt.toISOString(),
    hasPassword: user.passwordHash !== null,
    linkedProviders: (user.oauthAccounts ?? []).map((a) => a.provider),
  };
}

/** +2348031234567 -> +234803*****67 */
export function maskPhone(phone: string): string {
  return phone.length <= 9
    ? phone
    : `${phone.slice(0, 7)}${'*'.repeat(phone.length - 9)}${phone.slice(-2)}`;
}
