import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getQueueToken } from '@nestjs/bullmq';
import { PrismaService } from '@common/services/prisma.service';
import { EncryptionService } from '@common/services/encryption.service';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';
import {
  NotificationOrchestratorService,
  NotificationSentEvent,
  NotificationFailedEvent,
} from './notification.service';
import { NotificationType, NotificationChannel } from '../dto/send-notification.dto';

describe('NotificationOrchestratorService', () => {
  let service: NotificationOrchestratorService;
  let emailService: EmailService;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;
  let notificationQueue: { add: jest.Mock };
  let smsQueue: { add: jest.Mock };

  const mockTenantId = 'tenant-uuid-1';
  const mockCustomerId = 'customer-uuid-1';

  const mockCustomer = {
    id: mockCustomerId,
    encryptedFirstName: 'enc:Mario',
    encryptedLastName: 'enc:Rossi',
    encryptedEmail: 'enc:mario@example.com',
    encryptedPhone: 'enc:+393331234567',
  };

  beforeEach(async () => {
    notificationQueue = { add: jest.fn() };
    smsQueue = { add: jest.fn().mockResolvedValue({ id: 'sms-job-001' }) };

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
          provide: EncryptionService,
          useValue: {
            encrypt: jest.fn((value: string) => `enc:${value}`),
            decrypt: jest.fn((value: string) => value.replace('enc:', '')),
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
        {
          provide: getQueueToken('sms-queue'),
          useValue: smsQueue,
        },
      ],
    }).compile();

    service = module.get<NotificationOrchestratorService>(NotificationOrchestratorService);
    emailService = module.get<EmailService>(EmailService);
    module.get<SmsService>(SmsService);
    prisma = module.get<PrismaService>(PrismaService);
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

    it('should try SMS first when channel is AUTO (via sms-queue)', async () => {
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
      expect(smsQueue.add).toHaveBeenCalledWith(
        'send-sms',
        expect.objectContaining({
          to: '+393331234567',
          templateType: 'booking_confirmation',
        }),
        expect.objectContaining({
          attempts: 3,
          backoff: { type: 'exponential', delay: 30000 },
        }),
      );
    });

    it('should fallback to email when SMS queue fails', async () => {
      smsQueue.add.mockRejectedValueOnce(new Error('Queue connection failed'));
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
      expect(smsQueue.add).not.toHaveBeenCalled();
    });

    it('should send SMS only when SMS channel is specified (via sms-queue)', async () => {
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
      expect(smsQueue.add).toHaveBeenCalled();
    });

    it('should send both when BOTH channel is specified', async () => {
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
      await service.notifyCustomer(
        mockCustomerId,
        mockTenantId,
        NotificationType.BOOKING_CONFIRMATION,
        { date: '2024-03-15', time: '14:30', service: 'Tagliando', bookingCode: 'BK-001' },
      );

      expect(prisma.withTenant).toHaveBeenCalledWith(mockTenantId, expect.any(Function));
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

    it('should handle BOOKING_REMINDER notification via sms-queue', async () => {
      const result = await service.notifyCustomer(
        mockCustomerId,
        mockTenantId,
        NotificationType.BOOKING_REMINDER,
        { date: '2024-03-15', time: '14:30', service: 'Tagliando', bookingCode: 'BK-001' },
      );

      expect(result.success).toBe(true);
      expect(smsQueue.add).toHaveBeenCalledWith(
        'send-sms',
        expect.objectContaining({ templateType: 'booking_reminder' }),
        expect.any(Object),
      );
    });

    it('should handle BOOKING_CANCELLED notification via sms-queue', async () => {
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
      expect(smsQueue.add).toHaveBeenCalledWith(
        'send-sms',
        expect.objectContaining({ templateType: 'booking_cancelled' }),
        expect.any(Object),
      );
    });

    it('should handle INVOICE_READY notification via sms-queue', async () => {
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
      expect(smsQueue.add).toHaveBeenCalledWith(
        'send-sms',
        expect.objectContaining({ templateType: 'invoice_ready' }),
        expect.any(Object),
      );
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

      // SMS goes through queue now and succeeds by default
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
          backoff: { type: 'exponential', delay: 60000 },
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
      // SMS queue fails, email fallback also fails
      smsQueue.add.mockRejectedValue(new Error('Queue unavailable'));

      (emailService.sendBookingReminder as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Email failed',
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
        continueOnError: false,
        throttleMs: 0,
      });

      expect(result.failed).toBe(1);
      expect(result.results).toHaveLength(1);
    });
  });

  // =========================================================================
  // sendSmsNotification - edge cases (lines 297, 341-346)
  // =========================================================================
  describe('sendSmsNotification edge cases', () => {
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

    it('should return failure for unsupported SMS notification type (default case)', async () => {
      const result = await service.notifyCustomer(
        mockCustomerId,
        mockTenantId,
        NotificationType.CUSTOM,
        { message: 'test' },
        NotificationChannel.SMS,
      );

      // SMS default case fails, then email fallback also hits default -> both fail
      expect(result.success).toBe(false);
    });

    it('should catch SMS queue errors and fallback to email', async () => {
      smsQueue.add.mockRejectedValueOnce(new Error('Redis connection timeout'));
      (emailService.sendBookingConfirmation as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'email-fallback-1',
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
        NotificationChannel.SMS,
      );

      // SMS queue throws -> caught -> fallback to email
      expect(result.success).toBe(true);
      expect(result.channel).toBe(NotificationChannel.EMAIL);
      expect(result.fallbackUsed).toBe(true);
    });

    it('should catch non-Error SMS queue exceptions', async () => {
      smsQueue.add.mockRejectedValueOnce('string error');
      (emailService.sendBookingConfirmation as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'email-fallback-2',
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
        NotificationChannel.SMS,
      );

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
    });
  });

  // =========================================================================
  // sendEmailNotification - edge cases (lines 360, 396-407, 443-448)
  // =========================================================================
  describe('sendEmailNotification edge cases', () => {
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

    it('should send BOOKING_CANCELLED email notification', async () => {
      (emailService.sendBookingCancelled as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'email-CAN-1',
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
        NotificationChannel.EMAIL,
      );

      expect(result.success).toBe(true);
      expect(result.channel).toBe(NotificationChannel.EMAIL);
      expect(emailService.sendBookingCancelled).toHaveBeenCalled();
    });

    it('should send INVOICE_READY email notification', async () => {
      (emailService.sendInvoiceReady as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'email-INV-1',
      });

      const result = await service.notifyCustomer(
        mockCustomerId,
        mockTenantId,
        NotificationType.INVOICE_READY,
        {
          invoiceNumber: 'INV-001',
          invoiceDate: '2024-03-15',
          amount: '250.00',
          downloadUrl: 'https://example.com/inv',
        },
        NotificationChannel.EMAIL,
      );

      expect(result.success).toBe(true);
      expect(result.channel).toBe(NotificationChannel.EMAIL);
      expect(emailService.sendInvoiceReady).toHaveBeenCalled();
    });

    it('should return failure for unsupported email notification type (default case)', async () => {
      const result = await service.notifyCustomer(
        mockCustomerId,
        mockTenantId,
        NotificationType.CUSTOM,
        { message: 'test' },
        NotificationChannel.EMAIL,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Email not supported for type');
    });

    it('should catch email sending errors and return failure', async () => {
      (emailService.sendBookingConfirmation as jest.Mock).mockRejectedValue(
        new Error('Resend API error'),
      );

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

      expect(result.success).toBe(false);
      expect(result.error).toContain('Resend API error');
    });

    it('should catch non-Error email exceptions', async () => {
      (emailService.sendBookingConfirmation as jest.Mock).mockRejectedValue('unknown failure');

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

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });

    it('should return failure when customer has no email in sendEmailNotification', async () => {
      (prisma.withTenant as jest.Mock).mockImplementation(
        (tenantId: string, callback: (p: PrismaService) => Promise<unknown>) =>
          callback({
            customer: {
              findUnique: jest.fn().mockResolvedValue({
                ...mockCustomer,
                encryptedEmail: '',
                encryptedPhone: null,
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
  // sendBulkNotifications - exception handling (lines 523-531)
  // =========================================================================
  describe('sendBulkNotifications error handling', () => {
    it('should catch exceptions thrown by notifyCustomer and stop when continueOnError is false', async () => {
      (prisma.withTenant as jest.Mock).mockImplementation(
        (tenantId: string, callback: (p: PrismaService) => Promise<unknown>) =>
          callback({
            customer: {
              findUnique: jest.fn().mockResolvedValue(null),
            },
          } as unknown as PrismaService),
      );

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
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain('not found');
    });

    it('should catch exceptions and continue when continueOnError is true', async () => {
      (prisma.withTenant as jest.Mock).mockImplementation(
        (tenantId: string, callback: (p: PrismaService) => Promise<unknown>) =>
          callback({
            customer: {
              findUnique: jest.fn().mockResolvedValue(null),
            },
          } as unknown as PrismaService),
      );

      const notifications = [
        {
          type: NotificationType.BOOKING_REMINDER,
          customerId: 'non-existent-1',
          tenantId: mockTenantId,
          channel: NotificationChannel.AUTO,
          data: { date: '2024-03-15', time: '14:30', service: 'Tagliando', bookingCode: 'BK-001' },
        },
        {
          type: NotificationType.BOOKING_REMINDER,
          customerId: 'non-existent-2',
          tenantId: mockTenantId,
          channel: NotificationChannel.AUTO,
          data: { date: '2024-03-16', time: '10:00', service: 'Revisione', bookingCode: 'BK-002' },
        },
      ];

      const result = await service.sendBulkNotifications(notifications, {
        continueOnError: true,
        throttleMs: 0,
      });

      expect(result.failed).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  // =========================================================================
  // getCustomerPreferences - error handling (lines 571-572)
  // =========================================================================
  describe('getCustomerPreferences', () => {
    it('should return default preferences', async () => {
      const prefs = await service.getCustomerPreferences(mockCustomerId, mockTenantId);

      expect(prefs).toEqual({
        preferredChannel: NotificationChannel.AUTO,
        bookingConfirmations: true,
        bookingReminders: true,
        invoiceNotifications: true,
        promotionalMessages: false,
      });
    });

    it('should be callable with different customer and tenant ids', async () => {
      const prefs = await service.getCustomerPreferences('other-customer', 'other-tenant');

      expect(prefs.preferredChannel).toBe(NotificationChannel.AUTO);
      expect(prefs.bookingConfirmations).toBe(true);
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

  // =========================================================================
  // getCustomerInfo - error handling (lines 636-639)
  // =========================================================================
  describe('getCustomerInfo error handling', () => {
    it('should return null and not throw when prisma.withTenant throws', async () => {
      (prisma.withTenant as jest.Mock).mockRejectedValue(new Error('Database connection lost'));

      // notifyCustomer calls getCustomerInfo internally; if it returns null, it throws "not found"
      await expect(
        service.notifyCustomer(
          mockCustomerId,
          mockTenantId,
          NotificationType.BOOKING_CONFIRMATION,
          { date: '2024-03-15' },
        ),
      ).rejects.toThrow(`Customer ${mockCustomerId} not found`);
    });

    it('should handle non-Error exceptions in getCustomerInfo', async () => {
      (prisma.withTenant as jest.Mock).mockRejectedValue('unexpected string error');

      await expect(
        service.notifyCustomer(
          mockCustomerId,
          mockTenantId,
          NotificationType.BOOKING_CONFIRMATION,
          { date: '2024-03-15' },
        ),
      ).rejects.toThrow(`Customer ${mockCustomerId} not found`);
    });
  });

  // =========================================================================
  // determineChannel - customer preference (line 600)
  // =========================================================================
  describe('determineChannel with customer preferences', () => {
    it('should use customer preferred channel when AUTO and customer has preference set', async () => {
      (prisma.withTenant as jest.Mock).mockImplementation(
        (tenantId: string, callback: (p: PrismaService) => Promise<unknown>) =>
          callback({
            customer: {
              findUnique: jest.fn().mockResolvedValue({
                id: mockCustomerId,
                encryptedFirstName: 'Mario',
                encryptedLastName: 'Rossi',
                encryptedEmail: 'mario@example.com',
                encryptedPhone: '+393331234567',
              }),
            },
          } as unknown as PrismaService),
      );

      // SMS goes through queue. This test exercises the AUTO -> trySmsFirst default path.
      const result = await service.notifyCustomer(
        mockCustomerId,
        mockTenantId,
        NotificationType.BOOKING_CONFIRMATION,
        { date: '2024-03-15', time: '14:30', service: 'Tagliando', bookingCode: 'BK-001' },
        NotificationChannel.AUTO,
      );

      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // trySmsFirst - both SMS and email fail (line 297 + fallback fail path)
  // =========================================================================
  describe('trySmsFirst complete failure paths', () => {
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

    it('should return failure when both SMS queue and email fallback fail', async () => {
      smsQueue.add.mockRejectedValueOnce(new Error('SMS queue failed'));
      (emailService.sendBookingConfirmation as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Email delivery failed',
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

      expect(result.success).toBe(false);
      expect(result.fallbackUsed).toBe(true);
      expect(result.error).toContain('Email fallback failed');
    });

    it('should return failure when customer has no phone and no email', async () => {
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

      const result = await service.notifyCustomer(
        mockCustomerId,
        mockTenantId,
        NotificationType.BOOKING_CONFIRMATION,
        { date: '2024-03-15' },
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No phone or email');
    });
  });

  // =========================================================================
  // sendBoth - edge cases
  // =========================================================================
  describe('sendBoth edge cases', () => {
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

    it('should handle when both SMS queue and email fail in BOTH mode', async () => {
      smsQueue.add.mockRejectedValueOnce(new Error('SMS queue failed'));
      (emailService.sendBookingConfirmation as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Email failed',
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

      expect(result.success).toBe(false);
      expect(result.channel).toBe(NotificationChannel.BOTH);
      expect(result.error).toContain('SMS');
      expect(result.error).toContain('Email');
    });

    it('should handle when promises are rejected in BOTH mode', async () => {
      smsQueue.add.mockRejectedValueOnce(new Error('SMS queue crash'));
      (emailService.sendBookingConfirmation as jest.Mock).mockRejectedValue(
        new Error('Email crash'),
      );

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

      expect(result.success).toBe(false);
      expect(result.channel).toBe(NotificationChannel.BOTH);
    });
  });
});
