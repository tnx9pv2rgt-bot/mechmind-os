import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NotificationsApiController } from './notifications-api.controller';
import { NotificationOrchestratorService } from '../services/notification.service';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';
import { PrismaService } from '../../common/services/prisma.service';
import { NotificationType, NotificationChannel } from '../dto/send-notification.dto';

describe('NotificationsApiController', () => {
  let controller: NotificationsApiController;
  let notificationService: jest.Mocked<NotificationOrchestratorService>;
  let emailService: jest.Mocked<EmailService>;
  let smsService: jest.Mocked<SmsService>;
  let prisma: { notification: Record<string, jest.Mock> };

  const mockResult = {
    success: true,
    channel: 'email',
    messageId: 'msg-001',
    fallbackUsed: false,
  };

  beforeEach(async () => {
    prisma = {
      notification: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsApiController],
      providers: [
        {
          provide: NotificationOrchestratorService,
          useValue: {
            notifyCustomer: jest.fn(),
            sendBulkNotifications: jest.fn(),
            queueNotification: jest.fn(),
            getCustomerPreferences: jest.fn(),
            updateCustomerPreferences: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendRawEmail: jest.fn(),
            getEmailStatus: jest.fn(),
          },
        },
        {
          provide: SmsService,
          useValue: {
            sendCustom: jest.fn(),
            getTemplates: jest.fn(),
            calculateCost: jest.fn(),
            validatePhoneNumber: jest.fn(),
            healthCheck: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    controller = module.get<NotificationsApiController>(NotificationsApiController);
    notificationService = module.get(
      NotificationOrchestratorService,
    ) as jest.Mocked<NotificationOrchestratorService>;
    emailService = module.get(EmailService) as jest.Mocked<EmailService>;
    smsService = module.get(SmsService) as jest.Mocked<SmsService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendNotification', () => {
    it('should delegate to notificationService.notifyCustomer', async () => {
      notificationService.notifyCustomer.mockResolvedValue(mockResult as never);
      const dto = {
        customerId: 'cust-001',
        tenantId: 'tenant-001',
        type: NotificationType.BOOKING_CONFIRMATION,
        data: { service: 'Oil change' },
        channel: NotificationChannel.EMAIL,
      };

      const result = await controller.sendNotification('tenant-001', dto as never);

      expect(notificationService.notifyCustomer).toHaveBeenCalledWith(
        'cust-001',
        'tenant-001',
        dto.type,
        dto.data,
        dto.channel,
      );
      expect(result).toEqual({
        success: true,
        channel: 'email',
        messageId: 'msg-001',
        fallbackUsed: false,
      });
    });

    it('should include error field when result has error', async () => {
      const errorResult = { ...mockResult, success: false, error: 'Delivery failed' };
      notificationService.notifyCustomer.mockResolvedValue(errorResult as never);

      const result = await controller.sendNotification('tenant-001', {
        customerId: 'cust-001',
        tenantId: 'tenant-001',
        type: NotificationType.BOOKING_CONFIRMATION,
        data: {},
        channel: NotificationChannel.EMAIL,
      } as never);

      expect(result).toHaveProperty('error', 'Delivery failed');
    });
  });

  describe('sendBookingConfirmation', () => {
    it('should delegate to notificationService with BOOKING_CONFIRMATION type', async () => {
      notificationService.notifyCustomer.mockResolvedValue(mockResult as never);
      const dto = {
        customerId: 'cust-001',
        tenantId: 'tenant-001',
        service: 'Oil change',
        date: '2026-03-20',
        time: '10:00',
        vehicle: 'Toyota Yaris',
        bookingCode: 'BK-001',
        notes: 'Bring old oil filter',
      };

      const result = await controller.sendBookingConfirmation('tenant-001', dto as never);

      expect(notificationService.notifyCustomer).toHaveBeenCalledWith(
        'cust-001',
        'tenant-001',
        NotificationType.BOOKING_CONFIRMATION,
        {
          service: 'Oil change',
          date: '2026-03-20',
          time: '10:00',
          vehicle: 'Toyota Yaris',
          bookingCode: 'BK-001',
          notes: 'Bring old oil filter',
        },
        NotificationChannel.AUTO,
      );
      expect(result).toEqual({
        success: true,
        channel: 'email',
        messageId: 'msg-001',
        fallbackUsed: false,
      });
    });

    it('should use provided channel instead of AUTO', async () => {
      notificationService.notifyCustomer.mockResolvedValue(mockResult as never);
      const dto = {
        customerId: 'cust-001',
        tenantId: 'tenant-001',
        service: 'Brake check',
        date: '2026-03-20',
        time: '14:00',
        vehicle: 'Fiat 500',
        bookingCode: 'BK-002',
        channel: NotificationChannel.SMS,
      };

      await controller.sendBookingConfirmation('tenant-001', dto as never);

      expect(notificationService.notifyCustomer).toHaveBeenCalledWith(
        'cust-001',
        'tenant-001',
        NotificationType.BOOKING_CONFIRMATION,
        expect.any(Object),
        NotificationChannel.SMS,
      );
    });
  });

  describe('sendBookingReminder', () => {
    it('should delegate to notificationService with BOOKING_REMINDER type', async () => {
      notificationService.notifyCustomer.mockResolvedValue(mockResult as never);
      const dto = {
        customerId: 'cust-001',
        tenantId: 'tenant-001',
        service: 'Oil change',
        date: '2026-03-20',
        time: '10:00',
        vehicle: 'Toyota Yaris',
        bookingCode: 'BK-001',
        reminderType: '24h',
      };

      const result = await controller.sendBookingReminder('tenant-001', dto as never);

      expect(notificationService.notifyCustomer).toHaveBeenCalledWith(
        'cust-001',
        'tenant-001',
        NotificationType.BOOKING_REMINDER,
        {
          service: 'Oil change',
          date: '2026-03-20',
          time: '10:00',
          vehicle: 'Toyota Yaris',
          bookingCode: 'BK-001',
          reminderType: '24h',
        },
        NotificationChannel.AUTO,
      );
      expect(result).toEqual({
        success: true,
        channel: 'email',
        messageId: 'msg-001',
        fallbackUsed: false,
      });
    });
  });

  describe('sendInvoiceReady', () => {
    it('should delegate to notificationService with INVOICE_READY type', async () => {
      notificationService.notifyCustomer.mockResolvedValue(mockResult as never);
      const dto = {
        customerId: 'cust-001',
        tenantId: 'tenant-001',
        invoiceNumber: 'INV-2026-0001',
        invoiceDate: '2026-03-15',
        amount: 122.0,
        downloadUrl: 'https://example.com/invoice.pdf',
      };

      const result = await controller.sendInvoiceReady('tenant-001', dto as never);

      expect(notificationService.notifyCustomer).toHaveBeenCalledWith(
        'cust-001',
        'tenant-001',
        NotificationType.INVOICE_READY,
        {
          invoiceNumber: 'INV-2026-0001',
          invoiceDate: '2026-03-15',
          amount: 122.0,
          downloadUrl: 'https://example.com/invoice.pdf',
        },
        NotificationChannel.AUTO,
      );
      expect(result).toEqual({
        success: true,
        channel: 'email',
        messageId: 'msg-001',
        fallbackUsed: false,
      });
    });
  });

  describe('sendGdprExportReady', () => {
    it('should delegate with system tenantId and EMAIL channel', async () => {
      notificationService.notifyCustomer.mockResolvedValue(mockResult as never);
      const dto = {
        customerId: 'cust-001',
        downloadUrl: 'https://example.com/export.zip',
        expiryDate: '2026-03-30',
        requestId: 'gdpr-req-001',
      };

      const result = await controller.sendGdprExportReady(dto as never);

      expect(notificationService.notifyCustomer).toHaveBeenCalledWith(
        'cust-001',
        'system',
        NotificationType.GDPR_EXPORT_READY,
        {
          downloadUrl: 'https://example.com/export.zip',
          expiryDate: '2026-03-30',
          requestId: 'gdpr-req-001',
        },
        NotificationChannel.EMAIL,
      );
      expect(result).toEqual({
        success: true,
        channel: 'email',
        messageId: 'msg-001',
      });
    });
  });

  describe('sendBulkNotifications', () => {
    it('should delegate to notificationService.sendBulkNotifications', async () => {
      const bulkResult = {
        total: 2,
        successful: 2,
        failed: 0,
        results: [mockResult, mockResult],
      };
      notificationService.sendBulkNotifications.mockResolvedValue(bulkResult as never);
      const dto = {
        notifications: [{ customerId: 'c1' }, { customerId: 'c2' }],
        options: { batchSize: 10 },
      };

      const result = await controller.sendBulkNotifications(dto as never);

      expect(notificationService.sendBulkNotifications).toHaveBeenCalledWith(
        dto.notifications,
        dto.options,
      );
      expect(result).toEqual(bulkResult);
    });
  });

  describe('queueNotification', () => {
    it('should delegate to notificationService.queueNotification with delay', async () => {
      const queueResult = { jobId: 'job-001', scheduledFor: '2026-03-16T12:00:00Z' };
      notificationService.queueNotification.mockResolvedValue(queueResult as never);
      const dto = {
        customerId: 'cust-001',
        tenantId: 'tenant-001',
        type: NotificationType.BOOKING_REMINDER,
        data: {},
        channel: NotificationChannel.SMS,
        delayMinutes: 30,
      };

      const result = await controller.queueNotification(dto as never);

      expect(notificationService.queueNotification).toHaveBeenCalledWith(dto, 30 * 60 * 1000);
      expect(result).toEqual({
        queued: true,
        jobId: 'job-001',
        scheduledFor: '2026-03-16T12:00:00Z',
      });
    });

    it('should pass undefined delay when delayMinutes not provided', async () => {
      const queueResult = { jobId: 'job-002', scheduledFor: undefined };
      notificationService.queueNotification.mockResolvedValue(queueResult as never);
      const dto = {
        customerId: 'cust-001',
        tenantId: 'tenant-001',
        type: NotificationType.BOOKING_CONFIRMATION,
        data: {},
        channel: NotificationChannel.EMAIL,
      };

      await controller.queueNotification(dto as never);

      expect(notificationService.queueNotification).toHaveBeenCalledWith(dto, undefined);
    });
  });

  describe('sendTestNotification', () => {
    it('should send test email when channel is EMAIL', async () => {
      emailService.sendRawEmail.mockResolvedValue({
        success: true,
        messageId: 'test-msg-001',
      } as never);
      const dto = {
        channel: NotificationChannel.EMAIL,
        recipient: 'test@example.com',
        type: 'BOOKING_CONFIRMATION',
      };

      const result = await controller.sendTestNotification(dto as never);

      expect(emailService.sendRawEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Test Email da MechMind',
        }),
      );
      expect(result).toEqual({
        success: true,
        channel: NotificationChannel.EMAIL,
        messageId: 'test-msg-001',
      });
    });

    it('should send test SMS when channel is SMS', async () => {
      smsService.sendCustom.mockResolvedValue({ success: true, messageId: 'sms-001' } as never);
      const dto = {
        channel: NotificationChannel.SMS,
        recipient: '+393331234567',
        type: 'BOOKING_REMINDER',
      };

      const result = await controller.sendTestNotification(dto as never);

      expect(smsService.sendCustom).toHaveBeenCalledWith(
        '+393331234567',
        expect.stringContaining('Test SMS da MechMind'),
        'test',
      );
      expect(result).toEqual({
        success: true,
        channel: NotificationChannel.SMS,
        messageId: 'sms-001',
      });
    });
  });

  describe('getNotificationStatus', () => {
    it('should return status for notification id', async () => {
      const sentDate = new Date('2026-03-15T10:00:00Z');
      const deliveredDate = new Date('2026-03-15T10:01:00Z');
      prisma.notification.findFirst.mockResolvedValue({
        id: 'notif-001',
        status: 'DELIVERED',
        channel: 'EMAIL',
        sentAt: sentDate,
        deliveredAt: deliveredDate,
        failedAt: null,
        error: null,
      });

      const result = await controller.getNotificationStatus('tenant-001', 'notif-001');

      expect(prisma.notification.findFirst).toHaveBeenCalledWith({
        where: { id: 'notif-001', tenantId: 'tenant-001' },
        select: {
          id: true,
          status: true,
          channel: true,
          sentAt: true,
          deliveredAt: true,
          failedAt: true,
          error: true,
        },
      });
      expect(result).toEqual({
        id: 'notif-001',
        status: 'DELIVERED',
        channel: 'EMAIL',
        sentAt: sentDate.toISOString(),
        deliveredAt: deliveredDate.toISOString(),
        failedAt: null,
        error: null,
      });
    });

    it('should throw NotFoundException when notification not found', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);

      await expect(controller.getNotificationStatus('tenant-001', 'notif-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getSmsTemplates', () => {
    it('should delegate to smsService.getTemplates', async () => {
      const templates = [{ id: 'tpl-1', name: 'Booking' }];
      smsService.getTemplates.mockReturnValue(templates as never);

      const result = await controller.getSmsTemplates();

      expect(smsService.getTemplates).toHaveBeenCalled();
      expect(result).toEqual(templates);
    });
  });

  describe('calculateSmsCost', () => {
    it('should delegate to smsService.calculateCost', async () => {
      const costResult = { segments: 1, cost: 0.05 };
      smsService.calculateCost.mockReturnValue(costResult as never);

      const result = await controller.calculateSmsCost('Hello world');

      expect(smsService.calculateCost).toHaveBeenCalledWith('Hello world');
      expect(result).toEqual(costResult);
    });

    it('should throw BadRequestException when message is empty', async () => {
      await expect(controller.calculateSmsCost('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('validatePhone', () => {
    it('should delegate to smsService.validatePhoneNumber', async () => {
      const validationResult = { valid: true, formatted: '+393331234567' };
      smsService.validatePhoneNumber.mockResolvedValue(validationResult as never);

      const result = await controller.validatePhone('+393331234567');

      expect(smsService.validatePhoneNumber).toHaveBeenCalledWith('+393331234567');
      expect(result).toEqual(validationResult);
    });

    it('should throw BadRequestException when phone is empty', async () => {
      await expect(controller.validatePhone('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getEmailStatus', () => {
    it('should delegate to emailService.getEmailStatus', async () => {
      const status = { id: 'email-001', status: 'delivered' };
      emailService.getEmailStatus.mockResolvedValue(status as never);

      const result = await controller.getEmailStatus('email-001');

      expect(emailService.getEmailStatus).toHaveBeenCalledWith('email-001');
      expect(result).toEqual(status);
    });

    it('should throw NotFoundException when email not found', async () => {
      emailService.getEmailStatus.mockResolvedValue(null as never);

      await expect(controller.getEmailStatus('email-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStats', () => {
    it('should return real statistics from database', async () => {
      prisma.notification.count.mockResolvedValue(5);
      prisma.notification.groupBy.mockImplementation(async (args: { by: string[] }) => {
        if (args.by[0] === 'channel') {
          return [
            { channel: 'SMS', _count: { id: 3 } },
            { channel: 'EMAIL', _count: { id: 2 } },
          ];
        }
        if (args.by[0] === 'status') {
          return [
            { status: 'SENT', _count: { id: 2 } },
            { status: 'DELIVERED', _count: { id: 2 } },
            { status: 'FAILED', _count: { id: 1 } },
          ];
        }
        if (args.by[0] === 'type') {
          return [{ type: 'BOOKING_CONFIRMATION', _count: { id: 5 } }];
        }
        return [];
      });

      const result = await controller.getStats('tenant-001', '2026-01-01', '2026-03-16');

      expect(result.total).toBe(5);
      expect(result.byChannel).toEqual({ SMS: 3, EMAIL: 2 });
      expect(result.byStatus).toEqual({ SENT: 2, DELIVERED: 2, FAILED: 1 });
      expect(result.byType).toEqual({ BOOKING_CONFIRMATION: 5 });
      expect(result.period.from).toBe(new Date('2026-01-01').toISOString());
      expect(result.period.to).toBe(new Date('2026-03-16').toISOString());
    });
  });

  describe('healthCheck', () => {
    it('should return combined health status', async () => {
      smsService.healthCheck.mockResolvedValue({ healthy: true } as never);

      const result = await controller.healthCheck();

      expect(result).toEqual({
        sms: { healthy: true },
        email: { healthy: true },
        overall: true,
      });
    });
  });

  describe('getCustomerPreferences', () => {
    it('should delegate to notificationService.getCustomerPreferences', async () => {
      const prefs = { email: true, sms: false };
      notificationService.getCustomerPreferences.mockResolvedValue(prefs as never);

      const result = await controller.getCustomerPreferences('cust-001', 'tenant-001');

      expect(notificationService.getCustomerPreferences).toHaveBeenCalledWith(
        'cust-001',
        'tenant-001',
      );
      expect(result).toEqual(prefs);
    });
  });

  describe('updateCustomerPreferences', () => {
    it('should delegate to notificationService and return updated true', async () => {
      notificationService.updateCustomerPreferences.mockResolvedValue(undefined);
      const prefs = { email: true, sms: false };

      const result = await controller.updateCustomerPreferences('cust-001', 'tenant-001', prefs);

      expect(notificationService.updateCustomerPreferences).toHaveBeenCalledWith(
        'cust-001',
        'tenant-001',
        prefs,
      );
      expect(result).toEqual({ updated: true });
    });
  });
});
