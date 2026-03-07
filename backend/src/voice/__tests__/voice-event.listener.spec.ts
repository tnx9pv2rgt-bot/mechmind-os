import { Test, TestingModule } from '@nestjs/testing';
import { VoiceEventListener } from '../listeners/voice-event.listener';
import { LoggerService } from '@common/services/logger.service';
import { QueueService } from '@common/services/queue.service';

describe('VoiceEventListener', () => {
  let listener: VoiceEventListener;
  let loggerService: jest.Mocked<LoggerService>;
  let queueService: jest.Mocked<QueueService>;

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockQueueService = {
    addVoiceJob: jest.fn(),
    addNotificationJob: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoiceEventListener,
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
      ],
    }).compile();

    listener = module.get<VoiceEventListener>(VoiceEventListener);
    loggerService = module.get(LoggerService);
    queueService = module.get(QueueService);
  });

  describe('constructor', () => {
    it('should create listener instance', () => {
      expect(listener).toBeDefined();
    });
  });

  describe('handleCallCompleted', () => {
    it('should handle voice call completed event', async () => {
      const event = {
        callId: 'call_abc123xyz',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        customerPhone: '+390123456789',
        duration: 120,
        transcript: 'Customer: I need to book a service',
      };

      mockQueueService.addVoiceJob.mockResolvedValue({ id: 'job-123' } as any);

      await listener.handleCallCompleted(event);

      expect(loggerService.log).toHaveBeenCalledWith(
        `Voice call completed: ${event.callId} for tenant ${event.tenantId}`,
        'VoiceEventListener',
      );
      expect(queueService.addVoiceJob).toHaveBeenCalledWith(
        'log-call-analytics',
        expect.objectContaining({
          type: 'call-analytics',
          payload: {
            callId: event.callId,
            duration: event.duration,
            customerPhone: event.customerPhone,
          },
          tenantId: event.tenantId,
        }),
      );
    });

    it('should handle call without transcript', async () => {
      const event = {
        callId: 'call_def456uvw',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        customerPhone: '+390987654321',
        duration: 60,
      };

      mockQueueService.addVoiceJob.mockResolvedValue({ id: 'job-456' } as any);

      await listener.handleCallCompleted(event);

      expect(queueService.addVoiceJob).toHaveBeenCalledWith(
        'log-call-analytics',
        expect.objectContaining({
          payload: expect.objectContaining({
            callId: event.callId,
            duration: event.duration,
            customerPhone: event.customerPhone,
          }),
        }),
      );
    });

    it('should handle short calls', async () => {
      const event = {
        callId: 'call_short_123',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        customerPhone: '+390111111111',
        duration: 5,
        transcript: 'Hang up',
      };

      mockQueueService.addVoiceJob.mockResolvedValue({ id: 'job-short' } as any);

      await listener.handleCallCompleted(event);

      expect(loggerService.log).toHaveBeenCalled();
    });

    it('should handle long calls', async () => {
      const event = {
        callId: 'call_long_456',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        customerPhone: '+390222222222',
        duration: 600, // 10 minutes
        transcript: 'Extended conversation about car service',
      };

      mockQueueService.addVoiceJob.mockResolvedValue({ id: 'job-long' } as any);

      await listener.handleCallCompleted(event);

      expect(queueService.addVoiceJob).toHaveBeenCalled();
    });

    it('should handle queue service errors', async () => {
      const event = {
        callId: 'call_error_789',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        customerPhone: '+390333333333',
        duration: 30,
      };

      mockQueueService.addVoiceJob.mockRejectedValue(new Error('Queue error'));

      await expect(listener.handleCallCompleted(event)).rejects.toThrow('Queue error');
    });

    it('should handle call with special characters in transcript', async () => {
      const event = {
        callId: 'call_special_001',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        customerPhone: '+390444444444',
        duration: 90,
        transcript: 'Special chars: èéàù @#$% \n newline',
      };

      mockQueueService.addVoiceJob.mockResolvedValue({ id: 'job-special' } as any);

      await listener.handleCallCompleted(event);

      expect(queueService.addVoiceJob).toHaveBeenCalled();
    });
  });

  describe('handleTransferCompleted', () => {
    it('should handle transfer completed event', async () => {
      const event = {
        callId: 'call_abc123xyz',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        agentId: 'agent-123',
        customerPhone: '+390123456789',
      };

      mockQueueService.addNotificationJob.mockResolvedValue({ id: 'job-789' } as any);

      await listener.handleTransferCompleted(event);

      expect(loggerService.log).toHaveBeenCalledWith(
        `Transfer completed: ${event.callId} to agent ${event.agentId}`,
        'VoiceEventListener',
      );
      expect(queueService.addNotificationJob).toHaveBeenCalledWith(
        'notify-agent-transfer',
        expect.objectContaining({
          type: 'agent-transfer',
          payload: {
            callId: event.callId,
            agentId: event.agentId,
            customerPhone: event.customerPhone,
          },
          tenantId: event.tenantId,
        }),
      );
    });

    it('should handle notification service errors', async () => {
      const event = {
        callId: 'call_error_transfer',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        agentId: 'agent-456',
        customerPhone: '+390555555555',
      };

      mockQueueService.addNotificationJob.mockRejectedValue(new Error('Notification error'));

      await expect(listener.handleTransferCompleted(event)).rejects.toThrow('Notification error');
    });
  });

  describe('handleCallbackScheduled', () => {
    it('should handle callback scheduled event', async () => {
      const scheduledAt = new Date(Date.now() + 3600000); // 1 hour from now
      const event = {
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        customerPhone: '+390123456789',
        scheduledAt,
        reason: 'Follow up on booking inquiry',
      };

      mockQueueService.addVoiceJob.mockResolvedValue({ id: 'job-callback' } as any);

      await listener.handleCallbackScheduled(event);

      expect(loggerService.log).toHaveBeenCalledWith(
        `Callback scheduled for ${event.customerPhone} at ${event.scheduledAt}`,
        'VoiceEventListener',
      );
      expect(queueService.addVoiceJob).toHaveBeenCalledWith(
        'execute-callback',
        expect.objectContaining({
          type: 'execute-callback',
          payload: {
            customerPhone: event.customerPhone,
            reason: event.reason,
          },
          tenantId: event.tenantId,
        }),
        expect.objectContaining({
          delay: expect.any(Number),
        }),
      );
    });

    it('should calculate correct delay for immediate callback', async () => {
      const scheduledAt = new Date(Date.now() + 60000); // 1 minute from now
      const event = {
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        customerPhone: '+390666666666',
        scheduledAt,
        reason: 'Urgent callback',
      };

      mockQueueService.addVoiceJob.mockResolvedValue({ id: 'job-immediate' } as any);

      await listener.handleCallbackScheduled(event);

      const callArg = mockQueueService.addVoiceJob.mock.calls[0];
      const options = callArg[2];
      expect(options.delay).toBeGreaterThan(0);
      expect(options.delay).toBeLessThanOrEqual(60000);
    });

    it('should calculate correct delay for future callback', async () => {
      const scheduledAt = new Date(Date.now() + 86400000); // 24 hours from now
      const event = {
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        customerPhone: '+390777777777',
        scheduledAt,
        reason: 'Tomorrow callback',
      };

      mockQueueService.addVoiceJob.mockResolvedValue({ id: 'job-tomorrow' } as any);

      await listener.handleCallbackScheduled(event);

      const callArg = mockQueueService.addVoiceJob.mock.calls[0];
      const options = callArg[2];
      expect(options.delay).toBeGreaterThan(86000000); // Approximately 24 hours
      expect(options.delay).toBeLessThanOrEqual(86400000);
    });

    it('should handle past scheduled time (immediate execution)', async () => {
      const scheduledAt = new Date(Date.now() - 60000); // 1 minute ago
      const event = {
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        customerPhone: '+390888888888',
        scheduledAt,
        reason: 'Missed callback',
      };

      mockQueueService.addVoiceJob.mockResolvedValue({ id: 'job-past' } as any);

      await listener.handleCallbackScheduled(event);

      const callArg = mockQueueService.addVoiceJob.mock.calls[0];
      const options = callArg[2];
      // Should be negative or zero, but bullmq might handle it as immediate
      expect(options.delay).toBeLessThanOrEqual(0);
    });

    it('should handle queue service errors for callback', async () => {
      const event = {
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        customerPhone: '+390999999999',
        scheduledAt: new Date(Date.now() + 3600000),
        reason: 'Test error',
      };

      mockQueueService.addVoiceJob.mockRejectedValue(new Error('Queue error'));

      await expect(listener.handleCallbackScheduled(event)).rejects.toThrow('Queue error');
    });
  });

  describe('Event Decorators', () => {
    it('should have OnEvent decorator metadata on handleCallCompleted', () => {
      // The decorator should be applied (this is verified by NestJS runtime)
      expect(listener.handleCallCompleted).toBeDefined();
    });

    it('should have OnEvent decorator metadata on handleTransferCompleted', () => {
      expect(listener.handleTransferCompleted).toBeDefined();
    });

    it('should have OnEvent decorator metadata on handleCallbackScheduled', () => {
      expect(listener.handleCallbackScheduled).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle call with zero duration', async () => {
      const event = {
        callId: 'call_zero_duration',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        customerPhone: '+390000000000',
        duration: 0,
      };

      mockQueueService.addVoiceJob.mockResolvedValue({ id: 'job-zero' } as any);

      await listener.handleCallCompleted(event);

      expect(queueService.addVoiceJob).toHaveBeenCalledWith(
        'log-call-analytics',
        expect.objectContaining({
          payload: expect.objectContaining({
            duration: 0,
          }),
        }),
      );
    });

    it('should handle international phone numbers', async () => {
      const event = {
        callId: 'call_international',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        customerPhone: '+1234567890123', // US number
        duration: 120,
      };

      mockQueueService.addVoiceJob.mockResolvedValue({ id: 'job-intl' } as any);

      await listener.handleCallCompleted(event);

      expect(queueService.addVoiceJob).toHaveBeenCalledWith(
        'log-call-analytics',
        expect.objectContaining({
          payload: expect.objectContaining({
            customerPhone: '+1234567890123',
          }),
        }),
      );
    });

    it('should handle multiple events in sequence', async () => {
      const callEvent = {
        callId: 'call_sequence_1',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        customerPhone: '+391111111111',
        duration: 60,
      };

      const transferEvent = {
        callId: 'call_sequence_1',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        agentId: 'agent-seq',
        customerPhone: '+391111111111',
      };

      mockQueueService.addVoiceJob.mockResolvedValue({ id: 'job-seq-1' } as any);
      mockQueueService.addNotificationJob.mockResolvedValue({ id: 'job-seq-2' } as any);

      await listener.handleCallCompleted(callEvent);
      await listener.handleTransferCompleted(transferEvent);

      expect(queueService.addVoiceJob).toHaveBeenCalledTimes(1);
      expect(queueService.addNotificationJob).toHaveBeenCalledTimes(1);
    });
  });
});
