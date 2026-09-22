# JOBTOK — MASTER BUILD SPECIFICATION
**Version:** 1.0 (Final Planning Phase)
**Status:** Approved for Phase 1 Build
**Tagline:** SHOW ME WHAT YOU CAN DO.
**Supporting Message:** Real People. Real Skills. Real Opportunities.

---

## PART 1: DISCOVERY & STRATEGIC DECISIONS (Q&A)

This section documents the explicit decisions made during the discovery phase. These decisions override any conflicting assumptions in the original master prompt.

### 1. Business & Scope
*   **Final Name:** JobTok.
*   **Launch Market:** Nigeria first, then expand across Africa. Architecture must be multi-country configurable from day one (currency, phone formats, locations).
*   **Core Focus:** All three (Jobs, Freelance, Local Services) but phased. Launch with full-time, part-time, freelance, gigs, local services, internships.
*   **Individual Hiring:** Yes. Individuals can hire other individuals (e.g., hire a barber, cleaner, designer) without registering a formal company.
*   **Role Switching:** Yes. One unified account. Users can switch between "Job Seeker Mode" and "Employer Mode" without losing history.
*   **Payments:** Hiring and application happen inside JobTok. Payment/escrow is external for MVP.
*   **Remote Work:** Yes, supported. Launch focus: Local → National → African → International/Remote.
*   **Launch Categories:** Digital & Tech, Skilled Trades, Beauty & Fashion, Creative, Food & Hospitality, Professional, Education.
*   **CVs:** Yes, but secondary. Hierarchy: SHOWCASE → PORTFOLIO → EXPERIENCE → CV.
*   **Core Problem Solved:** Reducing the gap between what people claim they can do and what employers need by allowing visual demonstration of skills.

### 2. Brand & Design
*   **Logo:** Evolve the play-button concept to include person/opportunity/connection. Avoid TikTok similarity.
*   **Colors:** Dark-first foundation (deep black/charcoal). Accents: Electric blue, purple, controlled pink/orange, green for success.
*   **Theme:** Dark-first for MVP. Design tokens must allow Light Mode later.
*   **Personality:** Bold, Human, Ambitious, Professional, Energetic, Trustworthy.
*   **Vibe:** LinkedIn's purpose + TikTok's discovery mechanics + Instagram's visual portfolio + Marketplace's transaction intent. Professional first.

### 3. Feed
*   **Video Length:** 60 seconds maximum for MVP.
*   **Career Content:** Yes, but controlled (advice, tutorials, behind-the-scenes). Must not become an entertainment app.
*   **Music:** Optional and legally compliant. Original audio/voiceover prioritized.
*   **Likes/Comments:** Public, but employment actions prioritized over vanity metrics.
*   **Unified Feed:** Yes. `For You` feed contains Talent, Job, Company, Showcase, Project, Service. Dedicated tabs: `For You | Following | Jobs | Talent`.

### 4. Hiring
*   **Applications:** Entirely inside the app.
*   **Interviews:** Yes, simple request/propose time flow.
*   **CV Builder:** No for MVP. Upload existing PDF only.
*   **Verification of Candidates:** Yes, layered (Phone, Email, ID, Certification, Employer/Company).
*   **Salary Negotiation:** Yes, via job-linked chat.

### 5. Trust & Verification
*   **Mandatory:** Phone verification for everyone.
*   **Employers:** Phone + Email + Basic Business Verification (for companies posting at scale).
*   **Optional:** ID verification (NIN), Certifications, Skills.
*   **Apply Gate:** No mandatory ID verification to apply. Too much friction.
*   **Business Verification:** Required for employers posting at scale.
*   **Reviews:** Yes, tied to completed work/hiring only.

### 6. Monetization (Future)
*   **Model:** Employers/Businesses pay. Job seekers use basic features for free.
*   **Job Posting:** Free initially to build supply.
*   **Boosts/Promotions:** Yes, later.
*   **Premium Employer Accounts:** Yes, later (advanced search, recruitment tools).
*   **MVP UI:** Hide all monetization/pricing from MVP. No disabled "Upgrade" buttons.

### 7. Technology & Architecture
*   **Frontend Mobile:** React Native + Expo.
*   **Frontend Web:** Next.js (App Router) for Employer/Admin.
*   **Backend:** Node.js + TypeScript (Express).
*   **Database:** PostgreSQL (Relational).
*   **API:** REST initially.
*   **Realtime:** WebSockets (Socket.io).
*   **Auth:** Email/Password, Phone OTP (Mandatory), Google Sign-In.
*   **Media:** Object Storage (S3/Cloudflare R2) + Dedicated Video Processing/CDN. Never store videos in PostgreSQL.
*   **Payments:** Abstraction layer. Nigerian providers (Paystack/Flutterwave) evaluated later.

### 8. Critical Batch 2 Decisions
*   **Trust Model:** Progressive. Phone first. No mandatory government ID for individual employers.
*   **Moderation:** Immediate publishing + community reports + admin moderation dashboard. No 1,000-video manual gate.
*   **Video Quality:** 720p max. Aggressive compression. Adaptive playback. Optimized for 3G/4G.
*   **Apply Flow:** Applications automatically include the candidate's JobTok visual identity (Showcase, Portfolio). CV is secondary.
*   **Account Architecture:** One `User` account. Multiple capabilities (`Job Seeker Profile` + `Employer Profile`). History persists across mode switches.
*   **Messaging:** Permission-based. No unrestricted cold DMs. Unlock after application or interview request.
*   **Monetization:** Hidden from MVP.
*   **Definition of "Hired":** Status change to `HIRED`. No digital contracts or e-signatures in MVP.

---

## PART 2: PRODUCT REQUIREMENTS DOCUMENT (PRD)

### 1. Executive Summary
JobTok is a visual employment marketplace. Unlike traditional job boards (CV-first) or entertainment apps (watch-first), JobTok is a **discovery-first** platform where job seekers demonstrate their skills via short-form video and employers demonstrate their workplace and needs via video. The core interaction loop is: **CREATE → SHOW → DISCOVER → CONNECT → APPLY → HIRE.**

### 2. Target Audience & User Roles
*   **Job Seeker:** Individuals seeking full-time, part-time, freelance, gig, or local service work.
*   **Employer:** Individuals, businesses, or recruiters looking to hire.
*   **Admin:** Platform moderators and administrators.
*   **Account Architecture:** One unified `User` account. Users can toggle between "Job Seeker Mode" and "Employer Mode" without losing history, likes, or messages.

### 3. Core MVP Features

#### 3.1. Onboarding & Authentication
*   **Auth:** Email/Password, Phone OTP (Mandatory), Google Sign-In.
*   **Onboarding Flow:** "What brings you to JobTok?" (Seeker / Employer / Both). Progressive profiling: Name, Username, Profile Photo, Location, Primary Skill/Industry. No forced CV upload.

#### 3.2. The Feed (Discovery Engine)
*   **Navigation:** Tabs for `For You`, `Following`, `Jobs`, `Talent`.
*   **Interaction:** Vertical full-screen scroll. Autoplay when visible, pause when out of viewport.
*   **Content Types:** Talent Showcase, Job Post, Company Culture, Service Offer.
*   **Smart CTAs:** Context-aware buttons (e.g., "Hire Me" on talent, "Apply" on jobs, "View Work" on portfolios).
*   **Performance:** 720p max resolution. Aggressive compression. Lazy loading. Thumbnail previews before video loads.

#### 3.3. The Showcase (Proof of Work)
*   **Feature:** The defining feature of JobTok. Users upload 60-second max videos demonstrating a skill.
*   **Attachments:** Can link to external portfolios (GitHub, Behance), attach images (before/after), and tag specific skills.
*   **Portfolio:** A dedicated tab on the profile that aggregates these showcases.

#### 3.4. Job Posting & Application
*   **Job Creation:** Employers record a short video explaining the role, then attach structured data (Title, Salary, Location, Type, Skills).
*   **Application:** Users apply entirely in-app.
*   **Visual Application:** The application automatically packages the candidate's JobTok Profile, selected Showcase videos, and Portfolio. CV is optional and secondary.
*   **Application Tracking:** Applicants see status: `APPLIED → REVIEWING → SHORTLISTED → INTERVIEW → OFFER → HIRED / REJECTED`.

#### 3.5. Messaging & Communication
*   **Permission-Based:** No unrestricted cold DMs.
*   **Triggers:** Messaging unlocks after an application is submitted, or an employer sends an interview/contact request.
*   **Features:** Text, image sharing, shared job/profile links. Block and Report functions.

#### 3.6. Trust, Safety & Moderation
*   **Verification:** Mandatory Phone OTP. Optional/Advanced: Email, NIN/ID, Business Verification (for companies posting at scale).
*   **Moderation:** Immediate publishing with automated basic checks, community reporting, and a robust Admin Moderation Dashboard for manual review and suspension.
*   **Reviews:** Tied strictly to completed work/hiring (post-HIRED status).

### 4. Out of Scope (For MVP)
*   In-app payments, escrow, or payroll.
*   Digital contracts or e-signatures.
*   Built-in CV builder (Upload existing PDF only).
*   Advanced AI matching or natural language search.
*   Music licensing for videos (original audio only).
*   Monetization features (Featured jobs, Pro accounts, Boosts).

### 5. Non-Functional Requirements
*   **Performance:** App must remain usable on 3G/4G networks. Video upload must support resume/retry on interrupted connections.
*   **Scalability:** Architecture must support multi-country configuration (currency, location, phone formats) from day one.
*   **Security:** Password hashing, rate limiting, secure file uploads, role-based access control.
*   **Accessibility:** Reduced motion support, screen reader compatibility, high contrast dark mode.

---

## PART 3: TECHNICAL ARCHITECTURE

### 1. High-Level System Architecture
We will use a **modular monolith** approach for the MVP.

```text
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                         │
│  ┌──────────────────────┐      ┌──────────────────────────┐ │
│  │  Mobile App          │      │  Web App                 │ │
│  │  React Native + Expo │      │  Next.js (App Router)    │ │
│  │  (Primary)           │      │  (Employer/Admin)        │ │
│  └──────────┬───────────┘      └────────────┬─────────────┘ │
└─────────────┼───────────────────────────────┼───────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      API GATEWAY / BFF                      │
│                 Node.js + Express (TypeScript)              │
│  ┌────────────┬────────────┬────────────┬────────────────┐  │
│  │ Auth       │ Jobs       │ Feed       │ Messaging      │  │
│  │ Service    │ Service    │ Service    │ Service        │  │
│  ├────────────┼────────────┼────────────┼────────────────┤  │
│  │ Profiles   │ Applications│ Search    │ Notifications  │  │
│  │ Service    │ Service    │ Service    │ Service        │  │
│  └────────────┴────────────┴────────────┴────────────────┘  │
└─────────────┬───────────────────────────────┬───────────────┘
              │                               │
              ▼                               ▼
┌──────────────────────────┐    ┌─────────────────────────────┐
│   PRIMARY DATABASE       │    │   MEDIA PIPELINE            │
│   PostgreSQL (Managed)   │    │   Object Storage (S3/R2)    │
│   - Relational Data      │    │   → Video Transcoding       │
│   - Indexes              │    │   → 720p/480p/360p          │
│   - Redis (Cache/Queue)  │    │   → Thumbnail Generation    │
└──────────────────────────┘    │   → CDN (Cloudflare)        │
                                └─────────────────────────────┘
```

### 2. Technology Stack Decisions
| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Mobile** | React Native + Expo | One codebase for iOS/Android. Expo simplifies video camera, OTA updates, and push notifications. |
| **Web** | Next.js (App Router) | SEO for job posts, fast SSR, excellent for Employer/Admin dashboards. |
| **Backend** | Node.js + TypeScript (Express) | Unified language with frontend. Strong ecosystem for video, WebSockets, and AI-assisted development. |
| **Database** | PostgreSQL (Managed on AWS RDS/Supabase) | Highly relational data. ACID compliance for hiring workflows. |
| **Cache/Queue** | Redis | Rate limiting, session caching, and BullMQ for video processing jobs. |
| **Media Storage** | Cloudflare R2 + Stream (or AWS S3 + CloudFront) | R2 has zero egress fees, critical for video-heavy African apps. |
| **Video Processing** | Mux or Cloudinary (API-based) | Offloads transcoding complexity. Auto-generates 360p/480p/720p HLS streams. |
| **Realtime** | Socket.io (Node.js) | For messaging, typing indicators, and live application status updates. |
| **Auth** | JWT + Refresh Tokens, Phone OTP via Termii/Twilio | Phone verification is mandatory for trust. |
| **Search** | PostgreSQL Full-Text Search (MVP) → Meilisearch (Post-MVP) | Start simple; abstract the search service so we can swap later. |

### 3. Media Pipeline (Video Architecture)
```text
[Client Upload]
      │
      ▼
[1. Direct-to-S3/R2 Upload] (Presigned URL from Node.js API)
      │
      ▼
[2. Queue Job (BullMQ + Redis)]
      │
      ▼
[3. Transcoding Service (Mux/Cloudinary)]
      ├── 720p HLS
      ├── 480p HLS
      ├── 360p HLS
      └── Thumbnail (JPEG/WebP)
      │
      ▼
[4. CDN Distribution (Cloudflare)]
      │
      ▼
[5. Client Adaptive Playback (HLS.js / Expo Video)]
```

### 4. API Endpoints (REST Structure)
```text
AUTH
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/otp/send
POST   /api/v1/auth/otp/verify
POST   /api/v1/auth/refresh

PROFILES
GET    /api/v1/profiles/:username
PATCH  /api/v1/profiles/me
POST   /api/v1/profiles/me/skills
GET    /api/v1/profiles/me/portfolio

FEED
GET    /api/v1/feed/for-you?cursor=xxx
GET    /api/v1/feed/following?cursor=xxx
GET    /api/v1/feed/jobs?cursor=xxx
GET    /api/v1/feed/talent?cursor=xxx

POSTS (SHOWCASE)
POST   /api/v1/posts (multipart/form-data)
GET    /api/v1/posts/:id
DELETE /api/v1/posts/:id
POST   /api/v1/posts/:id/like
POST   /api/v1/posts/:id/save
POST   /api/v1/posts/:id/report

JOBS
POST   /api/v1/jobs
GET    /api/v1/jobs/:id
GET    /api/v1/jobs/search?q=xxx&location=xxx
PATCH  /api/v1/jobs/:id
DELETE /api/v1/jobs/:id

APPLICATIONS
POST   /api/v1/jobs/:id/apply
GET    /api/v1/applications/me
GET    /api/v1/jobs/:id/applications (Employer)
PATCH  /api/v1/applications/:id/status (Employer)

MESSAGING
GET    /api/v1/conversations
GET    /api/v1/conversations/:id/messages
POST   /api/v1/conversations/:id/messages
POST   /api/v1/conversations/start (Permission-checked)

NOTIFICATIONS
GET    /api/v1/notifications
PATCH  /api/v1/notifications/:id/read
```

### 5. Security & Privacy Architecture
| Concern | Implementation |
|---------|---------------|
| **Authentication** | JWT (short-lived) + Refresh Tokens (HTTP-only cookies). Phone OTP via Termii/Twilio. |
| **Authorization** | Role-Based Access Control (RBAC). Middleware checks `user.role` and `user.active_mode`. |
| **Rate Limiting** | Redis-based. 100 req/min per IP. Stricter limits on auth/OTP endpoints. |
| **Input Validation** | Zod schemas on all API inputs. Sanitize user-generated content. |
| **File Uploads** | Presigned URLs. Validate MIME types. Scan for malware (ClamAV or cloud service). |
| **Data Privacy** | Location fuzzing (show city, not exact address). Users control profile visibility. |
| **Audit Logs** | All admin actions, application status changes, and verification changes logged. |
| **Scam Prevention** | Flag suspicious job posts. Rate-limit new accounts. Manual review of reported jobs. |

---

## PART 4: DATABASE SCHEMA (PostgreSQL)

### 1. Users & Profiles
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    is_phone_verified BOOLEAN DEFAULT FALSE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_id_verified BOOLEAN DEFAULT FALSE,
    is_business_verified BOOLEAN DEFAULT FALSE,
    role VARCHAR(20) DEFAULT 'seeker', -- 'seeker', 'employer', 'both', 'admin'
    active_mode VARCHAR(20) DEFAULT 'seeker', -- 'seeker' or 'employer'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ,
    is_suspended BOOLEAN DEFAULT FALSE,
    suspension_reason TEXT
);

CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    headline VARCHAR(150),
    bio TEXT,
    avatar_url VARCHAR(500),
    location_city VARCHAR(100),
    location_state VARCHAR(100),
    location_country VARCHAR(100) DEFAULT 'Nigeria',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    availability VARCHAR(50),
    experience_years INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE profile_skills (
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    proficiency VARCHAR(20) DEFAULT 'intermediate',
    PRIMARY KEY (profile_id, skill_id)
);

CREATE TABLE employer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(150),
    company_logo_url VARCHAR(500),
    industry VARCHAR(100),
    company_size VARCHAR(50),
    website VARCHAR(255),
    description TEXT,
    location_city VARCHAR(100),
    location_state VARCHAR(100),
    location_country VARCHAR(100) DEFAULT 'Nigeria',
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Showcase & Portfolio
```sql
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    post_type VARCHAR(20) NOT NULL, -- 'showcase', 'job', 'service', 'company', 'project'
    title VARCHAR(150),
    description TEXT,
    video_url VARCHAR(500),
    video_thumbnail_url VARCHAR(500),
    video_duration_seconds INTEGER,
    location_city VARCHAR(100),
    location_state VARCHAR(100),
    is_published BOOLEAN DEFAULT TRUE,
    is_flagged BOOLEAN DEFAULT FALSE,
    flag_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE portfolio_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    image_urls TEXT[],
    external_link VARCHAR(500),
    project_date DATE,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE post_tags (
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, skill_id)
);
```

### 3. Jobs & Applications
```sql
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employer_id UUID REFERENCES employer_profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    employment_type VARCHAR(50) NOT NULL, -- 'full_time', 'part_time', 'freelance', 'gig', 'internship'
    work_arrangement VARCHAR(50) DEFAULT 'on_site', -- 'remote', 'hybrid', 'on_site'
    salary_min DECIMAL(12, 2),
    salary_max DECIMAL(12, 2),
    salary_currency VARCHAR(10) DEFAULT 'NGN',
    salary_period VARCHAR(20) DEFAULT 'monthly',
    location_city VARCHAR(100),
    location_state VARCHAR(100),
    location_country VARCHAR(100) DEFAULT 'Nigeria',
    experience_required INTEGER,
    openings INTEGER DEFAULT 1,
    application_deadline DATE,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE job_skills (
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (job_id, skill_id)
);

CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    applicant_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'applied',
    cover_message TEXT,
    attached_cv_url VARCHAR(500),
    attached_portfolio_id UUID REFERENCES portfolio_items(id),
    attached_post_ids UUID[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, applicant_id)
);

CREATE TABLE application_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    old_status VARCHAR(30),
    new_status VARCHAR(30),
    changed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Messaging, Interactions & Moderation
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
    participant_one UUID REFERENCES users(id) ON DELETE CASCADE,
    participant_two UUID REFERENCES users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(participant_one, participant_two)
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'file', 'job_share', 'profile_share'
    attachment_url VARCHAR(500),
    shared_entity_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE likes (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);

CREATE TABLE saves (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);

CREATE TABLE follows (
    follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reported_entity_type VARCHAR(30) NOT NULL,
    reported_entity_id UUID NOT NULL,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(150),
    body TEXT,
    entity_type VARCHAR(30),
    entity_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5. Indexes
```sql
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_post_type ON posts(post_type);
CREATE INDEX idx_jobs_location ON jobs(location_state, location_city);
CREATE INDEX idx_jobs_employment_type ON jobs(employment_type);
CREATE INDEX idx_jobs_is_active ON jobs(is_active, created_at DESC);
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_applicant_id ON applications(applicant_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_conversations_participant_one ON conversations(participant_one);
CREATE INDEX idx_conversations_participant_two ON conversations(participant_two);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
```

---

## PART 5: PHASE 1 BUILD PLAN (FOUNDATION)

The engineering team (or AI builder) must execute in this exact order:

**Step 1: Project Scaffolding (Days 1-2)**
*   Initialize monorepo (Turborepo) with `apps/mobile` (Expo), `apps/web` (Next.js), `apps/api` (Node.js).
*   Set up shared TypeScript types package (`packages/types`).
*   Configure ESLint, Prettier, Husky pre-commit hooks.

**Step 2: Database & ORM (Days 3-4)**
*   Provision PostgreSQL instance.
*   Set up Prisma ORM.
*   Write the schema (from Part 4 above).
*   Run initial migration.
*   Seed database with skills and categories.

**Step 3: Authentication Service (Days 5-7)**
*   Build `users` table and auth endpoints.
*   Integrate Termii/Twilio for Phone OTP.
*   Implement JWT + Refresh Token logic.
*   Build React Native auth screens (Login, Register, OTP Verify).
*   Build Next.js auth pages for Employer/Admin.

**Step 4: Profile Service (Days 8-10)**
*   Build `profiles` and `employer_profiles` CRUD endpoints.
*   Build profile editing screens on mobile.
*   Implement image upload for avatars (S3 presigned URL).
*   Implement "Switch Mode" toggle in the mobile app.

**Step 5: Testing & QA (Days 11-12)**
*   Unit tests for auth and profile services.
*   Integration tests for OTP flow.
*   Manual QA on iOS and Android simulators.
*   Test on a real low-end Android device on a 3G network.

---

## PART 6: BUILDER INSTRUCTIONS

**To the AI Builder / Engineering Team:**

1.  **Do not deviate from the locked decisions** in Part 1. If a feature is marked "Out of Scope" in the PRD (Part 2, Section 4), do not build it.
2.  **Prioritize the core loop:** `CREATE → SHOW → DISCOVER → CONNECT → APPLY → HIRE`.
3.  **Optimize for the Nigerian/African network reality.** 720p max, aggressive compression, resume/retry uploads, lazy loading.
4.  **Trust is paramount.** Implement Phone OTP, permission-based messaging, and the reporting system from Day 1.
5.  **The "Showcase" is the product.** Ensure the video upload, processing, and feed playback experience is flawless before adding secondary features.
6.  **Start with Phase 1.** Do not attempt to build the entire app at once. Complete, test, and validate each step before moving to the next.

**End of Master Build Specification.**
