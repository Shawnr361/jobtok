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

| Path              | Package          | What it is                                                                    |
| ----------------- | ---------------- | ----------------------------------------------------------------------------- |
| `apps/mobile`     | `@jobtok/mobile` | Main app for iOS and Android (React Native + Expo)                            |
| `apps/web`        | `@jobtok/web`    | Employer and admin portal (Next.js App Router + Tailwind)                     |
| `apps/api`        | `@jobtok/api`    | REST API under `/api/v1` (Node.js + Express 5 + TypeScript, modular monolith) |
| `packages/types`  | `@jobtok/types`  | Shared domain types, enums, application status rules, country config          |
| `packages/tokens` | `@jobtok/tokens` | Design tokens (dark-first, purple/electric-blue accents)                      |

## Prerequisites

- Node.js 20 or newer (developed on Node 26) and npm 11
- A PostgreSQL 17 database: Docker Desktop (recommended), **or** the embedded PostgreSQL included as a dev dependency (no Docker or admin rights needed)
- The Expo Go app on a phone, or an Android emulator or iOS simulator

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
- **Development accounts** (no passwords yet; phones are +234 test numbers):
  - `ada`, a job seeker (carpenter) with a showcase video post and a portfolio item
  - `bola`, an employer (Bola Build Co.) with a job video post
  - `chidi`, a single account holding both seeker and employer profiles
  - `admin`
- **Hiring example:** Ada's application to Bola's "Site Carpenter" job, moved to REVIEWING, with an unlocked conversation.

To seed only reference data (no development accounts), run `SEED_FIXTURES=false npm run db:seed`.

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

## Scripts

| Command                             | What it does                                  |
| ----------------------------------- | --------------------------------------------- |
| `npm run build`                     | Builds every package and app                  |
| `npm run typecheck`                 | Type-checks every package and app             |
| `npm run lint`                      | Runs ESLint                                   |
| `npm test`                          | Runs the unit tests (Vitest)                  |
| `npm run format`                    | Formats with Prettier                         |
| `npm run db:up` / `npm run db:down` | Starts or stops PostgreSQL and Redis (Docker) |
| `npm run db:embedded`               | Runs embedded PostgreSQL 17 (no Docker)       |
| `npm run db:migrate`                | Creates and applies a migration (development) |
| `npm run db:deploy`                 | Applies pending migrations                    |
| `npm run db:status`                 | Shows migration status                        |
| `npm run db:seed`                   | Seeds reference and development data          |
| `npm run db:reset`                  | Drops, re-migrates and re-seeds the dev DB    |
| `npm run db:studio`                 | Opens Prisma Studio                           |

A Husky pre-commit hook runs Prettier on staged files through lint-staged.

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
- [x] **Step 2: Database foundation.** Prisma schema from spec Part 4, migrations with DB-level constraints and the application state machine, country config, deterministic seed, `/health/db`, database tests. Verified against embedded PostgreSQL 17; the Docker Compose path has not been run yet (Docker is not installed on the dev machine).
- [ ] **Step 3: Authentication.** Register and login, phone OTP, JWT refresh, mobile and web auth screens.
- [ ] **Step 4: Profiles.** Seeker and employer profiles, avatar upload, switching between seeker and employer mode.
- [ ] **Step 5: Testing and QA.** Unit and integration tests, plus a test on a low-end Android phone over 3G.

## MVP rules

These are the locked decisions from the spec:

- Phone verification is mandatory for everyone. ID verification is optional and never blocks applying.
- There are no cold DMs. Messaging unlocks only after an application or an interview request.
- There is no monetization UI in the MVP.
- Payments, contracts, and a CV builder are out of scope for the MVP.
