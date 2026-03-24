import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReviewService } from './review.service';
import { PrismaService } from '../common/services/prisma.service';
import { NotificationV2Service } from '../notifications/services/notification-v2.service';
import { NotificationType, NotificationChannel } from '@prisma/client';

describe('ReviewService', () => {
  let service: ReviewService;
  let prisma: {
    customer: { findFirst: jest.Mock };
    notification: { count: jest.Mock; findMany: jest.Mock };
  };
  let notificationService: { sendImmediate: jest.Mock };

  const TENANT_ID = 'tenant-001';
  const CUSTOMER_ID = 'cust-001';

  beforeEach(async () => {
    prisma = {
      customer: { findFirst: jest.fn() },
      notification: { count: jest.fn(), findMany: jest.fn() },
    };

    notificationService = {
      sendImmediate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationV2Service, useValue: notificationService },
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
  });
});
