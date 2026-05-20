-- Create missing enum types
DO $$ BEGIN
  CREATE TYPE "CustomerType" AS ENUM ('PERSONA', 'AZIENDA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ContactChannel" AS ENUM ('PHONE', 'EMAIL', 'SMS', 'WHATSAPP');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CustomerSource" AS ENUM ('GOOGLE', 'PASSAPAROLA', 'SOCIAL', 'VOLANTINO', 'WALK_IN', 'PORTAL', 'ALTRO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add missing columns to customers table
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "email_hash" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "password_hash" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "search_name" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "customer_type" "CustomerType" NOT NULL DEFAULT 'PERSONA';
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "codice_fiscale" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "partita_iva" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "sdi_code" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "pec_email" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "postal_code" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "province" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "country" TEXT NOT NULL DEFAULT 'IT';
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "preferred_channel" "ContactChannel";
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "preferred_language" TEXT DEFAULT 'it';
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "source" "CustomerSource";

-- Add missing indexes on customers
CREATE INDEX IF NOT EXISTS "customers_email_hash_idx" ON "customers"("email_hash");
CREATE INDEX IF NOT EXISTS "customers_tenant_id_search_name_idx" ON "customers"("tenant_id", "search_name");

-- Add missing columns to bookings table
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "technician_id" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "lift_position" TEXT;
