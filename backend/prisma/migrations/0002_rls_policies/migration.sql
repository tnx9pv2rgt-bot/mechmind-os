-- RLS Policies for Multi-Tenant Isolation
-- Every tenant-scoped table gets ROW LEVEL SECURITY enabled
-- Policy: rows are visible only when tenant_id matches app.current_tenant setting

-- Helper: create RLS policy idempotently
CREATE OR REPLACE FUNCTION _create_rls_policy(tbl text) RETURNS void AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = tbl AND policyname = tbl || '_tenant_isolation'
  ) THEN
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (tenant_id = current_setting(''app.current_tenant'', true)::text)',
      tbl || '_tenant_isolation', tbl
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Core tables
SELECT _create_rls_policy('users');
SELECT _create_rls_policy('customers');
SELECT _create_rls_policy('bookings');
SELECT _create_rls_policy('booking_slots');
SELECT _create_rls_policy('services');

-- DVI
SELECT _create_rls_policy('inspections');
SELECT _create_rls_policy('inspection_templates');

-- OBD
SELECT _create_rls_policy('obd_devices');
SELECT _create_rls_policy('obd_readings');

-- Parts & Inventory
SELECT _create_rls_policy('parts');
SELECT _create_rls_policy('suppliers');
SELECT _create_rls_policy('inventory_items');
SELECT _create_rls_policy('inventory_movements');
SELECT _create_rls_policy('purchase_orders');

-- Notifications
SELECT _create_rls_policy('notifications');

-- Subscription & Pricing
SELECT _create_rls_policy('subscriptions');
SELECT _create_rls_policy('usage_tracking');
SELECT _create_rls_policy('subscription_changes');
SELECT _create_rls_policy('locations');

-- Voice
SELECT _create_rls_policy('voice_webhook_events');
SELECT _create_rls_policy('call_recordings');

-- GDPR
SELECT _create_rls_policy('customers_encrypted');
SELECT _create_rls_policy('audit_logs');
SELECT _create_rls_policy('consent_audit_logs');
SELECT _create_rls_policy('data_subject_requests');
SELECT _create_rls_policy('data_retention_execution_logs');

-- LPR (License Plate Recognition)
SELECT _create_rls_policy('license_plate_detections');
SELECT _create_rls_policy('vehicle_entry_exits');
SELECT _create_rls_policy('parking_sessions');
SELECT _create_rls_policy('lpr_cameras');

-- Shop Floor
SELECT _create_rls_policy('shop_floors');
SELECT _create_rls_policy('shop_floor_events');
SELECT _create_rls_policy('work_orders');
SELECT _create_rls_policy('technicians');

-- Vehicle Twin
SELECT _create_rls_policy('vehicle_twin_configs');
SELECT _create_rls_policy('vehicle_twin_components');
SELECT _create_rls_policy('component_histories');
SELECT _create_rls_policy('vehicle_health_histories');
SELECT _create_rls_policy('vehicle_damages');

-- Auth
SELECT _create_rls_policy('auth_audit_logs');
SELECT _create_rls_policy('magic_links');

-- New modules (scaffold)
SELECT _create_rls_policy('fleets');
SELECT _create_rls_policy('fleet_vehicles');
SELECT _create_rls_policy('tire_sets');
SELECT _create_rls_policy('estimates');
SELECT _create_rls_policy('labor_guides');
SELECT _create_rls_policy('labor_guide_entries');
SELECT _create_rls_policy('accounting_syncs');

-- Cleanup helper function
DROP FUNCTION _create_rls_policy(text);
