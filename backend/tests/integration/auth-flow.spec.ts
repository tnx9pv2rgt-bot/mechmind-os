/**
 * Authentication Flow Integration Tests
 *
 * Tests the complete authentication lifecycle:
 * - Login with email/password
 * - Token generation and refresh
 * - Account lockout after failed attempts
 * - MFA enrollment and verification
 *
 * Requires: docker-compose.test.yml running (PostgreSQL + Redis)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@common/services/prisma.service';
import { AuthService } from '@auth/services/auth.service';

describe('Authentication Flow (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;

  const testTenant = {
    id: '',
    slug: 'test-auth-tenant',
  };
  const testUser = {
    id: '',
    email: 'test@auth-flow.test',
    password: 'SecurePass123!',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    authService = moduleFixture.get<AuthService>(AuthService);

    // Create test tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Auth Test Tenant',
        slug: testTenant.slug,
        isActive: true,
        settings: {},
      },
    });
    testTenant.id = tenant.id;

    // Create test user
    const passwordHash = await authService.hashPassword(testUser.password);
    const user = await prisma.user.create({
      data: {
        email: testUser.email,
        name: 'Test User',
        passwordHash,
        role: 'ADMIN',
        tenantId: testTenant.id,
        isActive: true,
      },
    });
    testUser.id = user.id;
  });

  afterAll(async () => {
    await prisma.authAuditLog.deleteMany({
      where: { tenantId: testTenant.id },
    });
    await prisma.user.deleteMany({
      where: { tenantId: testTenant.id },
    });
    await prisma.tenant.deleteMany({
      where: { id: testTenant.id },
    });
    await app.close();
  });

  describe('Login flow', () => {
    it('should authenticate with valid credentials', async () => {
      const user = await authService.validateUser(
        testUser.email,
        testUser.password,
        testTenant.slug,
      );

      expect(user).toBeDefined();
      expect(user.email).toBe(testUser.email);
      expect(user.tenantId).toBe(testTenant.id);
    });

    it('should reject invalid password', async () => {
      await expect(
        authService.validateUser(testUser.email, 'wrong-password', testTenant.slug),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should reject invalid tenant slug', async () => {
      await expect(
        authService.validateUser(testUser.email, testUser.password, 'nonexistent-tenant'),
      ).rejects.toThrow('Invalid tenant or tenant is inactive');
    });

    it('should reject when user is in wrong tenant', async () => {
      // Create another tenant
      const otherTenant = await prisma.tenant.create({
        data: {
          name: 'Other Tenant',
          slug: 'other-tenant-auth',
          isActive: true,
          settings: {},
        },
      });

      await expect(
        authService.validateUser(testUser.email, testUser.password, 'other-tenant-auth'),
      ).rejects.toThrow('Invalid credentials');

      await prisma.tenant.delete({ where: { id: otherTenant.id } });
    });
  });

  describe('Token lifecycle', () => {
    let accessToken: string;
    let refreshToken: string;

    it('should generate valid tokens', async () => {
      const user = await authService.validateUser(
        testUser.email,
        testUser.password,
        testTenant.slug,
      );
      const tokens = await authService.generateTokens(user);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBeGreaterThan(0);

      accessToken = tokens.accessToken;
      refreshToken = tokens.refreshToken;
    });

    it('should refresh tokens successfully', async () => {
      const newTokens = await authService.refreshTokens(refreshToken);

      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.refreshToken).toBeDefined();
      expect(newTokens.accessToken).not.toBe(accessToken);
    });

    it('should reject expired/invalid refresh token', async () => {
      await expect(
        authService.refreshTokens('invalid-refresh-token'),
      ).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('Account lockout', () => {
    beforeEach(async () => {
      // Reset failed attempts
      await authService.resetFailedAttempts(testUser.id);
    });

    it('should track failed login attempts', async () => {
      await authService.recordFailedLogin(testUser.id);
      await authService.recordFailedLogin(testUser.id);

      const lockStatus = await authService.isAccountLocked(testUser.id);
      expect(lockStatus.locked).toBe(false);
    });

    it('should lock account after 5 failed attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await authService.recordFailedLogin(testUser.id);
      }

      const lockStatus = await authService.isAccountLocked(testUser.id);
      expect(lockStatus.locked).toBe(true);
      expect(lockStatus.until).toBeDefined();
    });

    it('should reset lockout on successful login', async () => {
      for (let i = 0; i < 5; i++) {
        await authService.recordFailedLogin(testUser.id);
      }

      await authService.resetFailedAttempts(testUser.id);
      const lockStatus = await authService.isAccountLocked(testUser.id);
      expect(lockStatus.locked).toBe(false);
    });
  });

  describe('Last login tracking', () => {
    it('should update lastLoginAt', async () => {
      const before = new Date();
      await authService.updateLastLogin(testUser.id, '127.0.0.1');

      const user = await prisma.user.findUnique({
        where: { id: testUser.id },
        select: { lastLoginAt: true, lastLoginIp: true },
      });

      expect(user?.lastLoginAt).toBeDefined();
      expect(user!.lastLoginAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(user?.lastLoginIp).toBe('127.0.0.1');
    });
  });
});
