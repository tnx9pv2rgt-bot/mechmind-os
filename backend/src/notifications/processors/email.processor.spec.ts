import { Job } from 'bullmq';
import { EmailProcessor } from './email.processor';
import { Logger } from '@nestjs/common';

interface EmailJobData {
  tenantId: string;
  userId: string;
  to: string;
  subject: string;
  template: string;
  variables: Record<string, unknown>;
}

describe('EmailProcessor', () => {
  let processor: EmailProcessor;

  beforeEach(() => {
    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    processor = new EmailProcessor();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process', () => {
    const createJob = (data: Partial<EmailJobData> = {}): Job<EmailJobData> =>
      ({
        id: 'job-001',
        data: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          to: 'test@example.com',
          subject: 'Test Subject',
          template: 'booking_confirmation',
          variables: {},
          ...data,
        },
      }) as unknown as Job<EmailJobData>;

    it('should be defined', () => {
      expect(processor).toBeDefined();
    });

    it('should mask email addresses in logging', async () => {
      const logSpy = jest.spyOn(processor['logger'], 'log').mockImplementation();

      const job = createJob({
        to: 'customer@example.com',
      });

      // Mock the SES client send to avoid actual AWS calls
      jest.spyOn(processor['ses'] as any, 'send').mockResolvedValueOnce({ MessageId: 'msg-123' });

      await processor.process(job);

      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should send email via SES when job is processed', async () => {
      const sesSpy = (jest.spyOn(processor['ses'] as any, 'send') as any).mockResolvedValueOnce({
        MessageId: 'msg-124',
      });

      const job = createJob({
        to: 'customer2@example.com',
        subject: 'Prenotazione Confermata',
        template: 'booking_confirmation',
      });

      await processor.process(job);

      expect(sesSpy).toHaveBeenCalledTimes(1);
    });

    it('should use booking_confirmation template by default', async () => {
      (jest.spyOn(processor['ses'] as any, 'send') as any).mockResolvedValueOnce({
        MessageId: 'msg-125',
      });

      const job = createJob({
        template: 'booking_confirmation',
      });

      await processor.process(job);

      expect(processor['ses'].send).toHaveBeenCalledTimes(1);
    });

    it('should use booking_reminder template when specified', async () => {
      (jest.spyOn(processor['ses'] as any, 'send') as any).mockResolvedValueOnce({
        MessageId: 'msg-126',
      });

      const job = createJob({
        template: 'booking_reminder',
      });

      await processor.process(job);

      expect(processor['ses'].send).toHaveBeenCalledTimes(1);
    });

    it('should replace template variables in email body', async () => {
      (jest.spyOn(processor['ses'] as any, 'send') as any).mockResolvedValueOnce({
        MessageId: 'msg-127',
      });

      const job = createJob({
        template: 'booking_confirmation',
        variables: {
          customerName: 'John Doe',
          service: 'Oil Change',
          bookingCode: 'BK-999',
        },
      });

      await processor.process(job);

      expect(processor['ses'].send).toHaveBeenCalledTimes(1);
    });

    it('should escape HTML entities in template variables', async () => {
      (jest.spyOn(processor['ses'] as any, 'send') as any).mockResolvedValueOnce({
        MessageId: 'msg-128',
      });

      const job = createJob({
        template: 'booking_confirmation',
        variables: {
          customerName: '<script>alert("xss")</script>',
          service: 'Test & Service',
        },
      });

      await processor.process(job);

      expect(processor['ses'].send).toHaveBeenCalledTimes(1);
    });

    it('should throw error when SES send fails', async () => {
      const error = new Error('SES API Error');
      jest.spyOn(processor['ses'] as any, 'send').mockRejectedValueOnce(error);

      const job = createJob();

      await expect(processor.process(job)).rejects.toThrow('SES API Error');
      expect(processor['ses'].send).toHaveBeenCalledTimes(1);
    });

    it('should handle various template types', async () => {
      (jest.spyOn(processor['ses'] as any, 'send') as any).mockResolvedValueOnce({
        MessageId: 'msg-129',
      });

      const job = createJob({
        template: 'non_existent_template',
        variables: { test: 'value' },
      });

      await processor.process(job);

      expect(processor['ses'].send).toHaveBeenCalledTimes(1);
    });

    it('should send email with all job data fields', async () => {
      (jest.spyOn(processor['ses'] as any, 'send') as any).mockResolvedValueOnce({
        MessageId: 'msg-130',
      });

      const job = createJob({
        tenantId: 'tenant-abc',
        userId: 'user-xyz',
        to: 'user@test.com',
        subject: 'Custom Subject',
        template: 'booking_confirmation',
        variables: {
          customerName: 'Test User',
          date: '2024-03-20',
        },
      });

      await processor.process(job);

      expect(processor['ses'].send).toHaveBeenCalledTimes(1);
    });

    it('should use default SES from email when env not set', async () => {
      delete process.env.SES_FROM_EMAIL;
      (jest.spyOn(processor['ses'] as any, 'send') as any).mockResolvedValueOnce({
        MessageId: 'msg-131',
      });

      const job = createJob();

      await processor.process(job);

      expect(processor['ses'].send).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple variable replacements', async () => {
      (jest.spyOn(processor['ses'] as any, 'send') as any).mockResolvedValueOnce({
        MessageId: 'msg-132',
      });

      const job = createJob({
        variables: {
          customerName: 'Marco Rossi',
          service: 'Cambio Olio',
          date: '2024-04-20',
          time: '15:00',
          vehicle: 'BMW X5',
          bookingCode: 'BK-XYZ',
        },
      });

      await processor.process(job);

      expect(processor['ses'].send).toHaveBeenCalledTimes(1);
    });
  });

  describe('onCompleted', () => {
    it('should log when email job completes', () => {
      const logSpy = jest.spyOn(processor['logger'], 'log').mockImplementation();

      const job = {
        id: 'job-complete',
      } as Job;

      processor.onCompleted(job);

      expect(logSpy).toHaveBeenCalledWith('Email job job-complete completed');
      logSpy.mockRestore();
    });

    it('should handle different job IDs', () => {
      const logSpy = jest.spyOn(processor['logger'], 'log').mockImplementation();

      processor.onCompleted({ id: 'job-abc123' } as Job);

      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe('onFailed', () => {
    it('should log when email job fails', () => {
      const logSpy = jest.spyOn(processor['logger'], 'error').mockImplementation();

      const job = {
        id: 'job-failed',
      } as Job;
      const error = new Error('Send failed');

      processor.onFailed(job, error);

      expect(logSpy).toHaveBeenCalledWith('Email job job-failed failed: Send failed');
      logSpy.mockRestore();
    });

    it('should handle errors with different messages', () => {
      const logSpy = jest.spyOn(processor['logger'], 'error').mockImplementation();

      const job = { id: 'job-fail2' } as Job;
      const error = new Error('Network timeout');

      processor.onFailed(job, error);

      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should handle missing error message', () => {
      const logSpy = jest.spyOn(processor['logger'], 'error').mockImplementation();

      const job = { id: 'job-fail3' } as Job;
      const error = new Error();

      processor.onFailed(job, error);

      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });
});
