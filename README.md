# JobTok

**SHOW ME WHAT YOU CAN DO.**
Real People. Real Skills. Real Opportunities.

JobTok is a visual employment marketplace. Job seekers prove their skills with short videos (60 seconds max), and employers show their roles and workplaces the same way. Discovery comes first and the CV comes last. The core loop is:

```
CREATE → SHOW → DISCOVER → CONNECT → APPLY → HIRE
```

The app launches in Nigeria first, then expands across Africa. It is built for 3G/4G networks: videos are capped at 720p, compressed aggressively, and lazy-loaded.

The full product, architecture, and database specification is in [JOBTOK_MASTER_BUILD_SPEC.md](JOBTOK_MASTER_BUILD_SPEC.md). That spec is the single source of truth.

## Monorepo layout

This is a Turborepo monorepo with npm workspaces.

| Path                  | Package              | What it is                                                                    |
| --------------------- | -------------------- | ----------------------------------------------------------------------------- |
| `apps/mobile`         | `@jobtok/mobile`     | Main app for iOS and Android (React Native + Expo)                            |
| `apps/web`            | `@jobtok/web`        | Employer and admin portal (Next.js App Router + Tailwind)                     |
| `apps/api`            | `@jobtok/api`        | REST API under `/api/v1` (Node.js + Express 5 + TypeScript, modular monolith) |
| `packages/types`      | `@jobtok/types`      | Shared domain types, enums, application status rules, country config          |
| `packages/tokens`     | `@jobtok/tokens`     | Design tokens (dark-first, purple/electric-blue accents)                      |
| `packages/api-client` | `@jobtok/api-client` | Typed client for `/api/v1/auth`, shared by web and mobile                     |

## Prerequisites

- Node.js 20 or newer (developed on Node 26) and npm 11
- A PostgreSQL 17 database: Docker Desktop (recommended), **or** the embedded PostgreSQL included as a dev dependency (no Docker or admin rights needed)
- The Expo Go app on a phone, or an Android emulator or iOS simulator
- FFmpeg (`ffprobe` and `ffmpeg` on PATH) for video uploads, e.g. `winget install Gyan.FFmpeg`

## Quick start on Windows

Double-click `start-jobtok.cmd`. It opens the database, the API and the Expo app in their own
windows, points the app at this computer's Wi-Fi address so a phone on the same network can
reach it, and opens http://localhost:8081. Sign-in codes are printed in the API window.

## Getting started

```bash
npm install
npm run build          # builds the shared packages
cp apps/api/.env.example apps/api/.env
```

Run each app:

```bash
npm run dev:api        # http://localhost:4000/api/v1/health
npm run dev:web        # http://localhost:3000
npm run dev:mobile     # Expo dev server (scan the QR code with Expo Go)
```

## Database

The API uses PostgreSQL 17 through Prisma 7 (`apps/api/prisma/schema.prisma`). Schema changes are
made only through migrations in `apps/api/prisma/migrations`. The second migration adds the CHECK
constraints and triggers Prisma cannot express, including the application status state machine.

### 1. Start PostgreSQL

Choose one. Both give the same connection string,
`postgresql://jobtok:jobtok@localhost:5432/jobtok`, which is already in `apps/api/.env.example`.

With Docker (starts PostgreSQL 17 on :5432 and Redis 7 on :6379):

```bash
npm run db:up
```

Without Docker (embedded PostgreSQL 17; keep this terminal open and press Ctrl+C to stop; data is kept in `apps/api/.pgdata`):

```bash
npm run db:embedded
```

### 2. Configure, migrate and seed

```bash
cp apps/api/.env.example apps/api/.env
npm run db:deploy      # apply all migrations (use db:migrate while changing the schema)
npm run db:seed        # countries, categories, skills + development accounts (idempotent)
npm run db:status      # confirm the database is up to date
```

Check the connection through the API:

```bash
npm run dev:api        # then open http://localhost:4000/api/v1/health/db
```

### Reset the development database

This drops all data, re-applies every migration and re-seeds:

```bash
npm run db:reset
```

To stop Docker services, run `npm run db:down`. To wipe the embedded database, stop it, then delete `apps/api/.pgdata`.

### Changing the schema

```bash
# 1. edit apps/api/prisma/schema.prisma
npm run db:migrate -- --name describe_the_change
```

Constraints and triggers go in a migration created with `npm run db:migrate -- --create-only`,
followed by hand-written SQL.

### Seed data

The seed is deterministic: every row gets a fixed UUID, so re-running it changes nothing.

- **Countries:** Nigeria (enabled), plus Ghana and Kenya (configured, disabled).
- **Categories:** the 7 launch categories from the spec, with 44 skills.
- **Development accounts** (phones are +234 test numbers; DEVELOPMENT-ONLY password `jobtok-dev-password` on local databases):
  - `ada`, a job seeker (carpenter) with a showcase video post and a portfolio item
  - `bola`, an employer (Bola Build Co.) with a job video post
  - `chidi`, a single account holding both seeker and employer profiles
  - `admin`
- **Hiring example:** Ada's application to Bola's "Site Carpenter" job, moved to REVIEWING, with an unlocked conversation.

To seed only reference data (no development accounts), run `SEED_FIXTURES=false npm run db:seed`.

## Authentication

One JobTok **User** can sign in with any mix of three methods. A user never gets a second account
just because they used a different method. Each method attaches to the same `users` row.

| Method                               | How it works                                                                                                                                                                                                                                         |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phone OTP** (mandatory capability) | `POST /otp/send` texts a 6-digit code. `POST /otp/verify` signs in, creating the account on first use. Nigerian numbers are normalised with the `countries` table (`0803 123 4567` → `+2348031234567`).                                              |
| **Email + password**                 | Argon2id hashes (OWASP parameters). **Verify first:** registration issues no session. The user opens the emailed link, then signs in; password sign-in requires a verified email. Password reset uses single-use links that expire after 30 minutes. |
| **Google**                           | The client obtains a Google **ID token** (OIDC). The API verifies its signature against Google's keys, plus issuer, audience (`GOOGLE_CLIENT_IDS`) and expiry. Client-supplied claims are never trusted.                                             |

**Phone verification is mandatory** (spec trust model). Accounts may _start_ from email or Google,
but `users.phone` is only ever set after an OTP proves ownership. The `requirePhoneVerified`
middleware blocks product routes until then, and the apps prompt the user to verify.

**Linking rules** (`AuthService.signInWithGoogle`):

- A Google account already linked signs in as its user.
- A verified Google email matching a user whose email is **verified** is linked to that user.
- If the matching user's email is **not** verified, the API refuses with `account_link_requires_sign_in`. Auto-linking there would hand over an account someone else may have created with that address.
- A signed-in user can link Google explicitly.
- A phone already owned by another account is rejected with `phone_in_use`.

**Account discovery (enumeration) policy.** Anonymous callers must not be able to learn whether
an email or phone number has a JobTok account:

| Flow                                    | Behaviour                                                                                                                                                                                                                                                 |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /register`                        | Always `202` with the same message and no session. A new address gets a verification link. The owner of an existing address is emailed a notice pointing to password reset, and the existing account is not changed.                                      |
| `POST /login`                           | One `401 invalid_credentials` for unknown email, wrong password **and** unverified email. Without the last one, "register, then log in with the same password" would reveal whether the address was taken. Unknown emails still cost a full Argon2 check. |
| `POST /email/verification` (signed out) | Always `202` with the same message; only an unverified account actually gets a link                                                                                                                                                                       |
| `POST /password/forgot`                 | Always `202` with the same message                                                                                                                                                                                                                        |
| `POST /otp/send`                        | Same response for registered and unregistered numbers                                                                                                                                                                                                     |
| `POST /email/verify`                    | Returns only `{ verified: true }`, never account details                                                                                                                                                                                                  |

A few `409`s remain on purpose, because the caller has **already proven ownership** of the
identifier involved, so nothing is disclosed to a stranger:

- `phone_in_use` (signed-in user who just entered the OTP sent to that phone)
- `google_account_in_use` / `google_already_linked` (signed-in user presenting a verified Google token)
- `account_link_requires_sign_in` (a Google token proving control of that email)

### Sessions

|               | Web (Next.js)                                                                                 | Mobile (Expo)                                                                      |
| ------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Access token  | JWT (HS256, 15 min), in memory only                                                           | JWT (HS256, 15 min), in memory only                                                |
| Refresh token | HTTP-only, `SameSite=Strict` cookie `jobtok_rt` (`Path=/api/v1/auth`, `Secure` in production) | Returned in the body, stored in the device keychain/keystore (`expo-secure-store`) |
| Client header | none (`web` is the default)                                                                   | `x-jobtok-client: mobile`                                                          |

- Every access token names its session (`auth_sessions`). The API checks that the session is still active on each request, so **logout and revocation take effect immediately**.
- Refresh tokens **rotate** on every use (30-day sliding expiry). Presenting an already-rotated token is treated as theft and revokes the session. The apps serialise refreshes so that doesn't happen by accident.
- Cookie refresh is only accepted from `CORS_ORIGINS` (CSRF protection).
- A password reset signs the user out everywhere. Suspended users are rejected.

### Endpoints (`/api/v1/auth`)

| Method & path              | Purpose                                                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `POST /register`           | Email + password sign-up. Always `202`, no session; sends a verification link (or, for an existing address, a notice to its owner) |
| `POST /login`              | Email + password sign-in                                                                                                           |
| `POST /otp/send`           | Send a code (`purpose: login`, or `verify_phone` when signed in)                                                                   |
| `POST /otp/verify`         | Sign in with a code, or attach the phone to the signed-in user                                                                     |
| `POST /google`             | Exchange a Google ID token (sign in, sign up, or link when signed in)                                                              |
| `POST /refresh`            | Rotate tokens (cookie on web, `refreshToken` in the body on mobile)                                                                |
| `POST /logout`             | Revoke the current session (works with an expired access token via the refresh token)                                              |
| `GET /me`                  | The signed-in user                                                                                                                 |
| `POST /email/verification` | Resend the verification link: for the signed-in user, or by `{ email }` when signed out (same response for any address)            |
| `POST /email/verify`       | Complete email verification with the link token (returns `{ verified: true }`)                                                     |
| `POST /password/forgot`    | Request a reset link (same response whether or not the account exists)                                                             |
| `POST /password/reset`     | Set a new password with the link token                                                                                             |

For future routes, `apps/api/src/modules/auth/auth.middleware.ts` provides:

- `authenticate`, which sets `req.auth`: user ID, session, role, active mode, verification state, and capabilities derived from the role.
- `requireAuth`, `requirePhoneVerified`, `requireEmailVerified` and `requireRole(...)`.

Full seeker/employer authorization comes in later steps.

### Environment variables

| Variable                                                                               | Where  | Purpose                                                                                                                                       |
| -------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `JWT_ACCESS_SECRET`, `AUTH_HASH_SECRET`                                                | API    | 32+ random characters each; **required in production**. In development they default to random per-process values (sessions reset on restart). |
| `ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_TTL_DAYS`                                   | API    | Token lifetimes (900 s / 30 days)                                                                                                             |
| `APP_WEB_URL`                                                                          | API    | Base URL for email links                                                                                                                      |
| `SMS_PROVIDER`, `EMAIL_PROVIDER`                                                       | API    | `dev` only for now (see below)                                                                                                                |
| `GOOGLE_CLIENT_IDS`                                                                    | API    | Accepted Google OAuth client IDs (comma-separated)                                                                                            |
| `AUTH_DEV_GOOGLE`                                                                      | API    | Development-only fake Google tokens                                                                                                           |
| `CORS_ORIGINS`, `TRUST_PROXY`                                                          | API    | Allowed web origins (also for the refresh cookie); proxy hops for client IPs                                                                  |
| `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_AUTH_DEV_GOOGLE`   | Web    | See `apps/web/.env.example`                                                                                                                   |
| `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID`, `EXPO_PUBLIC_AUTH_DEV_GOOGLE` | Mobile | See `apps/mobile/.env.example`                                                                                                                |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### Local development behaviour and development-only mocks

Everything runs locally with no paid providers. The mocks below are **not** real services. They
are labelled in the code and UI, and the API refuses to start in production while any of them is
enabled.

| Mock                                             | What it does                                                                                                         | Production guard                                                                                                                |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `DevConsoleSmsProvider` (`SMS_PROVIDER=dev`)     | Prints `[DEV SMS — NOT SENT]` with the OTP to the **API terminal**. No SMS is sent.                                  | The constructor throws when `NODE_ENV=production`, and startup refuses `SMS_PROVIDER=dev`                                       |
| `DevConsoleEmailProvider` (`EMAIL_PROVIDER=dev`) | Prints `[DEV EMAIL — NOT SENT]` with verification/reset links to the API terminal                                    | Same                                                                                                                            |
| `DevGoogleVerifier` (`AUTH_DEV_GOOGLE=true`)     | Accepts fake `dev-google:<id>:<email>` tokens. It is **not Google**; real Google tokens are still verified normally. | Same. The web/mobile "dev mock" buttons also require `NEXT_PUBLIC_`/`EXPO_PUBLIC_AUTH_DEV_GOOGLE=true` and a development build. |

Without `GOOGLE_CLIENT_IDS` (and with the dev mock off), Google sign-in is disabled: the API
returns 503 and the apps show a disabled button. Real Google sign-in has **not** been tested
against Google, because no OAuth credentials exist yet. Its verification logic is tested with
locally signed tokens.

To try it locally:

1. Run `npm run dev:api`.
2. Open the web app (`npm run dev:web`) or the mobile app (`npm run dev:mobile`).
3. Sign in with a phone number and read the code from the API terminal.
4. Alternatively, sign in with a seed account, e.g. `ada@jobtok.test` / `jobtok-dev-password`.

### Configuring real providers later

1. **SMS (Termii or Twilio, per spec):**
   - Implement `SmsProvider` in `apps/api/src/modules/auth/providers/sms.ts`.
   - Add it to `createSmsProvider` and the `SMS_PROVIDER` enum in `apps/api/src/config/env.ts`.
   - Read its API key from a new environment variable (never committed).
2. **Email:** do the same with `EmailProvider` and `EMAIL_PROVIDER`.
3. **Google:**
   - Create OAuth clients (web, iOS, Android) in Google Cloud Console.
   - Put all their IDs in `GOOGLE_CLIENT_IDS` (API).
   - Set the web ID in `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and each mobile ID in `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID`.
   - No client secret is needed: the API only verifies ID tokens.
4. **Rate limiting in production (required before running more than one API instance):**
   - Rate limits currently use an **in-memory store**, which is intentional for the MVP and correct for a single API instance.
   - Every instance keeps its own counters. With N instances, an attacker effectively gets N times the login, OTP and registration budget.
   - A **multi-instance production deployment therefore requires a shared, Redis-backed limiter**: pass a shared store (e.g. `rate-limit-redis` on `REDIS_URL`) to `createRateLimiter` in `apps/api/src/lib/rate-limit.ts`.
   - The database-backed OTP limits (per-number cooldown, hourly cap, attempt counting) are already shared across instances.

### Security considerations

- **No plaintext secrets at rest:**
  - Passwords use Argon2id.
  - OTP codes are HMAC-SHA256 with `AUTH_HASH_SECRET`, bound to phone and purpose.
  - Refresh, email-verification and reset tokens are stored as SHA-256 hashes.
- **OTP limits:**
  - Codes expire after 5 minutes and allow 5 attempts, counted atomically.
  - Only the newest code for a number works.
  - One code per number per 60 seconds, at most 5 per hour.
  - Per-IP and per-number request limits apply.
- **Rate limits** on login (per IP and per account), registration, OTP send/verify and password reset. The auth API as a whole allows 100 requests/min per IP.
- **No account discovery:** see the enumeration policy above. Registration, login, resend verification, password reset and OTP requests respond identically whether or not an account exists, and each is rate limited.
- **Responses never include** password hashes, OTP codes or token hashes. Auth responses are `Cache-Control: no-store`.
- **Logging:** request bodies are never logged. OTP codes appear only in the development console adapter.
- **No custom cryptography:** `jose` (JWT/OIDC), `@node-rs/argon2` and Node's `crypto` only.
- **Startup checks:** production refuses to start without secrets or with any development adapter.

### Authentication tests

```bash
npm test
```

```bash
npm test -w @jobtok/api -- test/auth
```

The first command runs everything; the second runs only the authentication suites.
`apps/api/test/auth` covers:

- password hashing and verification
- OTP generation, expiry, invalid codes, attempt locking, cooldown and hourly caps
- registration, and duplicate email and phone rejection
- login and throttling
- `/me`, the authentication middleware and unauthorised access
- token expiry, refresh rotation and reuse detection
- logout and session invalidation
- email verification
- the password reset flow
- Google verification and account linking
- production-safety checks

Time-dependent cases use an injectable clock. Google is simulated with locally generated signing
keys, so the real verifier code runs offline.

## Tests

```bash
npm test
```

The API tests need no running database. Vitest starts a throwaway embedded PostgreSQL 17 on port
54329, applies every migration with `prisma migrate deploy`, runs the suites, and deletes the
database. To run them against another disposable database instead (for example Docker or CI):

```bash
TEST_DATABASE_URL=postgresql://jobtok:jobtok@localhost:5432/jobtok_test npm test
```

The API suites cover the database connection and `/health/db`, migrations (applied in order, no
drift, tables, enums, indexes, triggers), seeding (counts, idempotency, relationships), core
relationships and cascades, every application status transition, and the database constraints.
The authentication suites are described under [Authentication tests](#authentication-tests).

## Scripts

| Command                             | What it does                                                                |
| ----------------------------------- | --------------------------------------------------------------------------- |
| `npm run build`                     | Builds every package and app                                                |
| `npm run typecheck`                 | Type-checks every package and app                                           |
| `npm run lint`                      | ESLint (zero warnings allowed) for the API, shared packages, web and mobile |
| `npm test`                          | Runs the unit tests (Vitest)                                                |
| `npm run format`                    | Formats with Prettier                                                       |
| `npm run db:up` / `npm run db:down` | Starts or stops PostgreSQL and Redis (Docker)                               |
| `npm run db:embedded`               | Runs embedded PostgreSQL 17 (no Docker)                                     |
| `npm run db:migrate`                | Creates and applies a migration (development)                               |
| `npm run db:deploy`                 | Applies pending migrations                                                  |
| `npm run db:status`                 | Shows migration status                                                      |
| `npm run db:seed`                   | Seeds reference and development data                                        |
| `npm run db:reset`                  | Drops, re-migrates and re-seeds the dev DB                                  |
| `npm run db:studio`                 | Opens Prisma Studio                                                         |

A Husky pre-commit hook runs Prettier on staged files through lint-staged.

**Linting:**

- The API and the shared packages (`api-client`, `types`, `tokens`) use the repo-level `eslint.config.mjs`: ESLint recommended plus `typescript-eslint` recommended.
- The web app uses `eslint-config-next`.
- The mobile app uses Expo's `eslint-config-expo`.
- `npm run lint` runs all of them through Turbo.

**React version:**

- Expo SDK 57 ships React Native 0.86.3, whose renderer requires exactly `react@19.2.3`.
- The root `package.json` pins `react`/`react-dom` to 19.2.3 with npm `overrides`, so every package (including Expo Router) resolves the same copy.
- The Next.js App Router renders with its own vendored React build, so the web app is unaffected at runtime.
- Revisit the pin when upgrading Expo.

## Tech stack

| Layer           | Choice                                                            |
| --------------- | ----------------------------------------------------------------- |
| Mobile          | React Native + Expo                                               |
| Web             | Next.js (App Router)                                              |
| API             | Node.js + TypeScript + Express, Zod validation                    |
| Database        | PostgreSQL + Prisma                                               |
| Cache and queue | Redis + BullMQ                                                    |
| Media           | Cloudflare R2 / S3 → Mux or Cloudinary (HLS 360p/480p/720p) → CDN |
| Realtime        | Socket.io                                                         |
| Auth            | JWT + refresh tokens, phone OTP (Termii/Twilio), Google           |

## Phase 1 roadmap

- [x] **Step 1: Scaffolding.** Monorepo, apps, shared packages, lint and format tooling, pre-commit hooks.
- [x] **Step 2: Database foundation.** Prisma schema from spec Part 4, migrations with DB-level constraints and the application state machine, country config, deterministic seed, `/health/db`, database tests. Verified against embedded PostgreSQL 17. **Infrastructure follow-up:** the Docker Compose path (`npm run db:up`) has still not been verified, because Docker is not installed on the dev machine; the Docker setup itself is unchanged.
- [x] **Step 3: Authentication.** Phone OTP, email + password, Google (OIDC ID token), rotating sessions, authorization middleware, mobile and web auth screens. SMS/email use development console adapters and Google has not been verified against real Google credentials yet (see [Authentication](#authentication)).
- [ ] **Step 4: Profiles.** Seeker and employer profiles, avatar upload, switching between seeker and employer mode.
- [ ] **Step 5: Testing and QA.** Unit and integration tests, plus a test on a low-end Android phone over 3G.

## MVP rules

These are the locked decisions from the spec:

- Phone verification is mandatory for everyone. ID verification is optional and never blocks applying.
- There are no cold DMs. Messaging unlocks only after an application or an interview request.
- There is no monetization UI in the MVP.
- Payments, contracts, and a CV builder are out of scope for the MVP.
