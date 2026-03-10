import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MlIntegrationService } from './ml-integration.service';

describe('MlIntegrationService', () => {
  let service: MlIntegrationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MlIntegrationService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue?: unknown): unknown => defaultValue,
          },
        },
      ],
    }).compile();

    service = module.get<MlIntegrationService>(MlIntegrationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('predictChurn', () => {
    it('should call ML API and return churn prediction', async () => {
      const mockResponse = {
        probability: 0.75,
        risk_level: 'HIGH',
        factors: ['no_visit_60_days', 'low_spend'],
      };

      jest.spyOn(service as never, 'callMlApi').mockResolvedValue(mockResponse as never);

      const result = await service.predictChurn('tenant-1', 'customer-1', {
        daysSinceLastVisit: 90,
        totalBookings: 2,
        averageSpend: 50,
        cancellationRate: 0.3,
      });

      expect(result.customerId).toBe('customer-1');
      expect(result.probability).toBe(0.75);
      expect(result.riskLevel).toBe('HIGH');
      expect(result.factors).toContain('no_visit_60_days');
      expect(result.predictedAt).toBeInstanceOf(Date);
    });
  });

  describe('predictMaintenance', () => {
    it('should call ML API and return maintenance predictions', async () => {
      const mockResponse = [
        {
          component: 'BRAKES',
          predicted_failure_date: '2026-06-15T00:00:00Z',
          confidence: 0.85,
          recommended_action: 'Replace brake pads',
          urgency: 'MEDIUM',
        },
      ];

      jest.spyOn(service as never, 'callMlApi').mockResolvedValue(mockResponse as never);

      const result = await service.predictMaintenance('tenant-1', 'vehicle-1', {
        mileage: 80000,
        lastServiceDate: new Date('2025-12-01'),
        obdCodes: ['P0301'],
        healthScore: 72,
      });

      expect(result).toHaveLength(1);
      expect(result[0].vehicleId).toBe('vehicle-1');
      expect(result[0].component).toBe('BRAKES');
      expect(result[0].urgency).toBe('MEDIUM');
    });
  });

  describe('estimateLabor', () => {
    it('should return labor estimate from ML API', async () => {
      const mockResponse = {
        estimated_minutes: 120,
        confidence: 0.9,
        based_on: 'MODEL',
      };

      jest.spyOn(service as never, 'callMlApi').mockResolvedValue(mockResponse as never);

      const result = await service.estimateLabor(
        'tenant-1',
        'BRAKE_PAD_REPLACE',
        'BMW',
        '320i',
        2022,
      );

      expect(result.estimatedMinutes).toBe(120);
      expect(result.confidence).toBe(0.9);
      expect(result.basedOn).toBe('MODEL');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy when ML API responds', async () => {
      jest.spyOn(service as never, 'callMlApi').mockResolvedValue({ status: 'ok' } as never);

      const result = await service.healthCheck();
      expect(result.healthy).toBe(true);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should return unhealthy when ML API fails', async () => {
      jest
        .spyOn(service as never, 'callMlApi')
        .mockRejectedValue(new Error('Connection refused') as never);

      const result = await service.healthCheck();
      expect(result.healthy).toBe(false);
    });
  });
});
