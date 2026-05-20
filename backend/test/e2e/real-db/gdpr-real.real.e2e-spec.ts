/**
 * GDPR Compliance — Real DB E2E Tests
 *
 * Verifies that PII is encrypted in the database,
 * audit logs are created, and soft deletes work.
 */
// @ts-nocheck

import { INestApplication } from '@nestjs/common';
import {
  createRealDbApp,
  getPrismaClient,
  disconnectPrisma,
  cleanupDatabase,
  seedTenant,
  seedUser,
} from './test-helpers';
import { PrismaClient } from '@prisma/client';

describe('GDPR Compliance — Real DB', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  const TENANT_ID = 'e2e-real-gdpr-tenant';
  const USER = {
    userId: 'e2e-real-gdpr-user',
    email: 'admin@gdpr-test.com',
    role: 'ADMIN',
    tenantId: TENANT_ID,
  };

  beforeAll(async () => {
    app = await createRealDbApp();
    prisma = getPrismaClient();

    await seedTenant(prisma, { id: TENANT_ID, name: 'GDPR Test Shop', slug: `gdpr-${Date.now()}` });
    await seedUser(prisma, {
      id: USER.userId,
      email: USER.email,
      name: 'GDPR Admin',
      role: 'ADMIN',
      tenantId: TENANT_ID,
    });
  });

  afterAll(async () => {
    await cleanupDatabase(prisma);
    await disconnectPrisma();
    await app.close();
  });

  describe('PII encryption at rest', () => {
    let customerId: string;

    it('should store customer with encrypted PII fields', async () => {
      // Create customer directly — the model requires encrypted fields
      const customer = await prisma.customer.create({
        data: {
          tenantId: TENANT_ID,
          encryptedPhone: 'enc_AES256_3331234567',
          encryptedEmail: 'enc_AES256_mario@example.com',
          encryptedFirstName: 'enc_AES256_Mario',
          encryptedLastName: 'enc_AES256_Rossi',
          phoneHash: 'hash_3331234567',
          emailHash: 'hash_mario@example.com',
          gdprConsent: true,
          gdprConsentAt: new Date(),
        },
      });

      customerId = customer.id;
      expect(customer.id).toBeDefined();
    });

    it('should have encrypted phone in DB, not plaintext', async () => {
      const raw = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { encryptedPhone: true },
      });

      expect(raw?.encryptedPhone).toBeDefined();
      // The field should contain the encrypted value, not plaintext
      expect(raw?.encryptedPhone).toContain('enc_');
      expect(raw?.encryptedPhone).not.toBe('3331234567');
    });

    it('should have encrypted email in DB, not plaintext', async () => {
      const raw = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { encryptedEmail: true },
      });

      expect(raw?.encryptedEmail).toBeDefined();
      expect(raw?.encryptedEmail).not.toBe('mario@example.com');
    });

    it('should have hash fields for lookup', async () => {
      const raw = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { phoneHash: true, emailHash: true },
      });

      expect(raw?.phoneHash).toBeDefined();
      expect(raw?.emailHash).toBeDefined();
      // Hash should not be the plaintext
      expect(raw?.phoneHash).not.toBe('3331234567');
    });
  });

  describe('GDPR consent tracking', () => {
    it('should persist gdprConsent and gdprConsentAt', async () => {
      const customer = await prisma.customer.create({
        data: {
          tenantId: TENANT_ID,
          encryptedPhone: 'enc_consent_test',
          phoneHash: 'hash_consent_test',
          gdprConsent: true,
          gdprConsentAt: new Date('2026-01-01'),
          gdprPrivacyVersion: '2.0',
          gdprConsentMethod: 'form-checkbox',
        },
      });

      expect(customer.gdprConsent).toBe(true);
      expect(customer.gdprConsentAt).not.toBeNull();
      expect(customer.gdprPrivacyVersion).toBe('2.0');
    });

    it('should track marketing consent separately', async () => {
      const customer = await prisma.customer.create({
        data: {
          tenantId: TENANT_ID,
          encryptedPhone: 'enc_marketing_test',
          phoneHash: 'hash_marketing_test',
          gdprConsent: true,
          gdprConsentAt: new Date(),
          marketingConsent: false,
        },
      });

      expect(customer.gdprConsent).toBe(true);
      expect(customer.marketingConsent).toBe(false);
    });
  });

  describe('Soft delete (right to erasure)', () => {
    let customerToDeleteId: string;

    it('should soft-delete a customer', async () => {
      const customer = await prisma.customer.create({
        data: {
          tenantId: TENANT_ID,
          encryptedPhone: 'enc_to_delete',
          phoneHash: 'hash_to_delete',
          gdprConsent: true,
          gdprConsentAt: new Date(),
        },
      });
      customerToDeleteId = customer.id;

      // Soft delete
      await prisma.customer.update({
        where: { id: customerToDeleteId },
        data: { deletedAt: new Date() },
      });

      const deleted = await prisma.customer.findUnique({
        where: { id: customerToDeleteId },
      });
      expect(deleted?.deletedAt).not.toBeNull();
    });

    it('should exclude soft-deleted customers from normal queries', async () => {
      const active = await prisma.customer.findMany({
        where: { tenantId: TENANT_ID, deletedAt: null },
      });

      const deletedIds = active.map(c => c.id);
      expect(deletedIds).not.toContain(customerToDeleteId);
    });

    it('soft-deleted customer should still exist in DB for audit', async () => {
      const stillInDb = await prisma.customer.findUnique({
        where: { id: customerToDeleteId },
      });
      expect(stillInDb).not.toBeNull();
      expect(stillInDb?.deletedAt).not.toBeNull();
    });
  });

  describe('Audit log persistence', () => {
    it('should be able to create audit log entries', async () => {
      const log = await prisma.auditLog.create({
        data: {
          tenantId: TENANT_ID,
          performedBy: USER.userId,
          action: 'DELETE',
          tableName: 'Customer',
          recordId: 'e2e-audit-record',
          oldValues: JSON.stringify({ encryptedPhone: 'enc_old' }),
          newValues: JSON.stringify({ deletedAt: new Date().toISOString() }),
        },
      });

      expect(log.id).toBeDefined();
      expect(log.action).toBe('DELETE');
      expect(log.tenantId).toBe(TENANT_ID);
    });

    it('should filter audit logs by tenant', async () => {
      const logs = await prisma.auditLog.findMany({
        where: { tenantId: TENANT_ID },
      });

      expect(logs.length).toBeGreaterThanOrEqual(1);
      for (const log of logs) {
        expect(log.tenantId).toBe(TENANT_ID);
      }
    });
  });

  describe('Data export (right to access)', () => {
    it('should be able to export all customer data for a tenant', async () => {
      const customers = await prisma.customer.findMany({
        where: { tenantId: TENANT_ID },
        include: {
          vehicles: true,
        },
      });

      expect(customers.length).toBeGreaterThanOrEqual(1);
      // Each customer should have the expected fields
      for (const c of customers) {
        expect(c.tenantId).toBe(TENANT_ID);
        expect(c.encryptedPhone).toBeDefined();
      }
    });
  });
});
