import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@common/services/prisma.service';
import {
  NotificationV2Service,
  CreateNotificationDTO,
  NotificationResult,
  NotificationTemplateData,
} from './notification-v2.service';

// Mock Twilio
const mockTwilioCreate = jest.fn();

jest.mock('twilio', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: mockTwilioCreate,
    },
  }));
});

// Mock Prisma enums and PrismaClient (needed because PrismaService extends PrismaClient)
jest.mock('@prisma/client', () => {
  class PrismaClient {
    $connect(): Promise<void> { return Promise.resolve(); }
    $disconnect(): Promise<void> { return Promise.resolve(); }
  }
  return {
    PrismaClient,
    NotificationType: {
      BOOKING_REMINDER: 'BOOKING_REMINDER',
      BOOKING_CONFIRMATION: 'BOOKING_CONFIRMATION',
      STATUS_UPDATE: 'STATUS_UPDATE',
      INVOICE_READY: 'INVOICE_READY',
      MAINTENANCE_DUE: 'MAINTENANCE_DUE',
      INSPECTION_COMPLETE: 'INSPECTION_COMPLETE',
      PAYMENT_REMINDER: 'PAYMENT_REMINDER',
    },
    NotificationChannel: {
      SMS: 'SMS',
      WHATSAPP: 'WHATSAPP',
      EMAIL: 'EMAIL',
    },
    NotificationStatus: {
      PENDING: 'PENDING',
      SENT: 'SENT',
      DELIVERED: 'DELIVERED',
      FAILED: 'FAILED',
    },
  };
});

describe('NotificationV2Service', () => {
  let service: NotificationV2Service;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;
  let configService: ConfigService;

  const mockTenantId = 'tenant-uuid-1';
  const mockCustomerId = 'customer-uuid-1';
  const mockNotificationId = 'notif-uuid-1';

  const mockCustomer = {
    id: mockCustomerId,
    encryptedFirstName: 'Mario',
    encryptedLastName: 'Rossi',
    encryptedPhone: '+393331234567',
    encryptedEmail: 'mario@example.com',
    tenantId: mockTenantId,
  };

  const mockNotification = {
    id: mockNotificationId,
    customerId: mockCustomerId,
    tenantId: mockTenantId,
    type: 'BOOKING_CONFIRMATION',
    channel: 'SMS',
    status: 'PENDING',
    message: 'Test message',
    messageId: null,
    metadata: {},
    retries: 0,
    maxRetries: 3,
    sentAt: null,
    deliveredAt: null,
    failedAt: null,
    error: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    customer: mockCustomer,
  };

  const defaultConfig: Record<string, string | boolean | number> = {
    TWILIO_ACCOUNT_SID: 'test-sid',
    TWILIO_AUTH_TOKEN: 'test-token',
    TWILIO_PHONE_NUMBER: '+15551234567',
    TWILIO_WHATSAPP_NUMBER: '+15551234567',
    ENABLE_SMS_NOTIFICATIONS: true,
    TWILIO_STATUS_CALLBACK_URL: 'https://mechmind.io/webhooks/twilio',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationV2Service,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(
              (key: string, defaultValue?: string | boolean | number) =>
                defaultConfig[key] ?? defaultValue,
            ),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            customer: {
              findUnique: jest.fn(),
            },
            notification: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              count: jest.fn(),
              fields: {
                maxRetries: 'maxRetries',
              },
            },
            customerNotificationPreference: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              upsert: jest.fn(),
            },
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationV2Service>(NotificationV2Service);
    prisma = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // sendSMS()
  // =========================================================================
  describe('sendSMS', () => {
    it('should send SMS via Twilio and return SID', async () => {
      mockTwilioCreate.mockResolvedValue({ sid: 'SM-TEST-123' });

      const result = await service.sendSMS('+393331234567', 'Test message');

      expect(result).toBe('SM-TEST-123');
      expect(mockTwilioCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '+15551234567',
          to: '+393331234567',
          body: 'Test message',
        }),
      );
    });

    it('should throw on invalid phone number format', async () => {
      // '+' alone stripped to empty digits becomes '+39' which is too short
      // Use a number that produces a truly invalid E.164 result
      await expect(
        service.sendSMS('+', 'Test message'),
      ).rejects.toThrow('Invalid phone number format');
    });

    it('should throw when Twilio fails', async () => {
      mockTwilioCreate.mockRejectedValue(new Error('Twilio error'));

      await expect(
        service.sendSMS('+393331234567', 'Test message'),
      ).rejects.toThrow('Twilio error');
    });

    it('should format phone numbers starting with 0', async () => {
      mockTwilioCreate.mockResolvedValue({ sid: 'SM-FMT-1' });

      await service.sendSMS('021234567', 'Test');

      expect(mockTwilioCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+39021234567',
        }),
      );
    });
  });

  // =========================================================================
  // sendWhatsApp()
  // =========================================================================
  describe('sendWhatsApp', () => {
    it('should send WhatsApp message via Twilio', async () => {
      mockTwilioCreate.mockResolvedValue({ sid: 'WA-TEST-123' });

      const result = await service.sendWhatsApp(
        '+393331234567',
        'WhatsApp test',
      );

      expect(result).toBe('WA-TEST-123');
      expect(mockTwilioCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'whatsapp:+15551234567',
          to: 'whatsapp:+393331234567',
          body: 'WhatsApp test',
        }),
      );
    });

    it('should throw on invalid phone number', async () => {
      await expect(
        service.sendWhatsApp('+', 'Test'),
      ).rejects.toThrow('Invalid phone number format');
    });
  });

  // =========================================================================
  // queueNotification()
  // =========================================================================
  describe('queueNotification', () => {
    it('should create a pending notification record', async () => {
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(
        mockCustomer,
      );
      (prisma.notification.create as jest.Mock).mockResolvedValue(
        mockNotification,
      );

      const dto: CreateNotificationDTO = {
        customerId: mockCustomerId,
        tenantId: mockTenantId,
        type: 'BOOKING_CONFIRMATION' as never,
        channel: 'SMS' as never,
        message: 'Test notification',
      };

      const result = await service.queueNotification(dto);

      expect(result.id).toBe(mockNotificationId);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          customerId: mockCustomerId,
          tenantId: mockTenantId,
          status: 'PENDING',
        }),
      });
    });

    it('should emit notification.queued event', async () => {
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(
        mockCustomer,
      );
      (prisma.notification.create as jest.Mock).mockResolvedValue(
        mockNotification,
      );

      await service.queueNotification({
        customerId: mockCustomerId,
        tenantId: mockTenantId,
        type: 'BOOKING_CONFIRMATION' as never,
        channel: 'SMS' as never,
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'notification.queued',
        expect.objectContaining({ id: mockNotificationId }),
      );
    });

    it('should throw when customer is not found and no message provided', async () => {
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.queueNotification({
          customerId: 'nonexistent',
          tenantId: mockTenantId,
          type: 'BOOKING_CONFIRMATION' as never,
          channel: 'SMS' as never,
        }),
      ).rejects.toThrow('Customer nonexistent not found');
    });

    it('should include tenantId in created notification', async () => {
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(
        mockCustomer,
      );
      (prisma.notification.create as jest.Mock).mockResolvedValue(
        mockNotification,
      );

      await service.queueNotification({
        customerId: mockCustomerId,
        tenantId: mockTenantId,
        type: 'BOOKING_CONFIRMATION' as never,
        channel: 'SMS' as never,
        message: 'Test',
      });

      const createData = (prisma.notification.create as jest.Mock).mock
        .calls[0][0].data;
      expect(createData.tenantId).toBe(mockTenantId);
    });
  });

  // =========================================================================
  // sendImmediate()
  // =========================================================================
  describe('sendImmediate', () => {
    it('should send SMS notification immediately', async () => {
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(
        mockCustomer,
      );
      (prisma.customerNotificationPreference.findUnique as jest.Mock)
        .mockResolvedValue(null);
      (prisma.notification.create as jest.Mock).mockResolvedValue({
        ...mockNotification,
        status: 'SENT',
      });
      mockTwilioCreate.mockResolvedValue({ sid: 'SM-IMM-1' });

      const result = await service.sendImmediate({
        customerId: mockCustomerId,
        tenantId: mockTenantId,
        type: 'BOOKING_CONFIRMATION' as never,
        channel: 'SMS' as never,
        message: 'Immediate test',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('SM-IMM-1');
    });

    it('should return failure when customer is not found', async () => {
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.sendImmediate({
        customerId: 'nonexistent',
        tenantId: mockTenantId,
        type: 'BOOKING_CONFIRMATION' as never,
        channel: 'SMS' as never,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Customer not found');
    });

    it('should respect customer channel preference when disabled', async () => {
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(
        mockCustomer,
      );
      (prisma.customerNotificationPreference.findUnique as jest.Mock)
        .mockResolvedValue({ enabled: false });

      const result = await service.sendImmediate({
        customerId: mockCustomerId,
        tenantId: mockTenantId,
        type: 'BOOKING_CONFIRMATION' as never,
        channel: 'SMS' as never,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Channel disabled by customer preference');
    });

    it('should send WhatsApp notification when channel is WHATSAPP', async () => {
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(
        mockCustomer,
      );
      (prisma.customerNotificationPreference.findUnique as jest.Mock)
        .mockResolvedValue(null);
      (prisma.notification.create as jest.Mock).mockResolvedValue({
        ...mockNotification,
        channel: 'WHATSAPP',
      });
      mockTwilioCreate.mockResolvedValue({ sid: 'WA-IMM-1' });

      const result = await service.sendImmediate({
        customerId: mockCustomerId,
        tenantId: mockTenantId,
        type: 'BOOKING_CONFIRMATION' as never,
        channel: 'WHATSAPP' as never,
        message: 'WhatsApp immediate',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('WA-IMM-1');
    });

    it('should return failure for unsupported channel', async () => {
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(
        mockCustomer,
      );
      (prisma.customerNotificationPreference.findUnique as jest.Mock)
        .mockResolvedValue(null);
      (prisma.notification.create as jest.Mock).mockResolvedValue(
        mockNotification,
      );

      const result = await service.sendImmediate({
        customerId: mockCustomerId,
        tenantId: mockTenantId,
        type: 'BOOKING_CONFIRMATION' as never,
        channel: 'EMAIL' as never,
        message: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unsupported channel');
    });

    it('should create failed notification record on error', async () => {
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(
        mockCustomer,
      );
      (prisma.customerNotificationPreference.findUnique as jest.Mock)
        .mockResolvedValue(null);
      (prisma.notification.create as jest.Mock).mockResolvedValue({
        ...mockNotification,
        status: 'FAILED',
      });
      mockTwilioCreate.mockRejectedValue(new Error('Twilio failure'));

      const result = await service.sendImmediate({
        customerId: mockCustomerId,
        tenantId: mockTenantId,
        type: 'BOOKING_CONFIRMATION' as never,
        channel: 'SMS' as never,
        message: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Twilio failure');
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'FAILED',
          error: 'Twilio failure',
        }),
      });
    });

    it('should emit notification.sent event on success', async () => {
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(
        mockCustomer,
      );
      (prisma.customerNotificationPreference.findUnique as jest.Mock)
        .mockResolvedValue(null);
      (prisma.notification.create as jest.Mock).mockResolvedValue({
        ...mockNotification,
        status: 'SENT',
      });
      mockTwilioCreate.mockResolvedValue({ sid: 'SM-EVT-1' });

      await service.sendImmediate({
        customerId: mockCustomerId,
        tenantId: mockTenantId,
        type: 'BOOKING_CONFIRMATION' as never,
        channel: 'SMS' as never,
        message: 'Test',
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'notification.sent',
        expect.objectContaining({ status: 'SENT' }),
      );
    });
  });

  // =========================================================================
  // sendBatch()
  // =========================================================================
  describe('sendBatch', () => {
    it('should send multiple notifications and return results', async () => {
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(
        mockCustomer,
      );
      (prisma.customerNotificationPreference.findUnique as jest.Mock)
        .mockResolvedValue(null);
      (prisma.notification.create as jest.Mock).mockResolvedValue({
        ...mockNotification,
        status: 'SENT',
      });
      mockTwilioCreate.mockResolvedValue({ sid: 'SM-BATCH-1' });

      const notifications: CreateNotificationDTO[] = [
        {
          customerId: mockCustomerId,
          tenantId: mockTenantId,
          type: 'BOOKING_CONFIRMATION' as never,
          channel: 'SMS' as never,
          message: 'Batch 1',
        },
        {
          customerId: mockCustomerId,
          tenantId: mockTenantId,
          type: 'BOOKING_REMINDER' as never,
          channel: 'SMS' as never,
          message: 'Batch 2',
        },
      ];

      const results = await service.sendBatch(notifications);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });
  });

  // =========================================================================
  // Template methods
  // =========================================================================
  describe('template methods', () => {
    it('should generate Italian message from template', () => {
      const message = service.generateMessage(
        'BOOKING_CONFIRMATION' as never,
        'it',
        {
          customerName: 'Mario',
          date: '15/03/2024',
          time: '14:30',
          workshopName: 'Officina Test',
          bookingCode: 'BK-001',
        },
      );

      expect(message).toContain('Mario');
      expect(message).toContain('15/03/2024');
      expect(message).toContain('14:30');
      expect(message).toContain('confermato');
    });

    it('should generate English message from template', () => {
      const message = service.generateMessage(
        'BOOKING_CONFIRMATION' as never,
        'en',
        {
          customerName: 'Mario',
          date: '2024-03-15',
          time: '14:30',
          workshopName: 'Test Workshop',
          bookingCode: 'BK-001',
        },
      );

      expect(message).toContain('Mario');
      expect(message).toContain('confirmed');
    });

    it('should return Italian templates for all notification types', () => {
      const types = [
        'BOOKING_REMINDER',
        'BOOKING_CONFIRMATION',
        'STATUS_UPDATE',
        'INVOICE_READY',
        'MAINTENANCE_DUE',
        'INSPECTION_COMPLETE',
        'PAYMENT_REMINDER',
      ];

      for (const type of types) {
        const template = service.getTemplate(type as never, 'it');
        expect(typeof template).toBe('function');
        const message = template({ customerName: 'Test' });
        expect(message.length).toBeGreaterThan(0);
      }
    });

    it('should return English templates for all notification types', () => {
      const types = [
        'BOOKING_REMINDER',
        'BOOKING_CONFIRMATION',
        'STATUS_UPDATE',
        'INVOICE_READY',
        'MAINTENANCE_DUE',
        'INSPECTION_COMPLETE',
        'PAYMENT_REMINDER',
      ];

      for (const type of types) {
        const template = service.getTemplate(type as never, 'en');
        expect(typeof template).toBe('function');
        const message = template({ customerName: 'Test' });
        expect(message.length).toBeGreaterThan(0);
      }
    });

    it('should fallback to STATUS_UPDATE template for unknown type', () => {
      const template = service.getTemplate('UNKNOWN_TYPE' as never, 'it');
      expect(typeof template).toBe('function');
    });

    it('should return available templates with metadata', () => {
      const templates = service.getAvailableTemplates();

      expect(templates.length).toBeGreaterThanOrEqual(7);
      expect(templates[0]).toHaveProperty('type');
      expect(templates[0]).toHaveProperty('name');
      expect(templates[0]).toHaveProperty('description');
    });
  });

  // =========================================================================
  // updateStatus()
  // =========================================================================
  describe('updateStatus', () => {
    it('should map Twilio delivered status correctly', async () => {
      (prisma.notification.updateMany as jest.Mock).mockResolvedValue({
        count: 1,
      });

      await service.updateStatus('SM-123', 'delivered');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { messageId: 'SM-123' },
        data: expect.objectContaining({
          status: 'DELIVERED',
          deliveredAt: expect.any(Date),
        }),
      });
    });

    it('should map Twilio sent status correctly', async () => {
      (prisma.notification.updateMany as jest.Mock).mockResolvedValue({
        count: 1,
      });

      await service.updateStatus('SM-123', 'sent');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { messageId: 'SM-123' },
        data: expect.objectContaining({
          status: 'SENT',
        }),
      });
    });

    it('should map Twilio failed status correctly', async () => {
      (prisma.notification.updateMany as jest.Mock).mockResolvedValue({
        count: 1,
      });

      await service.updateStatus('SM-123', 'failed');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { messageId: 'SM-123' },
        data: expect.objectContaining({
          status: 'FAILED',
        }),
      });
    });

    it('should map Twilio read status to DELIVERED', async () => {
      (prisma.notification.updateMany as jest.Mock).mockResolvedValue({
        count: 1,
      });

      await service.updateStatus('WA-123', 'read');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { messageId: 'WA-123' },
        data: expect.objectContaining({
          status: 'DELIVERED',
        }),
      });
    });

    it('should map unknown status to PENDING', async () => {
      (prisma.notification.updateMany as jest.Mock).mockResolvedValue({
        count: 1,
      });

      await service.updateStatus('SM-123', 'unknown_status');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { messageId: 'SM-123' },
        data: expect.objectContaining({
          status: 'PENDING',
        }),
      });
    });
  });

  // =========================================================================
  // retryNotification()
  // =========================================================================
  describe('retryNotification', () => {
    it('should return failure when notification is not found', async () => {
      (prisma.notification.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.retryNotification('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Notification not found');
    });

    it('should return failure when max retries exceeded', async () => {
      (prisma.notification.findUnique as jest.Mock).mockResolvedValue({
        ...mockNotification,
        retries: 3,
        maxRetries: 3,
      });

      const result = await service.retryNotification(mockNotificationId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Max retries exceeded');
    });

    it('should increment retries and re-process', async () => {
      (prisma.notification.findUnique as jest.Mock).mockResolvedValue({
        ...mockNotification,
        retries: 1,
        maxRetries: 3,
      });
      (prisma.notification.update as jest.Mock).mockResolvedValue(
        mockNotification,
      );
      mockTwilioCreate.mockResolvedValue({ sid: 'SM-RETRY-1' });

      const result = await service.retryNotification(mockNotificationId);

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: mockNotificationId },
        data: expect.objectContaining({
          status: 'PENDING',
          retries: { increment: 1 },
          error: null,
        }),
      });
    });
  });

  // =========================================================================
  // getHistory()
  // =========================================================================
  describe('getHistory', () => {
    it('should return notification history for customer', async () => {
      const mockNotifications = [mockNotification];
      (prisma.notification.findMany as jest.Mock).mockResolvedValue(
        mockNotifications,
      );
      (prisma.notification.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getHistory(mockCustomerId);

      expect(result.notifications).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { customerId: mockCustomerId },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should apply limit and offset options', async () => {
      (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.notification.count as jest.Mock).mockResolvedValue(0);

      await service.getHistory(mockCustomerId, {
        limit: 10,
        offset: 20,
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });

    it('should filter by notification type when specified', async () => {
      (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.notification.count as jest.Mock).mockResolvedValue(0);

      await service.getHistory(mockCustomerId, {
        type: 'BOOKING_REMINDER' as never,
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            customerId: mockCustomerId,
            type: 'BOOKING_REMINDER',
          },
        }),
      );
    });
  });

  // =========================================================================
  // getPreferences()
  // =========================================================================
  describe('getPreferences', () => {
    it('should return preferences for all channels', async () => {
      (prisma.customerNotificationPreference.findMany as jest.Mock)
        .mockResolvedValue([
          { channel: 'SMS', enabled: true },
          { channel: 'WHATSAPP', enabled: false },
        ]);

      const result = await service.getPreferences(mockCustomerId);

      expect(result).toHaveLength(3); // SMS, WHATSAPP, EMAIL
      const smsPref = result.find((p) => p.channel === 'SMS');
      expect(smsPref?.enabled).toBe(true);
      const whatsappPref = result.find((p) => p.channel === 'WHATSAPP');
      expect(whatsappPref?.enabled).toBe(false);
      const emailPref = result.find((p) => p.channel === 'EMAIL');
      expect(emailPref?.enabled).toBe(true); // default
    });
  });

  // =========================================================================
  // updatePreference()
  // =========================================================================
  describe('updatePreference', () => {
    it('should upsert customer notification preference', async () => {
      (prisma.customerNotificationPreference.upsert as jest.Mock)
        .mockResolvedValue({});

      await service.updatePreference(mockCustomerId, 'SMS' as never, false);

      expect(prisma.customerNotificationPreference.upsert).toHaveBeenCalledWith(
        {
          where: {
            customerId_channel: {
              customerId: mockCustomerId,
              channel: 'SMS',
            },
          },
          update: { enabled: false },
          create: {
            customerId: mockCustomerId,
            channel: 'SMS',
            enabled: false,
          },
        },
      );
    });
  });

  // =========================================================================
  // When Twilio is not configured
  // =========================================================================
  describe('when Twilio is not configured', () => {
    let devService: NotificationV2Service;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          NotificationV2Service,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(
                (key: string, defaultValue?: string | boolean | number) => {
                  const config: Record<string, string | boolean> = {
                    TWILIO_ACCOUNT_SID: '',
                    TWILIO_AUTH_TOKEN: '',
                    TWILIO_PHONE_NUMBER: '',
                    ENABLE_SMS_NOTIFICATIONS: false,
                  };
                  return config[key] ?? defaultValue;
                },
              ),
            },
          },
          {
            provide: PrismaService,
            useValue: {
              customer: { findUnique: jest.fn() },
              notification: {
                create: jest.fn(),
                findUnique: jest.fn(),
                findMany: jest.fn(),
                update: jest.fn(),
                updateMany: jest.fn(),
                count: jest.fn(),
                fields: { maxRetries: 'maxRetries' },
              },
              customerNotificationPreference: {
                findUnique: jest.fn(),
                findMany: jest.fn(),
                upsert: jest.fn(),
              },
            },
          },
          {
            provide: EventEmitter2,
            useValue: { emit: jest.fn() },
          },
        ],
      }).compile();

      devService = module.get<NotificationV2Service>(NotificationV2Service);
    });

    it('should return mock SMS ID in dev mode', async () => {
      const result = await devService.sendSMS('+393331234567', 'Dev test');

      expect(result).toContain('mock-sms-id-');
    });

    it('should return mock WhatsApp ID in dev mode', async () => {
      const result = await devService.sendWhatsApp(
        '+393331234567',
        'Dev WhatsApp test',
      );

      expect(result).toContain('mock-whatsapp-id-');
    });
  });
});
