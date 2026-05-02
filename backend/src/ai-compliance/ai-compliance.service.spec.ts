import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AiComplianceService } from './ai-compliance.service';
import { PrismaService } from '../common/services/prisma.service';
import { Prisma } from '@prisma/client';

describe('AiComplianceService', () => {
  let service: AiComplianceService;
  let prisma: {
    aiDecisionLog: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      aggregate: jest.Mock;
      groupBy: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const TENANT_ID = 'tenant-001';
  const USER_ID = 'user-001';

  const mockDecision = {
    id: 'dec-001',
    tenantId: TENANT_ID,
    featureName: 'damage_analysis',
    modelUsed: 'gpt-4-vision',
    inputSummary: 'Vehicle photo front bumper',
    outputSummary: 'Detected dent severity: moderate',
    confidence: new Prisma.Decimal(0.87),
    humanReviewed: false,
    humanOverridden: false,
    humanDecision: null,
    reviewedBy: null,
    reviewedAt: null,
    entityType: 'inspection',
    entityId: 'insp-001',
    userId: USER_ID,
    processingTimeMs: 2300,
    createdAt: new Date('2026-03-20T10:00:00Z'),
  };

  beforeEach(async () => {
    prisma = {
      aiDecisionLog: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AiComplianceService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AiComplianceService>(AiComplianceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logDecision', () => {
    it('should create an AI decision log with tenantId', async () => {
      prisma.aiDecisionLog.create.mockResolvedValueOnce(mockDecision);

      const dto = {
        featureName: 'damage_analysis',
        modelUsed: 'gpt-4-vision',
        inputSummary: 'Vehicle photo front bumper',
        outputSummary: 'Detected dent severity: moderate',
        confidence: 0.87,
        entityType: 'inspection',
        entityId: 'insp-001',
        userId: USER_ID,
        processingTimeMs: 2300,
      };

      const result = await service.logDecision(TENANT_ID, dto);

      expect(prisma.aiDecisionLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          featureName: 'damage_analysis',
          modelUsed: 'gpt-4-vision',
        }),
      });
      expect(result).toEqual(mockDecision);
      expect(result.tenantId).toBe(TENANT_ID);
      expect(result.featureName).toBe('damage_analysis');
    });

    it('should handle null confidence', async () => {
      prisma.aiDecisionLog.create.mockResolvedValueOnce({ ...mockDecision, confidence: null });

      const dto = {
        featureName: 'diagnosis_suggestion',
        modelUsed: 'internal-v1',
        inputSummary: 'OBD codes P0301 P0302',
        outputSummary: 'Likely ignition coil failure',
      };

      const result = await service.logDecision(TENANT_ID, dto);

      expect(prisma.aiDecisionLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          confidence: null,
        }),
      });
      expect(result.confidence).toBeNull();
    });
  });

  describe('recordHumanReview', () => {
    it('should update decision with human review', async () => {
      prisma.aiDecisionLog.findFirst.mockResolvedValueOnce(mockDecision);
      const reviewed = {
        ...mockDecision,
        humanReviewed: true,
        humanOverridden: false,
        reviewedBy: USER_ID,
        reviewedAt: new Date(),
      };
      prisma.aiDecisionLog.update.mockResolvedValueOnce(reviewed);

      const result = await service.recordHumanReview(
        TENANT_ID,
        'dec-001',
        { humanOverridden: false },
        USER_ID,
      );

      expect(prisma.aiDecisionLog.findFirst).toHaveBeenCalledWith({
        where: { id: 'dec-001', tenantId: TENANT_ID },
      });
      expect(prisma.aiDecisionLog.update).toHaveBeenCalledWith({
        where: { id: 'dec-001' },
        data: expect.objectContaining({
          humanReviewed: true,
          humanOverridden: false,
          reviewedBy: USER_ID,
        }),
      });
      expect(result.humanReviewed).toBe(true);
    });

    it('should record override with human decision', async () => {
      prisma.aiDecisionLog.findFirst.mockResolvedValueOnce(mockDecision);
      prisma.aiDecisionLog.update.mockResolvedValueOnce({
        ...mockDecision,
        humanReviewed: true,
        humanOverridden: true,
        humanDecision: 'Damage is minor, not moderate',
      });

      const result = await service.recordHumanReview(
        TENANT_ID,
        'dec-001',
        { humanOverridden: true, humanDecision: 'Damage is minor, not moderate' },
        USER_ID,
      );

      expect(result.humanOverridden).toBe(true);
      expect(result.humanDecision).toBe('Damage is minor, not moderate');
      expect(prisma.aiDecisionLog.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT_ID }) })
      );
      expect(prisma.aiDecisionLog.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent decision', async () => {
      prisma.aiDecisionLog.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.recordHumanReview(TENANT_ID, 'non-existent', { humanOverridden: false }, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated results with tenantId filter', async () => {
      prisma.$transaction.mockResolvedValueOnce([[mockDecision], 1]);

      const result = await service.findAll(TENANT_ID, { page: 1, limit: 20 });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({ data: [mockDecision], total: 1 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should apply feature name filter', async () => {
      prisma.$transaction.mockResolvedValueOnce([[], 0]);

      const result = await service.findAll(TENANT_ID, { featureName: 'damage_analysis' });

      const txCall = prisma.$transaction.mock.calls[0][0];
      expect(txCall).toHaveLength(2);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should apply date range filter', async () => {
      prisma.$transaction.mockResolvedValueOnce([[], 0]);

      const result = await service.findAll(TENANT_ID, {
        dateFrom: '2026-03-01T00:00:00Z',
        dateTo: '2026-03-31T23:59:59Z',
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should apply humanReviewed filter', async () => {
      prisma.$transaction.mockResolvedValueOnce([[], 0]);

      const result = await service.findAll(TENANT_ID, { humanReviewed: false });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a single decision', async () => {
      prisma.aiDecisionLog.findFirst.mockResolvedValueOnce(mockDecision);

      const result = await service.findOne(TENANT_ID, 'dec-001');

      expect(prisma.aiDecisionLog.findFirst).toHaveBeenCalledWith({
        where: { id: 'dec-001', tenantId: TENANT_ID },
      });
      expect(result).toEqual(mockDecision);
    });

    it('should throw NotFoundException for non-existent decision', async () => {
      prisma.aiDecisionLog.findFirst.mockResolvedValueOnce(null);

      await expect(service.findOne(TENANT_ID, 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDashboard', () => {
    it('should return compliance dashboard stats', async () => {
      prisma.$transaction.mockResolvedValueOnce([
        10, // totalDecisions
        2, // overriddenCount
        3, // pendingReview
        { _avg: { confidence: new Prisma.Decimal(0.85) } }, // avgResult
        [
          { featureName: 'damage_analysis', _count: 7 },
          { featureName: 'diagnosis_suggestion', _count: 3 },
        ],
      ]);

      const result = await service.getDashboard(TENANT_ID);

      expect(result.totalDecisions).toBe(10);
      expect(result.overrideRate).toBe(0.2);
      expect(result.avgConfidence).toBe(0.85);
      expect(result.pendingReview).toBe(3);
      expect(result.byFeature).toEqual({
        damage_analysis: 7,
        diagnosis_suggestion: 3,
      });
    });

    it('should handle zero decisions gracefully', async () => {
      prisma.$transaction.mockResolvedValueOnce([0, 0, 0, { _avg: { confidence: null } }, []]);

      const result = await service.getDashboard(TENANT_ID);

      expect(result.totalDecisions).toBe(0);
      expect(result.overrideRate).toBe(0);
      expect(result.avgConfidence).toBe(0);
      expect(result.pendingReview).toBe(0);
      expect(result.byFeature).toEqual({});
    });

    it('should throw InternalServerErrorException on database error', async () => {
      prisma.$transaction.mockRejectedValueOnce(new Error('DB connection failed'));

      await expect(service.getDashboard(TENANT_ID)).rejects.toThrow(
        'Errore durante il recupero della dashboard AI',
      );
    });
  });

  describe('error handling', () => {
    it('logDecision should throw InternalServerErrorException on create error', async () => {
      prisma.aiDecisionLog.create.mockRejectedValueOnce(new Error('DB error'));

      const dto = {
        featureName: 'test',
        modelUsed: 'test',
        inputSummary: 'test',
        outputSummary: 'test',
      };

      await expect(service.logDecision(TENANT_ID, dto)).rejects.toThrow(
        'Errore durante il salvataggio della decisione IA',
      );
    });

    it('recordHumanReview should throw InternalServerErrorException on update error', async () => {
      prisma.aiDecisionLog.findFirst.mockResolvedValueOnce(mockDecision);
      prisma.aiDecisionLog.update.mockRejectedValueOnce(new Error('DB error'));

      await expect(
        service.recordHumanReview(TENANT_ID, 'dec-001', { humanOverridden: false }, USER_ID),
      ).rejects.toThrow('Errore durante il salvataggio della revisione umana');
    });

    it('findAll should throw InternalServerErrorException on transaction error', async () => {
      prisma.$transaction.mockRejectedValueOnce(new Error('DB error'));

      await expect(service.findAll(TENANT_ID, { page: 1 })).rejects.toThrow(
        'Errore durante il recupero delle decisioni IA',
      );
    });

    it('findOne should throw InternalServerErrorException on query error', async () => {
      prisma.aiDecisionLog.findFirst.mockRejectedValueOnce(new Error('DB error'));

      await expect(service.findOne(TENANT_ID, 'dec-001')).rejects.toThrow(
        'Errore durante il recupero della decisione IA',
      );
    });

    it('findAll should apply multiple filters correctly', async () => {
      prisma.$transaction.mockResolvedValueOnce([[mockDecision], 1]);

      const result = await service.findAll(TENANT_ID, {
        page: 1,
        limit: 20,
        featureName: 'damage_analysis',
        humanReviewed: true,
        dateFrom: '2026-03-01T00:00:00Z',
        dateTo: '2026-03-31T23:59:59Z',
      });

      const txCall = prisma.$transaction.mock.calls[prisma.$transaction.mock.calls.length - 1];
      expect(txCall).toBeDefined();
      expect(txCall[0]).toHaveLength(2);
      expect(result.data).toEqual([mockDecision]);
    });

    it('findAll should handle only dateFrom without dateTo', async () => {
      prisma.$transaction.mockResolvedValueOnce([[], 0]);

      await service.findAll(TENANT_ID, {
        page: 1,
        dateFrom: '2026-03-01T00:00:00Z',
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('findAll should handle only dateTo without dateFrom', async () => {
      prisma.$transaction.mockResolvedValueOnce([[], 0]);

      await service.findAll(TENANT_ID, {
        page: 1,
        dateTo: '2026-03-31T23:59:59Z',
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('findAll should handle pagination with custom page and limit', async () => {
      prisma.$transaction.mockResolvedValueOnce([[mockDecision], 1]);

      const result = await service.findAll(TENANT_ID, {
        page: 3,
        limit: 50,
      });

      expect(result.data).toEqual([mockDecision]);
      expect(result.total).toBe(1);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('findAll should use default pagination when not provided', async () => {
      prisma.$transaction.mockResolvedValueOnce([[mockDecision], 1]);

      const result = await service.findAll(TENANT_ID, {});

      expect(result).toEqual({ data: [mockDecision], total: 1 });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('dashboard edge cases', () => {
    it('getDashboard should handle decimal confidence correctly', async () => {
      prisma.$transaction.mockResolvedValueOnce([
        5,
        1,
        2,
        { _avg: { confidence: new Prisma.Decimal('0.123456789') } },
        [{ featureName: 'test', _count: 5 }],
      ]);

      const result = await service.getDashboard(TENANT_ID);

      expect(result.avgConfidence).toBe(0.1235); // rounded to 4 decimals
    });

    it('getDashboard should handle overrideRate calculation', async () => {
      prisma.$transaction.mockResolvedValueOnce([
        100,
        25,
        10,
        { _avg: { confidence: new Prisma.Decimal(0.9) } },
        [],
      ]);

      const result = await service.getDashboard(TENANT_ID);

      expect(result.overrideRate).toBe(0.25);
      expect(result.byFeature).toEqual({});
    });

    it('getDashboard should populate byFeature correctly with multiple features', async () => {
      prisma.$transaction.mockResolvedValueOnce([
        20,
        5,
        3,
        { _avg: { confidence: new Prisma.Decimal(0.75) } },
        [
          { featureName: 'damage_analysis', _count: 10 },
          { featureName: 'diagnosis', _count: 5 },
          { featureName: 'scheduling', _count: 5 },
        ],
      ]);

      const result = await service.getDashboard(TENANT_ID);

      expect(result.byFeature).toEqual({
        damage_analysis: 10,
        diagnosis: 5,
        scheduling: 5,
      });
    });
  });
});
