import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DeclinedServiceService } from './declined-service.service';
import { PrismaService } from '@common/services/prisma.service';
import { Prisma } from '@prisma/client';

const TENANT_ID = 'tenant-uuid-001';

function mockDeclinedService(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'ds-uuid-001',
    tenantId: TENANT_ID,
    customerId: 'cust-uuid-001',
    vehicleId: 'veh-uuid-001',
    estimateId: 'est-uuid-001',
    estimateLineId: 'line-uuid-001',
    serviceDescription: 'Sostituzione pastiglie freno anteriori',
    estimatedCostCents: new Prisma.Decimal(15000),
    severity: 'WARNING',
    declinedAt: new Date('2026-02-15T10:00:00Z'),
    followUpSentAt: null,
    followUpCount: 0,
    followUpCampaignId: null,
    convertedAt: null,
    convertedBookingId: null,
    createdAt: new Date(),
    customer: { id: 'cust-uuid-001', encryptedFirstName: 'Mario' },
    estimate: { id: 'est-uuid-001' },
    ...overrides,
  };
}

describe('DeclinedServiceService', () => {
  let service: DeclinedServiceService;
  let prisma: {
    declinedService: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      declinedService: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DeclinedServiceService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(DeclinedServiceService);
  });

  // ─── trackDeclinedService ───
  describe('trackDeclinedService', () => {
    it('should create a new declined service record', async () => {
      const input = {
        estimateId: 'est-uuid-001',
        estimateLineId: 'line-uuid-001',
        customerId: 'cust-uuid-001',
        vehicleId: 'veh-uuid-001',
        serviceDescription: 'Sostituzione pastiglie freno anteriori',
        estimatedCostCents: 15000,
        severity: 'WARNING',
      };
      const expected = mockDeclinedService();
      prisma.declinedService.create.mockResolvedValue(expected);

      const result = await service.trackDeclinedService(TENANT_ID, input);

      expect(prisma.declinedService.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          estimateId: input.estimateId,
          estimateLineId: input.estimateLineId,
          customerId: input.customerId,
          vehicleId: input.vehicleId,
          serviceDescription: input.serviceDescription,
          estimatedCostCents: expect.any(Prisma.Decimal),
          severity: 'WARNING',
          declinedAt: expect.any(Date),
        }),
        include: { customer: true, estimate: true },
      });
      expect(result).toEqual(expected);
      expect(result.id).toBe('ds-uuid-001');
      expect(result.tenantId).toBe(TENANT_ID);
    });

    it('should create without optional vehicleId and severity', async () => {
      const input = {
        estimateId: 'est-uuid-001',
        estimateLineId: 'line-uuid-001',
        customerId: 'cust-uuid-001',
        serviceDescription: 'Cambio olio',
        estimatedCostCents: 5000,
      };
      const expected = mockDeclinedService({ vehicleId: undefined, severity: undefined });
      prisma.declinedService.create.mockResolvedValue(expected);

      await service.trackDeclinedService(TENANT_ID, input);

      expect(prisma.declinedService.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          vehicleId: undefined,
          severity: undefined,
        }),
        include: { customer: true, estimate: true },
      });
    });

    it('should verify tenantId isolation on create', async () => {
      const input = {
        estimateId: 'est-uuid-001',
        estimateLineId: 'line-uuid-001',
        customerId: 'cust-uuid-001',
        serviceDescription: 'Sostituzione pastiglie freno anteriori',
        estimatedCostCents: 15000,
      };
      const expected = mockDeclinedService();
      prisma.declinedService.create.mockResolvedValue(expected);

      await service.trackDeclinedService(TENANT_ID, input);

      const callArgs = prisma.declinedService.create.mock.calls[0][0];
      expect(callArgs.data.tenantId).toBe(TENANT_ID);
      expect(callArgs.data.tenantId).toBe('tenant-uuid-001');
    });
  });

  // ─── getDeclinedServices ───
  describe('getDeclinedServices', () => {
    it('should return paginated declined services', async () => {
      const records = [mockDeclinedService()];
      prisma.declinedService.findMany.mockResolvedValue(records);
      prisma.declinedService.count.mockResolvedValue(1);

      const result = await service.getDeclinedServices(TENANT_ID, {}, 1, 20);

      expect(result).toEqual({ data: records, total: 1, page: 1, limit: 20, pages: 1 });
      expect(prisma.declinedService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
          skip: 0,
          take: 20,
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.pages).toBe(1);
    });

    it('should apply customerId filter', async () => {
      prisma.declinedService.findMany.mockResolvedValue([]);
      prisma.declinedService.count.mockResolvedValue(0);

      const result = await service.getDeclinedServices(TENANT_ID, { customerId: 'cust-uuid-001' });

      expect(prisma.declinedService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, customerId: 'cust-uuid-001' },
        }),
      );
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should apply severity filter', async () => {
      prisma.declinedService.findMany.mockResolvedValue([]);
      prisma.declinedService.count.mockResolvedValue(0);

      const result = await service.getDeclinedServices(TENANT_ID, { severity: 'CRITICAL' });

      expect(prisma.declinedService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, severity: 'CRITICAL' },
        }),
      );
      expect(result.total).toBe(0);
      expect(result.pages).toBe(0);
    });

    it('should apply date range filter', async () => {
      prisma.declinedService.findMany.mockResolvedValue([]);
      prisma.declinedService.count.mockResolvedValue(0);

      await service.getDeclinedServices(TENANT_ID, {
        dateFrom: '2026-01-01',
        dateTo: '2026-03-01',
      });

      expect(prisma.declinedService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TENANT_ID,
            declinedAt: {
              gte: new Date('2026-01-01'),
              lte: new Date('2026-03-01'),
            },
          },
        }),
      );
    });

    it('should filter by followedUp = true', async () => {
      prisma.declinedService.findMany.mockResolvedValue([]);
      prisma.declinedService.count.mockResolvedValue(0);

      await service.getDeclinedServices(TENANT_ID, { followedUp: true });

      expect(prisma.declinedService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, followUpSentAt: { not: null } },
        }),
      );
    });

    it('should filter by followedUp = false', async () => {
      prisma.declinedService.findMany.mockResolvedValue([]);
      prisma.declinedService.count.mockResolvedValue(0);

      await service.getDeclinedServices(TENANT_ID, { followedUp: false });

      expect(prisma.declinedService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, followUpSentAt: null },
        }),
      );
    });

    it('should apply only dateFrom filter', async () => {
      prisma.declinedService.findMany.mockResolvedValue([]);
      prisma.declinedService.count.mockResolvedValue(0);

      await service.getDeclinedServices(TENANT_ID, { dateFrom: '2026-02-01' });

      expect(prisma.declinedService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TENANT_ID,
            declinedAt: { gte: new Date('2026-02-01') },
          },
        }),
      );
    });

    it('should apply only dateTo filter', async () => {
      prisma.declinedService.findMany.mockResolvedValue([]);
      prisma.declinedService.count.mockResolvedValue(0);

      await service.getDeclinedServices(TENANT_ID, { dateTo: '2026-03-15' });

      expect(prisma.declinedService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TENANT_ID,
            declinedAt: { lte: new Date('2026-03-15') },
          },
        }),
      );
    });

    it('should apply multiple filters combined', async () => {
      prisma.declinedService.findMany.mockResolvedValue([]);
      prisma.declinedService.count.mockResolvedValue(0);

      await service.getDeclinedServices(TENANT_ID, {
        customerId: 'cust-uuid-001',
        severity: 'CRITICAL',
        dateFrom: '2026-01-01',
        dateTo: '2026-03-31',
        followedUp: true,
      });

      expect(prisma.declinedService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TENANT_ID,
            customerId: 'cust-uuid-001',
            severity: 'CRITICAL',
            declinedAt: {
              gte: new Date('2026-01-01'),
              lte: new Date('2026-03-31'),
            },
            followUpSentAt: { not: null },
          },
        }),
      );
    });

    it('should paginate correctly with page > 1', async () => {
      prisma.declinedService.findMany.mockResolvedValue([]);
      prisma.declinedService.count.mockResolvedValue(100);

      const result = await service.getDeclinedServices(TENANT_ID, {}, 3, 25);

      expect(prisma.declinedService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 50,
          take: 25,
        }),
      );
      expect(result.page).toBe(3);
      expect(result.pages).toBe(4);
    });
  });

  // ─── getFollowUpCandidates ───
  describe('getFollowUpCandidates', () => {
    it('should return services declined X+ days ago without follow-up', async () => {
      const candidates = [mockDeclinedService()];
      prisma.declinedService.findMany.mockResolvedValue(candidates);

      const result = await service.getFollowUpCandidates(TENANT_ID, 30);

      expect(result).toEqual(candidates);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ds-uuid-001');
      expect(prisma.declinedService.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          declinedAt: { lte: expect.any(Date) },
          followUpSentAt: null,
          convertedAt: null,
        },
        include: { customer: true, estimate: true },
        orderBy: { declinedAt: 'asc' },
      });
    });

    it('should default to 30 days', async () => {
      prisma.declinedService.findMany.mockResolvedValue([]);

      await service.getFollowUpCandidates(TENANT_ID);

      expect(prisma.declinedService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            declinedAt: { lte: expect.any(Date) },
          }),
        }),
      );
    });

    it('should filter correctly for candidates without follow-up or conversion', async () => {
      const candidates = [mockDeclinedService()];
      prisma.declinedService.findMany.mockResolvedValue(candidates);

      const result = await service.getFollowUpCandidates(TENANT_ID, 30);

      expect(prisma.declinedService.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          declinedAt: { lte: expect.any(Date) },
          followUpSentAt: null,
          convertedAt: null,
        },
        include: { customer: true, estimate: true },
        orderBy: { declinedAt: 'asc' },
      });
      expect(result).toEqual(candidates);
    });

    it('should calculate date cutoff correctly for 14 days', async () => {
      prisma.declinedService.findMany.mockResolvedValue([]);

      const beforeCall = new Date();
      beforeCall.setDate(beforeCall.getDate() - 14);

      await service.getFollowUpCandidates(TENANT_ID, 14);

      const afterCall = new Date();
      afterCall.setDate(afterCall.getDate() - 14);

      const callArgs = prisma.declinedService.findMany.mock.calls[0][0];
      const cutoff = (callArgs.where as any).declinedAt.lte;

      expect(cutoff.getTime()).toBeLessThanOrEqual(beforeCall.getTime());
      expect(cutoff.getTime()).toBeGreaterThanOrEqual(afterCall.getTime());
    });
  });

  // ─── markFollowUpSent ───
  describe('markFollowUpSent', () => {
    it('should mark follow-up as sent', async () => {
      const record = mockDeclinedService();
      prisma.declinedService.findFirst.mockResolvedValue(record);
      const updated = {
        ...record,
        followUpSentAt: new Date(),
        followUpCount: 1,
        followUpCampaignId: 'camp-001',
      };
      prisma.declinedService.update.mockResolvedValue(updated);

      const result = await service.markFollowUpSent(TENANT_ID, 'ds-uuid-001', 'camp-001');

      expect(prisma.declinedService.findFirst).toHaveBeenCalledWith({
        where: { id: 'ds-uuid-001', tenantId: TENANT_ID },
      });
      expect(prisma.declinedService.update).toHaveBeenCalledWith({
        where: { id: 'ds-uuid-001' },
        data: {
          followUpSentAt: expect.any(Date),
          followUpCount: { increment: 1 },
          followUpCampaignId: 'camp-001',
        },
        include: { customer: true, estimate: true },
      });
      expect(result).toEqual(updated);
      expect(result.followUpCount).toBe(1);
      expect(result.followUpCampaignId).toBe('camp-001');
    });

    it('should keep existing campaignId if not provided', async () => {
      const record = mockDeclinedService({ followUpCampaignId: 'existing-camp' });
      prisma.declinedService.findFirst.mockResolvedValue(record);
      prisma.declinedService.update.mockResolvedValue(record);

      await service.markFollowUpSent(TENANT_ID, 'ds-uuid-001');

      expect(prisma.declinedService.update).toHaveBeenCalledWith({
        where: { id: 'ds-uuid-001' },
        data: expect.objectContaining({
          followUpCampaignId: 'existing-camp',
        }),
        include: { customer: true, estimate: true },
      });
    });

    it('should throw NotFoundException if record not found', async () => {
      prisma.declinedService.findFirst.mockResolvedValue(null);

      await expect(service.markFollowUpSent(TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should verify tenantId isolation on findFirst', async () => {
      const record = mockDeclinedService();
      prisma.declinedService.findFirst.mockResolvedValue(record);
      prisma.declinedService.update.mockResolvedValue(record);

      await service.markFollowUpSent(TENANT_ID, 'ds-uuid-001');

      expect(prisma.declinedService.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID }),
        }),
      );
    });

    it('should reject with correct error message', async () => {
      prisma.declinedService.findFirst.mockResolvedValue(null);

      try {
        await service.markFollowUpSent(TENANT_ID, 'nonexistent-id');
        fail('should have thrown NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        const typedError = error as NotFoundException;
        expect(typedError.message).toContain('Servizio rifiutato');
        expect(typedError.message).toContain('nonexistent-id');
      }
    });
  });

  // ─── markConverted ───
  describe('markConverted', () => {
    it('should mark declined service as converted', async () => {
      const record = mockDeclinedService();
      prisma.declinedService.findFirst.mockResolvedValue(record);
      const updated = {
        ...record,
        convertedAt: new Date(),
        convertedBookingId: 'booking-001',
      };
      prisma.declinedService.update.mockResolvedValue(updated);

      const result = await service.markConverted(TENANT_ID, 'ds-uuid-001', 'booking-001');

      expect(prisma.declinedService.findFirst).toHaveBeenCalledWith({
        where: { id: 'ds-uuid-001', tenantId: TENANT_ID },
      });
      expect(prisma.declinedService.update).toHaveBeenCalledWith({
        where: { id: 'ds-uuid-001' },
        data: {
          convertedAt: expect.any(Date),
          convertedBookingId: 'booking-001',
        },
        include: { customer: true, estimate: true },
      });
      expect(result).toEqual(updated);
      expect(result.convertedBookingId).toBe('booking-001');
      expect(result.convertedAt).toBeDefined();
    });

    it('should throw NotFoundException if record not found', async () => {
      prisma.declinedService.findFirst.mockResolvedValue(null);

      await expect(service.markConverted(TENANT_ID, 'nonexistent', 'booking-001')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should verify tenantId isolation on conversion', async () => {
      const record = mockDeclinedService();
      prisma.declinedService.findFirst.mockResolvedValue(record);
      const updated = { ...record, convertedAt: new Date(), convertedBookingId: 'booking-001' };
      prisma.declinedService.update.mockResolvedValue(updated);

      await service.markConverted(TENANT_ID, 'ds-uuid-001', 'booking-001');

      expect(prisma.declinedService.findFirst).toHaveBeenCalledWith({
        where: { id: 'ds-uuid-001', tenantId: TENANT_ID },
      });
    });

    it('should include customer and estimate in response', async () => {
      const record = mockDeclinedService();
      prisma.declinedService.findFirst.mockResolvedValue(record);
      const updated = { ...record, convertedAt: new Date(), convertedBookingId: 'booking-001' };
      prisma.declinedService.update.mockResolvedValue(updated);

      const result = await service.markConverted(TENANT_ID, 'ds-uuid-001', 'booking-001');

      expect(prisma.declinedService.update).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { customer: true, estimate: true },
        }),
      );
      expect(result).toEqual(updated);
    });
  });

  // ─── getStats ───
  describe('getStats', () => {
    it('should return correct statistics', async () => {
      prisma.declinedService.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(60) // pendingFollowUp
        .mockResolvedValueOnce(25); // converted

      const result = await service.getStats(TENANT_ID);

      expect(result).toEqual({
        total: 100,
        pendingFollowUp: 60,
        converted: 25,
        conversionRate: 25,
      });
    });

    it('should return zero conversion rate when no records', async () => {
      prisma.declinedService.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getStats(TENANT_ID);

      expect(result).toEqual({
        total: 0,
        pendingFollowUp: 0,
        converted: 0,
        conversionRate: 0,
      });
    });

    it('should filter by tenantId on all count queries', async () => {
      prisma.declinedService.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      await service.getStats(TENANT_ID);

      expect(prisma.declinedService.count).toHaveBeenCalledTimes(3);
      expect(prisma.declinedService.count).toHaveBeenNthCalledWith(1, {
        where: { tenantId: TENANT_ID },
      });
      expect(prisma.declinedService.count).toHaveBeenNthCalledWith(2, {
        where: { tenantId: TENANT_ID, followUpSentAt: null, convertedAt: null },
      });
      expect(prisma.declinedService.count).toHaveBeenNthCalledWith(3, {
        where: { tenantId: TENANT_ID, convertedAt: { not: null } },
      });
    });

    it('should calculate conversion rate as percentage with 2 decimals', async () => {
      prisma.declinedService.count
        .mockResolvedValueOnce(200) // total
        .mockResolvedValueOnce(80) // pendingFollowUp
        .mockResolvedValueOnce(33); // converted

      const result = await service.getStats(TENANT_ID);

      expect(result.conversionRate).toBe(16.5);
    });

    it('should round conversion rate correctly', async () => {
      prisma.declinedService.count
        .mockResolvedValueOnce(300) // total
        .mockResolvedValueOnce(100) // pendingFollowUp
        .mockResolvedValueOnce(99); // converted

      const result = await service.getStats(TENANT_ID);

      expect(result.conversionRate).toBe(33);
    });

    it('should execute all three count queries in parallel', async () => {
      prisma.declinedService.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(60)
        .mockResolvedValueOnce(25);

      await service.getStats(TENANT_ID);

      expect(prisma.declinedService.count).toHaveBeenCalledTimes(3);
    });
  });
});
