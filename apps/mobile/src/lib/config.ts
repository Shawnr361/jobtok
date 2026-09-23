// Public (non-secret) build-time configuration. EXPO_PUBLIC_* values are bundled into the app.

/**
 * API origin. On an Android emulator use http://10.0.2.2:4000; on a physical phone use
 * your computer's LAN address, e.g. http://192.168.1.20:4000.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Google OAuth client IDs (public identifiers, not secrets). */
export const GOOGLE_CLIENT_IDS = {
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
};

export const GOOGLE_CONFIGURED = Boolean(
  GOOGLE_CLIENT_IDS.web || GOOGLE_CLIENT_IDS.ios || GOOGLE_CLIENT_IDS.android,
);

/**
 * DEVELOPMENT ONLY: shows a fake "Google" sign-in that sends `dev-google:` tokens. Works only
 * when the API also runs with AUTH_DEV_GOOGLE=true (never in production).
 */
export const DEV_GOOGLE = __DEV__ && process.env.EXPO_PUBLIC_AUTH_DEV_GOOGLE === 'true';
