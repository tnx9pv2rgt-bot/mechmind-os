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
    });

    it('should apply customerId filter', async () => {
      prisma.declinedService.findMany.mockResolvedValue([]);
      prisma.declinedService.count.mockResolvedValue(0);

      await service.getDeclinedServices(TENANT_ID, { customerId: 'cust-uuid-001' });

      expect(prisma.declinedService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, customerId: 'cust-uuid-001' },
        }),
      );
    });

    it('should apply severity filter', async () => {
      prisma.declinedService.findMany.mockResolvedValue([]);
      prisma.declinedService.count.mockResolvedValue(0);

      await service.getDeclinedServices(TENANT_ID, { severity: 'CRITICAL' });

      expect(prisma.declinedService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, severity: 'CRITICAL' },
        }),
      );
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
  });

  // ─── getFollowUpCandidates ───
  describe('getFollowUpCandidates', () => {
    it('should return services declined X+ days ago without follow-up', async () => {
      const candidates = [mockDeclinedService()];
      prisma.declinedService.findMany.mockResolvedValue(candidates);

      const result = await service.getFollowUpCandidates(TENANT_ID, 30);

      expect(result).toEqual(candidates);
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
  });

  // ─── markFollowUpSent ───
  describe('markFollowUpSent', () => {
    it('should mark follow-up as sent', async () => {
      const record = mockDeclinedService();
      prisma.declinedService.findFirst.mockResolvedValue(record);
      const updated = { ...record, followUpSentAt: new Date(), followUpCount: 1 };
      prisma.declinedService.update.mockResolvedValue(updated);

      const result = await service.markFollowUpSent(TENANT_ID, 'ds-uuid-001', 'camp-001');

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

      expect(prisma.declinedService.update).toHaveBeenCalledWith({
        where: { id: 'ds-uuid-001' },
        data: {
          convertedAt: expect.any(Date),
          convertedBookingId: 'booking-001',
        },
        include: { customer: true, estimate: true },
      });
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException if record not found', async () => {
      prisma.declinedService.findFirst.mockResolvedValue(null);

      await expect(service.markConverted(TENANT_ID, 'nonexistent', 'booking-001')).rejects.toThrow(
        NotFoundException,
      );
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
  });
});
