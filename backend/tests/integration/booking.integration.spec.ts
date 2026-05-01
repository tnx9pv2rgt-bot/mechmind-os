/**
 * Booking Integration Tests — Livello 2 (Google SMURF 2026)
 *
 * Real PostgreSQL DB. Mock only: Redis, Queue, S3.
 * Covers: advisory lock contention, tenant isolation (RLS), state machine, idempotency.
 *
 * Requires: DATABASE_URL pointing to a real Postgres instance.
 * Local: docker compose up -d postgres
 * CI: PostgreSQL 15 service (see .github/workflows/ci.yml)
 */
// @ts-nocheck

import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  createRealDbApp,
  getPrismaClient,
  disconnectPrisma,
  cleanupDatabase,
  seedTenant,
  seedUser,
  seedCustomer,
  seedVehicle,
  authPost,
  authGet,
  authPatch,
} from '../../test/e2e/real-db/test-helpers';

// ── Constants ───────────────────────────────────────────────────────────────

const TENANT_A = 'int-bk-tenant-a';
const TENANT_B = 'int-bk-tenant-b';

const ADMIN_A = {
  userId: 'int-bk-user-a',
  email: 'admin@int-a.test',
  role: 'ADMIN',
  tenantId: TENANT_A,
};
const ADMIN_B = {
  userId: 'int-bk-user-b',
  email: 'admin@int-b.test',
  role: 'ADMIN',
  tenantId: TENANT_B,
};
const CUSTOMER_ID = 'int-bk-customer-a';
const VEHICLE_ID = 'int-bk-vehicle-a';

// ── Suite ───────────────────────────────────────────────────────────────────

describe('Booking Integration (Real DB)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    app = await createRealDbApp();
    prisma = getPrismaClient();

    await seedTenant(prisma, { id: TENANT_A, name: 'Shop A', slug: `int-a-${Date.now()}` });
    await seedTenant(prisma, { id: TENANT_B, name: 'Shop B', slug: `int-b-${Date.now()}` });
    await seedUser(prisma, {
      id: ADMIN_A.userId,
      email: ADMIN_A.email,
      name: 'Admin A',
      role: 'ADMIN',
      tenantId: TENANT_A,
    });
    await seedUser(prisma, {
      id: ADMIN_B.userId,
      email: ADMIN_B.email,
      name: 'Admin B',
      role: 'ADMIN',
      tenantId: TENANT_B,
    });
    await seedCustomer(prisma, {
      id: CUSTOMER_ID,
      firstName: 'enc_Mario',
      lastName: 'enc_Rossi',
      email: 'enc_mario@int.test',
      phone: 'enc_3331234567',
      tenantId: TENANT_A,
    });
    await seedVehicle(prisma, {
      id: VEHICLE_ID,
      vin: 'WVWZZZ3CZWE654321',
      make: 'Fiat',
      model: 'Punto',
      year: 2020,
      licensePlate: 'XY456ZZ',
      customerId: CUSTOMER_ID,
      tenantId: TENANT_A,
    });
  }, 60_000);

  afterAll(async () => {
    await cleanupDatabase(prisma);
    await disconnectPrisma();
    await app.close();
  }, 30_000);

  // ── Helper: create an AVAILABLE slot in the future ────────────────────────
  async function createAvailableSlot(tenantId: string = TENANT_A): Promise<string> {
    const jitter = Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000;
    const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + jitter);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const slot = await prisma.bookingSlot.create({
      data: { tenantId, startTime: start, endTime: end, status: 'AVAILABLE' },
    });
    return slot.id;
  }

  // ── 1. Advisory Lock Contention ──────────────────────────────────────────

  describe('Advisory Lock Contention', () => {
    it('concurrent reserve on same slot: one 201, one 409, one DB row', async () => {
      const slotId = await createAvailableSlot();
      const dto = { slotId, customerId: CUSTOMER_ID };

      const [r1, r2] = await Promise.all([
        authPost(app, '/v1/bookings/reserve', ADMIN_A).send(dto),
        authPost(app, '/v1/bookings/reserve', ADMIN_A).send(dto),
      ]);

      const statuses = [r1.status, r2.status].sort();
      expect(statuses).toEqual([201, 409]);

      const rows = await prisma.booking.findMany({ where: { slotId } });
      expect(rows).toHaveLength(1);
    }, 30_000);

    it('slot status is BOOKED after successful reserve', async () => {
      const slotId = await createAvailableSlot();

      const res = await authPost(app, '/v1/bookings/reserve', ADMIN_A).send({
        slotId,
        customerId: CUSTOMER_ID,
      });
      expect(res.status).toBe(201);

      const slot = await prisma.bookingSlot.findUnique({ where: { id: slotId } });
      expect(slot?.status).toBe('BOOKED');
    });
  });

  // ── 2. Tenant Isolation (RLS) ────────────────────────────────────────────

  describe('Tenant Isolation (RLS)', () => {
    it('tenantB cannot read tenantA booking by ID', async () => {
      const slotId = await createAvailableSlot(TENANT_A);
      const scheduledDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();

      const createRes = await authPost(app, '/v1/bookings', ADMIN_A).send({
        customerId: CUSTOMER_ID,
        slotId,
        scheduledDate,
      });
      expect(createRes.status).toBe(201);
      const bookingId = createRes.body.data?.id ?? createRes.body.id;

      // tenantA can read it
      const resA = await authGet(app, `/v1/bookings/${bookingId}`, ADMIN_A);
      expect(resA.status).toBe(200);

      // tenantB gets 404 (RLS hides it)
      const resB = await authGet(app, `/v1/bookings/${bookingId}`, ADMIN_B);
      expect(resB.status).toBe(404);
    });

    it('findAll for tenantB returns only tenantB records', async () => {
      const res = await authGet(app, '/v1/bookings', ADMIN_B);
      expect(res.status).toBe(200);

      const list: Array<{ tenantId: string }> = res.body.data ?? res.body;
      if (Array.isArray(list) && list.length > 0) {
        list.forEach(b => expect(b.tenantId).toBe(TENANT_B));
      }
    });
  });

  // ── 3. State Machine Transitions (persisted in DB) ───────────────────────

  describe('State Machine Transitions', () => {
    it('PENDING → CONFIRMED → CHECKED_IN persisted in Postgres', async () => {
      const slotId = await createAvailableSlot();
      const scheduledDate = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString();

      const createRes = await authPost(app, '/v1/bookings', ADMIN_A).send({
        customerId: CUSTOMER_ID,
        slotId,
        scheduledDate,
      });
      expect(createRes.status).toBe(201);
      const bookingId = createRes.body.data?.id ?? createRes.body.id;

      // PENDING → CONFIRMED
      const confirmRes = await authPatch(app, `/v1/bookings/${bookingId}`, ADMIN_A).send({
        status: 'CONFIRMED',
      });
      expect(confirmRes.status).toBe(200);

      const afterConfirm = await prisma.booking.findUnique({ where: { id: bookingId } });
      expect(afterConfirm?.status).toBe('CONFIRMED');

      // CONFIRMED → CHECKED_IN
      const checkinRes = await authPatch(app, `/v1/bookings/${bookingId}`, ADMIN_A).send({
        status: 'CHECKED_IN',
      });
      expect(checkinRes.status).toBe(200);

      const afterCheckin = await prisma.booking.findUnique({ where: { id: bookingId } });
      expect(afterCheckin?.status).toBe('CHECKED_IN');
    });

    it('invalid transition PENDING → COMPLETED returns 400', async () => {
      const slotId = await createAvailableSlot();
      const scheduledDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

      const createRes = await authPost(app, '/v1/bookings', ADMIN_A).send({
        customerId: CUSTOMER_ID,
        slotId,
        scheduledDate,
      });
      expect(createRes.status).toBe(201);
      const bookingId = createRes.body.data?.id ?? createRes.body.id;

      const res = await authPatch(app, `/v1/bookings/${bookingId}`, ADMIN_A).send({
        status: 'COMPLETED',
      });
      expect(res.status).toBe(400);
    });

    it('PENDING → CANCELLED frees the slot back to AVAILABLE', async () => {
      const slotId = await createAvailableSlot();
      const scheduledDate = new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString();

      const createRes = await authPost(app, '/v1/bookings', ADMIN_A).send({
        customerId: CUSTOMER_ID,
        slotId,
        scheduledDate,
      });
      expect(createRes.status).toBe(201);
      const bookingId = createRes.body.data?.id ?? createRes.body.id;

      const cancelRes = await authPatch(app, `/v1/bookings/${bookingId}`, ADMIN_A).send({
        status: 'CANCELLED',
      });
      expect(cancelRes.status).toBe(200);

      const slot = await prisma.bookingSlot.findUnique({ where: { id: slotId } });
      expect(slot?.status).toBe('AVAILABLE');
    });
  });

  // ── 4. Idempotency Key ───────────────────────────────────────────────────

  describe('Idempotency Key', () => {
    it('two requests with same key return same booking ID, no duplicate in DB', async () => {
      const slotId1 = await createAvailableSlot();
      const slotId2 = await createAvailableSlot();
      const idempotencyKey = `int-idem-${Date.now()}`;
      const scheduledDate = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString();

      const res1 = await authPost(app, '/v1/bookings', ADMIN_A).send({
        customerId: CUSTOMER_ID,
        slotId: slotId1,
        scheduledDate,
        idempotencyKey,
      });
      expect(res1.status).toBe(201);
      const id1 = res1.body.data?.id ?? res1.body.id;

      const res2 = await authPost(app, '/v1/bookings', ADMIN_A).send({
        customerId: CUSTOMER_ID,
        slotId: slotId2,
        scheduledDate,
        idempotencyKey,
      });
      expect([200, 201]).toContain(res2.status);
      const id2 = res2.body.data?.id ?? res2.body.id;
      expect(id2).toBe(id1);

      const rows = await prisma.booking.findMany({ where: { idempotencyKey } });
      expect(rows).toHaveLength(1);
    });
  });
});
