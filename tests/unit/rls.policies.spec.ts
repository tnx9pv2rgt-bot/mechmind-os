/**
 * MechMind OS v10 - Row Level Security (RLS) Policy Tests
 * Multi-tenant data isolation testing
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Pool, Client } from 'pg';
import { RLSService } from '@/common/rls.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { 
  getTestPool, 
  setTenantContext, 
  clearTenantContext 
} from '@test/database';

describe('RLSPolicies', () => {
  let pool: Pool;
  let rlsService: RLSService;
  let tenant1Id: string;
  let tenant2Id: string;
  let shop1Id: string;
  let shop2Id: string;

  beforeAll(async () => {
    pool = getTestPool();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RLSService,
        { 
          provide: ConfigService, 
          useValue: { get: jest.fn(() => 'test') } 
        },
        { provide: Logger, useValue: { log: jest.fn(), error: jest.fn() } },
      ],
    }).compile();

    rlsService = module.get<RLSService>(RLSService);
  });

  beforeEach(async () => {
    const client = await pool.connect();
    
    try {
      // Create test tenants
      const tenant1Result = await client.query(
        `INSERT INTO test.tenants (name) VALUES ('Tenant 1') RETURNING id`
      );
      tenant1Id = tenant1Result.rows[0].id;
      
      const tenant2Result = await client.query(
        `INSERT INTO test.tenants (name) VALUES ('Tenant 2') RETURNING id`
      );
      tenant2Id = tenant2Result.rows[0].id;
      
      // Create test shops for each tenant
      const shop1Result = await client.query(
        `INSERT INTO test.shops (tenant_id, name, address) VALUES ($1, 'Shop 1', 'Address 1') RETURNING id`,
        [tenant1Id]
      );
      shop1Id = shop1Result.rows[0].id;
      
      const shop2Result = await client.query(
        `INSERT INTO test.shops (tenant_id, name, address) VALUES ($1, 'Shop 2', 'Address 2') RETURNING id`,
        [tenant2Id]
      );
      shop2Id = shop2Result.rows[0].id;
      
      // Create test customers
      await client.query(
        `INSERT INTO test.customers (tenant_id, shop_id, first_name_encrypted, last_name_encrypted, phone_encrypted, gdpr_consent)
         VALUES ($1, $2, 'enc:first1', 'enc:last1', 'enc:phone1', true)`,
        [tenant1Id, shop1Id]
      );
      
      await client.query(
        `INSERT INTO test.customers (tenant_id, shop_id, first_name_encrypted, last_name_encrypted, phone_encrypted, gdpr_consent)
         VALUES ($1, $2, 'enc:first2', 'enc:last2', 'enc:phone2', true)`,
        [tenant2Id, shop2Id]
      );
      
    } finally {
      client.release();
    }
  });

  afterEach(async () => {
    const client = await pool.connect();
    try {
      await client.query('TRUNCATE TABLE test.customers, test.shops, test.tenants CASCADE');
    } finally {
      client.release();
    }
  });

  describe('Tenant Isolation', () => {
    it('should isolate tenant data - tenant 1 cannot see tenant 2 data', async () => {
      const client = await pool.connect();
      
      try {
        // Set tenant context to tenant 1
        await setTenantContext(client as unknown as Client, tenant1Id);
        
        // Query shops
        const shopsResult = await client.query('SELECT * FROM test.shops');
        
        // Assert - should only see tenant 1's shop
        expect(shopsResult.rows).toHaveLength(1);
        expect(shopsResult.rows[0].tenant_id).toBe(tenant1Id);
        
        // Query customers
        const customersResult = await client.query('SELECT * FROM test.customers');
        
        // Assert - should only see tenant 1's customers
        expect(customersResult.rows).toHaveLength(1);
        expect(customersResult.rows[0].first_name_encrypted).toBe('enc:first1');
        
      } finally {
        await clearTenantContext(client as unknown as Client);
        client.release();
      }
    });

    it('should isolate tenant data - tenant 2 cannot see tenant 1 data', async () => {
      const client = await pool.connect();
      
      try {
        // Set tenant context to tenant 2
        await setTenantContext(client as unknown as Client, tenant2Id);
        
        // Query shops
        const shopsResult = await client.query('SELECT * FROM test.shops');
        
        // Assert - should only see tenant 2's shop
        expect(shopsResult.rows).toHaveLength(1);
        expect(shopsResult.rows[0].tenant_id).toBe(tenant2Id);
        
        // Query customers
        const customersResult = await client.query('SELECT * FROM test.customers');
        
        // Assert - should only see tenant 2's customers
        expect(customersResult.rows).toHaveLength(1);
        expect(customersResult.rows[0].first_name_encrypted).toBe('enc:first2');
        
      } finally {
        await clearTenantContext(client as unknown as Client);
        client.release();
      }
    });

    it('should reject cross-tenant queries without context', async () => {
      const client = await pool.connect();
      
      try {
        // Don't set tenant context
        await clearTenantContext(client as unknown as Client);
        
        // Query should return no results (RLS policy blocks all)
        const shopsResult = await client.query('SELECT * FROM test.shops');
        
        // Assert - should see no data without tenant context
        expect(shopsResult.rows).toHaveLength(0);
        
      } finally {
        client.release();
      }
    });
  });

  describe('Cross-Tenant Insert Prevention', () => {
    it('should prevent inserting data for different tenant', async () => {
      const client = await pool.connect();
      
      try {
        // Set tenant context to tenant 1
        await setTenantContext(client as unknown as Client, tenant1Id);
        
        // Try to insert customer for tenant 2 (should fail or be invisible)
        await expect(
          client.query(
            `INSERT INTO test.customers (tenant_id, shop_id, first_name_encrypted, last_name_encrypted, phone_encrypted, gdpr_consent)
             VALUES ($1, $2, 'enc:first', 'enc:last', 'enc:phone', true)`,
            [tenant2Id, shop2Id]
          )
        ).rejects.toThrow();
        
      } finally {
        await clearTenantContext(client as unknown as Client);
        client.release();
      }
    });
  });

  describe('Cross-Tenant Update Prevention', () => {
    it('should prevent updating data from different tenant', async () => {
      const client = await pool.connect();
      
      try {
        // Get tenant 2's customer ID
        await setTenantContext(client as unknown as Client, tenant2Id);
        const tenant2Customers = await client.query('SELECT id FROM test.customers');
        const tenant2CustomerId = tenant2Customers.rows[0].id;
        await clearTenantContext(client as unknown as Client);
        
        // Set tenant context to tenant 1
        await setTenantContext(client as unknown as Client, tenant1Id);
        
        // Try to update tenant 2's customer (should affect 0 rows due to RLS)
        const updateResult = await client.query(
          `UPDATE test.customers SET first_name_encrypted = 'hacked' WHERE id = $1`,
          [tenant2CustomerId]
        );
        
        // Assert - should not update any rows
        expect(updateResult.rowCount).toBe(0);
        
      } finally {
        await clearTenantContext(client as unknown as Client);
        client.release();
      }
    });
  });

  describe('Cross-Tenant Delete Prevention', () => {
    it('should prevent deleting data from different tenant', async () => {
      const client = await pool.connect();
      
      try {
        // Get tenant 2's shop ID
        await setTenantContext(client as unknown as Client, tenant2Id);
        const tenant2Shops = await client.query('SELECT id FROM test.shops');
        const tenant2ShopId = tenant2Shops.rows[0].id;
        await clearTenantContext(client as unknown as Client);
        
        // Set tenant context to tenant 1
        await setTenantContext(client as unknown as Client, tenant1Id);
        
        // Try to delete tenant 2's shop (should affect 0 rows due to RLS)
        const deleteResult = await client.query(
          `DELETE FROM test.shops WHERE id = $1`,
          [tenant2ShopId]
        );
        
        // Assert - should not delete any rows
        expect(deleteResult.rowCount).toBe(0);
        
        // Verify tenant 2's shop still exists
        await clearTenantContext(client as unknown as Client);
        await setTenantContext(client as unknown as Client, tenant2Id);
        const verifyResult = await client.query('SELECT * FROM test.shops WHERE id = $1', [tenant2ShopId]);
        expect(verifyResult.rows).toHaveLength(1);
        
      } finally {
        await clearTenantContext(client as unknown as Client);
        client.release();
      }
    });
  });

  describe('RLS Policy Enforcement', () => {
    it('should enforce RLS on all tenant tables', async () => {
      const client = await pool.connect();
      
      try {
        // Check RLS is enabled on all tables
        const rlsCheck = await client.query(`
          SELECT tablename, rowsecurity 
          FROM pg_tables 
          WHERE schemaname = 'test' 
          AND tablename IN ('shops', 'customers', 'bookings', 'events', 'gdpr_audit_log')
        `);
        
        for (const row of rlsCheck.rows) {
          expect(row.rowsecurity).toBe(true);
        }
        
      } finally {
        client.release();
      }
    });

    it('should have policies defined for each table', async () => {
      const client = await pool.connect();
      
      try {
        // Check policies exist
        const policiesCheck = await client.query(`
          SELECT tablename, policyname 
          FROM pg_policies 
          WHERE schemaname = 'test'
        `);
        
        const tables = new Set(policiesCheck.rows.map(r => r.tablename));
        expect(tables.has('shops')).toBe(true);
        expect(tables.has('customers')).toBe(true);
        expect(tables.has('bookings')).toBe(true);
        expect(tables.has('events')).toBe(true);
        expect(tables.has('gdpr_audit_log')).toBe(true);
        
      } finally {
        client.release();
      }
    });
  });

  describe('Tenant Context Switching', () => {
    it('should properly switch between tenant contexts', async () => {
      const client = await pool.connect();
      
      try {
        // Set tenant 1 context
        await setTenantContext(client as unknown as Client, tenant1Id);
        const tenant1Shops = await client.query('SELECT * FROM test.shops');
        expect(tenant1Shops.rows).toHaveLength(1);
        expect(tenant1Shops.rows[0].tenant_id).toBe(tenant1Id);
        
        // Switch to tenant 2 context
        await setTenantContext(client as unknown as Client, tenant2Id);
        const tenant2Shops = await client.query('SELECT * FROM test.shops');
        expect(tenant2Shops.rows).toHaveLength(1);
        expect(tenant2Shops.rows[0].tenant_id).toBe(tenant2Id);
        
        // Switch back to tenant 1
        await setTenantContext(client as unknown as Client, tenant1Id);
        const tenant1ShopsAgain = await client.query('SELECT * FROM test.shops');
        expect(tenant1ShopsAgain.rows[0].tenant_id).toBe(tenant1Id);
        
      } finally {
        await clearTenantContext(client as unknown as Client);
        client.release();
      }
    });
  });

  describe('Superuser Bypass', () => {
    it('should allow superuser to bypass RLS for admin operations', async () => {
      const client = await pool.connect();
      
      try {
        // Bypass RLS as superuser
        await client.query('SET row_security = off');
        
        // Should see all data
        const allShops = await client.query('SELECT * FROM test.shops');
        expect(allShops.rows).toHaveLength(2);
        
        const allCustomers = await client.query('SELECT * FROM test.customers');
        expect(allCustomers.rows).toHaveLength(2);
        
        // Re-enable RLS
        await client.query('SET row_security = on');
        
      } finally {
        client.release();
      }
    });
  });

  describe('Audit Trail', () => {
    it('should log tenant context in audit events', async () => {
      const client = await pool.connect();
      
      try {
        // Set tenant context and create event
        await setTenantContext(client as unknown as Client, tenant1Id);
        
        await client.query(
          `INSERT INTO test.events (tenant_id, aggregate_type, aggregate_id, event_type, event_data)
           VALUES ($1, 'booking', $2, 'BookingCreated', '{}')`,
          [tenant1Id, 'test-aggregate-id']
        );
        
        // Verify event was created with correct tenant
        const events = await client.query('SELECT * FROM test.events');
        expect(events.rows).toHaveLength(1);
        expect(events.rows[0].tenant_id).toBe(tenant1Id);
        
      } finally {
        await clearTenantContext(client as unknown as Client);
        client.release();
      }
    });
  });
});
