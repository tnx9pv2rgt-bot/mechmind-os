import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AiComplianceController } from './ai-compliance.controller';
import { AiComplianceService } from './ai-compliance.service';
import { Prisma } from '@prisma/client';

describe('AiComplianceController', () => {
  let controller: AiComplianceController;
  let service: jest.Mocked<AiComplianceService>;

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
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiComplianceController],
      providers: [
        {
          provide: AiComplianceService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            logDecision: jest.fn(),
            recordHumanReview: jest.fn(),
            getDashboard: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AiComplianceController>(AiComplianceController);
    service = module.get(AiComplianceService) as jest.Mocked<AiComplianceService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should delegate to service with tenantId and query', async () => {
      const query = { page: 1, limit: 20, featureName: 'damage_analysis' };
      service.findAll.mockResolvedValue({ data: [mockDecision], total: 1 });

      const result = await controller.findAll(TENANT_ID, query);

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, query);
      expect(result.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should delegate to service with tenantId and id', async () => {
      service.findOne.mockResolvedValue(mockDecision);

      const result = await controller.findOne(TENANT_ID, 'dec-001');

      expect(service.findOne).toHaveBeenCalledWith(TENANT_ID, 'dec-001');
      expect(result).toEqual(mockDecision);
    });

    it('should propagate NotFoundException', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne(TENANT_ID, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('logDecision', () => {
    it('should delegate to service with tenantId and dto', async () => {
      const dto = {
        featureName: 'damage_analysis',
        modelUsed: 'gpt-4-vision',
        inputSummary: 'Vehicle photo',
        outputSummary: 'Dent detected',
        confidence: 0.87,
      };
      service.logDecision.mockResolvedValue(mockDecision);

      const result = await controller.logDecision(TENANT_ID, dto);

      expect(service.logDecision).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual(mockDecision);
    });
  });

  describe('recordReview', () => {
    it('should delegate to service with tenantId, id, dto, and userId', async () => {
      const dto = { humanOverridden: true, humanDecision: 'Damage is minor' };
      const reviewed = {
        ...mockDecision,
        humanReviewed: true,
        humanOverridden: true,
        humanDecision: 'Damage is minor',
        reviewedBy: USER_ID,
        reviewedAt: new Date(),
      };
      service.recordHumanReview.mockResolvedValue(reviewed);

      const result = await controller.recordReview(TENANT_ID, USER_ID, 'dec-001', dto);

      expect(service.recordHumanReview).toHaveBeenCalledWith(TENANT_ID, 'dec-001', dto, USER_ID);
      expect(result.humanOverridden).toBe(true);
    });
  });

  describe('getDashboard', () => {
    it('should return compliance dashboard stats', async () => {
      const dashboard = {
        totalDecisions: 10,
        overrideRate: 0.2,
        avgConfidence: 0.85,
        pendingReview: 3,
        byFeature: { damage_analysis: 7, diagnosis_suggestion: 3 },
      };
      service.getDashboard.mockResolvedValue(dashboard);

      const result = await controller.getDashboard(TENANT_ID);

      expect(service.getDashboard).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual(dashboard);
    });
  });

  describe('error handling branches', () => {
    it('logDecision should handle service error', async () => {
      const dto = {
        featureName: 'damage_analysis',
        modelUsed: 'gpt-4-vision',
        inputSummary: 'Vehicle photo',
        outputSummary: 'Dent detected',
      };
      service.logDecision.mockRejectedValueOnce(new Error('Database error'));

      await expect(controller.logDecision(TENANT_ID, dto)).rejects.toThrow('Database error');
      expect(service.logDecision).toHaveBeenCalledWith(TENANT_ID, dto);
    });

    it('getDashboard should handle service error', async () => {
      service.getDashboard.mockRejectedValueOnce(new Error('Database error'));

      await expect(controller.getDashboard(TENANT_ID)).rejects.toThrow('Database error');
      expect(service.getDashboard).toHaveBeenCalledWith(TENANT_ID);
    });

    it('findAll should handle service error', async () => {
      const query = { page: 1, limit: 20 };
      service.findAll.mockRejectedValueOnce(new Error('Database error'));

      await expect(controller.findAll(TENANT_ID, query)).rejects.toThrow('Database error');
      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, query);
    });

    it('findOne should handle service error', async () => {
      service.findOne.mockRejectedValueOnce(new Error('Database error'));

      await expect(controller.findOne(TENANT_ID, 'dec-001')).rejects.toThrow('Database error');
      expect(service.findOne).toHaveBeenCalledWith(TENANT_ID, 'dec-001');
    });

    it('recordReview should handle service error', async () => {
      const dto = { humanOverridden: true, humanDecision: 'Minor' };
      service.recordHumanReview.mockRejectedValueOnce(new Error('Database error'));

      await expect(controller.recordReview(TENANT_ID, USER_ID, 'dec-001', dto)).rejects.toThrow(
        'Database error',
      );
      expect(service.recordHumanReview).toHaveBeenCalledWith(TENANT_ID, 'dec-001', dto, USER_ID);
    });
  });

  describe('multiple query variations', () => {
    it('findAll with only featureName filter', async () => {
      service.findAll.mockResolvedValueOnce({ data: [], total: 0 });

      await controller.findAll(TENANT_ID, { featureName: 'test' });

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, { featureName: 'test' });
    });

    it('findAll with page and limit only', async () => {
      service.findAll.mockResolvedValueOnce({ data: [mockDecision], total: 1 });

      await controller.findAll(TENANT_ID, { page: 2, limit: 10 });

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, { page: 2, limit: 10 });
    });

    it('findAll with empty query object', async () => {
      service.findAll.mockResolvedValueOnce({ data: [mockDecision], total: 1 });

      await controller.findAll(TENANT_ID, {});

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {});
    });

    it('recordReview with no humanDecision (override=false)', async () => {
      const dto = { humanOverridden: false };
      service.recordHumanReview.mockResolvedValueOnce({
        ...mockDecision,
        humanReviewed: true,
      });

      await controller.recordReview(TENANT_ID, USER_ID, 'dec-001', dto);

      expect(service.recordHumanReview).toHaveBeenCalledWith(TENANT_ID, 'dec-001', dto, USER_ID);
    });

    it('logDecision with all optional fields', async () => {
      const dto: any = {
        featureName: 'damage_analysis',
        modelUsed: 'gpt-4-vision',
        inputSummary: 'Vehicle photo',
        outputSummary: 'Dent detected',
        confidence: 0.95,
        entityType: 'inspection',
        entityId: 'insp-123',
        userId: USER_ID,
        processingTimeMs: 5000,
      };
      service.logDecision.mockResolvedValueOnce(mockDecision);

      await controller.logDecision(TENANT_ID, dto);

      expect(service.logDecision).toHaveBeenCalledWith(TENANT_ID, dto);
    });
  });
});
