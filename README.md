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
- Docker Desktop, for local PostgreSQL and Redis (from Step 2 onward)
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

Start local services for the database work:

```bash
npm run db:up          # PostgreSQL 17 on :5432, Redis 7 on :6379
```

## Scripts

| Command                             | What it does                         |
| ----------------------------------- | ------------------------------------ |
| `npm run build`                     | Builds every package and app         |
| `npm run typecheck`                 | Type-checks every package and app    |
| `npm run lint`                      | Runs ESLint                          |
| `npm test`                          | Runs the unit tests (Vitest)         |
| `npm run format`                    | Formats with Prettier                |
| `npm run db:up` / `npm run db:down` | Starts or stops PostgreSQL and Redis |

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
- [ ] **Step 2: Database and ORM.** Prisma schema from spec Part 4, first migration, skills and categories seed data.
- [ ] **Step 3: Authentication.** Register and login, phone OTP, JWT refresh, mobile and web auth screens.
- [ ] **Step 4: Profiles.** Seeker and employer profiles, avatar upload, switching between seeker and employer mode.
- [ ] **Step 5: Testing and QA.** Unit and integration tests, plus a test on a low-end Android phone over 3G.

## MVP rules

These are the locked decisions from the spec:

- Phone verification is mandatory for everyone. ID verification is optional and never blocks applying.
- There are no cold DMs. Messaging unlocks only after an application or an interview request.
- There is no monetization UI in the MVP.
- Payments, contracts, and a CV builder are out of scope for the MVP.
