-- Migration: Add Tenant model for Stripe Billing
-- Created: 2026-03-04

-- Create Tenant table
CREATE TABLE IF NOT EXISTS "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "vatNumber" TEXT,
    
    -- Stripe fields
    "stripeCustomerId" TEXT UNIQUE,
    "stripeSubscriptionId" TEXT UNIQUE,
    "subscriptionStatus" TEXT DEFAULT 'inactive',
    "subscriptionPlan" TEXT DEFAULT 'piccole',
    "aiAddon" BOOLEAN DEFAULT false,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN DEFAULT false,
    "gracePeriodEnd" TIMESTAMP(3),
    "isSuspended" BOOLEAN DEFAULT false,
    
    -- Usage tracking
    "aiCallsThisMonth" INTEGER DEFAULT 0,
    "storageUsed" INTEGER DEFAULT 0,
    "lastUsageReset" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- Create index for Stripe lookups
CREATE INDEX "Tenant_stripeCustomerId_idx" ON "Tenant"("stripeCustomerId");
CREATE INDEX "Tenant_stripeSubscriptionId_idx" ON "Tenant"("stripeSubscriptionId");
CREATE INDEX "Tenant_subscriptionStatus_idx" ON "Tenant"("subscriptionStatus");

-- Add tenantId to existing tables for multi-tenancy
-- Note: Run these only if the columns don't exist

-- Add tenantId to Vehicle if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='Vehicle' AND column_name='tenantId'
    ) THEN
        ALTER TABLE "Vehicle" ADD COLUMN "tenantId" TEXT;
        CREATE INDEX "Vehicle_tenantId_idx" ON "Vehicle"("tenantId");
    END IF;
END $$;

-- Add tenantId to Inspection if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='Inspection' AND column_name='tenantId'
    ) THEN
        ALTER TABLE "Inspection" ADD COLUMN "tenantId" TEXT;
        CREATE INDEX "Inspection_tenantId_idx" ON "Inspection"("tenantId");
    END IF;
END $$;

-- Add tenantId to Inspector if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='Inspector' AND column_name='tenantId'
    ) THEN
        ALTER TABLE "Inspector" ADD COLUMN "tenantId" TEXT;
        CREATE INDEX "Inspector_tenantId_idx" ON "Inspector"("tenantId");
    END IF;
END $$;

-- Add tenantId to Warranty if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='Warranty' AND column_name='tenantId'
    ) THEN
        ALTER TABLE "Warranty" ADD COLUMN "tenantId" TEXT;
        CREATE INDEX "Warranty_tenantId_idx" ON "Warranty"("tenantId");
    END IF;
END $$;

-- Create updatedAt trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for Tenant updatedAt
DROP TRIGGER IF EXISTS update_tenant_updated_at ON "Tenant";
CREATE TRIGGER update_tenant_updated_at
    BEFORE UPDATE ON "Tenant"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
