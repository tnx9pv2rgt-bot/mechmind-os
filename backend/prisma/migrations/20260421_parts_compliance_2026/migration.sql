-- EU Right to Repair 2024/1799 + D.Lgs. 206/2005 compliance fields
-- Traceability: part type, warranty months by type, origin code, barcode

DO $$ BEGIN
  CREATE TYPE "PartType" AS ENUM ('GENUINE', 'AFTERMARKET', 'REGENERATED', 'USED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "parts"
  ADD COLUMN IF NOT EXISTS "part_type"       "PartType" NOT NULL DEFAULT 'GENUINE',
  ADD COLUMN IF NOT EXISTS "warranty_months" INTEGER    NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS "origin_code"     TEXT,
  ADD COLUMN IF NOT EXISTS "barcode"         TEXT;
