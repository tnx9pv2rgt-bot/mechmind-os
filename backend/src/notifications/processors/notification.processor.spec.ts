import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { InternalServerErrorException } from '@nestjs/common';
import { NotificationProcessor } from './notification.processor';
import { NotificationOrchestratorService } from '../services/notification.service';
import { NotificationType, NotificationChannel } from '../dto/send-notification.dto';

interface NotificationJobData {
  type: NotificationType;
  customerId: string;
  tenantId: string;
  data: Record<string, unknown>;
  channel?: NotificationChannel;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

describe('NotificationProcessor', () => {
  let processor: NotificationProcessor;
  let notificationService: jest.Mocked<NotificationOrchestratorService>;

  beforeEach(async () => {
    const mockNotificationService: jest.Mocked<Partial<NotificationOrchestratorService>> = {
      notifyCustomer: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationProcessor,
        {
          provide: NotificationOrchestratorService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    processor = module.get<NotificationProcessor>(NotificationProcessor);
    notificationService = module.get(
      NotificationOrchestratorService,
    ) as jest.Mocked<NotificationOrchestratorService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process', () => {
    const createJob = (data: Partial<NotificationJobData> = {}): Job<NotificationJobData> =>
      ({
        id: 'job-001',
        name: 'notification-job',
        data: {
          type: 'booking_created' as NotificationType,
          customerId: 'customer-1',
          tenantId: 'tenant-1',
          data: {},
          channel: NotificationChannel.AUTO,
          ...data,
        },
      }) as unknown as Job<NotificationJobData>;

    it('should return success result when notification is sent successfully', async () => {
      notificationService.notifyCustomer.mockResolvedValueOnce({
        success: true,
        channel: NotificationChannel.EMAIL,
        messageId: 'msg-123',
        fallbackUsed: false,
      });

      const job = createJob({
        type: 'booking_created' as NotificationType,
        customerId: 'customer-1',
        tenantId: 'tenant-1',
        data: { bookingCode: 'BK-001' },
      });

      const result = await processor.process(job);

      expect(result).toEqual({
        success: true,
        channel: NotificationChannel.EMAIL,
        messageId: 'msg-123',
        fallbackUsed: false,
      });
      expect(notificationService.notifyCustomer).toHaveBeenCalledWith(
        'customer-1',
        'tenant-1',
        'booking_created',
        { bookingCode: 'BK-001' },
        NotificationChannel.AUTO,
      );
    });

    it('should use AUTO channel when channel is not specified', async () => {
      notificationService.notifyCustomer.mockResolvedValueOnce({
        success: true,
        channel: NotificationChannel.SMS,
        messageId: 'sms-456',
      });

      const job = createJob({
        channel: undefined,
      });

      const result = await processor.process(job);

      expect(result.success).toBe(true);
      expect(notificationService.notifyCustomer).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(Object),
        NotificationChannel.AUTO,
      );
    });

    it('should use specified channel when provided', async () => {
      notificationService.notifyCustomer.mockResolvedValueOnce({
        success: true,
        channel: NotificationChannel.EMAIL,
        messageId: 'msg-789',
      });

      const job = createJob({
        channel: NotificationChannel.EMAIL,
      });

      await processor.process(job);

      expect(notificationService.notifyCustomer).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(Object),
        NotificationChannel.EMAIL,
      );
    });

    it('should throw InternalServerErrorException when notification service returns failure', async () => {
      notificationService.notifyCustomer.mockResolvedValueOnce({
        success: false,
        channel: NotificationChannel.EMAIL,
        error: 'Email service down',
      });

      const job = createJob();

      await expect(processor.process(job)).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException with error message when provided', async () => {
      notificationService.notifyCustomer.mockResolvedValueOnce({
        success: false,
        channel: NotificationChannel.SMS,
        error: 'SMS gateway timeout',
      });

      const job = createJob();

      await expect(processor.process(job)).rejects.toThrow(
        new InternalServerErrorException('SMS gateway timeout'),
      );
    });

    it('should throw InternalServerErrorException with generic message when error is missing', async () => {
      notificationService.notifyCustomer.mockResolvedValueOnce({
        success: false,
        channel: NotificationChannel.EMAIL,
      });

      const job = createJob();

      await expect(processor.process(job)).rejects.toThrow(InternalServerErrorException);
    });

    it('should handle notification service throwing an error', async () => {
      const error = new Error('Service error');
      notificationService.notifyCustomer.mockRejectedValueOnce(error);

      const job = createJob();

      await expect(processor.process(job)).rejects.toThrow('Service error');
      expect(notificationService.notifyCustomer).toHaveBeenCalledTimes(1);
    });

    it('should pass all notification data correctly to service', async () => {
      notificationService.notifyCustomer.mockResolvedValueOnce({
        success: true,
        channel: NotificationChannel.EMAIL,
        messageId: 'msg-999',
      });

      const jobData = {
        type: 'booking_reminder' as NotificationType,
        customerId: 'cust-xyz',
        tenantId: 'tenant-xyz',
        data: {
          reminderTime: '2024-03-15T10:00:00Z',
          bookingCode: 'BK-XYZ',
        },
        channel: NotificationChannel.SMS,
        priority: 'high' as const,
      };

      const job = createJob(jobData);

      await processor.process(job);

      expect(notificationService.notifyCustomer).toHaveBeenCalledWith(
        'cust-xyz',
        'tenant-xyz',
        'booking_reminder',
        {
          reminderTime: '2024-03-15T10:00:00Z',
          bookingCode: 'BK-XYZ',
        },
        NotificationChannel.SMS,
      );
    });

    it('should include fallbackUsed flag in response when provided', async () => {
      notificationService.notifyCustomer.mockResolvedValueOnce({
        success: true,
        channel: NotificationChannel.SMS,
        messageId: 'msg-fallback',
        fallbackUsed: true,
      });

      const job = createJob();

      const result = await processor.process(job);

      expect(result.fallbackUsed).toBe(true);
    });

    it('should handle multiple notification types', async () => {
      notificationService.notifyCustomer.mockResolvedValueOnce({
        success: true,
        channel: NotificationChannel.EMAIL,
        messageId: 'msg-type1',
      });

      const job = createJob({
        type: 'invoice_sent' as NotificationType,
      });

      await processor.process(job);

      expect(notificationService.notifyCustomer).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'invoice_sent',
        expect.any(Object),
        expect.any(String),
      );
    });
  });

  describe('onCompleted', () => {
    it('should log when notification job completes', () => {
      const logSpy = jest.spyOn(processor['logger'], 'log').mockImplementation();

      const job = {
        id: 'job-complete',
      } as Job;

      processor.onCompleted(job);

      expect(logSpy).toHaveBeenCalledWith('✅ Notification job job-complete completed');
      logSpy.mockRestore();
    });

    it('should handle different job IDs in onCompleted', () => {
      const logSpy = jest.spyOn(processor['logger'], 'log').mockImplementation();

      const job = {
        id: 'job-uuid-12345',
      } as Job;

      processor.onCompleted(job);

      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe('onFailed', () => {
    it('should log when notification job fails', () => {
      const logSpy = jest.spyOn(processor['logger'], 'error').mockImplementation();

      const job = {
        id: 'job-failed',
      } as Job;
      const error = new Error('Processing failed');

      processor.onFailed(job, error);

      expect(logSpy).toHaveBeenCalledWith(
        '❌ Notification job job-failed failed: Processing failed',
      );
      logSpy.mockRestore();
    });

    it('should handle different error messages', () => {
      const logSpy = jest.spyOn(processor['logger'], 'error').mockImplementation();

      const job = { id: 'job-error-2' } as Job;
      const error = new Error('Network timeout');

      processor.onFailed(job, error);

      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe('onStalled', () => {
    it('should log when notification job stalls', () => {
      const warnSpy = jest.spyOn(processor['logger'], 'warn').mockImplementation();

      processor.onStalled('job-stalled-001');

      expect(warnSpy).toHaveBeenCalledWith('⚠️ Notification job job-stalled-001 stalled');
      warnSpy.mockRestore();
    });

    it('should handle different job IDs in onStalled', () => {
      const warnSpy = jest.spyOn(processor['logger'], 'warn').mockImplementation();

      processor.onStalled('another-job-id');

      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
});
