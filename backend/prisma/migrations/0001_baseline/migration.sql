-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'MECHANIC', 'RECEPTIONIST', 'VIEWER');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('AVAILABLE', 'BOOKED', 'BLOCKED', 'RESERVED');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('WEB', 'VOICE', 'PHONE', 'WALK_IN', 'APP');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('IN_PROGRESS', 'PENDING_REVIEW', 'READY_FOR_CUSTOMER', 'CUSTOMER_REVIEWING', 'APPROVED', 'DECLINED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InspectionItemStatus" AS ENUM ('PENDING', 'CHECKED', 'ISSUE_FOUND', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "FindingSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'OK');

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('REPORTED', 'PENDING_APPROVAL', 'APPROVED', 'DECLINED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "FuelLevel" AS ENUM ('EMPTY', 'QUARTER', 'HALF', 'THREE_QUARTERS', 'FULL');

-- CreateEnum
CREATE TYPE "TroubleCodeSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT', 'RETURN', 'TRANSFER');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'SENT', 'ACKNOWLEDGED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('PENDING', 'CHECKED_IN', 'IN_PROGRESS', 'WAITING_PARTS', 'QUALITY_CHECK', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ServiceBayStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE', 'CLEANING');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BOOKING_REMINDER', 'BOOKING_CONFIRMATION', 'STATUS_UPDATE', 'INVOICE_READY', 'MAINTENANCE_DUE', 'INSPECTION_COMPLETE', 'PAYMENT_REMINDER');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('SMALL', 'MEDIUM', 'ENTERPRISE', 'TRIAL');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'UNPAID', 'CANCELLED', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "FeatureFlag" AS ENUM ('AI_INSPECTIONS', 'MULTI_LOCATION', 'API_ACCESS', 'ADVANCED_REPORTS', 'CUSTOM_BRANDING', 'PRIORITY_SUPPORT', 'WHITE_LABEL', 'BLOCKCHAIN_VERIFICATION', 'VOICE_ASSISTANT', 'OBD_INTEGRATION', 'INVENTORY_MANAGEMENT', 'CUSTOM_INTEGRATIONS', 'DEDICATED_MANAGER', 'SLA_GUARANTEE');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('GDPR', 'MARKETING', 'CALL_RECORDING', 'DATA_SHARING', 'THIRD_PARTY', 'ANALYTICS');

-- CreateEnum
CREATE TYPE "EntryExitType" AS ENUM ('ENTRY', 'EXIT');

-- CreateEnum
CREATE TYPE "ParkingSessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TireSeason" AS ENUM ('SUMMER', 'WINTER', 'ALL_SEASON');

-- CreateEnum
CREATE TYPE "EstimateStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "EstimateLineType" AS ENUM ('LABOR', 'PART', 'OTHER');

-- CreateEnum
CREATE TYPE "AccountingProvider" AS ENUM ('QUICKBOOKS', 'XERO', 'FATTUREINCLOUD');

-- CreateEnum
CREATE TYPE "AccountingSyncStatus" AS ENUM ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "api_key_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" TIMESTAMP(3),
    "password_hash" TEXT,
    "password_changed_at" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'MECHANIC',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "recovery_email" TEXT,
    "recovery_phone" TEXT,
    "totp_secret" TEXT,
    "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "totp_verified_at" TIMESTAMP(3),
    "sms_otp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "last_login_ip" TEXT,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "preferences" JSONB DEFAULT '{}',
    "location_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "encrypted_phone" TEXT NOT NULL,
    "encrypted_email" TEXT,
    "encrypted_first_name" TEXT,
    "encrypted_last_name" TEXT,
    "phone_hash" TEXT NOT NULL,
    "gdpr_consent" BOOLEAN NOT NULL DEFAULT false,
    "gdpr_consent_at" TIMESTAMP(3),
    "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers_encrypted" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "phone_encrypted" BYTEA,
    "email_encrypted" BYTEA,
    "name_encrypted" BYTEA,
    "phone_hash" TEXT NOT NULL,
    "gdpr_consent" BOOLEAN NOT NULL DEFAULT false,
    "gdpr_consent_date" TIMESTAMP(3),
    "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
    "marketing_consent_date" TIMESTAMP(3),
    "call_recording_consent" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "anonymized_at" TIMESTAMP(3),
    "data_subject_request_id" TEXT,
    "data_retention_days" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_encrypted_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "license_plate" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "vin" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "customer_id" TEXT,
    "customer_encrypted_id" TEXT,
    "last_service_date" TIMESTAMP(3),
    "next_service_due_km" INTEGER,
    "rfid_tag" TEXT,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "notes" TEXT,
    "source" "BookingSource" NOT NULL DEFAULT 'WEB',
    "vapi_call_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "customer_encrypted_id" TEXT,
    "vehicle_id" TEXT,
    "slot_id" TEXT NOT NULL,
    "location_id" TEXT,
    "total_cost_cents" BIGINT,
    "payment_status" TEXT,
    "estimated_duration_minutes" INTEGER,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_slots" (
    "id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "status" "SlotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "tenant_id" TEXT NOT NULL,

    CONSTRAINT "booking_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_events" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "booking_id" TEXT NOT NULL,

    CONSTRAINT "booking_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "price" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "tenant_id" TEXT NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_services" (
    "id" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "booking_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,

    CONSTRAINT "booking_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "total_cents" BIGINT NOT NULL,
    "tax_cents" BIGINT,
    "status" TEXT NOT NULL,
    "payment_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_webhook_events" (
    "id" TEXT NOT NULL,
    "call_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_phone" TEXT,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_recordings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "recording_sid" TEXT,
    "recording_url" TEXT,
    "duration_seconds" INTEGER NOT NULL,
    "direction" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retention_until" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "deletion_reason" TEXT,

    CONSTRAINT "call_recordings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" TEXT NOT NULL,
    "status" "InspectionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "template_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "mechanic_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "mileage" INTEGER,
    "fuel_level" "FuelLevel",
    "customer_notified" BOOLEAN NOT NULL DEFAULT false,
    "customer_viewed" BOOLEAN NOT NULL DEFAULT false,
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_template_items" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "inspection_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_items" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "template_item_id" TEXT NOT NULL,
    "status" "InspectionItemStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "severity" "FindingSeverity",

    CONSTRAINT "inspection_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_photos" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "item_id" TEXT,
    "s3_key" TEXT NOT NULL,
    "s3_bucket" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "category" TEXT,
    "description" TEXT,
    "taken_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taken_by" TEXT NOT NULL,

    CONSTRAINT "inspection_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_findings" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "FindingSeverity" NOT NULL,
    "recommendation" TEXT,
    "estimated_cost" DECIMAL(10,2),
    "status" "FindingStatus" NOT NULL DEFAULT 'REPORTED',
    "approved_by_customer" BOOLEAN NOT NULL DEFAULT false,
    "approved_at" TIMESTAMP(3),

    CONSTRAINT "inspection_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obd_devices" (
    "id" TEXT NOT NULL,
    "serial_number" TEXT NOT NULL,
    "name" TEXT,
    "model" TEXT NOT NULL,
    "firmware" TEXT,
    "mac_address" TEXT,
    "bluetooth_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_connected" TIMESTAMP(3),
    "battery_level" INTEGER,
    "tenant_id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "obd_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obd_readings" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rpm" INTEGER,
    "speed" INTEGER,
    "coolant_temp" INTEGER,
    "engine_load" DOUBLE PRECISION,
    "fuel_level" DOUBLE PRECISION,
    "fuel_rate" DOUBLE PRECISION,
    "intake_temp" INTEGER,
    "maf" DOUBLE PRECISION,
    "barometric" DOUBLE PRECISION,
    "intake_map" DOUBLE PRECISION,
    "throttle_pos" DOUBLE PRECISION,
    "voltage" DOUBLE PRECISION,
    "run_time" INTEGER,
    "distance" INTEGER,
    "raw_data" JSONB,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "tenant_id" TEXT NOT NULL,

    CONSTRAINT "obd_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obd_trouble_codes" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" "TroubleCodeSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "symptoms" TEXT,
    "causes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_pending" BOOLEAN NOT NULL DEFAULT false,
    "is_permanent" BOOLEAN NOT NULL DEFAULT false,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cleared_at" TIMESTAMP(3),
    "cleared_by" TEXT,
    "reading_snapshot" JSONB,
    "inspection_id" TEXT,

    CONSTRAINT "obd_trouble_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parts" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "brand" TEXT,
    "manufacturer" TEXT,
    "part_number" TEXT,
    "weight" DOUBLE PRECISION,
    "dimensions" JSONB,
    "compatible_makes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "compatible_models" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "year_from" INTEGER,
    "year_to" INTEGER,
    "cost_price" DECIMAL(10,2) NOT NULL,
    "retail_price" DECIMAL(10,2) NOT NULL,
    "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 22.00,
    "min_stock_level" INTEGER NOT NULL DEFAULT 5,
    "max_stock_level" INTEGER,
    "reorder_point" INTEGER NOT NULL DEFAULT 10,
    "tenant_id" TEXT NOT NULL,
    "supplier_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "contact_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postal_code" TEXT,
    "country" TEXT,
    "vat_number" TEXT,
    "payment_terms" TEXT,
    "tenant_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "part_id" TEXT NOT NULL,
    "storage_location" TEXT,
    "bin" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "available" INTEGER NOT NULL DEFAULT 0,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT,
    "last_counted" TIMESTAMP(3),

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "part_id" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reference_id" TEXT,
    "reference_type" TEXT,
    "notes" TEXT,
    "performed_by" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "vat_amount" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "order_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_date" TIMESTAMP(3),
    "received_at" TIMESTAMP(3),
    "tenant_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "part_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "received_qty" INTEGER NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "vat_rate" DECIMAL(5,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_parts" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "part_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "is_installed" BOOLEAN NOT NULL DEFAULT false,
    "installed_at" TIMESTAMP(3),
    "installed_by" TEXT,

    CONSTRAINT "booking_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "piva_cache" (
    "id" TEXT NOT NULL,
    "piva" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "cached_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "piva_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT NOT NULL,
    "message_id" TEXT,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "error" TEXT,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_notification_preferences" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'TRIAL',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "stripe_price_id" TEXT,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "trial_ends_at" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "cancelled_at" TIMESTAMP(3),
    "ai_addon_enabled" BOOLEAN NOT NULL DEFAULT false,
    "ai_addon_price" DECIMAL(10,2),
    "api_calls_used" INTEGER NOT NULL DEFAULT 0,
    "api_calls_limit" INTEGER,
    "storage_used_bytes" BIGINT NOT NULL DEFAULT 0,
    "storage_limit_bytes" BIGINT,
    "max_users" INTEGER NOT NULL DEFAULT 1,
    "max_locations" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_features" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "feature" "FeatureFlag" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_tracking" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "api_calls_total" INTEGER NOT NULL DEFAULT 0,
    "api_calls_breakdown" JSONB,
    "storage_bytes" BIGINT NOT NULL DEFAULT 0,
    "storage_breakdown" JSONB,
    "users_count" INTEGER NOT NULL DEFAULT 0,
    "locations_count" INTEGER NOT NULL DEFAULT 0,
    "customers_count" INTEGER NOT NULL DEFAULT 0,
    "inspections_count" INTEGER NOT NULL DEFAULT 0,
    "ai_inspections_count" INTEGER NOT NULL DEFAULT 0,
    "ai_api_calls" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_changes" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "change_type" TEXT NOT NULL,
    "old_plan" "SubscriptionPlan",
    "new_plan" "SubscriptionPlan",
    "old_status" "SubscriptionStatus",
    "new_status" "SubscriptionStatus",
    "prorated_amount" DECIMAL(10,2),
    "metadata" JSONB DEFAULT '{}',
    "performed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discount_type" TEXT NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "applicable_plans" "SubscriptionPlan"[],
    "max_uses" INTEGER,
    "uses_count" INTEGER NOT NULL DEFAULT 0,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "postal_code" TEXT,
    "country" TEXT NOT NULL DEFAULT 'IT',
    "phone" TEXT,
    "email" TEXT,
    "is_main" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passkeys" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "credential_id" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "transports" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "device_name" TEXT,
    "device_type" TEXT NOT NULL,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),
    "is_backup_key" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "passkeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "jwt_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "device_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_name" TEXT NOT NULL,
    "device_type" TEXT NOT NULL,
    "os_type" TEXT NOT NULL,
    "os_version" TEXT,
    "browser_type" TEXT,
    "fingerprint" TEXT NOT NULL,
    "trusted_until" TIMESTAMP(3),
    "last_ip_address" TEXT,
    "last_location_city" TEXT,
    "last_location_country" TEXT,
    "last_login_at" TIMESTAMP(3),
    "is_compromised" BOOLEAN NOT NULL DEFAULT false,
    "requires_mfa_next" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backup_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "magic_links" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tenant_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "magic_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_otps" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "old_values" TEXT,
    "new_values" TEXT,
    "performed_by" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "consentType" "ConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_source" TEXT,
    "userAgent" TEXT,
    "collection_method" TEXT,
    "collection_point" TEXT,
    "legal_basis" TEXT,
    "verified_identity" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMP(3),
    "revoked_by" TEXT,
    "revocation_reason" TEXT,
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "consent_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_subject_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "request_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "requester_email" TEXT,
    "requester_phone" TEXT,
    "customer_id" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline_at" TIMESTAMP(3) NOT NULL,
    "verified_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "sla_met" BOOLEAN,
    "source" TEXT NOT NULL DEFAULT 'EMAIL',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "assigned_to" TEXT,
    "identity_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_method" TEXT,
    "verification_documents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rejection_reason" TEXT,
    "rejection_basis" TEXT,
    "export_format" TEXT,
    "deletion_snapshot_created" BOOLEAN NOT NULL DEFAULT false,
    "deletion_snapshot_url" TEXT,
    "notes" TEXT,
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "data_subject_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_retention_execution_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "execution_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "customers_anonymized" INTEGER NOT NULL DEFAULT 0,
    "bookings_anonymized" INTEGER NOT NULL DEFAULT 0,
    "recordings_deleted" INTEGER NOT NULL DEFAULT 0,
    "logs_deleted" INTEGER NOT NULL DEFAULT 0,
    "retention_days_applied" INTEGER NOT NULL DEFAULT 2555,
    "error_message" TEXT,

    CONSTRAINT "data_retention_execution_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_plate_detections" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "detected_text" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "country" TEXT,
    "region" TEXT,
    "vehicle_type" TEXT,
    "bounding_box" JSONB,
    "provider" TEXT NOT NULL,
    "raw_response" JSONB,
    "camera_id" TEXT,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "license_plate_detections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_entry_exits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" "EntryExitType" NOT NULL,
    "license_plate" TEXT NOT NULL,
    "detection_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "location" TEXT,
    "camera_id" TEXT,
    "vehicle_id" TEXT,
    "is_authorized" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_entry_exits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "license_plate" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "entry_id" TEXT NOT NULL,
    "exit_id" TEXT,
    "status" "ParkingSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "entry_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exit_time" TIMESTAMP(3),
    "duration_minutes" INTEGER,
    "parking_spot_id" TEXT,

    CONSTRAINT "parking_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lpr_cameras" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "direction" "EntryExitType" NOT NULL,
    "provider" TEXT NOT NULL,
    "config" JSONB DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_capture" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lpr_cameras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obd_freeze_frames" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "dtc_code" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "obd_freeze_frames_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obd_mode06_results" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "component_id" TEXT,
    "test_name" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "min_value" DOUBLE PRECISION,
    "max_value" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "unit" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "obd_mode06_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obd_evap_tests" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "test_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "results" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "obd_evap_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_floors" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_bays" (
    "id" TEXT NOT NULL,
    "shop_floor_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "ServiceBayStatus" NOT NULL DEFAULT 'AVAILABLE',
    "location_x" DOUBLE PRECISION NOT NULL,
    "location_y" DOUBLE PRECISION NOT NULL,
    "floor" INTEGER NOT NULL DEFAULT 1,
    "capabilities" TEXT[],
    "max_vehicle_weight" DOUBLE PRECISION NOT NULL,
    "lift_capacity" DOUBLE PRECISION,
    "current_vehicle_id" TEXT,
    "current_work_order_id" TEXT,
    "check_in_time" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_bays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_spots" (
    "id" TEXT NOT NULL,
    "shop_floor_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "location_x" DOUBLE PRECISION NOT NULL,
    "location_y" DOUBLE PRECISION NOT NULL,
    "vehicle_id" TEXT,
    "license_plate" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parking_spots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensors" (
    "id" TEXT NOT NULL,
    "bay_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_reading" TIMESTAMP(3),
    "battery_level" INTEGER,
    "config" JSONB,

    CONSTRAINT "sensors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_readings" (
    "id" TEXT NOT NULL,
    "sensor_id" TEXT NOT NULL,
    "bay_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sensor_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_floor_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bay_id" TEXT,
    "vehicle_id" TEXT,
    "technician_id" TEXT,
    "work_order_id" TEXT,
    "from_status" TEXT,
    "to_status" TEXT,
    "message" TEXT,
    "metadata" JSONB,

    CONSTRAINT "shop_floor_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'PENDING',
    "vehicle_id" TEXT NOT NULL,
    "assigned_bay_id" TEXT,
    "actual_start_time" TIMESTAMP(3),
    "estimated_completion" TIMESTAMP(3),
    "actual_completion_time" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_technicians" (
    "id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "technician_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_technicians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_services" (
    "id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "estimated_minutes" INTEGER NOT NULL,
    "actual_minutes" INTEGER,
    "technician_id" TEXT,
    "related_component_id" TEXT,

    CONSTRAINT "work_order_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_parts" (
    "id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "part_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "work_order_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technicians" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "beacon_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technicians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_twin_configs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sync_interval" INTEGER NOT NULL DEFAULT 300,
    "data_retention_days" INTEGER NOT NULL DEFAULT 365,
    "track_location" BOOLEAN NOT NULL DEFAULT true,
    "track_health" BOOLEAN NOT NULL DEFAULT true,
    "track_components" BOOLEAN NOT NULL DEFAULT true,
    "last_synced_at" TIMESTAMP(3),
    "config" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_twin_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_twin_components" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "position" TEXT,
    "part_number" TEXT,
    "installed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_lifespan_km" INTEGER,
    "expected_lifespan_months" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "condition" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "wearLevel" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "current_mileage" INTEGER,
    "estimated_remaining_km" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_twin_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "component_histories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "mileage" INTEGER,
    "condition" DOUBLE PRECISION,
    "wear_level" DOUBLE PRECISION,
    "notes" TEXT,
    "work_order_id" TEXT,
    "inspection_id" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "component_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_health_histories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "overall_score" INTEGER NOT NULL,
    "engine_score" INTEGER NOT NULL,
    "transmission_score" INTEGER NOT NULL,
    "brakes_score" INTEGER NOT NULL,
    "suspension_score" INTEGER NOT NULL,
    "electrical_score" INTEGER NOT NULL,
    "has_error_codes" BOOLEAN NOT NULL DEFAULT false,
    "error_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mileage" INTEGER,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'OBD',

    CONSTRAINT "vehicle_health_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_damages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "position" TEXT,
    "description" TEXT,
    "images" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "inspection_id" TEXT,
    "discovered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repaired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_damages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "company_name" TEXT,
    "contact_name" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_vehicles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "fleet_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP(3),

    CONSTRAINT "fleet_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_sets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "season" "TireSeason" NOT NULL,
    "dot" TEXT,
    "tread_depth_mm" DOUBLE PRECISION,
    "wear_level" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "storage_location" TEXT,
    "is_stored" BOOLEAN NOT NULL DEFAULT false,
    "stored_at" TIMESTAMP(3),
    "is_mounted" BOOLEAN NOT NULL DEFAULT false,
    "mounted_at" TIMESTAMP(3),
    "unmounted_at" TIMESTAMP(3),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tire_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "estimate_number" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "status" "EstimateStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal_cents" BIGINT NOT NULL,
    "vat_cents" BIGINT NOT NULL,
    "total_cents" BIGINT NOT NULL,
    "discount_cents" BIGINT NOT NULL DEFAULT 0,
    "valid_until" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "booking_id" TEXT,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_lines" (
    "id" TEXT NOT NULL,
    "estimate_id" TEXT NOT NULL,
    "type" "EstimateLineType" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price_cents" BIGINT NOT NULL,
    "total_cents" BIGINT NOT NULL,
    "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 22.00,
    "part_id" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "estimate_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labor_guides" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labor_guides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labor_guide_entries" (
    "id" TEXT NOT NULL,
    "guide_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT,
    "year_from" INTEGER,
    "year_to" INTEGER,
    "operation_code" TEXT NOT NULL,
    "operation_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "labor_time_minutes" INTEGER NOT NULL,
    "difficulty_level" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labor_guide_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_syncs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider" "AccountingProvider" NOT NULL,
    "external_id" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "status" "AccountingSyncStatus" NOT NULL DEFAULT 'PENDING',
    "direction" TEXT NOT NULL DEFAULT 'OUTBOUND',
    "synced_at" TIMESTAMP(3),
    "error" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_retry_at" TIMESTAMP(3),
    "payload" JSONB,
    "response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounting_syncs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "users_location_id_idx" ON "users"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "customers_phone_hash_idx" ON "customers"("phone_hash");

-- CreateIndex
CREATE INDEX "customers_tenant_id_idx" ON "customers"("tenant_id");

-- CreateIndex
CREATE INDEX "customers_location_id_idx" ON "customers"("location_id");

-- CreateIndex
CREATE INDEX "customers_encrypted_tenant_id_idx" ON "customers_encrypted"("tenant_id");

-- CreateIndex
CREATE INDEX "customers_encrypted_phone_hash_idx" ON "customers_encrypted"("phone_hash");

-- CreateIndex
CREATE INDEX "customers_encrypted_anonymized_at_idx" ON "customers_encrypted"("anonymized_at");

-- CreateIndex
CREATE INDEX "customers_encrypted_is_deleted_idx" ON "customers_encrypted"("is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_rfid_tag_key" ON "vehicles"("rfid_tag");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_slot_id_key" ON "bookings"("slot_id");

-- CreateIndex
CREATE INDEX "bookings_tenant_id_idx" ON "bookings"("tenant_id");

-- CreateIndex
CREATE INDEX "bookings_customer_id_idx" ON "bookings"("customer_id");

-- CreateIndex
CREATE INDEX "bookings_customer_encrypted_id_idx" ON "bookings"("customer_encrypted_id");

-- CreateIndex
CREATE INDEX "bookings_scheduled_date_idx" ON "bookings"("scheduled_date");

-- CreateIndex
CREATE INDEX "bookings_location_id_idx" ON "bookings"("location_id");

-- CreateIndex
CREATE INDEX "booking_slots_tenant_id_idx" ON "booking_slots"("tenant_id");

-- CreateIndex
CREATE INDEX "booking_slots_tenant_id_start_time_end_time_idx" ON "booking_slots"("tenant_id", "start_time", "end_time");

-- CreateIndex
CREATE INDEX "booking_slots_status_idx" ON "booking_slots"("status");

-- CreateIndex
CREATE INDEX "booking_events_booking_id_idx" ON "booking_events"("booking_id");

-- CreateIndex
CREATE INDEX "booking_events_event_type_idx" ON "booking_events"("event_type");

-- CreateIndex
CREATE INDEX "services_tenant_id_idx" ON "services"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "services_tenant_id_name_key" ON "services"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "booking_services_booking_id_service_id_key" ON "booking_services"("booking_id", "service_id");

-- CreateIndex
CREATE INDEX "invoices_booking_id_idx" ON "invoices"("booking_id");

-- CreateIndex
CREATE INDEX "voice_webhook_events_call_id_idx" ON "voice_webhook_events"("call_id");

-- CreateIndex
CREATE INDEX "voice_webhook_events_tenant_id_idx" ON "voice_webhook_events"("tenant_id");

-- CreateIndex
CREATE INDEX "voice_webhook_events_event_type_idx" ON "voice_webhook_events"("event_type");

-- CreateIndex
CREATE INDEX "voice_webhook_events_processed_idx" ON "voice_webhook_events"("processed");

-- CreateIndex
CREATE INDEX "call_recordings_tenant_id_idx" ON "call_recordings"("tenant_id");

-- CreateIndex
CREATE INDEX "call_recordings_customer_id_idx" ON "call_recordings"("customer_id");

-- CreateIndex
CREATE INDEX "call_recordings_deleted_at_idx" ON "call_recordings"("deleted_at");

-- CreateIndex
CREATE INDEX "call_recordings_retention_until_idx" ON "call_recordings"("retention_until");

-- CreateIndex
CREATE INDEX "inspections_tenant_id_idx" ON "inspections"("tenant_id");

-- CreateIndex
CREATE INDEX "inspections_vehicle_id_idx" ON "inspections"("vehicle_id");

-- CreateIndex
CREATE INDEX "inspections_customer_id_idx" ON "inspections"("customer_id");

-- CreateIndex
CREATE INDEX "inspections_mechanic_id_idx" ON "inspections"("mechanic_id");

-- CreateIndex
CREATE INDEX "inspections_status_idx" ON "inspections"("status");

-- CreateIndex
CREATE INDEX "inspections_started_at_idx" ON "inspections"("started_at");

-- CreateIndex
CREATE INDEX "inspection_templates_tenant_id_idx" ON "inspection_templates"("tenant_id");

-- CreateIndex
CREATE INDEX "inspection_templates_category_idx" ON "inspection_templates"("category");

-- CreateIndex
CREATE INDEX "inspection_template_items_template_id_idx" ON "inspection_template_items"("template_id");

-- CreateIndex
CREATE INDEX "inspection_items_inspection_id_idx" ON "inspection_items"("inspection_id");

-- CreateIndex
CREATE INDEX "inspection_photos_inspection_id_idx" ON "inspection_photos"("inspection_id");

-- CreateIndex
CREATE INDEX "inspection_photos_item_id_idx" ON "inspection_photos"("item_id");

-- CreateIndex
CREATE INDEX "inspection_findings_inspection_id_idx" ON "inspection_findings"("inspection_id");

-- CreateIndex
CREATE INDEX "inspection_findings_severity_idx" ON "inspection_findings"("severity");

-- CreateIndex
CREATE INDEX "inspection_findings_status_idx" ON "inspection_findings"("status");

-- CreateIndex
CREATE UNIQUE INDEX "obd_devices_serial_number_key" ON "obd_devices"("serial_number");

-- CreateIndex
CREATE INDEX "obd_devices_tenant_id_idx" ON "obd_devices"("tenant_id");

-- CreateIndex
CREATE INDEX "obd_devices_vehicle_id_idx" ON "obd_devices"("vehicle_id");

-- CreateIndex
CREATE INDEX "obd_readings_tenant_id_idx" ON "obd_readings"("tenant_id");

-- CreateIndex
CREATE INDEX "obd_readings_device_id_idx" ON "obd_readings"("device_id");

-- CreateIndex
CREATE INDEX "obd_readings_device_id_recorded_at_idx" ON "obd_readings"("device_id", "recorded_at");

-- CreateIndex
CREATE INDEX "obd_readings_recorded_at_idx" ON "obd_readings"("recorded_at");

-- CreateIndex
CREATE INDEX "obd_trouble_codes_device_id_idx" ON "obd_trouble_codes"("device_id");

-- CreateIndex
CREATE INDEX "obd_trouble_codes_code_idx" ON "obd_trouble_codes"("code");

-- CreateIndex
CREATE INDEX "obd_trouble_codes_is_active_idx" ON "obd_trouble_codes"("is_active");

-- CreateIndex
CREATE INDEX "obd_trouble_codes_first_seen_at_idx" ON "obd_trouble_codes"("first_seen_at");

-- CreateIndex
CREATE INDEX "parts_tenant_id_is_active_idx" ON "parts"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "parts_category_idx" ON "parts"("category");

-- CreateIndex
CREATE INDEX "parts_supplier_id_idx" ON "parts"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "parts_tenant_id_sku_key" ON "parts"("tenant_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_code_key" ON "suppliers"("code");

-- CreateIndex
CREATE INDEX "suppliers_tenant_id_idx" ON "suppliers"("tenant_id");

-- CreateIndex
CREATE INDEX "inventory_items_tenant_id_idx" ON "inventory_items"("tenant_id");

-- CreateIndex
CREATE INDEX "inventory_items_location_id_idx" ON "inventory_items"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_part_id_storage_location_key" ON "inventory_items"("part_id", "storage_location");

-- CreateIndex
CREATE INDEX "inventory_movements_tenant_id_idx" ON "inventory_movements"("tenant_id");

-- CreateIndex
CREATE INDEX "inventory_movements_part_id_idx" ON "inventory_movements"("part_id");

-- CreateIndex
CREATE INDEX "inventory_movements_created_at_idx" ON "inventory_movements"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_order_number_key" ON "purchase_orders"("order_number");

-- CreateIndex
CREATE INDEX "purchase_orders_tenant_id_idx" ON "purchase_orders"("tenant_id");

-- CreateIndex
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "purchase_order_items_order_id_idx" ON "purchase_order_items"("order_id");

-- CreateIndex
CREATE INDEX "purchase_order_items_part_id_idx" ON "purchase_order_items"("part_id");

-- CreateIndex
CREATE INDEX "booking_parts_booking_id_idx" ON "booking_parts"("booking_id");

-- CreateIndex
CREATE INDEX "booking_parts_part_id_idx" ON "booking_parts"("part_id");

-- CreateIndex
CREATE UNIQUE INDEX "booking_parts_booking_id_part_id_key" ON "booking_parts"("booking_id", "part_id");

-- CreateIndex
CREATE UNIQUE INDEX "piva_cache_piva_key" ON "piva_cache"("piva");

-- CreateIndex
CREATE INDEX "piva_cache_piva_idx" ON "piva_cache"("piva");

-- CreateIndex
CREATE INDEX "piva_cache_expires_at_idx" ON "piva_cache"("expires_at");

-- CreateIndex
CREATE INDEX "notifications_customer_id_idx" ON "notifications"("customer_id");

-- CreateIndex
CREATE INDEX "notifications_tenant_id_idx" ON "notifications"("tenant_id");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_channel_idx" ON "notifications"("channel");

-- CreateIndex
CREATE INDEX "notifications_status_retries_max_retries_idx" ON "notifications"("status", "retries", "max_retries");

-- CreateIndex
CREATE INDEX "customer_notification_preferences_customer_id_idx" ON "customer_notification_preferences"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_notification_preferences_customer_id_channel_key" ON "customer_notification_preferences"("customer_id", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_tenant_id_key" ON "subscriptions"("tenant_id");

-- CreateIndex
CREATE INDEX "subscriptions_tenant_id_idx" ON "subscriptions"("tenant_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_stripe_customer_id_idx" ON "subscriptions"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "subscriptions_stripe_subscription_id_idx" ON "subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "subscriptions_current_period_end_idx" ON "subscriptions"("current_period_end");

-- CreateIndex
CREATE INDEX "subscription_features_subscription_id_idx" ON "subscription_features"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_features_subscription_id_feature_key" ON "subscription_features"("subscription_id", "feature");

-- CreateIndex
CREATE INDEX "usage_tracking_tenant_id_idx" ON "usage_tracking"("tenant_id");

-- CreateIndex
CREATE INDEX "usage_tracking_year_month_idx" ON "usage_tracking"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "usage_tracking_tenant_id_year_month_key" ON "usage_tracking"("tenant_id", "year", "month");

-- CreateIndex
CREATE INDEX "subscription_changes_subscription_id_idx" ON "subscription_changes"("subscription_id");

-- CreateIndex
CREATE INDEX "subscription_changes_tenant_id_idx" ON "subscription_changes"("tenant_id");

-- CreateIndex
CREATE INDEX "subscription_changes_created_at_idx" ON "subscription_changes"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "promo_codes_code_key" ON "promo_codes"("code");

-- CreateIndex
CREATE INDEX "promo_codes_code_idx" ON "promo_codes"("code");

-- CreateIndex
CREATE INDEX "promo_codes_is_active_valid_from_valid_until_idx" ON "promo_codes"("is_active", "valid_from", "valid_until");

-- CreateIndex
CREATE INDEX "locations_tenant_id_idx" ON "locations"("tenant_id");

-- CreateIndex
CREATE INDEX "locations_tenant_id_is_active_idx" ON "locations"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "locations_tenant_id_is_main_key" ON "locations"("tenant_id", "is_main");

-- CreateIndex
CREATE UNIQUE INDEX "passkeys_credential_id_key" ON "passkeys"("credential_id");

-- CreateIndex
CREATE INDEX "passkeys_user_id_idx" ON "passkeys"("user_id");

-- CreateIndex
CREATE INDEX "passkeys_credential_id_idx" ON "passkeys"("credential_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_jwt_token_key" ON "sessions"("jwt_token");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_key" ON "sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_device_id_idx" ON "sessions"("device_id");

-- CreateIndex
CREATE INDEX "sessions_jwt_token_idx" ON "sessions"("jwt_token");

-- CreateIndex
CREATE INDEX "sessions_refresh_token_idx" ON "sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "devices_user_id_idx" ON "devices"("user_id");

-- CreateIndex
CREATE INDEX "devices_fingerprint_idx" ON "devices"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "devices_user_id_fingerprint_key" ON "devices"("user_id", "fingerprint");

-- CreateIndex
CREATE INDEX "backup_codes_user_id_idx" ON "backup_codes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "magic_links_token_key" ON "magic_links"("token");

-- CreateIndex
CREATE INDEX "magic_links_email_idx" ON "magic_links"("email");

-- CreateIndex
CREATE INDEX "magic_links_token_idx" ON "magic_links"("token");

-- CreateIndex
CREATE INDEX "magic_links_expires_at_idx" ON "magic_links"("expires_at");

-- CreateIndex
CREATE INDEX "sms_otps_phone_idx" ON "sms_otps"("phone");

-- CreateIndex
CREATE INDEX "sms_otps_expires_at_idx" ON "sms_otps"("expires_at");

-- CreateIndex
CREATE INDEX "auth_audit_logs_tenant_id_idx" ON "auth_audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "auth_audit_logs_user_id_idx" ON "auth_audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "auth_audit_logs_action_idx" ON "auth_audit_logs"("action");

-- CreateIndex
CREATE INDEX "auth_audit_logs_status_idx" ON "auth_audit_logs"("status");

-- CreateIndex
CREATE INDEX "auth_audit_logs_created_at_idx" ON "auth_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_table_name_idx" ON "audit_logs"("table_name");

-- CreateIndex
CREATE INDEX "audit_logs_record_id_idx" ON "audit_logs"("record_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_archived_idx" ON "audit_logs"("archived");

-- CreateIndex
CREATE INDEX "consent_audit_logs_tenant_id_idx" ON "consent_audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "consent_audit_logs_customer_id_idx" ON "consent_audit_logs"("customer_id");

-- CreateIndex
CREATE INDEX "consent_audit_logs_consentType_idx" ON "consent_audit_logs"("consentType");

-- CreateIndex
CREATE INDEX "consent_audit_logs_timestamp_idx" ON "consent_audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "consent_audit_logs_revoked_at_idx" ON "consent_audit_logs"("revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "data_subject_requests_ticket_number_key" ON "data_subject_requests"("ticket_number");

-- CreateIndex
CREATE INDEX "data_subject_requests_tenant_id_idx" ON "data_subject_requests"("tenant_id");

-- CreateIndex
CREATE INDEX "data_subject_requests_ticket_number_idx" ON "data_subject_requests"("ticket_number");

-- CreateIndex
CREATE INDEX "data_subject_requests_status_idx" ON "data_subject_requests"("status");

-- CreateIndex
CREATE INDEX "data_subject_requests_received_at_idx" ON "data_subject_requests"("received_at");

-- CreateIndex
CREATE INDEX "data_subject_requests_deadline_at_idx" ON "data_subject_requests"("deadline_at");

-- CreateIndex
CREATE INDEX "data_subject_requests_customer_id_idx" ON "data_subject_requests"("customer_id");

-- CreateIndex
CREATE INDEX "data_retention_execution_logs_tenant_id_idx" ON "data_retention_execution_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "data_retention_execution_logs_status_idx" ON "data_retention_execution_logs"("status");

-- CreateIndex
CREATE INDEX "data_retention_execution_logs_started_at_idx" ON "data_retention_execution_logs"("started_at");

-- CreateIndex
CREATE INDEX "license_plate_detections_tenant_id_idx" ON "license_plate_detections"("tenant_id");

-- CreateIndex
CREATE INDEX "license_plate_detections_detected_text_idx" ON "license_plate_detections"("detected_text");

-- CreateIndex
CREATE INDEX "license_plate_detections_camera_id_idx" ON "license_plate_detections"("camera_id");

-- CreateIndex
CREATE INDEX "license_plate_detections_processed_at_idx" ON "license_plate_detections"("processed_at");

-- CreateIndex
CREATE INDEX "vehicle_entry_exits_tenant_id_idx" ON "vehicle_entry_exits"("tenant_id");

-- CreateIndex
CREATE INDEX "vehicle_entry_exits_license_plate_idx" ON "vehicle_entry_exits"("license_plate");

-- CreateIndex
CREATE INDEX "vehicle_entry_exits_vehicle_id_idx" ON "vehicle_entry_exits"("vehicle_id");

-- CreateIndex
CREATE INDEX "vehicle_entry_exits_timestamp_idx" ON "vehicle_entry_exits"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "parking_sessions_entry_id_key" ON "parking_sessions"("entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "parking_sessions_exit_id_key" ON "parking_sessions"("exit_id");

-- CreateIndex
CREATE INDEX "parking_sessions_tenant_id_idx" ON "parking_sessions"("tenant_id");

-- CreateIndex
CREATE INDEX "parking_sessions_license_plate_idx" ON "parking_sessions"("license_plate");

-- CreateIndex
CREATE INDEX "parking_sessions_status_idx" ON "parking_sessions"("status");

-- CreateIndex
CREATE INDEX "parking_sessions_entry_time_idx" ON "parking_sessions"("entry_time");

-- CreateIndex
CREATE INDEX "lpr_cameras_tenant_id_idx" ON "lpr_cameras"("tenant_id");

-- CreateIndex
CREATE INDEX "lpr_cameras_is_active_idx" ON "lpr_cameras"("is_active");

-- CreateIndex
CREATE INDEX "obd_freeze_frames_device_id_idx" ON "obd_freeze_frames"("device_id");

-- CreateIndex
CREATE INDEX "obd_freeze_frames_device_id_captured_at_idx" ON "obd_freeze_frames"("device_id", "captured_at");

-- CreateIndex
CREATE INDEX "obd_freeze_frames_dtc_code_idx" ON "obd_freeze_frames"("dtc_code");

-- CreateIndex
CREATE INDEX "obd_mode06_results_device_id_idx" ON "obd_mode06_results"("device_id");

-- CreateIndex
CREATE INDEX "obd_mode06_results_device_id_recorded_at_idx" ON "obd_mode06_results"("device_id", "recorded_at");

-- CreateIndex
CREATE INDEX "obd_mode06_results_test_id_idx" ON "obd_mode06_results"("test_id");

-- CreateIndex
CREATE INDEX "obd_evap_tests_device_id_idx" ON "obd_evap_tests"("device_id");

-- CreateIndex
CREATE INDEX "obd_evap_tests_device_id_started_at_idx" ON "obd_evap_tests"("device_id", "started_at");

-- CreateIndex
CREATE INDEX "obd_evap_tests_status_idx" ON "obd_evap_tests"("status");

-- CreateIndex
CREATE INDEX "shop_floors_tenant_id_idx" ON "shop_floors"("tenant_id");

-- CreateIndex
CREATE INDEX "service_bays_shop_floor_id_idx" ON "service_bays"("shop_floor_id");

-- CreateIndex
CREATE INDEX "service_bays_status_idx" ON "service_bays"("status");

-- CreateIndex
CREATE INDEX "parking_spots_shop_floor_id_idx" ON "parking_spots"("shop_floor_id");

-- CreateIndex
CREATE INDEX "parking_spots_status_idx" ON "parking_spots"("status");

-- CreateIndex
CREATE INDEX "sensors_bay_id_idx" ON "sensors"("bay_id");

-- CreateIndex
CREATE INDEX "sensors_type_idx" ON "sensors"("type");

-- CreateIndex
CREATE INDEX "sensor_readings_sensor_id_idx" ON "sensor_readings"("sensor_id");

-- CreateIndex
CREATE INDEX "sensor_readings_bay_id_idx" ON "sensor_readings"("bay_id");

-- CreateIndex
CREATE INDEX "sensor_readings_timestamp_idx" ON "sensor_readings"("timestamp");

-- CreateIndex
CREATE INDEX "shop_floor_events_tenant_id_idx" ON "shop_floor_events"("tenant_id");

-- CreateIndex
CREATE INDEX "shop_floor_events_type_idx" ON "shop_floor_events"("type");

-- CreateIndex
CREATE INDEX "shop_floor_events_timestamp_idx" ON "shop_floor_events"("timestamp");

-- CreateIndex
CREATE INDEX "work_orders_tenant_id_idx" ON "work_orders"("tenant_id");

-- CreateIndex
CREATE INDEX "work_orders_vehicle_id_idx" ON "work_orders"("vehicle_id");

-- CreateIndex
CREATE INDEX "work_orders_status_idx" ON "work_orders"("status");

-- CreateIndex
CREATE INDEX "work_order_technicians_work_order_id_idx" ON "work_order_technicians"("work_order_id");

-- CreateIndex
CREATE INDEX "work_order_technicians_technician_id_idx" ON "work_order_technicians"("technician_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_order_technicians_work_order_id_technician_id_key" ON "work_order_technicians"("work_order_id", "technician_id");

-- CreateIndex
CREATE INDEX "work_order_services_work_order_id_idx" ON "work_order_services"("work_order_id");

-- CreateIndex
CREATE INDEX "work_order_services_service_id_idx" ON "work_order_services"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_order_services_work_order_id_service_id_key" ON "work_order_services"("work_order_id", "service_id");

-- CreateIndex
CREATE INDEX "work_order_parts_work_order_id_idx" ON "work_order_parts"("work_order_id");

-- CreateIndex
CREATE INDEX "work_order_parts_part_id_idx" ON "work_order_parts"("part_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_order_parts_work_order_id_part_id_key" ON "work_order_parts"("work_order_id", "part_id");

-- CreateIndex
CREATE INDEX "technicians_tenant_id_idx" ON "technicians"("tenant_id");

-- CreateIndex
CREATE INDEX "technicians_beacon_id_idx" ON "technicians"("beacon_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_twin_configs_vehicle_id_key" ON "vehicle_twin_configs"("vehicle_id");

-- CreateIndex
CREATE INDEX "vehicle_twin_configs_tenant_id_idx" ON "vehicle_twin_configs"("tenant_id");

-- CreateIndex
CREATE INDEX "vehicle_twin_configs_vehicle_id_idx" ON "vehicle_twin_configs"("vehicle_id");

-- CreateIndex
CREATE INDEX "vehicle_twin_components_tenant_id_idx" ON "vehicle_twin_components"("tenant_id");

-- CreateIndex
CREATE INDEX "vehicle_twin_components_vehicle_id_idx" ON "vehicle_twin_components"("vehicle_id");

-- CreateIndex
CREATE INDEX "vehicle_twin_components_category_idx" ON "vehicle_twin_components"("category");

-- CreateIndex
CREATE INDEX "vehicle_twin_components_status_idx" ON "vehicle_twin_components"("status");

-- CreateIndex
CREATE INDEX "component_histories_tenant_id_idx" ON "component_histories"("tenant_id");

-- CreateIndex
CREATE INDEX "component_histories_component_id_idx" ON "component_histories"("component_id");

-- CreateIndex
CREATE INDEX "component_histories_event_type_idx" ON "component_histories"("event_type");

-- CreateIndex
CREATE INDEX "component_histories_recorded_at_idx" ON "component_histories"("recorded_at");

-- CreateIndex
CREATE INDEX "vehicle_health_histories_tenant_id_idx" ON "vehicle_health_histories"("tenant_id");

-- CreateIndex
CREATE INDEX "vehicle_health_histories_vehicle_id_idx" ON "vehicle_health_histories"("vehicle_id");

-- CreateIndex
CREATE INDEX "vehicle_health_histories_recorded_at_idx" ON "vehicle_health_histories"("recorded_at");

-- CreateIndex
CREATE INDEX "vehicle_damages_tenant_id_idx" ON "vehicle_damages"("tenant_id");

-- CreateIndex
CREATE INDEX "vehicle_damages_vehicle_id_idx" ON "vehicle_damages"("vehicle_id");

-- CreateIndex
CREATE INDEX "vehicle_damages_status_idx" ON "vehicle_damages"("status");

-- CreateIndex
CREATE INDEX "fleets_tenant_id_idx" ON "fleets"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "fleets_tenant_id_name_key" ON "fleets"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "fleet_vehicles_tenant_id_idx" ON "fleet_vehicles"("tenant_id");

-- CreateIndex
CREATE INDEX "fleet_vehicles_fleet_id_idx" ON "fleet_vehicles"("fleet_id");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_vehicles_fleet_id_vehicle_id_key" ON "fleet_vehicles"("fleet_id", "vehicle_id");

-- CreateIndex
CREATE INDEX "tire_sets_tenant_id_idx" ON "tire_sets"("tenant_id");

-- CreateIndex
CREATE INDEX "tire_sets_vehicle_id_idx" ON "tire_sets"("vehicle_id");

-- CreateIndex
CREATE INDEX "tire_sets_season_idx" ON "tire_sets"("season");

-- CreateIndex
CREATE INDEX "tire_sets_is_stored_idx" ON "tire_sets"("is_stored");

-- CreateIndex
CREATE UNIQUE INDEX "estimates_estimate_number_key" ON "estimates"("estimate_number");

-- CreateIndex
CREATE INDEX "estimates_tenant_id_idx" ON "estimates"("tenant_id");

-- CreateIndex
CREATE INDEX "estimates_customer_id_idx" ON "estimates"("customer_id");

-- CreateIndex
CREATE INDEX "estimates_status_idx" ON "estimates"("status");

-- CreateIndex
CREATE INDEX "estimate_lines_estimate_id_idx" ON "estimate_lines"("estimate_id");

-- CreateIndex
CREATE INDEX "labor_guides_tenant_id_idx" ON "labor_guides"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "labor_guides_tenant_id_name_key" ON "labor_guides"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "labor_guide_entries_guide_id_idx" ON "labor_guide_entries"("guide_id");

-- CreateIndex
CREATE INDEX "labor_guide_entries_tenant_id_idx" ON "labor_guide_entries"("tenant_id");

-- CreateIndex
CREATE INDEX "labor_guide_entries_make_idx" ON "labor_guide_entries"("make");

-- CreateIndex
CREATE INDEX "labor_guide_entries_category_idx" ON "labor_guide_entries"("category");

-- CreateIndex
CREATE INDEX "accounting_syncs_tenant_id_idx" ON "accounting_syncs"("tenant_id");

-- CreateIndex
CREATE INDEX "accounting_syncs_entity_type_entity_id_idx" ON "accounting_syncs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "accounting_syncs_status_idx" ON "accounting_syncs"("status");

-- CreateIndex
CREATE INDEX "accounting_syncs_provider_idx" ON "accounting_syncs"("provider");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers_encrypted" ADD CONSTRAINT "customers_encrypted_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_customer_encrypted_id_fkey" FOREIGN KEY ("customer_encrypted_id") REFERENCES "customers_encrypted"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_encrypted_id_fkey" FOREIGN KEY ("customer_encrypted_id") REFERENCES "customers_encrypted"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "booking_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_slots" ADD CONSTRAINT "booking_slots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_recordings" ADD CONSTRAINT "call_recordings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_recordings" ADD CONSTRAINT "call_recordings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers_encrypted"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_mechanic_id_fkey" FOREIGN KEY ("mechanic_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "inspection_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_templates" ADD CONSTRAINT "inspection_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_template_items" ADD CONSTRAINT "inspection_template_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "inspection_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_items" ADD CONSTRAINT "inspection_items_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_items" ADD CONSTRAINT "inspection_items_template_item_id_fkey" FOREIGN KEY ("template_item_id") REFERENCES "inspection_template_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_photos" ADD CONSTRAINT "inspection_photos_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_photos" ADD CONSTRAINT "inspection_photos_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inspection_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obd_devices" ADD CONSTRAINT "obd_devices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obd_devices" ADD CONSTRAINT "obd_devices_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obd_readings" ADD CONSTRAINT "obd_readings_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "obd_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obd_readings" ADD CONSTRAINT "obd_readings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obd_trouble_codes" ADD CONSTRAINT "obd_trouble_codes_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "obd_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obd_trouble_codes" ADD CONSTRAINT "obd_trouble_codes_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parts" ADD CONSTRAINT "parts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parts" ADD CONSTRAINT "parts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_parts" ADD CONSTRAINT "booking_parts_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_parts" ADD CONSTRAINT "booking_parts_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notification_preferences" ADD CONSTRAINT "customer_notification_preferences_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_features" ADD CONSTRAINT "subscription_features_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_tracking" ADD CONSTRAINT "usage_tracking_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_tracking" ADD CONSTRAINT "usage_tracking_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_changes" ADD CONSTRAINT "subscription_changes_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passkeys" ADD CONSTRAINT "passkeys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_codes" ADD CONSTRAINT "backup_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_audit_logs" ADD CONSTRAINT "consent_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_audit_logs" ADD CONSTRAINT "consent_audit_logs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers_encrypted"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_subject_requests" ADD CONSTRAINT "data_subject_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_retention_execution_logs" ADD CONSTRAINT "data_retention_execution_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_plate_detections" ADD CONSTRAINT "license_plate_detections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_plate_detections" ADD CONSTRAINT "license_plate_detections_camera_id_fkey" FOREIGN KEY ("camera_id") REFERENCES "lpr_cameras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_entry_exits" ADD CONSTRAINT "vehicle_entry_exits_detection_id_fkey" FOREIGN KEY ("detection_id") REFERENCES "license_plate_detections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_entry_exits" ADD CONSTRAINT "vehicle_entry_exits_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_sessions" ADD CONSTRAINT "parking_sessions_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_sessions" ADD CONSTRAINT "parking_sessions_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "vehicle_entry_exits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_sessions" ADD CONSTRAINT "parking_sessions_exit_id_fkey" FOREIGN KEY ("exit_id") REFERENCES "vehicle_entry_exits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lpr_cameras" ADD CONSTRAINT "lpr_cameras_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obd_freeze_frames" ADD CONSTRAINT "obd_freeze_frames_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "obd_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obd_mode06_results" ADD CONSTRAINT "obd_mode06_results_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "obd_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obd_evap_tests" ADD CONSTRAINT "obd_evap_tests_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "obd_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_floors" ADD CONSTRAINT "shop_floors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_bays" ADD CONSTRAINT "service_bays_shop_floor_id_fkey" FOREIGN KEY ("shop_floor_id") REFERENCES "shop_floors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_bays" ADD CONSTRAINT "service_bays_current_vehicle_id_fkey" FOREIGN KEY ("current_vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_bays" ADD CONSTRAINT "service_bays_current_work_order_id_fkey" FOREIGN KEY ("current_work_order_id") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_spots" ADD CONSTRAINT "parking_spots_shop_floor_id_fkey" FOREIGN KEY ("shop_floor_id") REFERENCES "shop_floors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensors" ADD CONSTRAINT "sensors_bay_id_fkey" FOREIGN KEY ("bay_id") REFERENCES "service_bays"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_floor_events" ADD CONSTRAINT "shop_floor_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_technicians" ADD CONSTRAINT "work_order_technicians_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_services" ADD CONSTRAINT "work_order_services_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_services" ADD CONSTRAINT "work_order_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_parts" ADD CONSTRAINT "work_order_parts_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_parts" ADD CONSTRAINT "work_order_parts_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_twin_configs" ADD CONSTRAINT "vehicle_twin_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_twin_configs" ADD CONSTRAINT "vehicle_twin_configs_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_twin_components" ADD CONSTRAINT "vehicle_twin_components_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_twin_components" ADD CONSTRAINT "vehicle_twin_components_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_histories" ADD CONSTRAINT "component_histories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_histories" ADD CONSTRAINT "component_histories_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "vehicle_twin_components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_health_histories" ADD CONSTRAINT "vehicle_health_histories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_health_histories" ADD CONSTRAINT "vehicle_health_histories_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_damages" ADD CONSTRAINT "vehicle_damages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_damages" ADD CONSTRAINT "vehicle_damages_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleets" ADD CONSTRAINT "fleets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_vehicles" ADD CONSTRAINT "fleet_vehicles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_vehicles" ADD CONSTRAINT "fleet_vehicles_fleet_id_fkey" FOREIGN KEY ("fleet_id") REFERENCES "fleets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_vehicles" ADD CONSTRAINT "fleet_vehicles_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tire_sets" ADD CONSTRAINT "tire_sets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_lines" ADD CONSTRAINT "estimate_lines_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_guides" ADD CONSTRAINT "labor_guides_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_guide_entries" ADD CONSTRAINT "labor_guide_entries_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "labor_guides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_guide_entries" ADD CONSTRAINT "labor_guide_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_syncs" ADD CONSTRAINT "accounting_syncs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

