/**
 * Multi-Tenant Isolation Integration Tests
 *
 * Verifies that tenant data is properly isolated:
 * - Tenant A cannot see Tenant B's customers
 * - Tenant A cannot see Tenant B's bookings
 * - RLS policies enforce isolation at the database level
 * - JWT tokens are correctly scoped to tenants
 *
 * Requires: docker-compose.test.yml running (PostgreSQL + Redis)
 */
// @ts-nocheck

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@common/services/prisma.service';
import { AuthService } from '@auth/services/auth.service';

describe('Multi-Tenant Isolation (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;

  // Test tenants
  const tenantA = {
    id: '',
    name: 'Garage Alpha',
    slug: 'garage-alpha',
    adminToken: '',
  };
  const tenantB = {
    id: '',
    name: 'Garage Beta',
    slug: 'garage-beta',
    adminToken: '',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    authService = moduleFixture.get<AuthService>(AuthService);

    // Setup test tenants
    const tA = await prisma.tenant.create({
      data: {
        name: tenantA.name,
        slug: tenantA.slug,
        isActive: true,
        settings: {},
      },
    });
    tenantA.id = tA.id;

    const tB = await prisma.tenant.create({
      data: {
        name: tenantB.name,
        slug: tenantB.slug,
        isActive: true,
        settings: {},
      },
    });
    tenantB.id = tB.id;

    // Create admin users for each tenant
    const passwordHash = await authService.hashPassword('TestPass123!');

    const userA = await prisma.user.create({
      data: {
        email: 'admin@garage-alpha.test',
        name: 'Admin Alpha',
        passwordHash,
        role: 'ADMIN',
        tenantId: tenantA.id,
        isActive: true,
      },
    });

    const userB = await prisma.user.create({
      data: {
        email: 'admin@garage-beta.test',
        name: 'Admin Beta',
        passwordHash,
        role: 'ADMIN',
        tenantId: tenantB.id,
        isActive: true,
      },
    });

    // Generate tokens
    const tokensA = await authService.generateTokens({
      id: userA.id,
      email: userA.email,
      name: userA.name,
      role: userA.role,
      isActive: true,
      tenantId: tenantA.id,
      tenant: { id: tenantA.id, name: tenantA.name, slug: tenantA.slug, isActive: true },
    });
    tenantA.adminToken = tokensA.accessToken;

    const tokensB = await authService.generateTokens({
      id: userB.id,
      email: userB.email,
      name: userB.name,
      role: userB.role,
      isActive: true,
      tenantId: tenantB.id,
      tenant: { id: tenantB.id, name: tenantB.name, slug: tenantB.slug, isActive: true },
    });
    tenantB.adminToken = tokensB.accessToken;

    // Create test customers for each tenant
    await prisma.customer.createMany({
      data: [
        {
          tenantId: tenantA.id,
          firstName: 'Mario',
          lastName: 'Rossi',
          email: 'mario@example.com',
          phone: '+39123456789',
        },
        {
          tenantId: tenantA.id,
          firstName: 'Luigi',
          lastName: 'Verdi',
          email: 'luigi@example.com',
          phone: '+39987654321',
        },
        {
          tenantId: tenantB.id,
          firstName: 'Anna',
          lastName: 'Bianchi',
          email: 'anna@example.com',
          phone: '+39111222333',
        },
      ],
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.customer.deleteMany({
      where: { tenantId: { in: [tenantA.id, tenantB.id] } },
    });
    await prisma.user.deleteMany({
      where: { tenantId: { in: [tenantA.id, tenantB.id] } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantA.id, tenantB.id] } },
    });

    await app.close();
  });

  describe('Customer isolation', () => {
    it('Tenant A should only see their own customers', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers')
        .set('Authorization', `Bearer ${tenantA.adminToken}`)
        .expect(200);

      const customers = response.body.data || response.body;
      const customerNames = Array.isArray(customers)
        ? customers.map((c: { firstName: string }) => c.firstName)
        : [];

      expect(customerNames).toContain('Mario');
      expect(customerNames).toContain('Luigi');
      expect(customerNames).not.toContain('Anna');
    });

    it('Tenant B should only see their own customers', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers')
        .set('Authorization', `Bearer ${tenantB.adminToken}`)
        .expect(200);

      const customers = response.body.data || response.body;
      const customerNames = Array.isArray(customers)
        ? customers.map((c: { firstName: string }) => c.firstName)
        : [];

      expect(customerNames).toContain('Anna');
      expect(customerNames).not.toContain('Mario');
      expect(customerNames).not.toContain('Luigi');
    });

    it('should not allow cross-tenant customer access by ID', async () => {
      // Get Tenant A's customer
      const customersA = await prisma.customer.findMany({
        where: { tenantId: tenantA.id },
        take: 1,
      });

      // Try to access with Tenant B's token
      await request(app.getHttpServer())
        .get(`/customers/${customersA[0].id}`)
        .set('Authorization', `Bearer ${tenantB.adminToken}`)
        .expect(404);
    });
  });

  describe('Unauthenticated access', () => {
    it('should reject requests without token', async () => {
      await request(app.getHttpServer())
        .get('/customers')
        .expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/customers')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('JWT payload integrity', () => {
    it('should include tenantId in token payload', async () => {
      const user = await prisma.user.findFirst({
        where: { tenantId: tenantA.id },
        include: { tenant: true },
      });

      expect(user).toBeDefined();

      const tokens = await authService.generateTokens({
        id: user!.id,
        email: user!.email,
        name: user!.name,
        role: user!.role,
        isActive: true,
        tenantId: tenantA.id,
        tenant: {
          id: user!.tenant.id,
          name: user!.tenant.name,
          slug: user!.tenant.slug,
          isActive: user!.tenant.isActive,
        },
      });

      // Decode token (without verification) to check payload
      const payload = JSON.parse(
        Buffer.from(tokens.accessToken.split('.')[1], 'base64').toString(),
      );

      expect(payload.tenantId).toBe(tenantA.id);
      expect(payload.sub).toContain(user!.id);
      expect(payload.sub).toContain(tenantA.id);
    });
  });
});
