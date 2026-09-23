import type { AuthTokenPurpose } from '../../generated/prisma/client.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { Db } from '../../db/client.js';
import { HttpError } from '../../lib/http.js';
import type { AuthDeps } from './auth.config.js';
import {
  burnPasswordCheck,
  generateToken,
  hashPassword,
  sha256,
  verifyPassword,
} from './crypto.js';
import { OtpService } from './otp.service.js';
import {
  GoogleNotConfiguredError,
  InvalidGoogleTokenError,
  type GoogleIdentity,
} from './providers/google.js';
import { SessionService } from './session.service.js';

export interface SignInResult {
  userId: string;
  isNewUser: boolean;
}

const HOUR_MS = 60 * 60 * 1000;

/**
 * One response for every failed password sign-in (unknown email, wrong password, email not
 * yet verified), so login cannot be used to discover accounts.
 */
const invalidCredentials = () =>
  new HttpError(
    401,
    'invalid_credentials',
    'Email or password is incorrect, or the email address has not been verified yet',
  );
const suspended = () => new HttpError(403, 'account_suspended', 'This account is suspended');
const invalidLink = () =>
  new HttpError(400, 'invalid_or_expired_token', 'This link is invalid or has expired');

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

/**
 * Identity rules for the unified JobTok account: one User, several ways to sign in
 * (phone, email + password, Google). Methods attach to the same User instead of creating
 * duplicates whenever ownership is proven.
 */
export class AuthService {
  readonly otp: OtpService;
  readonly sessions: SessionService;

  constructor(
    private readonly db: Db,
    private readonly deps: AuthDeps,
  ) {
    this.otp = new OtpService(db, deps);
    this.sessions = new SessionService(db, deps);
  }

  loadUser(userId: string) {
    return this.db.user.findUniqueOrThrow({
      where: { id: userId },
      include: { oauthAccounts: { select: { provider: true } } },
    });
  }

  // ─── Email + password ─────────────────────────────────────────────────────

  /**
   * Enumeration-safe registration: the caller gets the same result whether or not the email
   * is already registered, and no session is issued. A new account must verify its email
   * before password sign-in works. The owner of an existing account is emailed instead.
   * (Both paths hash the password first, so timing is comparable.)
   */
  async registerWithEmail(emailInput: string, password: string): Promise<void> {
    const email = normalizeEmail(emailInput);
    const passwordHash = await hashPassword(password);
    let userId: string;
    try {
      userId = (await this.db.user.create({ data: { email, passwordHash } })).id;
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      await this.notifyExistingAccount(email).catch((e: Error) =>
        console.error(`[auth] account notice via ${this.deps.email.name} failed:`, e.message),
      );
      return;
    }
    await this.sendEmailVerification(userId).catch((err: Error) =>
      console.error(`[auth] verification email via ${this.deps.email.name} failed:`, err.message),
    );
  }

  /**
   * Told to the real owner of an address someone tried to register again. Points to password
   * reset (which proves email ownership) rather than verifying the existing account, because
   * that account's password may have been set by someone else.
   */
  private async notifyExistingAccount(email: string) {
    await this.deps.email.send({
      to: email,
      subject: 'You already have a JobTok account',
      text:
        'Someone tried to create a JobTok account with this email address, but one already exists.\n' +
        `If this was you, sign in, or reset your password here: ${new URL('/forgot-password', this.deps.config.appWebUrl).toString()}\n` +
        "If it wasn't you, you can ignore this email.",
    });
  }

  async loginWithEmail(emailInput: string, password: string): Promise<SignInResult> {
    const user = await this.db.user.findUnique({ where: { email: normalizeEmail(emailInput) } });
    if (!user?.passwordHash) {
      await burnPasswordCheck(password); // same timing as a wrong password
      throw invalidCredentials();
    }
    if (!(await verifyPassword(user.passwordHash, password))) throw invalidCredentials();
    // An unverified email may have been registered by someone who doesn't own it, and letting
    // it sign in would reveal (to whoever just registered it) whether the address was new.
    if (!user.isEmailVerified) throw invalidCredentials();
    if (user.isSuspended) throw suspended();
    return { userId: user.id, isNewUser: false };
  }

  // ─── Phone OTP ────────────────────────────────────────────────────────────

  /** Signs in with a verified phone; creates the account on first use. */
  async signInWithPhone(phone: string): Promise<SignInResult> {
    const existing = await this.db.user.findUnique({ where: { phone } });
    if (existing) {
      if (existing.isSuspended) throw suspended();
      return { userId: existing.id, isNewUser: false };
    }
    try {
      const user = await this.db.user.create({ data: { phone, isPhoneVerified: true } });
      return { userId: user.id, isNewUser: true };
    } catch (err) {
      // Two verifications for the same new number raced; the other one created the user.
      if (isUniqueViolation(err)) {
        const user = await this.db.user.findUniqueOrThrow({ where: { phone } });
        return { userId: user.id, isNewUser: false };
      }
      throw err;
    }
  }

  /** Attaches a verified phone to the signed-in user (email/Google accounts). */
  async attachVerifiedPhone(userId: string, phone: string) {
    const owner = await this.db.user.findUnique({ where: { phone } });
    if (owner && owner.id !== userId) {
      throw new HttpError(
        409,
        'phone_in_use',
        'This number is already linked to another JobTok account. Sign in with it instead.',
      );
    }
    try {
      await this.db.user.update({ where: { id: userId }, data: { phone, isPhoneVerified: true } });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new HttpError(
          409,
          'phone_in_use',
          'This number is already linked to another JobTok account.',
        );
      }
      throw err;
    }
  }

  // ─── Google ───────────────────────────────────────────────────────────────

  private async verifyGoogle(idToken: string): Promise<GoogleIdentity> {
    try {
      return await this.deps.google.verify(idToken);
    } catch (err) {
      if (err instanceof GoogleNotConfiguredError) {
        throw new HttpError(503, 'google_not_configured', 'Google sign-in is not available yet');
      }
      if (err instanceof InvalidGoogleTokenError) {
        throw new HttpError(401, 'invalid_google_token', 'Google sign-in could not be verified');
      }
      throw err;
    }
  }

  /**
   * Google sign-in / linking. Order of precedence:
   * 1. Signed-in user: link Google to them (if this Google account isn't someone else's).
   * 2. Google account already linked: sign in as that user.
   * 3. Verified Google email matches a user whose email is also verified: link + sign in.
   *    If the matching user's email is NOT verified we refuse, because linking would hand
   *    an account (possibly created by someone else with this email) to the Google user.
   * 4. Otherwise: create a new user.
   */
  async signInWithGoogle(idToken: string, currentUserId: string | null): Promise<SignInResult> {
    const identity = await this.verifyGoogle(idToken);
    const now = this.deps.clock.now();
    const linked = await this.db.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: { provider: 'google', providerAccountId: identity.subject },
      },
      include: { user: true },
    });

    if (currentUserId) {
      if (linked && linked.userId !== currentUserId) {
        throw new HttpError(
          409,
          'google_account_in_use',
          'This Google account is linked to another JobTok account',
        );
      }
      if (!linked) {
        const existing = await this.db.oAuthAccount.findUnique({
          where: { userId_provider: { userId: currentUserId, provider: 'google' } },
        });
        if (existing) {
          throw new HttpError(
            409,
            'google_already_linked',
            'A different Google account is already linked',
          );
        }
        await this.db.oAuthAccount.create({
          data: {
            userId: currentUserId,
            provider: 'google',
            providerAccountId: identity.subject,
            email: identity.email,
            emailVerified: identity.emailVerified,
          },
        });
      }
      return { userId: currentUserId, isNewUser: false };
    }

    if (linked) {
      if (linked.user.isSuspended) throw suspended();
      await this.db.oAuthAccount.update({ where: { id: linked.id }, data: { lastUsedAt: now } });
      return { userId: linked.userId, isNewUser: false };
    }

    if (identity.email && identity.emailVerified) {
      const byEmail = await this.db.user.findUnique({ where: { email: identity.email } });
      if (byEmail) {
        if (!byEmail.isEmailVerified) {
          throw new HttpError(
            409,
            'account_link_requires_sign_in',
            'An account with this email already exists. Sign in with your password or phone, then link Google.',
          );
        }
        if (byEmail.isSuspended) throw suspended();
        await this.db.oAuthAccount.create({
          data: {
            userId: byEmail.id,
            provider: 'google',
            providerAccountId: identity.subject,
            email: identity.email,
            emailVerified: true,
          },
        });
        return { userId: byEmail.id, isNewUser: false };
      }
    }

    if (!identity.email || !identity.emailVerified) {
      // A new account needs at least one verified identifier we can store.
      throw new HttpError(
        400,
        'google_email_unverified',
        'Your Google account has no verified email',
      );
    }
    const user = await this.db.user.create({
      data: {
        email: identity.email,
        isEmailVerified: true,
        oauthAccounts: {
          create: {
            provider: 'google',
            providerAccountId: identity.subject,
            email: identity.email,
            emailVerified: true,
          },
        },
      },
    });
    return { userId: user.id, isNewUser: true };
  }

  // ─── Email verification & password reset ──────────────────────────────────

  private async issueToken(
    userId: string,
    email: string,
    purpose: AuthTokenPurpose,
    ttlMs: number,
  ) {
    const token = generateToken();
    const now = this.deps.clock.now();
    await this.db.$transaction([
      // Only the latest link of each kind works.
      this.db.authToken.updateMany({
        where: { userId, purpose, consumedAt: null },
        data: { consumedAt: now },
      }),
      this.db.authToken.create({
        data: {
          userId,
          email,
          purpose,
          tokenHash: sha256(token),
          expiresAt: new Date(now.getTime() + ttlMs),
          createdAt: now,
        },
      }),
    ]);
    return token;
  }

  private link(path: string, token: string) {
    const url = new URL(path, this.deps.config.appWebUrl);
    url.searchParams.set('token', token);
    return url.toString();
  }

  async sendEmailVerification(userId: string) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.email || user.isEmailVerified) return;
    const token = await this.issueToken(
      user.id,
      user.email,
      'email_verification',
      this.deps.config.emailVerificationTtlHours * HOUR_MS,
    );
    await this.deps.email.send({
      to: user.email,
      subject: 'Verify your JobTok email',
      text: `Confirm your email address: ${this.link('/verify-email', token)}\nThis link expires in ${this.deps.config.emailVerificationTtlHours} hours. If you did not create a JobTok account, ignore this email.`,
    });
  }

  /** Unauthenticated resend. Always succeeds from the caller's point of view. */
  async resendEmailVerification(emailInput: string) {
    const user = await this.db.user.findUnique({ where: { email: normalizeEmail(emailInput) } });
    if (!user || user.isEmailVerified || user.isSuspended) return;
    await this.sendEmailVerification(user.id);
  }

  private async consumeToken(token: string, purpose: AuthTokenPurpose) {
    const now = this.deps.clock.now();
    const record = await this.db.authToken.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: true },
    });
    if (!record || record.purpose !== purpose || record.consumedAt || record.expiresAt <= now) {
      throw invalidLink();
    }
    const { count } = await this.db.authToken.updateMany({
      where: { id: record.id, consumedAt: null },
      data: { consumedAt: now },
    });
    if (count !== 1) throw invalidLink();
    return record;
  }

  async verifyEmail(token: string) {
    const record = await this.consumeToken(token, 'email_verification');
    // The link is only valid for the address it was sent to.
    if (record.user.email !== record.email) throw invalidLink();
    await this.db.user.update({ where: { id: record.userId }, data: { isEmailVerified: true } });
    return record.userId;
  }

  /** Always succeeds from the caller's point of view (no account discovery). */
  async requestPasswordReset(emailInput: string) {
    const email = normalizeEmail(emailInput);
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user || user.isSuspended) return;
    const token = await this.issueToken(
      user.id,
      email,
      'password_reset',
      this.deps.config.passwordResetTtlMinutes * 60_000,
    );
    await this.deps.email.send({
      to: email,
      subject: 'Reset your JobTok password',
      text: `Reset your password: ${this.link('/reset-password', token)}\nThis link expires in ${this.deps.config.passwordResetTtlMinutes} minutes. If you didn't ask for this, ignore this email.`,
    });
  }

  async resetPassword(token: string, newPassword: string) {
    const record = await this.consumeToken(token, 'password_reset');
    if (record.user.email !== record.email) throw invalidLink();
    await this.db.user.update({
      where: { id: record.userId },
      // Completing a reset proves control of the email address.
      data: { passwordHash: await hashPassword(newPassword), isEmailVerified: true },
    });
    // Sign out everywhere: whoever knew the old password loses access.
    await this.sessions.revokeAllForUser(record.userId, 'password_reset');
  }
}
