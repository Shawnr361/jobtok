-- AlterTable
ALTER TABLE "portfolio_items" ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "profile_skills" ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "first_name" VARCHAR(50),
ADD COLUMN     "last_name" VARCHAR(50);

-- AlterTable
ALTER TABLE "skills" ADD COLUMN     "is_curated" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "profile_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "label" VARCHAR(40) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_profile_links_profile_id" ON "profile_links"("profile_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "profile_links_profile_id_url_key" ON "profile_links"("profile_id", "url");

-- AddForeignKey
ALTER TABLE "profile_links" ADD CONSTRAINT "profile_links_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Data backfill (non-destructive) ─────────────────────────────────────────

-- Everything in the skills table so far came from the curated seed taxonomy.
UPDATE "skills" SET "is_curated" = true;

-- Availability moves to a small fixed set (open_to_projects | open_to_collaborate | busy).
UPDATE "profiles"
   SET "availability" = CASE
         WHEN "availability" IN ('open_to_projects', 'open_to_collaborate', 'busy') THEN "availability"
         WHEN "availability" IN ('available', 'freelance', 'open') THEN 'open_to_projects'
         ELSE NULL
       END;

-- Usernames become lowercase handles; anything that doesn't fit gets a neutral one.
UPDATE "profiles" SET "username" = lower("username");
UPDATE "profiles"
   SET "username" = 'creator_' || substr(replace("id"::text, '-', ''), 1, 12)
 WHERE NOT (char_length("username") BETWEEN 3 AND 30
            AND "username" ~ '^[a-z0-9_]([a-z0-9._]*[a-z0-9_])?$'
            AND position('..' in "username") = 0);

-- ─── Constraints ─────────────────────────────────────────────────────────────

-- Replaces the looser rule from the constraints migration: also no dot at either end or twice.
ALTER TABLE "profiles"
  DROP CONSTRAINT "profiles_username_format",
  ADD CONSTRAINT "profiles_username_format" CHECK (
    char_length("username") BETWEEN 3 AND 30
    AND "username" ~ '^[a-z0-9_]([a-z0-9._]*[a-z0-9_])?$'
    AND position('..' in "username") = 0
  ),
  ADD CONSTRAINT "profiles_availability_valid" CHECK (
    "availability" IS NULL OR "availability" IN ('open_to_projects', 'open_to_collaborate', 'busy')
  );

ALTER TABLE "profile_links"
  ADD CONSTRAINT "profile_links_url_http" CHECK ("url" ~* '^https?://[^[:space:]]+$'),
  ADD CONSTRAINT "profile_links_label_not_blank" CHECK (char_length(btrim("label")) > 0);

-- portfolio_items already has title/link checks (constraints migration); keep updated_at fresh
-- the same way as the other tables.
CREATE TRIGGER portfolio_items_set_updated_at BEFORE UPDATE ON "portfolio_items"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
