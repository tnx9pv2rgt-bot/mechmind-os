-- ==========================================
-- Migration: Add Notification System
-- Adds Notification model and related enums
-- ==========================================

-- Create NotificationType enum
DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM (
    'BOOKING_REMINDER',
    'BOOKING_CONFIRMATION',
    'STATUS_UPDATE',
    'INVOICE_READY',
    'MAINTENANCE_DUE',
    'INSPECTION_COMPLETE',
    'PAYMENT_REMINDER'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Create NotificationChannel enum
DO $$ BEGIN
  CREATE TYPE "NotificationChannel" AS ENUM (
    'SMS',
    'WHATSAPP',
    'EMAIL'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Create NotificationStatus enum
DO $$ BEGIN
  CREATE TYPE "NotificationStatus" AS ENUM (
    'PENDING',
    'SENT',
    'DELIVERED',
    'FAILED',
    'READ'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Create CustomerNotificationPreference table
CREATE TABLE IF NOT EXISTS "customer_notification_preferences" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "customer_id" UUID NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "channel" "NotificationChannel" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE("customer_id", "channel")
);

-- Create Notification table
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "customer_id" UUID NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  
  "type" "NotificationType" NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  
  "message" TEXT NOT NULL,
  "message_id" TEXT, -- Twilio message ID
  
  "sent_at" TIMESTAMPTZ,
  "delivered_at" TIMESTAMPTZ,
  "failed_at" TIMESTAMPTZ,
  "error" TEXT,
  
  "retries" INTEGER NOT NULL DEFAULT 0,
  "max_retries" INTEGER NOT NULL DEFAULT 3,
  
  "metadata" JSONB, -- bookingId, invoiceId, etc.
  
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_notifications_customer_id" ON "notifications"("customer_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_tenant_id" ON "notifications"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_status" ON "notifications"("status");
CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON "notifications"("created_at");
CREATE INDEX IF NOT EXISTS "idx_notifications_type" ON "notifications"("type");
CREATE INDEX IF NOT EXISTS "idx_notifications_channel" ON "notifications"("channel");
CREATE INDEX IF NOT EXISTS "idx_notifications_pending" ON "notifications"("status", "retries", "max_retries") WHERE "status" = 'PENDING' OR "status" = 'FAILED';
CREATE INDEX IF NOT EXISTS "idx_customer_prefs_customer_id" ON "customer_notification_preferences"("customer_id");

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notifications_updated_at ON "notifications";
CREATE TRIGGER trigger_notifications_updated_at
  BEFORE UPDATE ON "notifications"
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

DROP TRIGGER IF EXISTS trigger_customer_prefs_updated_at ON "customer_notification_preferences";
CREATE TRIGGER trigger_customer_prefs_updated_at
  BEFORE UPDATE ON "customer_notification_preferences"
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- Add comment for documentation
COMMENT ON TABLE "notifications" IS 'Stores all SMS, WhatsApp and Email notifications sent to customers';
COMMENT ON TABLE "customer_notification_preferences" IS 'Customer preferences for notification channels';
