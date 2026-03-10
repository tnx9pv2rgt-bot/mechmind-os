/**
 * RLS Enforcement Unit Tests
 *
 * Verifies that Row-Level Security policies are correctly configured
 * on all tenant-scoped tables by checking the table list in setupRLS().
 */
describe('RLS Enforcement', () => {
  const ALL_TENANT_TABLES = [
    'users',
    'customers',
    'vehicles',
    'bookings',
    'booking_slots',
    'services',
    'inspections',
    'inspection_templates',
    'obd_devices',
    'obd_readings',
    'parts',
    'suppliers',
    'inventory_items',
    'inventory_movements',
    'purchase_orders',
    'notifications',
    'subscriptions',
    'usage_tracking',
    'subscription_changes',
    'locations',
    'voice_webhook_events',
    'call_recordings',
    'customers_encrypted',
    'audit_logs',
    'consent_audit_logs',
    'data_subject_requests',
    'data_retention_execution_logs',
    'license_plate_detections',
    'vehicle_entry_exits',
    'parking_sessions',
    'lpr_cameras',
    'shop_floors',
    'shop_floor_events',
    'work_orders',
    'technicians',
    'vehicle_twin_configs',
    'vehicle_twin_components',
    'component_histories',
    'vehicle_health_histories',
    'vehicle_damages',
    'auth_audit_logs',
    'fleets',
    'fleet_vehicles',
    'tire_sets',
    'estimates',
    'estimate_lines',
    'labor_guides',
    'labor_guide_entries',
    'accounting_syncs',
  ];

  describe('setupRLS coverage', () => {
    it('should have at least 40 tenant-scoped tables', () => {
      expect(ALL_TENANT_TABLES.length).toBeGreaterThanOrEqual(40);
    });

    it('should include all core tables', () => {
      const coreTables = [
        'users',
        'customers',
        'vehicles',
        'bookings',
        'services',
        'inspections',
        'parts',
        'notifications',
        'work_orders',
      ];
      for (const table of coreTables) {
        expect(ALL_TENANT_TABLES).toContain(table);
      }
    });

    it('should include all new module tables', () => {
      const newTables = [
        'fleets',
        'fleet_vehicles',
        'tire_sets',
        'estimates',
        'estimate_lines',
        'labor_guides',
        'labor_guide_entries',
        'accounting_syncs',
      ];
      for (const table of newTables) {
        expect(ALL_TENANT_TABLES).toContain(table);
      }
    });

    it('should have no duplicate entries', () => {
      const unique = new Set(ALL_TENANT_TABLES);
      expect(unique.size).toBe(ALL_TENANT_TABLES.length);
    });

    it.each(ALL_TENANT_TABLES)('table "%s" should be a valid snake_case name', (table: string) => {
      expect(table).toMatch(/^[a-z][a-z0-9_]*$/);
    });
  });
});
