import { normalizePhoneNumber, type OtpPurpose } from '@jobtok/types';
import type { Db } from '../../db/client.js';
import { HttpError } from '../../lib/http.js';
import type { AuthDeps } from './auth.config.js';
import { generateOtp, hashOtp, safeEqualHex } from './crypto.js';

const HOUR_MS = 60 * 60 * 1000;

/** Generic message: never reveals whether a code existed, expired or was wrong. */
const invalidCode = (details?: unknown) =>
  new HttpError(400, 'otp_invalid', 'The code is invalid or has expired', details);

export class OtpService {
  constructor(
    private readonly db: Db,
    private readonly deps: AuthDeps,
  ) {}

  /**
   * Normalises a phone number with the country's configuration from the `countries`
   * table (Step 2), e.g. 0803 123 4567 -> +2348031234567. Only enabled countries.
   */
  async normalizePhone(input: string, countryCode = 'NG'): Promise<string> {
    const country = await this.db.country.findUnique({
      where: { code: countryCode.toUpperCase() },
    });
    if (!country?.isEnabled) {
      throw new HttpError(
        400,
        'country_not_supported',
        'Phone sign-in is not available in this country yet',
      );
    }
    const phone = normalizePhoneNumber(input, {
      dialCode: country.dialCode,
      nationalNumberPattern: new RegExp(country.phonePattern),
    });
    if (!phone) throw new HttpError(400, 'invalid_phone', 'Enter a valid phone number');
    return phone;
  }

  private scope(phone: string, purpose: OtpPurpose, userId: string | null) {
    return `${purpose}:${phone}:${userId ?? '-'}`;
  }

  async send(params: {
    phone: string;
    purpose: OtpPurpose;
    userId: string | null;
    ip?: string | undefined;
  }) {
    const { phone, purpose, userId } = params;
    const { otp } = this.deps.config;
    const now = this.deps.clock.now();

    const latest = await this.db.otpChallenge.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });
    if (latest) {
      const retryAt = latest.createdAt.getTime() + otp.resendCooldownSeconds * 1000;
      if (retryAt > now.getTime()) {
        const retryAfterSeconds = Math.ceil((retryAt - now.getTime()) / 1000);
        throw new HttpError(429, 'otp_cooldown', 'Please wait before requesting another code', {
          retryAfterSeconds,
        });
      }
    }
    const sentLastHour = await this.db.otpChallenge.count({
      where: { phone, createdAt: { gt: new Date(now.getTime() - HOUR_MS) } },
    });
    if (sentLastHour >= otp.maxPerPhonePerHour) {
      throw new HttpError(
        429,
        'otp_limit',
        'Too many codes requested for this number. Try again later.',
      );
    }

    const code = generateOtp();
    const expiresAt = new Date(now.getTime() + otp.ttlSeconds * 1000);
    await this.db.$transaction([
      // Only the newest code for a phone can be used.
      this.db.otpChallenge.updateMany({
        where: { phone, consumedAt: null, supersededAt: null },
        data: { supersededAt: now },
      }),
      this.db.otpChallenge.create({
        data: {
          phone,
          purpose,
          userId,
          codeHash: hashOtp(this.deps.config.hashSecret, this.scope(phone, purpose, userId), code),
          maxAttempts: otp.maxAttempts,
          expiresAt,
          requestedIp: params.ip?.slice(0, 64) ?? null,
          createdAt: now,
        },
      }),
    ]);

    try {
      await this.deps.sms.send(
        phone,
        `Your JobTok code is ${code}. It expires in ${Math.round(otp.ttlSeconds / 60)} minutes. Never share this code.`,
      );
    } catch (err) {
      // Log the provider failure, never the code.
      console.error(
        `[auth] SMS delivery via ${this.deps.sms.name} failed:`,
        (err as Error).message,
      );
      throw new HttpError(
        502,
        'otp_delivery_failed',
        'We could not send the code. Please try again.',
      );
    }
    return { expiresInSeconds: otp.ttlSeconds, resendAfterSeconds: otp.resendCooldownSeconds };
  }

  /** Checks a code. Consumes it on success; counts the attempt on failure. */
  async verify(params: {
    phone: string;
    code: string;
    purpose: OtpPurpose;
    userId: string | null;
  }) {
    const { phone, code, purpose, userId } = params;
    const now = this.deps.clock.now();

    const challenge = await this.db.otpChallenge.findFirst({
      where: { phone, purpose, userId, consumedAt: null, supersededAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!challenge || challenge.expiresAt <= now) throw invalidCode();
    if (challenge.attempts >= challenge.maxAttempts) {
      throw new HttpError(
        429,
        'otp_attempts_exceeded',
        'Too many incorrect attempts. Request a new code.',
      );
    }

    // Count the attempt atomically before comparing, so parallel guesses can't exceed the limit.
    const { count } = await this.db.otpChallenge.updateMany({
      where: { id: challenge.id, attempts: { lt: challenge.maxAttempts }, consumedAt: null },
      data: { attempts: { increment: 1 } },
    });
    if (count !== 1) {
      throw new HttpError(
        429,
        'otp_attempts_exceeded',
        'Too many incorrect attempts. Request a new code.',
      );
    }

    const expected = hashOtp(this.deps.config.hashSecret, this.scope(phone, purpose, userId), code);
    if (!safeEqualHex(expected, challenge.codeHash)) {
      const remaining = challenge.maxAttempts - challenge.attempts - 1;
      if (remaining <= 0) {
        throw new HttpError(
          429,
          'otp_attempts_exceeded',
          'Too many incorrect attempts. Request a new code.',
        );
      }
      throw invalidCode({ attemptsRemaining: remaining });
    }

    const consumed = await this.db.otpChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) throw invalidCode();
  }
}
