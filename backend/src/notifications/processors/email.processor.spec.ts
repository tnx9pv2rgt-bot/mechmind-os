import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EmailProcessor } from './email.processor';
import { EmailService, EmailResult } from '../email/email.service';

interface EmailJobData {
  tenantId: string;
  userId: string;
  to: string;
  subject: string;
  template: string;
  variables: Record<string, unknown>;
}

const mockSendRawEmail = jest.fn<
  Promise<EmailResult>,
  [{ to: string; subject: string; html: string }]
>();

const mockEmailService = {
  sendRawEmail: mockSendRawEmail,
} as unknown as EmailService;

describe('EmailProcessor', () => {
  let processor: EmailProcessor;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    mockSendRawEmail.mockResolvedValue({ success: true, messageId: 'resend-msg-001' });

    processor = new EmailProcessor(mockEmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const makeJob = (overrides: Partial<EmailJobData> = {}): Job<EmailJobData> =>
    ({
      id: 'job-001',
      data: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        to: 'test@example.com',
        subject: 'Test Subject',
        template: 'booking_confirmation',
        variables: {},
        ...overrides,
      },
    }) as unknown as Job<EmailJobData>;

  describe('process', () => {
    it('should call EmailService.sendRawEmail with rendered HTML', async () => {
      const job = makeJob({
        template: 'booking_confirmation',
        variables: { customerName: 'Mario' },
      });

      await processor.process(job);

      expect(mockSendRawEmail).toHaveBeenCalledTimes(1);
      expect(mockSendRawEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'test@example.com', subject: 'Test Subject' }),
      );
    });

    it('should pass subject from job data verbatim', async () => {
      const job = makeJob({ subject: 'Conferma Prenotazione BK-999' });

      await processor.process(job);

      expect(mockSendRawEmail).toHaveBeenCalledWith(
        expect.objectContaining({ subject: 'Conferma Prenotazione BK-999' }),
      );
    });

    it('should render booking_reminder template when specified', async () => {
      const job = makeJob({ template: 'booking_reminder', variables: { date: '2026-06-01' } });

      await processor.process(job);

      const callArg = mockSendRawEmail.mock.calls[0][0];
      expect(callArg.html).toContain('Promemoria Prenotazione');
    });

    it('should fall back to booking_confirmation for unknown templates', async () => {
      const job = makeJob({ template: 'non_existent_template' });

      await processor.process(job);

      const callArg = mockSendRawEmail.mock.calls[0][0];
      expect(callArg.html).toContain('Conferma Prenotazione');
    });

    it('should interpolate template variables into HTML', async () => {
      const job = makeJob({
        template: 'booking_confirmation',
        variables: { customerName: 'Luigi Bianchi', bookingCode: 'BK-XYZ' },
      });

      await processor.process(job);

      const callArg = mockSendRawEmail.mock.calls[0][0];
      expect(callArg.html).toContain('Luigi Bianchi');
      expect(callArg.html).toContain('BK-XYZ');
    });

    it('should escape HTML entities in variables to prevent XSS', async () => {
      const job = makeJob({
        template: 'booking_confirmation',
        variables: { customerName: '<script>alert("xss")</script>', service: 'Oil & Filter' },
      });

      await processor.process(job);

      const callArg = mockSendRawEmail.mock.calls[0][0];
      expect(callArg.html).not.toContain('<script>');
      expect(callArg.html).toContain('&lt;script&gt;');
      expect(callArg.html).toContain('Oil &amp; Filter');
    });

    it('should throw when EmailService returns success=false', async () => {
      mockSendRawEmail.mockResolvedValueOnce({ success: false, error: 'Resend API Error' });
      const job = makeJob();

      await expect(processor.process(job)).rejects.toThrow('Resend API Error');
      expect(mockSendRawEmail).toHaveBeenCalledTimes(1);
    });

    it('should throw generic message when EmailService returns no error string', async () => {
      mockSendRawEmail.mockResolvedValueOnce({ success: false });
      const job = makeJob();

      await expect(processor.process(job)).rejects.toThrow('Email send failed');
    });

    it('should propagate EmailService exceptions for BullMQ retry', async () => {
      mockSendRawEmail.mockRejectedValueOnce(new Error('Network timeout'));
      const job = makeJob();

      await expect(processor.process(job)).rejects.toThrow('Network timeout');
    });

    it('should handle multiple variable replacements across templates', async () => {
      const job = makeJob({
        template: 'booking_reminder',
        variables: {
          customerName: 'Marco Rossi',
          service: 'Cambio Olio',
          date: '2026-04-20',
          time: '15:00',
          vehicle: 'BMW X5',
          bookingCode: 'BK-ABC',
        },
      });

      await processor.process(job);

      const callArg = mockSendRawEmail.mock.calls[0][0];
      expect(callArg.html).toContain('Marco Rossi');
      expect(callArg.html).toContain('Cambio Olio');
    });
  });

  describe('onCompleted', () => {
    it('should log job completion', () => {
      const logSpy = jest.spyOn(processor['logger'], 'log').mockImplementation();
      processor.onCompleted({ id: 'job-complete' } as Job);

      expect(logSpy).toHaveBeenCalledWith('Email job job-complete completed');
    });

    it('should handle numeric job ids', () => {
      const logSpy = jest.spyOn(processor['logger'], 'log').mockImplementation();
      processor.onCompleted({ id: 42 } as unknown as Job);

      expect(logSpy).toHaveBeenCalled();
    });
  });

  describe('onFailed', () => {
    it('should log job failure with error message', () => {
      const errorSpy = jest.spyOn(processor['logger'], 'error').mockImplementation();
      processor.onFailed({ id: 'job-fail' } as Job, new Error('Send failed'));

      expect(errorSpy).toHaveBeenCalledWith('Email job job-fail failed: Send failed');
    });

    it('should handle errors with empty message', () => {
      const errorSpy = jest.spyOn(processor['logger'], 'error').mockImplementation();
      processor.onFailed({ id: 'job-fail2' } as Job, new Error());

      expect(errorSpy).toHaveBeenCalled();
    });

    it('should handle errors with long messages', () => {
      const errorSpy = jest.spyOn(processor['logger'], 'error').mockImplementation();
      const longMsg = 'A'.repeat(500);
      processor.onFailed({ id: 'job-fail3' } as Job, new Error(longMsg));

      expect(errorSpy).toHaveBeenCalledWith(`Email job job-fail3 failed: ${longMsg}`);
    });
  });
});
