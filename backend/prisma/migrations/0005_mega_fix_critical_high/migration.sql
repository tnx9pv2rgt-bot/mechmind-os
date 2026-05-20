-- MEGA-FIX Migration: CRITICAL + HIGH fixes
-- Generated: 2026-03-17
-- All statements wrapped with IF EXISTS checks for safety

-- P001: Add tenantId to Vehicle (populate from Customer.tenantId)
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;

-- Populate Vehicle.tenantId from Customer.tenantId
UPDATE "vehicles" v
SET "tenant_id" = c."tenant_id"
FROM "customers" c
WHERE v."customer_id" = c."id"
  AND v."tenant_id" IS NULL;

-- For vehicles without customers, try via bookings
UPDATE "vehicles" v
SET "tenant_id" = b."tenant_id"
FROM "bookings" b
WHERE b."vehicle_id" = v."id"
  AND v."tenant_id" IS NULL;

-- Set default for any remaining NULLs before making NOT NULL
UPDATE "vehicles" SET "tenant_id" = '' WHERE "tenant_id" IS NULL;

-- Make tenant_id NOT NULL after population
ALTER TABLE "vehicles" ALTER COLUMN "tenant_id" SET NOT NULL;

-- Add FK constraint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_tenant_id_fkey') THEN
    ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Add index
CREATE INDEX IF NOT EXISTS "vehicles_tenant_id_idx" ON "vehicles"("tenant_id");

-- P002: Add tenantId to SmsOtp (only if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sms_otps') THEN
    ALTER TABLE "sms_otps" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL DEFAULT '';
    CREATE UNIQUE INDEX IF NOT EXISTS "sms_otps_tenant_id_phone_key" ON "sms_otps"("tenant_id", "phone");
  END IF;
END $$;

-- P003: Campaign FK to Tenant (only if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campaigns')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaigns_tenant_id_fkey')
  THEN
    ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- P004: Add version field to WorkOrder for optimistic locking
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;

-- P005: Add stripeEventId to Invoice for payment idempotency
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "stripe_event_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_stripe_event_id_key" ON "invoices"("stripe_event_id");

-- P007: Partial unique index for active timers (prevents race condition)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'technician_time_logs') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "active_timer_unique"
      ON "technician_time_logs" ("work_order_id", "technician_id")
      WHERE "stopped_at" IS NULL;
  END IF;
END $$;

-- P016: Invoice.invoiceNumber per-tenant unique (replace global unique)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'tenant_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'invoice_number')
  THEN
    DROP INDEX IF EXISTS "invoices_invoice_number_key";
    CREATE UNIQUE INDEX IF NOT EXISTS "invoices_tenant_id_invoice_number_key" ON "invoices"("tenant_id", "invoice_number");
  END IF;
END $$;

-- P017: WorkOrder.woNumber per-tenant unique
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'work_orders' AND column_name = 'wo_number') THEN
    DROP INDEX IF EXISTS "work_orders_wo_number_key";
    CREATE UNIQUE INDEX IF NOT EXISTS "work_orders_tenant_id_wo_number_key" ON "work_orders"("tenant_id", "wo_number");
  END IF;
END $$;

-- P018: Estimate.estimateNumber per-tenant unique
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'estimates' AND column_name = 'estimate_number') THEN
    DROP INDEX IF EXISTS "estimates_estimate_number_key";
    CREATE UNIQUE INDEX IF NOT EXISTS "estimates_tenant_id_estimate_number_key" ON "estimates"("tenant_id", "estimate_number");
  END IF;
END $$;

-- PurchaseOrder.orderNumber per-tenant unique
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'order_number') THEN
    DROP INDEX IF EXISTS "purchase_orders_order_number_key";
    CREATE UNIQUE INDEX IF NOT EXISTS "purchase_orders_tenant_id_order_number_key" ON "purchase_orders"("tenant_id", "order_number");
  END IF;
END $$;

-- Supplier.code per-tenant unique
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suppliers' AND column_name = 'code') THEN
    DROP INDEX IF EXISTS "suppliers_code_key";
    CREATE UNIQUE INDEX IF NOT EXISTS "suppliers_tenant_id_code_key" ON "suppliers"("tenant_id", "code");
  END IF;
END $$;

-- P022: Add idempotencyKey to Booking
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_idempotency_key_key" ON "bookings"("idempotency_key");

-- P028: Add tenantId to PromoCode (only if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'promo_codes') THEN
    ALTER TABLE "promo_codes" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
    DROP INDEX IF EXISTS "promo_codes_code_key";
    CREATE UNIQUE INDEX IF NOT EXISTS "promo_codes_tenant_id_code_key" ON "promo_codes"("tenant_id", "code");
  END IF;
END $$;

-- P031: MagicLink.tenantId make required (use correct table name)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'magic_links') THEN
    -- Populate tenantId from associated User
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'magic_links' AND column_name = 'user_id') THEN
      UPDATE "magic_links" ml
      SET "tenant_id" = u."tenant_id"
      FROM "users" u
      WHERE ml."user_id" = u."id" AND ml."tenant_id" IS NULL;
    END IF;

    -- Remove orphaned records without tenant
    DELETE FROM "magic_links" WHERE "tenant_id" IS NULL;

    ALTER TABLE "magic_links" ALTER COLUMN "tenant_id" SET NOT NULL;
  END IF;
END $$;

-- P039: Add createdAt indexes to high-traffic tables
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'booking_events') THEN
    CREATE INDEX IF NOT EXISTS "booking_events_created_at_idx" ON "booking_events"("created_at");
  END IF;
END $$;

-- P040: Add deletedAt for soft delete
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;

-- P044: CannedJob unique per tenant (only if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'canned_jobs') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "canned_jobs_tenant_id_name_key" ON "canned_jobs"("tenant_id", "name");
  END IF;
END $$;

-- P066: DataRetentionExecutionLog — change onDelete to Cascade
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'data_retention_execution_logs') THEN
    ALTER TABLE "data_retention_execution_logs" DROP CONSTRAINT IF EXISTS "data_retention_execution_logs_tenant_id_fkey";
    ALTER TABLE "data_retention_execution_logs" ADD CONSTRAINT "data_retention_execution_logs_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- P038: SensorReading FK relations (only if tables exist)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sensor_readings')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sensors')
  THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sensor_readings_sensor_id_fkey') THEN
      ALTER TABLE "sensor_readings" ADD CONSTRAINT "sensor_readings_sensor_id_fkey"
        FOREIGN KEY ("sensor_id") REFERENCES "sensors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sensor_readings')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_bays')
  THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sensor_readings_bay_id_fkey') THEN
      ALTER TABLE "sensor_readings" ADD CONSTRAINT "sensor_readings_bay_id_fkey"
        FOREIGN KEY ("bay_id") REFERENCES "service_bays"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;

-- P008: RLS policies for Vehicle (now that it has tenantId)
ALTER TABLE "vehicles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vehicles" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "vehicles";
CREATE POLICY tenant_isolation ON "vehicles"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::text);

-- P040 (vehicles): Add soft-delete column to vehicles (GDPR)
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;

-- P045: Per-tenant unique license plate (active vehicles only)
CREATE UNIQUE INDEX IF NOT EXISTS "vehicle_tenant_plate_unique"
ON "vehicles" ("tenant_id", "license_plate")
WHERE "deleted_at" IS NULL;
