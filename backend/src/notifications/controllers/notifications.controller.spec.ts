import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from '../services/notifications.service';
import { PrismaService } from '../../common/services/prisma.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: jest.Mocked<NotificationsService>;
  let prisma: {
    notification: {
      findMany: jest.Mock;
      count: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  const TENANT_ID = 'tenant-001';

  beforeEach(async () => {
    prisma = {
      notification: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: {
            sendNotification: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get(NotificationsService) as jest.Mocked<NotificationsService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getNotifications', () => {
    it('should return notifications from Prisma with pagination', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      const result = await controller.getNotifications(TENANT_ID, '1', '20', 'false');

      expect(result).toEqual({
        notifications: [],
        pagination: { page: 1, limit: 20, total: 0 },
      });
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID }),
        }),
      );
    });

    it('should parse custom page and limit', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      const result = await controller.getNotifications(TENANT_ID, '3', '50', 'true');

      expect(result.pagination).toEqual({ page: 3, limit: 50, total: 0 });
    });
  });

  describe('getUnreadCount', () => {
    it('should return count from Prisma', async () => {
      prisma.notification.count.mockResolvedValue(5);

      const result = await controller.getUnreadCount(TENANT_ID);

      expect(result).toEqual({ count: 5 });
    });
  });

  describe('markAsRead', () => {
    it('should update notification status via Prisma', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });

      const result = await controller.markAsRead(TENANT_ID, 'notif-001');

      expect(result).toEqual({ success: true, notificationId: 'notif-001' });
      expect(prisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'notif-001', tenantId: TENANT_ID },
        }),
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should update all unread notifications', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await controller.markAllAsRead(TENANT_ID);

      expect(result).toEqual({ success: true, updated: 3 });
    });
  });

  describe('sendTestNotification', () => {
    it('should delegate to notificationsService.sendNotification', async () => {
      service.sendNotification.mockResolvedValue(undefined);

      const body = { userId: 'user-001' };
      const result = await controller.sendTestNotification('tenant-001', body);

      expect(service.sendNotification).toHaveBeenCalledWith({
        tenantId: 'tenant-001',
        userId: 'user-001',
        type: 'booking_created',
        title: 'Notifica di Test',
        message: 'Questa è una notifica di test da MechMind OS',
        data: { test: true },
      });
      expect(result).toEqual({ success: true, message: 'Notifica inviata' });
    });
  });

  // ============== Additional branch coverage ==============

  describe('getNotifications — page/limit clamping', () => {
    it('should clamp page to 1 when page < 1', async () => {
      const result = await controller.getNotifications(TENANT_ID, '0', '20', 'false');
      expect(result.pagination.page).toBe(1);
    });

    it('should clamp page to 1 when page is NaN', async () => {
      const result = await controller.getNotifications(TENANT_ID, 'abc', '20', 'false');
      expect(result.pagination.page).toBe(1);
    });

    it('should default limit to 20 when limit is 0 (falsy)', async () => {
      const result = await controller.getNotifications(TENANT_ID, '1', '0', 'false');
      // parseInt('0') === 0, which is falsy, so fallback to 20
      expect(result.pagination.limit).toBe(20);
    });

    it('should clamp limit to 100 when limit > 100', async () => {
      const result = await controller.getNotifications(TENANT_ID, '1', '500', 'false');
      expect(result.pagination.limit).toBe(100);
    });

    it('should default limit to 20 when NaN', async () => {
      const result = await controller.getNotifications(TENANT_ID, '1', 'xyz', 'false');
      expect(result.pagination.limit).toBe(20);
    });
  });

  describe('getNotifications — unreadOnly filter', () => {
    it('should add status filter when unreadOnly is true', async () => {
      await controller.getNotifications(TENANT_ID, '1', '20', 'true');

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            status: { not: 'DELIVERED' },
          }),
        }),
      );
    });

    it('should NOT add status filter when unreadOnly is false', async () => {
      await controller.getNotifications(TENANT_ID, '1', '20', 'false');

      const callArg = prisma.notification.findMany.mock.calls[0][0];
      expect(callArg.where.status).toBeUndefined();
    });
  });

  describe('getNotifications — isRead mapping', () => {
    it('should map DELIVERED status to isRead=true', async () => {
      prisma.notification.findMany.mockResolvedValue([
        {
          id: 'n-1',
          type: 'booking_created',
          message: 'test',
          status: 'DELIVERED',
          createdAt: new Date(),
        },
      ]);
      prisma.notification.count.mockResolvedValue(1);

      const result = await controller.getNotifications(TENANT_ID, '1', '20', 'false');

      expect(result.notifications[0].isRead).toBe(true);
    });

    it('should map non-DELIVERED status to isRead=false', async () => {
      prisma.notification.findMany.mockResolvedValue([
        {
          id: 'n-2',
          type: 'booking_created',
          message: 'test',
          status: 'PENDING',
          createdAt: new Date(),
        },
      ]);
      prisma.notification.count.mockResolvedValue(1);

      const result = await controller.getNotifications(TENANT_ID, '1', '20', 'false');

      expect(result.notifications[0].isRead).toBe(false);
    });
  });

  describe('getNotifications — pagination skip calculation', () => {
    it('should skip correct number of items for page 2', async () => {
      await controller.getNotifications(TENANT_ID, '2', '10', 'false');

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });
  });
});
