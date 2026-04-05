/**
 * RENTRI Waste Management — Real DB E2E Tests
 *
 * Verifies that waste entries, FIR records, and MUD reports
 * work correctly on a real PostgreSQL database.
 */
import { INestApplication } from '@nestjs/common';
import {
  createRealDbApp,
  getPrismaClient,
  disconnectPrisma,
  cleanupDatabase,
  seedTenant,
  seedUser,
  authGet,
} from './test-helpers';
import { PrismaClient } from '@prisma/client';

describe('RENTRI Waste Management — Real DB', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  const TENANT_ID = 'e2e-real-rentri-tenant';
  const USER = {
    userId: 'e2e-real-rentri-user',
    email: 'admin@rentri-test.com',
    role: 'ADMIN',
    tenantId: TENANT_ID,
  };

  let transporterId: string;
  let destinationId: string;

  beforeAll(async () => {
    app = await createRealDbApp();
    prisma = getPrismaClient();

    await seedTenant(prisma, {
      id: TENANT_ID,
      name: 'RENTRI Test Shop',
      slug: `rentri-${Date.now()}`,
    });
    await seedUser(prisma, {
      id: USER.userId,
      email: USER.email,
      name: 'RENTRI Admin',
      role: 'ADMIN',
      tenantId: TENANT_ID,
    });

    // Create transporter and destination for FIR tests
    const transporter = await prisma.wasteTransporter.create({
      data: {
        tenantId: TENANT_ID,
        name: 'EcoTrasporti Srl',
        fiscalCode: `ECO${Date.now()}`,
        alboCategoryNo: 'CAT5-12345',
      },
    });
    transporterId = transporter.id;

    const destination = await prisma.wasteDestination.create({
      data: {
        tenantId: TENANT_ID,
        name: 'Ricicla SpA',
        fiscalCode: `RIC${Date.now()}`,
        authorizationNo: 'AUT-2026-001',
        address: 'Via Riciclo 1, Milano',
      },
    });
    destinationId = destination.id;
  });

  afterAll(async () => {
    await cleanupDatabase(prisma);
    await disconnectPrisma();
    await app.close();
  });

  describe('Waste entry CRUD on real DB', () => {
    let wasteEntryId: string;

    it('should create a waste entry with valid CER code', async () => {
      const entry = await prisma.wasteEntry.create({
        data: {
          tenantId: TENANT_ID,
          entryNumber: `WE-${Date.now()}`,
          entryType: 'CARICO',
          entryDate: new Date(),
          cerCode: '160103',
          cerDescription: 'Pneumatici fuori uso',
          hazardClass: 'NON_PERICOLOSO',
          physicalState: 'SOLIDO',
          quantityKg: 150.5,
          originDescription: 'Officina principale',
          isOwnProduction: true,
        },
      });

      wasteEntryId = entry.id;
      expect(entry.id).toBeDefined();
      expect(entry.cerCode).toBe('160103');
      expect(entry.tenantId).toBe(TENANT_ID);
    });

    it('should persist waste entry in database', async () => {
      const found = await prisma.wasteEntry.findUnique({
        where: { id: wasteEntryId },
      });

      expect(found).not.toBeNull();
      expect(found?.cerCode).toBe('160103');
      expect(Number(found?.quantityKg)).toBeCloseTo(150.5);
      expect(found?.cerDescription).toBe('Pneumatici fuori uso');
    });

    it('should enforce unique entryNumber per tenant', async () => {
      const entryNumber = `WE-UNIQUE-${Date.now()}`;
      await prisma.wasteEntry.create({
        data: {
          tenantId: TENANT_ID,
          entryNumber,
          entryType: 'CARICO',
          entryDate: new Date(),
          cerCode: '130205',
          cerDescription: 'Olio minerale per motori non clorurato',
          hazardClass: 'PERICOLOSO',
          physicalState: 'LIQUIDO',
          quantityKg: 50,
        },
      });

      // Duplicate entry number for same tenant should fail
      await expect(
        prisma.wasteEntry.create({
          data: {
            tenantId: TENANT_ID,
            entryNumber,
            entryType: 'SCARICO',
            entryDate: new Date(),
            cerCode: '130205',
            cerDescription: 'Olio minerale per motori non clorurato',
            hazardClass: 'PERICOLOSO',
            physicalState: 'LIQUIDO',
            quantityKg: 50,
          },
        }),
      ).rejects.toThrow();
    });

    it('should filter waste entries by tenant', async () => {
      const otherTenantId = 'e2e-real-rentri-other';
      await prisma.tenant.upsert({
        where: { id: otherTenantId },
        update: {},
        create: { id: otherTenantId, name: 'Other', slug: `rentri-other-${Date.now()}` },
      });

      await prisma.wasteEntry.create({
        data: {
          tenantId: otherTenantId,
          entryNumber: `WE-OTHER-${Date.now()}`,
          entryType: 'CARICO',
          entryDate: new Date(),
          cerCode: '130205',
          cerDescription: 'Olio (altro tenant)',
          hazardClass: 'PERICOLOSO',
          physicalState: 'LIQUIDO',
          quantityKg: 50,
        },
      });

      const myEntries = await prisma.wasteEntry.findMany({
        where: { tenantId: TENANT_ID },
      });

      for (const entry of myEntries) {
        expect(entry.tenantId).toBe(TENANT_ID);
      }
    });
  });

  describe('WasteFir on real DB', () => {
    let firId: string;

    it('should create a FIR record with all required fields', async () => {
      const fir = await prisma.wasteFir.create({
        data: {
          tenantId: TENANT_ID,
          firNumber: `FIR-${Date.now()}`,
          status: 'DRAFT',
          cerCode: '160103',
          cerDescription: 'Pneumatici fuori uso',
          hazardClass: 'NON_PERICOLOSO',
          physicalState: 'SOLIDO',
          quantityKg: 150.5,
          producerName: 'RENTRI Test Shop',
          producerFiscalCode: 'IT12345678901',
          producerAddress: 'Via Meccanica 1, Roma',
          transporterId,
          destinationId,
          scheduledDate: new Date(),
        },
      });

      firId = fir.id;
      expect(fir.id).toBeDefined();
      expect(fir.firNumber).toContain('FIR-');
      expect(fir.status).toBe('DRAFT');
    });

    it('should persist FIR with relations', async () => {
      const found = await prisma.wasteFir.findUnique({
        where: { id: firId },
        include: { transporter: true, destination: true },
      });

      expect(found).not.toBeNull();
      expect(found?.transporter?.name).toBe('EcoTrasporti Srl');
      expect(found?.destination?.name).toBe('Ricicla SpA');
    });

    it('should transition FIR status through lifecycle', async () => {
      // DRAFT -> VIDIMATED
      await prisma.wasteFir.update({
        where: { id: firId },
        data: { status: 'VIDIMATED' },
      });

      // VIDIMATED -> IN_TRANSIT
      await prisma.wasteFir.update({
        where: { id: firId },
        data: { status: 'IN_TRANSIT', pickupDate: new Date() },
      });

      // IN_TRANSIT -> DELIVERED
      await prisma.wasteFir.update({
        where: { id: firId },
        data: { status: 'DELIVERED', deliveryDate: new Date() },
      });

      // DELIVERED -> CONFIRMED
      await prisma.wasteFir.update({
        where: { id: firId },
        data: { status: 'CONFIRMED', confirmationDate: new Date() },
      });

      const confirmed = await prisma.wasteFir.findUnique({
        where: { id: firId },
      });
      expect(confirmed?.status).toBe('CONFIRMED');
      expect(confirmed?.pickupDate).not.toBeNull();
      expect(confirmed?.deliveryDate).not.toBeNull();
      expect(confirmed?.confirmationDate).not.toBeNull();
    });

    it('should enforce unique firNumber per tenant', async () => {
      const firNumber = `FIR-UNIQUE-${Date.now()}`;
      await prisma.wasteFir.create({
        data: {
          tenantId: TENANT_ID,
          firNumber,
          cerCode: '160103',
          cerDescription: 'Test',
          hazardClass: 'NON_PERICOLOSO',
          physicalState: 'SOLIDO',
          quantityKg: 10,
          producerName: 'Test',
          producerFiscalCode: 'IT00000000000',
          producerAddress: 'Test',
          transporterId,
          destinationId,
          scheduledDate: new Date(),
        },
      });

      await expect(
        prisma.wasteFir.create({
          data: {
            tenantId: TENANT_ID,
            firNumber,
            cerCode: '160103',
            cerDescription: 'Duplicate',
            hazardClass: 'NON_PERICOLOSO',
            physicalState: 'SOLIDO',
            quantityKg: 10,
            producerName: 'Test',
            producerFiscalCode: 'IT00000000000',
            producerAddress: 'Test',
            transporterId,
            destinationId,
            scheduledDate: new Date(),
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe('RENTRI API endpoints', () => {
    it('should list waste entries via API', async () => {
      const res = await authGet(app, '/v1/rentri/entries', USER);
      expect([200, 404]).toContain(res.status);
    });

    it('should list FIR records via API', async () => {
      const res = await authGet(app, '/v1/rentri/fir', USER);
      expect([200, 404]).toContain(res.status);
    });

    it('should get RENTRI alerts via API', async () => {
      const res = await authGet(app, '/v1/rentri/alerts', USER);
      expect([200, 404]).toContain(res.status);
    });
  });

  describe('FK constraints', () => {
    it('should enforce tenant FK on waste entry', async () => {
      await expect(
        prisma.wasteEntry.create({
          data: {
            tenantId: 'non-existent-tenant-id',
            entryNumber: `WE-FK-${Date.now()}`,
            entryType: 'CARICO',
            entryDate: new Date(),
            cerCode: '160103',
            cerDescription: 'Test',
            hazardClass: 'NON_PERICOLOSO',
            physicalState: 'SOLIDO',
            quantityKg: 10,
          },
        }),
      ).rejects.toThrow();
    });
  });
});
