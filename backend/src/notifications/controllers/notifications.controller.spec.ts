import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from '../services/notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: jest.Mocked<NotificationsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: {
            sendNotification: jest.fn(),
          },
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
    it('should return empty notifications with pagination defaults', async () => {
      const result = await controller.getNotifications('1', '20', 'false');

      expect(result).toEqual({
        notifications: [],
        pagination: { page: 1, limit: 20, total: 0 },
      });
    });

    it('should parse custom page and limit', async () => {
      const result = await controller.getNotifications('3', '50', 'true');

      expect(result).toEqual({
        notifications: [],
        pagination: { page: 3, limit: 50, total: 0 },
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return zero count', async () => {
      const result = await controller.getUnreadCount();

      expect(result).toEqual({ count: 0 });
    });
  });

  describe('markAsRead', () => {
    it('should return success with notification id', async () => {
      const result = await controller.markAsRead('notif-001');

      expect(result).toEqual({ success: true, notificationId: 'notif-001' });
    });
  });

  describe('markAllAsRead', () => {
    it('should return success', async () => {
      const result = await controller.markAllAsRead();

      expect(result).toEqual({ success: true });
    });
  });

  describe('sendTestNotification', () => {
    it('should delegate to notificationsService.sendNotification', async () => {
      service.sendNotification.mockResolvedValue(undefined);

      const body = { userId: 'user-001', tenantId: 'tenant-001' };
      const result = await controller.sendTestNotification(body);

      expect(service.sendNotification).toHaveBeenCalledWith({
        tenantId: 'tenant-001',
        userId: 'user-001',
        type: 'booking_created',
        title: 'Test Notification',
        message: 'This is a test notification from MechMind OS',
        data: { test: true },
      });
      expect(result).toEqual({ success: true, message: 'Notification sent' });
    });
  });
});
