import type { Env } from '../../../config/env.js';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Sends transactional email. Implement this for a real provider, add it to
 * `createEmailProvider`, and select it with EMAIL_PROVIDER.
 */
export interface EmailProvider {
  readonly name: string;
  /** True only for adapters that do not deliver real messages. */
  readonly isDevelopmentOnly: boolean;
  send(message: EmailMessage): Promise<void>;
}

/**
 * DEVELOPMENT ONLY. Does not send email. Prints it (including verification/reset links)
 * to the API console. Refuses to run when NODE_ENV=production.
 */
export class DevConsoleEmailProvider implements EmailProvider {
  readonly name = 'dev-console';
  readonly isDevelopmentOnly = true;

  constructor(nodeEnv: string) {
    if (nodeEnv === 'production') {
      throw new Error('DevConsoleEmailProvider cannot be used in production');
    }
  }

  async send({ to, subject, text }: EmailMessage) {
    console.info(`\n[DEV EMAIL — NOT SENT] to ${to}\nSubject: ${subject}\n${text}\n`);
  }
}

export function createEmailProvider(env: Env): EmailProvider {
  switch (env.EMAIL_PROVIDER) {
    case 'dev':
      return new DevConsoleEmailProvider(env.NODE_ENV);
  }
}
