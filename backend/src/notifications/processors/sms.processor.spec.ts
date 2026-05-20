import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { SmsProcessor, SmsJobData } from './sms.processor';
import { SmsService } from '../sms/sms.service';

describe('SmsProcessor', () => {
  let processor: SmsProcessor;
  let smsService: jest.Mocked<SmsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsProcessor,
        {
          provide: SmsService,
          useValue: {
            sendBookingConfirmation: jest.fn(),
            sendBookingReminder: jest.fn(),
            sendBookingCancelled: jest.fn(),
            sendInvoiceReady: jest.fn(),
            sendCustom: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get<SmsProcessor>(SmsProcessor);
    smsService = module.get(SmsService) as jest.Mocked<SmsService>;
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process()', () => {
    const createJob = (data: SmsJobData): Job<SmsJobData> =>
      ({
        id: 'job-001',
        data,
        attemptsMade: 0,
      }) as unknown as Job<SmsJobData>;

    it('should send SMS using template type booking_confirmation', async () => {
      smsService.sendBookingConfirmation.mockResolvedValue({
        success: true,
        messageId: 'SM123',
      });

      const job = createJob({
        to: '+393331234567',
        body: '',
        category: 'booking_confirmation',
        templateType: 'booking_confirmation',
        templateData: {
          date: '2024-03-15',
          time: '14:30',
          service: 'Tagliando',
          workshopName: 'Officina',
          bookingCode: 'BK-001',
        },
      });

      const result = await processor.process(job);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('SM123');
      expect(smsService.sendBookingConfirmation).toHaveBeenCalledWith('+393331234567', {
        date: '2024-03-15',
        time: '14:30',
        service: 'Tagliando',
        workshopName: 'Officina',
        bookingCode: 'BK-001',
      });
    });

    it('should send SMS using template type booking_reminder', async () => {
      smsService.sendBookingReminder.mockResolvedValue({
        success: true,
        messageId: 'SM200',
      });

      const job = createJob({
        to: '+393331234567',
        body: '',
        category: 'booking_reminder',
        templateType: 'booking_reminder',
        templateData: {
          date: '2024-03-15',
          time: '14:30',
          service: 'Revisione',
          workshopName: 'AutoService',
          bookingCode: 'BK-005',
        },
      });

      const result = await processor.process(job);

      expect(result.success).toBe(true);
      expect(smsService.sendBookingReminder).toHaveBeenCalled();
    });

    it('should send SMS using template type booking_cancelled', async () => {
      smsService.sendBookingCancelled.mockResolvedValue({
        success: true,
        messageId: 'SM300',
      });

      const job = createJob({
        to: '+393331234567',
        body: '',
        category: 'booking_cancelled',
        templateType: 'booking_cancelled',
        templateData: {
          date: '2024-03-15',
          service: 'Tagliando',
          workshopName: 'Officina',
          bookingCode: 'BK-007',
          cancellationReason: 'Richiesta cliente',
        },
      });

      const result = await processor.process(job);

      expect(result.success).toBe(true);
      expect(smsService.sendBookingCancelled).toHaveBeenCalled();
    });

    it('should send SMS using template type invoice_ready', async () => {
      smsService.sendInvoiceReady.mockResolvedValue({
        success: true,
        messageId: 'SM400',
      });

      const job = createJob({
        to: '+393331234567',
        body: '',
        category: 'invoice_ready',
        templateType: 'invoice_ready',
        templateData: {
          invoiceNumber: 'INV-001',
          amount: '250.00',
          downloadUrl: 'https://mechmind.io/inv/001',
          workshopName: 'Officina',
        },
      });

      const result = await processor.process(job);

      expect(result.success).toBe(true);
      expect(smsService.sendInvoiceReady).toHaveBeenCalled();
    });

    it('should fall back to sendCustom when no templateType is set', async () => {
      smsService.sendCustom.mockResolvedValue({
        success: true,
        messageId: 'SM500',
      });

      const job = createJob({
        to: '+393331234567',
        body: 'Custom message',
        category: 'marketing',
      });

      const result = await processor.process(job);

      expect(result.success).toBe(true);
      expect(smsService.sendCustom).toHaveBeenCalledWith(
        '+393331234567',
        'Custom message',
        'marketing',
      );
    });

    it('should throw on SMS failure to trigger BullMQ retry', async () => {
      smsService.sendCustom.mockResolvedValue({
        success: false,
        error: 'Twilio error',
      });

      const job = createJob({
        to: '+393331234567',
        body: 'Test message',
        category: 'test',
      });

      await expect(processor.process(job)).rejects.toThrow('Twilio error');
    });

    it('should throw on SMS service exception to trigger BullMQ retry', async () => {
      smsService.sendCustom.mockRejectedValue(new Error('Network timeout'));

      const job = createJob({
        to: '+393331234567',
        body: 'Test message',
        category: 'test',
      });

      await expect(processor.process(job)).rejects.toThrow('Network timeout');
    });
  });

  describe('worker events', () => {
    it('should handle completed event', () => {
      const job = { id: 'job-001' } as Job;
      expect(() => processor.onCompleted(job)).not.toThrow();
    });

    it('should handle failed event', () => {
      const job = { id: 'job-001', attemptsMade: 3 } as Job;
      expect(() => processor.onFailed(job, new Error('Final failure'))).not.toThrow();
    });

    it('should handle stalled event', () => {
      expect(() => processor.onStalled('job-001')).not.toThrow();
    });
  });
});
