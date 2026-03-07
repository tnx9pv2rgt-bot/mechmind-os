-- ==========================================
-- MIGRATION: Add Subscription and Pricing Models
-- ==========================================

-- Subscription Plan Enum
CREATE TYPE "SubscriptionPlan" AS ENUM ('SMALL', 'MEDIUM', 'ENTERPRISE', 'TRIAL');

-- Subscription Status Enum
CREATE TYPE "SubscriptionStatus" AS ENUM (
  'TRIAL',           -- Initial trial period
  'ACTIVE',          -- Fully active subscription
  'PAST_DUE',        -- Payment failed but within grace period
  'UNPAID',          -- Payment failed, grace period expired
  'CANCELLED',       -- Cancelled by user
  'SUSPENDED',       -- Suspended by admin
  'EXPIRED'          -- Subscription period ended
);

-- Feature Flag Enum (for tracking which features are available)
CREATE TYPE "FeatureFlag" AS ENUM (
  'AI_INSPECTIONS',
  'MULTI_LOCATION',
  'API_ACCESS',
  'ADVANCED_REPORTS',
  'CUSTOM_BRANDING',
  'PRIORITY_SUPPORT',
  'WHITE_LABEL',
  'BLOCKCHAIN_VERIFICATION',
  'VOICE_ASSISTANT',
  'OBD_INTEGRATION',
  'INVENTORY_MANAGEMENT',
  'CUSTOM_INTEGRATIONS',
  'DEDICATED_MANAGER',
  'SLA_GUARANTEE'
);

-- Subscription Model
CREATE TABLE "subscriptions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "plan" "SubscriptionPlan" NOT NULL DEFAULT 'TRIAL',
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
  
  -- Stripe Integration
  "stripe_customer_id" VARCHAR(255),
  "stripe_subscription_id" VARCHAR(255),
  "stripe_price_id" VARCHAR(255),
  
  -- Billing Period
  "current_period_start" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "current_period_end" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  "trial_ends_at" TIMESTAMP WITH TIME ZONE,
  "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT FALSE,
  "cancelled_at" TIMESTAMP WITH TIME ZONE,
  
  -- AI Add-on
  "ai_addon_enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "ai_addon_price" DECIMAL(10, 2) DEFAULT 200.00,
  
  -- Usage Tracking (counters reset monthly)
  "api_calls_used" INTEGER NOT NULL DEFAULT 0,
  "api_calls_limit" INTEGER,
  "storage_used_bytes" BIGINT NOT NULL DEFAULT 0,
  "storage_limit_bytes" BIGINT,
  
  -- Plan Limits (cached for quick access)
  "max_users" INTEGER NOT NULL DEFAULT 1,
  "max_locations" INTEGER NOT NULL DEFAULT 1,
  
  -- Metadata
  "metadata" JSONB DEFAULT '{}',
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT "unique_tenant_subscription" UNIQUE ("tenant_id")
);

-- Feature Flags per Subscription
CREATE TABLE "subscription_features" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "subscription_id" UUID NOT NULL REFERENCES "subscriptions"("id") ON DELETE CASCADE,
  "feature" "FeatureFlag" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT "unique_subscription_feature" UNIQUE ("subscription_id", "feature")
);

-- Usage Tracking (monthly snapshots)
CREATE TABLE "usage_tracking" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  
  -- API Usage
  "api_calls_total" INTEGER NOT NULL DEFAULT 0,
  "api_calls_breakdown" JSONB DEFAULT '{}', -- { "endpoint": count }
  
  -- Storage Usage
  "storage_bytes" BIGINT NOT NULL DEFAULT 0,
  "storage_breakdown" JSONB DEFAULT '{}', -- { "photos": bytes, "documents": bytes }
  
  -- Resource Usage
  "users_count" INTEGER NOT NULL DEFAULT 0,
  "locations_count" INTEGER NOT NULL DEFAULT 0,
  "customers_count" INTEGER NOT NULL DEFAULT 0,
  "inspections_count" INTEGER NOT NULL DEFAULT 0,
  
  -- AI Usage
  "ai_inspections_count" INTEGER NOT NULL DEFAULT 0,
  "ai_api_calls" INTEGER NOT NULL DEFAULT 0,
  
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT "unique_tenant_month_usage" UNIQUE ("tenant_id", "year", "month")
);

-- Promo Codes / Discounts
CREATE TABLE "promo_codes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" VARCHAR(50) NOT NULL UNIQUE,
  "description" TEXT,
  "discount_type" VARCHAR(20) NOT NULL CHECK ("discount_type" IN ('PERCENTAGE', 'FIXED_AMOUNT')),
  "discount_value" DECIMAL(10, 2) NOT NULL,
  "applicable_plans" "SubscriptionPlan"[], -- NULL = all plans
  "max_uses" INTEGER,
  "uses_count" INTEGER NOT NULL DEFAULT 0,
  "valid_from" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "valid_until" TIMESTAMP WITH TIME ZONE,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Subscription Change Log (for audit/history)
CREATE TABLE "subscription_changes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "subscription_id" UUID NOT NULL REFERENCES "subscriptions"("id") ON DELETE CASCADE,
  "tenant_id" UUID NOT NULL,
  "change_type" VARCHAR(50) NOT NULL, -- UPGRADE, DOWNGRADE, CANCEL, REACTIVATE, AI_ADDON_TOGGLE
  "old_plan" "SubscriptionPlan",
  "new_plan" "SubscriptionPlan",
  "old_status" "SubscriptionStatus",
  "new_status" "SubscriptionStatus",
  "prorated_amount" DECIMAL(10, 2),
  "metadata" JSONB DEFAULT '{}',
  "performed_by" UUID, -- User ID who made the change (NULL for system)
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX "idx_subscriptions_tenant" ON "subscriptions"("tenant_id");
CREATE INDEX "idx_subscriptions_status" ON "subscriptions"("status");
CREATE INDEX "idx_subscriptions_stripe_customer" ON "subscriptions"("stripe_customer_id");
CREATE INDEX "idx_subscriptions_stripe_subscription" ON "subscriptions"("stripe_subscription_id");
CREATE INDEX "idx_subscriptions_period_end" ON "subscriptions"("current_period_end");

CREATE INDEX "idx_usage_tracking_tenant" ON "usage_tracking"("tenant_id");
CREATE INDEX "idx_usage_tracking_month" ON "usage_tracking"("year", "month");
CREATE INDEX "idx_usage_tracking_tenant_month" ON "usage_tracking"("tenant_id", "year", "month");

CREATE INDEX "idx_subscription_changes_subscription" ON "subscription_changes"("subscription_id");
CREATE INDEX "idx_subscription_changes_tenant" ON "subscription_changes"("tenant_id");
CREATE INDEX "idx_subscription_changes_created" ON "subscription_changes"("created_at");

CREATE INDEX "idx_promo_codes_code" ON "promo_codes"("code");
CREATE INDEX "idx_promo_codes_valid" ON "promo_codes"("is_active", "valid_from", "valid_until");

-- Add location model (needed for multi-location support)
CREATE TABLE "locations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "address" TEXT,
  "city" VARCHAR(100),
  "postal_code" VARCHAR(20),
  "country" VARCHAR(2) DEFAULT 'IT',
  "phone" VARCHAR(50),
  "email" VARCHAR(255),
  "is_main" BOOLEAN NOT NULL DEFAULT FALSE,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT "unique_tenant_main_location" UNIQUE ("tenant_id", "is_main")
);

-- Add location_id to existing tables for multi-location support
ALTER TABLE "users" ADD COLUMN "location_id" UUID REFERENCES "locations"("id");
ALTER TABLE "customers" ADD COLUMN "location_id" UUID REFERENCES "locations"("id");
ALTER TABLE "bookings" ADD COLUMN "location_id" UUID REFERENCES "locations"("id");
ALTER TABLE "inventory_items" ADD COLUMN "location_id" UUID REFERENCES "locations"("id");

CREATE INDEX "idx_users_location" ON "users"("location_id");
CREATE INDEX "idx_customers_location" ON "customers"("location_id");
CREATE INDEX "idx_bookings_location" ON "bookings"("location_id");
CREATE INDEX "idx_inventory_location" ON "inventory_items"("location_id");

-- Create indexes for new location table
CREATE INDEX "idx_locations_tenant" ON "locations"("tenant_id");
CREATE INDEX "idx_locations_active" ON "locations"("tenant_id", "is_active");

-- Function to automatically create subscription for new tenants
CREATE OR REPLACE FUNCTION create_tenant_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "subscriptions" (
    "tenant_id",
    "plan",
    "status",
    "trial_ends_at",
    "current_period_end",
    "max_users",
    "max_locations"
  ) VALUES (
    NEW.id,
    'TRIAL',
    'TRIAL',
    NOW() + INTERVAL '14 days',
    NOW() + INTERVAL '14 days',
    3,  -- Trial allows 3 users
    1   -- Trial allows 1 location
  );
  
  -- Add default trial features
  INSERT INTO "subscription_features" ("subscription_id", "feature", "enabled")
  SELECT 
    s.id,
    unnest(ARRAY[
      'AI_INSPECTIONS',
      'API_ACCESS',
      'ADVANCED_REPORTS',
      'OBD_INTEGRATION',
      'INVENTORY_MANAGEMENT'
    ]::"FeatureFlag"[]),
    TRUE
  FROM "subscriptions" s
  WHERE s.tenant_id = NEW.id;
  
  -- Create main location for tenant
  INSERT INTO "locations" ("tenant_id", "name", "is_main", "is_active")
  VALUES (NEW.id, 'Sede Principale', TRUE, TRUE);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create subscription on tenant creation
CREATE TRIGGER trigger_create_tenant_subscription
  AFTER INSERT ON "tenants"
  FOR EACH ROW
  EXECUTE FUNCTION create_tenant_subscription();

-- Function to update subscription timestamps
CREATE OR REPLACE FUNCTION update_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscription
  BEFORE UPDATE ON "subscriptions"
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_timestamp();

-- Function to update usage tracking timestamp
CREATE OR REPLACE FUNCTION update_usage_tracking_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_usage_tracking
  BEFORE UPDATE ON "usage_tracking"
  FOR EACH ROW
  EXECUTE FUNCTION update_usage_tracking_timestamp();

-- Function to update location timestamp
CREATE OR REPLACE FUNCTION update_location_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_location
  BEFORE UPDATE ON "locations"
  FOR EACH ROW
  EXECUTE FUNCTION update_location_timestamp();
