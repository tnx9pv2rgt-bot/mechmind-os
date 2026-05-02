import { Test, TestingModule } from '@nestjs/testing';
import { DeclinedServiceController } from './declined-service.controller';
import { DeclinedServiceService } from './declined-service.service';

describe('DeclinedServiceController', () => {
  let controller: DeclinedServiceController;
  let service: jest.Mocked<DeclinedServiceService>;

  const TENANT_ID = 'tenant-001';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeclinedServiceController],
      providers: [
        {
          provide: DeclinedServiceService,
          useValue: {
            getDeclinedServices: jest.fn(),
            getFollowUpCandidates: jest.fn(),
            getStats: jest.fn(),
            markFollowUpSent: jest.fn(),
            markConverted: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DeclinedServiceController>(DeclinedServiceController);
    service = module.get(DeclinedServiceService) as jest.Mocked<DeclinedServiceService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDeclinedServices', () => {
    it('should delegate to service with tenantId and filters', async () => {
      const expected = { data: [], total: 0, page: 2, limit: 10, pages: 0 };
      service.getDeclinedServices.mockResolvedValue(expected as never);
      const filters = { customerId: 'cust-001', severity: 'HIGH', page: 2, limit: 10 };

      const result = await controller.getDeclinedServices(TENANT_ID, filters as never);

      expect(service.getDeclinedServices).toHaveBeenCalledWith(
        TENANT_ID,
        {
          customerId: 'cust-001',
          severity: 'HIGH',
          dateFrom: undefined,
          dateTo: undefined,
          followedUp: undefined,
        },
        2,
        10,
      );
      expect(result).toEqual(expected);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('should use default page/limit when not provided', async () => {
      const result = { data: [], total: 0, page: 1, limit: 20, pages: 0 };
      service.getDeclinedServices.mockResolvedValue(result as never);
      const filters = {} as never;

      const response = await controller.getDeclinedServices(TENANT_ID, filters);

      expect(service.getDeclinedServices).toHaveBeenCalledWith(
        TENANT_ID,
        {
          customerId: undefined,
          severity: undefined,
          dateFrom: undefined,
          dateTo: undefined,
          followedUp: undefined,
        },
        1,
        20,
      );
      expect(response.page).toBe(1);
      expect(response.limit).toBe(20);
    });
  });

  describe('getFollowUpCandidates', () => {
    it('should delegate to service with tenantId and daysAgo', async () => {
      service.getFollowUpCandidates.mockResolvedValue([] as never);

      const result = await controller.getFollowUpCandidates(TENANT_ID, { daysAgo: 30 } as never);

      expect(service.getFollowUpCandidates).toHaveBeenCalledWith(TENANT_ID, 30);
      expect(result).toEqual([]);
    });

    it('should use daysAgo when query provided', async () => {
      service.getFollowUpCandidates.mockResolvedValue([{ id: 'ds-001' }] as never);

      await controller.getFollowUpCandidates(TENANT_ID, { daysAgo: 14 } as never);

      expect(service.getFollowUpCandidates).toHaveBeenCalledWith(TENANT_ID, 14);
    });

    it('should handle undefined daysAgo', async () => {
      service.getFollowUpCandidates.mockResolvedValue([] as never);

      await controller.getFollowUpCandidates(TENANT_ID, {} as never);

      expect(service.getFollowUpCandidates).toHaveBeenCalledWith(TENANT_ID, undefined);
    });
  });

  describe('getStats', () => {
    it('should delegate to service with tenantId', async () => {
      const stats = {
        total: 50,
        pendingFollowUp: 20,
        converted: 15,
        conversionRate: 30,
      };
      service.getStats.mockResolvedValue(stats as never);

      const result = await controller.getStats(TENANT_ID);

      expect(service.getStats).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual(stats);
      expect(result.total).toBe(50);
      expect(result.conversionRate).toBe(30);
    });
  });

  describe('markFollowUpSent', () => {
    it('should delegate to service with tenantId, id, and campaignId', async () => {
      const response = { id: 'ds-001', followUpSentAt: new Date() };
      service.markFollowUpSent.mockResolvedValue(response as never);

      const result = await controller.markFollowUpSent(TENANT_ID, 'ds-001', {
        campaignId: 'camp-001',
      } as never);

      expect(service.markFollowUpSent).toHaveBeenCalledWith(TENANT_ID, 'ds-001', 'camp-001');
      expect(result).toEqual(response);
      expect(result.id).toBe('ds-001');
    });

    it('should handle missing campaignId', async () => {
      const response = { id: 'ds-001', followUpSentAt: new Date() };
      service.markFollowUpSent.mockResolvedValue(response as never);

      const result = await controller.markFollowUpSent(TENANT_ID, 'ds-001', {} as never);

      expect(service.markFollowUpSent).toHaveBeenCalledWith(TENANT_ID, 'ds-001', undefined);
      expect(result.id).toBe('ds-001');
    });
  });

  describe('markConverted', () => {
    it('should delegate to service with tenantId, id, and bookingId', async () => {
      const response = { id: 'ds-001', convertedBookingId: 'book-001', convertedAt: new Date() };
      service.markConverted.mockResolvedValue(response as never);

      const result = await controller.markConverted(TENANT_ID, 'ds-001', {
        bookingId: 'book-001',
      } as never);

      expect(service.markConverted).toHaveBeenCalledWith(TENANT_ID, 'ds-001', 'book-001');
      expect(result).toEqual(response);
      expect(result.convertedBookingId).toBe('book-001');
    });
  });
});
