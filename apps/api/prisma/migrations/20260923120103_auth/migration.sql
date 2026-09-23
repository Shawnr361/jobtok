-- CreateEnum
CREATE TYPE "auth_client" AS ENUM ('web', 'mobile');

-- CreateEnum
CREATE TYPE "otp_purpose" AS ENUM ('login', 'verify_phone');

-- CreateEnum
CREATE TYPE "auth_token_purpose" AS ENUM ('email_verification', 'password_reset');

-- CreateEnum
CREATE TYPE "oauth_provider" AS ENUM ('google');

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "client" "auth_client" NOT NULL,
    "refresh_token_hash" CHAR(64) NOT NULL,
    "previous_refresh_token_hash" CHAR(64),
    "user_agent" VARCHAR(255),
    "ip_address" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "revoke_reason" VARCHAR(50),

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_challenges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone" VARCHAR(20) NOT NULL,
    "purpose" "otp_purpose" NOT NULL,
    "user_id" UUID,
    "code_hash" CHAR(64) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "superseded_at" TIMESTAMPTZ(6),
    "requested_ip" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "purpose" "auth_token_purpose" NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" "oauth_provider" NOT NULL,
    "provider_account_id" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_refresh_token_hash_key" ON "auth_sessions"("refresh_token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_previous_refresh_token_hash_key" ON "auth_sessions"("previous_refresh_token_hash");

-- CreateIndex
CREATE INDEX "idx_auth_sessions_user_id" ON "auth_sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "idx_otp_challenges_phone" ON "otp_challenges"("phone", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "auth_tokens_token_hash_key" ON "auth_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_auth_tokens_user_purpose" ON "auth_tokens"("user_id", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_provider_provider_account_id_key" ON "oauth_accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_user_id_provider_key" ON "oauth_accounts"("user_id", "provider");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_challenges" ADD CONSTRAINT "otp_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Constraints & triggers (hand-written) ──────────────────────────────────

-- users.phone is now set only after OTP verification. Every account needs at least one
-- way to sign in, and "phone verified" always means a phone is stored.
ALTER TABLE users
  ADD CONSTRAINT users_has_identifier CHECK (phone IS NOT NULL OR email IS NOT NULL),
  ADD CONSTRAINT users_phone_verified_has_phone CHECK (NOT is_phone_verified OR phone IS NOT NULL);

-- Same rules as Step 2, but a NULL phone (email/Google sign-up) is allowed.
CREATE OR REPLACE FUNCTION users_validate_country_phone() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  c countries%ROWTYPE;
BEGIN
  SELECT * INTO c FROM countries WHERE code = NEW.country_code;
  IF TG_OP = 'INSERT' AND NOT c.is_enabled THEN
    RAISE EXCEPTION 'users_country_enabled: Country % is not enabled for sign-up', NEW.country_code
      USING ERRCODE = 'check_violation', CONSTRAINT = 'users_country_enabled';
  END IF;
  IF NEW.phone IS NOT NULL AND (
       left(NEW.phone, length(c.dial_code)) <> c.dial_code
       OR substr(NEW.phone, length(c.dial_code) + 1) !~ c.phone_pattern
     ) THEN
    RAISE EXCEPTION 'users_phone_matches_country: Phone % is not valid for country %', NEW.phone, NEW.country_code
      USING ERRCODE = 'check_violation', CONSTRAINT = 'users_phone_matches_country';
  END IF;
  RETURN NEW;
END $$;

ALTER TABLE auth_sessions
  ADD CONSTRAINT auth_sessions_refresh_hash_format CHECK (refresh_token_hash ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT auth_sessions_expiry_after_creation CHECK (expires_at > created_at),
  ADD CONSTRAINT auth_sessions_revoke_reason CHECK (revoked_at IS NULL OR revoke_reason IS NOT NULL);

ALTER TABLE otp_challenges
  ADD CONSTRAINT otp_challenges_phone_e164 CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),
  ADD CONSTRAINT otp_challenges_code_hash_format CHECK (code_hash ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT otp_challenges_attempts_range CHECK (attempts >= 0 AND attempts <= max_attempts),
  ADD CONSTRAINT otp_challenges_verify_phone_has_user CHECK (purpose <> 'verify_phone' OR user_id IS NOT NULL);

ALTER TABLE auth_tokens
  ADD CONSTRAINT auth_tokens_hash_format CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT auth_tokens_email_lowercase CHECK (email = lower(email));

ALTER TABLE oauth_accounts
  ADD CONSTRAINT oauth_accounts_subject_not_blank CHECK (btrim(provider_account_id) <> ''),
  ADD CONSTRAINT oauth_accounts_email_lowercase CHECK (email IS NULL OR email = lower(email));
