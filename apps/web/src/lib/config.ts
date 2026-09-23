// Public (non-secret) configuration. NEXT_PUBLIC_* values are bundled into the browser build.

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Google OAuth web client ID (a public identifier, not a secret). */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

/**
 * DEVELOPMENT ONLY: a fake "Google" button sending `dev-google:` tokens. Works only when the
 * API runs with AUTH_DEV_GOOGLE=true, which the API refuses in production.
 */
export const DEV_GOOGLE =
  process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_AUTH_DEV_GOOGLE === 'true';
