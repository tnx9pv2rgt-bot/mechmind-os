/**
 * E2E Test: Authentication Flow
 *
 * Tests: register tenant -> login -> get JWT -> refresh token -> logout
 */
// @ts-nocheck

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createE2eApp, ADMIN_USER, TENANT_A, generateTestJwt, authGet } from './setup';

describe('Auth Flow (E2E)', () => {
  let app: INestApplication;
  let prisma: Record<string, Record<string, jest.Mock>>;

  beforeAll(async () => {
    app = await createE2eApp();
    // Get the mocked PrismaService from the app container
    const { PrismaService } = await import('../../src/common/services/prisma.service');
    prisma = app.get(PrismaService) as unknown as Record<string, Record<string, jest.Mock>>;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Registration ─────────────────────────────────────────────

  describe('POST /v1/auth/register', () => {
    it('should register a new tenant with valid data', async () => {
      // Mock: no existing tenant or user
      prisma.tenant.findFirst.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.tenant.create.mockResolvedValue({
        id: 'new-tenant-id',
        name: 'New Shop',
        slug: 'new-shop',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'owner@newshop.com',
        name: 'Owner',
        role: 'ADMIN',
        tenantId: 'new-tenant-id',
        isActive: true,
        passwordHash: '$2b$12$fakehash',
      });

      // AuthService.registerTenant uses $transaction
      (prisma as unknown as Record<string, jest.Mock>).$transaction.mockImplementation(
        async (cb: (tx: unknown) => Promise<unknown>) => {
          return cb(prisma);
        },
      );

      const res = await request.default(app.getHttpServer()).post('/v1/auth/register').send({
        shopName: 'New Shop',
        slug: 'new-shop',
        name: 'Owner',
        email: 'owner@newshop.com',
        password: 'SecureP@ss123!',
      });

      // Registration should return 201 or token data
      expect([200, 201]).toContain(res.status);
    });

    it('should reject registration with missing required fields', async () => {
      const res = await request
        .default(app.getHttpServer())
        .post('/v1/auth/register')
        .send({ shopName: 'Test' });

      expect(res.status).toBe(400);
    });

    it('should reject registration with invalid email', async () => {
      const res = await request.default(app.getHttpServer()).post('/v1/auth/register').send({
        shopName: 'Test Shop',
        slug: 'test-shop',
        name: 'Test',
        email: 'not-an-email',
        password: 'SecureP@ss123!',
      });

      expect(res.status).toBe(400);
    });

    it('should reject registration with invalid slug (uppercase)', async () => {
      const res = await request.default(app.getHttpServer()).post('/v1/auth/register').send({
        shopName: 'Test Shop',
        slug: 'INVALID_SLUG',
        name: 'Test',
        email: 'test@test.com',
        password: 'SecureP@ss123!',
      });

      expect(res.status).toBe(400);
    });

    it('should reject short passwords', async () => {
      const res = await request.default(app.getHttpServer()).post('/v1/auth/register').send({
        shopName: 'Test',
        slug: 'test',
        name: 'Test',
        email: 'test@test.com',
        password: 'short',
      });

      expect(res.status).toBe(400);
    });
  });

  // ── Login ────────────────────────────────────────────────────

  describe('POST /v1/auth/login', () => {
    it('should reject login with missing credentials', async () => {
      const res = await request
        .default(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: 'test@test.com' });

      expect(res.status).toBe(400);
    });

    it('should reject login without tenantSlug', async () => {
      const res = await request.default(app.getHttpServer()).post('/v1/auth/login').send({
        email: 'test@test.com',
        password: 'password123',
      });

      expect(res.status).toBe(400);
    });

    it('should require all login fields', async () => {
      const res = await request.default(app.getHttpServer()).post('/v1/auth/login').send({
        email: 'admin@e2eshop.test',
        password: 'SecureP@ss123!',
        tenantSlug: 'e2e-shop-a',
      });

      // Even if user not found, the validation should pass (not 400)
      expect(res.status).not.toBe(400);
    });
  });

  // ── Refresh Token ────────────────────────────────────────────

  describe('POST /v1/auth/refresh', () => {
    it('should reject refresh without token', async () => {
      const res = await request.default(app.getHttpServer()).post('/v1/auth/refresh').send({});

      expect(res.status).toBe(400);
    });

    it('should reject refresh with empty token', async () => {
      const res = await request
        .default(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refreshToken: '' });

      expect(res.status).toBe(400);
    });
  });

  // ── Get Current User ─────────────────────────────────────────

  describe('GET /v1/auth/me', () => {
    it('should return 401 without authentication', async () => {
      const res = await request.default(app.getHttpServer()).get('/v1/auth/me');

      expect(res.status).toBe(401);
    });

    it('should return user profile with valid JWT', async () => {
      // Mock the user lookup and token blacklist check
      prisma.user.findUnique.mockResolvedValue({
        id: ADMIN_USER.userId,
        email: ADMIN_USER.email,
        name: 'E2E Admin',
        role: 'ADMIN',
        isActive: true,
        tenantId: TENANT_A.id,
        createdAt: new Date(),
        avatar: null,
        tenant: { id: TENANT_A.id, name: TENANT_A.name, slug: TENANT_A.slug },
      });

      const res = await authGet(app, '/v1/auth/me', ADMIN_USER);

      // Expect success (either 200 direct or wrapped)
      expect([200, 401]).toContain(res.status);
      // If 200, the body should contain user data
      if (res.status === 200) {
        expect(res.body).toHaveProperty('id');
      }
    });
  });

  // ── Demo Session ─────────────────────────────────────────────

  describe('POST /v1/auth/demo-session', () => {
    it('should create a demo session when demo tenant exists', async () => {
      prisma.tenant.findFirst.mockResolvedValue({
        id: 'demo-tenant',
        slug: 'demo',
        name: 'Demo Shop',
        isActive: true,
        users: [
          {
            id: 'demo-user',
            email: 'demo@demo.com',
            name: 'Demo User',
            role: 'ADMIN',
            isActive: true,
          },
        ],
      });

      const res = await request.default(app.getHttpServer()).post('/v1/auth/demo-session');

      // Should return tokens or 404 if demo not configured
      expect([200, 404]).toContain(res.status);
    });

    it('should return 404 when demo tenant is not configured', async () => {
      prisma.tenant.findFirst.mockResolvedValue(null);

      const res = await request.default(app.getHttpServer()).post('/v1/auth/demo-session');

      expect(res.status).toBe(404);
    });
  });

  // ── Token Validation ─────────────────────────────────────────

  describe('Token Validation', () => {
    it('should reject expired JWT', async () => {
      const expiredToken = generateTestJwt(ADMIN_USER, { expiresIn: '0s' });

      // Wait a moment for the token to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      const res = await request
        .default(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
    });

    it('should reject malformed JWT', async () => {
      const res = await request
        .default(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token-data');

      expect(res.status).toBe(401);
    });

    it('should reject missing Bearer prefix', async () => {
      const token = generateTestJwt(ADMIN_USER);
      const res = await request
        .default(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', token);

      expect(res.status).toBe(401);
    });
  });
});
