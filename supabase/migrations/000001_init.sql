-- ============================================================================
-- MechMind OS v10 - Initial Migration
-- Multi-tenant SaaS Database Schema
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ============================================================================
-- IDENTITY & TENANCY
-- ============================================================================

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  subscription_tier VARCHAR(50) DEFAULT 'starter',
  encryption_key_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tenants_subscription_tier ON tenants(subscription_tier);
CREATE INDEX idx_tenants_created_at ON tenants(created_at);

CREATE TABLE tenant_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'mechanic', 'secretary')),
  auth0_sub VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

CREATE INDEX idx_tenant_users_tenant_id ON tenant_users(tenant_id);
CREATE INDEX idx_tenant_users_role ON tenant_users(role);
CREATE INDEX idx_tenant_users_auth0_sub ON tenant_users(auth0_sub);

-- ============================================================================
-- BOOKING ENGINE (EVENT SOURCED)
-- ============================================================================

CREATE TABLE booking_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  mechanic_id UUID NOT NULL,
  slot_date DATE NOT NULL,
  slot_start TIME NOT NULL,
  slot_end TIME NOT NULL,
  slot_type VARCHAR(50) DEFAULT '30min' CHECK (slot_type IN ('30min', '60min', '90min', '120min')),
  status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'booked', 'blocked', 'cancelled')),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_booking_slots_tenant_mechanic_date ON booking_slots(tenant_id, mechanic_id, slot_date);
CREATE INDEX idx_booking_slots_tenant_status ON booking_slots(tenant_id, status);
CREATE INDEX idx_booking_slots_date_start ON booking_slots(slot_date, slot_start);

CREATE TABLE booking_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  slot_id UUID NOT NULL REFERENCES booking_slots(id),
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'SLOT_CREATED', 'SLOT_BOOKED', 'SLOT_CANCELLED', 'SLOT_RELEASED',
    'BOOKING_CREATED', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_RESCHEDULED',
    'PAYMENT_INITIATED', 'PAYMENT_COMPLETED', 'PAYMENT_FAILED', 'PAYMENT_REFUNDED'
  )),
  event_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  is_anonymized BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_booking_events_tenant_slot ON booking_events(tenant_id, slot_id);
CREATE INDEX idx_booking_events_tenant_type_created ON booking_events(tenant_id, event_type, created_at);
CREATE INDEX idx_booking_events_created_at ON booking_events(created_at);
CREATE INDEX idx_booking_events_tenant_anonymized ON booking_events(tenant_id, is_anonymized);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  slot_id UUID NOT NULL REFERENCES booking_slots(id),
  customer_id UUID NOT NULL,
  vehicle_id UUID,
  estimated_duration_minutes INT DEFAULT 60,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  total_cost_cents BIGINT,
  payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'insurance')),
  payment_status VARCHAR(50) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'partial', 'refunded', 'failed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bookings_tenant_customer ON bookings(tenant_id, customer_id);
CREATE INDEX idx_bookings_tenant_status ON bookings(tenant_id, status);
CREATE INDEX idx_bookings_tenant_payment ON bookings(tenant_id, payment_status);
CREATE INDEX idx_bookings_slot_id ON bookings(slot_id);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);

-- ============================================================================
-- CUSTOMER DATA (ENCRYPTED, PII SEPARATED)
-- ============================================================================

CREATE TABLE customers_encrypted (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  phone_encrypted BYTEA NOT NULL,
  email_encrypted BYTEA NOT NULL,
  name_encrypted BYTEA NOT NULL,
  gdpr_consent BOOLEAN DEFAULT FALSE,
  gdpr_consent_date TIMESTAMP,
  data_retention_days INT DEFAULT 365,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_customers_tenant_deleted ON customers_encrypted(tenant_id, is_deleted);
CREATE INDEX idx_customers_tenant_gdpr ON customers_encrypted(tenant_id, gdpr_consent);
CREATE INDEX idx_customers_created_at ON customers_encrypted(created_at);
CREATE INDEX idx_customers_retention ON customers_encrypted(data_retention_days);

-- Add foreign key to bookings after customers table exists
ALTER TABLE bookings 
  ADD CONSTRAINT fk_bookings_customer 
  FOREIGN KEY (customer_id) REFERENCES customers_encrypted(id);

-- ============================================================================
-- VEHICLES
-- ============================================================================

CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id UUID NOT NULL REFERENCES customers_encrypted(id),
  license_plate VARCHAR(10) NOT NULL,
  make VARCHAR(100),
  model VARCHAR(100),
  year INT,
  last_service_date DATE,
  next_service_due_km INT,
  UNIQUE(tenant_id, license_plate)
);

CREATE INDEX idx_vehicles_tenant_customer ON vehicles(tenant_id, customer_id);
CREATE INDEX idx_vehicles_license_plate ON vehicles(license_plate);

-- Add foreign key to bookings after vehicles table exists
ALTER TABLE bookings 
  ADD CONSTRAINT fk_bookings_vehicle 
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id);

-- ============================================================================
-- INVOICES
-- ============================================================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  booking_id UUID REFERENCES bookings(id),
  customer_id UUID NOT NULL REFERENCES customers_encrypted(id),
  total_cents BIGINT NOT NULL,
  tax_cents BIGINT,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  payment_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invoices_tenant_status ON invoices(tenant_id, status);
CREATE INDEX idx_invoices_tenant_customer ON invoices(tenant_id, customer_id);
CREATE INDEX idx_invoices_booking_id ON invoices(booking_id);
CREATE INDEX idx_invoices_created_at ON invoices(created_at);

-- ============================================================================
-- ANALYTICS
-- ============================================================================

CREATE TABLE daily_metrics (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  metric_date DATE NOT NULL,
  bookings_count INT DEFAULT 0,
  revenue_cents BIGINT DEFAULT 0,
  avg_duration_minutes INT,
  mechanics_active INT,
  parts_used INT,
  refreshed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, metric_date)
);

CREATE INDEX idx_daily_metrics_tenant_date ON daily_metrics(tenant_id, metric_date);
CREATE INDEX idx_daily_metrics_date ON daily_metrics(metric_date);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID REFERENCES tenant_users(id),
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_log_tenant_created ON audit_log(tenant_id, created_at);
CREATE INDEX idx_audit_log_tenant_action ON audit_log(tenant_id, action);
CREATE INDEX idx_audit_log_tenant_table ON audit_log(tenant_id, table_name);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- ============================================================================
-- TRIGGERS FOR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_booking_slots_updated_at
  BEFORE UPDATE ON booking_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS FOR READ-OPTIMIZED QUERIES
-- ============================================================================

-- View: Available slots for quick lookup
CREATE VIEW available_slots AS
SELECT 
  bs.*,
  t.name as tenant_name
FROM booking_slots bs
JOIN tenants t ON bs.tenant_id = t.id
WHERE bs.status = 'available'
  AND bs.slot_date >= CURRENT_DATE;

-- View: Booking summary with customer reference (no PII)
CREATE VIEW booking_summary AS
SELECT 
  b.id,
  b.tenant_id,
  b.slot_id,
  b.customer_id,
  b.vehicle_id,
  b.status,
  b.payment_status,
  b.total_cost_cents,
  b.created_at,
  bs.slot_date,
  bs.slot_start,
  bs.slot_end,
  bs.mechanic_id
FROM bookings b
JOIN booking_slots bs ON b.slot_id = bs.id;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE tenants IS 'Multi-tenant isolation root table';
COMMENT ON TABLE booking_events IS 'Event store for CQRS - immutable event log';
COMMENT ON TABLE customers_encrypted IS 'PII data encrypted with AES-256 via pgcrypto';
COMMENT ON TABLE audit_log IS 'GDPR-compliant audit trail for all data changes';

COMMENT ON COLUMN booking_events.event_data IS 'JSONB containing event payload with REFERENCES to PII, never PII directly';
COMMENT ON COLUMN customers_encrypted.phone_encrypted IS 'AES-256 encrypted phone number';
COMMENT ON COLUMN customers_encrypted.email_encrypted IS 'AES-256 encrypted email address';
COMMENT ON COLUMN customers_encrypted.name_encrypted IS 'AES-256 encrypted customer name';
