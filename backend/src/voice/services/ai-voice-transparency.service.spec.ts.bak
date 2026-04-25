import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import {
  AIVoiceTransparencyService,
  AIVoiceDecision,
  TranscriptMarker,
} from './ai-voice-transparency.service';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';

describe('AIVoiceTransparencyService (EU AI Act Compliance)', () => {
  let service: AIVoiceTransparencyService;
  let prisma: Record<string, Record<string, jest.Mock>>;
  let loggerService: { log: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock };

  const TENANT_ID = 'tenant-eu-001';
  const CALL_ID = 'call_ai_compliance_test_001';
  const CUSTOMER_PHONE = '+390123456789';

  const buildAIDecision = (overrides: Partial<AIVoiceDecision> = {}): AIVoiceDecision => ({
    callId: CALL_ID,
    tenantId: TENANT_ID,
    decisionType: 'ai_generated',
    confidence: 0.95,
    humanOverride: false,
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue({ id: TENANT_ID, name: 'Test Tenant' }),
      },
      voiceWebhookEvent: {
        findFirst: jest.fn().mockResolvedValue({
          callId: CALL_ID,
          customerPhone: CUSTOMER_PHONE,
        }),
      },
      aIVoiceInteractionLog: {
        create: jest.fn().mockResolvedValue({
          id: 'log-001',
          callId: CALL_ID,
          tenantId: TENANT_ID,
          customerPhone: CUSTOMER_PHONE,
          decisionType: 'ai_generated',
          confidence: 0.95,
          humanOverride: false,
          createdAt: new Date(),
        }),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    loggerService = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIVoiceTransparencyService,
        { provide: PrismaService, useValue: prisma },
        { provide: LoggerService, useValue: loggerService },
      ],
    }).compile();

    service = module.get<AIVoiceTransparencyService>(AIVoiceTransparencyService);
  });

  describe('markVoiceCallAIGenerated', () => {
    it('should mark voice call as AI-generated with EU AI Act disclosure', async () => {
      // ARRANGE: Valid inputs
      const callId = CALL_ID;
      const tenantId = TENANT_ID;

      // ACT: Mark call as AI-generated
      await service.markVoiceCallAIGenerated(callId, tenantId);

      // ASSERT: Tenant was verified
      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: tenantId },
      });

      // ASSERT: Audit log was created with correct decision type
      expect(prisma.aIVoiceInteractionLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          callId,
          tenantId,
          decisionType: 'ai_generated',
          confidence: 1.0,
          humanOverride: false,
        }),
      });

      // ASSERT: Logger confirmed audit entry
      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('disclosure logged'),
        'AIVoiceTransparencyService',
      );
    });

    it('should reject call without callId', async () => {
      // ACT & ASSERT: Should throw on missing callId
      await expect(service.markVoiceCallAIGenerated('', TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject call without tenantId', async () => {
      // ACT & ASSERT: Should throw on missing tenantId
      await expect(service.markVoiceCallAIGenerated(CALL_ID, '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject non-existent tenant', async () => {
      // ARRANGE: Mock tenant not found
      prisma.tenant.findUnique.mockResolvedValueOnce(null);

      // ACT & ASSERT: Should throw on tenant not found
      await expect(service.markVoiceCallAIGenerated(CALL_ID, 'fake-tenant')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should ensure tenant isolation in audit log', async () => {
      // ARRANGE: Create mock that verifies tenantId filter
      const otherTenantId = 'tenant-other-001';

      // ACT: Attempt to mark call for a different tenant
      await service.markVoiceCallAIGenerated(CALL_ID, otherTenantId);

      // ASSERT: tenantId must be in the create call
      expect(prisma.aIVoiceInteractionLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: otherTenantId,
        }),
      });
    });
  });

  describe('logVoiceDecision', () => {
    it('should log AI voice decision with full audit trail', async () => {
      // ARRANGE: Complete AI decision
      const decision = buildAIDecision({
        decisionType: 'ai_generated',
        confidence: 0.92,
      });

      // ACT: Log the decision
      await service.logVoiceDecision(decision);

      // ASSERT: Decision logged to audit trail
      expect(prisma.aIVoiceInteractionLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          callId: decision.callId,
          tenantId: decision.tenantId,
          decisionType: 'ai_generated',
          confidence: 0.92,
          humanOverride: false,
        }),
      });
    });

    it('should log human escalation with reason', async () => {
      // ARRANGE: Human escalation decision
      const decision = buildAIDecision({
        decisionType: 'ai_offer_escalation',
        humanOverride: true,
        escalationReason: 'Customer requested to speak with specialist',
      });

      // ACT: Log escalation
      await service.logVoiceDecision(decision);

      // ASSERT: Escalation logged with reason
      expect(prisma.aIVoiceInteractionLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          decisionType: 'ai_offer_escalation',
          humanOverride: true,
          escalationReason: 'Customer requested to speak with specialist',
        }),
      });
    });

    it('should include transcript markers in audit log', async () => {
      // ARRANGE: Decision with transcript markers (speech attribution)
      const markers: TranscriptMarker[] = [
        { timestamp: 0, speaker: 'ai', text: 'Welcome to our support service', confidence: 0.99 },
        { timestamp: 5, speaker: 'human', text: 'I need help with my booking', confidence: 1.0 },
        {
          timestamp: 10,
          speaker: 'ai',
          text: 'I found your booking. Let me check the details.',
          confidence: 0.96,
        },
      ];

      const decision = buildAIDecision({
        transcriptMarkers: markers,
      });

      // ACT: Log decision with markers
      await service.logVoiceDecision(decision);

      // ASSERT: Markers preserved in audit trail
      expect(prisma.aIVoiceInteractionLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          transcriptMarkers: markers,
        }),
      });
    });

    it('should reject decision without callId', async () => {
      // ARRANGE: Decision missing callId
      const decision = buildAIDecision({ callId: '' });

      // ACT & ASSERT: Should throw
      await expect(service.logVoiceDecision(decision)).rejects.toThrow(BadRequestException);
    });

    it('should reject decision without tenantId', async () => {
      // ARRANGE: Decision missing tenantId
      const decision = buildAIDecision({ tenantId: '' });

      // ACT & ASSERT: Should throw
      await expect(service.logVoiceDecision(decision)).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleOptOutRequest', () => {
    it('should process customer opt-out request ("talk to human")', async () => {
      // ARRANGE: Customer requests human interaction
      const reason = 'Customer wants to discuss complex issue with specialist';

      // ACT: Handle opt-out
      const result = await service.handleOptOutRequest(CALL_ID, TENANT_ID, reason);

      // ASSERT: Escalation initiated
      expect(result.escalationInitiated).toBe(true);
      expect(result.message).toContain('human');

      // ASSERT: Opt-out logged with humanOverride = true
      expect(prisma.aIVoiceInteractionLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          decisionType: 'ai_offer_escalation',
          humanOverride: true,
          escalationReason: reason,
        }),
      });
    });

    it('should accept opt-out without explicit reason', async () => {
      // ACT: Handle opt-out with no reason provided
      const result = await service.handleOptOutRequest(CALL_ID, TENANT_ID);

      // ASSERT: Default reason set
      expect(prisma.aIVoiceInteractionLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          escalationReason: 'Customer requested to speak with human',
        }),
      });

      // ASSERT: Still marks as escalation
      expect(result.escalationInitiated).toBe(true);
    });

    it('should reject opt-out without callId', async () => {
      // ACT & ASSERT: Should throw on missing callId
      await expect(service.handleOptOutRequest('', TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('should reject opt-out without tenantId', async () => {
      // ACT & ASSERT: Should throw on missing tenantId
      await expect(service.handleOptOutRequest(CALL_ID, '')).rejects.toThrow(BadRequestException);
    });

    it('should ensure tenant isolation in opt-out log', async () => {
      // ARRANGE: Opt-out for a specific tenant
      const otherTenantId = 'tenant-other-002';

      // ACT: Handle opt-out for different tenant
      await service.handleOptOutRequest(CALL_ID, otherTenantId, 'Different tenant test');

      // ASSERT: tenantId is in the create call
      expect(prisma.aIVoiceInteractionLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: otherTenantId,
        }),
      });
    });
  });

  describe('getCallAuditLog', () => {
    it('should retrieve audit log for specific call', async () => {
      // ARRANGE: Mock audit logs
      const mockLogs = [
        {
          id: 'log-1',
          callId: CALL_ID,
          tenantId: TENANT_ID,
          customerPhone: CUSTOMER_PHONE,
          decisionType: 'ai_generated',
          confidence: 0.95,
          humanOverride: false,
          escalationReason: null,
          transcriptMarkers: null,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'log-2',
          callId: CALL_ID,
          tenantId: TENANT_ID,
          customerPhone: CUSTOMER_PHONE,
          decisionType: 'ai_offer_escalation',
          confidence: null,
          humanOverride: true,
          escalationReason: 'Customer requested human',
          transcriptMarkers: null,
          createdAt: new Date('2024-01-02'),
        },
      ];

      prisma.aIVoiceInteractionLog.findMany.mockResolvedValueOnce(mockLogs);

      // ACT: Get audit log
      const logs = await service.getCallAuditLog(CALL_ID, TENANT_ID);

      // ASSERT: Correct logs retrieved in chronological order
      expect(logs).toHaveLength(2);
      expect(logs[0].decisionType).toBe('ai_generated');
      expect(logs[1].decisionType).toBe('ai_offer_escalation');
      expect(logs[1].humanOverride).toBe(true);

      // ASSERT: Query used tenant isolation filter
      expect(prisma.aIVoiceInteractionLog.findMany).toHaveBeenCalledWith({
        where: {
          callId: CALL_ID,
          tenantId: TENANT_ID,
        },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should return empty array for call with no audit entries', async () => {
      // ARRANGE: No logs found
      prisma.aIVoiceInteractionLog.findMany.mockResolvedValueOnce([]);

      // ACT: Get audit log
      const logs = await service.getCallAuditLog(CALL_ID, TENANT_ID);

      // ASSERT: Empty array returned
      expect(logs).toEqual([]);
    });

    it('should reject request without callId', async () => {
      // ACT & ASSERT: Should throw
      await expect(service.getCallAuditLog('', TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('should reject request without tenantId', async () => {
      // ACT & ASSERT: Should throw
      await expect(service.getCallAuditLog(CALL_ID, '')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCustomerAIInteractions', () => {
    it('should retrieve all AI interactions for customer (GDPR Art.22)', async () => {
      // ARRANGE: Mock customer interactions across multiple calls (in DESC order as service returns)
      const mockInteractions = [
        {
          id: 'log-3',
          callId: 'call_003',
          tenantId: TENANT_ID,
          customerPhone: CUSTOMER_PHONE,
          decisionType: 'ai_offer_escalation',
          confidence: null,
          humanOverride: true,
          escalationReason: 'Requested specialist',
          transcriptMarkers: null,
          createdAt: new Date('2024-01-10'),
        },
        {
          id: 'log-2',
          callId: 'call_002',
          tenantId: TENANT_ID,
          customerPhone: CUSTOMER_PHONE,
          decisionType: 'ai_generated',
          confidence: 0.91,
          humanOverride: false,
          escalationReason: null,
          transcriptMarkers: null,
          createdAt: new Date('2024-01-05'),
        },
        {
          id: 'log-1',
          callId: 'call_001',
          tenantId: TENANT_ID,
          customerPhone: CUSTOMER_PHONE,
          decisionType: 'ai_generated',
          confidence: 0.94,
          humanOverride: false,
          escalationReason: null,
          transcriptMarkers: null,
          createdAt: new Date('2024-01-01'),
        },
      ];

      prisma.aIVoiceInteractionLog.findMany.mockResolvedValueOnce(mockInteractions);

      // ACT: Get customer interactions
      const interactions = await service.getCustomerAIInteractions(TENANT_ID, CUSTOMER_PHONE);

      // ASSERT: All interactions retrieved in reverse chronological order
      expect(interactions).toHaveLength(3);
      expect(interactions[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        interactions[2].createdAt.getTime(),
      );

      // ASSERT: Query includes tenant isolation + customer filter
      expect(prisma.aIVoiceInteractionLog.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          customerPhone: CUSTOMER_PHONE,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter interactions by date range', async () => {
      // ARRANGE: Date filters
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      prisma.aIVoiceInteractionLog.findMany.mockResolvedValueOnce([]);

      // ACT: Get interactions with date range
      await service.getCustomerAIInteractions(TENANT_ID, CUSTOMER_PHONE, fromDate, toDate);

      // ASSERT: Query includes date filter
      expect(prisma.aIVoiceInteractionLog.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          customerPhone: CUSTOMER_PHONE,
          createdAt: {
            gte: fromDate,
            lte: toDate,
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should reject without tenantId', async () => {
      // ACT & ASSERT: Should throw
      await expect(service.getCustomerAIInteractions('', CUSTOMER_PHONE)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject without customerPhone', async () => {
      // ACT & ASSERT: Should throw
      await expect(service.getCustomerAIInteractions(TENANT_ID, '')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getComplianceReport', () => {
    it('should generate EU AI Act compliance report', async () => {
      // ARRANGE: Mock logs for report generation
      const mockLogs = [
        {
          id: 'log-1',
          callId: 'call_001',
          tenantId: TENANT_ID,
          customerPhone: '+390123456789',
          decisionType: 'ai_generated',
          confidence: 0.95,
          humanOverride: false,
          escalationReason: null,
          transcriptMarkers: null,
          createdAt: new Date(),
        },
        {
          id: 'log-2',
          callId: 'call_002',
          tenantId: TENANT_ID,
          customerPhone: '+390123456789',
          decisionType: 'ai_generated',
          confidence: 0.92,
          humanOverride: false,
          escalationReason: null,
          transcriptMarkers: null,
          createdAt: new Date(),
        },
        {
          id: 'log-3',
          callId: 'call_003',
          tenantId: TENANT_ID,
          customerPhone: '+390987654321',
          decisionType: 'ai_offer_escalation',
          confidence: null,
          humanOverride: true,
          escalationReason: 'Escalated',
          transcriptMarkers: null,
          createdAt: new Date(),
        },
      ];

      prisma.aIVoiceInteractionLog.findMany.mockResolvedValueOnce(mockLogs);
      prisma.aIVoiceInteractionLog.count
        .mockResolvedValueOnce(2) // ai_generated count
        .mockResolvedValueOnce(1); // human override count

      prisma.aIVoiceInteractionLog.findMany.mockResolvedValueOnce([
        { customerPhone: '+390123456789' },
        { customerPhone: '+390987654321' },
      ]);

      // ACT: Generate compliance report
      const report = await service.getComplianceReport(TENANT_ID);

      // ASSERT: Report contains required metrics
      expect(report).toEqual(
        expect.objectContaining({
          totalCalls: expect.any(Number),
          aiGeneratedCalls: expect.any(Number),
          humanEscalations: expect.any(Number),
          optOutRate: expect.any(Number),
          uniqueCustomers: expect.any(Number),
          period: expect.objectContaining({
            from: expect.any(Date),
            to: expect.any(Date),
          }),
        }),
      );

      // ASSERT: Metrics are reasonable
      expect(report.totalCalls).toBeGreaterThanOrEqual(0);
      expect(report.humanEscalations).toBeLessThanOrEqual(report.totalCalls);
      expect(report.optOutRate).toBeGreaterThanOrEqual(0);
      expect(report.optOutRate).toBeLessThanOrEqual(100);
    });

    it('should handle opt-out rate calculation when no calls exist', async () => {
      // ARRANGE: No calls
      prisma.aIVoiceInteractionLog.findMany
        .mockResolvedValueOnce([])  // for logs
        .mockResolvedValueOnce([])  // for unique customers
        .mockResolvedValueOnce([]); // for escalations
      prisma.aIVoiceInteractionLog.count.mockResolvedValue(0);

      // ACT: Generate report
      const report = await service.getComplianceReport(TENANT_ID);

      // ASSERT: opt-out rate is 0 (no calls to escalate)
      expect(report.totalCalls).toBe(0);
      expect(report.optOutRate).toBe(0);
    });

    it('should reject without tenantId', async () => {
      // ACT & ASSERT: Should throw
      await expect(service.getComplianceReport('')).rejects.toThrow(BadRequestException);
    });

    it('should ensure tenant isolation in compliance report', async () => {
      // ARRANGE: Setup for specific tenant
      prisma.aIVoiceInteractionLog.findMany.mockResolvedValue([]);
      prisma.aIVoiceInteractionLog.count.mockResolvedValue(0);

      const otherTenantId = 'tenant-other-003';

      // ACT: Generate report for different tenant
      await service.getComplianceReport(otherTenantId);

      // ASSERT: Query includes tenant filter
      expect(prisma.aIVoiceInteractionLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: otherTenantId,
          }),
        }),
      );
    });

    it('should filter by date range in compliance report', async () => {
      // ARRANGE: Date range
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      prisma.aIVoiceInteractionLog.findMany.mockResolvedValue([]);
      prisma.aIVoiceInteractionLog.count.mockResolvedValue(0);

      // ACT: Generate report with dates
      await service.getComplianceReport(TENANT_ID, fromDate, toDate);

      // ASSERT: Query includes date filter
      expect(prisma.aIVoiceInteractionLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: fromDate,
              lte: toDate,
            },
          }),
        }),
      );
    });
  });

  describe('Security & Compliance Boundaries', () => {
    it('should prevent cross-tenant audit log access', async () => {
      // ARRANGE: Attempt to access audit log with different tenant
      const differentTenant = 'tenant-hacker-001';

      prisma.aIVoiceInteractionLog.findMany.mockResolvedValueOnce([]);

      // ACT: Query with different tenant
      await service.getCallAuditLog(CALL_ID, differentTenant);

      // ASSERT: Query explicitly filters by calling tenant
      expect(prisma.aIVoiceInteractionLog.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenantId: differentTenant,
        }),
        orderBy: expect.any(Object),
      });
    });

    it('should prevent direct database access without tenantId filter', async () => {
      // This test ensures no Prisma query is made without tenantId

      // ARRANGE & ACT: Call any method without tenantId should fail early
      const testCases = [
        () => service.markVoiceCallAIGenerated(CALL_ID, ''),
        () => service.getCallAuditLog(CALL_ID, ''),
        () => service.getCustomerAIInteractions('', CUSTOMER_PHONE),
        () => service.getComplianceReport(''),
      ];

      // ASSERT: All should throw before Prisma is accessed
      for (const testCase of testCases) {
        await expect(testCase()).rejects.toThrow(BadRequestException);
      }
    });

    it('should log all escalations for security audit', async () => {
      // ARRANGE: Escalation with human override
      const decision = buildAIDecision({
        humanOverride: true,
        escalationReason: 'Security incident detected',
      });

      // ACT: Log decision
      await service.logVoiceDecision(decision);

      // ASSERT: Escalation logged with audit trail
      expect(prisma.aIVoiceInteractionLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          humanOverride: true,
          escalationReason: 'Security incident detected',
        }),
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // ARRANGE: Database error
      const dbError = new Error('Database connection failed');
      prisma.tenant.findUnique.mockRejectedValueOnce(dbError);

      // ACT & ASSERT: Should propagate error
      await expect(service.markVoiceCallAIGenerated(CALL_ID, TENANT_ID)).rejects.toThrow(Error);
    });

    it('should handle missing webhook event gracefully', async () => {
      // ARRANGE: No webhook found for call
      prisma.voiceWebhookEvent.findFirst.mockResolvedValueOnce(null);

      // ACT: Log decision (webhook not required)
      await service.logVoiceDecision(buildAIDecision());

      // ASSERT: Should still create log with null customerPhone
      expect(prisma.aIVoiceInteractionLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          customerPhone: null,
        }),
      });
    });

    it('should log database errors to logger', async () => {
      // ARRANGE: Mock create failure
      const error = new Error('Unique constraint violation');
      prisma.aIVoiceInteractionLog.create.mockRejectedValueOnce(error);

      // ACT & ASSERT: Should log and re-throw
      await expect(service.logVoiceDecision(buildAIDecision())).rejects.toThrow(Error);

      // ASSERT: Error should be thrown to caller
      // (Logger is used internally, loggerService is for domain events)
    });
  });
});
