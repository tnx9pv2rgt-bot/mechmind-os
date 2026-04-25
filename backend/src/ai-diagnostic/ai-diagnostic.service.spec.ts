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

  describe('callAiProvider — production path (lines 251-303)', () => {
    let productionService: AiDiagnosticService;

    beforeEach(async () => {
      const prodConfigService = {
        get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
          if (key === 'AI_PROVIDER') return 'openai';
          if (key === 'AI_API_KEY') return undefined;
          return defaultValue;
        }),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AiDiagnosticService,
          { provide: PrismaService, useValue: prisma },
          { provide: ConfigService, useValue: prodConfigService },
        ],
      }).compile();
      productionService = module.get<AiDiagnosticService>(AiDiagnosticService);
    });

    it('should fallback to mock when AI_API_KEY is not configured (line 252-255)', async () => {
      prisma.aiDecisionLog.create.mockResolvedValue(mockDecisionLog);

      const result = await productionService.analyzeDtcCodes(TENANT_ID, ['P0300'], vehicleInfo);

      expect(result.diagnosisId).toBe('diag-001');
      expect(result.diagnosis).toBeDefined();
    });
  });

  describe('callAiProvider — fetch paths (lines 264-303)', () => {
    let fetchService: AiDiagnosticService;
    let mockFetch: jest.Mock;

    beforeEach(async () => {
      mockFetch = jest.fn();
      global.fetch = mockFetch;

      const fetchConfigService = {
        get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
          if (key === 'AI_PROVIDER') return 'openai';
          if (key === 'AI_API_KEY') return 'test-api-key';
          if (key === 'AI_API_URL') return 'https://api.openai.com/v1/chat/completions';
          if (key === 'AI_MODEL') return 'gpt-4';
          return defaultValue;
        }),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AiDiagnosticService,
          { provide: PrismaService, useValue: prisma },
          { provide: ConfigService, useValue: fetchConfigService },
        ],
      }).compile();
      fetchService = module.get<AiDiagnosticService>(AiDiagnosticService);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should fallback to mock when fetch response is not ok (line 286-289)', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' });
      prisma.aiDecisionLog.create.mockResolvedValue(mockDecisionLog);

      const result = await fetchService.analyzeDtcCodes(TENANT_ID, ['P0300'], vehicleInfo);

      expect(result.diagnosisId).toBe('diag-001');
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should fallback to mock when fetch throws (lines 301-303)', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      prisma.aiDecisionLog.create.mockResolvedValue(mockDecisionLog);

      const result = await fetchService.analyzeDtcCodes(TENANT_ID, ['P0300'], vehicleInfo);

      expect(result.diagnosisId).toBe('diag-001');
    });

    it('should return real AI response on successful fetch (lines 264-300)', async () => {
      const mockContent = JSON.stringify({
        diagnosis: 'Real AI diagnosis',
        severity: 'HIGH',
        probableCause: 'Faulty sensor',
        recommendedRepairs: [],
        additionalTests: ['OBD scan'],
        confidence: 0.9,
      });
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: mockContent } }],
          model: 'gpt-4',
        }),
      });
      prisma.aiDecisionLog.create.mockResolvedValue(mockDecisionLog);

      const result = await fetchService.analyzeDtcCodes(TENANT_ID, ['P0300'], vehicleInfo);

      expect(result.diagnosisId).toBe('diag-001');
    });
  });

  describe('parseDtcResponse — all defensive branches (lines 399-406)', () => {
    it('should use fallback values when AI returns empty object (all ?? and non-array branches)', async () => {
      jest.spyOn(service as never, 'callAiProvider').mockResolvedValue({
        content: JSON.stringify({}),
        model: 'mock-diagnostic-v1',
        processingTimeMs: 10,
      } as never);
      prisma.aiDecisionLog.create.mockResolvedValue(mockDecisionLog);

      const result = await service.analyzeDtcCodes(TENANT_ID, ['P0300'], vehicleInfo);

      expect(result.probableCause).toBe('Causa da determinare con ulteriori test');
      expect(result.recommendedRepairs).toEqual([]);
      expect(result.additionalTests).toEqual([]);
      expect(result.confidence).toBe(0.5);
    });

    it('should return default diagnosis when AI returns invalid JSON (catch block lines 409-410)', async () => {
      jest.spyOn(service as never, 'callAiProvider').mockResolvedValue({
        content: 'this is not valid json {{',
        model: 'mock-diagnostic-v1',
        processingTimeMs: 10,
      } as never);
      prisma.aiDecisionLog.create.mockResolvedValue(mockDecisionLog);

      const result = await service.analyzeDtcCodes(TENANT_ID, ['P0300'], vehicleInfo);

      expect(result.diagnosisId).toBe('diag-001');
      expect(result.severity).toBe('MEDIUM');
      expect(result.confidence).toBe(0.3);
    });
  });

  describe('parseSymptomsResponse — all defensive branches (lines 436-443)', () => {
    it('should use fallback values when AI returns empty object for symptoms', async () => {
      jest.spyOn(service as never, 'callAiProvider').mockResolvedValue({
        content: JSON.stringify({}),
        model: 'mock-diagnostic-v1',
        processingTimeMs: 10,
      } as never);
      prisma.aiDecisionLog.create.mockResolvedValue(mockDecisionLog);

      const result = await service.analyzeSymptoms(TENANT_ID, 'rumore strano', vehicleInfo);

      expect(result.diagnosis).toBe('Analisi sintomi completata');
      expect(result.probableCauses).toEqual([]);
      expect(result.suggestedDtcCodes).toEqual([]);
      expect(result.recommendedActions).toEqual([]);
      expect(result.confidence).toBe(0.5);
    });

    it('should return default diagnosis when AI returns invalid JSON for symptoms (catch lines 446-447)', async () => {
      jest.spyOn(service as never, 'callAiProvider').mockResolvedValue({
        content: 'invalid json }{',
        model: 'mock-diagnostic-v1',
        processingTimeMs: 10,
      } as never);
      prisma.aiDecisionLog.create.mockResolvedValue(mockDecisionLog);

      const result = await service.analyzeSymptoms(TENANT_ID, 'rumore strano', vehicleInfo);

      expect(result.diagnosisId).toBe('diag-001');
      expect(result.severity).toBe('MEDIUM');
      expect(result.confidence).toBe(0.3);
    });
  });

  describe('validateSeverity — invalid severity returns MEDIUM (line 463)', () => {
    it('should return MEDIUM when severity is not a valid value', async () => {
      jest.spyOn(service as never, 'callAiProvider').mockResolvedValue({
        content: JSON.stringify({
          diagnosis: 'Test',
          severity: 'INVALID_SEVERITY',
          probableCause: 'Test cause',
          recommendedRepairs: [],
          additionalTests: [],
          confidence: 0.7,
        }),
        model: 'mock-diagnostic-v1',
        processingTimeMs: 10,
      } as never);
      prisma.aiDecisionLog.create.mockResolvedValue(mockDecisionLog);

      const result = await service.analyzeDtcCodes(TENANT_ID, ['P0300'], vehicleInfo);

      expect(result.severity).toBe('MEDIUM');
    });
  });

  describe('buildDtcPrompt — no mileage branch (line 369)', () => {
    it('should build prompt without mileage when vehicleInfo.mileage is undefined', async () => {
      const vehicleNoMileage: VehicleInfoDto = { make: 'Ford', model: 'Focus', year: 2019 };
      prisma.aiDecisionLog.create.mockResolvedValue(mockDecisionLog);

      const result = await service.analyzeDtcCodes(TENANT_ID, ['P0301'], vehicleNoMileage);

      expect(result.diagnosisId).toBe('diag-001');
      expect(prisma.aiDecisionLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            inputSummary: expect.stringContaining('Ford Focus 2019'),
          }),
        }),
      );
    });

    it('should build symptoms prompt without mileage (line 377)', async () => {
      const vehicleNoMileage: VehicleInfoDto = { make: 'BMW', model: 'Serie 3', year: 2021 };
      prisma.aiDecisionLog.create.mockResolvedValue(mockDecisionLog);

      const result = await service.analyzeSymptoms(TENANT_ID, 'rumore freni', vehicleNoMileage);

      expect(result.diagnosisId).toBe('diag-001');
    });
  });

  describe('callAiProvider — fetch with null choices content (lines 297-298)', () => {
    let fetchService2: AiDiagnosticService;
    let mockFetch2: jest.Mock;

    beforeEach(async () => {
      mockFetch2 = jest.fn();
      global.fetch = mockFetch2;

      const fetchConfigService2 = {
        get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
          if (key === 'AI_PROVIDER') return 'openai';
          if (key === 'AI_API_KEY') return 'test-api-key-2';
          if (key === 'AI_API_URL') return 'https://api.openai.com/v1/chat/completions';
          if (key === 'AI_MODEL') return 'gpt-4';
          return defaultValue;
        }),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AiDiagnosticService,
          { provide: PrismaService, useValue: prisma },
          { provide: ConfigService, useValue: fetchConfigService2 },
        ],
      }).compile();
      fetchService2 = module.get<AiDiagnosticService>(AiDiagnosticService);
    });

    it('should use "{}" when choices[0].message.content is undefined (line 297 ?? branch)', async () => {
      mockFetch2.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: {} }], // no content field
          // no model field
        }),
      });
      prisma.aiDecisionLog.create.mockResolvedValue(mockDecisionLog);

      const result = await fetchService2.analyzeDtcCodes(TENANT_ID, ['P0300'], vehicleInfo);

      expect(result.diagnosisId).toBe('diag-001');
    });
  });
});
