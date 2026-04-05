import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiDiagnosticService } from './ai-diagnostic.service';
import { PrismaService } from '../common/services/prisma.service';
import { Prisma } from '@prisma/client';
import { VehicleInfoDto } from './dto/analyze-dtc.dto';

describe('AiDiagnosticService', () => {
  let service: AiDiagnosticService;
  let prisma: {
    aiDecisionLog: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
    vehicle: {
      findFirst: jest.Mock;
    };
    estimate: {
      count: jest.Mock;
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let configService: { get: jest.Mock };

  const TENANT_ID = 'tenant-001';

  const vehicleInfo: VehicleInfoDto = {
    make: 'Fiat',
    model: 'Punto',
    year: 2020,
    mileage: 85000,
  };

  const mockDecisionLog = {
    id: 'diag-001',
    tenantId: TENANT_ID,
    featureName: 'DIAGNOSTIC_ASSISTANT',
    modelUsed: 'mock-diagnostic-v1',
    inputSummary: 'DTC codes: P0300, P0301',
    outputSummary: 'Diagnosis: Misfire multiplo | Severity: HIGH | Repairs: 3',
    confidence: new Prisma.Decimal(0.82),
    humanReviewed: false,
    humanOverridden: false,
    humanDecision: null,
    reviewedBy: null,
    reviewedAt: null,
    entityType: 'diagnostic',
    entityId: null,
    userId: null,
    processingTimeMs: 50,
    createdAt: new Date('2026-03-28T10:00:00Z'),
  };

  beforeEach(async () => {
    prisma = {
      aiDecisionLog: {
        create: jest.fn().mockResolvedValue(mockDecisionLog),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      vehicle: {
        findFirst: jest.fn(),
      },
      estimate: {
        count: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    configService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'AI_PROVIDER') return 'mock';
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiDiagnosticService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AiDiagnosticService>(AiDiagnosticService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeDtcCodes', () => {
    it('should analyze DTC codes and return structured diagnosis', async () => {
      const codes = ['P0300', 'P0301'];

      const result = await service.analyzeDtcCodes(TENANT_ID, codes, vehicleInfo);

      expect(result.diagnosisId).toBe('diag-001');
      expect(result.diagnosis).toBeDefined();
      expect(result.severity).toMatch(/^(CRITICAL|HIGH|MEDIUM|LOW)$/);
      expect(result.probableCause).toBeDefined();
      expect(Array.isArray(result.recommendedRepairs)).toBe(true);
      expect(Array.isArray(result.additionalTests)).toBe(true);
      expect(typeof result.confidence).toBe('number');
      expect(result.modelUsed).toBe('mock-diagnostic-v1');

      expect(prisma.aiDecisionLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            featureName: 'DIAGNOSTIC_ASSISTANT',
          }),
        }),
      );
    });

    it('should include vehicle info in the AI decision log', async () => {
      const codes = ['P0420'];

      await service.analyzeDtcCodes(TENANT_ID, codes, vehicleInfo);

      expect(prisma.aiDecisionLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            inputSummary: expect.stringContaining('Fiat Punto 2020'),
          }),
        }),
      );
    });
  });

  describe('analyzeSymptoms', () => {
    it('should analyze symptoms and return structured result', async () => {
      const symptoms = 'Il motore fa un rumore strano quando accelero';

      const result = await service.analyzeSymptoms(TENANT_ID, symptoms, vehicleInfo);

      expect(result.diagnosisId).toBe('diag-001');
      expect(result.diagnosis).toBeDefined();
      expect(result.severity).toMatch(/^(CRITICAL|HIGH|MEDIUM|LOW)$/);
      expect(Array.isArray(result.probableCauses)).toBe(true);
      expect(Array.isArray(result.suggestedDtcCodes)).toBe(true);
      expect(Array.isArray(result.recommendedActions)).toBe(true);
      expect(typeof result.confidence).toBe('number');
      expect(result.modelUsed).toBe('mock-diagnostic-v1');

      expect(prisma.aiDecisionLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            featureName: 'DIAGNOSTIC_ASSISTANT',
            entityType: 'diagnostic',
          }),
        }),
      );
    });
  });

  describe('getDiagnosticHistory', () => {
    it('should return diagnostic history for a vehicle', async () => {
      const vehicle = { id: 'veh-001', tenantId: TENANT_ID, make: 'Fiat', model: 'Punto' };
      prisma.vehicle.findFirst.mockResolvedValue(vehicle);
      prisma.aiDecisionLog.findMany.mockResolvedValue([mockDecisionLog]);

      const result = await service.getDiagnosticHistory(TENANT_ID, 'veh-001');

      expect(result).toHaveLength(1);
      expect(prisma.vehicle.findFirst).toHaveBeenCalledWith({
        where: { id: 'veh-001', tenantId: TENANT_ID },
      });
      expect(prisma.aiDecisionLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            featureName: 'DIAGNOSTIC_ASSISTANT',
          }),
        }),
      );
    });

    it('should throw NotFoundException for non-existent vehicle', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.getDiagnosticHistory(TENANT_ID, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createEstimateFromDiagnosis', () => {
    it('should create an estimate from a diagnosis', async () => {
      const diagnosisLog = {
        ...mockDecisionLog,
        outputSummary: 'Diagnosis: Test | Severity: HIGH | Repairs: 2',
      };
      prisma.aiDecisionLog.findFirst.mockResolvedValue(diagnosisLog);
      prisma.estimate.count.mockResolvedValue(5);

      const mockEstimate = {
        id: 'est-001',
        lines: [{ id: 'line-001' }, { id: 'line-002' }],
      };
      prisma.$transaction.mockImplementation(
        async (fn: (tx: typeof prisma) => Promise<unknown>) => {
          return fn(prisma);
        },
      );
      prisma.estimate.create.mockResolvedValue(mockEstimate);

      const result = await service.createEstimateFromDiagnosis(TENANT_ID, 'diag-001');

      expect(result.estimateId).toBe('est-001');
      expect(typeof result.totalCents).toBe('number');
      expect(typeof result.lineCount).toBe('number');
    });

    it('should throw NotFoundException for non-existent diagnosis', async () => {
      prisma.aiDecisionLog.findFirst.mockResolvedValue(null);

      await expect(service.createEstimateFromDiagnosis(TENANT_ID, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
