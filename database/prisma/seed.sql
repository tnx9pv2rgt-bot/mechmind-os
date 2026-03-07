-- ============================================================================
-- MechMind OS v10 - Database Seed Data
-- Sample data for development and testing
-- ============================================================================

-- ============================================================================
-- SAMPLE TENANTS
-- ============================================================================

INSERT INTO tenants (id, name, subscription_tier, encryption_key_id, created_at)
VALUES 
  (
    '550e8400-e29b-41d4-a716-446655440000',
    'AutoFix Pro Shop',
    'professional',
    '550e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '1 year'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002',
    'QuickLube Express',
    'starter',
    '550e8400-e29b-41d4-a716-446655440003',
    NOW() - INTERVAL '6 months'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440004',
    'Elite Motors Service',
    'enterprise',
    '550e8400-e29b-41d4-a716-446655440005',
    NOW() - INTERVAL '3 months'
  );

-- ============================================================================
-- SAMPLE USERS (Different Roles)
-- ============================================================================

INSERT INTO tenant_users (id, tenant_id, email, role, auth0_sub, created_at)
VALUES
  -- AutoFix Pro Shop users
  (
    '660e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440000',
    'admin@autofixpro.com',
    'admin',
    'auth0|admin-autofix-001',
    NOW() - INTERVAL '1 year'
  ),
  (
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440000',
    'john.mechanic@autofixpro.com',
    'mechanic',
    'auth0|mechanic-john-001',
    NOW() - INTERVAL '11 months'
  ),
  (
    '660e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440000',
    'sarah.secy@autofixpro.com',
    'secretary',
    'auth0|secy-sarah-001',
    NOW() - INTERVAL '10 months'
  ),
  (
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440000',
    'mike.mechanic@autofixpro.com',
    'mechanic',
    'auth0|mechanic-mike-001',
    NOW() - INTERVAL '8 months'
  ),
  -- QuickLube Express users
  (
    '660e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440002',
    'owner@quicklube.com',
    'admin',
    'auth0|admin-quicklube-001',
    NOW() - INTERVAL '6 months'
  ),
  (
    '660e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440002',
    'tech@quicklube.com',
    'mechanic',
    'auth0|mechanic-tech-001',
    NOW() - INTERVAL '5 months'
  ),
  -- Elite Motors users
  (
    '660e8400-e29b-41d4-a716-446655440006',
    '550e8400-e29b-41d4-a716-446655440004',
    'manager@elitemotors.com',
    'admin',
    'auth0|admin-elite-001',
    NOW() - INTERVAL '3 months'
  ),
  (
    '660e8400-e29b-41d4-a716-446655440007',
    '550e8400-e29b-41d4-a716-446655440004',
    'master@elitemotors.com',
    'mechanic',
    'auth0|mechanic-master-001',
    NOW() - INTERVAL '3 months'
  );

-- ============================================================================
-- ENCRYPTION KEYS
-- ============================================================================

INSERT INTO encryption_keys (id, tenant_id, key_name, key_reference, algorithm, created_at, is_active)
VALUES
  (
    '770e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440000',
    'primary-customer-key',
    'aws:kms:us-east-1:123456789:key/autofix-customer-001',
    'AES-256-GCM',
    NOW() - INTERVAL '1 year',
    TRUE
  ),
  (
    '770e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    'primary-customer-key',
    'aws:kms:us-east-1:123456789:key/quicklube-customer-001',
    'AES-256-GCM',
    NOW() - INTERVAL '6 months',
    TRUE
  ),
  (
    '770e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440004',
    'primary-customer-key',
    'aws:kms:us-east-1:123456789:key/elite-customer-001',
    'AES-256-GCM',
    NOW() - INTERVAL '3 months',
    TRUE
  );

-- ============================================================================
-- SAMPLE ENCRYPTED CUSTOMERS
-- ============================================================================
-- Using a demo encryption key for seed data
-- In production, these would be encrypted with actual KMS keys

INSERT INTO customers_encrypted (
  id, tenant_id, phone_encrypted, email_encrypted, name_encrypted,
  gdpr_consent, gdpr_consent_date, data_retention_days, created_at
)
VALUES
  -- AutoFix Pro Shop customers
  (
    '880e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440000',
    encrypt_pii('+1-555-0101', 'demo-key-001'),
    encrypt_pii('alice.johnson@email.com', 'demo-key-001'),
    encrypt_pii('Alice Johnson', 'demo-key-001'),
    TRUE,
    NOW() - INTERVAL '6 months',
    365,
    NOW() - INTERVAL '6 months'
  ),
  (
    '880e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440000',
    encrypt_pii('+1-555-0102', 'demo-key-001'),
    encrypt_pii('bob.smith@email.com', 'demo-key-001'),
    encrypt_pii('Bob Smith', 'demo-key-001'),
    TRUE,
    NOW() - INTERVAL '5 months',
    365,
    NOW() - INTERVAL '5 months'
  ),
  (
    '880e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440000',
    encrypt_pii('+1-555-0103', 'demo-key-001'),
    encrypt_pii('carol.white@email.com', 'demo-key-001'),
    encrypt_pii('Carol White', 'demo-key-001'),
    TRUE,
    NOW() - INTERVAL '4 months',
    730,
    NOW() - INTERVAL '4 months'
  ),
  (
    '880e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440000',
    encrypt_pii('+1-555-0104', 'demo-key-001'),
    encrypt_pii('david.brown@email.com', 'demo-key-001'),
    encrypt_pii('David Brown', 'demo-key-001'),
    TRUE,
    NOW() - INTERVAL '3 months',
    365,
    NOW() - INTERVAL '3 months'
  ),
  -- QuickLube customers
  (
    '880e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440002',
    encrypt_pii('+1-555-0201', 'demo-key-002'),
    encrypt_pii('emma.davis@email.com', 'demo-key-002'),
    encrypt_pii('Emma Davis', 'demo-key-002'),
    TRUE,
    NOW() - INTERVAL '3 months',
    365,
    NOW() - INTERVAL '3 months'
  ),
  (
    '880e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440002',
    encrypt_pii('+1-555-0202', 'demo-key-002'),
    encrypt_pii('frank.miller@email.com', 'demo-key-002'),
    encrypt_pii('Frank Miller', 'demo-key-002'),
    TRUE,
    NOW() - INTERVAL '2 months',
    365,
    NOW() - INTERVAL '2 months'
  );

-- ============================================================================
-- SAMPLE VEHICLES
-- ============================================================================

INSERT INTO vehicles (id, tenant_id, customer_id, license_plate, make, model, year, last_service_date, next_service_due_km)
VALUES
  -- Alice Johnson's vehicles
  (
    '990e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440000',
    '880e8400-e29b-41d4-a716-446655440000',
    'ABC123',
    'Toyota',
    'Camry',
    2019,
    '2024-01-15',
    5000
  ),
  (
    '990e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440000',
    '880e8400-e29b-41d4-a716-446655440000',
    'XYZ789',
    'Honda',
    'CR-V',
    2021,
    '2024-02-20',
    3000
  ),
  -- Bob Smith's vehicle
  (
    '990e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440000',
    '880e8400-e29b-41d4-a716-446655440001',
    'DEF456',
    'Ford',
    'F-150',
    2020,
    '2024-03-01',
    8000
  ),
  -- Carol White's vehicle
  (
    '990e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440000',
    '880e8400-e29b-41d4-a716-446655440002',
    'GHI789',
    'BMW',
    'X5',
    2022,
    '2024-02-10',
    2000
  ),
  -- David Brown's vehicle
  (
    '990e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440000',
    '880e8400-e29b-41d4-a716-446655440003',
    'JKL012',
    'Tesla',
    'Model 3',
    2023,
    '2024-01-25',
    10000
  ),
  -- QuickLube customers' vehicles
  (
    '990e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440002',
    '880e8400-e29b-41d4-a716-446655440004',
    'QWE123',
    'Chevrolet',
    'Malibu',
    2018,
    '2024-03-10',
    4000
  ),
  (
    '990e8400-e29b-41d4-a716-446655440006',
    '550e8400-e29b-41d4-a716-446655440002',
    '880e8400-e29b-41d4-a716-446655440005',
    'RTY456',
    'Nissan',
    'Altima',
    2020,
    '2024-03-05',
    3500
  );

-- ============================================================================
-- SAMPLE BOOKING SLOTS (Next 7 days)
-- ============================================================================

INSERT INTO booking_slots (id, tenant_id, mechanic_id, slot_date, slot_start, slot_end, slot_type, status, updated_at)
VALUES
  -- AutoFix Pro Shop - John Mechanic (today and tomorrow)
  (
    'aa0e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440000',
    '660e8400-e29b-41d4-a716-446655440001',
    CURRENT_DATE,
    '09:00:00',
    '10:00:00',
    '60min',
    'available',
    NOW()
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440000',
    '660e8400-e29b-41d4-a716-446655440001',
    CURRENT_DATE,
    '10:00:00',
    '11:00:00',
    '60min',
    'booked',
    NOW()
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440000',
    '660e8400-e29b-41d4-a716-446655440001',
    CURRENT_DATE,
    '11:00:00',
    '12:00:00',
    '60min',
    'available',
    NOW()
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440000',
    '660e8400-e29b-41d4-a716-446655440001',
    CURRENT_DATE + 1,
    '09:00:00',
    '10:00:00',
    '60min',
    'available',
    NOW()
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440000',
    '660e8400-e29b-41d4-a716-446655440001',
    CURRENT_DATE + 1,
    '10:00:00',
    '11:00:00',
    '60min',
    'available',
    NOW()
  ),
  -- AutoFix Pro Shop - Mike Mechanic
  (
    'aa0e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440000',
    '660e8400-e29b-41d4-a716-446655440003',
    CURRENT_DATE,
    '09:00:00',
    '09:30:00',
    '30min',
    'available',
    NOW()
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440006',
    '550e8400-e29b-41d4-a716-446655440000',
    '660e8400-e29b-41d4-a716-446655440003',
    CURRENT_DATE,
    '09:30:00',
    '10:00:00',
    '30min',
    'available',
    NOW()
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440007',
    '550e8400-e29b-41d4-a716-446655440000',
    '660e8400-e29b-41d4-a716-446655440003',
    CURRENT_DATE,
    '10:00:00',
    '10:30:00',
    '30min',
    'booked',
    NOW()
  ),
  -- QuickLube Express - Tech Mechanic
  (
    'aa0e8400-e29b-41d4-a716-446655440008',
    '550e8400-e29b-41d4-a716-446655440002',
    '660e8400-e29b-41d4-a716-446655440005',
    CURRENT_DATE,
    '08:00:00',
    '08:30:00',
    '30min',
    'available',
    NOW()
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440009',
    '550e8400-e29b-41d4-a716-446655440002',
    '660e8400-e29b-41d4-a716-446655440005',
    CURRENT_DATE,
    '08:30:00',
    '09:00:00',
    '30min',
    'available',
    NOW()
  );

-- ============================================================================
-- SAMPLE BOOKINGS
-- ============================================================================

INSERT INTO bookings (id, tenant_id, slot_id, customer_id, vehicle_id, estimated_duration_minutes, status, total_cost_cents, payment_method, payment_status, created_at, updated_at)
VALUES
  (
    'bb0e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440000',
    'aa0e8400-e29b-41d4-a716-446655440001',
    '880e8400-e29b-41d4-a716-446655440000',
    '990e8400-e29b-41d4-a716-446655440000',
    60,
    'confirmed',
    15000,
    'card',
    'paid',
    NOW() - INTERVAL '2 days',
    NOW()
  ),
  (
    'bb0e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440000',
    'aa0e8400-e29b-41d4-a716-446655440007',
    '880e8400-e29b-41d4-a716-446655440001',
    '990e8400-e29b-41d4-a716-446655440002',
    30,
    'confirmed',
    7500,
    'cash',
    'unpaid',
    NOW() - INTERVAL '1 day',
    NOW()
  );

-- ============================================================================
-- SAMPLE BOOKING EVENTS (Event Sourcing)
-- ============================================================================

INSERT INTO booking_events (tenant_id, slot_id, event_type, event_data, created_at, is_anonymized)
VALUES
  (
    '550e8400-e29b-41d4-a716-446655440000',
    'aa0e8400-e29b-41d4-a716-446655440001',
    'SLOT_CREATED',
    '{"slot_type": "60min", "mechanic_id": "660e8400-e29b-41d4-a716-446655440001"}'::jsonb,
    NOW() - INTERVAL '7 days',
    FALSE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440000',
    'aa0e8400-e29b-41d4-a716-446655440001',
    'BOOKING_CREATED',
    jsonb_build_object(
      'booking_id', 'bb0e8400-e29b-41d4-a716-446655440000',
      'customer_id', '880e8400-e29b-41d4-a716-446655440000',
      'vehicle_id', '990e8400-e29b-41d4-a716-446655440000',
      'timestamp', NOW() - INTERVAL '2 days'
    ),
    NOW() - INTERVAL '2 days',
    FALSE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440000',
    'aa0e8400-e29b-41d4-a716-446655440001',
    'PAYMENT_COMPLETED',
    jsonb_build_object(
      'booking_id', 'bb0e8400-e29b-41d4-a716-446655440000',
      'amount_cents', 15000,
      'method', 'card',
      'timestamp', NOW() - INTERVAL '1 day'
    ),
    NOW() - INTERVAL '1 day',
    FALSE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440000',
    'aa0e8400-e29b-41d4-a716-446655440007',
    'BOOKING_CREATED',
    jsonb_build_object(
      'booking_id', 'bb0e8400-e29b-41d4-a716-446655440001',
      'customer_id', '880e8400-e29b-41d4-a716-446655440001',
      'vehicle_id', '990e8400-e29b-41d4-a716-446655440002',
      'timestamp', NOW() - INTERVAL '1 day'
    ),
    NOW() - INTERVAL '1 day',
    FALSE
  );

-- ============================================================================
-- SAMPLE INVOICES
-- ============================================================================

INSERT INTO invoices (id, tenant_id, booking_id, customer_id, total_cents, tax_cents, status, payment_date, created_at)
VALUES
  (
    'cc0e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440000',
    'bb0e8400-e29b-41d4-a716-446655440000',
    '880e8400-e29b-41d4-a716-446655440000',
    15000,
    1250,
    'paid',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '2 days'
  ),
  (
    'cc0e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440000',
    'bb0e8400-e29b-41d4-a716-446655440001',
    '880e8400-e29b-41d4-a716-446655440001',
    7500,
    625,
    'sent',
    NULL,
    NOW() - INTERVAL '1 day'
  );

-- ============================================================================
-- SAMPLE DAILY METRICS
-- ============================================================================

INSERT INTO daily_metrics (tenant_id, metric_date, bookings_count, revenue_cents, avg_duration_minutes, mechanics_active, parts_used, refreshed_at)
VALUES
  (
    '550e8400-e29b-41d4-a716-446655440000',
    CURRENT_DATE - 7,
    12,
    125000,
    45,
    2,
    18,
    NOW()
  ),
  (
    '550e8400-e29b-41d4-a716-446655440000',
    CURRENT_DATE - 6,
    15,
    158000,
    50,
    2,
    22,
    NOW()
  ),
  (
    '550e8400-e29b-41d4-a716-446655440000',
    CURRENT_DATE - 5,
    10,
    95000,
    40,
    2,
    15,
    NOW()
  ),
  (
    '550e8400-e29b-41d4-a716-446655440000',
    CURRENT_DATE - 1,
    18,
    185000,
    55,
    2,
    28,
    NOW()
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002',
    CURRENT_DATE - 1,
    25,
    87500,
    25,
    1,
    25,
    NOW()
  );

-- ============================================================================
-- SAMPLE AUDIT LOG ENTRIES
-- ============================================================================

INSERT INTO audit_log (tenant_id, user_id, action, table_name, record_id, old_values, new_values, ip_address, created_at)
VALUES
  (
    '550e8400-e29b-41d4-a716-446655440000',
    '660e8400-e29b-41d4-a716-446655440000',
    'CREATE',
    'bookings',
    'bb0e8400-e29b-41d4-a716-446655440000',
    NULL,
    jsonb_build_object('status', 'confirmed', 'customer_id', '880e8400-e29b-41d4-a716-446655440000'),
    '192.168.1.100',
    NOW() - INTERVAL '2 days'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440000',
    '660e8400-e29b-41d4-a716-446655440002',
    'UPDATE',
    'bookings',
    'bb0e8400-e29b-41d4-a716-446655440000',
    jsonb_build_object('payment_status', 'unpaid'),
    jsonb_build_object('payment_status', 'paid'),
    '192.168.1.101',
    NOW() - INTERVAL '1 day'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440000',
    '660e8400-e29b-41d4-a716-446655440001',
    'CREATE',
    'booking_slots',
    'aa0e8400-e29b-41d4-a716-446655440000',
    NULL,
    jsonb_build_object('status', 'available', 'mechanic_id', '660e8400-e29b-41d4-a716-446655440001'),
    '192.168.1.102',
    NOW() - INTERVAL '7 days'
  );

-- ============================================================================
-- SEED DATA COMPLETE
-- ============================================================================

-- Verify seed data counts
SELECT 'Tenants' as table_name, COUNT(*) as count FROM tenants
UNION ALL
SELECT 'Tenant Users', COUNT(*) FROM tenant_users
UNION ALL
SELECT 'Customers', COUNT(*) FROM customers_encrypted
UNION ALL
SELECT 'Vehicles', COUNT(*) FROM vehicles
UNION ALL
SELECT 'Booking Slots', COUNT(*) FROM booking_slots
UNION ALL
SELECT 'Bookings', COUNT(*) FROM bookings
UNION ALL
SELECT 'Booking Events', COUNT(*) FROM booking_events
UNION ALL
SELECT 'Invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'Daily Metrics', COUNT(*) FROM daily_metrics
UNION ALL
SELECT 'Audit Log', COUNT(*) FROM audit_log;
