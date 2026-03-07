import { Test, TestingModule } from '@nestjs/testing';
import { EscalationService, Agent, EscalationResult } from '../services/escalation.service';
import { PrismaService } from '@common/services/prisma.service';
import { QueueService } from '@common/services/queue.service';
import { LoggerService } from '@common/services/logger.service';

describe('EscalationService', () => {
  let service: EscalationService;
  let prisma: jest.Mocked<PrismaService>;
  let queueService: jest.Mocked<QueueService>;
  let loggerService: jest.Mocked<LoggerService>;

  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
    },
  };

  const mockQueueService = {
    addVoiceJob: jest.fn(),
    addNotificationJob: jest.fn(),
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EscalationService,
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
      ],
    }).compile();

    service = module.get<EscalationService>(EscalationService);
    prisma = module.get(PrismaService);
    queueService = module.get(QueueService);
    loggerService = module.get(LoggerService);
  });

  describe('constructor', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
    });
  });

  describe('findAvailableAgent', () => {
    const tenantId = '550e8400-e29b-41d4-a716-446655440000';

    it('should return available manager agent', async () => {
      const mockUser = {
        id: 'agent-123',
        firstName: 'Mario',
        lastName: 'Rossi',
      };

      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);

      const result = await service.findAvailableAgent(tenantId);

      expect(result).toEqual({
        id: 'agent-123',
        name: 'Mario Rossi',
        phone: '',
        available: true,
      });
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId,
          role: 'MANAGER',
          isActive: true,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      });
    });

    it('should return null when no agents available', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await service.findAvailableAgent(tenantId);

      expect(result).toBeNull();
    });

    it('should search with category parameter', async () => {
      const category = 'technical_issue';
      const mockUser = {
        id: 'agent-456',
        firstName: 'Luigi',
        lastName: 'Bianchi',
      };

      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);

      await service.findAvailableAgent(tenantId, category);

      // Currently category is not used in implementation, but interface supports it
      expect(mockPrisma.user.findFirst).toHaveBeenCalled();
    });

    it('should handle agent without last name', async () => {
      const mockUser = {
        id: 'agent-789',
        firstName: 'Test',
        lastName: null,
      };

      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);

      const result = await service.findAvailableAgent(tenantId);

      expect(result?.name).toBe('Test null');
    });

    it('should handle agent with empty names', async () => {
      const mockUser = {
        id: 'agent-000',
        firstName: null,
        lastName: null,
      };

      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);

      const result = await service.findAvailableAgent(tenantId);

      expect(result?.name).toBe('null null');
    });

    it('should handle undefined category parameter', async () => {
      const mockUser = {
        id: 'agent-789',
        firstName: 'Test',
        lastName: 'Agent',
      };

      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);

      const result = await service.findAvailableAgent(tenantId, undefined);

      expect(result).not.toBeNull();
    });
  });

  describe('transferToAgent', () => {
    const callId = 'call_abc123xyz';
    const agentId = 'agent-123';
    const reason = 'Customer requested human agent';

    it('should transfer call to agent successfully', async () => {
      mockQueueService.addVoiceJob.mockResolvedValue({ id: 'job-123' } as any);

      const result = await service.transferToAgent(callId, agentId, reason);

      expect(result).toEqual({
        escalated: true,
        agentId,
        reason: `Transferred to agent: ${reason}`,
      });
      expect(queueService.addVoiceJob).toHaveBeenCalledWith(
        'transfer-call',
        expect.objectContaining({
          type: 'transfer-call',
          payload: {
            callId,
            agentId,
            reason,
          },
        }),
      );
    });

    it('should handle transfer with technical category', async () => {
      const technicalReason = 'Technical issue requires specialist';
      mockQueueService.addVoiceJob.mockResolvedValue({ id: 'job-456' } as any);

      const result = await service.transferToAgent(callId, agentId, technicalReason);

      expect(result.escalated).toBe(true);
      expect(result.reason).toContain(technicalReason);
    });

    it('should handle transfer with billing category', async () => {
      const billingReason = 'Billing inquiry';
      mockQueueService.addVoiceJob.mockResolvedValue({ id: 'job-789' } as any);

      const result = await service.transferToAgent(callId, agentId, billingReason);

      expect(result.escalated).toBe(true);
    });

    it('should handle queue service error', async () => {
      mockQueueService.addVoiceJob.mockRejectedValue(new Error('Queue error'));

      await expect(service.transferToAgent(callId, agentId, reason)).rejects.toThrow(
        'Queue error',
      );
    });

    it('should handle empty reason', async () => {
      mockQueueService.addVoiceJob.mockResolvedValue({ id: 'job-123' } as any);

      const result = await service.transferToAgent(callId, agentId, '');

      expect(result.reason).toBe('Transferred to agent: ');
    });
  });

  describe('queueForCallback', () => {
    const tenantId = '550e8400-e29b-41d4-a716-446655440000';
    const customerPhone = '+390123456789';
    const reason = 'No agents available';

    it('should queue customer for callback with high priority', async () => {
      mockQueueService.addVoiceJob.mockResolvedValue({ id: 'job-123' } as any);
      mockQueueService.addNotificationJob.mockResolvedValue({ id: 'job-456' } as any);

      await service.queueForCallback(tenantId, customerPhone, reason);

      expect(queueService.addVoiceJob).toHaveBeenCalledWith(
        'schedule-callback',
        expect.objectContaining({
          type: 'schedule-callback',
          payload: {
            customerPhone,
            reason,
            priority: 'high',
          },
          tenantId,
        }),
        expect.objectContaining({
          priority: 5,
          delay: 300000, // 5 minutes
        }),
      );
    });

    it('should notify managers about callback needed', async () => {
      mockQueueService.addVoiceJob.mockResolvedValue({ id: 'job-123' } as any);
      mockQueueService.addNotificationJob.mockResolvedValue({ id: 'job-456' } as any);

      await service.queueForCallback(tenantId, customerPhone, reason);

      expect(queueService.addNotificationJob).toHaveBeenCalledWith(
        'notify-callback-needed',
        expect.objectContaining({
          type: 'callback-needed',
          payload: {
            customerPhone,
            reason,
          },
          tenantId,
        }),
      );
    });

    it('should handle urgent callback requests', async () => {
      const urgentReason = 'Customer timeout - urgent callback needed';
      mockQueueService.addVoiceJob.mockResolvedValue({ id: 'job-789' } as any);
      mockQueueService.addNotificationJob.mockResolvedValue({ id: 'job-abc' } as any);

      await service.queueForCallback(tenantId, customerPhone, urgentReason);

      expect(queueService.addVoiceJob).toHaveBeenCalledWith(
        'schedule-callback',
        expect.objectContaining({
          payload: expect.objectContaining({
            reason: urgentReason,
            priority: 'high',
          }),
        }),
        expect.any(Object),
      );
    });

    it('should handle service errors gracefully', async () => {
      mockQueueService.addVoiceJob.mockRejectedValue(new Error('Service error'));

      await expect(
        service.queueForCallback(tenantId, customerPhone, reason),
      ).rejects.toThrow('Service error');
    });
  });

  describe('getEscalationStats', () => {
    const tenantId = '550e8400-e29b-41d4-a716-446655440000';

    it('should return escalation statistics', async () => {
      const result = await service.getEscalationStats(tenantId);

      expect(result).toEqual({
        totalEscalations: 0,
        averageWaitTime: 0,
        successfulTransfers: 0,
        callbackQueueLength: 0,
      });
    });

    it('should return statistics with date range', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      const result = await service.getEscalationStats(tenantId, fromDate, toDate);

      expect(result).toEqual({
        totalEscalations: 0,
        averageWaitTime: 0,
        successfulTransfers: 0,
        callbackQueueLength: 0,
      });
    });
  });

  describe('shouldEscalate', () => {
    it('should escalate when customer requests human', () => {
      const transcript = 'I want to speak to a human';
      const intent = 'other';
      const sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';

      const result = service.shouldEscalate(transcript, intent, sentiment);

      expect(result.shouldEscalate).toBe(true);
      expect(result.reason).toBe('Customer requested human agent');
    });

    it('should escalate when customer requests agent', () => {
      const transcript = 'Can I talk to an agent?';
      const intent = 'other';
      const sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';

      const result = service.shouldEscalate(transcript, intent, sentiment);

      expect(result.shouldEscalate).toBe(true);
      expect(result.reason).toBe('Customer requested human agent');
    });

    it('should escalate when customer requests operator', () => {
      const transcript = 'Please connect me to an operator';
      const intent = 'other';
      const sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';

      const result = service.shouldEscalate(transcript, intent, sentiment);

      expect(result.shouldEscalate).toBe(true);
    });

    it('should escalate on negative sentiment', () => {
      const transcript = 'This is terrible service';
      const intent = 'other';
      const sentiment: 'positive' | 'neutral' | 'negative' = 'negative';

      const result = service.shouldEscalate(transcript, intent, sentiment);

      expect(result.shouldEscalate).toBe(true);
      expect(result.reason).toBe('Negative sentiment detected');
    });

    it('should escalate complex complaints', () => {
      const transcript = 'I have a very complicated issue with my car that needs extensive explanation and discussion about what happened during the service appointment yesterday. ' + 'This is a very long complaint that requires immediate attention and review.'.repeat(3);
      const intent = 'complaint';
      const sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';

      const result = service.shouldEscalate(transcript, intent, sentiment);

      expect(result.shouldEscalate).toBe(true);
      expect(result.reason).toBe('Complex complaint requires human review');
    });

    it('should not escalate short complaints', () => {
      const transcript = 'I have a complaint';
      const intent = 'complaint';
      const sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';

      const result = service.shouldEscalate(transcript, intent, sentiment);

      expect(result.shouldEscalate).toBe(false);
    });

    it('should not escalate positive sentiment', () => {
      const transcript = 'Thank you for your help';
      const intent = 'other';
      const sentiment: 'positive' | 'neutral' | 'negative' = 'positive';

      const result = service.shouldEscalate(transcript, intent, sentiment);

      expect(result.shouldEscalate).toBe(false);
    });

    it('should not escalate neutral booking requests', () => {
      const transcript = 'I want to book an appointment';
      const intent = 'booking';
      const sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';

      const result = service.shouldEscalate(transcript, intent, sentiment);

      expect(result.shouldEscalate).toBe(false);
    });

    it('should be case insensitive for human request', () => {
      const transcript = 'I WANT TO SPEAK TO A HUMAN';
      const intent = 'other';
      const sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';

      const result = service.shouldEscalate(transcript, intent, sentiment);

      expect(result.shouldEscalate).toBe(true);
    });

    describe('Timeout Scenarios', () => {
      it('should escalate timeout/fallback scenarios', () => {
        const transcript = 'The call seems to have timed out';
        const intent = 'other';
        const sentiment: 'positive' | 'neutral' | 'negative' = 'negative';

        const result = service.shouldEscalate(transcript, intent, sentiment);

        expect(result.shouldEscalate).toBe(true);
      });
    });

    describe('Combined Triggers', () => {
      it('should escalate when human request and negative sentiment combined', () => {
        const transcript = 'I am very angry and want to speak to a human now';
        const intent = 'complaint';
        const sentiment: 'positive' | 'neutral' | 'negative' = 'negative';

        const result = service.shouldEscalate(transcript, intent, sentiment);

        // Should escalate due to human request (checked first)
        expect(result.shouldEscalate).toBe(true);
      });

      it('should escalate negative sentiment with complex complaint', () => {
        const longComplaint = 'a'.repeat(201);
        const intent = 'complaint';
        const sentiment: 'positive' | 'neutral' | 'negative' = 'negative';

        const result = service.shouldEscalate(longComplaint, intent, sentiment);

        // Should escalate due to negative sentiment (checked before complex complaint)
        expect(result.shouldEscalate).toBe(true);
        expect(result.reason).toBe('Negative sentiment detected');
      });
    });
  });

  describe('Integration Scenarios', () => {
    const tenantId = '550e8400-e29b-41d4-a716-446655440000';

    it('should handle full escalation flow when agent available', async () => {
      const mockUser = {
        id: 'agent-123',
        firstName: 'Mario',
        lastName: 'Rossi',
      };

      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);
      mockQueueService.addVoiceJob.mockResolvedValue({ id: 'job-123' } as any);

      // Step 1: Find available agent
      const agent = await service.findAvailableAgent(tenantId);
      expect(agent).not.toBeNull();

      // Step 2: Transfer to agent
      if (agent) {
        const result = await service.transferToAgent('call-123', agent.id, 'Test transfer');
        expect(result.escalated).toBe(true);
      }
    });

    it('should handle full escalation flow when no agents available', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockQueueService.addVoiceJob.mockResolvedValue({ id: 'job-123' } as any);
      mockQueueService.addNotificationJob.mockResolvedValue({ id: 'job-456' } as any);

      // Step 1: Find available agent (none found)
      const agent = await service.findAvailableAgent(tenantId);
      expect(agent).toBeNull();

      // Step 2: Queue for callback
      await service.queueForCallback(tenantId, '+390123456789', 'No agents available');

      expect(queueService.addVoiceJob).toHaveBeenCalled();
      expect(queueService.addNotificationJob).toHaveBeenCalled();
    });
  });
});
