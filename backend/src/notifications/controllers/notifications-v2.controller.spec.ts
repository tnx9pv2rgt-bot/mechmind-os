import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsV2Controller } from './notifications-v2.controller';
import { NotificationV2Service, CreateNotificationDTO } from '../services/notification-v2.service';

describe('NotificationsV2Controller', () => {
  let controller: NotificationsV2Controller;
  let service: jest.Mocked<NotificationV2Service>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsV2Controller],
      providers: [
        {
          provide: NotificationV2Service,
          useValue: {
            getHistory: jest.fn(),
            sendImmediate: jest.fn(),
            queueNotification: jest.fn(),
            sendBatch: jest.fn(),
            processPending: jest.fn(),
            getAvailableTemplates: jest.fn(),
            generateMessage: jest.fn(),
            getPreferences: jest.fn(),
            updatePreference: jest.fn(),
            retryNotification: jest.fn(),
            getNotificationById: jest.fn(),
            deleteNotification: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationsV2Controller>(NotificationsV2Controller);
    service = module.get(NotificationV2Service) as jest.Mocked<NotificationV2Service>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHistory', () => {
    it('should delegate to service with parsed query params', async () => {
      const mockHistory = [{ id: 'n-001', type: 'BOOKING_CONFIRMATION' }];
      service.getHistory.mockResolvedValue(mockHistory as never);

      const result = await controller.getHistory(
        'tenant-001',
        'cust-001',
        'BOOKING_CONFIRMATION',
        '10',
        '5',
      );

      expect(service.getHistory).toHaveBeenCalledWith('tenant-001', 'cust-001', {
        type: 'BOOKING_CONFIRMATION',
        limit: 10,
        offset: 5,
      });
      expect(result).toEqual(mockHistory);
    });

    it('should use default limit=50 and offset=0 when not provided', async () => {
      service.getHistory.mockResolvedValue([] as never);

      await controller.getHistory('tenant-001', 'cust-001');

      expect(service.getHistory).toHaveBeenCalledWith('tenant-001', 'cust-001', {
        type: undefined,
        limit: 50,
        offset: 0,
      });
    });
  });

  describe('send', () => {
    it('should delegate to service.sendImmediate', async () => {
      const mockResult = { success: true, notificationId: 'n-001' };
      service.sendImmediate.mockResolvedValue(mockResult as never);
      const dto = {
        customerId: 'cust-001',
        tenantId: 'tenant-001',
        type: 'BOOKING_CONFIRMATION',
        channel: 'EMAIL',
      };

      const result = await controller.send(dto as never);

      expect(service.sendImmediate).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('queue', () => {
    it('should delegate to service.queueNotification', async () => {
      const mockQueued = { id: 'n-001', status: 'PENDING' };
      service.queueNotification.mockResolvedValue(mockQueued as never);
      const dto: CreateNotificationDTO = {
        customerId: 'cust-001',
        tenantId: 'tenant-001',
        type: 'BOOKING_REMINDER' as never,
        channel: 'SMS' as never,
      };

      const result = await controller.queue(dto);

      expect(service.queueNotification).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockQueued);
    });
  });

  describe('sendBatch', () => {
    it('should delegate to service.sendBatch with notifications array', async () => {
      const mockResults = [
        { success: true, notificationId: 'n-001' },
        { success: true, notificationId: 'n-002' },
      ];
      service.sendBatch.mockResolvedValue(mockResults as never);
      const notifications = [
        { customerId: 'c1', tenantId: 't1', type: 'BOOKING_CONFIRMATION', channel: 'EMAIL' },
        { customerId: 'c2', tenantId: 't1', type: 'BOOKING_REMINDER', channel: 'SMS' },
      ];

      const result = await controller.sendBatch({ notifications } as never);

      expect(service.sendBatch).toHaveBeenCalledWith(notifications);
      expect(result).toEqual(mockResults);
    });
  });

  describe('processPending', () => {
    it('should delegate to service.processPending', async () => {
      const mockResult = { processed: 5, failed: 1 };
      service.processPending.mockResolvedValue(mockResult as never);

      const result = await controller.processPending();

      expect(service.processPending).toHaveBeenCalled();
      expect(result).toEqual({ processed: 5, failed: 1 });
    });
  });

  describe('getTemplates', () => {
    it('should return templates wrapped in object', async () => {
      const mockTemplates = [
        { type: 'BOOKING_CONFIRMATION', name: 'Booking', description: 'Confirmation' },
      ];
      service.getAvailableTemplates.mockReturnValue(mockTemplates as never);

      const result = await controller.getTemplates();

      expect(service.getAvailableTemplates).toHaveBeenCalled();
      expect(result).toEqual({ templates: mockTemplates });
    });
  });

  describe('previewTemplate', () => {
    it('should delegate to service.generateMessage and return wrapped', async () => {
      service.generateMessage.mockReturnValue('Ciao Mario, appuntamento confermato!' as never);
      const dto = {
        type: 'BOOKING_CONFIRMATION' as never,
        language: 'it',
        vars: { customerName: 'Mario' },
      };

      const result = await controller.previewTemplate(dto);

      expect(service.generateMessage).toHaveBeenCalledWith('BOOKING_CONFIRMATION', 'it', {
        customerName: 'Mario',
      });
      expect(result).toEqual({ message: 'Ciao Mario, appuntamento confermato!' });
    });
  });

  describe('getPreferences', () => {
    it('should delegate to service.getPreferences', async () => {
      const mockPrefs = { email: true, sms: false };
      service.getPreferences.mockResolvedValue(mockPrefs as never);

      const result = await controller.getPreferences('cust-001');

      expect(service.getPreferences).toHaveBeenCalledWith('cust-001');
      expect(result).toEqual(mockPrefs);
    });
  });

  describe('updatePreference', () => {
    it('should delegate to service.updatePreference and return success', async () => {
      service.updatePreference.mockResolvedValue(undefined as never);
      const dto = { customerId: 'cust-001', channel: 'EMAIL' as never, enabled: true };

      const result = await controller.updatePreference(dto as never);

      expect(service.updatePreference).toHaveBeenCalledWith('cust-001', 'EMAIL', true);
      expect(result).toEqual({ success: true });
    });
  });

  describe('getStatus', () => {
    it('should return status for notification id from database', async () => {
      const mockNotification = {
        id: 'n-001',
        status: 'SENT',
        channel: 'SMS',
        type: 'BOOKING_CONFIRMATION',
        sentAt: new Date('2026-03-15T10:00:00Z'),
        deliveredAt: null,
        failedAt: null,
        retries: 0,
        error: null,
      };
      service.getNotificationById.mockResolvedValue(mockNotification as never);

      const result = await controller.getStatus('tenant-001', 'n-001');

      expect(service.getNotificationById).toHaveBeenCalledWith('tenant-001', 'n-001');
      expect(result).toEqual({
        id: 'n-001',
        status: 'SENT',
        channel: 'SMS',
        type: 'BOOKING_CONFIRMATION',
        sentAt: mockNotification.sentAt,
        deliveredAt: null,
        failedAt: null,
        retries: 0,
        error: null,
      });
    });

    it('should throw NotFoundException when notification not found', async () => {
      service.getNotificationById.mockResolvedValue(null);

      await expect(controller.getStatus('tenant-001', 'n-999')).rejects.toThrow(
        'Notification n-999 not found',
      );
    });
  });

  describe('retry', () => {
    it('should delegate to service.retryNotification', async () => {
      const mockResult = { success: true, notificationId: 'n-001' };
      service.retryNotification.mockResolvedValue(mockResult as never);

      const result = await controller.retry('tenant-001', 'n-001');

      expect(service.retryNotification).toHaveBeenCalledWith('tenant-001', 'n-001');
      expect(result).toEqual(mockResult);
    });
  });

  describe('delete', () => {
    it('should delegate to service.deleteNotification and return success', async () => {
      service.deleteNotification.mockResolvedValue(undefined);

      const result = await controller.delete('tenant-001', 'n-001');

      expect(service.deleteNotification).toHaveBeenCalledWith('tenant-001', 'n-001');
      expect(result).toEqual({ success: true });
    });
  });
});
