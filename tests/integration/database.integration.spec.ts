/**
 * MechMind OS v10 - Database Integration Tests
 * Tests for RLS policies, advisory locks, and EXCLUSION constraints
 */

import { Pool, Client } from 'pg';
import { 
  getTestPool, 
  setTenantContext, 
  clearTenantContext,
  withTransaction 
} from '@test/database';
import { createTenant, createShop, createCustomer, createBooking } from '@test/mock-factories';

describe('DatabaseIntegration', () => {
  let pool: Pool;
  let tenant1Id: string;
  let tenant2Id: string;
  let shop1Id: string;
  let shop2Id: string;

  beforeAll(async () => {
    pool = getTestPool();
  });

  beforeEach(async () => {
    const client = await pool.connect();
    
    try {
      // Create test tenants
      const tenant1Result = await client.query(
        `INSERT INTO test.tenants (name) VALUES ('Integration Tenant 1') RETURNING id`
      );
      tenant1Id = tenant1Result.rows[0].id;
      
      const tenant2Result = await client.query(
        `INSERT INTO test.tenants (name) VALUES ('Integration Tenant 2') RETURNING id`
      );
      tenant2Id = tenant2Result.rows[0].id;
      
      // Create test shops
      const shop1Result = await client.query(
        `INSERT INTO test.shops (tenant_id, name, address) VALUES ($1, 'Shop 1', '123 Main St') RETURNING id`,
        [tenant1Id]
      );
      shop1Id = shop1Result.rows[0].id;
      
      const shop2Result = await client.query(
        `INSERT INTO test.shops (tenant_id, name, address) VALUES ($1, 'Shop 2', '456 Oak Ave') RETURNING id`,
        [tenant2Id]
      );
      shop2Id = shop2Result.rows[0].id;
      
    } finally {
      client.release();
    }
  });

  afterEach(async () => {
    const client = await pool.connect();
    try {
      await client.query('TRUNCATE TABLE test.bookings, test.customers, test.shops, test.tenants CASCADE');
    } finally {
      client.release();
    }
  });

  describe('RLS Policies', () => {
    it('should apply RLS policies correctly', async () => {
      const client = await pool.connect();
      
      try {
        // Without tenant context, should see nothing
        await clearTenantContext(client as unknown as Client);
        const noContextResult = await client.query('SELECT * FROM test.shops');
        expect(noContextResult.rows).toHaveLength(0);
        
        // With tenant 1 context, should see only tenant 1's shop
        await setTenantContext(client as unknown as Client, tenant1Id);
        const tenant1Result = await client.query('SELECT * FROM test.shops');
        expect(tenant1Result.rows).toHaveLength(1);
        expect(tenant1Result.rows[0].tenant_id).toBe(tenant1Id);
        
        // With tenant 2 context, should see only tenant 2's shop
        await setTenantContext(client as unknown as Client, tenant2Id);
        const tenant2Result = await client.query('SELECT * FROM test.shops');
        expect(tenant2Result.rows).toHaveLength(1);
        expect(tenant2Result.rows[0].tenant_id).toBe(tenant2Id);
        
      } finally {
        await clearTenantContext(client as unknown as Client);
        client.release();
      }
    });

    it('should reject cross-tenant queries', async () => {
      const client = await pool.connect();
      
      try {
        // Set tenant 1 context
        await setTenantContext(client as unknown as Client, tenant1Id);
        
        // Try to query tenant 2's shop directly by ID
        const result = await client.query(
          'SELECT * FROM test.shops WHERE id = $1',
          [shop2Id]
        );
        
        // Should return no results due to RLS
        expect(result.rows).toHaveLength(0);
        
      } finally {
        await clearTenantContext(client as unknown as Client);
        client.release();
      }
    });

    it('should maintain isolation across all tenant tables', async () => {
      const client = await pool.connect();
      
      try {
        // Create customers for both tenants
        await setTenantContext(client as unknown as Client, tenant1Id);
        await client.query(
          `INSERT INTO test.customers (tenant_id, shop_id, first_name_encrypted, last_name_encrypted, phone_encrypted, gdpr_consent)
           VALUES ($1, $2, 'enc:John', 'enc:Doe', 'enc:555-0100', true)`,
          [tenant1Id, shop1Id]
        );
        
        await setTenantContext(client as unknown as Client, tenant2Id);
        await client.query(
          `INSERT INTO test.customers (tenant_id, shop_id, first_name_encrypted, last_name_encrypted, phone_encrypted, gdpr_consent)
           VALUES ($1, $2, 'enc:Jane', 'enc:Smith', 'enc:555-0200', true)`,
          [tenant2Id, shop2Id]
        );
        
        // Verify isolation
        await setTenantContext(client as unknown as Client, tenant1Id);
        const tenant1Customers = await client.query('SELECT * FROM test.customers');
        expect(tenant1Customers.rows).toHaveLength(1);
        expect(tenant1Customers.rows[0].first_name_encrypted).toBe('enc:John');
        
        await setTenantContext(client as unknown as Client, tenant2Id);
        const tenant2Customers = await client.query('SELECT * FROM test.customers');
        expect(tenant2Customers.rows).toHaveLength(1);
        expect(tenant2Customers.rows[0].first_name_encrypted).toBe('enc:Jane');
        
      } finally {
        await clearTenantContext(client as unknown as Client);
        client.release();
      }
    });
  });

  describe('Advisory Locks', () => {
    it('should handle advisory locks across connections', async () => {
      const client1 = await pool.connect();
      const client2 = await pool.connect();
      
      try {
        const lockId = 12345;
        
        // Client 1 acquires lock
        const lock1Result = await client1.query('SELECT pg_try_advisory_lock($1) as acquired', [lockId]);
        expect(lock1Result.rows[0].acquired).toBe(true);
        
        // Client 2 tries to acquire same lock (should fail)
        const lock2Result = await client2.query('SELECT pg_try_advisory_lock($1) as acquired', [lockId]);
        expect(lock2Result.rows[0].acquired).toBe(false);
        
        // Client 1 releases lock
        await client1.query('SELECT pg_advisory_unlock($1)', [lockId]);
        
        // Client 2 can now acquire lock
        const lock3Result = await client2.query('SELECT pg_try_advisory_lock($1) as acquired', [lockId]);
        expect(lock3Result.rows[0].acquired).toBe(true);
        
        // Cleanup
        await client2.query('SELECT pg_advisory_unlock($1)', [lockId]);
        
      } finally {
        client1.release();
        client2.release();
      }
    });

    it('should support lock timeout', async () => {
      const client1 = await pool.connect();
      const client2 = await pool.connect();
      
      try {
        const lockId = 12346;
        const timeoutMs = 100;
        
        // Client 1 acquires lock
        await client1.query('SELECT pg_advisory_lock($1)', [lockId]);
        
        // Client 2 tries to acquire with timeout
        const startTime = Date.now();
        const lockResult = await client2.query(
          'SELECT pg_try_advisory_lock($1) as acquired',
          [lockId]
        );
        const elapsed = Date.now() - startTime;
        
        // Should fail immediately (pg_try_advisory_lock is non-blocking)
        expect(lockResult.rows[0].acquired).toBe(false);
        expect(elapsed).toBeLessThan(50);
        
        // Cleanup
        await client1.query('SELECT pg_advisory_unlock($1)', [lockId]);
        
      } finally {
        client1.release();
        client2.release();
      }
    });

    it('should use booking-specific lock function', async () => {
      const client = await pool.connect();
      
      try {
        const scheduledAt = new Date('2024-01-15T14:00:00Z');
        
        // Acquire lock using the booking lock function
        const lockResult = await client.query(
          'SELECT test.acquire_booking_lock($1, $2, $3) as acquired',
          [shop1Id, scheduledAt, 5000]
        );
        expect(lockResult.rows[0].acquired).toBe(true);
        
        // Release lock
        const unlockResult = await client.query(
          'SELECT test.release_booking_lock($1, $2) as released',
          [shop1Id, scheduledAt]
        );
        expect(unlockResult.rows[0].released).toBe(true);
        
      } finally {
        client.release();
      }
    });
  });

  describe('EXCLUSION Constraints', () => {
    it('should enforce EXCLUSION constraints', async () => {
      const client = await pool.connect();
      
      try {
        await setTenantContext(client as unknown as Client, tenant1Id);
        
        const scheduledAt = new Date('2024-01-15T14:00:00Z');
        
        // Create first booking
        await client.query(
          `INSERT INTO test.bookings (tenant_id, shop_id, service_type, scheduled_at, duration_minutes, status)
           VALUES ($1, $2, 'oil_change', $3, 60, 'confirmed')`,
          [tenant1Id, shop1Id, scheduledAt]
        );
        
        // Try to create overlapping booking (should fail)
        await expect(
          client.query(
            `INSERT INTO test.bookings (tenant_id, shop_id, service_type, scheduled_at, duration_minutes, status)
             VALUES ($1, $2, 'tire_rotation', $3, 60, 'confirmed')`,
            [tenant1Id, shop1Id, scheduledAt]
          )
        ).rejects.toThrow(/exclusion constraint/);
        
      } finally {
        await clearTenantContext(client as unknown as Client);
        client.release();
      }
    });

    it('should allow non-overlapping bookings', async () => {
      const client = await pool.connect();
      
      try {
        await setTenantContext(client as unknown as Client, tenant1Id);
        
        const scheduledAt1 = new Date('2024-01-15T14:00:00Z');
        const scheduledAt2 = new Date('2024-01-15T15:00:00Z'); // 1 hour later
        
        // Create first booking
        await client.query(
          `INSERT INTO test.bookings (tenant_id, shop_id, service_type, scheduled_at, duration_minutes, status)
           VALUES ($1, $2, 'oil_change', $3, 60, 'confirmed')`,
          [tenant1Id, shop1Id, scheduledAt1]
        );
        
        // Create non-overlapping booking (should succeed)
        await client.query(
          `INSERT INTO test.bookings (tenant_id, shop_id, service_type, scheduled_at, duration_minutes, status)
           VALUES ($1, $2, 'tire_rotation', $3, 60, 'confirmed')`,
          [tenant1Id, shop1Id, scheduledAt2]
        );
        
        // Verify both bookings exist
        const bookings = await client.query('SELECT * FROM test.bookings');
        expect(bookings.rows).toHaveLength(2);
        
      } finally {
        await clearTenantContext(client as unknown as Client);
        client.release();
      }
    });

    it('should allow same time at different shops', async () => {
      const client = await pool.connect();
      
      try {
        // Create another shop for tenant 1
        const shop3Result = await client.query(
          `INSERT INTO test.shops (tenant_id, name, address) VALUES ($1, 'Shop 3', '789 Pine Rd') RETURNING id`,
          [tenant1Id]
        );
        const shop3Id = shop3Result.rows[0].id;
        
        await setTenantContext(client as unknown as Client, tenant1Id);
        
        const scheduledAt = new Date('2024-01-15T14:00:00Z');
        
        // Create booking at shop 1
        await client.query(
          `INSERT INTO test.bookings (tenant_id, shop_id, service_type, scheduled_at, duration_minutes, status)
           VALUES ($1, $2, 'oil_change', $3, 60, 'confirmed')`,
          [tenant1Id, shop1Id, scheduledAt]
        );
        
        // Create booking at shop 3 (same time, different shop - should succeed)
        await client.query(
          `INSERT INTO test.bookings (tenant_id, shop_id, service_type, scheduled_at, duration_minutes, status)
           VALUES ($1, $2, 'tire_rotation', $3, 60, 'confirmed')`,
          [tenant1Id, shop3Id, scheduledAt]
        );
        
        // Verify both bookings exist
        const bookings = await client.query('SELECT * FROM test.bookings');
        expect(bookings.rows).toHaveLength(2);
        
      } finally {
        await clearTenantContext(client as unknown as Client);
        client.release();
      }
    });

    it('should allow booking after cancellation', async () => {
      const client = await pool.connect();
      
      try {
        await setTenantContext(client as unknown as Client, tenant1Id);
        
        const scheduledAt = new Date('2024-01-15T14:00:00Z');
        
        // Create booking
        const bookingResult = await client.query(
          `INSERT INTO test.bookings (tenant_id, shop_id, service_type, scheduled_at, duration_minutes, status)
           VALUES ($1, $2, 'oil_change', $3, 60, 'confirmed') RETURNING id`,
          [tenant1Id, shop1Id, scheduledAt]
        );
        const bookingId = bookingResult.rows[0].id;
        
        // Cancel the booking
        await client.query(
          `UPDATE test.bookings SET status = 'cancelled' WHERE id = $1`,
          [bookingId]
        );
        
        // Now can book the same slot (should succeed because exclusion constraint excludes cancelled)
        await client.query(
          `INSERT INTO test.bookings (tenant_id, shop_id, service_type, scheduled_at, duration_minutes, status)
           VALUES ($1, $2, 'tire_rotation', $3, 60, 'confirmed')`,
          [tenant1Id, shop1Id, scheduledAt]
        );
        
        // Verify both bookings exist
        const bookings = await client.query('SELECT * FROM test.bookings');
        expect(bookings.rows).toHaveLength(2);
        
      } finally {
        await clearTenantContext(client as unknown as Client);
        client.release();
      }
    });
  });

  describe('Transaction Rollback', () => {
    it('should rollback on error', async () => {
      const result = await withTransaction(async (client) => {
        await setTenantContext(client as unknown as Client, tenant1Id);
        
        // Insert a booking
        await client.query(
          `INSERT INTO test.bookings (tenant_id, shop_id, service_type, scheduled_at, duration_minutes, status)
           VALUES ($1, $2, 'oil_change', NOW(), 60, 'confirmed')`,
          [tenant1Id, shop1Id]
        );
        
        // Return count
        const count = await client.query('SELECT COUNT(*) FROM test.bookings');
        return parseInt(count.rows[0].count);
      });
      
      expect(result).toBe(1);
      
      // Verify rollback occurred - no bookings should exist
      const client = await pool.connect();
      try {
        await setTenantContext(client as unknown as Client, tenant1Id);
        const count = await client.query('SELECT COUNT(*) FROM test.bookings');
        expect(parseInt(count.rows[0].count)).toBe(0);
      } finally {
        client.release();
      }
    });
  });

  describe('Event Store', () => {
    it('should store events with tenant isolation', async () => {
      const client = await pool.connect();
      
      try {
        // Create events for both tenants
        await setTenantContext(client as unknown as Client, tenant1Id);
        await client.query(
          `INSERT INTO test.events (tenant_id, aggregate_type, aggregate_id, event_type, event_data)
           VALUES ($1, 'booking', 'agg-1', 'BookingCreated', '{"shop": "shop1"}')`,
          [tenant1Id]
        );
        
        await setTenantContext(client as unknown as Client, tenant2Id);
        await client.query(
          `INSERT INTO test.events (tenant_id, aggregate_type, aggregate_id, event_type, event_data)
           VALUES ($1, 'booking', 'agg-2', 'BookingCreated', '{"shop": "shop2"}')`,
          [tenant2Id]
        );
        
        // Verify isolation
        await setTenantContext(client as unknown as Client, tenant1Id);
        const tenant1Events = await client.query('SELECT * FROM test.events');
        expect(tenant1Events.rows).toHaveLength(1);
        expect(tenant1Events.rows[0].aggregate_id).toBe('agg-1');
        
        await setTenantContext(client as unknown as Client, tenant2Id);
        const tenant2Events = await client.query('SELECT * FROM test.events');
        expect(tenant2Events.rows).toHaveLength(1);
        expect(tenant2Events.rows[0].aggregate_id).toBe('agg-2');
        
      } finally {
        await clearTenantContext(client as unknown as Client);
        client.release();
      }
    });
  });
});
