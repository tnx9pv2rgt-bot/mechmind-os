import { Test, TestingModule } from '@nestjs/testing';
import { AIDecisionOverrideService } from './ai-decision-override.service';
import { PrismaService } from '@common/services/prisma.service';
import { DomainException } from '@common/exceptions/domain.exception';

const TENANT_ID = 'tenant-123';
const ASSESSMENT_ID = 'assessment-456';
const REVIEWER_ID = 'user-789';
const REVIEWER_EMAIL = 'assessor@example.com';

describe('AIDecisionOverrideService', () => {
  let service: AIDecisionOverrideService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIDecisionOverrideService,
        {
          provide: PrismaService,
          useValue: {
            aIDecisionOverrideAuditLog: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AIDecisionOverrideService>(AIDecisionOverrideService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('reviewDVIAssessment', () => {
    it('should create override audit log', async () => {
      const dto = {
        assessmentId: ASSESSMENT_ID,
        reviewerEmail: REVIEWER_EMAIL,
        reviewerUserId: REVIEWER_ID,
        decision: 'APPROVED',
        confidence: 85,
        notes: 'Looks good',
      };

      await service.reviewDVIAssessment(TENANT_ID, dto);

      expect(prisma.aIDecisionOverrideAuditLog.create).toHaveBeenCalledWith({
        data: {
          assessmentId: ASSESSMENT_ID,
          tenantId: TENANT_ID,
          reviewerUserId: REVIEWER_ID,
          reviewerEmail: REVIEWER_EMAIL,
          originalDecision: 'pending',
          originalConfidence: 0,
          overrideDecision: 'APPROVED',
          assessorConfidence: 85,
          notes: 'Looks good',
        },
      });
    });

    it('should throw when tenantId empty', async () => {
      const dto = {
        assessmentId: ASSESSMENT_ID,
        reviewerEmail: REVIEWER_EMAIL,
        reviewerUserId: REVIEWER_ID,
        decision: 'APPROVED',
        confidence: 85,
      };

      await expect(
        service.reviewDVIAssessment('', dto),
      ).rejects.toThrow(DomainException);
    });

    it('should throw when confidence out of range', async () => {
      const dto = {
        assessmentId: ASSESSMENT_ID,
        reviewerEmail: REVIEWER_EMAIL,
        reviewerUserId: REVIEWER_ID,
        decision: 'APPROVED',
        confidence: -1,
      };

      await expect(
        service.reviewDVIAssessment(TENANT_ID, dto),
      ).rejects.toThrow(DomainException);
    });

    it('should enforce tenant isolation', async () => {
      const dto = {
        assessmentId: ASSESSMENT_ID,
        reviewerEmail: REVIEWER_EMAIL,
        reviewerUserId: REVIEWER_ID,
        decision: 'APPROVED',
        confidence: 85,
      };

      await service.reviewDVIAssessment(TENANT_ID, dto);

      const call = (prisma.aIDecisionOverrideAuditLog.create as jest.Mock)
        .mock.calls[0][0];
      expect(call.data.tenantId).toBe(TENANT_ID);
    });
  });

  describe('getAssessmentOverrideHistory', () => {
    it('should fetch override history', async () => {
      const mockHistory = [
        {
          id: 'override-1',
          originalDecision: 'pending',
          originalConfidence: 0,
          overrideDecision: 'APPROVED',
          assessorConfidence: 85,
          reviewerEmail: REVIEWER_EMAIL,
          createdAt: new Date(),
          notes: 'Good',
        },
      ];

      (prisma.aIDecisionOverrideAuditLog.findMany as jest.Mock).mockResolvedValue(
        mockHistory,
      );

      const result = await service.getAssessmentOverrideHistory(
        TENANT_ID,
        ASSESSMENT_ID,
      );

      expect(result).toEqual(mockHistory);
    });

    it('should enforce tenant isolation', async () => {
      (prisma.aIDecisionOverrideAuditLog.findMany as jest.Mock).mockResolvedValue(
        [],
      );

      await service.getAssessmentOverrideHistory(TENANT_ID, ASSESSMENT_ID);

      expect(prisma.aIDecisionOverrideAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID }),
        }),
      );
    });
  });
});
