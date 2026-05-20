-- Create RENTRI waste management enum types
DO $$ BEGIN
  CREATE TYPE "WasteEntryType" AS ENUM ('CARICO', 'SCARICO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WasteFirStatus" AS ENUM ('DRAFT', 'VIDIMATED', 'IN_TRANSIT', 'DELIVERED', 'CONFIRMED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WastePhysicalState" AS ENUM ('SOLIDO', 'LIQUIDO', 'FANGOSO', 'POLVERULENTO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WasteHazardClass" AS ENUM ('PERICOLOSO', 'NON_PERICOLOSO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create waste_transporters table
CREATE TABLE IF NOT EXISTS "waste_transporters" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fiscal_code" TEXT NOT NULL,
    "albo_category_no" TEXT,
    "albo_category" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waste_transporters_pkey" PRIMARY KEY ("id")
);

-- Create waste_destinations table
CREATE TABLE IF NOT EXISTS "waste_destinations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fiscal_code" TEXT NOT NULL,
    "authorization_no" TEXT,
    "operation_type" TEXT,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waste_destinations_pkey" PRIMARY KEY ("id")
);

-- Create waste_firs table (depends on waste_transporters + waste_destinations)
CREATE TABLE IF NOT EXISTS "waste_firs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "fir_number" TEXT NOT NULL,
    "status" "WasteFirStatus" NOT NULL DEFAULT 'DRAFT',
    "vivifir_code" TEXT,
    "cer_code" TEXT NOT NULL,
    "cer_description" TEXT NOT NULL,
    "hazard_class" "WasteHazardClass" NOT NULL,
    "physical_state" "WastePhysicalState" NOT NULL,
    "quantity_kg" DECIMAL(10,3) NOT NULL,
    "quantity_units" INTEGER,
    "unit_type" TEXT,
    "producer_name" TEXT NOT NULL,
    "producer_fiscal_code" TEXT NOT NULL,
    "producer_address" TEXT NOT NULL,
    "producer_registration_no" TEXT,
    "transporter_id" TEXT NOT NULL,
    "destination_id" TEXT NOT NULL,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "pickup_date" TIMESTAMP(3),
    "delivery_date" TIMESTAMP(3),
    "confirmation_date" TIMESTAMP(3),
    "adr_class" TEXT,
    "adr_un_number" TEXT,
    "vehicle_plate" TEXT,
    "notes" TEXT,
    "pdf_url" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waste_firs_pkey" PRIMARY KEY ("id")
);

-- Create waste_entries table (depends on waste_transporters + waste_destinations + waste_firs)
CREATE TABLE IF NOT EXISTS "waste_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "entry_number" TEXT NOT NULL,
    "entry_type" "WasteEntryType" NOT NULL,
    "entry_date" TIMESTAMP(3) NOT NULL,
    "cer_code" TEXT NOT NULL,
    "cer_description" TEXT NOT NULL,
    "hazard_class" "WasteHazardClass" NOT NULL,
    "physical_state" "WastePhysicalState" NOT NULL,
    "quantity_kg" DECIMAL(10,3) NOT NULL,
    "quantity_units" INTEGER,
    "unit_type" TEXT,
    "origin_description" TEXT,
    "is_own_production" BOOLEAN NOT NULL DEFAULT true,
    "transporter_id" TEXT,
    "destination_id" TEXT,
    "fir_id" TEXT,
    "work_order_id" TEXT,
    "storage_location_code" TEXT,
    "stored_since" TIMESTAMP(3),
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waste_entries_pkey" PRIMARY KEY ("id")
);

-- Foreign key constraints
ALTER TABLE "waste_transporters" ADD CONSTRAINT "waste_transporters_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "waste_destinations" ADD CONSTRAINT "waste_destinations_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "waste_firs" ADD CONSTRAINT "waste_firs_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "waste_firs" ADD CONSTRAINT "waste_firs_transporter_id_fkey"
    FOREIGN KEY ("transporter_id") REFERENCES "waste_transporters"("id") ON UPDATE CASCADE;

ALTER TABLE "waste_firs" ADD CONSTRAINT "waste_firs_destination_id_fkey"
    FOREIGN KEY ("destination_id") REFERENCES "waste_destinations"("id") ON UPDATE CASCADE;

ALTER TABLE "waste_entries" ADD CONSTRAINT "waste_entries_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "waste_entries" ADD CONSTRAINT "waste_entries_transporter_id_fkey"
    FOREIGN KEY ("transporter_id") REFERENCES "waste_transporters"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "waste_entries" ADD CONSTRAINT "waste_entries_destination_id_fkey"
    FOREIGN KEY ("destination_id") REFERENCES "waste_destinations"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "waste_entries" ADD CONSTRAINT "waste_entries_fir_id_fkey"
    FOREIGN KEY ("fir_id") REFERENCES "waste_firs"("id") ON UPDATE CASCADE ON DELETE SET NULL;

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "waste_transporters_tenant_id_fiscal_code_key" ON "waste_transporters"("tenant_id", "fiscal_code");
CREATE UNIQUE INDEX IF NOT EXISTS "waste_destinations_tenant_id_fiscal_code_key" ON "waste_destinations"("tenant_id", "fiscal_code");
CREATE UNIQUE INDEX IF NOT EXISTS "waste_firs_tenant_id_fir_number_key" ON "waste_firs"("tenant_id", "fir_number");
CREATE UNIQUE INDEX IF NOT EXISTS "waste_entries_tenant_id_entry_number_key" ON "waste_entries"("tenant_id", "entry_number");

-- Indexes
CREATE INDEX IF NOT EXISTS "waste_transporters_tenant_id_idx" ON "waste_transporters"("tenant_id");
CREATE INDEX IF NOT EXISTS "waste_destinations_tenant_id_idx" ON "waste_destinations"("tenant_id");
CREATE INDEX IF NOT EXISTS "waste_firs_tenant_id_idx" ON "waste_firs"("tenant_id");
CREATE INDEX IF NOT EXISTS "waste_firs_tenant_id_status_idx" ON "waste_firs"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "waste_firs_tenant_id_scheduled_date_idx" ON "waste_firs"("tenant_id", "scheduled_date");
CREATE INDEX IF NOT EXISTS "waste_entries_tenant_id_idx" ON "waste_entries"("tenant_id");
CREATE INDEX IF NOT EXISTS "waste_entries_tenant_id_cer_code_idx" ON "waste_entries"("tenant_id", "cer_code");
CREATE INDEX IF NOT EXISTS "waste_entries_tenant_id_entry_date_idx" ON "waste_entries"("tenant_id", "entry_date");
CREATE INDEX IF NOT EXISTS "waste_entries_tenant_id_entry_type_idx" ON "waste_entries"("tenant_id", "entry_type");
CREATE INDEX IF NOT EXISTS "waste_entries_work_order_id_idx" ON "waste_entries"("work_order_id");
CREATE INDEX IF NOT EXISTS "waste_entries_fir_id_idx" ON "waste_entries"("fir_id");
