import { Test, TestingModule } from '@nestjs/testing';
import { AiDiagnosticController } from './ai-diagnostic.controller';
import { AiDiagnosticService } from './ai-diagnostic.service';

describe('AiDiagnosticController', () => {
  let controller: AiDiagnosticController;
  let service: jest.Mocked<AiDiagnosticService>;

  const TENANT_ID = 'tenant-001';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiDiagnosticController],
      providers: [
        {
          provide: AiDiagnosticService,
          useValue: {
            analyzeDtcCodes: jest.fn(),
            analyzeSymptoms: jest.fn(),
            getDiagnosticHistory: jest.fn(),
            createEstimateFromDiagnosis: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AiDiagnosticController>(AiDiagnosticController);
    service = module.get(AiDiagnosticService) as jest.Mocked<AiDiagnosticService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('analyzeDtc', () => {
    it('should delegate to service with tenantId, codes, and vehicleInfo', async () => {
      const diagnosis = { codes: ['P0300'], severity: 'HIGH', recommendations: [] };
      service.analyzeDtcCodes.mockResolvedValue(diagnosis as never);
      const dto = { codes: ['P0300'], vehicleInfo: { make: 'Fiat', model: 'Punto' } };

      const result = await controller.analyzeDtc(TENANT_ID, dto as never);

      expect(service.analyzeDtcCodes).toHaveBeenCalledWith(TENANT_ID, ['P0300'], {
        make: 'Fiat',
        model: 'Punto',
      });
      expect(result).toEqual(diagnosis);
    });
  });

  describe('analyzeSymptoms', () => {
    it('should delegate to service with tenantId, symptoms, and vehicleInfo', async () => {
      const diagnosis = { possibleCauses: [], confidence: 0.85 };
      service.analyzeSymptoms.mockResolvedValue(diagnosis as never);
      const dto = { symptoms: 'Rumore strano al motore', vehicleInfo: { make: 'Fiat' } };

      const result = await controller.analyzeSymptoms(TENANT_ID, dto as never);

      expect(service.analyzeSymptoms).toHaveBeenCalledWith(TENANT_ID, 'Rumore strano al motore', {
        make: 'Fiat',
      });
      expect(result).toEqual(diagnosis);
    });
  });

  describe('getHistory', () => {
    it('should delegate to service with tenantId and vehicleId', async () => {
      const history = [{ id: 'diag-001', type: 'DTC' }];
      service.getDiagnosticHistory.mockResolvedValue(history as never);

      const result = await controller.getHistory(TENANT_ID, 'veh-001');

      expect(service.getDiagnosticHistory).toHaveBeenCalledWith(TENANT_ID, 'veh-001');
      expect(result).toEqual(history);
    });
  });

  describe('createEstimate', () => {
    it('should delegate to service with tenantId and diagnosisId', async () => {
      const estimateResult = { estimateId: 'est-001', totalCents: 50000, lineCount: 3 };
      service.createEstimateFromDiagnosis.mockResolvedValue(estimateResult as never);

      const result = await controller.createEstimate(TENANT_ID, 'diag-001');

      expect(service.createEstimateFromDiagnosis).toHaveBeenCalledWith(TENANT_ID, 'diag-001');
      expect(result).toEqual(estimateResult);
    });

    it('should pass through lineCount from service result', async () => {
      const estimateResult = { estimateId: 'est-002', totalCents: 100000, lineCount: 6 };
      service.createEstimateFromDiagnosis.mockResolvedValue(estimateResult as never);

      const result = await controller.createEstimate(TENANT_ID, 'diag-002');

      expect(result.lineCount).toBe(6);
      expect(result.totalCents).toBe(100000);
    });
  });

  describe('analyzeDtc with various DTO configurations', () => {
    it('should handle DTO with single code', async () => {
      const diagnosis = { codes: ['P0420'], severity: 'MEDIUM', confidence: 0.75 };
      service.analyzeDtcCodes.mockResolvedValue(diagnosis as never);
      const dto = { codes: ['P0420'], vehicleInfo: { make: 'Fiat', model: 'Punto' } };

      const result = (await controller.analyzeDtc(TENANT_ID, dto as never)) as unknown as {
        codes: string[];
      };

      expect(result.codes).toEqual(['P0420']);
    });

    it('should handle DTO with multiple codes', async () => {
      const diagnosis = { codes: ['P0300', 'P0301'], severity: 'HIGH', confidence: 0.88 };
      service.analyzeDtcCodes.mockResolvedValue(diagnosis as never);
      const dto = {
        codes: ['P0300', 'P0301'],
        vehicleInfo: { make: 'Fiat', model: 'Punto', year: 2020 },
      };

      const result = (await controller.analyzeDtc(TENANT_ID, dto as never)) as unknown as {
        codes: string[];
      };

      expect(result.codes.length).toBe(2);
    });

    it('should pass vehicleInfo with and without mileage', async () => {
      const diagnosis = { severity: 'MEDIUM', confidence: 0.65 };
      service.analyzeDtcCodes.mockResolvedValue(diagnosis as never);
      const dto = {
        codes: ['P0171'],
        vehicleInfo: { make: 'Ford', model: 'Focus', year: 2018 },
      };

      const result = await controller.analyzeDtc(TENANT_ID, dto as never);

      expect(service.analyzeDtcCodes).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('analyzeSymptoms with various symptom lengths', () => {
    it('should handle brief symptom text', async () => {
      const diagnosis = { severity: 'LOW', confidence: 0.5 };
      service.analyzeSymptoms.mockResolvedValue(diagnosis as never);
      const dto = {
        symptoms: 'Noise',
        vehicleInfo: { make: 'BMW', model: 'Serie 3' },
      };

      const result = await controller.analyzeSymptoms(TENANT_ID, dto as never);

      expect(result).toBeDefined();
    });

    it('should handle detailed symptom text', async () => {
      const diagnosis = { severity: 'HIGH', confidence: 0.92 };
      service.analyzeSymptoms.mockResolvedValue(diagnosis as never);
      const longSymptom =
        "Il motore fa rumori strani e vibra durante l'accelerazione, specialmente a freddo. Aumenta con i giri";
      const dto = {
        symptoms: longSymptom,
        vehicleInfo: { make: 'Audi', model: 'A4', year: 2019, mileage: 120000 },
      };

      const result = await controller.analyzeSymptoms(TENANT_ID, dto as never);

      expect(result.severity).toBe('HIGH');
    });
  });

  describe('getHistory with different vehicleIds', () => {
    it('should fetch history for any vehicleId', async () => {
      const history = [{ id: 'diag-1' }, { id: 'diag-2' }, { id: 'diag-3' }];
      service.getDiagnosticHistory.mockResolvedValue(history as never);

      const result = await controller.getHistory(TENANT_ID, 'veh-12345');

      expect(result.length).toBe(3);
      expect(service.getDiagnosticHistory).toHaveBeenCalledWith(TENANT_ID, 'veh-12345');
    });

    it('should handle empty history result', async () => {
      service.getDiagnosticHistory.mockResolvedValue([] as never);

      const result = await controller.getHistory(TENANT_ID, 'veh-no-history');

      expect(result).toEqual([]);
    });
  });

  describe('createEstimate with various diagnosisIds', () => {
    it('should create estimate for any diagnosisId', async () => {
      const estimateResult = { estimateId: 'est-999', totalCents: 250000, lineCount: 8 };
      service.createEstimateFromDiagnosis.mockResolvedValue(estimateResult as never);

      const result = await controller.createEstimate(TENANT_ID, 'diag-xyz');

      expect(result.estimateId).toBe('est-999');
      expect(service.createEstimateFromDiagnosis).toHaveBeenCalledWith(TENANT_ID, 'diag-xyz');
    });

    it('should return correct structure for estimate result', async () => {
      const estimateResult = { estimateId: 'est-new', totalCents: 500000, lineCount: 12 };
      service.createEstimateFromDiagnosis.mockResolvedValue(estimateResult as never);

      const result = await controller.createEstimate(TENANT_ID, 'diag-new-123');

      expect(result).toHaveProperty('estimateId');
      expect(result).toHaveProperty('totalCents');
      expect(result).toHaveProperty('lineCount');
      expect(result.totalCents).toBe(500000);
    });
  });

  describe('Integration: all four endpoints', () => {
    it('analyzeDtc should accept and delegate AnalyzeDtcDto', async () => {
      const dtcDiagnosis = {
        diagnosisId: 'diag-123',
        diagnosis: 'Test diagnosis',
        severity: 'HIGH' as const,
        probableCause: 'Test cause',
        recommendedRepairs: [],
        additionalTests: [],
        confidence: 0.85,
        modelUsed: 'mock-v1',
      };
      service.analyzeDtcCodes.mockResolvedValue(dtcDiagnosis as never);

      const dto = {
        codes: ['P0420'],
        vehicleInfo: { make: 'Toyota', model: 'Camry', year: 2020, mileage: 100000 },
      };

      const result = await controller.analyzeDtc(TENANT_ID, dto as never);

      expect(service.analyzeDtcCodes).toHaveBeenCalledWith(TENANT_ID, ['P0420'], {
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        mileage: 100000,
      });
      expect(result.confidence).toBe(0.85);
    });

    it('analyzeSymptoms should accept and delegate AnalyzeSymptomsDto with all fields', async () => {
      const symptomDiagnosis = {
        diagnosisId: 'diag-456',
        diagnosis: 'Possible fuel system issue',
        severity: 'MEDIUM' as const,
        probableCauses: ['Dirty fuel filter', 'Low fuel pressure'],
        suggestedDtcCodes: ['P0171', 'P0174'],
        recommendedActions: ['Check fuel pressure', 'Replace fuel filter'],
        confidence: 0.72,
        modelUsed: 'mock-v1',
      };
      service.analyzeSymptoms.mockResolvedValue(symptomDiagnosis as never);

      const dto = {
        symptoms: 'Engine hesitation during acceleration',
        vehicleInfo: { make: 'Honda', model: 'Civic', year: 2018, mileage: 95000 },
      };

      const result = await controller.analyzeSymptoms(TENANT_ID, dto as never);

      expect(result.suggestedDtcCodes.length).toBe(2);
      expect((result as unknown as { probability?: number }).probability).toBeUndefined(); // Test schema match
    });

    it('getHistory should support pagination with vehicleId', async () => {
      const historyResult = [
        { id: 'diag-001', featureName: 'DIAGNOSTIC_ASSISTANT' },
        { id: 'diag-002', featureName: 'DIAGNOSTIC_ASSISTANT' },
      ];
      service.getDiagnosticHistory.mockResolvedValue(historyResult as never);

      const result = await controller.getHistory(TENANT_ID, 'veh-789');

      expect(service.getDiagnosticHistory).toHaveBeenCalledWith(TENANT_ID, 'veh-789');
      expect(result.length).toBe(2);
    });
  });
});
