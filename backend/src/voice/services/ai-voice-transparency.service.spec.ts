import { Test, TestingModule } from '@nestjs/testing';
import { AIVoiceTransparencyService } from './ai-voice-transparency.service';
import { PrismaService } from '@common/services/prisma.service';

const TENANT_ID = 'tenant-123';
const CALL_ID = 'call-456';
const PHONE = '+39 333 XXXXXX';

describe('AIVoiceTransparencyService', () => {
  let service: AIVoiceTransparencyService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIVoiceTransparencyService,
        {
          provide: PrismaService,
          useValue: {
            aIVoiceInteractionLog: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AIVoiceTransparencyService>(AIVoiceTransparencyService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('logVoiceInteraction', () => {
    it('should log AI-generated response', async () => {
      await service.logVoiceInteraction(
        TENANT_ID,
        CALL_ID,
        'ai_generated',
        PHONE,
        85,
      );

      expect(prisma.aIVoiceInteractionLog.create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          callId: CALL_ID,
          decisionType: 'ai_generated',
          customerPhone: PHONE,
          confidence: 85,
          humanOverride: false,
          escalationReason: undefined,
        },
      });
    });

    it('should log human escalation', async () => {
      await service.logVoiceInteraction(
        TENANT_ID,
        CALL_ID,
        'human_escalated',
        PHONE,
        undefined,
        true,
        'Customer requested specialist',
      );

      expect(prisma.aIVoiceInteractionLog.create).toHaveBeenCalled();
    });

    it('should handle undefined confidence', async () => {
      await service.logVoiceInteraction(
        TENANT_ID,
        CALL_ID,
        'ai_offer_escalation',
      );

      expect(prisma.aIVoiceInteractionLog.create).toHaveBeenCalled();
    });
  });

  describe('markCallAsAIGenerated', () => {
    it('should mark call as AI with confidence', async () => {
      await service.markCallAsAIGenerated(TENANT_ID, CALL_ID, 92);
      expect(prisma.aIVoiceInteractionLog.create).toHaveBeenCalled();
    });

    it('should accept confidence 0', async () => {
      await service.markCallAsAIGenerated(TENANT_ID, CALL_ID, 0);
      expect(prisma.aIVoiceInteractionLog.create).toHaveBeenCalled();
    });

    it('should accept confidence 100', async () => {
      await service.markCallAsAIGenerated(TENANT_ID, CALL_ID, 100);
      expect(prisma.aIVoiceInteractionLog.create).toHaveBeenCalled();
    });
  });

  describe('markCallAsEscalated', () => {
    it('should mark call as escalated', async () => {
      await service.markCallAsEscalated(
        TENANT_ID,
        CALL_ID,
        'Complex booking request',
      );

      expect(prisma.aIVoiceInteractionLog.create).toHaveBeenCalled();
    });
  });

  describe('getCustomerAIInteractionHistory', () => {
    it('should fetch interaction history', async () => {
      const mockHistory = [
        {
          id: 'interaction-1',
          callId: CALL_ID,
          decisionType: 'ai_generated',
          confidence: 85,
          humanOverride: false,
          createdAt: new Date(),
        },
      ];

      (prisma.aIVoiceInteractionLog.findMany as jest.Mock).mockResolvedValue(
        mockHistory,
      );

      const result = await service.getCustomerAIInteractionHistory(
        TENANT_ID,
        PHONE,
      );

      expect(result).toEqual(mockHistory);
    });

    it('should enforce tenant isolation', async () => {
      (prisma.aIVoiceInteractionLog.findMany as jest.Mock).mockResolvedValue(
        [],
      );

      await service.getCustomerAIInteractionHistory(TENANT_ID, PHONE);

      expect(prisma.aIVoiceInteractionLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID }),
        }),
      );
    });
  });

  describe('getEscalationHistory', () => {
    it('should fetch all escalations', async () => {
      const mockEscalations = [
        {
          id: 'interaction-1',
          callId: CALL_ID,
          customerPhone: PHONE,
          escalationReason: 'Complex request',
          createdAt: new Date(),
        },
      ];

      (prisma.aIVoiceInteractionLog.findMany as jest.Mock).mockResolvedValue(
        mockEscalations,
      );

      const result = await service.getEscalationHistory(TENANT_ID);

      expect(result).toEqual(mockEscalations);
    });

    it('should enforce tenant isolation', async () => {
      (prisma.aIVoiceInteractionLog.findMany as jest.Mock).mockResolvedValue(
        [],
      );

      await service.getEscalationHistory(TENANT_ID);

      expect(prisma.aIVoiceInteractionLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID }),
        }),
      );
    });

    it('should filter by humanOverride flag', async () => {
      (prisma.aIVoiceInteractionLog.findMany as jest.Mock).mockResolvedValue(
        [],
      );

      await service.getEscalationHistory(TENANT_ID);

      expect(prisma.aIVoiceInteractionLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ humanOverride: true }),
        }),
      );
    });
  });
});
