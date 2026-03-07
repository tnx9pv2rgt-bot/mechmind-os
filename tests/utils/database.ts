/**
 * MechMind OS v10 - Database Test Utilities
 * Database setup, teardown, and helper functions for tests
 */

import { Pool, Client } from 'pg';
import { DataSource } from 'typeorm';

// Test database configuration
export const testDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'mechmind_test',
  password: process.env.DB_PASSWORD || 'test_password',
  database: process.env.DB_DATABASE || 'mechmind_test',
  ssl: process.env.DB_SSL === 'true',
};

// Connection pool for tests
let testPool: Pool | null = null;

/**
 * Get or create test database pool
 */
export function getTestPool(): Pool {
  if (!testPool) {
    testPool = new Pool({
      ...testDbConfig,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return testPool;
}

/**
 * Create TypeORM data source for integration tests
 */
export function createTestDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    ...testDbConfig,
    entities: ['src/**/*.entity.ts'],
    synchronize: false, // Don't auto-sync in tests
    logging: process.env.DB_LOGGING === 'true',
    extra: {
      // Advisory lock settings
      application_name: 'mechmind_test',
    },
  });
}

/**
 * Setup test database - create schema and seed data
 */
export async function setupTestDatabase(): Promise<void> {
  const pool = getTestPool();
  const client = await pool.connect();
  
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    // Create test schema
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS test;
      SET search_path TO test, public;
    `);
    
    // Create test tables
    await client.query(`
      -- Tenants table
      CREATE TABLE IF NOT EXISTS test.tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        subscription_tier VARCHAR(50) DEFAULT 'basic',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      -- Shops table with RLS
      CREATE TABLE IF NOT EXISTS test.shops (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES test.tenants(id),
        name VARCHAR(255) NOT NULL,
        address TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      -- Customers table with encrypted PII
      CREATE TABLE IF NOT EXISTS test.customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES test.tenants(id),
        shop_id UUID NOT NULL REFERENCES test.shops(id),
        first_name_encrypted TEXT NOT NULL,
        last_name_encrypted TEXT NOT NULL,
        phone_encrypted TEXT NOT NULL,
        email_encrypted TEXT,
        gdpr_consent BOOLEAN DEFAULT FALSE,
        gdpr_consent_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );
      
      -- Bookings table with exclusion constraint
      CREATE TABLE IF NOT EXISTS test.bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES test.tenants(id),
        shop_id UUID NOT NULL REFERENCES test.shops(id),
        customer_id UUID REFERENCES test.customers(id),
        service_type VARCHAR(100) NOT NULL,
        scheduled_at TIMESTAMPTZ NOT NULL,
        duration_minutes INTEGER NOT NULL DEFAULT 60,
        status VARCHAR(50) DEFAULT 'pending',
        technician_id UUID,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        
        -- Prevent double bookings: same shop, overlapping time slots
        CONSTRAINT no_double_booking EXCLUDE USING GIST (
          shop_id WITH =,
          tsrange(scheduled_at, scheduled_at + (duration_minutes || ' minutes')::INTERVAL) WITH &&
        ) WHERE (status NOT IN ('cancelled', 'no_show'))
      );
      
      -- Event store for audit trail
      CREATE TABLE IF NOT EXISTS test.events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        aggregate_type VARCHAR(100) NOT NULL,
        aggregate_id UUID NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        event_data JSONB NOT NULL,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID
      );
      
      -- GDPR audit log
      CREATE TABLE IF NOT EXISTS test.gdpr_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        customer_id UUID,
        action VARCHAR(100) NOT NULL,
        data_subject VARCHAR(100),
        details JSONB,
        performed_by UUID,
        performed_at TIMESTAMPTZ DEFAULT NOW(),
        legal_basis VARCHAR(100)
      );
      
      -- Advisory lock tracking
      CREATE TABLE IF NOT EXISTS test.lock_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lock_id BIGINT NOT NULL,
        tenant_id UUID NOT NULL,
        resource_type VARCHAR(100) NOT NULL,
        resource_id UUID NOT NULL,
        acquired_at TIMESTAMPTZ DEFAULT NOW(),
        released_at TIMESTAMPTZ,
        acquired_successfully BOOLEAN DEFAULT FALSE
      );
    `);
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_shop_time ON test.bookings(shop_id, scheduled_at);
      CREATE INDEX IF NOT EXISTS idx_bookings_customer ON test.bookings(customer_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_status ON test.bookings(status);
      CREATE INDEX IF NOT EXISTS idx_events_aggregate ON test.events(aggregate_type, aggregate_id);
      CREATE INDEX IF NOT EXISTS idx_events_tenant ON test.events(tenant_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_gdpr_audit_customer ON test.gdpr_audit_log(customer_id);
      CREATE INDEX IF NOT EXISTS idx_gdpr_audit_tenant ON test.gdpr_audit_log(tenant_id, performed_at);
    `);
    
    // Enable RLS on tables
    await client.query(`
      ALTER TABLE test.shops ENABLE ROW LEVEL SECURITY;
      ALTER TABLE test.customers ENABLE ROW LEVEL SECURITY;
      ALTER TABLE test.bookings ENABLE ROW LEVEL SECURITY;
      ALTER TABLE test.events ENABLE ROW LEVEL SECURITY;
      ALTER TABLE test.gdpr_audit_log ENABLE ROW LEVEL SECURITY;
    `);
    
    // Create RLS policies
    await client.query(`
      -- Shops RLS policy
      CREATE POLICY tenant_isolation_shops ON test.shops
        USING (tenant_id = current_setting('app.current_tenant')::UUID);
      
      -- Customers RLS policy
      CREATE POLICY tenant_isolation_customers ON test.customers
        USING (tenant_id = current_setting('app.current_tenant')::UUID);
      
      -- Bookings RLS policy
      CREATE POLICY tenant_isolation_bookings ON test.bookings
        USING (tenant_id = current_setting('app.current_tenant')::UUID);
      
      -- Events RLS policy
      CREATE POLICY tenant_isolation_events ON test.events
        USING (tenant_id = current_setting('app.current_tenant')::UUID);
      
      -- GDPR audit RLS policy
      CREATE POLICY tenant_isolation_gdpr ON test.gdpr_audit_log
        USING (tenant_id = current_setting('app.current_tenant')::UUID);
    `);
    
    // Create functions for advisory locks
    await client.query(`
      -- Function to acquire advisory lock with timeout
      CREATE OR REPLACE FUNCTION test.acquire_booking_lock(
        p_shop_id UUID,
        p_scheduled_at TIMESTAMPTZ,
        p_timeout_ms INTEGER DEFAULT 5000
      ) RETURNS BOOLEAN AS $$
      DECLARE
        v_lock_id BIGINT;
        v_acquired BOOLEAN := FALSE;
        v_start_time TIMESTAMPTZ;
      BEGIN
        v_lock_id := ('x' || substr(md5(p_shop_id::TEXT || p_scheduled_at::TEXT), 1, 16))::bit(64)::BIGINT;
        v_start_time := clock_timestamp();
        
        WHILE NOT v_acquired AND clock_timestamp() - v_start_time < (p_timeout_ms || ' milliseconds')::INTERVAL LOOP
          v_acquired := pg_try_advisory_lock(v_lock_id);
          IF NOT v_acquired THEN
            PERFORM pg_sleep(0.01); -- 10ms backoff
          END IF;
        END LOOP;
        
        RETURN v_acquired;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Function to release advisory lock
      CREATE OR REPLACE FUNCTION test.release_booking_lock(
        p_shop_id UUID,
        p_scheduled_at TIMESTAMPTZ
      ) RETURNS BOOLEAN AS $$
      DECLARE
        v_lock_id BIGINT;
      BEGIN
        v_lock_id := ('x' || substr(md5(p_shop_id::TEXT || p_scheduled_at::TEXT), 1, 16))::bit(64)::BIGINT;
        RETURN pg_advisory_unlock(v_lock_id);
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Teardown test database - clean up all test data
 */
export async function teardownTestDatabase(): Promise<void> {
  const pool = getTestPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Truncate all test tables
    await client.query(`
      TRUNCATE TABLE test.lock_attempts CASCADE;
      TRUNCATE TABLE test.gdpr_audit_log CASCADE;
      TRUNCATE TABLE test.events CASCADE;
      TRUNCATE TABLE test.bookings CASCADE;
      TRUNCATE TABLE test.customers CASCADE;
      TRUNCATE TABLE test.shops CASCADE;
      TRUNCATE TABLE test.tenants CASCADE;
    `);
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Clean up test database - drop schema
 */
export async function cleanupTestDatabase(): Promise<void> {
  const pool = getTestPool();
  const client = await pool.connect();
  
  try {
    await client.query('DROP SCHEMA IF EXISTS test CASCADE');
  } finally {
    client.release();
  }
}

/**
 * Close test database pool
 */
export async function closeTestPool(): Promise<void> {
  if (testPool) {
    await testPool.end();
    testPool = null;
  }
}

/**
 * Execute query within a transaction with automatic rollback
 */
export async function withTransaction<T>(
  callback: (client: Client) => Promise<T>
): Promise<T> {
  const pool = getTestPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client as unknown as Client);
    await client.query('ROLLBACK');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Set tenant context for RLS
 */
export async function setTenantContext(
  client: Client,
  tenantId: string
): Promise<void> {
  await client.query(`SET app.current_tenant = '${tenantId}'`);
}

/**
 * Clear tenant context
 */
export async function clearTenantContext(client: Client): Promise<void> {
  await client.query('RESET app.current_tenant');
}
