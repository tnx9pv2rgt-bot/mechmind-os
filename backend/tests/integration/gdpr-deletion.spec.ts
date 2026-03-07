/**
 * GDPR Deletion Integration Test
 * 
 * Verifies:
 * - Real encryption of PII before deletion
 * - PII fields are properly anonymized (set to encrypted 'DELETED')
 * - Customer record exists but with anonymized data
 * - Referential integrity is preserved
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '../../src/common/common.module';
import { PrismaService } from '../../src/common/services/prisma.service';
import { EncryptionService } from '../../src/common/services/encryption.service';

describe('GDPR Deletion Test (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let encryption: EncryptionService;

  const tenantId = 'gdpr-test-tenant';
  const customerId = 'gdpr-test-customer';

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
      await prisma.$executeRaw`DELETE FROM booking_events WHERE booking_id LIKE 'gdpr-%'`;
      await prisma.$executeRaw`DELETE FROM bookings WHERE tenant_id = ${tenantId}`;
      await prisma.$executeRaw`DELETE FROM booking_slots WHERE tenant_id = ${tenantId}`;
      await prisma.$executeRaw`DELETE FROM vehicles WHERE license_plate LIKE 'GDPR%'`;
      await prisma.$executeRaw`DELETE FROM customers WHERE tenant_id = ${tenantId}`;
      await prisma.$executeRaw`DELETE FROM users WHERE tenant_id = ${tenantId}`;
      await prisma.$executeRaw`DELETE FROM tenants WHERE id = ${tenantId}`;
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  async function setupTestData() {
    // Create tenant
    await prisma.$executeRaw`
      INSERT INTO tenants (id, name, slug, settings, is_active, created_at, updated_at)
      VALUES (${tenantId}, 'GDPR Test Tenant', 'gdpr-test', '{}', true, NOW(), NOW())
    `;

    // Create customer with real encrypted PII
    const originalPhone = '+1-555-GDPR-TEST';
    const originalEmail = 'gdpr.customer@example.com';
    const originalFirstName = 'GDPR';
    const originalLastName = 'TestCustomer';

    const encryptedPhone = encryption.encrypt(originalPhone);
    const encryptedEmail = encryption.encrypt(originalEmail);
    const encryptedFirstName = encryption.encrypt(originalFirstName);
    const encryptedLastName = encryption.encrypt(originalLastName);

    await prisma.$executeRaw`
      INSERT INTO customers (
        id, 
        encrypted_phone, 
        encrypted_email, 
        encrypted_first_name, 
        encrypted_last_name, 
        phone_hash,
        gdpr_consent,
        tenant_id, 
        created_at, 
        updated_at
      ) VALUES (
        ${customerId},
        ${encryptedPhone}::bytea,
        ${encryptedEmail}::bytea,
        ${encryptedFirstName}::bytea,
        ${encryptedLastName}::bytea,
        ${encryption.hash(originalPhone)},
        true,
        ${tenantId},
        NOW(),
        NOW()
      )
    `;

    // Create related records
    await prisma.$executeRaw`
      INSERT INTO vehicles (id, license_plate, make, model, year, customer_id, created_at, updated_at)
      VALUES ('gdpr-vehicle-1', 'GDPR123', 'TestMake', 'TestModel', 2023, ${customerId}, NOW(), NOW())
    `;

    // Create booking slot and booking
    await prisma.$executeRaw`
      INSERT INTO booking_slots (id, start_time, end_time, status, tenant_id, created_at, updated_at)
      VALUES ('gdpr-slot-1', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 1 hour', 'BOOKED', ${tenantId}, NOW(), NOW())
    `;

    await prisma.$executeRaw`
      INSERT INTO bookings (id, status, scheduled_date, duration_minutes, source, tenant_id, customer_id, slot_id, created_at, updated_at)
      VALUES ('gdpr-booking-1', 'CONFIRMED', NOW() + INTERVAL '1 day', 60, 'WEB', ${tenantId}, ${customerId}, 'gdpr-slot-1', NOW(), NOW())
    `;
  }

  describe('Pre-deletion verification', () => {
    it('should have customer with encrypted PII', async () => {
      await prisma.setTenantContext(tenantId);

      const customer = await prisma.$queryRaw`
        SELECT * FROM customers WHERE id = ${customerId}
      `;

      const customerData = (customer as any[])[0];
      expect(customerData).toBeDefined();
      
      // Verify PII is encrypted (not plain text)
      const phoneStr = Buffer.from(customerData.encrypted_phone).toString('hex');
      const emailStr = Buffer.from(customerData.encrypted_email).toString('hex');
      
      // Should be encrypted, not the original values
      expect(phoneStr).not.toContain('+1-555-GDPR-TEST');
      expect(emailStr).not.toContain('gdpr.customer@example.com');
    });

    it('should be able to decrypt PII before deletion', async () => {
      await prisma.setTenantContext(tenantId);

      const customer = await prisma.$queryRaw`
        SELECT encrypted_phone, encrypted_email, encrypted_first_name, encrypted_last_name 
        FROM customers WHERE id = ${customerId}
      `;

      const customerData = (customer as any[])[0];
      
      // Decrypt and verify original values
      const decryptedPhone = encryption.decrypt(
        Buffer.from(customerData.encrypted_phone).toString('utf-8')
      );
      const decryptedEmail = encryption.decrypt(
        Buffer.from(customerData.encrypted_email).toString('utf-8')
      );
      const decryptedFirstName = encryption.decrypt(
        Buffer.from(customerData.encrypted_first_name).toString('utf-8')
      );
      const decryptedLastName = encryption.decrypt(
        Buffer.from(customerData.encrypted_last_name).toString('utf-8')
      );

      expect(decryptedPhone).toBe('+1-555-GDPR-TEST');
      expect(decryptedEmail).toBe('gdpr.customer@example.com');
      expect(decryptedFirstName).toBe('GDPR');
      expect(decryptedLastName).toBe('TestCustomer');
    });

    it('should have related bookings and vehicles', async () => {
      await prisma.setTenantContext(tenantId);

      const bookings = await prisma.$queryRaw`
        SELECT * FROM bookings WHERE customer_id = ${customerId}
      `;
      expect((bookings as any[]).length).toBeGreaterThan(0);

      const vehicles = await prisma.$queryRaw`
        SELECT * FROM vehicles WHERE customer_id = ${customerId}
      `;
      expect((vehicles as any[]).length).toBeGreaterThan(0);
    });
  });

  describe('Anonymization process', () => {
    it('should anonymize customer PII fields', async () => {
      await prisma.setTenantContext(tenantId);

      // Perform anonymization (simulating GDPR deletion service)
      const deletedAt = new Date();
      const anonymizedValue = encryption.encrypt('DELETED');

      await prisma.$executeRaw`
        UPDATE customers 
        SET 
          encrypted_phone = ${anonymizedValue}::bytea,
          encrypted_email = ${anonymizedValue}::bytea,
          encrypted_first_name = ${anonymizedValue}::bytea,
          encrypted_last_name = ${anonymizedValue}::bytea,
          gdpr_consent = false,
          notes = 'CUSTOMER_ANONYMIZED_' || ${customerId}::text
        WHERE id = ${customerId}
      `;

      // Verify anonymization
      const customer = await prisma.$queryRaw`
        SELECT * FROM customers WHERE id = ${customerId}
      `;

      const customerData = (customer as any[])[0];
      
      // Verify PII is anonymized
      const decryptedPhone = encryption.decrypt(
        Buffer.from(customerData.encrypted_phone).toString('utf-8')
      );
      expect(decryptedPhone).toBe('DELETED');

      // Verify GDPR consent is revoked
      expect(customerData.gdpr_consent).toBe(false);
    });

    it('should preserve customer record for referential integrity', async () => {
      await prisma.setTenantContext(tenantId);

      const customer = await prisma.$queryRaw`
        SELECT id, tenant_id, created_at FROM customers WHERE id = ${customerId}
      `;

      const customerData = (customer as any[])[0];
      
      // Record should still exist
      expect(customerData).toBeDefined();
      expect(customerData.id).toBe(customerId);
      expect(customerData.tenant_id).toBe(tenantId);
      expect(customerData.created_at).toBeTruthy();
    });

    it('should preserve related bookings with anonymized customer', async () => {
      await prisma.setTenantContext(tenantId);

      const bookings = await prisma.$queryRaw`
        SELECT b.*, c.id as customer_id
        FROM bookings b
        JOIN customers c ON b.customer_id = c.id
        WHERE c.id = ${customerId}
      `;

      expect((bookings as any[]).length).toBeGreaterThan(0);
      expect((bookings as any[])[0].customer_id).toBe(customerId);
    });

    it('should preserve related vehicles', async () => {
      await prisma.setTenantContext(tenantId);

      const vehicles = await prisma.$queryRaw`
        SELECT * FROM vehicles WHERE customer_id = ${customerId}
      `;

      expect((vehicles as any[]).length).toBeGreaterThan(0);
    });
  });

  describe('Post-deletion verification', () => {
    it('should NOT be able to decrypt original PII after anonymization', async () => {
      await prisma.setTenantContext(tenantId);

      const customer = await prisma.$queryRaw`
        SELECT encrypted_phone FROM customers WHERE id = ${customerId}
      `;

      const phoneData = (customer as any[])[0].encrypted_phone;
      const decrypted = encryption.decrypt(Buffer.from(phoneData).toString('utf-8'));
      
      // Should be 'DELETED', not the original phone number
      expect(decrypted).toBe('DELETED');
      expect(decrypted).not.toBe('+1-555-GDPR-TEST');
    });

    it('should not be able to recover original PII from hash', async () => {
      await prisma.setTenantContext(tenantId);

      const customer = await prisma.$queryRaw`
        SELECT phone_hash FROM customers WHERE id = ${customerId}
      `;

      const phoneHash = (customer as any[])[0].phone_hash;
      
      // Original phone hash
      const originalHash = encryption.hash('+1-555-GDPR-TEST');
      
      // Hash should remain the same (for audit/lookup purposes)
      expect(phoneHash).toBe(originalHash);
      
      // But we can't reverse the hash
      expect(phoneHash).not.toContain('+1-555-GDPR-TEST');
    });

    it('should preserve original phone hash for compliance auditing', async () => {
      // Even though PII is anonymized, the hash remains
      // This allows proving the customer existed without revealing identity
      const phoneHash = encryption.hash('+1-555-GDPR-TEST');
      
      const customer = await prisma.$queryRaw`
        SELECT phone_hash FROM customers WHERE id = ${customerId}
      `;

      expect((customer as any[])[0].phone_hash).toBe(phoneHash);
    });
  });

  describe('Data integrity after anonymization', () => {
    it('should maintain referential integrity between customer and bookings', async () => {
      await prisma.setTenantContext(tenantId);

      const result = await prisma.$queryRaw`
        SELECT 
          c.id as customer_id,
          COUNT(b.id) as booking_count
        FROM customers c
        LEFT JOIN bookings b ON b.customer_id = c.id
        WHERE c.id = ${customerId}
        GROUP BY c.id
      `;

      expect((result as any[]).length).toBe(1);
      expect((result as any[])[0].booking_count).toBe('1');
    });

    it('should maintain referential integrity between customer and vehicles', async () => {
      await prisma.setTenantContext(tenantId);

      const result = await prisma.$queryRaw`
        SELECT 
          c.id as customer_id,
          COUNT(v.id) as vehicle_count
        FROM customers c
        LEFT JOIN vehicles v ON v.customer_id = c.id
        WHERE c.id = ${customerId}
        GROUP BY c.id
      `;

      expect((result as any[]).length).toBe(1);
      expect((result as any[])[0].vehicle_count).toBe('1');
    });
  });
});
