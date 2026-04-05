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
  });
});
