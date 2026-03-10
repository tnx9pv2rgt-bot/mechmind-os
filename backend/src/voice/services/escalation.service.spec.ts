import { Test, TestingModule } from '@nestjs/testing';
import { EscalationService, Agent } from './escalation.service';
import { PrismaService } from '@common/services/prisma.service';
import { QueueService } from '@common/services/queue.service';
import { LoggerService } from '@common/services/logger.service';

describe('EscalationService', () => {
  let service: EscalationService;
  let prisma: Record<string, Record<string, jest.Mock>>;
  let queueService: { addVoiceJob: jest.Mock; addNotificationJob: jest.Mock };
  let loggerService: { log: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock };

  const TENANT_ID = 'tenant-001';
  const CALL_ID = 'call_abc123xyz';
  const CUSTOMER_PHONE = '+390123456789';

  const mockAgent = {
    id: 'agent-001',
    name: 'Mario Rossi',
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue(mockAgent),
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EscalationService,
        { provide: PrismaService, useValue: prisma },
        { provide: QueueService, useValue: queueService },
        { provide: LoggerService, useValue: loggerService },
      ],
    }).compile();

    service = module.get<EscalationService>(EscalationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAvailableAgent', () => {
    it('should return an agent when a MANAGER is available for the tenant', async () => {
      // Arrange - mockAgent already configured in beforeEach

      // Act
      const result = await service.findAvailableAgent(TENANT_ID);

      // Assert
      expect(result).toEqual<Agent>({
        id: 'agent-001',
        name: 'Mario Rossi',
        phone: '',
        available: true,
      });
    });

    it('should query for active MANAGER users in the correct tenant', async () => {
      // Arrange & Act
      await service.findAvailableAgent(TENANT_ID);

      // Assert
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          role: 'MANAGER',
          isActive: true,
        },
        select: {
          id: true,
          name: true,
        },
      });
    });

    it('should return null when no agent is available', async () => {
      // Arrange
      prisma.user.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.findAvailableAgent(TENANT_ID);

      // Assert
      expect(result).toBeNull();
    });

    it('should isolate agent lookup to the specified tenant', async () => {
      // Arrange
      const tenantA = 'tenant-aaa';
      const tenantB = 'tenant-bbb';

      // Act
      await service.findAvailableAgent(tenantA);
      await service.findAvailableAgent(tenantB);

      // Assert
      expect(prisma.user.findFirst).toHaveBeenNthCalledWith(1, {
        where: expect.objectContaining({ tenantId: tenantA }),
        select: expect.any(Object),
      });
      expect(prisma.user.findFirst).toHaveBeenNthCalledWith(2, {
        where: expect.objectContaining({ tenantId: tenantB }),
        select: expect.any(Object),
      });
    });

    it('should accept an optional category parameter', async () => {
      // Arrange & Act - category is accepted but not yet used in the query
      const result = await service.findAvailableAgent(TENANT_ID, 'booking_issue');

      // Assert
      expect(result).toBeDefined();
      expect(prisma.user.findFirst).toHaveBeenCalled();
    });
  });

  describe('transferToAgent', () => {
    it('should queue a transfer-call voice job', async () => {
      // Arrange
      const agentId = 'agent-001';
      const reason = 'Customer requested human agent';

      // Act
      await service.transferToAgent(CALL_ID, agentId, reason);

      // Assert
      expect(queueService.addVoiceJob).toHaveBeenCalledWith('transfer-call', {
        type: 'transfer-call',
        payload: {
          callId: CALL_ID,
          agentId,
          reason,
        },
      });
    });

    it('should return an escalation result with escalated=true', async () => {
      // Arrange
      const agentId = 'agent-002';
      const reason = 'Unhappy customer';

      // Act
      const result = await service.transferToAgent(CALL_ID, agentId, reason);

      // Assert
      expect(result).toEqual({
        escalated: true,
        agentId: 'agent-002',
        reason: 'Transferred to agent: Unhappy customer',
      });
    });
  });

  describe('queueForCallback', () => {
    it('should queue a schedule-callback voice job with high priority and delay', async () => {
      // Arrange
      const reason = 'No agents available';

      // Act
      await service.queueForCallback(TENANT_ID, CUSTOMER_PHONE, reason);

      // Assert
      expect(queueService.addVoiceJob).toHaveBeenCalledWith(
        'schedule-callback',
        {
          type: 'schedule-callback',
          payload: {
            customerPhone: CUSTOMER_PHONE,
            reason,
            priority: 'high',
          },
          tenantId: TENANT_ID,
        },
        {
          priority: 5,
          delay: 300000,
        },
      );
    });

    it('should also notify managers via notification job', async () => {
      // Arrange
      const reason = 'Urgent callback needed';

      // Act
      await service.queueForCallback(TENANT_ID, CUSTOMER_PHONE, reason);

      // Assert
      expect(queueService.addNotificationJob).toHaveBeenCalledWith('notify-callback-needed', {
        type: 'callback-needed',
        payload: {
          customerPhone: CUSTOMER_PHONE,
          reason,
        },
        tenantId: TENANT_ID,
      });
    });

    it('should include tenantId in the callback job for tenant isolation', async () => {
      // Arrange
      const tenantX = 'tenant-xxx';

      // Act
      await service.queueForCallback(tenantX, CUSTOMER_PHONE, 'test');

      // Assert
      expect(queueService.addVoiceJob).toHaveBeenCalledWith(
        'schedule-callback',
        expect.objectContaining({ tenantId: tenantX }),
        expect.any(Object),
      );
      expect(queueService.addNotificationJob).toHaveBeenCalledWith(
        'notify-callback-needed',
        expect.objectContaining({ tenantId: tenantX }),
      );
    });
  });

  describe('getEscalationStats', () => {
    it('should return placeholder statistics', async () => {
      // Arrange & Act
      const result = await service.getEscalationStats(TENANT_ID);

      // Assert
      expect(result).toEqual({
        totalEscalations: 0,
        averageWaitTime: 0,
        successfulTransfers: 0,
        callbackQueueLength: 0,
      });
    });

    it('should accept optional date range parameters', async () => {
      // Arrange
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-12-31');

      // Act
      const result = await service.getEscalationStats(TENANT_ID, fromDate, toDate);

      // Assert
      expect(result).toBeDefined();
      expect(result.totalEscalations).toBe(0);
    });
  });

  describe('shouldEscalate', () => {
    it('should escalate when transcript contains "human"', () => {
      // Arrange & Act
      const result = service.shouldEscalate(
        'I want to speak to a human please',
        'other',
        'neutral',
      );

      // Assert
      expect(result.shouldEscalate).toBe(true);
      expect(result.reason).toBe('Customer requested human agent');
    });

    it('should escalate when transcript contains "agent"', () => {
      // Arrange & Act
      const result = service.shouldEscalate('Let me talk to an agent', 'other', 'neutral');

      // Assert
      expect(result.shouldEscalate).toBe(true);
      expect(result.reason).toBe('Customer requested human agent');
    });

    it('should escalate when transcript contains "operator"', () => {
      // Arrange & Act
      const result = service.shouldEscalate('Can I speak with the operator?', 'other', 'neutral');

      // Assert
      expect(result.shouldEscalate).toBe(true);
      expect(result.reason).toBe('Customer requested human agent');
    });

    it('should escalate when transcript contains keyword case-insensitively', () => {
      // Arrange & Act
      const result = service.shouldEscalate('I NEED A HUMAN NOW', 'other', 'neutral');

      // Assert
      expect(result.shouldEscalate).toBe(true);
    });

    it('should escalate when sentiment is negative', () => {
      // Arrange & Act
      const result = service.shouldEscalate('This is terrible', 'other', 'negative');

      // Assert
      expect(result.shouldEscalate).toBe(true);
      expect(result.reason).toBe('Negative sentiment detected');
    });

    it('should escalate for complex complaints (complaint intent + long transcript)', () => {
      // Arrange
      const longTranscript =
        'I have a very serious complaint. ' +
        'The repair you did last week is completely wrong. The brakes are still squeaking, ' +
        'the engine light came back on immediately after I drove away, and on top of that ' +
        'I was overcharged for the parts. This is unacceptable service and I want a full refund.';

      // Act
      const result = service.shouldEscalate(longTranscript, 'complaint', 'neutral');

      // Assert
      expect(result.shouldEscalate).toBe(true);
      expect(result.reason).toBe('Complex complaint requires human review');
    });

    it('should not escalate for short complaints', () => {
      // Arrange
      const shortTranscript = 'I have a small complaint about the invoice';

      // Act
      const result = service.shouldEscalate(shortTranscript, 'complaint', 'neutral');

      // Assert
      expect(result.shouldEscalate).toBe(false);
    });

    it('should not escalate for normal conversations with positive sentiment', () => {
      // Arrange & Act
      const result = service.shouldEscalate(
        'I would like to book an appointment for my car',
        'booking',
        'positive',
      );

      // Assert
      expect(result.shouldEscalate).toBe(false);
    });

    it('should not escalate for normal conversations with neutral sentiment', () => {
      // Arrange & Act
      const result = service.shouldEscalate(
        'What is the status of my repair?',
        'status_check',
        'neutral',
      );

      // Assert
      expect(result.shouldEscalate).toBe(false);
    });

    it('should prioritize human-request detection over sentiment', () => {
      // Arrange - contains "human" AND positive sentiment
      const result = service.shouldEscalate(
        'I would love to speak to a human please',
        'other',
        'positive',
      );

      // Assert - should still escalate due to keyword
      expect(result.shouldEscalate).toBe(true);
      expect(result.reason).toBe('Customer requested human agent');
    });
  });
});
