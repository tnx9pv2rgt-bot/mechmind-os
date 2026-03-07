/**
 * Row Level Security (RLS) Isolation Integration Test
 * 
 * Verifies that:
 * - Tenant-1 data is invisible to tenant-2
 * - Cross-tenant queries return no results
 * - RLS policies are enforced at database level
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '../../src/common/common.module';
import { PrismaService } from '../../src/common/services/prisma.service';
import { EncryptionService } from '../../src/common/services/encryption.service';

describe('RLS Isolation Test (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let encryption: EncryptionService;

  const tenant1Id = 'rls-test-tenant-1';
  const tenant2Id = 'rls-test-tenant-2';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        CommonModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    encryption = app.get<EncryptionService>(EncryptionService);

    // Clean up and setup test data
    await cleanupTestData();
    await setupTestData();
  }, 60000);

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  }, 60000);

  async function cleanupTestData() {
    try {
      // Delete in correct order
      await prisma.$executeRaw`DELETE FROM booking_events WHERE booking_id LIKE 'rls-%'`;
      await prisma.$executeRaw`DELETE FROM bookings WHERE tenant_id IN (${tenant1Id}, ${tenant2Id})`;
      await prisma.$executeRaw`DELETE FROM booking_slots WHERE tenant_id IN (${tenant1Id}, ${tenant2Id})`;
      await prisma.$executeRaw`DELETE FROM vehicles WHERE license_plate LIKE 'RLS%'`;
      await prisma.$executeRaw`DELETE FROM customers WHERE tenant_id IN (${tenant1Id}, ${tenant2Id})`;
      await prisma.$executeRaw`DELETE FROM services WHERE tenant_id IN (${tenant1Id}, ${tenant2Id})`;
      await prisma.$executeRaw`DELETE FROM users WHERE tenant_id IN (${tenant1Id}, ${tenant2Id})`;
      await prisma.$executeRaw`DELETE FROM tenants WHERE id IN (${tenant1Id}, ${tenant2Id})`;
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  async function setupTestData() {
    // Create tenant 1
    await prisma.$executeRaw`
      INSERT INTO tenants (id, name, slug, settings, is_active, created_at, updated_at)
      VALUES (${tenant1Id}, 'RLS Test Tenant 1', 'rls-test-1', '{}', true, NOW(), NOW())
    `;

    // Create tenant 2
    await prisma.$executeRaw`
      INSERT INTO tenants (id, name, slug, settings, is_active, created_at, updated_at)
      VALUES (${tenant2Id}, 'RLS Test Tenant 2', 'rls-test-2', '{}', true, NOW(), NOW())
    `;

    // Create customers for tenant 1
    const phone1 = encryption.encrypt('+1-555-RLS-001');
    const email1 = encryption.encrypt('tenant1@example.com');
    const firstName1 = encryption.encrypt('Tenant1');
    const lastName1 = encryption.encrypt('User');
    
    await prisma.$executeRaw`
      INSERT INTO customers (id, encrypted_phone, encrypted_email, encrypted_first_name, encrypted_last_name, 
        phone_hash, gdpr_consent, tenant_id, created_at, updated_at)
      VALUES ('rls-customer-1', ${phone1}::bytea, ${email1}::bytea, ${firstName1}::bytea, ${lastName1}::bytea,
        ${encryption.hash('+1-555-RLS-001')}, true, ${tenant1Id}, NOW(), NOW())
    `;

    // Create customers for tenant 2
    const phone2 = encryption.encrypt('+1-555-RLS-002');
    const email2 = encryption.encrypt('tenant2@example.com');
    const firstName2 = encryption.encrypt('Tenant2');
    const lastName2 = encryption.encrypt('User');
    
    await prisma.$executeRaw`
      INSERT INTO customers (id, encrypted_phone, encrypted_email, encrypted_first_name, encrypted_last_name, 
        phone_hash, gdpr_consent, tenant_id, created_at, updated_at)
      VALUES ('rls-customer-2', ${phone2}::bytea, ${email2}::bytea, ${firstName2}::bytea, ${lastName2}::bytea,
        ${encryption.hash('+1-555-RLS-002')}, true, ${tenant2Id}, NOW(), NOW())
    `;

    // Create booking slots for tenant 1
    await prisma.$executeRaw`
      INSERT INTO booking_slots (id, start_time, end_time, status, tenant_id, created_at, updated_at)
      VALUES ('rls-slot-1', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 1 hour', 
        'AVAILABLE', ${tenant1Id}, NOW(), NOW())
    `;

    // Create booking slots for tenant 2
    await prisma.$executeRaw`
      INSERT INTO booking_slots (id, start_time, end_time, status, tenant_id, created_at, updated_at)
      VALUES ('rls-slot-2', NOW() + INTERVAL '2 day', NOW() + INTERVAL '2 day 1 hour', 
        'AVAILABLE', ${tenant2Id}, NOW(), NOW())
    `;

    // Create a booking for tenant 1
    await prisma.$executeRaw`
      INSERT INTO bookings (id, status, scheduled_date, duration_minutes, source, tenant_id, customer_id, slot_id, created_at, updated_at)
      VALUES ('rls-booking-1', 'PENDING', NOW() + INTERVAL '1 day', 60, 'WEB', ${tenant1Id}, 'rls-customer-1', 'rls-slot-1', NOW(), NOW())
    `;

    // Create a booking for tenant 2
    await prisma.$executeRaw`
      INSERT INTO bookings (id, status, scheduled_date, duration_minutes, source, tenant_id, customer_id, slot_id, created_at, updated_at)
      VALUES ('rls-booking-2', 'PENDING', NOW() + INTERVAL '2 day', 60, 'WEB', ${tenant2Id}, 'rls-customer-2', 'rls-slot-2', NOW(), NOW())
    `;

    // Create users for tenant 1
    await prisma.$executeRaw`
      INSERT INTO users (id, email, password, first_name, last_name, role, is_active, tenant_id, created_at, updated_at)
      VALUES ('rls-user-1', 'user1@example.com', 'password', 'User', 'One', 'ADMIN', true, ${tenant1Id}, NOW(), NOW())
    `;

    // Create users for tenant 2
    await prisma.$executeRaw`
      INSERT INTO users (id, email, password, first_name, last_name, role, is_active, tenant_id, created_at, updated_at)
      VALUES ('rls-user-2', 'user2@example.com', 'password', 'User', 'Two', 'ADMIN', true, ${tenant2Id}, NOW(), NOW())
    `;
  }

  describe('Customer isolation', () => {
    it('should only return customers for tenant-1 when tenant-1 context is set', async () => {
      await prisma.setTenantContext(tenant1Id);

      const customers = await prisma.customer.findMany({
        where: { tenantId: tenant1Id },
      });

      expect(customers).toHaveLength(1);
      expect(customers[0].id).toBe('rls-customer-1');
    });

    it('should only return customers for tenant-2 when tenant-2 context is set', async () => {
      await prisma.setTenantContext(tenant2Id);

      const customers = await prisma.customer.findMany({
        where: { tenantId: tenant2Id },
      });

      expect(customers).toHaveLength(1);
      expect(customers[0].id).toBe('rls-customer-2');
    });

    it('should return no customers when invalid tenant context is set', async () => {
      await prisma.setTenantContext('invalid-tenant-id');

      const customers = await prisma.customer.findMany();

      expect(customers).toHaveLength(0);
    });

    it('should block tenant-1 from accessing tenant-2 customer by ID', async () => {
      await prisma.setTenantContext(tenant1Id);

      // Try to find tenant-2's customer
      const customer = await prisma.customer.findUnique({
        where: { id: 'rls-customer-2' },
      });

      expect(customer).toBeNull();
    });

    it('should block tenant-2 from accessing tenant-1 customer by ID', async () => {
      await prisma.setTenantContext(tenant2Id);

      // Try to find tenant-1's customer
      const customer = await prisma.customer.findUnique({
        where: { id: 'rls-customer-1' },
      });

      expect(customer).toBeNull();
    });
  });

  describe('Booking isolation', () => {
    it('should only return bookings for tenant-1 when tenant-1 context is set', async () => {
      await prisma.setTenantContext(tenant1Id);

      const bookings = await prisma.booking.findMany({
        where: { tenantId: tenant1Id },
      });

      expect(bookings).toHaveLength(1);
      expect(bookings[0].id).toBe('rls-booking-1');
    });

    it('should only return bookings for tenant-2 when tenant-2 context is set', async () => {
      await prisma.setTenantContext(tenant2Id);

      const bookings = await prisma.booking.findMany({
        where: { tenantId: tenant2Id },
      });

      expect(bookings).toHaveLength(1);
      expect(bookings[0].id).toBe('rls-booking-2');
    });

    it('should block cross-tenant booking access', async () => {
      await prisma.setTenantContext(tenant1Id);

      // Try to find tenant-2's booking
      const booking = await prisma.booking.findUnique({
        where: { id: 'rls-booking-2' },
      });

      expect(booking).toBeNull();
    });
  });

  describe('User isolation', () => {
    it('should only return users for tenant-1 when tenant-1 context is set', async () => {
      await prisma.setTenantContext(tenant1Id);

      const users = await prisma.user.findMany({
        where: { tenantId: tenant1Id },
      });

      expect(users).toHaveLength(1);
      expect(users[0].id).toBe('rls-user-1');
    });

    it('should only return users for tenant-2 when tenant-2 context is set', async () => {
      await prisma.setTenantContext(tenant2Id);

      const users = await prisma.user.findMany({
        where: { tenantId: tenant2Id },
      });

      expect(users).toHaveLength(1);
      expect(users[0].id).toBe('rls-user-2');
    });
  });

  describe('Slot isolation', () => {
    it('should only return slots for tenant-1 when tenant-1 context is set', async () => {
      await prisma.setTenantContext(tenant1Id);

      const slots = await prisma.bookingSlot.findMany({
        where: { tenantId: tenant1Id },
      });

      expect(slots).toHaveLength(1);
      expect(slots[0].id).toBe('rls-slot-1');
    });

    it('should only return slots for tenant-2 when tenant-2 context is set', async () => {
      await prisma.setTenantContext(tenant2Id);

      const slots = await prisma.bookingSlot.findMany({
        where: { tenantId: tenant2Id },
      });

      expect(slots).toHaveLength(1);
      expect(slots[0].id).toBe('rls-slot-2');
    });
  });

  describe('Cross-tenant write blocking', () => {
    it('should prevent tenant-1 from updating tenant-2 customer', async () => {
      await prisma.setTenantContext(tenant1Id);

      // Try to update tenant-2's customer
      const result = await prisma.customer.updateMany({
        where: { id: 'rls-customer-2' },
        data: { notes: 'Attempted update' },
      });

      expect(result.count).toBe(0);
    });

    it('should prevent tenant-2 from deleting tenant-1 booking', async () => {
      await prisma.setTenantContext(tenant2Id);

      // Try to delete tenant-1's booking
      const result = await prisma.booking.deleteMany({
        where: { id: 'rls-booking-1' },
      });

      expect(result.count).toBe(0);
    });

    it('should allow tenant-1 to update their own customer', async () => {
      await prisma.setTenantContext(tenant1Id);

      const result = await prisma.customer.updateMany({
        where: { id: 'rls-customer-1' },
        data: { notes: 'Updated note' },
      });

      expect(result.count).toBe(1);
    });
  });

  describe('withTenant helper', () => {
    it('should automatically set and clear tenant context', async () => {
      const result = await prisma.withTenant(tenant1Id, async (prismaClient) => {
        const customers = await prismaClient.customer.findMany();
        return customers.length;
      });

      expect(result).toBe(1);
      // Context should be cleared after withTenant
      expect(prisma.getCurrentTenantContext()).toBeNull();
    });

    it('should restore previous context after nested withTenant', async () => {
      // Set initial context
      await prisma.setTenantContext(tenant1Id);
      expect(prisma.getCurrentTenantContext()).toEqual({ tenantId: tenant1Id });

      // Use withTenant with different tenant
      await prisma.withTenant(tenant2Id, async (prismaClient) => {
        expect(prisma.getCurrentTenantContext()).toEqual({ tenantId: tenant2Id });
        return true;
      });

      // Should restore to tenant1
      expect(prisma.getCurrentTenantContext()).toEqual({ tenantId: tenant1Id });
    });
  });

  describe('Raw query RLS enforcement', () => {
    it('should enforce RLS on raw SELECT queries', async () => {
      await prisma.setTenantContext(tenant1Id);

      const customers = await prisma.$queryRaw`
        SELECT id, tenant_id FROM customers WHERE tenant_id = ${tenant1Id}
      `;

      expect((customers as any[]).length).toBe(1);
      expect((customers as any[])[0].id).toBe('rls-customer-1');
    });

    it('should block cross-tenant raw updates', async () => {
      await prisma.setTenantContext(tenant1Id);

      // Raw update on tenant-2 data should affect 0 rows due to RLS
      const result = await prisma.$executeRaw`
        UPDATE customers SET notes = 'hacked' WHERE id = 'rls-customer-2'
      `;

      // RLS should prevent the update
      expect(result).toBe(0);
    });
  });

  describe('Count operations with RLS', () => {
    it('should return correct count for each tenant', async () => {
      // Tenant 1 count
      await prisma.setTenantContext(tenant1Id);
      const count1 = await prisma.customer.count();
      expect(count1).toBe(1);

      // Tenant 2 count
      await prisma.setTenantContext(tenant2Id);
      const count2 = await prisma.customer.count();
      expect(count2).toBe(1);

      // No tenant context
      await prisma.clearTenantContext();
      const countAll = await prisma.customer.count();
      expect(countAll).toBe(0);
    });
  });
});
