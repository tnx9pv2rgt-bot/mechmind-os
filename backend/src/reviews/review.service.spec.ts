import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReviewService } from './review.service';
import { PrismaService } from '../common/services/prisma.service';
import { NotificationV2Service } from '../notifications/services/notification-v2.service';
import { PublicTokenService } from '../public-token/public-token.service';
import { NotificationType, NotificationChannel } from '@prisma/client';

describe('ReviewService', () => {
  let service: ReviewService;
  let prisma: {
    customer: { findFirst: jest.Mock };
    notification: { count: jest.Mock; findMany: jest.Mock };
    workOrder: { findFirst: jest.Mock };
  };
  let notificationService: { sendImmediate: jest.Mock };
  let mockPublicTokenService: {
    generateToken: jest.Mock;
    validateToken: jest.Mock;
    consumeToken: jest.Mock;
    revokeTokensForEntity: jest.Mock;
  };
  let mockEventEmitter: { emit: jest.Mock };

  const TENANT_ID = 'tenant-001';
  const CUSTOMER_ID = 'cust-001';

  beforeEach(async () => {
    prisma = {
      customer: { findFirst: jest.fn() },
      notification: { count: jest.fn(), findMany: jest.fn() },
      workOrder: { findFirst: jest.fn() },
    };

    notificationService = {
      sendImmediate: jest.fn(),
    };

    mockPublicTokenService = {
      generateToken: jest.fn().mockResolvedValue({ token: 'review-token-123' }),
      validateToken: jest.fn(),
      consumeToken: jest.fn().mockResolvedValue({}),
      revokeTokensForEntity: jest.fn().mockResolvedValue(0),
    };

    mockEventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationV2Service, useValue: notificationService },
        { provide: PublicTokenService, useValue: mockPublicTokenService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('https://app.mechmind.io') },
        },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requestReview', () => {
    it('should send review request notification', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: CUSTOMER_ID, tenantId: TENANT_ID });
      notificationService.sendImmediate.mockResolvedValue({ success: true });

      const result = await service.requestReview(CUSTOMER_ID, TENANT_ID);

      expect(result).toEqual({
        success: true,
        message: 'Richiesta di recensione inviata',
      });
      expect(notificationService.sendImmediate).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: CUSTOMER_ID,
          tenantId: TENANT_ID,
          type: NotificationType.STATUS_UPDATE,
          channel: NotificationChannel.SMS,
          metadata: expect.objectContaining({
            template: 'review-request',
          }),
        }),
      );
    });

    it('should throw NotFoundException if customer not found', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);

      await expect(service.requestReview(CUSTOMER_ID, TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStats', () => {
    it('should return review stats', async () => {
      prisma.notification.count
        .mockResolvedValueOnce(15) // sentThisMonth
        .mockResolvedValueOnce(10) // sentLastMonth
        .mockResolvedValueOnce(100); // totalSent

      const result = await service.getStats(TENANT_ID);

      expect(result).toEqual({
        sentThisMonth: 15,
        sentLastMonth: 10,
        totalSent: 100,
      });
      expect(prisma.notification.count).toHaveBeenCalledTimes(3);
    });
  });

  describe('findAll', () => {
    it('should return paginated review notifications', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          customerId: CUSTOMER_ID,
          status: 'SENT',
          sentAt: new Date('2026-03-17'),
          createdAt: new Date('2026-03-17'),
        },
      ];
      prisma.notification.findMany.mockResolvedValue(mockNotifications);
      prisma.notification.count.mockResolvedValue(1);

      const result = await service.findAll(TENANT_ID, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID }),
          take: 20,
          skip: 0,
        }),
      );
    });

    it('should cap limit at 100', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      const result = await service.findAll(TENANT_ID, { page: 1, limit: 200 });

      expect(result.limit).toBe(100);
    });

    it('should use default page=1 and limit=20 when options are empty', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      const result = await service.findAll(TENANT_ID);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should use default page=1 when only limit is provided', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      const result = await service.findAll(TENANT_ID, { limit: 10 });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('scheduleAutoReviewRequest', () => {
    it('should generate token and emit scheduled event', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: CUSTOMER_ID, tenantId: TENANT_ID });

      const result = await service.scheduleAutoReviewRequest(TENANT_ID, 'wo-001', CUSTOMER_ID);

      expect(result.reviewUrl).toContain('review-token-123');
      expect(result.scheduledFor).toBeInstanceOf(Date);
      expect(mockPublicTokenService.generateToken).toHaveBeenCalledWith(
        TENANT_ID,
        'REVIEW_REQUEST',
        'wo-001',
        'WorkOrder',
        168,
        expect.objectContaining({ customerId: CUSTOMER_ID }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'review.requestScheduled',
        expect.objectContaining({
          tenantId: TENANT_ID,
          workOrderId: 'wo-001',
          customerId: CUSTOMER_ID,
        }),
      );
    });

    it('should throw NotFoundException if customer not found', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.scheduleAutoReviewRequest(TENANT_ID, 'wo-001', CUSTOMER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('sendReviewRequest', () => {
    it('should generate token and emit sent event', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({ id: 'wo-001', customerId: CUSTOMER_ID });

      const result = await service.sendReviewRequest(TENANT_ID, 'wo-001');

      expect(result.reviewUrl).toContain('review-token-123');
      expect(mockPublicTokenService.revokeTokensForEntity).toHaveBeenCalledWith(
        TENANT_ID,
        'WorkOrder',
        'wo-001',
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'review.requestSent',
        expect.objectContaining({
          tenantId: TENANT_ID,
          workOrderId: 'wo-001',
        }),
      );
    });

    it('should throw NotFoundException if work order not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null);

      await expect(service.sendReviewRequest(TENANT_ID, 'wo-xxx')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
