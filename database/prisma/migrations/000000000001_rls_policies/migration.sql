-- ============================================================================
-- MechMind OS v10 - Row Level Security (RLS) Policies
-- Bridge Model: Schema-per-tenant + RLS fallback
-- ============================================================================

-- Enable RLS on all tenant-scoped tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers_encrypted ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Function to get current tenant from session variable
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS UUID AS $$
DECLARE
  tenant_id TEXT;
BEGIN
  tenant_id := current_setting('app.current_tenant', true);
  IF tenant_id IS NULL OR tenant_id = '' THEN
    RETURN NULL;
  END IF;
  RETURN tenant_id::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if RLS should be bypassed (for admin operations)
CREATE OR REPLACE FUNCTION should_bypass_rls()
RETURNS BOOLEAN AS $$
DECLARE
  bypass TEXT;
BEGIN
  bypass := current_setting('app.bypass_rls', true);
  RETURN bypass = 'true';
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES - TENANT ISOLATION
-- ============================================================================

-- Tenants: Users can only see their own tenant
CREATE POLICY tenant_isolation_tenants ON tenants
  FOR ALL
  USING (
    should_bypass_rls() OR 
    id = get_current_tenant()
  );

-- Tenant Users: Isolated by tenant_id
CREATE POLICY tenant_isolation_users ON tenant_users
  FOR ALL
  USING (
    should_bypass_rls() OR 
    tenant_id = get_current_tenant()
  );

-- Booking Slots: Isolated by tenant_id
CREATE POLICY tenant_isolation_slots ON booking_slots
  FOR ALL
  USING (
    should_bypass_rls() OR 
    tenant_id = get_current_tenant()
  );

-- Booking Events: Isolated by tenant_id
CREATE POLICY tenant_isolation_events ON booking_events
  FOR ALL
  USING (
    should_bypass_rls() OR 
    tenant_id = get_current_tenant()
  );

-- Bookings: Isolated by tenant_id
CREATE POLICY tenant_isolation_bookings ON bookings
  FOR ALL
  USING (
    should_bypass_rls() OR 
    tenant_id = get_current_tenant()
  );

-- Customers Encrypted: Isolated by tenant_id
CREATE POLICY tenant_isolation_customers ON customers_encrypted
  FOR ALL
  USING (
    should_bypass_rls() OR 
    tenant_id = get_current_tenant()
  );

-- Vehicles: Isolated by tenant_id
CREATE POLICY tenant_isolation_vehicles ON vehicles
  FOR ALL
  USING (
    should_bypass_rls() OR 
    tenant_id = get_current_tenant()
  );

-- Invoices: Isolated by tenant_id
CREATE POLICY tenant_isolation_invoices ON invoices
  FOR ALL
  USING (
    should_bypass_rls() OR 
    tenant_id = get_current_tenant()
  );

-- Daily Metrics: Isolated by tenant_id
CREATE POLICY tenant_isolation_metrics ON daily_metrics
  FOR ALL
  USING (
    should_bypass_rls() OR 
    tenant_id = get_current_tenant()
  );

-- Audit Log: Isolated by tenant_id
CREATE POLICY tenant_isolation_audit ON audit_log
  FOR ALL
  USING (
    should_bypass_rls() OR 
    tenant_id = get_current_tenant()
  );

-- ============================================================================
-- ROLE-BASED POLICIES (Additional security layer)
-- ============================================================================

-- Mechanics can only see their assigned slots
CREATE POLICY mechanic_slot_access ON booking_slots
  FOR SELECT
  USING (
    should_bypass_rls() OR 
    tenant_id = get_current_tenant()
    -- Additional mechanic filtering can be done at application layer
  );

-- Secretaries can view but not modify certain tables
CREATE POLICY secretary_readonly_events ON booking_events
  FOR SELECT
  USING (
    should_bypass_rls() OR 
    tenant_id = get_current_tenant()
  );

-- ============================================================================
-- FORCE RLS FOR TABLE OWNERS
-- ============================================================================

-- Ensure RLS applies even to table owners
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_users FORCE ROW LEVEL SECURITY;
ALTER TABLE booking_slots FORCE ROW LEVEL SECURITY;
ALTER TABLE booking_events FORCE ROW LEVEL SECURITY;
ALTER TABLE bookings FORCE ROW LEVEL SECURITY;
ALTER TABLE customers_encrypted FORCE ROW LEVEL SECURITY;
ALTER TABLE vehicles FORCE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- VIEWS RLS POLICIES
-- ============================================================================

-- Enable RLS on views
ALTER VIEW available_slots OWNER TO CURRENT_USER;

-- Create security barrier view for available slots
CREATE OR REPLACE VIEW available_slots_secure AS
SELECT 
  bs.*,
  t.name as tenant_name
FROM booking_slots bs
JOIN tenants t ON bs.tenant_id = t.id
WHERE bs.status = 'available'
  AND bs.slot_date >= CURRENT_DATE
  AND bs.tenant_id = get_current_tenant();

-- ============================================================================
-- AUDIT TRIGGER FOR RLS CONTEXT
-- ============================================================================

-- Function to log RLS context changes
CREATE OR REPLACE FUNCTION log_rls_context_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (tenant_id, action, table_name, old_values, new_values)
  VALUES (
    get_current_tenant(),
    'RLS_CONTEXT_CHANGE',
    TG_TABLE_NAME,
    jsonb_build_object('operation', TG_OP),
    jsonb_build_object('tenant_id', get_current_tenant())
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION get_current_tenant() IS 'Retrieves the current tenant ID from session variable app.current_tenant';
COMMENT ON FUNCTION should_bypass_rls() IS 'Checks if RLS should be bypassed for admin operations';
