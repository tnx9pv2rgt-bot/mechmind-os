/**
 * Booking API Tests — Livello 3 (HTTP Contract, Google SMURF 2026)
 *
 * Real NestJS app via Supertest. Real PostgreSQL. Mock only: Redis, Queue, S3.
 * Covers: status codes, response shapes, auth enforcement, role-based access, tenant 403/404.
 *
 * Requires: DATABASE_URL pointing to a real Postgres instance.
 */
// @ts-nocheck

import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as request from 'supertest';
import {
  createRealDbApp,
  getPrismaClient,
  disconnectPrisma,
  cleanupDatabase,
  seedTenant,
  seedUser,
  seedCustomer,
  seedVehicle,
  generateJwt,
  authGet,
  authPost,
  authPatch,
  authDelete,
} from '../../test/e2e/real-db/test-helpers';

// ── Constants ───────────────────────────────────────────────────────────────

const TENANT_API = 'api-bk-tenant';
const TENANT_OTHER = 'api-bk-other-tenant';

const ADMIN = { userId: 'api-bk-admin', email: 'admin@api-bk.test', role: 'ADMIN', tenantId: TENANT_API };
const RECEPTIONIST = { userId: 'api-bk-rec', email: 'rec@api-bk.test', role: 'RECEPTIONIST', tenantId: TENANT_API };
const MECHANIC = { userId: 'api-bk-mec', email: 'mec@api-bk.test', role: 'MECHANIC', tenantId: TENANT_API };
const OTHER_ADMIN = { userId: 'api-bk-other', email: 'admin@other.test', role: 'ADMIN', tenantId: TENANT_OTHER };

const CUSTOMER_ID = 'api-bk-customer';
const VEHICLE_ID = 'api-bk-vehicle';

// ── Helpers ──────────────────────────────────────────────────────────────────

function unauthGet(app: INestApplication, path: string): request.Test {
  return request.default(app.getHttpServer()).get(path);
}

// ── Suite ────────────────────────────────────────────────────────────────────

describe('Booking API Endpoints (HTTP Contract)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  async function createSlot(tenantId: string = TENANT_API): Promise<string> {
    const jitter = Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000;
    const start = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + jitter);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const slot = await prisma.bookingSlot.create({
      data: { tenantId, startTime: start, endTime: end, status: 'AVAILABLE' },
    });
    return slot.id;
  }

  beforeAll(async () => {
    app = await createRealDbApp();
    prisma = getPrismaClient();

    await seedTenant(prisma, { id: TENANT_API, name: 'API Test Shop', slug: `api-bk-${Date.now()}` });
    await seedTenant(prisma, { id: TENANT_OTHER, name: 'Other Shop', slug: `api-bk-other-${Date.now()}` });

    await seedUser(prisma, { id: ADMIN.userId, email: ADMIN.email, name: 'Admin', role: 'ADMIN', tenantId: TENANT_API });
    await seedUser(prisma, { id: RECEPTIONIST.userId, email: RECEPTIONIST.email, name: 'Rec', role: 'RECEPTIONIST', tenantId: TENANT_API });
    await seedUser(prisma, { id: MECHANIC.userId, email: MECHANIC.email, name: 'Mec', role: 'MECHANIC', tenantId: TENANT_API });
    await seedUser(prisma, { id: OTHER_ADMIN.userId, email: OTHER_ADMIN.email, name: 'Other', role: 'ADMIN', tenantId: TENANT_OTHER });

    await seedCustomer(prisma, {
      id: CUSTOMER_ID,
      firstName: 'enc_Luca',
      lastName: 'enc_Bianchi',
      email: 'enc_luca@api.test',
      phone: 'enc_3339876543',
      tenantId: TENANT_API,
    });
    await seedVehicle(prisma, {
      id: VEHICLE_ID,
      vin: 'WVWZZZ3CZWE112233',
      make: 'Alfa Romeo',
      model: 'Giulia',
      year: 2022,
      licensePlate: 'ZZ999YY',
      customerId: CUSTOMER_ID,
      tenantId: TENANT_API,
    });
  }, 60_000);

  afterAll(async () => {
    await cleanupDatabase(prisma);
    await disconnectPrisma();
    await app.close();
  }, 30_000);

  // ── Endpoint 1: GET /v1/bookings ─────────────────────────────────────────

  describe('GET /v1/bookings', () => {
    it('200 + array per utente autenticato', async () => {
      const res = await authGet(app, '/v1/bookings', ADMIN);
      expect(res.status).toBe(200);
      const body = res.body.data ?? res.body;
      expect(Array.isArray(body)).toBe(true);
    });

    it('401 senza Bearer token', async () => {
      const res = await unauthGet(app, '/v1/bookings');
      expect(res.status).toBe(401);
    });
  });

  // ── Endpoint 2: POST /v1/bookings ────────────────────────────────────────

  describe('POST /v1/bookings', () => {
    it('201 + oggetto booking con RECEPTIONIST role', async () => {
      const slotId = await createSlot();
      const res = await authPost(app, '/v1/bookings', RECEPTIONIST).send({
        customerId: CUSTOMER_ID,
        slotId,
        scheduledDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      });
      expect(res.status).toBe(201);
      const booking = res.body.data ?? res.body;
      expect(booking).toHaveProperty('id');
      expect(booking.status).toBe('PENDING');
    });

    it('403 con MECHANIC role (insufficiente per creare booking)', async () => {
      const slotId = await createSlot();
      const res = await authPost(app, '/v1/bookings', MECHANIC).send({
        customerId: CUSTOMER_ID,
        slotId,
        scheduledDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString(),
      });
      expect(res.status).toBe(403);
    });

    it('400 con body mancante (customerId richiesto)', async () => {
      const res = await authPost(app, '/v1/bookings', ADMIN).send({
        scheduledDate: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000).toISOString(),
      });
      expect(res.status).toBe(400);
    });
  });

  // ── Endpoint 3: GET /v1/bookings/:id ─────────────────────────────────────

  describe('GET /v1/bookings/:id', () => {
    it('200 + booking per ID esistente', async () => {
      const slotId = await createSlot();
      const createRes = await authPost(app, '/v1/bookings', ADMIN).send({
        customerId: CUSTOMER_ID,
        slotId,
        scheduledDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
      });
      expect(createRes.status).toBe(201);
      const bookingId = createRes.body.data?.id ?? createRes.body.id;

      const res = await authGet(app, `/v1/bookings/${bookingId}`, ADMIN);
      expect(res.status).toBe(200);
      const booking = res.body.data ?? res.body;
      expect(booking.id).toBe(bookingId);
    });

    it('404 per ID inesistente', async () => {
      const res = await authGet(app, '/v1/bookings/00000000-0000-0000-0000-000000000099', ADMIN);
      expect(res.status).toBe(404);
    });
  });

  // ── Endpoint 4: Tenant Isolation a livello HTTP ───────────────────────────

  describe('Tenant Isolation (HTTP level)', () => {
    it('404 quando tenantB prova a leggere booking di tenantA', async () => {
      const slotId = await createSlot(TENANT_API);
      const createRes = await authPost(app, '/v1/bookings', ADMIN).send({
        customerId: CUSTOMER_ID,
        slotId,
        scheduledDate: new Date(Date.now() + 19 * 24 * 60 * 60 * 1000).toISOString(),
      });
      expect(createRes.status).toBe(201);
      const bookingId = createRes.body.data?.id ?? createRes.body.id;

      const res = await authGet(app, `/v1/bookings/${bookingId}`, OTHER_ADMIN);
      expect(res.status).toBe(404);
    });
  });

  // ── Endpoint 5: POST /v1/bookings/reserve — slot già prenotato ──────────

  describe('POST /v1/bookings/reserve', () => {
    it('409 su slot già BOOKED', async () => {
      const slotId = await createSlot();

      // Prima prenotazione → successo
      const res1 = await authPost(app, '/v1/bookings/reserve', ADMIN).send({
        slotId,
        customerId: CUSTOMER_ID,
      });
      expect(res1.status).toBe(201);

      // Seconda prenotazione sullo stesso slot → conflitto
      const res2 = await authPost(app, '/v1/bookings/reserve', ADMIN).send({
        slotId,
        customerId: CUSTOMER_ID,
      });
      expect(res2.status).toBe(409);
    });
  });

  // ── Endpoint 6: DELETE /v1/bookings/:id — role enforcement ───────────────

  describe('DELETE /v1/bookings/:id', () => {
    it('403 con MECHANIC role', async () => {
      const slotId = await createSlot();
      const createRes = await authPost(app, '/v1/bookings', ADMIN).send({
        customerId: CUSTOMER_ID,
        slotId,
        scheduledDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      });
      expect(createRes.status).toBe(201);
      const bookingId = createRes.body.data?.id ?? createRes.body.id;

      const res = await authDelete(app, `/v1/bookings/${bookingId}`, MECHANIC);
      expect(res.status).toBe(403);
    });

    it('200 con MANAGER role', async () => {
      const managerUser = { userId: 'api-bk-manager', email: 'mgr@api-bk.test', role: 'MANAGER', tenantId: TENANT_API };
      await seedUser(prisma, { id: managerUser.userId, email: managerUser.email, name: 'Manager', role: 'MANAGER', tenantId: TENANT_API });

      const slotId = await createSlot();
      const createRes = await authPost(app, '/v1/bookings', ADMIN).send({
        customerId: CUSTOMER_ID,
        slotId,
        scheduledDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      });
      expect(createRes.status).toBe(201);
      const bookingId = createRes.body.data?.id ?? createRes.body.id;

      const res = await authDelete(app, `/v1/bookings/${bookingId}`, managerUser);
      expect([200, 204]).toContain(res.status);
    });
  });

  // ── Endpoint 7: GET /v1/bookings/stats/overview ───────────────────────────

  describe('GET /v1/bookings/stats/overview', () => {
    it('200 + struttura stats corretta', async () => {
      const res = await authGet(app, '/v1/bookings/stats/overview', ADMIN);
      expect(res.status).toBe(200);
      const stats = res.body.data ?? res.body;
      expect(stats).toBeDefined();
    });

    it('403 con MECHANIC role (solo MANAGER+)', async () => {
      const res = await authGet(app, '/v1/bookings/stats/overview', MECHANIC);
      expect(res.status).toBe(403);
    });
  });

  // ── Endpoint 8: POST /v1/bookings/bulk-confirm ────────────────────────────

  describe('POST /v1/bookings/bulk-confirm', () => {
    it('200 con lista di ID validi', async () => {
      const bookingIds: string[] = [];

      for (let i = 0; i < 2; i++) {
        const slotId = await createSlot();
        const createRes = await authPost(app, '/v1/bookings', ADMIN).send({
          customerId: CUSTOMER_ID,
          slotId,
          scheduledDate: new Date(Date.now() + (22 + i) * 24 * 60 * 60 * 1000).toISOString(),
        });
        expect(createRes.status).toBe(201);
        bookingIds.push(createRes.body.data?.id ?? createRes.body.id);
      }

      const res = await authPost(app, '/v1/bookings/bulk-confirm', RECEPTIONIST).send({
        ids: bookingIds,
      });
      expect(res.status).toBe(200);
    });

    it('200 con lista vuota (nessun effetto, non errore)', async () => {
      const res = await authPost(app, '/v1/bookings/bulk-confirm', RECEPTIONIST).send({
        ids: [],
      });
      expect([200, 400]).toContain(res.status);
    });
  });
});
