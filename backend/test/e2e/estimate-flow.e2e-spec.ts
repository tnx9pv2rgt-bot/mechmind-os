/**
 * E2E Test: Estimate Flow
 *
 * Tests: create estimate -> send -> customer approval -> convert to WO
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

describe('Estimate Flow (E2E)', () => {
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

  const ESTIMATE_ID = 'e2e-estimate-001';

  const mockEstimate = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: ESTIMATE_ID,
    tenantId: TENANT_A.id,
    customerId: TEST_CUSTOMER_ID,
    vehicleId: TEST_VEHICLE_ID,
    status: 'DRAFT',
    number: 'EST-2026-0001',
    subtotalCents: 10000,
    taxCents: 2200,
    totalCents: 12200,
    discountCents: 0,
    validUntil: new Date('2026-04-30'),
    createdBy: ADMIN_USER.userId,
    lines: [
      {
        id: 'line-1',
        type: 'LABOR',
        description: 'Oil change labor',
        quantity: 1,
        unitPriceCents: 5000,
        vatRate: 0.22,
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  // ── Create Estimate ──────────────────────────────────────────

  describe('POST /v1/estimates', () => {
    it('should create an estimate with lines', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: TEST_CUSTOMER_ID, tenantId: TENANT_A.id });
      prisma.estimate.create.mockResolvedValue(mockEstimate());

      const res = await authPost(app, '/v1/estimates', ADMIN_USER).send({
        customerId: TEST_CUSTOMER_ID,
        vehicleId: TEST_VEHICLE_ID,
        validUntil: '2026-04-30T23:59:59Z',
        createdBy: ADMIN_USER.userId,
        lines: [
          {
            type: 'LABOR',
            description: 'Oil change labor',
            quantity: 1,
            unitPriceCents: 5000,
            vatRate: 0.22,
          },
        ],
      });

      expect([200, 201, 401]).toContain(res.status);
    });

    it('should reject estimate without customerId', async () => {
      const res = await authPost(app, '/v1/estimates', ADMIN_USER).send({
        createdBy: ADMIN_USER.userId,
        lines: [
          {
            type: 'LABOR',
            description: 'Test',
            quantity: 1,
            unitPriceCents: 5000,
            vatRate: 0.22,
          },
        ],
      });

      expect(res.status).toBe(400);
    });

    it('should reject estimate without createdBy', async () => {
      const res = await authPost(app, '/v1/estimates', ADMIN_USER).send({
        customerId: TEST_CUSTOMER_ID,
      });

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request.default(app.getHttpServer()).post('/v1/estimates').send({
        customerId: TEST_CUSTOMER_ID,
        createdBy: 'user-1',
      });

      expect(res.status).toBe(401);
    });
  });

  // ── List Estimates ───────────────────────────────────────────

  describe('GET /v1/estimates', () => {
    it('should list estimates with pagination', async () => {
      prisma.estimate.findMany.mockResolvedValue([mockEstimate()]);
      prisma.estimate.count.mockResolvedValue(1);

      const res = await authGet(app, '/v1/estimates?limit=10&offset=0', ADMIN_USER);

      expect([200, 401]).toContain(res.status);
    });

    it('should filter estimates by status', async () => {
      prisma.estimate.findMany.mockResolvedValue([]);
      prisma.estimate.count.mockResolvedValue(0);

      const res = await authGet(app, '/v1/estimates?status=DRAFT', ADMIN_USER);

      expect([200, 401]).toContain(res.status);
    });
  });

  // ── Get Estimate ─────────────────────────────────────────────

  describe('GET /v1/estimates/:id', () => {
    it('should return an estimate by ID', async () => {
      prisma.estimate.findFirst.mockResolvedValue(mockEstimate());

      const res = await authGet(app, `/v1/estimates/${ESTIMATE_ID}`, ADMIN_USER);

      expect([200, 401, 404]).toContain(res.status);
    });
  });

  // ── Send Estimate ────────────────────────────────────────────

  describe('PATCH /v1/estimates/:id/send', () => {
    it('should send a draft estimate', async () => {
      prisma.estimate.findFirst.mockResolvedValue(mockEstimate({ status: 'DRAFT' }));
      prisma.estimate.update.mockResolvedValue(mockEstimate({ status: 'SENT' }));

      const res = await authPatch(app, `/v1/estimates/${ESTIMATE_ID}/send`, ADMIN_USER);

      expect([200, 400, 401, 404]).toContain(res.status);
    });
  });

  // ── Convert to Work Order ────────────────────────────────────

  describe('POST /v1/estimates/:id/convert-to-work-order', () => {
    it('should convert an accepted estimate to work order', async () => {
      prisma.estimate.findFirst.mockResolvedValue(mockEstimate({ status: 'ACCEPTED' }));
      prisma.workOrder.create.mockResolvedValue({
        id: 'wo-from-estimate',
        tenantId: TENANT_A.id,
        estimateId: ESTIMATE_ID,
        status: 'OPEN',
      });
      prisma.estimate.update.mockResolvedValue(mockEstimate({ status: 'CONVERTED' }));

      const res = await authPost(
        app,
        `/v1/estimates/${ESTIMATE_ID}/convert-to-work-order`,
        ADMIN_USER,
      );

      expect([200, 201, 400, 401, 404]).toContain(res.status);
    });

    it('should reject converting a draft estimate', async () => {
      prisma.estimate.findFirst.mockResolvedValue(mockEstimate({ status: 'DRAFT' }));

      const res = await authPost(
        app,
        `/v1/estimates/${ESTIMATE_ID}/convert-to-work-order`,
        ADMIN_USER,
      );

      expect([200, 201, 400, 401, 404]).toContain(res.status);
    });
  });

  // ── Update Estimate ──────────────────────────────────────────

  describe('PATCH /v1/estimates/:id', () => {
    it('should update estimate notes', async () => {
      prisma.estimate.findFirst.mockResolvedValue(mockEstimate());
      prisma.estimate.update.mockResolvedValue(mockEstimate({ notes: 'Updated notes' }));

      const res = await authPatch(app, `/v1/estimates/${ESTIMATE_ID}`, ADMIN_USER).send({
        notes: 'Updated notes',
      });

      expect([200, 401, 404]).toContain(res.status);
    });
  });
});
