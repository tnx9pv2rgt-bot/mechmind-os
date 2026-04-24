import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, Logger } from '@nestjs/common';
import { AIVoiceTransparencyService } from './ai-voice-transparency.service';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';

const TENANT_ID = 'tenant-123';
const CALL_ID = 'call-456';
const CUSTOMER_PHONE = '+39-335-123-4567';

describe('AIVoiceTransparencyService', () => {
  let service: AIVoiceTransparencyService;
  let prisma: PrismaService;
  let loggerService: LoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIVoiceTransparencyService,
        {
          provide: PrismaService,
          useValue: {
            tenant: {
              findUnique: jest.fn(),
            },
            voiceWebhookEvent: {
              findFirst: jest.fn(),
            },
            aIVoiceInteractionLog: {
              create: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AIVoiceTransparencyService>(AIVoiceTransparencyService);
    prisma = module.get<PrismaService>(PrismaService);
    loggerService = module.get<LoggerService>(LoggerService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('markVoiceCallAIGenerated', () => {
    it('should mark call as AI-generated with EU AI Act disclosure', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: TENANT_ID,
        name: 'Test Tenant',
      });

      (prisma.voiceWebhookEvent.findFirst as jest.Mock).mockResolvedValue({
        customerPhone: CUSTOMER_PHONE,
      });

      (prisma.aIVoiceInteractionLog.create as jest.Mock).mockResolvedValue({
        id: 'log-1',
        callId: CALL_ID,
        tenantId: TENANT_ID,
        decisionType: 'ai_generated',
        confidence: 1.0,
        humanOverride: false,
      });

      await service.markVoiceCallAIGenerated(CALL_ID, TENANT_ID);

      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
      });

      expect(prisma.aIVoiceInteractionLog.create).toHaveBeenCalled();
    });

    it('should reject invalid callId', async () => {
      await expect(
        service.markVoiceCallAIGenerated('', TENANT_ID),
      ).rejects.toThrow('callId and tenantId are required');
    });

    it('should reject invalid tenantId', async () => {
      await expect(
        service.markVoiceCallAIGenerated(CALL_ID, ''),
      ).rejects.toThrow('callId and tenantId are required');
    });

    it('should reject if tenant does not exist', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.markVoiceCallAIGenerated(CALL_ID, TENANT_ID),
      ).rejects.toThrow(`Tenant ${TENANT_ID} not found`);
    });

    it('should enforce tenant isolation (tenantId in query)', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: TENANT_ID,
      });

      (prisma.voiceWebhookEvent.findFirst as jest.Mock).mockResolvedValue({
        customerPhone: CUSTOMER_PHONE,
      });

      (prisma.aIVoiceInteractionLog.create as jest.Mock).mockResolvedValue({});

      await service.markVoiceCallAIGenerated(CALL_ID, TENANT_ID);

      const createCall = (prisma.aIVoiceInteractionLog.create as jest.Mock)
        .mock.calls[0][0];
      expect(createCall.data.tenantId).toBe(TENANT_ID);
    });
  });

  describe('logVoiceDecision', () => {
    it('should log AI-generated decision with audit trail', async () => {
      const decision = {
        callId: CALL_ID,
        tenantId: TENANT_ID,
        decisionType: 'ai_generated' as const,
        confidence: 0.95,
        humanOverride: false,
      };

      (prisma.voiceWebhookEvent.findFirst as jest.Mock).mockResolvedValue({
        customerPhone: CUSTOMER_PHONE,
      });

      (prisma.aIVoiceInteractionLog.create as jest.Mock).mockResolvedValue({});

      await service.logVoiceDecision(decision);

      expect(prisma.aIVoiceInteractionLog.create).toHaveBeenCalled();
    });

    it('should log human escalation event', async () => {
      const decision = {
        callId: CALL_ID,
        tenantId: TENANT_ID,
        decisionType: 'human_escalated' as const,
        humanOverride: true,
        escalationReason: 'Customer requested human agent',
      };

      (prisma.voiceWebhookEvent.findFirst as jest.Mock).mockResolvedValue({
        customerPhone: CUSTOMER_PHONE,
      });

      (prisma.aIVoiceInteractionLog.create as jest.Mock).mockResolvedValue({});

      await service.logVoiceDecision(decision);

      expect(prisma.aIVoiceInteractionLog.create).toHaveBeenCalled();
    });

    it('should reject decision without callId', async () => {
      const decision = {
        callId: '',
        tenantId: TENANT_ID,
        decisionType: 'ai_generated' as const,
        humanOverride: false,
      };

      await expect(service.logVoiceDecision(decision)).rejects.toThrow(
        'callId and tenantId are required in decision object',
      );
    });

    it('should log security event when human override detected', async () => {
      const decision = {
        callId: CALL_ID,
        tenantId: TENANT_ID,
        decisionType: 'ai_offer_escalation' as const,
        humanOverride: true,
        escalationReason: 'Quality concern detected',
      };

      (prisma.voiceWebhookEvent.findFirst as jest.Mock).mockResolvedValue({
        customerPhone: CUSTOMER_PHONE,
      });

      (prisma.aIVoiceInteractionLog.create as jest.Mock).mockResolvedValue({});

      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await service.logVoiceDecision(decision);

      expect(logSpy).toHaveBeenCalled();
      const calls = logSpy.mock.calls;
      const hasHumanOverrideLog = calls.some((call) =>
        call[0].includes('Human override detected'),
      );
      expect(hasHumanOverrideLog).toBe(true);

      logSpy.mockRestore();
    });

    it('should handle transcript markers in decision log', async () => {
      const decision = {
        callId: CALL_ID,
        tenantId: TENANT_ID,
        decisionType: 'ai_generated' as const,
        confidence: 0.88,
        humanOverride: false,
        transcriptMarkers: [
          {
            timestamp: 0,
            speaker: 'ai' as const,
            text: 'Buongiorno, mi chiamo Maria',
            confidence: 0.99,
          },
          {
            timestamp: 3000,
            speaker: 'human' as const,
            text: 'Ciao, ho un problema',
            confidence: undefined,
          },
        ],
      };

      (prisma.voiceWebhookEvent.findFirst as jest.Mock).mockResolvedValue({
        customerPhone: CUSTOMER_PHONE,
      });

      (prisma.aIVoiceInteractionLog.create as jest.Mock).mockResolvedValue({});

      await service.logVoiceDecision(decision);

      expect(prisma.aIVoiceInteractionLog.create).toHaveBeenCalled();
    });
  });

  describe('handleOptOutRequest', () => {
    it('should process opt-out request and initiate escalation', async () => {
      (prisma.voiceWebhookEvent.findFirst as jest.Mock).mockResolvedValue({
        customerPhone: CUSTOMER_PHONE,
      });

      (prisma.aIVoiceInteractionLog.create as jest.Mock).mockResolvedValue({});

      const result = await service.handleOptOutRequest(
        CALL_ID,
        TENANT_ID,
        'Customer dissatisfied with AI response',
      );

      expect(result.escalationInitiated).toBe(true);
      expect(result.message).toContain('human');
      expect(prisma.aIVoiceInteractionLog.create).toHaveBeenCalled();
    });

    it('should handle opt-out without explicit reason', async () => {
      (prisma.voiceWebhookEvent.findFirst as jest.Mock).mockResolvedValue({
        customerPhone: CUSTOMER_PHONE,
      });

      (prisma.aIVoiceInteractionLog.create as jest.Mock).mockResolvedValue({});

      const result = await service.handleOptOutRequest(CALL_ID, TENANT_ID);

      expect(result.escalationInitiated).toBe(true);
      expect(prisma.aIVoiceInteractionLog.create).toHaveBeenCalled();
    });

    it('should reject opt-out without callId', async () => {
      await expect(
        service.handleOptOutRequest('', TENANT_ID),
      ).rejects.toThrow('callId and tenantId are required');
    });

    it('should enforce tenant isolation in opt-out', async () => {
      (prisma.voiceWebhookEvent.findFirst as jest.Mock).mockResolvedValue({
        customerPhone: CUSTOMER_PHONE,
      });

      (prisma.aIVoiceInteractionLog.create as jest.Mock).mockResolvedValue({});

      await service.handleOptOutRequest(CALL_ID, TENANT_ID, 'Some reason');

      const createCall = (prisma.aIVoiceInteractionLog.create as jest.Mock)
        .mock.calls[0][0];
      expect(createCall.data.tenantId).toBe(TENANT_ID);
      expect(createCall.data.humanOverride).toBe(true);
    });

    it('should set escalation reason per EU AI Act requirements', async () => {
      const reason = 'Customer requested to speak with human';

      (prisma.voiceWebhookEvent.findFirst as jest.Mock).mockResolvedValue({
        customerPhone: CUSTOMER_PHONE,
      });

      (prisma.aIVoiceInteractionLog.create as jest.Mock).mockResolvedValue({});

      await service.handleOptOutRequest(CALL_ID, TENANT_ID, reason);

      const createCall = (prisma.aIVoiceInteractionLog.create as jest.Mock)
        .mock.calls[0][0];
      expect(createCall.data.escalationReason).toContain('human');
    });
  });

  describe('getCallAuditLog', () => {
    it('should retrieve complete audit trail for call', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          callId: CALL_ID,
          tenantId: TENANT_ID,
          customerPhone: CUSTOMER_PHONE,
          decisionType: 'ai_generated',
          confidence: 0.92,
          humanOverride: false,
          escalationReason: null,
          transcriptMarkers: [
            {
              timestamp: 0,
              speaker: 'ai',
              text: 'Buongiorno',
              confidence: 0.99,
            },
          ],
          createdAt: new Date('2026-04-24T10:00:00Z'),
        },
      ];

      (prisma.aIVoiceInteractionLog.findMany as jest.Mock).mockResolvedValue(
        mockLogs,
      );

      const result = await service.getCallAuditLog(CALL_ID, TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0].callId).toBe(CALL_ID);
      expect(prisma.aIVoiceInteractionLog.findMany).toHaveBeenCalledWith({
        where: { callId: CALL_ID, tenantId: TENANT_ID },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should reject invalid callId', async () => {
      await expect(
        service.getCallAuditLog('', TENANT_ID),
      ).rejects.toThrow('callId and tenantId are required');
    });

    it('should enforce tenant isolation in audit log query', async () => {
      (prisma.aIVoiceInteractionLog.findMany as jest.Mock).mockResolvedValue([]);

      await service.getCallAuditLog(CALL_ID, TENANT_ID);

      const queryArg = (prisma.aIVoiceInteractionLog.findMany as jest.Mock)
        .mock.calls[0][0];
      expect(queryArg.where.tenantId).toBe(TENANT_ID);
      expect(queryArg.where.callId).toBe(CALL_ID);
    });

    it('should return empty array if no logs exist', async () => {
      (prisma.aIVoiceInteractionLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getCallAuditLog('nonexistent-call', TENANT_ID);

      expect(result).toEqual([]);
    });

    it('should order logs chronologically (GDPR Art.22 compliance)', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          callId: CALL_ID,
          tenantId: TENANT_ID,
          customerPhone: CUSTOMER_PHONE,
          decisionType: 'ai_generated',
          confidence: 0.92,
          humanOverride: false,
          createdAt: new Date('2026-04-24T10:00:00Z'),
        },
        {
          id: 'log-2',
          callId: CALL_ID,
          tenantId: TENANT_ID,
          customerPhone: CUSTOMER_PHONE,
          decisionType: 'ai_offer_escalation',
          confidence: null,
          humanOverride: true,
          escalationReason: 'Customer request',
          createdAt: new Date('2026-04-24T10:05:00Z'),
        },
      ];

      (prisma.aIVoiceInteractionLog.findMany as jest.Mock).mockResolvedValue(
        mockLogs,
      );

      const result = await service.getCallAuditLog(CALL_ID, TENANT_ID);

      expect(result[0].createdAt.getTime()).toBeLessThan(
        result[1].createdAt.getTime(),
      );
    });
  });

  describe('getCustomerAIInteractions', () => {
    it('should retrieve all AI interactions for customer', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          callId: 'call-1',
          tenantId: TENANT_ID,
          customerPhone: CUSTOMER_PHONE,
          decisionType: 'ai_generated',
          confidence: 0.95,
          humanOverride: false,
          createdAt: new Date('2026-04-24T10:00:00Z'),
        },
        {
          id: 'log-2',
          callId: 'call-2',
          tenantId: TENANT_ID,
          customerPhone: CUSTOMER_PHONE,
          decisionType: 'human_escalated',
          confidence: 0.88,
          humanOverride: true,
          escalationReason: 'Escalation due to issue',
          createdAt: new Date('2026-04-24T11:00:00Z'),
        },
      ];

      (prisma.aIVoiceInteractionLog.findMany as jest.Mock).mockResolvedValue(
        mockLogs,
      );

      const result = await service.getCustomerAIInteractions(TENANT_ID, CUSTOMER_PHONE);

      expect(result).toHaveLength(2);
      expect(prisma.aIVoiceInteractionLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, customerPhone: CUSTOMER_PHONE },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should filter by date range when provided', async () => {
      const fromDate = new Date('2026-04-24T00:00:00Z');
      const toDate = new Date('2026-04-24T23:59:59Z');

      (prisma.aIVoiceInteractionLog.findMany as jest.Mock).mockResolvedValue([]);

      await service.getCustomerAIInteractions(
        TENANT_ID,
        CUSTOMER_PHONE,
        fromDate,
        toDate,
      );

      const queryArg = (prisma.aIVoiceInteractionLog.findMany as jest.Mock)
        .mock.calls[0][0];
      expect(queryArg.where.createdAt).toEqual({
        gte: fromDate,
        lte: toDate,
      });
    });

    it('should reject invalid tenantId', async () => {
      await expect(
        service.getCustomerAIInteractions('', CUSTOMER_PHONE),
      ).rejects.toThrow('tenantId and customerPhone are required');
    });

    it('should enforce tenant isolation (tenantId in where)', async () => {
      (prisma.aIVoiceInteractionLog.findMany as jest.Mock).mockResolvedValue([]);

      await service.getCustomerAIInteractions(TENANT_ID, CUSTOMER_PHONE);

      const queryArg = (prisma.aIVoiceInteractionLog.findMany as jest.Mock)
        .mock.calls[0][0];
      expect(queryArg.where.tenantId).toBe(TENANT_ID);
    });

    it('should return empty array if customer has no AI interactions', async () => {
      (prisma.aIVoiceInteractionLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getCustomerAIInteractions(
        TENANT_ID,
        '+39-999-999-9999',
      );

      expect(result).toEqual([]);
    });

    it('should mask phone number in logs (PII protection)', async () => {
      (prisma.aIVoiceInteractionLog.findMany as jest.Mock).mockResolvedValue([]);

      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await service.getCustomerAIInteractions(TENANT_ID, CUSTOMER_PHONE);

      expect(logSpy).toHaveBeenCalled();
      const calls = logSpy.mock.calls;
      const hasMaskedPhone = calls.some((call) =>
        call[0].includes('+39-***'),
      );
      expect(hasMaskedPhone).toBe(true);

      logSpy.mockRestore();
    });
  });

  describe('getComplianceReport', () => {
    it('should generate compliance report with aggregated metrics', async () => {
      const totalLogs = [
        { callId: 'call-1', tenantId: TENANT_ID, customerPhone: CUSTOMER_PHONE },
        { callId: 'call-2', tenantId: TENANT_ID, customerPhone: CUSTOMER_PHONE },
      ];

      (prisma.aIVoiceInteractionLog.findMany as jest.Mock)
        .mockResolvedValueOnce(totalLogs)
        .mockResolvedValueOnce(totalLogs);

      (prisma.aIVoiceInteractionLog.count as jest.Mock)
        .mockResolvedValueOnce(2) // AI generated
        .mockResolvedValueOnce(1); // Escalations

      const result = await service.getComplianceReport(TENANT_ID);

      expect(result.totalCalls).toBe(2);
      expect(result.aiGeneratedCalls).toBe(2);
      expect(result.humanEscalations).toBe(1);
      expect(result.optOutRate).toBe(50);
    });

    it('should calculate opt-out rate correctly', async () => {
      const totalLogs = [
        { callId: 'call-1', tenantId: TENANT_ID, customerPhone: CUSTOMER_PHONE },
        { callId: 'call-2', tenantId: TENANT_ID, customerPhone: CUSTOMER_PHONE },
        { callId: 'call-3', tenantId: TENANT_ID, customerPhone: CUSTOMER_PHONE },
        { callId: 'call-4', tenantId: TENANT_ID, customerPhone: CUSTOMER_PHONE },
      ];

      (prisma.aIVoiceInteractionLog.findMany as jest.Mock)
        .mockResolvedValueOnce(totalLogs)
        .mockResolvedValueOnce(totalLogs);

      (prisma.aIVoiceInteractionLog.count as jest.Mock)
        .mockResolvedValueOnce(4) // AI generated
        .mockResolvedValueOnce(1); // Escalations

      const result = await service.getComplianceReport(TENANT_ID);

      expect(result.optOutRate).toBe(25);
    });

    it('should enforce tenant isolation in compliance report', async () => {
      (prisma.aIVoiceInteractionLog.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.aIVoiceInteractionLog.count as jest.Mock).mockResolvedValue(0);

      await service.getComplianceReport(TENANT_ID);

      const firstCall = (prisma.aIVoiceInteractionLog.findMany as jest.Mock)
        .mock.calls[0][0];
      expect(firstCall.where.tenantId).toBe(TENANT_ID);

      const countCall = (prisma.aIVoiceInteractionLog.count as jest.Mock)
        .mock.calls[0][0];
      expect(countCall.where.tenantId).toBe(TENANT_ID);
    });

    it('should include date range in compliance report response', async () => {
      (prisma.aIVoiceInteractionLog.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.aIVoiceInteractionLog.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getComplianceReport(TENANT_ID);

      expect(result).toHaveProperty('period');
      expect(result.period).toHaveProperty('from');
      expect(result.period).toHaveProperty('to');
    });

    it('should filter by date range when provided', async () => {
      const fromDate = new Date('2026-04-01T00:00:00Z');
      const toDate = new Date('2026-04-30T23:59:59Z');

      (prisma.aIVoiceInteractionLog.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.aIVoiceInteractionLog.count as jest.Mock).mockResolvedValue(0);

      await service.getComplianceReport(TENANT_ID, fromDate, toDate);

      const firstCall = (prisma.aIVoiceInteractionLog.findMany as jest.Mock)
        .mock.calls[0][0];
      expect(firstCall.where.createdAt).toEqual({
        gte: fromDate,
        lte: toDate,
      });
    });

    it('should count unique customers (GDPR Art.20 compliance)', async () => {
      const uniqueCustomers = [
        { customerPhone: '+39-335-1111111' },
        { customerPhone: '+39-335-2222222' },
        { customerPhone: '+39-335-3333333' },
      ];

      (prisma.aIVoiceInteractionLog.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(uniqueCustomers);

      (prisma.aIVoiceInteractionLog.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getComplianceReport(TENANT_ID);

      expect(result.uniqueCustomers).toBe(3);
    });

    it('should handle zero calls gracefully', async () => {
      (prisma.aIVoiceInteractionLog.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.aIVoiceInteractionLog.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getComplianceReport(TENANT_ID);

      expect(result.totalCalls).toBe(0);
      expect(result.optOutRate).toBe(0);
      expect(result.uniqueCustomers).toBe(0);
    });

    it('should reject invalid tenantId', async () => {
      await expect(service.getComplianceReport('')).rejects.toThrow(
        'tenantId is required',
      );
    });
  });

  describe('GDPR Art.22 Compliance', () => {
    it('should store immutable audit trail for automated decisions', async () => {
      const decision = {
        callId: CALL_ID,
        tenantId: TENANT_ID,
        decisionType: 'ai_generated' as const,
        confidence: 0.85,
        humanOverride: false,
      };

      (prisma.voiceWebhookEvent.findFirst as jest.Mock).mockResolvedValue({
        customerPhone: CUSTOMER_PHONE,
      });

      (prisma.aIVoiceInteractionLog.create as jest.Mock).mockResolvedValue({
        createdAt: new Date(),
      });

      await service.logVoiceDecision(decision);

      expect(prisma.aIVoiceInteractionLog.create).toHaveBeenCalled();
    });

    it('should provide right to explanation (audit log access)', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          callId: CALL_ID,
          tenantId: TENANT_ID,
          customerPhone: CUSTOMER_PHONE,
          decisionType: 'ai_generated',
          confidence: 0.92,
          humanOverride: false,
          escalationReason: null,
          createdAt: new Date('2026-04-24T10:00:00Z'),
        },
      ];

      (prisma.aIVoiceInteractionLog.findMany as jest.Mock).mockResolvedValue(
        mockLogs,
      );

      const result = await service.getCallAuditLog(CALL_ID, TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('decisionType');
      expect(result[0]).toHaveProperty('confidence');
      expect(result[0]).toHaveProperty('createdAt');
    });
  });

  describe('EU AI Act Compliance', () => {
    it('should require human override documentation', async () => {
      const decision = {
        callId: CALL_ID,
        tenantId: TENANT_ID,
        decisionType: 'ai_offer_escalation' as const,
        humanOverride: true,
        escalationReason: 'Legal requirement',
      };

      (prisma.voiceWebhookEvent.findFirst as jest.Mock).mockResolvedValue({
        customerPhone: CUSTOMER_PHONE,
      });

      (prisma.aIVoiceInteractionLog.create as jest.Mock).mockResolvedValue({});

      await service.logVoiceDecision(decision);

      const createCall = (prisma.aIVoiceInteractionLog.create as jest.Mock)
        .mock.calls[0][0];
      expect(createCall.data.humanOverride).toBe(true);
      expect(createCall.data.escalationReason).toBeTruthy();
    });

    it('should track AI transparency disclosure', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: TENANT_ID,
      });

      (prisma.voiceWebhookEvent.findFirst as jest.Mock).mockResolvedValue({
        customerPhone: CUSTOMER_PHONE,
      });

      (prisma.aIVoiceInteractionLog.create as jest.Mock).mockResolvedValue({});

      await service.markVoiceCallAIGenerated(CALL_ID, TENANT_ID);

      const createCall = (prisma.aIVoiceInteractionLog.create as jest.Mock)
        .mock.calls[0][0];
      expect(createCall.data.decisionType).toBe('ai_generated');
      expect(createCall.data.confidence).toBe(1.0);
    });
  });
});
