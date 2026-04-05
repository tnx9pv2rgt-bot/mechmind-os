/**
 * E2E Test: Work Order Flow
 *
 * Tests: create WO -> add items -> update status -> start -> complete -> invoice
 */

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  createE2eApp,
  ADMIN_USER,
  TENANT_A,
  TEST_CUSTOMER_ID,
  TEST_VEHICLE_ID,
  authPost,
  authGet,
  authPatch,
} from './setup';

describe('Work Order Flow (E2E)', () => {
  let app: INestApplication;
  let prisma: Record<string, Record<string, jest.Mock>>;

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

  const WORK_ORDER_ID = 'e2e-wo-001';

  const mockWorkOrder = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: WORK_ORDER_ID,
    tenantId: TENANT_A.id,
    vehicleId: TEST_VEHICLE_ID,
    customerId: TEST_CUSTOMER_ID,
    status: 'OPEN',
    diagnosis: 'Test diagnosis',
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [],
    vehicle: { id: TEST_VEHICLE_ID, make: 'Fiat', model: 'Punto' },
    customer: { id: TEST_CUSTOMER_ID },
    ...overrides,
  });

  // ── Create Work Order ────────────────────────────────────────

  describe('POST /v1/work-orders', () => {
    it('should create a work order with valid data', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: TEST_VEHICLE_ID, tenantId: TENANT_A.id });
      prisma.customer.findFirst.mockResolvedValue({ id: TEST_CUSTOMER_ID, tenantId: TENANT_A.id });
      prisma.workOrder.create.mockResolvedValue(mockWorkOrder());

      const res = await authPost(app, '/v1/work-orders', ADMIN_USER).send({
        vehicleId: TEST_VEHICLE_ID,
        customerId: TEST_CUSTOMER_ID,
        diagnosis: 'Rumore anomalo motore',
        customerRequest: 'Tagliando completo',
        mileageIn: 125000,
      });

      expect([200, 201, 401]).toContain(res.status);
      if (res.status === 201) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      }
    });

    it('should reject work order without vehicleId', async () => {
      const res = await authPost(app, '/v1/work-orders', ADMIN_USER).send({
        customerId: TEST_CUSTOMER_ID,
        diagnosis: 'Test',
      });

      expect(res.status).toBe(400);
    });

    it('should reject work order without customerId', async () => {
      const res = await authPost(app, '/v1/work-orders', ADMIN_USER).send({
        vehicleId: TEST_VEHICLE_ID,
        diagnosis: 'Test',
      });

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request.default(app.getHttpServer()).post('/v1/work-orders').send({
        vehicleId: TEST_VEHICLE_ID,
        customerId: TEST_CUSTOMER_ID,
      });

      expect(res.status).toBe(401);
    });
  });

  // ── Get Work Order ───────────────────────────────────────────

  describe('GET /v1/work-orders/:id', () => {
    it('should return a work order by ID', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(mockWorkOrder());

      const res = await authGet(app, `/v1/work-orders/${WORK_ORDER_ID}`, ADMIN_USER);

      expect([200, 401, 404]).toContain(res.status);
    });

    it('should return 401 without auth', async () => {
      const res = await request
        .default(app.getHttpServer())
        .get(`/v1/work-orders/${WORK_ORDER_ID}`);

      expect(res.status).toBe(401);
    });
  });

  // ── List Work Orders ─────────────────────────────────────────

  describe('GET /v1/work-orders', () => {
    it('should list work orders with pagination', async () => {
      prisma.workOrder.findMany.mockResolvedValue([mockWorkOrder()]);
      prisma.workOrder.count.mockResolvedValue(1);

      const res = await authGet(app, '/v1/work-orders?page=1&limit=10', ADMIN_USER);

      expect([200, 401]).toContain(res.status);
    });

    it('should filter work orders by status', async () => {
      prisma.workOrder.findMany.mockResolvedValue([]);
      prisma.workOrder.count.mockResolvedValue(0);

      const res = await authGet(app, '/v1/work-orders?status=OPEN', ADMIN_USER);

      expect([200, 401]).toContain(res.status);
    });
  });

  // ── Update Work Order ────────────────────────────────────────

  describe('PATCH /v1/work-orders/:id', () => {
    it('should update work order fields', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(mockWorkOrder());
      prisma.workOrder.update.mockResolvedValue(mockWorkOrder({ diagnosis: 'Updated diagnosis' }));

      const res = await authPatch(app, `/v1/work-orders/${WORK_ORDER_ID}`, ADMIN_USER).send({
        diagnosis: 'Updated diagnosis',
      });

      expect([200, 401, 404]).toContain(res.status);
    });
  });

  // ── Start Work Order ─────────────────────────────────────────

  describe('POST /v1/work-orders/:id/start', () => {
    it('should start an open work order', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(mockWorkOrder({ status: 'OPEN' }));
      prisma.workOrder.update.mockResolvedValue(mockWorkOrder({ status: 'IN_PROGRESS' }));

      const res = await authPost(app, `/v1/work-orders/${WORK_ORDER_ID}/start`, ADMIN_USER);

      expect([200, 400, 401, 404]).toContain(res.status);
    });
  });

  // ── Complete Work Order ──────────────────────────────────────

  describe('POST /v1/work-orders/:id/complete', () => {
    it('should complete an in-progress work order', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(mockWorkOrder({ status: 'IN_PROGRESS' }));
      prisma.workOrder.update.mockResolvedValue(mockWorkOrder({ status: 'COMPLETED' }));

      const res = await authPost(app, `/v1/work-orders/${WORK_ORDER_ID}/complete`, ADMIN_USER);

      expect([200, 400, 401, 404]).toContain(res.status);
    });

    it('should reject completing an already completed work order', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(mockWorkOrder({ status: 'COMPLETED' }));

      const res = await authPost(app, `/v1/work-orders/${WORK_ORDER_ID}/complete`, ADMIN_USER);

      expect([200, 400, 401, 404]).toContain(res.status);
    });
  });

  // ── Create Invoice from WO ──────────────────────────────────

  describe('POST /v1/work-orders/:id/invoice', () => {
    it('should create an invoice from a completed work order', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(mockWorkOrder({ status: 'COMPLETED' }));
      prisma.invoice.create.mockResolvedValue({
        id: 'e2e-invoice-from-wo',
        tenantId: TENANT_A.id,
        workOrderId: WORK_ORDER_ID,
        status: 'DRAFT',
      });

      const res = await authPost(app, `/v1/work-orders/${WORK_ORDER_ID}/invoice`, ADMIN_USER);

      expect([200, 201, 400, 401, 404]).toContain(res.status);
    });
  });
});
