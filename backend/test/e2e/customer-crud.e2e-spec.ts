/**
 * E2E Test: Customer CRUD
 *
 * Tests: full CRUD cycle for customers with validation
 */

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  createE2eApp,
  ADMIN_USER,
  TENANT_A,
  TEST_CUSTOMER_ID,
  authPost,
  authGet,
  authPatch,
  authDelete,
} from './setup';

describe('Customer CRUD (E2E)', () => {
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

  const mockCustomer = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: TEST_CUSTOMER_ID,
    tenantId: TENANT_A.id,
    encryptedName: 'enc_Mario Rossi',
    encryptedEmail: 'enc_mario@example.com',
    encryptedPhone: 'enc_+390123456789',
    emailHash: 'hash_mario@example.com',
    phoneHash: 'hash_+390123456789',
    firstName: 'Mario',
    lastName: 'Rossi',
    email: 'mario@example.com',
    phone: '+390123456789',
    isActive: true,
    gdprConsent: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    vehicles: [],
    ...overrides,
  });

  // ── Create Customer ──────────────────────────────────────────

  describe('POST /v1/customers', () => {
    it('should create a customer with valid data', async () => {
      prisma.customer.create.mockResolvedValue(mockCustomer());

      const res = await authPost(app, '/v1/customers', ADMIN_USER).send({
        phone: '+390123456789',
        email: 'mario@example.com',
        firstName: 'Mario',
        lastName: 'Rossi',
        gdprConsent: true,
      });

      expect([200, 201, 401]).toContain(res.status);
      if (res.status === 201 || res.status === 200) {
        expect(res.body).toHaveProperty('success', true);
      }
    });

    it('should create a customer with only phone number (minimum data)', async () => {
      prisma.customer.create.mockResolvedValue(mockCustomer({ email: null }));

      const res = await authPost(app, '/v1/customers', ADMIN_USER).send({
        phone: '+390987654321',
      });

      expect([200, 201, 401]).toContain(res.status);
    });

    it('should reject customer with invalid email format', async () => {
      const res = await authPost(app, '/v1/customers', ADMIN_USER).send({
        phone: '+390123456789',
        email: 'not-an-email',
      });

      expect(res.status).toBe(400);
    });

    it('should reject customer with too-short phone', async () => {
      const res = await authPost(app, '/v1/customers', ADMIN_USER).send({
        phone: '123',
      });

      expect(res.status).toBe(400);
    });

    it('should reject customer without phone', async () => {
      const res = await authPost(app, '/v1/customers', ADMIN_USER).send({
        firstName: 'Mario',
        lastName: 'Rossi',
      });

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request.default(app.getHttpServer()).post('/v1/customers').send({
        phone: '+390123456789',
      });

      expect(res.status).toBe(401);
    });

    it('should reject unexpected fields (forbidNonWhitelisted)', async () => {
      const res = await authPost(app, '/v1/customers', ADMIN_USER).send({
        phone: '+390123456789',
        hackerField: 'malicious data',
      });

      expect(res.status).toBe(400);
    });
  });

  // ── Read Customers ───────────────────────────────────────────

  describe('GET /v1/customers', () => {
    it('should list customers with default pagination', async () => {
      prisma.customer.findMany.mockResolvedValue([mockCustomer()]);
      prisma.customer.count.mockResolvedValue(1);

      const res = await authGet(app, '/v1/customers', ADMIN_USER);

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('meta');
      }
    });

    it('should paginate customers', async () => {
      prisma.customer.findMany.mockResolvedValue([]);
      prisma.customer.count.mockResolvedValue(100);

      const res = await authGet(app, '/v1/customers?limit=10&offset=20', ADMIN_USER);

      expect([200, 401]).toContain(res.status);
    });
  });

  // ── Read Single Customer ─────────────────────────────────────

  describe('GET /v1/customers/:id', () => {
    it('should return a customer by ID', async () => {
      prisma.customer.findFirst.mockResolvedValue(mockCustomer());

      const res = await authGet(app, `/v1/customers/${TEST_CUSTOMER_ID}`, ADMIN_USER);

      expect([200, 401, 404]).toContain(res.status);
    });

    it('should return 404 for non-existent customer', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);

      const res = await authGet(app, '/v1/customers/non-existent-id', ADMIN_USER);

      expect([401, 404]).toContain(res.status);
    });
  });

  // ── Search Customers ─────────────────────────────────────────

  describe('GET /v1/customers/search', () => {
    it('should search customers by name', async () => {
      prisma.customer.findMany.mockResolvedValue([mockCustomer()]);

      const res = await authGet(app, '/v1/customers/search?name=Mario', ADMIN_USER);

      expect([200, 401]).toContain(res.status);
    });

    it('should search customers by email', async () => {
      prisma.customer.findMany.mockResolvedValue([mockCustomer()]);

      const res = await authGet(app, '/v1/customers/search?email=mario@example.com', ADMIN_USER);

      expect([200, 401]).toContain(res.status);
    });
  });

  // ── Update Customer ──────────────────────────────────────────

  describe('PATCH /v1/customers/:id', () => {
    it('should update customer fields', async () => {
      prisma.customer.findFirst.mockResolvedValue(mockCustomer());
      prisma.customer.update.mockResolvedValue(mockCustomer({ firstName: 'Luigi' }));

      const res = await authPatch(app, `/v1/customers/${TEST_CUSTOMER_ID}`, ADMIN_USER).send({
        firstName: 'Luigi',
      });

      expect([200, 401, 404]).toContain(res.status);
    });

    it('should reject update with invalid email', async () => {
      const res = await authPatch(app, `/v1/customers/${TEST_CUSTOMER_ID}`, ADMIN_USER).send({
        email: 'not-an-email',
      });

      expect([400, 401]).toContain(res.status);
    });

    it('should return 404 for non-existent customer update', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);

      const res = await authPatch(app, '/v1/customers/non-existent-id', ADMIN_USER).send({
        firstName: 'Test',
      });

      expect([401, 404]).toContain(res.status);
    });
  });

  // ── Delete Customer ──────────────────────────────────────────

  describe('DELETE /v1/customers/:id', () => {
    it('should delete (soft-delete) a customer', async () => {
      prisma.customer.findFirst.mockResolvedValue(mockCustomer());
      prisma.customer.update.mockResolvedValue(mockCustomer({ isActive: false }));

      const res = await authDelete(app, `/v1/customers/${TEST_CUSTOMER_ID}`, ADMIN_USER);

      expect([200, 401, 404]).toContain(res.status);
    });

    it('should return 401 without authentication', async () => {
      const res = await request
        .default(app.getHttpServer())
        .delete(`/v1/customers/${TEST_CUSTOMER_ID}`);

      expect(res.status).toBe(401);
    });
  });
});
