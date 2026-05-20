-- Create missing vehicle-related enum types
DO $$ BEGIN
  CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'IN_SERVICE', 'WAITING_PARTS', 'READY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FuelType" AS ENUM ('BENZINA', 'DIESEL', 'GPL', 'METANO', 'IBRIDO_BENZINA', 'IBRIDO_DIESEL', 'ELETTRICO', 'IDROGENO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TransmissionType" AS ENUM ('MANUALE', 'AUTOMATICO', 'CVT', 'ROBOTIZZATO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DriveType" AS ENUM ('FWD', 'RWD', 'AWD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add missing columns to vehicles table
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "status" "VehicleStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "mileage" INTEGER;
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "fuel_type" "FuelType";
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "engine_displacement" INTEGER;
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "power" INTEGER;
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "transmission_type" "TransmissionType";
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "color" TEXT;
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "drive_type" "DriveType";
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "registration_date" TIMESTAMP(3);
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "insurance_expiry" TIMESTAMP(3);
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "tax_expiry" TIMESTAMP(3);
