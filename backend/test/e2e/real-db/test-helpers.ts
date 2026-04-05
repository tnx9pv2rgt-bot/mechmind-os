/**
 * Real DB E2E Test Helpers
 *
 * Provides PrismaClient connected to the Testcontainer DB,
 * NestJS app factory, and seed utilities.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as fs from 'fs';
import * as path from 'path';
import * as request from 'supertest';

const STATE_FILE = path.join(__dirname, '.testcontainer-state.json');

// ── Database URL ───────────────────────────────────────────────

export function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  return state.databaseUrl;
}

// ── Raw Prisma Client (for direct DB assertions) ──────────────

let _prisma: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!_prisma) {
    _prisma = new PrismaClient({
      datasources: { db: { url: getDatabaseUrl() } },
    });
  }
  return _prisma;
}

export async function disconnectPrisma(): Promise<void> {
  if (_prisma) {
    await _prisma.$disconnect();
    _prisma = null;
  }
}

// ── App Factory ───────────────────────────────────────────────

export async function createRealDbApp(): Promise<INestApplication> {
  // Set DATABASE_URL for the app
  process.env.DATABASE_URL = getDatabaseUrl();
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'e2e-real-db-jwt-secret-minimum-32-chars!!';
  process.env.JWT_REFRESH_SECRET = 'e2e-real-db-refresh-secret-min-32-chars!!';
  process.env.JWT_2FA_SECRET = 'e2e-real-db-2fa-secret-min-32-chars-long!!';
  process.env.ENCRYPTION_KEY = 'e2e-real-db-encryption-key-32ch!';
  process.env.CORS_ORIGIN = 'http://localhost:3001';
  process.env.LOG_LEVEL = 'error';
  process.env.SETUP_SECRET = 'e2e-real-db-setup-secret';

  const { AppModule } = await import('../../../src/app.module');
  const { RedisService } = await import('../../../src/common/services/redis.service');
  const { QueueService } = await import('../../../src/common/services/queue.service');
  const { S3Service } = await import('../../../src/common/services/s3.service');

  // Only mock external services, NOT PrismaService — it uses real DB
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(RedisService)
    .useValue({
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      exists: jest.fn().mockResolvedValue(0),
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      getClient: jest.fn().mockReturnValue({
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        exists: jest.fn(),
      }),
    })
    .overrideProvider(QueueService)
    .useValue({
      addJob: jest.fn().mockResolvedValue({ id: 'mock-job' }),
      addBookingJob: jest.fn().mockResolvedValue({ id: 'mock-job' }),
      addNotificationJob: jest.fn().mockResolvedValue({ id: 'mock-job' }),
      addVoiceJob: jest.fn().mockResolvedValue({ id: 'mock-job' }),
    })
    .overrideProvider(S3Service)
    .useValue({
      upload: jest.fn().mockResolvedValue({ url: 'https://s3.mock/test.png', key: 'test.png' }),
      getPresignedUrl: jest.fn().mockResolvedValue('https://s3.mock/presigned'),
      delete: jest.fn().mockResolvedValue(undefined),
    })
    .compile();

  const app = moduleFixture.createNestApplication();

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

// ── JWT Helper ────────────────────────────────────────────────

export function generateJwt(payload: {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
}): string {
  const jwt = new JwtService({
    secret: process.env.JWT_SECRET || 'e2e-real-db-jwt-secret-minimum-32-chars!!',
    signOptions: { expiresIn: '1h' },
  });

  return jwt.sign(
    {
      sub: `${payload.userId}:${payload.tenantId}`,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId,
      jti: `e2e-real-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    },
    { secret: process.env.JWT_SECRET || 'e2e-real-db-jwt-secret-minimum-32-chars!!' },
  );
}

// ── Supertest Helpers ─────────────────────────────────────────

export function authGet(
  app: INestApplication,
  path: string,
  user: { userId: string; email: string; role: string; tenantId: string },
): request.Test {
  return request
    .default(app.getHttpServer())
    .get(path)
    .set('Authorization', `Bearer ${generateJwt(user)}`);
}

export function authPost(
  app: INestApplication,
  path: string,
  user: { userId: string; email: string; role: string; tenantId: string },
): request.Test {
  return request
    .default(app.getHttpServer())
    .post(path)
    .set('Authorization', `Bearer ${generateJwt(user)}`);
}

export function authPut(
  app: INestApplication,
  path: string,
  user: { userId: string; email: string; role: string; tenantId: string },
): request.Test {
  return request
    .default(app.getHttpServer())
    .put(path)
    .set('Authorization', `Bearer ${generateJwt(user)}`);
}

export function authPatch(
  app: INestApplication,
  path: string,
  user: { userId: string; email: string; role: string; tenantId: string },
): request.Test {
  return request
    .default(app.getHttpServer())
    .patch(path)
    .set('Authorization', `Bearer ${generateJwt(user)}`);
}

export function authDelete(
  app: INestApplication,
  path: string,
  user: { userId: string; email: string; role: string; tenantId: string },
): request.Test {
  return request
    .default(app.getHttpServer())
    .delete(path)
    .set('Authorization', `Bearer ${generateJwt(user)}`);
}

// ── Seed Helpers ──────────────────────────────────────────────

export async function seedTenant(
  prisma: PrismaClient,
  data: { id: string; name: string; slug: string },
): Promise<void> {
  await prisma.tenant.upsert({
    where: { id: data.id },
    update: {},
    create: {
      id: data.id,
      name: data.name,
      slug: data.slug,
      isActive: true,
    },
  });
}

export async function seedUser(
  prisma: PrismaClient,
  data: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
  },
): Promise<void> {
  await prisma.user.upsert({
    where: { id: data.id },
    update: {},
    create: {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role as 'ADMIN' | 'MANAGER' | 'MECHANIC' | 'RECEPTIONIST' | 'VIEWER',
      tenantId: data.tenantId,
      passwordHash: '$2b$10$fakehashedpassword1234567890123456789012345678',
      isActive: true,
      emailVerified: new Date(),
    },
  });
}

export async function seedCustomer(
  prisma: PrismaClient,
  data: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    tenantId: string;
  },
): Promise<void> {
  await prisma.customer.upsert({
    where: { id: data.id },
    update: {},
    create: {
      id: data.id,
      encryptedPhone: data.phone,
      encryptedEmail: data.email,
      encryptedFirstName: data.firstName,
      encryptedLastName: data.lastName,
      phoneHash: `hash_${data.phone}`,
      emailHash: `hash_${data.email}`,
      tenantId: data.tenantId,
      gdprConsent: true,
      gdprConsentAt: new Date(),
    },
  });
}

export async function seedVehicle(
  prisma: PrismaClient,
  data: {
    id: string;
    vin: string;
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    customerId: string;
    tenantId: string;
  },
): Promise<void> {
  await prisma.vehicle.upsert({
    where: { id: data.id },
    update: {},
    create: data,
  });
}

// ── Cleanup ───────────────────────────────────────────────────

export async function cleanupDatabase(prisma: PrismaClient): Promise<void> {
  // Delete in reverse FK order
  const tables = [
    'InvoiceItem',
    'Invoice',
    'WorkOrderItem',
    'WorkOrder',
    'BookingService',
    'BookingEvent',
    'Booking',
    'BookingSlot',
    'InspectionFinding',
    'InspectionPhoto',
    'InspectionItem',
    'Inspection',
    'EstimateLine',
    'Estimate',
    'Vehicle',
    'Customer',
    'AuditLog',
    'Session',
    'User',
    'Tenant',
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "${table}" WHERE 1=1`);
    } catch {
      // Table may not exist or may have other FK constraints — skip
    }
  }
}
