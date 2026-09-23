-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('seeker', 'employer', 'both', 'admin');

-- CreateEnum
CREATE TYPE "active_mode" AS ENUM ('seeker', 'employer');

-- CreateEnum
CREATE TYPE "post_type" AS ENUM ('showcase', 'job', 'service', 'company', 'project');

-- CreateEnum
CREATE TYPE "employment_type" AS ENUM ('full_time', 'part_time', 'freelance', 'gig', 'internship', 'local_service');

-- CreateEnum
CREATE TYPE "work_arrangement" AS ENUM ('on_site', 'hybrid', 'remote');

-- CreateEnum
CREATE TYPE "salary_period" AS ENUM ('hourly', 'daily', 'weekly', 'monthly', 'yearly', 'fixed');

-- CreateEnum
CREATE TYPE "application_status" AS ENUM ('applied', 'reviewing', 'shortlisted', 'interview', 'offer', 'hired', 'rejected');

-- CreateEnum
CREATE TYPE "message_type" AS ENUM ('text', 'image', 'file', 'job_share', 'profile_share');

-- CreateEnum
CREATE TYPE "proficiency" AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');

-- CreateEnum
CREATE TYPE "report_entity_type" AS ENUM ('post', 'job', 'user', 'message', 'comment');

-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('pending', 'reviewing', 'actioned', 'dismissed');

-- CreateTable
CREATE TABLE "countries" (
    "code" CHAR(2) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "dial_code" VARCHAR(6) NOT NULL,
    "currency_code" CHAR(3) NOT NULL,
    "currency_symbol" VARCHAR(8) NOT NULL,
    "phone_pattern" VARCHAR(100) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(60) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255),
    "phone" VARCHAR(20) NOT NULL,
    "country_code" CHAR(2) NOT NULL DEFAULT 'NG',
    "password_hash" VARCHAR(255),
    "is_phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_id_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_business_verified" BOOLEAN NOT NULL DEFAULT false,
    "role" "user_role" NOT NULL DEFAULT 'seeker',
    "active_mode" "active_mode" NOT NULL DEFAULT 'seeker',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active_at" TIMESTAMPTZ(6),
    "is_suspended" BOOLEAN NOT NULL DEFAULT false,
    "suspension_reason" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "full_name" VARCHAR(100),
    "headline" VARCHAR(150),
    "bio" TEXT,
    "avatar_url" VARCHAR(500),
    "location_city" VARCHAR(100),
    "location_state" VARCHAR(100),
    "location_country_code" CHAR(2) NOT NULL DEFAULT 'NG',
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "availability" VARCHAR(50),
    "experience_years" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "category_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_skills" (
    "profile_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "proficiency" "proficiency" NOT NULL DEFAULT 'intermediate',

    CONSTRAINT "profile_skills_pkey" PRIMARY KEY ("profile_id","skill_id")
);

-- CreateTable
CREATE TABLE "employer_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "company_name" VARCHAR(150),
    "company_logo_url" VARCHAR(500),
    "industry" VARCHAR(100),
    "company_size" VARCHAR(50),
    "website" VARCHAR(255),
    "description" TEXT,
    "location_city" VARCHAR(100),
    "location_state" VARCHAR(100),
    "location_country_code" CHAR(2) NOT NULL DEFAULT 'NG',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "post_type" "post_type" NOT NULL,
    "title" VARCHAR(150),
    "description" TEXT,
    "video_url" VARCHAR(500),
    "video_thumbnail_url" VARCHAR(500),
    "video_duration_seconds" INTEGER,
    "location_city" VARCHAR(100),
    "location_state" VARCHAR(100),
    "location_country_code" CHAR(2) NOT NULL DEFAULT 'NG',
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "is_flagged" BOOLEAN NOT NULL DEFAULT false,
    "flag_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "post_id" UUID,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "image_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "external_link" VARCHAR(500),
    "project_date" DATE,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_tags" (
    "post_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,

    CONSTRAINT "post_tags_pkey" PRIMARY KEY ("post_id","skill_id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employer_id" UUID NOT NULL,
    "post_id" UUID,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT NOT NULL,
    "employment_type" "employment_type" NOT NULL,
    "work_arrangement" "work_arrangement" NOT NULL DEFAULT 'on_site',
    "salary_min" DECIMAL(12,2),
    "salary_max" DECIMAL(12,2),
    "salary_currency" CHAR(3) NOT NULL DEFAULT 'NGN',
    "salary_period" "salary_period" NOT NULL DEFAULT 'monthly',
    "location_city" VARCHAR(100),
    "location_state" VARCHAR(100),
    "location_country_code" CHAR(2) NOT NULL DEFAULT 'NG',
    "experience_required" INTEGER,
    "openings" INTEGER NOT NULL DEFAULT 1,
    "application_deadline" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_skills" (
    "job_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,

    CONSTRAINT "job_skills_pkey" PRIMARY KEY ("job_id","skill_id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "applicant_id" UUID NOT NULL,
    "status" "application_status" NOT NULL DEFAULT 'applied',
    "cover_message" TEXT,
    "attached_cv_url" VARCHAR(500),
    "attached_portfolio_id" UUID,
    "attached_post_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "old_status" "application_status",
    "new_status" "application_status" NOT NULL,
    "changed_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID,
    "participant_one" UUID NOT NULL,
    "participant_two" UUID NOT NULL,
    "last_message_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "content" TEXT,
    "message_type" "message_type" NOT NULL DEFAULT 'text',
    "attachment_url" VARCHAR(500),
    "shared_entity_id" UUID,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "likes" (
    "user_id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "likes_pkey" PRIMARY KEY ("user_id","post_id")
);

-- CreateTable
CREATE TABLE "saves" (
    "user_id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saves_pkey" PRIMARY KEY ("user_id","post_id")
);

-- CreateTable
CREATE TABLE "follows" (
    "follower_id" UUID NOT NULL,
    "following_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("follower_id","following_id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reporter_id" UUID NOT NULL,
    "reported_entity_type" "report_entity_type" NOT NULL,
    "reported_entity_id" UUID NOT NULL,
    "reason" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "status" "report_status" NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(150),
    "body" TEXT,
    "entity_type" VARCHAR(30),
    "entity_id" UUID,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_username_key" ON "profiles"("username");

-- CreateIndex
CREATE INDEX "idx_profiles_location" ON "profiles"("location_country_code", "location_state", "location_city");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE UNIQUE INDEX "skills_slug_key" ON "skills"("slug");

-- CreateIndex
CREATE INDEX "idx_skills_category_id" ON "skills"("category_id");

-- CreateIndex
CREATE INDEX "idx_profile_skills_skill_id" ON "profile_skills"("skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "employer_profiles_user_id_key" ON "employer_profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_employer_profiles_location" ON "employer_profiles"("location_country_code", "location_state", "location_city");

-- CreateIndex
CREATE INDEX "idx_posts_created_at" ON "posts"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_posts_user_id" ON "posts"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_posts_post_type" ON "posts"("post_type", "is_published", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_posts_feed" ON "posts"("is_published", "is_flagged", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_posts_location" ON "posts"("location_country_code", "location_state", "location_city");

-- CreateIndex
CREATE INDEX "idx_portfolio_items_profile_id" ON "portfolio_items"("profile_id", "is_pinned");

-- CreateIndex
CREATE INDEX "idx_portfolio_items_post_id" ON "portfolio_items"("post_id");

-- CreateIndex
CREATE INDEX "idx_post_tags_skill_id" ON "post_tags"("skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_post_id_key" ON "jobs"("post_id");

-- CreateIndex
CREATE INDEX "idx_jobs_location" ON "jobs"("location_country_code", "location_state", "location_city");

-- CreateIndex
CREATE INDEX "idx_jobs_employment_type" ON "jobs"("employment_type", "is_active");

-- CreateIndex
CREATE INDEX "idx_jobs_is_active" ON "jobs"("is_active", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_jobs_employer_id" ON "jobs"("employer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_job_skills_skill_id" ON "job_skills"("skill_id");

-- CreateIndex
CREATE INDEX "idx_applications_job_id" ON "applications"("job_id", "status");

-- CreateIndex
CREATE INDEX "idx_applications_applicant_id" ON "applications"("applicant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_applications_status" ON "applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "applications_job_id_applicant_id_key" ON "applications"("job_id", "applicant_id");

-- CreateIndex
CREATE INDEX "idx_application_status_history_application_id" ON "application_status_history"("application_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_conversations_participant_one" ON "conversations"("participant_one", "last_message_at" DESC);

-- CreateIndex
CREATE INDEX "idx_conversations_participant_two" ON "conversations"("participant_two", "last_message_at" DESC);

-- CreateIndex
CREATE INDEX "idx_conversations_application_id" ON "conversations"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_participant_one_participant_two_key" ON "conversations"("participant_one", "participant_two");

-- CreateIndex
CREATE INDEX "idx_messages_conversation_id" ON "messages"("conversation_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_messages_sender_id" ON "messages"("sender_id");

-- CreateIndex
CREATE INDEX "idx_likes_post_id" ON "likes"("post_id");

-- CreateIndex
CREATE INDEX "idx_saves_post_id" ON "saves"("post_id");

-- CreateIndex
CREATE INDEX "idx_follows_following_id" ON "follows"("following_id");

-- CreateIndex
CREATE INDEX "idx_reports_status" ON "reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "idx_reports_entity" ON "reports"("reported_entity_type", "reported_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "reports_reporter_id_reported_entity_type_reported_entity_id_key" ON "reports"("reporter_id", "reported_entity_type", "reported_entity_id");

-- CreateIndex
CREATE INDEX "idx_notifications_user_unread" ON "notifications"("user_id", "is_read", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_location_country_code_fkey" FOREIGN KEY ("location_country_code") REFERENCES "countries"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_skills" ADD CONSTRAINT "profile_skills_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_skills" ADD CONSTRAINT "profile_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employer_profiles" ADD CONSTRAINT "employer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employer_profiles" ADD CONSTRAINT "employer_profiles_location_country_code_fkey" FOREIGN KEY ("location_country_code") REFERENCES "countries"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_location_country_code_fkey" FOREIGN KEY ("location_country_code") REFERENCES "countries"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_employer_id_fkey" FOREIGN KEY ("employer_id") REFERENCES "employer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_location_country_code_fkey" FOREIGN KEY ("location_country_code") REFERENCES "countries"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_attached_portfolio_id_fkey" FOREIGN KEY ("attached_portfolio_id") REFERENCES "portfolio_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_status_history" ADD CONSTRAINT "application_status_history_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_status_history" ADD CONSTRAINT "application_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant_one_fkey" FOREIGN KEY ("participant_one") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant_two_fkey" FOREIGN KEY ("participant_two") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saves" ADD CONSTRAINT "saves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saves" ADD CONSTRAINT "saves_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
