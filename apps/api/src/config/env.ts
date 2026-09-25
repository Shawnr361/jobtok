import { z } from 'zod';

const csv = (fallback: string) =>
  z
    .string()
    .default(fallback)
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );

const bool = (fallback: boolean) =>
  z
    .enum(['true', 'false', '1', '0'])
    .default(fallback ? 'true' : 'false')
    .transform((v) => v === 'true' || v === '1');

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: csv('http://localhost:3000,http://localhost:8081'),
  /** Number of proxy hops to trust for req.ip (e.g. 1 behind a load balancer). */
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),

  // ─── Auth ────────────────────────────────────────────────────────────────
  /** HMAC key for access JWTs (HS256). At least 32 characters. */
  JWT_ACCESS_SECRET: z.string().min(32).optional(),
  /** HMAC key for hashing OTP codes. At least 32 characters. */
  AUTH_HASH_SECRET: z.string().min(32).optional(),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(180).default(30),
  /** Public web app URL used in email links (verify email, reset password). */
  APP_WEB_URL: z.url().default('http://localhost:3000'),
  /** `dev` prints messages to the API console instead of sending them. Never in production. */
  SMS_PROVIDER: z.enum(['dev']).default('dev'),
  EMAIL_PROVIDER: z.enum(['dev']).default('dev'),
  /** OAuth client IDs whose Google ID tokens are accepted (web, iOS, Android). */
  GOOGLE_CLIENT_IDS: csv(''),
  /** Accept fake "dev-google:" tokens. Development only; refused in production. */
  AUTH_DEV_GOOGLE: bool(false),

  // ─── Videos ──────────────────────────────────────────────────────────────
  /**
   * Where uploaded videos are stored. `local` = DEVELOPMENT ONLY (files on this machine's disk,
   * served by the API); refused in production. Unset in production = uploads disabled until a
   * real object-storage adapter is added.
   */
  VIDEO_STORAGE: z.enum(['local']).optional(),
  VIDEO_STORAGE_DIR: z.string().default('.media'),
  /** Largest accepted upload. Spec: 60-second videos, 720p. */
  VIDEO_MAX_BYTES: z.coerce
    .number()
    .int()
    .min(1_000_000)
    .max(1_000_000_000)
    .default(100 * 1024 * 1024),
  /** HMAC key for signed, expiring media URLs. At least 32 characters. */
  MEDIA_SIGNING_SECRET: z.string().min(32).optional(),
  /** FFmpeg tools used to inspect uploads and make thumbnails. */
  FFPROBE_PATH: z.string().default('ffprobe'),
  FFMPEG_PATH: z.string().default('ffmpeg'),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    // Only field paths/messages are printed, never values.
    console.error('Invalid environment variables:', z.treeifyError(parsed.error));
    throw new Error('Invalid environment configuration');
  }
  const env = parsed.data;
  if (env.NODE_ENV === 'production') assertProductionSafe(env);
  return env;
}

/** Refuses to start production with development-only auth adapters or missing secrets. */
export function assertProductionSafe(env: Env) {
  const problems: string[] = [];
  if (!env.JWT_ACCESS_SECRET) problems.push('JWT_ACCESS_SECRET is required');
  if (!env.AUTH_HASH_SECRET) problems.push('AUTH_HASH_SECRET is required');
  if (env.SMS_PROVIDER === 'dev') problems.push('SMS_PROVIDER=dev cannot be used in production');
  if (env.EMAIL_PROVIDER === 'dev')
    problems.push('EMAIL_PROVIDER=dev cannot be used in production');
  if (env.AUTH_DEV_GOOGLE) problems.push('AUTH_DEV_GOOGLE cannot be enabled in production');
  if (env.VIDEO_STORAGE === 'local') {
    problems.push('VIDEO_STORAGE=local is development-only; configure real object storage');
  }
  if (problems.length) {
    throw new Error(`Unsafe production configuration:\n- ${problems.join('\n- ')}`);
  }
}
