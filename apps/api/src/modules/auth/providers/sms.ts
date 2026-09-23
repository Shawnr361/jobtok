import type { Env } from '../../../config/env.js';

/**
 * Sends SMS messages. Implement this for a real provider (e.g. Termii or Twilio, per the
 * spec), add it to `createSmsProvider`, and select it with SMS_PROVIDER.
 */
export interface SmsProvider {
  readonly name: string;
  /** True only for adapters that do not deliver real messages. */
  readonly isDevelopmentOnly: boolean;
  send(to: string, message: string): Promise<void>;
}

/**
 * DEVELOPMENT ONLY. Does not send SMS. Prints the message to the API console so a
 * developer can complete OTP sign-in locally. Refuses to run when NODE_ENV=production.
 */
export class DevConsoleSmsProvider implements SmsProvider {
  readonly name = 'dev-console';
  readonly isDevelopmentOnly = true;

  constructor(private readonly nodeEnv: string) {
    if (nodeEnv === 'production') {
      throw new Error('DevConsoleSmsProvider cannot be used in production');
    }
  }

  async send(to: string, message: string) {
    // Local terminal only; this adapter can never be constructed in production.
    console.info(`\n[DEV SMS — NOT SENT] to ${to}: ${message}\n`);
  }
}

export function createSmsProvider(env: Env): SmsProvider {
  switch (env.SMS_PROVIDER) {
    case 'dev':
      return new DevConsoleSmsProvider(env.NODE_ENV);
  }
}
