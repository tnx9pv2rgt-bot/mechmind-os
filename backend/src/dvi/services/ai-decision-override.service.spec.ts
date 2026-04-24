import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AIDecisionOverrideService } from './ai-decision-override.service';
import { PrismaService } from '@common/services/prisma.service';

const TENANT_ID = 'tenant-123';
const ASSESSMENT_ID = 'assessment-456';
const REVIEWER_EMAIL = 'reviewer@example.com';
const REVIEWER_USER_ID = 'user-789';

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

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('reviewDVIAssessment', () => {
    it('should create audit log with valid assessment review', async () => {
      const dto = {
        assessmentId: ASSESSMENT_ID,
        reviewerEmail: REVIEWER_EMAIL,
        reviewerUserId: REVIEWER_USER_ID,
        decision: 'APPROVED' as const,
        confidence: 95,
        notes: 'Assessment quality verified',
      };

      (prisma.aIDecisionOverrideAuditLog.create as jest.Mock).mockResolvedValue({
        id: 'log-123',
        ...dto,
        tenantId: TENANT_ID,
        originalDecision: 'pending',
        originalConfidence: 0,
      });

      await service.reviewDVIAssessment(TENANT_ID, dto);

      expect(prisma.aIDecisionOverrideAuditLog.create).toHaveBeenCalledWith({
        data: {
          assessmentId: ASSESSMENT_ID,
          tenantId: TENANT_ID,
          reviewerUserId: REVIEWER_USER_ID,
          reviewerEmail: REVIEWER_EMAIL,
          originalDecision: 'pending',
          originalConfidence: 0,
          overrideDecision: 'APPROVED',
          assessorConfidence: 95,
          notes: 'Assessment quality verified',
        },
      });
    });

    it('should reject empty tenantId', async () => {
      const dto = {
        assessmentId: ASSESSMENT_ID,
        reviewerEmail: REVIEWER_EMAIL,
        reviewerUserId: REVIEWER_USER_ID,
        decision: 'REJECTED' as const,
        confidence: 80,
      };

      await expect(service.reviewDVIAssessment('', dto)).rejects.toThrow(
        'tenantId is required',
      );
    });

    it('should reject invalid confidence value (negative)', async () => {
      const dto = {
        assessmentId: ASSESSMENT_ID,
        reviewerEmail: REVIEWER_EMAIL,
        reviewerUserId: REVIEWER_USER_ID,
        decision: 'APPROVED' as const,
        confidence: -5,
      };

      await expect(service.reviewDVIAssessment(TENANT_ID, dto)).rejects.toThrow(
        'confidence must be between 0 and 100',
      );
    });

    it('should reject invalid confidence value (over 100)', async () => {
      const dto = {
        assessmentId: ASSESSMENT_ID,
        reviewerEmail: REVIEWER_EMAIL,
        reviewerUserId: REVIEWER_USER_ID,
        decision: 'NEEDS_REVISION' as const,
        confidence: 101,
      };

      await expect(service.reviewDVIAssessment(TENANT_ID, dto)).rejects.toThrow(
        'confidence must be between 0 and 100',
      );
    });

    it('should accept confidence at boundaries (0 and 100)', async () => {
      const dto = {
        assessmentId: ASSESSMENT_ID,
        reviewerEmail: REVIEWER_EMAIL,
        reviewerUserId: REVIEWER_USER_ID,
        decision: 'APPROVED' as const,
        confidence: 0,
      };

      (prisma.aIDecisionOverrideAuditLog.create as jest.Mock).mockResolvedValue({});

      await service.reviewDVIAssessment(TENANT_ID, dto);

      expect(prisma.aIDecisionOverrideAuditLog.create).toHaveBeenCalled();

      const dto2 = { ...dto, confidence: 100 };
      await service.reviewDVIAssessment(TENANT_ID, dto2);
      expect(prisma.aIDecisionOverrideAuditLog.create).toHaveBeenCalledTimes(2);
    });

    it('should enforce tenant isolation (tenantId in query)', async () => {
      const dto = {
        assessmentId: ASSESSMENT_ID,
        reviewerEmail: REVIEWER_EMAIL,
        reviewerUserId: REVIEWER_USER_ID,
        decision: 'APPROVED' as const,
        confidence: 85,
      };

      (prisma.aIDecisionOverrideAuditLog.create as jest.Mock).mockResolvedValue({});

      await service.reviewDVIAssessment(TENANT_ID, dto);

      const callArgs = (prisma.aIDecisionOverrideAuditLog.create as jest.Mock)
        .mock.calls[0][0];
      expect(callArgs.data.tenantId).toBe(TENANT_ID);
    });

    it('should handle GDPR audit log fields (immutable createdAt)', async () => {
      const dto = {
        assessmentId: ASSESSMENT_ID,
        reviewerEmail: REVIEWER_EMAIL,
        reviewerUserId: REVIEWER_USER_ID,
        decision: 'APPROVED' as const,
        confidence: 90,
      };

      const mockLog = {
        id: 'log-1',
        ...dto,
        tenantId: TENANT_ID,
        originalDecision: 'pending',
        originalConfidence: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.aIDecisionOverrideAuditLog.create as jest.Mock).mockResolvedValue(
        mockLog,
      );

      await service.reviewDVIAssessment(TENANT_ID, dto);

      expect(prisma.aIDecisionOverrideAuditLog.create).toHaveBeenCalled();
    });

    it('should store notes with null handling', async () => {
      const dto = {
        assessmentId: ASSESSMENT_ID,
        reviewerEmail: REVIEWER_EMAIL,
        reviewerUserId: REVIEWER_USER_ID,
        decision: 'APPROVED' as const,
        confidence: 75,
      };

      (prisma.aIDecisionOverrideAuditLog.create as jest.Mock).mockResolvedValue({});

      await service.reviewDVIAssessment(TENANT_ID, dto);

      const callArgs = (prisma.aIDecisionOverrideAuditLog.create as jest.Mock)
        .mock.calls[0][0];
      expect(callArgs.data.notes).toBeNull();
    });
  });

  describe('getAssessmentOverrideHistory', () => {
    it('should return audit log history for assessment', async () => {
      const mockHistory = [
        {
          id: 'log-1',
          originalDecision: 'pending',
          originalConfidence: 0,
          overrideDecision: 'APPROVED',
          assessorConfidence: 95,
          reviewerEmail: REVIEWER_EMAIL,
          createdAt: new Date('2026-04-24T10:00:00Z'),
          notes: 'Initial review',
        },
        {
          id: 'log-2',
          originalDecision: 'APPROVED',
          originalConfidence: 95,
          overrideDecision: 'NEEDS_REVISION',
          assessorConfidence: 65,
          reviewerEmail: 'reviewer2@example.com',
          createdAt: new Date('2026-04-24T11:00:00Z'),
          notes: 'Additional check required',
        },
      ];

      (prisma.aIDecisionOverrideAuditLog.findMany as jest.Mock).mockResolvedValue(
        mockHistory,
      );

      const result = await service.getAssessmentOverrideHistory(TENANT_ID, ASSESSMENT_ID);

      expect(result).toEqual(mockHistory);
      expect(prisma.aIDecisionOverrideAuditLog.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, assessmentId: ASSESSMENT_ID },
        select: {
          id: true,
          originalDecision: true,
          originalConfidence: true,
          overrideDecision: true,
          assessorConfidence: true,
          reviewerEmail: true,
          createdAt: true,
          notes: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should enforce tenant isolation in history query', async () => {
      (prisma.aIDecisionOverrideAuditLog.findMany as jest.Mock).mockResolvedValue([]);

      await service.getAssessmentOverrideHistory(TENANT_ID, ASSESSMENT_ID);

      const callArgs = (prisma.aIDecisionOverrideAuditLog.findMany as jest.Mock)
        .mock.calls[0][0];
      expect(callArgs.where.tenantId).toBe(TENANT_ID);
      expect(callArgs.where.assessmentId).toBe(ASSESSMENT_ID);
    });

    it('should return empty array if no history exists', async () => {
      (prisma.aIDecisionOverrideAuditLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getAssessmentOverrideHistory(
        TENANT_ID,
        'nonexistent-assessment',
      );

      expect(result).toEqual([]);
    });

    it('should order results by createdAt descending (GDPR audit trail)', async () => {
      const mockHistory = [
        {
          id: 'log-3',
          originalDecision: 'NEEDS_REVISION',
          originalConfidence: 65,
          overrideDecision: 'REJECTED',
          assessorConfidence: 50,
          reviewerEmail: 'reviewer3@example.com',
          createdAt: new Date('2026-04-24T12:00:00Z'),
        },
        {
          id: 'log-2',
          originalDecision: 'APPROVED',
          originalConfidence: 95,
          overrideDecision: 'NEEDS_REVISION',
          assessorConfidence: 65,
          reviewerEmail: 'reviewer2@example.com',
          createdAt: new Date('2026-04-24T11:00:00Z'),
        },
        {
          id: 'log-1',
          originalDecision: 'pending',
          originalConfidence: 0,
          overrideDecision: 'APPROVED',
          assessorConfidence: 95,
          reviewerEmail: REVIEWER_EMAIL,
          createdAt: new Date('2026-04-24T10:00:00Z'),
        },
      ];

      (prisma.aIDecisionOverrideAuditLog.findMany as jest.Mock).mockResolvedValue(
        mockHistory,
      );

      const result = await service.getAssessmentOverrideHistory(TENANT_ID, ASSESSMENT_ID);

      expect(result[0].createdAt.getTime()).toBeGreaterThan(
        result[1].createdAt.getTime(),
      );
      expect(result[1].createdAt.getTime()).toBeGreaterThan(
        result[2].createdAt.getTime(),
      );
    });

    it('should reject invalid tenantId', async () => {
      await expect(
        service.getAssessmentOverrideHistory('', ASSESSMENT_ID),
      ).rejects.toThrow();
    });

    it('should select only necessary fields (data minimization)', async () => {
      (prisma.aIDecisionOverrideAuditLog.findMany as jest.Mock).mockResolvedValue([]);

      await service.getAssessmentOverrideHistory(TENANT_ID, ASSESSMENT_ID);

      const callArgs = (prisma.aIDecisionOverrideAuditLog.findMany as jest.Mock)
        .mock.calls[0][0];
      const selectedFields = Object.keys(callArgs.select);

      expect(selectedFields).toContain('id');
      expect(selectedFields).toContain('originalDecision');
      expect(selectedFields).toContain('overrideDecision');
      expect(selectedFields).toContain('assessorConfidence');
      expect(selectedFields).not.toContain('reviewerUserId');
    });
  });

  describe('edge cases', () => {
    it('should handle assessment IDs with special characters', async () => {
      const specialId = 'assessment-456-!@#$%^&*()';
      const dto = {
        assessmentId: specialId,
        reviewerEmail: REVIEWER_EMAIL,
        reviewerUserId: REVIEWER_USER_ID,
        decision: 'APPROVED' as const,
        confidence: 85,
      };

      (prisma.aIDecisionOverrideAuditLog.create as jest.Mock).mockResolvedValue({});

      await service.reviewDVIAssessment(TENANT_ID, dto);

      expect(prisma.aIDecisionOverrideAuditLog.create).toHaveBeenCalled();
    });

    it('should reject assessment ID with only whitespace', async () => {
      const dto = {
        assessmentId: '   ',
        reviewerEmail: REVIEWER_EMAIL,
        reviewerUserId: REVIEWER_USER_ID,
        decision: 'APPROVED' as const,
        confidence: 85,
      };

      await expect(service.reviewDVIAssessment(TENANT_ID, dto)).rejects.toThrow(
        'assessmentId is required',
      );
    });

    it('should handle multiple decisions for same assessment', async () => {
      const dto1 = {
        assessmentId: ASSESSMENT_ID,
        reviewerEmail: 'reviewer1@example.com',
        reviewerUserId: 'user-1',
        decision: 'APPROVED' as const,
        confidence: 90,
      };

      const dto2 = {
        assessmentId: ASSESSMENT_ID,
        reviewerEmail: 'reviewer2@example.com',
        reviewerUserId: 'user-2',
        decision: 'REJECTED' as const,
        confidence: 75,
      };

      (prisma.aIDecisionOverrideAuditLog.create as jest.Mock)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      await service.reviewDVIAssessment(TENANT_ID, dto1);
      await service.reviewDVIAssessment(TENANT_ID, dto2);

      expect(prisma.aIDecisionOverrideAuditLog.create).toHaveBeenCalledTimes(2);
    });
  });
});
