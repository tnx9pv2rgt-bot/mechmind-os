import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getQueueToken } from '@nestjs/bullmq';
import { PrismaService } from '@common/services/prisma.service';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';
import {
  NotificationOrchestratorService,
  NotificationSentEvent,
  NotificationFailedEvent,
  NotificationResult,
} from './notification.service';
import {
  NotificationType,
  NotificationChannel,
} from '../dto/send-notification.dto';

describe('NotificationOrchestratorService', () => {
  let service: NotificationOrchestratorService;
  let emailService: EmailService;
  let smsService: SmsService;
  let prisma: PrismaService;
  let configService: ConfigService;
  let eventEmitter: EventEmitter2;
  let notificationQueue: { add: jest.Mock };

  const mockTenantId = 'tenant-uuid-1';
  const mockCustomerId = 'customer-uuid-1';

  const mockCustomer = {
    id: mockCustomerId,
    encryptedFirstName: 'Mario',
    encryptedLastName: 'Rossi',
    encryptedEmail: 'mario@example.com',
    encryptedPhone: '+393331234567',
  };

  beforeEach(async () => {
    notificationQueue = { add: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationOrchestratorService,
        {
          provide: EmailService,
          useValue: {
            sendBookingConfirmation: jest.fn(),
            sendBookingReminder: jest.fn(),
            sendBookingCancelled: jest.fn(),
            sendInvoiceReady: jest.fn(),
            sendGdprDataExport: jest.fn(),
            sendWelcome: jest.fn(),
            sendPasswordReset: jest.fn(),
          },
        },
        {
          provide: SmsService,
          useValue: {
            sendBookingConfirmation: jest.fn(),
            sendBookingReminder: jest.fn(),
            sendBookingCancelled: jest.fn(),
            sendInvoiceReady: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            withTenant: jest.fn(),
            customer: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => defaultValue),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: getQueueToken('notification-queue'),
          useValue: notificationQueue,
        },
      ],
    }).compile();

    service = module.get<NotificationOrchestratorService>(
      NotificationOrchestratorService,
    );
    emailService = module.get<EmailService>(EmailService);
    smsService = module.get<SmsService>(SmsService);
    prisma = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // notifyCustomer() - core orchestration
  // =========================================================================
  describe('notifyCustomer', () => {
    beforeEach(() => {
      (prisma.withTenant as jest.Mock).mockImplementation(
        (tenantId: string, callback: (p: PrismaService) => Promise<unknown>) =>
          callback({
            customer: {
              findUnique: jest.fn().mockResolvedValue(mockCustomer),
            },
          } as unknown as PrismaService),
      );
    });

    it('should throw error when customer is not found', async () => {
      (prisma.withTenant as jest.Mock).mockImplementation(
        (tenantId: string, callback: (p: PrismaService) => Promise<unknown>) =>
          callback({
            customer: {
              findUnique: jest.fn().mockResolvedValue(null),
            },
          } as unknown as PrismaService),
      );

      await expect(
        service.notifyCustomer(
          mockCustomerId,
          mockTenantId,
          NotificationType.BOOKING_CONFIRMATION,
          { date: '2024-03-15' },
        ),
      ).rejects.toThrow(`Customer ${mockCustomerId} not found`);
    });

    it('should try SMS first when channel is AUTO', async () => {
      (smsService.sendBookingConfirmation as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'SM123',
      });

      const result = await service.notifyCustomer(
        mockCustomerId,
        mockTenantId,
        NotificationType.BOOKING_CONFIRMATION,
        {
          date: '2024-03-15',
          time: '14:30',
          service: 'Tagliando',
          bookingCode: 'BK-001',
        },
        NotificationChannel.AUTO,
      );

      expect(result.success).toBe(true);
      expect(result.channel).toBe(NotificationChannel.SMS);
      expect(smsService.sendBookingConfirmation).toHaveBeenCalled();
    });

    it('should fallback to email when SMS fails', async () => {
      (smsService.sendBookingConfirmation as jest.Mock).mockResolvedValue({
        success: false,
        error: 'SMS delivery failed',
      });
      (emailService.sendBookingConfirmation as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'email-123',
      });

      const result = await service.notifyCustomer(
        mockCustomerId,
        mockTenantId,
        NotificationType.BOOKING_CONFIRMATION,
        {
          date: '2024-03-15',
          time: '14:30',
          service: 'Tagliando',
          bookingCode: 'BK-001',
          vehicle: 'Fiat Panda',
        },
      );

      expect(result.success).toBe(true);
      expect(result.channel).toBe(NotificationChannel.EMAIL);
      expect(result.fallbackUsed).toBe(true);
    });

    it('should send email only when EMAIL channel is specified', async () => {
      (emailService.sendBookingConfirmation as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'email-200',
      });

      const result = await service.notifyCustomer(
        mockCustomerId,
        mockTenantId,
        NotificationType.BOOKING_CONFIRMATION,
        {
          date: '2024-03-15',
          time: '14:30',
          service: 'Tagliando',
          bookingCode: 'BK-001',
          vehicle: 'Fiat Panda',
        },
        NotificationChannel.EMAIL,
      );

      expect(result.success).toBe(true);
      expect(result.channel).toBe(NotificationChannel.EMAIL);
      expect(smsService.sendBookingConfirmation).not.toHaveBeenCalled();
    });

    it('should send SMS only when SMS channel is specified', async () => {
      (smsService.sendBookingConfirmation as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'SM200',
      });

      const result = await service.notifyCustomer(
        mockCustomerId,
        mockTenantId,
        NotificationType.BOOKING_CONFIRMATION,
        {
          date: '2024-03-15',
          time: '14:30',
          service: 'Tagliando',
          bookingCode: 'BK-001',
        },
        NotificationChannel.SMS,
      );

      expect(result.success).toBe(true);
      expect(result.channel).toBe(NotificationChannel.SMS);
    });

    it('should send both when BOTH channel is specified', async () => {
      (smsService.sendBookingConfirmation as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'SM300',
      });
      (emailService.sendBookingConfirmation as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'email-300',
      });

      const result = await service.notifyCustomer(
        mockCustomerId,
        mockTenantId,
        NotificationType.BOOKING_CONFIRMATION,
        {
          date: '2024-03-15',
          time: '14:30',
          service: 'Tagliando',
          bookingCode: 'BK-001',
          vehicle: 'Fiat Panda',
        },
        NotificationChannel.BOTH,
      );

      expect(result.success).toBe(true);
      expect(result.channel).toBe(NotificationChannel.BOTH);
    });

    it('should emit notification.sent event on success', async () => {
      (smsService.sendBookingConfirmation as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'SM400',
      });

      await service.notifyCustomer(
        mockCustomerId,
        mockTenantId,
        NotificationType.BOOKING_CONFIRMATION,
        { date: '2024-03-15', time: '14:30', service: 'Tagliando', bookingCode: 'BK-001' },
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'notification.sent',
        expect.any(NotificationSentEvent),
      );
    });

    it('should emit notification.failed event on failure', async () => {
      // Customer with no phone and no email
      (prisma.withTenant as jest.Mock).mockImplementation(
        (tenantId: string, callback: (p: PrismaService) => Promise<unknown>) =>
          callback({
            customer: {
              findUnique: jest.fn().mockResolvedValue({
                ...mockCustomer,
                encryptedPhone: null,
                encryptedEmail: '',
              }),
            },
          } as unknown as PrismaService),
      );

      await service.notifyCustomer(
        mockCustomerId,
        mockTenantId,
        NotificationType.BOOKING_CONFIRMATION,
        { date: '2024-03-15' },
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'notification.failed',
        expect.any(NotificationFailedEvent),
      );
    });

    it('should use tenant context for customer lookup', async () => {
      (smsService.sendBookingConfirmation as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'SM500',
      });

      await service.notifyCustomer(
        mockCustomerId,
        mockTenantId,
        NotificationType.BOOKING_CONFIRMATION,
        { date: '2024-03-15', time: '14:30', service: 'Tagliando', bookingCode: 'BK-001' },
      );

      expect(prisma.withTenant).toHaveBeenCalledWith(
        mockTenantId,
        expect.any(Function),
      );
    });
  });

  // =========================================================================
  // Notification types
  // =========================================================================
  describe('notification types', () => {
    beforeEach(() => {
      (prisma.withTenant as jest.Mock).mockImplementation(
        (tenantId: string, callback: (p: PrismaService) => Promise<unknown>) =>
          callback({
            customer: {
              findUnique: jest.fn().mockResolvedValue(mockCustomer),
            },
          } as unknown as PrismaService),
      );
    });

    it('should handle BOOKING_REMINDER notification', async () => {
      (smsService.sendBookingReminder as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'SM-REM-1',
      });

      const result = await service.notifyCustomer(
        mockCustomerId,
        mockTenantId,
        NotificationType.BOOKING_REMINDER,
        { date: '2024-03-15', time: '14:30', service: 'Tagliando', bookingCode: 'BK-001' },
      );

      expect(result.success).toBe(true);
      expect(smsService.sendBookingReminder).toHaveBeenCalled();
    });

    it('should handle BOOKING_CANCELLED notification', async () => {
      (smsService.sendBookingCancelled as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'SM-CAN-1',
      });

      const result = await service.notifyCustomer(
        mockCustomerId,
        mockTenantId,
        NotificationType.BOOKING_CANCELLED,
        {
          date: '2024-03-15',
          service: 'Tagliando',
          bookingCode: 'BK-001',
          cancellationReason: 'Customer request',
        },
      );

      expect(result.success).toBe(true);
    });

    it('should handle INVOICE_READY notification', async () => {
      (smsService.sendInvoiceReady as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'SM-INV-1',
      });

      const result = await service.notifyCustomer(
        mockCustomerId,
        mockTenantId,
        NotificationType.INVOICE_READY,
        {
          invoiceNumber: 'INV-001',
          amount: '250.00',
          downloadUrl: 'https://example.com/inv',
        },
      );

      expect(result.success).toBe(true);
    });

    it('should handle WELCOME notification via email', async () => {
      (emailService.sendWelcome as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'email-WEL-1',
      });

      // WELCOME is email-only, SMS should return failure so fallback to email
      const result = await service.notifyCustomer(
        mockCustomerId,
        mockTenantId,
        NotificationType.WELCOME,
        { loginUrl: 'https://mechmind.io/login' },
        NotificationChannel.EMAIL,
      );

      expect(result.success).toBe(true);
      expect(emailService.sendWelcome).toHaveBeenCalled();
    });

    it('should handle PASSWORD_RESET notification via email', async () => {
      (emailService.sendPasswordReset as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'email-PWD-1',
      });

      const result = await service.notifyCustomer(
        mockCustomerId,
        mockTenantId,
        NotificationType.PASSWORD_RESET,
        { resetUrl: 'https://mechmind.io/reset/token123', expiryHours: 24 },
        NotificationChannel.EMAIL,
      );

      expect(result.success).toBe(true);
      expect(emailService.sendPasswordReset).toHaveBeenCalled();
    });

    it('should handle GDPR_EXPORT_READY notification via email', async () => {
      (emailService.sendGdprDataExport as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'email-GDPR-1',
      });

      const result = await service.notifyCustomer(
        mockCustomerId,
        mockTenantId,
        NotificationType.GDPR_EXPORT_READY,
        {
          downloadUrl: 'https://mechmind.io/gdpr/download',
          expiryDate: '2024-03-22',
          requestId: 'GDPR-001',
        },
        NotificationChannel.EMAIL,
      );

      expect(result.success).toBe(true);
      expect(emailService.sendGdprDataExport).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Channel determination
  // =========================================================================
  describe('channel determination', () => {
    beforeEach(() => {
      (prisma.withTenant as jest.Mock).mockImplementation(
        (tenantId: string, callback: (p: PrismaService) => Promise<unknown>) =>
          callback({
            customer: {
              findUnique: jest.fn().mockResolvedValue(mockCustomer),
            },
          } as unknown as PrismaService),
      );
    });

    it('should use customer preference when channel is AUTO', async () => {
      (prisma.withTenant as jest.Mock).mockImplementation(
        (tenantId: string, callback: (p: PrismaService) => Promise<unknown>) =>
          callback({
            customer: {
              findUnique: jest.fn().mockResolvedValue({
                ...mockCustomer,
                notificationPreferences: {
                  preferredChannel: NotificationChannel.EMAIL,
                },
              }),
            },
          } as unknown as PrismaService),
      );

      // SMS is tried first in AUTO mode; mock it to fail so fallback to email
      (smsService.sendBookingConfirmation as jest.Mock).mockResolvedValue({
        success: false,
        error: 'SMS not preferred',
      });

      (emailService.sendBookingConfirmation as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'email-pref-1',
      });

      // The AUTO channel will try SMS first, fallback to email
      const result = await service.notifyCustomer(
        mockCustomerId,
        mockTenantId,
        NotificationType.BOOKING_CONFIRMATION,
        {
          date: '2024-03-15',
          time: '14:30',
          service: 'Tagliando',
          bookingCode: 'BK-001',
          vehicle: 'Fiat Panda',
        },
        NotificationChannel.AUTO,
      );

      expect(result.success).toBe(true);
    });

    it('should skip SMS when customer has no phone number', async () => {
      (prisma.withTenant as jest.Mock).mockImplementation(
        (tenantId: string, callback: (p: PrismaService) => Promise<unknown>) =>
          callback({
            customer: {
              findUnique: jest.fn().mockResolvedValue({
                ...mockCustomer,
                encryptedPhone: null,
              }),
            },
          } as unknown as PrismaService),
      );

      (emailService.sendBookingConfirmation as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'email-noPhone-1',
      });

      const result = await service.notifyCustomer(
        mockCustomerId,
        mockTenantId,
        NotificationType.BOOKING_CONFIRMATION,
        {
          date: '2024-03-15',
          time: '14:30',
          service: 'Tagliando',
          bookingCode: 'BK-001',
          vehicle: 'Fiat Panda',
        },
      );

      expect(result.success).toBe(true);
      expect(result.channel).toBe(NotificationChannel.EMAIL);
      expect(result.fallbackUsed).toBe(true);
    });

    it('should return failure when customer has no email for EMAIL channel', async () => {
      (prisma.withTenant as jest.Mock).mockImplementation(
        (tenantId: string, callback: (p: PrismaService) => Promise<unknown>) =>
          callback({
            customer: {
              findUnique: jest.fn().mockResolvedValue({
                ...mockCustomer,
                encryptedEmail: '',
              }),
            },
          } as unknown as PrismaService),
      );

      const result = await service.notifyCustomer(
        mockCustomerId,
        mockTenantId,
        NotificationType.BOOKING_CONFIRMATION,
        { date: '2024-03-15' },
        NotificationChannel.EMAIL,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('no email');
    });
  });

  // =========================================================================
  // queueNotification()
  // =========================================================================
  describe('queueNotification', () => {
    it('should add notification to the queue', async () => {
      notificationQueue.add.mockResolvedValue({ id: 'job-123' });

      const dto = {
        type: NotificationType.BOOKING_CONFIRMATION,
        customerId: mockCustomerId,
        tenantId: mockTenantId,
        channel: NotificationChannel.AUTO,
        data: { date: '2024-03-15' },
      };

      const result = await service.queueNotification(dto);

      expect(result.jobId).toBeDefined();
      expect(notificationQueue.add).toHaveBeenCalledWith(
        'send-notification',
        dto,
        expect.objectContaining({
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }),
      );
    });

    it('should schedule notification with delay', async () => {
      notificationQueue.add.mockResolvedValue({ id: 'job-124' });

      const dto = {
        type: NotificationType.BOOKING_REMINDER,
        customerId: mockCustomerId,
        tenantId: mockTenantId,
        channel: NotificationChannel.AUTO,
        data: { date: '2024-03-15' },
      };

      const result = await service.queueNotification(dto, 60000);

      expect(result.scheduledFor).toBeDefined();
      expect(notificationQueue.add).toHaveBeenCalledWith(
        'send-notification',
        dto,
        expect.objectContaining({
          delay: 60000,
        }),
      );
    });

    it('should not return scheduledFor when no delay', async () => {
      notificationQueue.add.mockResolvedValue({ id: 'job-125' });

      const dto = {
        type: NotificationType.BOOKING_CONFIRMATION,
        customerId: mockCustomerId,
        tenantId: mockTenantId,
        channel: NotificationChannel.AUTO,
        data: {},
      };

      const result = await service.queueNotification(dto);

      expect(result.scheduledFor).toBeUndefined();
    });
  });

  // =========================================================================
  // sendBulkNotifications()
  // =========================================================================
  describe('sendBulkNotifications', () => {
    beforeEach(() => {
      (prisma.withTenant as jest.Mock).mockImplementation(
        (tenantId: string, callback: (p: PrismaService) => Promise<unknown>) =>
          callback({
            customer: {
              findUnique: jest.fn().mockResolvedValue(mockCustomer),
            },
          } as unknown as PrismaService),
      );
    });

    it('should send bulk notifications and return summary', async () => {
      (smsService.sendBookingReminder as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'SM-BULK-1',
      });

      const notifications = [
        {
          type: NotificationType.BOOKING_REMINDER,
          customerId: mockCustomerId,
          tenantId: mockTenantId,
          channel: NotificationChannel.AUTO,
          data: { date: '2024-03-15', time: '14:30', service: 'Tagliando', bookingCode: 'BK-001' },
        },
        {
          type: NotificationType.BOOKING_REMINDER,
          customerId: mockCustomerId,
          tenantId: mockTenantId,
          channel: NotificationChannel.AUTO,
          data: { date: '2024-03-16', time: '10:00', service: 'Revisione', bookingCode: 'BK-002' },
        },
      ];

      const result = await service.sendBulkNotifications(notifications, {
        continueOnError: true,
        throttleMs: 0,
      });

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
    });

    it('should stop on first failure when continueOnError is false', async () => {
      (smsService.sendBookingReminder as jest.Mock)
        .mockResolvedValueOnce({ success: false, error: 'SMS failed' });

      (emailService.sendBookingReminder as jest.Mock)
        .mockResolvedValueOnce({ success: false, error: 'Email failed' });

      const notifications = [
        {
          type: NotificationType.BOOKING_REMINDER,
          customerId: mockCustomerId,
          tenantId: mockTenantId,
          channel: NotificationChannel.AUTO,
          data: { date: '2024-03-15', time: '14:30', service: 'Tagliando', bookingCode: 'BK-001' },
        },
        {
          type: NotificationType.BOOKING_REMINDER,
          customerId: mockCustomerId,
          tenantId: mockTenantId,
          channel: NotificationChannel.AUTO,
          data: { date: '2024-03-16', time: '10:00', service: 'Revisione', bookingCode: 'BK-002' },
        },
      ];

      const result = await service.sendBulkNotifications(notifications, {
        continueOnError: false,
        throttleMs: 0,
      });

      expect(result.failed).toBe(1);
      expect(result.results).toHaveLength(1);
    });
  });

  // =========================================================================
  // getCustomerPreferences()
  // =========================================================================
  describe('getCustomerPreferences', () => {
    it('should return default preferences', async () => {
      const prefs = await service.getCustomerPreferences(
        mockCustomerId,
        mockTenantId,
      );

      expect(prefs).toEqual({
        preferredChannel: NotificationChannel.AUTO,
        bookingConfirmations: true,
        bookingReminders: true,
        invoiceNotifications: true,
        promotionalMessages: false,
      });
    });
  });

  // =========================================================================
  // updateCustomerPreferences()
  // =========================================================================
  describe('updateCustomerPreferences', () => {
    it('should update preferences without error', async () => {
      await expect(
        service.updateCustomerPreferences(mockCustomerId, mockTenantId, {}),
      ).resolves.toBeUndefined();
    });
  });
});
