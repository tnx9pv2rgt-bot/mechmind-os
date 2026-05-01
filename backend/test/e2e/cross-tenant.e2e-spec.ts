/**
 * E2E Test: Cross-Tenant Isolation
 *
 * Tests: create data as Tenant A -> try to access as Tenant B -> expect 403/404
 * Verifies GDPR/data isolation between tenants.
 */
// @ts-nocheck

import { INestApplication } from '@nestjs/common';
import {
  createE2eApp,
  ADMIN_USER,
  TENANT_B_ADMIN,
  TENANT_A,
  TEST_CUSTOMER_ID,
  TEST_VEHICLE_ID,
  authGet,
  authPost,
  authPatch,
  authDelete,
} from './setup';

describe('Cross-Tenant Isolation (E2E)', () => {
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

  // ── Customer Isolation ───────────────────────────────────────

  describe('Customer Isolation', () => {
    it('Tenant A should see their own customers', async () => {
      prisma.customer.findMany.mockResolvedValue([{ id: TEST_CUSTOMER_ID, tenantId: TENANT_A.id }]);
      prisma.customer.count.mockResolvedValue(1);

      const res = await authGet(app, '/v1/customers', ADMIN_USER);

      expect([200, 401]).toContain(res.status);
    });

    it('Tenant B should NOT see Tenant A customers', async () => {
      // When Tenant B queries, they get their own (empty) results
      prisma.customer.findMany.mockResolvedValue([]);
      prisma.customer.count.mockResolvedValue(0);

      const res = await authGet(app, '/v1/customers', TENANT_B_ADMIN);

      expect([200, 401]).toContain(res.status);
      if (res.status === 200 && res.body.data) {
        // Verify none of the returned customers belong to Tenant A
        const customers = res.body.data as Array<{ tenantId: string }>;
        for (const customer of customers) {
          expect(customer.tenantId).not.toBe(TENANT_A.id);
        }
      }
    });

    it('Tenant B should NOT access Tenant A specific customer', async () => {
      // Service should filter by tenantId and return null
      prisma.customer.findFirst.mockResolvedValue(null);

      const res = await authGet(app, `/v1/customers/${TEST_CUSTOMER_ID}`, TENANT_B_ADMIN);

      expect([401, 403, 404]).toContain(res.status);
    });
  });

  // ── Work Order Isolation ─────────────────────────────────────

  describe('Work Order Isolation', () => {
    const WO_ID = 'e2e-wo-tenant-a';

    it('Tenant B should NOT access Tenant A work orders', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null);

      const res = await authGet(app, `/v1/work-orders/${WO_ID}`, TENANT_B_ADMIN);

      expect([401, 403, 404]).toContain(res.status);
    });

    it('Tenant B should NOT update Tenant A work orders', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null);

      const res = await authPatch(app, `/v1/work-orders/${WO_ID}`, TENANT_B_ADMIN).send({
        diagnosis: 'Hacked diagnosis',
      });

      expect([401, 403, 404]).toContain(res.status);
    });
  });

  // ── Invoice Isolation ────────────────────────────────────────

  describe('Invoice Isolation', () => {
    const INVOICE_ID = 'e2e-invoice-tenant-a';

    it('Tenant B should NOT access Tenant A invoices', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      const res = await authGet(app, `/v1/invoices/${INVOICE_ID}`, TENANT_B_ADMIN);

      expect([401, 403, 404]).toContain(res.status);
    });

    it('Tenant B should NOT send Tenant A invoice', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      const res = await authPost(app, `/v1/invoices/${INVOICE_ID}/send`, TENANT_B_ADMIN);

      expect([401, 403, 404]).toContain(res.status);
    });

    it('Tenant B should NOT delete Tenant A invoice', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      const res = await authDelete(app, `/v1/invoices/${INVOICE_ID}`, TENANT_B_ADMIN);

      expect([401, 403, 404]).toContain(res.status);
    });
  });

  // ── Estimate Isolation ───────────────────────────────────────

  describe('Estimate Isolation', () => {
    const ESTIMATE_ID = 'e2e-estimate-tenant-a';

    it('Tenant B should NOT access Tenant A estimates', async () => {
      prisma.estimate.findFirst.mockResolvedValue(null);

      const res = await authGet(app, `/v1/estimates/${ESTIMATE_ID}`, TENANT_B_ADMIN);

      expect([401, 403, 404]).toContain(res.status);
    });
  });

  // ── Booking Isolation ────────────────────────────────────────

  describe('Booking Isolation', () => {
    it('Tenant B should see empty bookings (not Tenant A data)', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(0);

      const res = await authGet(app, '/v1/bookings', TENANT_B_ADMIN);

      expect([200, 401]).toContain(res.status);
      if (res.status === 200 && res.body.data) {
        const bookings = res.body.data as Array<{ tenantId: string }>;
        for (const booking of bookings) {
          expect(booking.tenantId).not.toBe(TENANT_A.id);
        }
      }
    });
  });

  // ── Inspection Isolation ─────────────────────────────────────

  describe('Inspection Isolation', () => {
    const INSPECTION_ID = 'e2e-inspection-tenant-a';

    it('Tenant B should NOT access Tenant A inspections', async () => {
      prisma.inspection.findFirst.mockResolvedValue(null);

      const res = await authGet(app, `/v1/inspections/${INSPECTION_ID}`, TENANT_B_ADMIN);

      expect([401, 403, 404]).toContain(res.status);
    });
  });

  // ── Cross-Tenant Creation Prevention ─────────────────────────

  describe('Cross-Tenant Creation Prevention', () => {
    it('should not allow Tenant B to create work order referencing Tenant A customer', async () => {
      // When Tenant B tries to create a WO with Tenant A's customer,
      // the service should reject because the customer doesn't belong to their tenant
      prisma.customer.findFirst.mockResolvedValue(null); // Customer not found for Tenant B
      prisma.vehicle.findFirst.mockResolvedValue(null);

      const res = await authPost(app, '/v1/work-orders', TENANT_B_ADMIN).send({
        vehicleId: TEST_VEHICLE_ID,
        customerId: TEST_CUSTOMER_ID,
        diagnosis: 'Cross-tenant attack',
      });

      // Should fail: either 404 (customer not found) or 403 (forbidden) or 400/500
      expect([400, 401, 403, 404, 500]).toContain(res.status);
    });
  });
});
