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

  describe('callMlApi (integration via public methods)', () => {
    let fetchSpy: jest.SpyInstance;

    beforeEach(() => {
      fetchSpy = jest.spyOn(global, 'fetch');
    });

    afterEach(() => {
      fetchSpy.mockRestore();
    });

    it('should call fetch with correct URL, POST method, headers, and body', async () => {
      const mockJson = {
        probability: 0.5,
        risk_level: 'MEDIUM',
        factors: ['inactivity'],
      };
      fetchSpy.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockJson),
        text: jest.fn(),
      } as unknown as Response);

      const result = await service.predictChurn('t1', 'c1', {
        daysSinceLastVisit: 30,
        totalBookings: 5,
        averageSpend: 100,
        cancellationRate: 0.1,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('http://localhost:8000/predict/churn');
      expect(options.method).toBe('POST');
      expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
      expect(options.body).toBe(
        JSON.stringify({
          tenantId: 't1',
          customerId: 'c1',
          features: {
            daysSinceLastVisit: 30,
            totalBookings: 5,
            averageSpend: 100,
            cancellationRate: 0.1,
          },
        }),
      );
      expect(result.probability).toBe(0.5);
      expect(result.riskLevel).toBe('MEDIUM');
    });

    it('should use GET method and no body for healthCheck', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ status: 'ok' }),
        text: jest.fn(),
      } as unknown as Response);

      const result = await service.healthCheck();

      expect(result.healthy).toBe(true);
      const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('http://localhost:8000/health');
      expect(options.method).toBe('GET');
      expect(options.body).toBeUndefined();
    });

    it('should throw and log error when response is not ok', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal Server Error'),
        json: jest.fn(),
      } as unknown as Response);

      await expect(service.estimateLabor('t1', 'OIL_CHANGE', 'Fiat', 'Punto')).rejects.toThrow(
        'ML API error 500: Internal Server Error',
      );
    });

    it('should throw and log error when fetch rejects (e.g., network error)', async () => {
      fetchSpy.mockRejectedValue(new Error('fetch failed'));

      await expect(service.estimateLabor('t1', 'OIL_CHANGE', 'Fiat', 'Punto')).rejects.toThrow(
        'fetch failed',
      );
    });

    it('should throw when request is aborted (timeout)', async () => {
      fetchSpy.mockRejectedValue(new DOMException('The operation was aborted.', 'AbortError'));

      await expect(service.estimateLabor('t1', 'OIL_CHANGE', 'Fiat', 'Punto')).rejects.toThrow(
        'The operation was aborted.',
      );
    });

    it('should handle non-Error thrown values', async () => {
      fetchSpy.mockRejectedValue('string error');

      await expect(service.estimateLabor('t1', 'OIL_CHANGE', 'Fiat', 'Punto')).rejects.toThrow(
        'string error',
      );
    });
  });

  describe('callMlApi with API key configured', () => {
    let serviceWithKey: MlIntegrationService;
    let fetchSpy: jest.SpyInstance;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MlIntegrationService,
          {
            provide: ConfigService,
            useValue: {
              get: (key: string, defaultValue?: unknown): unknown => {
                if (key === 'ML_API_KEY') return 'test-api-key-123';
                return defaultValue;
              },
            },
          },
        ],
      }).compile();

      serviceWithKey = module.get<MlIntegrationService>(MlIntegrationService);
      fetchSpy = jest.spyOn(global, 'fetch');
    });

    afterEach(() => {
      fetchSpy.mockRestore();
    });

    it('should include Authorization header when API key is set', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          estimated_minutes: 60,
          confidence: 0.8,
          based_on: 'HISTORICAL',
        }),
        text: jest.fn(),
      } as unknown as Response);

      await serviceWithKey.estimateLabor('t1', 'TIRE_ROTATE', 'Toyota', 'Corolla');

      const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const headers = options.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer test-api-key-123');
      expect(headers['Content-Type']).toBe('application/json');
    });
  });
});
