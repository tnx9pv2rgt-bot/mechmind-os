import { Test, TestingModule } from '@nestjs/testing';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';

describe('ReviewController', () => {
  let controller: ReviewController;
  let reviewService: {
    requestReview: jest.Mock;
    getStats: jest.Mock;
    findAll: jest.Mock;
  };

  const TENANT_ID = 'tenant-001';
  const CUSTOMER_ID = 'cust-001';

  beforeEach(async () => {
    reviewService = {
      requestReview: jest.fn(),
      getStats: jest.fn(),
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewController],
      providers: [{ provide: ReviewService, useValue: reviewService }],
    }).compile();

    controller = module.get<ReviewController>(ReviewController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('requestReview', () => {
    it('should delegate to ReviewService.requestReview', async () => {
      reviewService.requestReview.mockResolvedValue({
        success: true,
        message: 'Richiesta di recensione inviata',
      });

      const result = await controller.requestReview(TENANT_ID, CUSTOMER_ID);

      expect(result).toEqual({
        success: true,
        message: 'Richiesta di recensione inviata',
      });
      expect(reviewService.requestReview).toHaveBeenCalledWith(CUSTOMER_ID, TENANT_ID);
    });
  });

  describe('getStats', () => {
    it('should return review stats from service', async () => {
      reviewService.getStats.mockResolvedValue({
        sentThisMonth: 15,
        sentLastMonth: 10,
        totalSent: 100,
      });

      const result = await controller.getStats(TENANT_ID);

      expect(result).toEqual({
        success: true,
        data: {
          sentThisMonth: 15,
          sentLastMonth: 10,
          totalSent: 100,
        },
      });
      expect(reviewService.getStats).toHaveBeenCalledWith(TENANT_ID);
    });
  });

  describe('findAll', () => {
    it('should return paginated review requests', async () => {
      const mockData = {
        data: [
          {
            id: 'notif-1',
            customerId: CUSTOMER_ID,
            status: 'SENT',
            sentAt: new Date(),
            createdAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };
      reviewService.findAll.mockResolvedValue(mockData);

      const result = await controller.findAll(TENANT_ID, '1', '20');

      expect(result).toEqual(mockData);
      expect(reviewService.findAll).toHaveBeenCalledWith(TENANT_ID, {
        page: 1,
        limit: 20,
      });
    });

    it('should pass undefined page and limit when not provided', async () => {
      reviewService.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await controller.findAll(TENANT_ID);

      expect(reviewService.findAll).toHaveBeenCalledWith(TENANT_ID, {
        page: undefined,
        limit: undefined,
      });
    });

    it('should propagate service errors', async () => {
      reviewService.findAll.mockRejectedValue(new Error('DB error'));

      await expect(controller.findAll(TENANT_ID)).rejects.toThrow('DB error');
    });
  });

  describe('requestReview error path', () => {
    it('should propagate service errors', async () => {
      reviewService.requestReview.mockRejectedValue(new Error('Customer not found'));

      await expect(controller.requestReview(TENANT_ID, 'cust-x')).rejects.toThrow(
        'Customer not found',
      );
    });
  });

  describe('getStats error path', () => {
    it('should propagate service errors', async () => {
      reviewService.getStats.mockRejectedValue(new Error('Stats error'));

      await expect(controller.getStats(TENANT_ID)).rejects.toThrow('Stats error');
    });
  });
});
