import { Test, TestingModule } from '@nestjs/testing';
import { BenchmarkingController } from './benchmarking.controller';
import { BenchmarkingService } from './benchmarking.service';

describe('BenchmarkingController', () => {
  let controller: BenchmarkingController;
  let service: jest.Mocked<BenchmarkingService>;

  const TENANT_ID = 'tenant-001';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BenchmarkingController],
      providers: [
        {
          provide: BenchmarkingService,
          useValue: {
            calculateShopMetrics: jest.fn(),
            getShopBenchmark: jest.fn(),
            getShopRanking: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<BenchmarkingController>(BenchmarkingController);
    service = module.get(BenchmarkingService) as jest.Mocked<BenchmarkingService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMetrics', () => {
    it('should delegate to service with tenantId and period', async () => {
      const metrics = [{ name: 'revenue', value: 50000 }];
      service.calculateShopMetrics.mockResolvedValue(metrics as never);

      const result = await controller.getMetrics(TENANT_ID, { period: '2026-Q1' } as never);

      expect(service.calculateShopMetrics).toHaveBeenCalledWith(TENANT_ID, '2026-Q1');
      expect(result).toEqual(metrics);
    });
  });

  describe('compare', () => {
    it('should delegate to service with tenantId and period', async () => {
      const benchmarks = [{ metric: 'revenue', shop: 50000, industry: 45000 }];
      service.getShopBenchmark.mockResolvedValue(benchmarks as never);

      const result = await controller.compare(TENANT_ID, { period: '2026-Q1' } as never);

      expect(service.getShopBenchmark).toHaveBeenCalledWith(TENANT_ID, '2026-Q1');
      expect(result).toEqual(benchmarks);
    });
  });

  describe('ranking', () => {
    it('should delegate to service with tenantId and period', async () => {
      const ranking = { percentile: 85, totalShops: 200 };
      service.getShopRanking.mockResolvedValue(ranking as never);

      const result = await controller.ranking(TENANT_ID, { period: '2026-Q1' } as never);

      expect(service.getShopRanking).toHaveBeenCalledWith(TENANT_ID, '2026-Q1');
      expect(result).toEqual(ranking);
    });
  });
});
