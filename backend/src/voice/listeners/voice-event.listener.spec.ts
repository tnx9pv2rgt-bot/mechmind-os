import { VoiceEventListener } from './voice-event.listener';
import { LoggerService } from '@common/services/logger.service';
import { QueueService } from '@common/services/queue.service';

describe('VoiceEventListener', () => {
  let listener: VoiceEventListener;
  let logger: { log: jest.Mock; error: jest.Mock; warn: jest.Mock; debug: jest.Mock };
  let queueService: { addVoiceJob: jest.Mock; addNotificationJob: jest.Mock };

  beforeEach(() => {
    logger = { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
    queueService = {
      addVoiceJob: jest.fn().mockResolvedValue(undefined),
      addNotificationJob: jest.fn().mockResolvedValue(undefined),
    };
    listener = new VoiceEventListener(
      logger as unknown as LoggerService,
      queueService as unknown as QueueService,
    );
  });

  describe('handleCallCompleted', () => {
    it('should log and queue call analytics', async () => {
      const event = {
        callId: 'call-1',
        tenantId: 'tenant-1',
        customerPhone: '+39123456789',
        duration: 120,
        transcript: 'Hello',
      };

      await listener.handleCallCompleted(event);

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('call-1'),
        'VoiceEventListener',
      );

      expect(queueService.addVoiceJob).toHaveBeenCalledWith(
        'log-call-analytics',
        expect.objectContaining({
          type: 'call-analytics',
          payload: expect.objectContaining({
            callId: 'call-1',
            duration: 120,
            customerPhone: '+39123456789',
          }),
          tenantId: 'tenant-1',
        }),
      );
    });

    it('should handle call without transcript', async () => {
      const event = {
        callId: 'call-2',
        tenantId: 'tenant-2',
        customerPhone: '+39000000000',
        duration: 60,
      };

      await listener.handleCallCompleted(event);

      expect(queueService.addVoiceJob).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleTransferCompleted', () => {
    it('should log and queue agent notification', async () => {
      const event = {
        callId: 'call-3',
        tenantId: 'tenant-3',
        agentId: 'agent-1',
        customerPhone: '+39111222333',
      };

      await listener.handleTransferCompleted(event);

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('call-3'),
        'VoiceEventListener',
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('agent-1'),
        'VoiceEventListener',
      );

      expect(queueService.addNotificationJob).toHaveBeenCalledWith(
        'notify-agent-transfer',
        expect.objectContaining({
          type: 'agent-transfer',
          payload: expect.objectContaining({
            callId: 'call-3',
            agentId: 'agent-1',
            customerPhone: '+39111222333',
          }),
          tenantId: 'tenant-3',
        }),
      );
    });
  });

  describe('handleCallbackScheduled', () => {
    it('should log and queue delayed callback job', async () => {
      const scheduledAt = new Date(Date.now() + 3600000); // 1 hour from now
      const event = {
        tenantId: 'tenant-4',
        customerPhone: '+39444555666',
        scheduledAt,
        reason: 'Follow-up needed',
      };

      await listener.handleCallbackScheduled(event);

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('+39444555666'),
        'VoiceEventListener',
      );

      expect(queueService.addVoiceJob).toHaveBeenCalledWith(
        'execute-callback',
        expect.objectContaining({
          type: 'execute-callback',
          payload: expect.objectContaining({
            customerPhone: '+39444555666',
            reason: 'Follow-up needed',
          }),
          tenantId: 'tenant-4',
        }),
        expect.objectContaining({
          delay: expect.any(Number),
        }),
      );

      // Verify delay is approximately correct (within 100ms)
      const actualDelay = queueService.addVoiceJob.mock.calls[0][2].delay;
      expect(actualDelay).toBeGreaterThan(3500000);
      expect(actualDelay).toBeLessThanOrEqual(3600000);
    });
  });
});
