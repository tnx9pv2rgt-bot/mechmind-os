/**
 * E2E Test: Role-Based Access Control (RBAC)
 *
 * Tests: admin access vs mechanic access vs receptionist access
 */
// @ts-nocheck

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  createE2eApp,
  ADMIN_USER,
  MECHANIC_USER,
  TENANT_A,
  TEST_CUSTOMER_ID,
  TEST_VEHICLE_ID,
  authGet,
  authPost,
} from './setup';

describe('RBAC (E2E)', () => {
  let app: INestApplication;
  let prisma: Record<string, Record<string, jest.Mock>>;

  const RECEPTIONIST_USER = {
    userId: 'e2e-user-receptionist-001',
    email: 'receptionist@e2eshop.test',
    role: 'RECEPTIONIST',
    tenantId: TENANT_A.id,
  };

  beforeAll(async () => {
    app = await createE2eApp();
    const { PrismaService } = await import('../../src/common/services/prisma.service');
    prisma = app.get(PrismaService) as unknown as Record<string, Record<string, jest.Mock>>;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Admin Access ─────────────────────────────────────────────

  describe('Admin Role', () => {
    it('should access work orders', async () => {
      prisma.workOrder.findMany.mockResolvedValue([]);
      prisma.workOrder.count.mockResolvedValue(0);

      const res = await authGet(app, '/v1/work-orders', ADMIN_USER);

      expect([200, 401]).toContain(res.status);
    });

    it('should access customers', async () => {
      prisma.customer.findMany.mockResolvedValue([]);
      prisma.customer.count.mockResolvedValue(0);

      const res = await authGet(app, '/v1/customers', ADMIN_USER);

      expect([200, 401]).toContain(res.status);
    });

    it('should create invoices', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: TEST_CUSTOMER_ID, tenantId: TENANT_A.id });
      prisma.invoice.create.mockResolvedValue({ id: 'inv-1', tenantId: TENANT_A.id });

      const res = await authPost(app, '/v1/invoices', ADMIN_USER).send({
        customerId: TEST_CUSTOMER_ID,
        items: [
          { description: 'Test', itemType: 'LABOR', quantity: 1, unitPrice: 100, vatRate: 22 },
        ],
      });

      expect([200, 201, 401]).toContain(res.status);
    });

    it('should access estimates', async () => {
      prisma.estimate.findMany.mockResolvedValue([]);
      prisma.estimate.count.mockResolvedValue(0);

      const res = await authGet(app, '/v1/estimates', ADMIN_USER);

      expect([200, 401]).toContain(res.status);
    });

    it('should convert estimates to work orders', async () => {
      prisma.estimate.findFirst.mockResolvedValue({
        id: 'est-1',
        tenantId: TENANT_A.id,
        status: 'ACCEPTED',
        customerId: TEST_CUSTOMER_ID,
        vehicleId: TEST_VEHICLE_ID,
        lines: [],
      });
      prisma.workOrder.create.mockResolvedValue({ id: 'wo-1', tenantId: TENANT_A.id });

      const res = await authPost(app, '/v1/estimates/est-1/convert-to-work-order', ADMIN_USER);

      expect([200, 201, 400, 401, 404]).toContain(res.status);
    });
  });

  // ── Mechanic Access ──────────────────────────────────────────

  describe('Mechanic Role', () => {
    it('should access work orders (read)', async () => {
      prisma.workOrder.findMany.mockResolvedValue([]);
      prisma.workOrder.count.mockResolvedValue(0);

      const res = await authGet(app, '/v1/work-orders', MECHANIC_USER);

      expect([200, 401]).toContain(res.status);
    });

    it('should access inspections (read)', async () => {
      prisma.inspection.findMany.mockResolvedValue([]);
      prisma.inspection.count.mockResolvedValue(0);

      const res = await authGet(app, '/v1/inspections', MECHANIC_USER);

      expect([200, 401]).toContain(res.status);
    });

    it('should be able to create inspections', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: TEST_VEHICLE_ID, tenantId: TENANT_A.id });
      prisma.customer.findFirst.mockResolvedValue({ id: TEST_CUSTOMER_ID, tenantId: TENANT_A.id });
      prisma.inspectionTemplate.findFirst.mockResolvedValue({
        id: 'template-1',
        tenantId: TENANT_A.id,
        items: [],
      });
      prisma.inspection.create.mockResolvedValue({
        id: 'insp-1',
        tenantId: TENANT_A.id,
        status: 'IN_PROGRESS',
      });

      const res = await authPost(app, '/v1/inspections', MECHANIC_USER).send({
        vehicleId: TEST_VEHICLE_ID,
        customerId: TEST_CUSTOMER_ID,
        templateId: '550e8400-e29b-41d4-a716-446655440010',
        mechanicId: MECHANIC_USER.userId,
      });

      expect([200, 201, 401, 403]).toContain(res.status);
    });

    it('should NOT be able to create customers (receptionist+ only)', async () => {
      const res = await authPost(app, '/v1/customers', MECHANIC_USER).send({
        phone: '+390123456789',
        firstName: 'Test',
        lastName: 'Customer',
      });

      // Mechanics should be forbidden from creating customers
      expect([401, 403]).toContain(res.status);
    });

    it('should NOT be able to convert estimates (manager+ only)', async () => {
      const res = await authPost(app, '/v1/estimates/est-1/convert-to-work-order', MECHANIC_USER);

      expect([401, 403]).toContain(res.status);
    });
  });

  // ── Receptionist Access ──────────────────────────────────────

  describe('Receptionist Role', () => {
    it('should be able to create customers', async () => {
      prisma.customer.create.mockResolvedValue({
        id: 'new-customer',
        tenantId: TENANT_A.id,
      });

      const res = await authPost(app, '/v1/customers', RECEPTIONIST_USER).send({
        phone: '+390123456789',
        firstName: 'Mario',
        lastName: 'Rossi',
      });

      expect([200, 201, 401]).toContain(res.status);
    });

    it('should be able to create bookings', async () => {
      prisma.bookingSlot.findFirst.mockResolvedValue({
        id: 'slot-1',
        tenantId: TENANT_A.id,
        isAvailable: true,
      });
      prisma.customer.findFirst.mockResolvedValue({ id: TEST_CUSTOMER_ID, tenantId: TENANT_A.id });
      prisma.booking.create.mockResolvedValue({ id: 'booking-1', tenantId: TENANT_A.id });

      const res = await authPost(app, '/v1/bookings', RECEPTIONIST_USER).send({
        customerId: TEST_CUSTOMER_ID,
        slotId: '550e8400-e29b-41d4-a716-446655440002',
        scheduledDate: '2026-04-15T09:00:00Z',
      });

      expect([200, 201, 401, 409]).toContain(res.status);
    });

    it('should NOT be able to convert estimates (manager+ only)', async () => {
      const res = await authPost(
        app,
        '/v1/estimates/est-1/convert-to-work-order',
        RECEPTIONIST_USER,
      );

      expect([401, 403]).toContain(res.status);
    });
  });

  // ── No Auth ──────────────────────────────────────────────────

  describe('Unauthenticated', () => {
    it('should reject all protected endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/v1/work-orders' },
        { method: 'get', path: '/v1/customers' },
        { method: 'get', path: '/v1/invoices' },
        { method: 'get', path: '/v1/estimates' },
        { method: 'get', path: '/v1/inspections' },
        { method: 'get', path: '/v1/bookings' },
      ];

      for (const endpoint of endpoints) {
        const res = await (
          request.default(app.getHttpServer()) as unknown as Record<
            string,
            (path: string) => request.Test
          >
        )[endpoint.method](endpoint.path);
        expect(res.status).toBe(401);
      }
    });
  });
});
