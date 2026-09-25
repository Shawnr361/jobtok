-- Profile photos: an uploaded, re-encoded JPEG kept in media storage.

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "avatar_storage_key" VARCHAR(100);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_avatar_storage_key_key" ON "profiles"("avatar_storage_key");

-- Only keys the server itself generates (no paths, no other folders).
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_avatar_storage_key_format"
  CHECK ("avatar_storage_key" IS NULL OR "avatar_storage_key" ~ '^avatars/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$');
