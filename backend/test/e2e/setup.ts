/**
 * E2E Test Setup for MechMind OS
 *
 * Configures environment variables, creates NestJS TestingModule helpers,
 * and provides authentication utilities for all E2E tests.
 */
// @ts-nocheck

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';

// ── Environment ────────────────────────────────────────────────
jest.setTimeout(30000);

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'e2e-test-jwt-secret-minimum-32-chars-long!!';
process.env.JWT_REFRESH_SECRET = 'e2e-test-refresh-secret-minimum-32-chars!!';
process.env.JWT_2FA_SECRET = 'e2e-test-2fa-secret-minimum-32-chars-long!!';
process.env.ENCRYPTION_KEY = 'e2e-test-encryption-key-32chars!';
process.env.CORS_ORIGIN = 'http://localhost:3001';
process.env.LOG_LEVEL = 'error';
process.env.SETUP_SECRET = 'e2e-test-setup-secret';

// ── Test Constants ─────────────────────────────────────────────

export const TENANT_A = {
  id: 'e2e-tenant-a-001',
  name: 'E2E Auto Shop A',
  slug: 'e2e-shop-a',
};

export const TENANT_B = {
  id: 'e2e-tenant-b-002',
  name: 'E2E Auto Shop B',
  slug: 'e2e-shop-b',
};

export const ADMIN_USER = {
  userId: 'e2e-user-admin-001',
  email: 'admin@e2eshop.test',
  role: 'ADMIN',
  tenantId: TENANT_A.id,
};

export const MECHANIC_USER = {
  userId: 'e2e-user-mechanic-001',
  email: 'mechanic@e2eshop.test',
  role: 'MECHANIC',
  tenantId: TENANT_A.id,
};

export const TENANT_B_ADMIN = {
  userId: 'e2e-user-admin-b-001',
  email: 'admin@e2eshopb.test',
  role: 'ADMIN',
  tenantId: TENANT_B.id,
};

export const TEST_CUSTOMER_ID = 'e2e-customer-001';
export const TEST_VEHICLE_ID = 'e2e-vehicle-001';

// ── Mock Services ──────────────────────────────────────────────

/**
 * Creates a mock PrismaService with commonly-needed model stubs.
 * Each test can override specific methods as needed.
 */
function createMockModel(): Record<string, jest.Mock> {
  return {
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest
      .fn()
      .mockImplementation(({ data }) => Promise.resolve({ id: `mock-${Date.now()}`, ...data })),
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
    update: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    upsert: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    count: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockResolvedValue({}),
    groupBy: jest.fn().mockResolvedValue([]),
  };
}

export function createMockPrisma(): Record<string, unknown> {
  const models = [
    'user',
    'tenant',
    'customer',
    'vehicle',
    'booking',
    'bookingSlot',
    'service',
    'backupCode',
    'authAuditLog',
    'part',
    'workOrder',
    'workOrderItem',
    'obdDevice',
    'obdReading',
    'inspection',
    'inspectionItem',
    'inspectionFinding',
    'inspectionTemplate',
    'notification',
    'gdprRequest',
    'consent',
    'session',
    'invoice',
    'invoiceItem',
    'estimate',
    'estimateLine',
    'review',
    'campaign',
    'location',
    'wasteEntry',
    'fir',
    'securityIncident',
    'aiComplianceRecord',
    'auditLog',
    'role',
    'permission',
    'webhookConfig',
    'membership',
    'payroll',
    'declinedService',
    'paymentLink',
    'publicToken',
    'maintenanceSchedule',
    'vehicleHistory',
  ];

  const prisma: Record<string, unknown> = {};
  for (const model of models) {
    // eslint-disable-next-line security/detect-object-injection
    prisma[model] = createMockModel();
  }

  prisma.$transaction = jest.fn((cb: (tx: Record<string, unknown>) => Promise<unknown>) => {
    if (typeof cb === 'function') return cb(prisma);
    return Promise.resolve(cb);
  });
  prisma.$executeRaw = jest.fn().mockResolvedValue(0);
  prisma.$executeRawUnsafe = jest.fn().mockResolvedValue(0);
  prisma.$queryRaw = jest.fn().mockResolvedValue([]);
  prisma.$connect = jest.fn();
  prisma.$disconnect = jest.fn();
  prisma.setTenantContext = jest.fn();
  prisma.clearTenantContext = jest.fn();
  prisma.getCurrentTenantContext = jest.fn().mockReturnValue(null);
  prisma.withTenant = jest.fn((_: string, cb: (tx: Record<string, unknown>) => Promise<unknown>) =>
    cb(prisma),
  );
  prisma.withSerializableTransaction = jest.fn(
    (cb: (tx: Record<string, unknown>) => Promise<unknown>) => cb(prisma),
  );
  prisma.acquireAdvisoryLock = jest.fn().mockResolvedValue(true);
  prisma.releaseAdvisoryLock = jest.fn().mockResolvedValue(undefined);

  return prisma;
}

/**
 * Creates a mock EncryptionService that returns the input prefixed with "enc_".
 */
export function createMockEncryption(): Record<string, jest.Mock> {
  return {
    encrypt: jest.fn((value: string) => `enc_${value}`),
    decrypt: jest.fn((value: string) => value.replace(/^enc_/, '')),
    hashForLookup: jest.fn((value: string) => `hash_${value}`),
    hashDeterministic: jest.fn((value: string) => `dhash_${value}`),
  };
}

/**
 * Creates a mock RedisService that stubs basic Redis operations.
 */
export function createMockRedis(): Record<string, jest.Mock> {
  const store = new Map<string, string>();
  return {
    get: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    set: jest.fn((key: string, val: string) => {
      store.set(key, val);
      return Promise.resolve('OK');
    }),
    del: jest.fn((key: string) => {
      store.delete(key);
      return Promise.resolve(1);
    }),
    exists: jest.fn((key: string) => Promise.resolve(store.has(key) ? 1 : 0)),
    incr: jest.fn(() => Promise.resolve(1)),
    expire: jest.fn(() => Promise.resolve(1)),
    getClient: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
    })),
  };
}

/**
 * Creates a mock QueueService that noops for async jobs.
 */
export function createMockQueue(): Record<string, jest.Mock> {
  return {
    addJob: jest.fn().mockResolvedValue({ id: 'mock-job-1' }),
    addBookingJob: jest.fn().mockResolvedValue({ id: 'mock-job-1' }),
    addNotificationJob: jest.fn().mockResolvedValue({ id: 'mock-job-1' }),
    addVoiceJob: jest.fn().mockResolvedValue({ id: 'mock-job-1' }),
  };
}

/**
 * Creates a mock S3Service.
 */
export function createMockS3(): Record<string, jest.Mock> {
  return {
    upload: jest.fn().mockResolvedValue({ url: 'https://s3.mock/test.png', key: 'test.png' }),
    getPresignedUrl: jest.fn().mockResolvedValue('https://s3.mock/presigned'),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 * Creates a mock LoggerService.
 */
export function createMockLogger(): Record<string, jest.Mock> {
  return {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    setContext: jest.fn(),
  };
}

// ── JWT Helper ─────────────────────────────────────────────────

/**
 * Generates a JWT token for E2E testing.
 * Uses the same secret as the test environment.
 */
export function generateTestJwt(
  user: { userId: string; email: string; role: string; tenantId: string },
  options?: { expiresIn?: string },
): string {
  const jwt = new JwtService({
    secret: process.env.JWT_SECRET,
    signOptions: { expiresIn: options?.expiresIn ?? '1h' },
  });

  return jwt.sign(
    {
      sub: `${user.userId}:${user.tenantId}`,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      jti: `e2e-jti-${Date.now()}`,
    },
    { secret: process.env.JWT_SECRET },
  );
}

/**
 * Creates an INestApplication for E2E tests with the full AppModule,
 * but with external services mocked.
 *
 * Note: This attempts to load the real AppModule. If database is unavailable,
 * individual test files should create targeted modules with mock providers instead.
 */
export async function createE2eApp(moduleOverrides?: {
  overrideProviders?: Array<{ provide: unknown; useValue: unknown }>;
}): Promise<INestApplication> {
  // Import AppModule dynamically to avoid circular issues
  const { AppModule } = await import('../../src/app.module');
  const { PrismaService } = await import('../../src/common/services/prisma.service');
  const { EncryptionService } = await import('../../src/common/services/encryption.service');
  const { RedisService } = await import('../../src/common/services/redis.service');
  const { QueueService } = await import('../../src/common/services/queue.service');
  const { S3Service } = await import('../../src/common/services/s3.service');
  const { LoggerService } = await import('../../src/common/services/logger.service');

  let builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(createMockPrisma())
    .overrideProvider(EncryptionService)
    .useValue(createMockEncryption())
    .overrideProvider(RedisService)
    .useValue(createMockRedis())
    .overrideProvider(QueueService)
    .useValue(createMockQueue())
    .overrideProvider(S3Service)
    .useValue(createMockS3())
    .overrideProvider(LoggerService)
    .useValue(createMockLogger());

  if (moduleOverrides?.overrideProviders) {
    for (const override of moduleOverrides.overrideProviders) {
      builder = builder.overrideProvider(override.provide).useValue(override.useValue);
    }
  }

  const moduleFixture: TestingModule = await builder.compile();
  const app = moduleFixture.createNestApplication();

  // Mirror main.ts configuration
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.init();
  return app;
}

// ── Supertest Helpers ──────────────────────────────────────────

/**
 * Creates an authenticated supertest agent with a JWT Bearer token.
 */
export function authRequest(
  app: INestApplication,
  user: { userId: string; email: string; role: string; tenantId: string },
): request.Agent {
  const token = generateTestJwt(user);
  const agent = request.agent(app.getHttpServer());
  // Attach the auth header to all requests
  (agent as unknown as { _defaults: { set: Record<string, string> } })._defaults = {
    set: { Authorization: `Bearer ${token}` },
  };
  return agent;
}

/**
 * Makes an authenticated GET request.
 */
export function authGet(
  app: INestApplication,
  path: string,
  user: { userId: string; email: string; role: string; tenantId: string },
): request.Test {
  const token = generateTestJwt(user);
  return request.default(app.getHttpServer()).get(path).set('Authorization', `Bearer ${token}`);
}

/**
 * Makes an authenticated POST request.
 */
export function authPost(
  app: INestApplication,
  path: string,
  user: { userId: string; email: string; role: string; tenantId: string },
): request.Test {
  const token = generateTestJwt(user);
  return request.default(app.getHttpServer()).post(path).set('Authorization', `Bearer ${token}`);
}

/**
 * Makes an authenticated PATCH request.
 */
export function authPatch(
  app: INestApplication,
  path: string,
  user: { userId: string; email: string; role: string; tenantId: string },
): request.Test {
  const token = generateTestJwt(user);
  return request.default(app.getHttpServer()).patch(path).set('Authorization', `Bearer ${token}`);
}

/**
 * Makes an authenticated DELETE request.
 */
export function authDelete(
  app: INestApplication,
  path: string,
  user: { userId: string; email: string; role: string; tenantId: string },
): request.Test {
  const token = generateTestJwt(user);
  return request.default(app.getHttpServer()).delete(path).set('Authorization', `Bearer ${token}`);
}

/**
 * Makes an unauthenticated request (no Authorization header).
 */
export function unauthRequest(app: INestApplication): request.Agent {
  return request.agent(app.getHttpServer());
}
