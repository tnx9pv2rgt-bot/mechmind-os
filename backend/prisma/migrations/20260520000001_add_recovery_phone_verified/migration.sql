-- AddColumn: recovery_phone_verified to users
-- This column was added to the Prisma schema but the migration was missing.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "recovery_phone_verified" BOOLEAN NOT NULL DEFAULT false;
