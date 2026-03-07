import { Test, TestingModule } from '@nestjs/testing';
import { VapiWebhookService, WebhookProcessingResult } from '../services/vapi-webhook.service';
import { PrismaService } from '@common/services/prisma.service';
import { QueueService } from '@common/services/queue.service';
import { LoggerService } from '@common/services/logger.service';
import { IntentHandlerService } from '../services/intent-handler.service';
import { EscalationService } from '../services/escalation.service';
import {
  VapiWebhookDto,
  VapiEventType,
  VoiceIntent,
  TransferRequestDto,
} from '../dto/vapi-webhook.dto';

describe('VapiWebhookService', () => {
  let service: VapiWebhookService;
  let prisma: jest.Mocked<PrismaService>;
  let queueService: jest.Mocked<QueueService>;
  let loggerService: jest.Mocked<LoggerService>;
  let intentHandler: jest.Mocked<IntentHandlerService>;
  let escalationService: jest.Mocked<EscalationService>;

  const mockPrisma = {
    voiceWebhookEvent: {
      create: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  const mockQueueService = {
    addVoiceJob: jest.fn(),
    addNotificationJob: jest.fn(),
    addBookingJob: jest.fn(),
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockIntentHandler = {
    handleBookingIntent: jest.fn(),
    handleStatusCheckIntent: jest.fn(),
    handleComplaintIntent: jest.fn(),
  };

  const mockEscalationService = {
    findAvailableAgent: jest.fn(),
    queueForCallback: jest.fn(),
    transferToAgent: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VapiWebhookService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
        {
          provide: IntentHandlerService,
          useValue: mockIntentHandler,
        },
        {
          provide: EscalationService,
          useValue: mockEscalationService,
        },
      ],
    }).compile();

    service = module.get<VapiWebhookService>(VapiWebhookService);
    prisma = module.get(PrismaService);
    queueService = module.get(QueueService);
    loggerService = module.get(LoggerService);
    intentHandler = module.get(IntentHandlerService);
    escalationService = module.get(EscalationService);
  });

  describe('constructor', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
    });
  });

  describe('processWebhook', () => {
    const basePayload: VapiWebhookDto = {
      event: VapiEventType.CALL_COMPLETED,
      callId: 'call_abc123xyz',
      customerPhone: '+390123456789',
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
    };

    it('should store webhook event for audit trail', async () => {
      mockPrisma.voiceWebhookEvent.create.mockResolvedValue({ id: 'event-123' });

      await service.processWebhook(basePayload);

      expect(mockPrisma.voiceWebhookEvent.create).toHaveBeenCalledWith({
        data: {
          callId: basePayload.callId,
          eventType: basePayload.event,
          tenantId: basePayload.tenantId,
          customerPhone: basePayload.customerPhone,
          payload: basePayload,
          processed: false,
        },
      });
      expect(loggerService.log).toHaveBeenCalled();
    });

    describe('CALL_COMPLETED event', () => {
      it('should handle booking intent with valid data', async () => {
        const payload: VapiWebhookDto = {
          ...basePayload,
          intent: VoiceIntent.BOOKING,
          extractedData: {
            preferredDate: '2024-01-15',
            preferredTime: '09:00',
            serviceType: 'Tagliando',
            licensePlate: 'AB123CD',
          },
        };

        mockPrisma.voiceWebhookEvent.create.mockResolvedValue({ id: 'event-123' });
        mockIntentHandler.handleBookingIntent.mockResolvedValue({
          success: true,
          bookingId: 'booking-123',
          message: 'Booking created successfully',
        });

        const result = await service.processWebhook(payload);

        expect(result).toEqual({
          action: 'booking_created',
          bookingId: 'booking-123',
        });
        expect(intentHandler.handleBookingIntent).toHaveBeenCalledWith(
          payload.tenantId,
          payload.customerPhone,
          payload.extractedData,
          payload.callId,
        );
      });

      it('should handle booking intent without preferred date', async () => {
        const payload: VapiWebhookDto = {
          ...basePayload,
          intent: VoiceIntent.BOOKING,
          extractedData: {
            serviceType: 'Revisione',
          },
        };

        mockPrisma.voiceWebhookEvent.create.mockResolvedValue({ id: 'event-123' });
        mockQueueService.addVoiceJob.mockResolvedValue({ id: 'job-123' } as any);

        const result = await service.processWebhook(payload);

        expect(result).toEqual({ action: 'processed' });
        expect(intentHandler.handleBookingIntent).not.toHaveBeenCalled();
      });

      it('should handle booking intent without preferred time', async () => {
        const payload: VapiWebhookDto = {
          ...basePayload,
          intent: VoiceIntent.BOOKING,
          extractedData: {
            preferredDate: '2024-01-15',
            serviceType: 'Cambio gomme',
          },
        };

        mockPrisma.voiceWebhookEvent.create.mockResolvedValue({ id: 'event-123' });

        const result = await service.processWebhook(payload);

        expect(result).toEqual({ action: 'processed' });
        expect(intentHandler.handleBookingIntent).not.toHaveBeenCalled();
      });

      it('should handle status_check intent', async () => {
        const payload: VapiWebhookDto = {
          ...basePayload,
          intent: VoiceIntent.STATUS_CHECK,
          extractedData: {
            licensePlate: 'AB123CD',
          },
        };

        mockPrisma.voiceWebhookEvent.create.mockResolvedValue({ id: 'event-123' });
        mockIntentHandler.handleStatusCheckIntent.mockResolvedValue(undefined);

        const result = await service.processWebhook(payload);

        expect(result).toEqual({ action: 'status_check_processed' });
        expect(intentHandler.handleStatusCheckIntent).toHaveBeenCalledWith(
          payload.tenantId,
          payload.customerPhone,
          payload.extractedData,
        );
      });

      it('should handle complaint intent', async () => {
        const payload: VapiWebhookDto = {
          ...basePayload,
          intent: VoiceIntent.COMPLAINT,
          transcript: 'I am unhappy with the service',
          extractedData: {
            issueDescription: 'Problem with oil change',
          },
        };

        mockPrisma.voiceWebhookEvent.create.mockResolvedValue({ id: 'event-123' });
        mockIntentHandler.handleComplaintIntent.mockResolvedValue(undefined);

        const result = await service.processWebhook(payload);

        expect(result).toEqual({ action: 'complaint_logged' });
        expect(intentHandler.handleComplaintIntent).toHaveBeenCalledWith(
          payload.tenantId,
          payload.customerPhone,
          payload.transcript,
          payload.extractedData,
        );
      });

      it('should queue for review on other intent', async () => {
        const payload: VapiWebhookDto = {
          ...basePayload,
          intent: VoiceIntent.OTHER,
          transcript: 'Random conversation',
        };

        mockPrisma.voiceWebhookEvent.create.mockResolvedValue({ id: 'event-123' });
        mockQueueService.addVoiceJob.mockResolvedValue({ id: 'job-123' } as any);

        const result = await service.processWebhook(payload);

        expect(result).toEqual({ action: 'queued_for_review' });
        expect(queueService.addVoiceJob).toHaveBeenCalledWith(
          'manual-review',
          expect.objectContaining({
            type: 'manual-review',
            payload: expect.objectContaining({
              callId: payload.callId,
              transcript: payload.transcript,
              customerPhone: payload.customerPhone,
            }),
            tenantId: payload.tenantId,
          }),
        );
      });

      it('should queue for review when no intent provided', async () => {
        const payload: VapiWebhookDto = {
          ...basePayload,
          transcript: 'Unclear request',
        };

        mockPrisma.voiceWebhookEvent.create.mockResolvedValue({ id: 'event-123' });
        mockQueueService.addVoiceJob.mockResolvedValue({ id: 'job-123' } as any);

        const result = await service.processWebhook(payload);

        expect(result).toEqual({ action: 'queued_for_review' });
      });
    });

    describe('MESSAGE event', () => {
      it('should handle message event', async () => {
        const payload: VapiWebhookDto = {
          ...basePayload,
          event: VapiEventType.MESSAGE,
          transcript: 'Real-time conversation update',
        };

        mockPrisma.voiceWebhookEvent.create.mockResolvedValue({ id: 'event-123' });

        const result = await service.processWebhook(payload);

        expect(result).toEqual({ action: 'message_logged' });
      });
    });

    describe('CALL_STARTED event', () => {
      it('should handle call started event', async () => {
        const payload: VapiWebhookDto = {
          ...basePayload,
          event: VapiEventType.CALL_STARTED,
        };

        mockPrisma.voiceWebhookEvent.create.mockResolvedValue({ id: 'event-123' });

        const result = await service.processWebhook(payload);

        expect(result).toEqual({ action: 'call_logged' });
      });
    });

    describe('CALL_UPDATED event', () => {
      it('should handle call updated event', async () => {
        const payload: VapiWebhookDto = {
          ...basePayload,
          event: VapiEventType.CALL_UPDATED,
        };

        mockPrisma.voiceWebhookEvent.create.mockResolvedValue({ id: 'event-123' });

        const result = await service.processWebhook(payload);

        expect(result).toEqual({ action: 'call_updated' });
      });
    });

    describe('TRANSFER_REQUESTED event', () => {
      it('should handle transfer requested event when escalated', async () => {
        const payload: VapiWebhookDto = {
          ...basePayload,
          event: VapiEventType.TRANSFER_REQUESTED,
        };

        mockPrisma.voiceWebhookEvent.create.mockResolvedValue({ id: 'event-123' });
        mockEscalationService.findAvailableAgent.mockResolvedValue({
          id: 'agent-123',
          name: 'John Doe',
          phone: '+39123456789',
          available: true,
        });
        mockEscalationService.transferToAgent.mockResolvedValue(undefined);

        const result = await service.processWebhook(payload);

        expect(result.action).toBe('transfer_completed');
        expect(result.escalation?.escalated).toBe(true);
        expect(escalationService.findAvailableAgent).toHaveBeenCalledWith(
          payload.tenantId,
          undefined,
        );
      });

      it('should handle transfer requested event when not escalated', async () => {
        const payload: VapiWebhookDto = {
          ...basePayload,
          event: VapiEventType.TRANSFER_REQUESTED,
        };

        mockPrisma.voiceWebhookEvent.create.mockResolvedValue({ id: 'event-123' });
        mockEscalationService.findAvailableAgent.mockResolvedValue(null);
        mockEscalationService.queueForCallback.mockResolvedValue(undefined);

        const result = await service.processWebhook(payload);

        expect(result.action).toBe('transfer_queued');
        expect(result.escalation?.escalated).toBe(false);
      });
    });

    describe('Unknown event type', () => {
      it('should handle unknown event type gracefully', async () => {
        const payload: VapiWebhookDto = {
          ...basePayload,
          event: 'unknown_event' as VapiEventType,
        };

        mockPrisma.voiceWebhookEvent.create.mockResolvedValue({ id: 'event-123' });

        const result = await service.processWebhook(payload);

        expect(result).toEqual({ action: 'ignored' });
      });
    });

    describe('storeWebhookEvent error handling', () => {
      it('should continue processing if event storage fails', async () => {
        mockPrisma.voiceWebhookEvent.create.mockRejectedValue(
          new Error('Database error'),
        );
        mockIntentHandler.handleStatusCheckIntent.mockResolvedValue(undefined);

        const payload: VapiWebhookDto = {
          ...basePayload,
          intent: VoiceIntent.STATUS_CHECK,
        };

        const result = await service.processWebhook(payload);

        expect(result).toEqual({ action: 'status_check_processed' });
      });
    });
  });

  describe('handleTransfer', () => {
    const transferPayload: TransferRequestDto = {
      callId: 'call_abc123xyz',
      customerPhone: '+390123456789',
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
      reason: 'Customer requests human agent',
      category: 'technical_issue',
    };

    it('should transfer to available agent', async () => {
      mockEscalationService.findAvailableAgent.mockResolvedValue({
        id: 'agent-123',
        name: 'John Doe',
        phone: '+39123456789',
        available: true,
      });
      mockEscalationService.transferToAgent.mockResolvedValue(undefined);

      const result = await service.handleTransfer(transferPayload);

      expect(result).toEqual({
        escalated: true,
        reason: transferPayload.reason,
        agentId: 'agent-123',
      });
      expect(escalationService.findAvailableAgent).toHaveBeenCalledWith(
        transferPayload.tenantId,
        transferPayload.category,
      );
      expect(escalationService.transferToAgent).toHaveBeenCalledWith(
        transferPayload.callId,
        'agent-123',
        transferPayload.reason,
      );
    });

    it('should queue for callback when no agents available', async () => {
      mockEscalationService.findAvailableAgent.mockResolvedValue(null);
      mockEscalationService.queueForCallback.mockResolvedValue(undefined);

      const result = await service.handleTransfer(transferPayload);

      expect(result).toEqual({
        escalated: false,
        reason: 'No agents available, queued for callback',
      });
      expect(escalationService.queueForCallback).toHaveBeenCalledWith(
        transferPayload.tenantId,
        transferPayload.customerPhone,
        transferPayload.reason,
      );
    });

    it('should handle transfer without category', async () => {
      const payloadWithoutCategory = { ...transferPayload };
      delete (payloadWithoutCategory as any).category;

      mockEscalationService.findAvailableAgent.mockResolvedValue({
        id: 'agent-123',
        name: 'John Doe',
        phone: '+39123456789',
        available: true,
      });
      mockEscalationService.transferToAgent.mockResolvedValue(undefined);

      await service.handleTransfer(payloadWithoutCategory);

      expect(escalationService.findAvailableAgent).toHaveBeenCalledWith(
        transferPayload.tenantId,
        undefined,
      );
    });
  });

  describe('getStats', () => {
    it('should return webhook event statistics', async () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const mockEvents = [
        { eventType: 'call_completed', _count: { eventType: 10 } },
        { eventType: 'call_started', _count: { eventType: 5 } },
      ];

      mockPrisma.voiceWebhookEvent.count.mockResolvedValueOnce(15);
      mockPrisma.voiceWebhookEvent.groupBy.mockResolvedValue(mockEvents);
      mockPrisma.voiceWebhookEvent.count.mockResolvedValueOnce(8);
      mockPrisma.voiceWebhookEvent.count.mockResolvedValueOnce(7);

      const result = await service.getStats(tenantId);

      expect(result).toEqual({
        total: 15,
        byEventType: {
          call_completed: 10,
          call_started: 5,
        },
        processed: 8,
        unprocessed: 7,
      });
    });

    it('should return statistics with date range', async () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      mockPrisma.voiceWebhookEvent.count.mockResolvedValueOnce(0);
      mockPrisma.voiceWebhookEvent.groupBy.mockResolvedValue([]);
      mockPrisma.voiceWebhookEvent.count.mockResolvedValueOnce(0);
      mockPrisma.voiceWebhookEvent.count.mockResolvedValueOnce(0);

      await service.getStats(tenantId, fromDate, toDate);

      expect(mockPrisma.voiceWebhookEvent.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            createdAt: {
              gte: fromDate,
              lte: toDate,
            },
          }),
        }),
      );
    });

    it('should return statistics without date range', async () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';

      mockPrisma.voiceWebhookEvent.count.mockResolvedValueOnce(0);
      mockPrisma.voiceWebhookEvent.groupBy.mockResolvedValue([]);
      mockPrisma.voiceWebhookEvent.count.mockResolvedValueOnce(0);
      mockPrisma.voiceWebhookEvent.count.mockResolvedValueOnce(0);

      await service.getStats(tenantId);

      expect(mockPrisma.voiceWebhookEvent.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId },
        }),
      );
    });
  });
});
