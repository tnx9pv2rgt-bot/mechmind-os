import { Test, TestingModule } from '@nestjs/testing';
import { VapiWebhookService, WebhookProcessingResult } from './vapi-webhook.service';
import { PrismaService } from '@common/services/prisma.service';
import { QueueService } from '@common/services/queue.service';
import { LoggerService } from '@common/services/logger.service';
import { IntentHandlerService } from './intent-handler.service';
import { EscalationService } from './escalation.service';
import {
  VapiWebhookDto,
  VapiEventType,
  VoiceIntent,
} from '../dto/vapi-webhook.dto';

describe('VapiWebhookService', () => {
  let service: VapiWebhookService;
  let prisma: Record<string, Record<string, jest.Mock>>;
  let queueService: { addVoiceJob: jest.Mock; addNotificationJob: jest.Mock };
  let loggerService: { log: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock };
  let intentHandler: {
    handleBookingIntent: jest.Mock;
    handleStatusCheckIntent: jest.Mock;
    handleComplaintIntent: jest.Mock;
  };
  let escalationService: {
    findAvailableAgent: jest.Mock;
    queueForCallback: jest.Mock;
    transferToAgent: jest.Mock;
  };

  const TENANT_ID = 'tenant-001';
  const CALL_ID = 'call_abc123xyz';
  const CUSTOMER_PHONE = '+390123456789';

  const buildPayload = (overrides: Partial<VapiWebhookDto> = {}): VapiWebhookDto => ({
    event: VapiEventType.CALL_COMPLETED,
    callId: CALL_ID,
    tenantId: TENANT_ID,
    customerPhone: CUSTOMER_PHONE,
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      voiceWebhookEvent: {
        create: jest.fn().mockResolvedValue({ id: 'event-001' }),
        count: jest.fn().mockResolvedValue(10),
        groupBy: jest.fn().mockResolvedValue([
          { eventType: 'call_completed', _count: { eventType: 5 } },
          { eventType: 'message', _count: { eventType: 3 } },
        ]),
      },
    };

    queueService = {
      addVoiceJob: jest.fn().mockResolvedValue({ id: 'job-001' }),
      addNotificationJob: jest.fn().mockResolvedValue({ id: 'notif-001' }),
    };

    loggerService = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    intentHandler = {
      handleBookingIntent: jest.fn().mockResolvedValue({
        success: true,
        bookingId: 'booking-001',
        message: 'Booking created successfully',
      }),
      handleStatusCheckIntent: jest.fn().mockResolvedValue(undefined),
      handleComplaintIntent: jest.fn().mockResolvedValue(undefined),
    };

    escalationService = {
      findAvailableAgent: jest.fn().mockResolvedValue({
        id: 'agent-001',
        name: 'John Manager',
        phone: '+390000000000',
        available: true,
      }),
      queueForCallback: jest.fn().mockResolvedValue(undefined),
      transferToAgent: jest.fn().mockResolvedValue({
        escalated: true,
        agentId: 'agent-001',
        reason: 'Transferred to agent: Transfer requested by customer',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VapiWebhookService,
        { provide: PrismaService, useValue: prisma },
        { provide: QueueService, useValue: queueService },
        { provide: LoggerService, useValue: loggerService },
        { provide: IntentHandlerService, useValue: intentHandler },
        { provide: EscalationService, useValue: escalationService },
      ],
    }).compile();

    service = module.get<VapiWebhookService>(VapiWebhookService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processWebhook', () => {
    it('should store webhook event for every incoming payload', async () => {
      // Arrange
      const payload = buildPayload({ intent: VoiceIntent.OTHER });

      // Act
      await service.processWebhook(payload);

      // Assert
      expect(prisma.voiceWebhookEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          callId: CALL_ID,
          eventType: VapiEventType.CALL_COMPLETED,
          tenantId: TENANT_ID,
          customerPhone: CUSTOMER_PHONE,
          processed: false,
        }),
      });
    });

    it('should log the incoming event', async () => {
      // Arrange
      const payload = buildPayload({ intent: VoiceIntent.OTHER });

      // Act
      await service.processWebhook(payload);

      // Assert
      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining(VapiEventType.CALL_COMPLETED),
        'VapiWebhookService',
      );
    });

    describe('CALL_COMPLETED event', () => {
      it('should create a booking when intent is BOOKING with extracted date and time', async () => {
        // Arrange
        const payload = buildPayload({
          event: VapiEventType.CALL_COMPLETED,
          intent: VoiceIntent.BOOKING,
          extractedData: {
            preferredDate: '2024-06-15',
            preferredTime: '09:00',
            serviceType: 'Oil change',
          },
        });

        // Act
        const result = await service.processWebhook(payload);

        // Assert
        expect(result.action).toBe('booking_created');
        expect(result.bookingId).toBe('booking-001');
        expect(intentHandler.handleBookingIntent).toHaveBeenCalledWith(
          TENANT_ID,
          CUSTOMER_PHONE,
          payload.extractedData,
          CALL_ID,
        );
      });

      it('should queue for review when BOOKING intent lacks preferredDate', async () => {
        // Arrange
        const payload = buildPayload({
          event: VapiEventType.CALL_COMPLETED,
          intent: VoiceIntent.BOOKING,
          extractedData: {
            preferredTime: '09:00',
          },
        });

        // Act
        const result = await service.processWebhook(payload);

        // Assert
        expect(result.action).toBe('processed');
        expect(intentHandler.handleBookingIntent).not.toHaveBeenCalled();
      });

      it('should queue for review when BOOKING intent lacks preferredTime', async () => {
        // Arrange
        const payload = buildPayload({
          event: VapiEventType.CALL_COMPLETED,
          intent: VoiceIntent.BOOKING,
          extractedData: {
            preferredDate: '2024-06-15',
          },
        });

        // Act
        const result = await service.processWebhook(payload);

        // Assert
        expect(result.action).toBe('processed');
        expect(intentHandler.handleBookingIntent).not.toHaveBeenCalled();
      });

      it('should handle STATUS_CHECK intent', async () => {
        // Arrange
        const payload = buildPayload({
          event: VapiEventType.CALL_COMPLETED,
          intent: VoiceIntent.STATUS_CHECK,
          extractedData: { licensePlate: 'AB123CD' },
        });

        // Act
        const result = await service.processWebhook(payload);

        // Assert
        expect(result.action).toBe('status_check_processed');
        expect(intentHandler.handleStatusCheckIntent).toHaveBeenCalledWith(
          TENANT_ID,
          CUSTOMER_PHONE,
          { licensePlate: 'AB123CD' },
        );
      });

      it('should pass empty object as extractedData for STATUS_CHECK when missing', async () => {
        // Arrange
        const payload = buildPayload({
          event: VapiEventType.CALL_COMPLETED,
          intent: VoiceIntent.STATUS_CHECK,
        });

        // Act
        await service.processWebhook(payload);

        // Assert
        expect(intentHandler.handleStatusCheckIntent).toHaveBeenCalledWith(
          TENANT_ID,
          CUSTOMER_PHONE,
          {},
        );
      });

      it('should handle COMPLAINT intent', async () => {
        // Arrange
        const payload = buildPayload({
          event: VapiEventType.CALL_COMPLETED,
          intent: VoiceIntent.COMPLAINT,
          transcript: 'I am very unhappy with the service',
          extractedData: { issueDescription: 'Bad brake repair' },
        });

        // Act
        const result = await service.processWebhook(payload);

        // Assert
        expect(result.action).toBe('complaint_logged');
        expect(intentHandler.handleComplaintIntent).toHaveBeenCalledWith(
          TENANT_ID,
          CUSTOMER_PHONE,
          'I am very unhappy with the service',
          { issueDescription: 'Bad brake repair' },
        );
      });

      it('should pass empty object as extractedData for COMPLAINT when missing', async () => {
        // Arrange
        const payload = buildPayload({
          event: VapiEventType.CALL_COMPLETED,
          intent: VoiceIntent.COMPLAINT,
          transcript: 'Not happy',
        });

        // Act
        await service.processWebhook(payload);

        // Assert
        expect(intentHandler.handleComplaintIntent).toHaveBeenCalledWith(
          TENANT_ID,
          CUSTOMER_PHONE,
          'Not happy',
          {},
        );
      });

      it('should queue for review when intent is OTHER', async () => {
        // Arrange
        const payload = buildPayload({
          event: VapiEventType.CALL_COMPLETED,
          intent: VoiceIntent.OTHER,
          transcript: 'Random conversation',
        });

        // Act
        const result = await service.processWebhook(payload);

        // Assert
        expect(result.action).toBe('queued_for_review');
        expect(queueService.addVoiceJob).toHaveBeenCalledWith(
          'manual-review',
          expect.objectContaining({
            type: 'manual-review',
            payload: expect.objectContaining({
              callId: CALL_ID,
              transcript: 'Random conversation',
              customerPhone: CUSTOMER_PHONE,
            }),
            tenantId: TENANT_ID,
          }),
        );
      });

      it('should queue for review when intent is undefined', async () => {
        // Arrange
        const payload = buildPayload({
          event: VapiEventType.CALL_COMPLETED,
        });

        // Act
        const result = await service.processWebhook(payload);

        // Assert
        expect(result.action).toBe('queued_for_review');
      });
    });

    describe('MESSAGE event', () => {
      it('should return message_logged action', async () => {
        // Arrange
        const payload = buildPayload({
          event: VapiEventType.MESSAGE,
          transcript: 'Customer: Hello, I need help',
        });

        // Act
        const result = await service.processWebhook(payload);

        // Assert
        expect(result.action).toBe('message_logged');
      });
    });

    describe('TRANSFER_REQUESTED event', () => {
      it('should return transfer_completed when agent is available', async () => {
        // Arrange
        const payload = buildPayload({
          event: VapiEventType.TRANSFER_REQUESTED,
        });

        // Act
        const result = await service.processWebhook(payload);

        // Assert
        expect(result.action).toBe('transfer_completed');
        expect(result.escalation).toBeDefined();
        expect(result.escalation?.escalated).toBe(true);
        expect(result.escalation?.agentId).toBe('agent-001');
      });

      it('should return transfer_queued when no agent is available', async () => {
        // Arrange
        escalationService.findAvailableAgent.mockResolvedValue(null);
        const payload = buildPayload({
          event: VapiEventType.TRANSFER_REQUESTED,
        });

        // Act
        const result = await service.processWebhook(payload);

        // Assert
        expect(result.action).toBe('transfer_queued');
        expect(result.escalation?.escalated).toBe(false);
        expect(escalationService.queueForCallback).toHaveBeenCalledWith(
          TENANT_ID,
          CUSTOMER_PHONE,
          'Transfer requested by customer',
        );
      });
    });

    describe('CALL_STARTED event', () => {
      it('should return call_logged action', async () => {
        // Arrange
        const payload = buildPayload({
          event: VapiEventType.CALL_STARTED,
        });

        // Act
        const result = await service.processWebhook(payload);

        // Assert
        expect(result.action).toBe('call_logged');
      });
    });

    describe('CALL_UPDATED event', () => {
      it('should return call_updated action', async () => {
        // Arrange
        const payload = buildPayload({
          event: VapiEventType.CALL_UPDATED,
        });

        // Act
        const result = await service.processWebhook(payload);

        // Assert
        expect(result.action).toBe('call_updated');
      });
    });

    describe('unknown event type', () => {
      it('should return ignored for unhandled event types', async () => {
        // Arrange
        const payload = buildPayload({
          event: 'unknown_event' as VapiEventType,
        });

        // Act
        const result = await service.processWebhook(payload);

        // Assert
        expect(result.action).toBe('ignored');
      });
    });

    describe('tenant isolation', () => {
      it('should pass tenantId through to intent handlers for BOOKING', async () => {
        // Arrange
        const tenantA = 'tenant-aaa';
        const payload = buildPayload({
          tenantId: tenantA,
          intent: VoiceIntent.BOOKING,
          extractedData: { preferredDate: '2024-07-01', preferredTime: '10:00' },
        });

        // Act
        await service.processWebhook(payload);

        // Assert
        expect(intentHandler.handleBookingIntent).toHaveBeenCalledWith(
          tenantA,
          expect.any(String),
          expect.any(Object),
          expect.any(String),
        );
      });

      it('should pass tenantId through to escalation service for TRANSFER', async () => {
        // Arrange
        const tenantB = 'tenant-bbb';
        const payload = buildPayload({
          tenantId: tenantB,
          event: VapiEventType.TRANSFER_REQUESTED,
        });

        // Act
        await service.processWebhook(payload);

        // Assert
        expect(escalationService.findAvailableAgent).toHaveBeenCalledWith(
          tenantB,
          undefined,
        );
      });

      it('should store webhook event with correct tenantId', async () => {
        // Arrange
        const tenantC = 'tenant-ccc';
        const payload = buildPayload({
          tenantId: tenantC,
          intent: VoiceIntent.OTHER,
        });

        // Act
        await service.processWebhook(payload);

        // Assert
        expect(prisma.voiceWebhookEvent.create).toHaveBeenCalledWith({
          data: expect.objectContaining({ tenantId: tenantC }),
        });
      });
    });

    describe('error handling', () => {
      it('should not throw when storeWebhookEvent fails', async () => {
        // Arrange
        prisma.voiceWebhookEvent.create.mockRejectedValue(
          new Error('Database connection lost'),
        );
        const payload = buildPayload({ event: VapiEventType.CALL_STARTED });

        // Act & Assert - should not throw
        const result = await service.processWebhook(payload);
        expect(result.action).toBe('call_logged');
      });
    });
  });

  describe('handleTransfer', () => {
    it('should return escalation result when agent is available', async () => {
      // Arrange
      const transferPayload = {
        callId: CALL_ID,
        tenantId: TENANT_ID,
        customerPhone: CUSTOMER_PHONE,
        reason: 'Customer wants human',
      };

      // Act
      const result = await service.handleTransfer(transferPayload);

      // Assert
      expect(result.escalated).toBe(true);
      expect(result.agentId).toBe('agent-001');
      expect(result.reason).toBe('Customer wants human');
      expect(escalationService.transferToAgent).toHaveBeenCalledWith(
        CALL_ID,
        'agent-001',
        'Customer wants human',
      );
    });

    it('should queue for callback when no agent is available', async () => {
      // Arrange
      escalationService.findAvailableAgent.mockResolvedValue(null);
      const transferPayload = {
        callId: CALL_ID,
        tenantId: TENANT_ID,
        customerPhone: CUSTOMER_PHONE,
        reason: 'Need human help',
      };

      // Act
      const result = await service.handleTransfer(transferPayload);

      // Assert
      expect(result.escalated).toBe(false);
      expect(result.reason).toBe('No agents available, queued for callback');
      expect(escalationService.queueForCallback).toHaveBeenCalledWith(
        TENANT_ID,
        CUSTOMER_PHONE,
        'Need human help',
      );
      expect(escalationService.transferToAgent).not.toHaveBeenCalled();
    });

    it('should pass category to findAvailableAgent when provided', async () => {
      // Arrange
      const transferPayload = {
        callId: CALL_ID,
        tenantId: TENANT_ID,
        customerPhone: CUSTOMER_PHONE,
        reason: 'Booking problem',
        category: 'booking_issue',
      };

      // Act
      await service.handleTransfer(transferPayload);

      // Assert
      expect(escalationService.findAvailableAgent).toHaveBeenCalledWith(
        TENANT_ID,
        'booking_issue',
      );
    });
  });

  describe('getStats', () => {
    it('should return aggregated stats for a tenant', async () => {
      // Arrange
      prisma.voiceWebhookEvent.count
        .mockResolvedValueOnce(10) // totalEvents
        .mockResolvedValueOnce(7) // processedCount
        .mockResolvedValueOnce(3); // unprocessedCount

      // Act
      const result = await service.getStats(TENANT_ID);

      // Assert
      expect(result).toEqual({
        total: 10,
        byEventType: {
          call_completed: 5,
          message: 3,
        },
        processed: 7,
        unprocessed: 3,
      });
    });

    it('should filter stats by date range when provided', async () => {
      // Arrange
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-06-30');
      prisma.voiceWebhookEvent.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(1);
      prisma.voiceWebhookEvent.groupBy.mockResolvedValue([]);

      // Act
      await service.getStats(TENANT_ID, fromDate, toDate);

      // Assert
      expect(prisma.voiceWebhookEvent.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenantId: TENANT_ID,
          createdAt: {
            gte: fromDate,
            lte: toDate,
          },
        }),
      });
    });

    it('should not include date filter when dates are not provided', async () => {
      // Arrange
      prisma.voiceWebhookEvent.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      prisma.voiceWebhookEvent.groupBy.mockResolvedValue([]);

      // Act
      await service.getStats(TENANT_ID);

      // Assert
      expect(prisma.voiceWebhookEvent.count).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
      });
    });
  });
});
