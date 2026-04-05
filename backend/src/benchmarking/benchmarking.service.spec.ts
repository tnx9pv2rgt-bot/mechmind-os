import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BenchmarkingService } from './benchmarking.service';
import { PrismaService } from '@common/services/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

// ---------------------------------------------------------------------------
// Mock delegates
// ---------------------------------------------------------------------------

interface MockWorkOrderDelegate {
  findMany: jest.Mock;
}

interface MockBenchmarkMetricDelegate {
  findMany: jest.Mock;
  upsert: jest.Mock;
  update: jest.Mock;
}

interface MockIndustryBenchmarkDelegate {
  findMany: jest.Mock;
  upsert: jest.Mock;
}

interface MockPrisma {
  workOrder: MockWorkOrderDelegate;
  benchmarkMetric: MockBenchmarkMetricDelegate;
  industryBenchmark: MockIndustryBenchmarkDelegate;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const PERIOD = '2026-03';

const mockCompletedOrders = [
  {
    id: 'wo-001',
    tenantId: TENANT_ID,
    status: 'COMPLETED',
    services: [
      { estimatedMinutes: 120, service: { price: new Decimal(150) } },
      { estimatedMinutes: 60, service: { price: new Decimal(80) } },
    ],
    parts: [{ quantity: 2, part: { retailPrice: new Decimal(50), costPrice: new Decimal(30) } }],
    timeLogs: [{ durationMinutes: 150 }],
  },
  {
    id: 'wo-002',
    tenantId: TENANT_ID,
    status: 'INVOICED',
    services: [{ estimatedMinutes: 90, service: { price: new Decimal(200) } }],
    parts: [{ quantity: 1, part: { retailPrice: new Decimal(80), costPrice: new Decimal(50) } }],
    timeLogs: [{ durationMinutes: 100 }],
  },
];

const mockBenchmarkMetrics = [
  {
    id: 'bm-001',
    tenantId: TENANT_ID,
    period: PERIOD,
    metricType: 'ARO',
    value: new Decimal(280),
    percentile: 65,
    industryAvg: new Decimal(250),
  },
  {
    id: 'bm-002',
    tenantId: TENANT_ID,
    period: PERIOD,
    metricType: 'CAR_COUNT',
    value: new Decimal(2),
    percentile: 40,
    industryAvg: new Decimal(5),
  },
];

const mockIndustryBenchmarks = [
  {
    id: 'ib-001',
    region: 'IT',
    shopSize: 'MEDIUM',
    period: PERIOD,
    metricType: 'ARO',
    avgValue: new Decimal(250),
    medianValue: new Decimal(240),
    p25: new Decimal(180),
    p75: new Decimal(320),
    sampleSize: 100,
  },
  {
    id: 'ib-002',
    region: 'IT',
    shopSize: 'MEDIUM',
    period: PERIOD,
    metricType: 'CAR_COUNT',
    avgValue: new Decimal(5),
    medianValue: new Decimal(4),
    p25: new Decimal(2),
    p75: new Decimal(8),
    sampleSize: 100,
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BenchmarkingService', () => {
  let service: BenchmarkingService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    const mockPrisma: MockPrisma = {
      workOrder: {
        findMany: jest.fn(),
      },
      benchmarkMetric: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      industryBenchmark: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BenchmarkingService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<BenchmarkingService>(BenchmarkingService);
    prisma = module.get(PrismaService) as unknown as MockPrisma;
  });

  // =========================================================================
  // calculateShopMetrics
  // =========================================================================

  describe('calculateShopMetrics', () => {
    it('dovrebbe calcolare tutte le 5 metriche', async () => {
      prisma.workOrder.findMany.mockResolvedValue(mockCompletedOrders);
      prisma.benchmarkMetric.upsert.mockResolvedValue({});

      const metrics = await service.calculateShopMetrics(TENANT_ID, PERIOD);

      expect(metrics).toHaveLength(5);
      expect(metrics.map(m => m.metricType)).toEqual([
        'ARO',
        'CAR_COUNT',
        'LABOR_RATE',
        'PARTS_MARGIN',
        'TECH_EFFICIENCY',
      ]);
    });

    it('dovrebbe calcolare CAR_COUNT corretto', async () => {
      prisma.workOrder.findMany.mockResolvedValue(mockCompletedOrders);
      prisma.benchmarkMetric.upsert.mockResolvedValue({});

      const metrics = await service.calculateShopMetrics(TENANT_ID, PERIOD);

      const carCount = metrics.find(m => m.metricType === 'CAR_COUNT');
      expect(carCount?.value).toBe(2);
    });

    it('dovrebbe calcolare ARO corretto', async () => {
      prisma.workOrder.findMany.mockResolvedValue(mockCompletedOrders);
      prisma.benchmarkMetric.upsert.mockResolvedValue({});

      const metrics = await service.calculateShopMetrics(TENANT_ID, PERIOD);

      const aro = metrics.find(m => m.metricType === 'ARO');
      // wo-001: services (150+80)*100=23000 + parts 50*100*2=10000 = 33000
      // wo-002: services 200*100=20000 + parts 80*100*1=8000 = 28000
      // total 61000 / 2 orders / 100 = 305.00
      expect(aro?.value).toBe(305);
    });

    it('dovrebbe gestire periodo senza ordini', async () => {
      prisma.workOrder.findMany.mockResolvedValue([]);
      prisma.benchmarkMetric.upsert.mockResolvedValue({});

      const metrics = await service.calculateShopMetrics(TENANT_ID, PERIOD);

      expect(metrics.find(m => m.metricType === 'ARO')?.value).toBe(0);
      expect(metrics.find(m => m.metricType === 'CAR_COUNT')?.value).toBe(0);
    });

    it('dovrebbe salvare metriche in DB con upsert', async () => {
      prisma.workOrder.findMany.mockResolvedValue(mockCompletedOrders);
      prisma.benchmarkMetric.upsert.mockResolvedValue({});

      await service.calculateShopMetrics(TENANT_ID, PERIOD);

      expect(prisma.benchmarkMetric.upsert).toHaveBeenCalledTimes(5);
    });
  });

  // =========================================================================
  // getShopBenchmark
  // =========================================================================

  describe('getShopBenchmark', () => {
    it('dovrebbe restituire confronto con benchmark settore', async () => {
      prisma.benchmarkMetric.findMany.mockResolvedValue(mockBenchmarkMetrics);
      prisma.industryBenchmark.findMany.mockResolvedValue(mockIndustryBenchmarks);

      const benchmarks = await service.getShopBenchmark(TENANT_ID, PERIOD);

      expect(benchmarks).toHaveLength(2);
      expect(benchmarks[0].shopValue).toBe(280);
      expect(benchmarks[0].industryAvg).toBe(250);
      expect(benchmarks[0].percentile).toBe(65);
    });

    it('dovrebbe lanciare NotFoundException senza metriche', async () => {
      prisma.benchmarkMetric.findMany.mockResolvedValue([]);

      await expect(service.getShopBenchmark(TENANT_ID, PERIOD)).rejects.toThrow(NotFoundException);
    });

    it('dovrebbe gestire assenza benchmark settore', async () => {
      prisma.benchmarkMetric.findMany.mockResolvedValue(mockBenchmarkMetrics);
      prisma.industryBenchmark.findMany.mockResolvedValue([]);

      const benchmarks = await service.getShopBenchmark(TENANT_ID, PERIOD);

      expect(benchmarks[0].industryAvg).toBe(0);
      expect(benchmarks[0].industryMedian).toBe(0);
    });
  });

  // =========================================================================
  // calculateIndustryAverages
  // =========================================================================

  describe('calculateIndustryAverages', () => {
    it('dovrebbe calcolare medie e percentili', async () => {
      const allMetrics = [
        { id: 'bm-a', value: new Decimal(100), metricType: 'ARO' },
        { id: 'bm-b', value: new Decimal(200), metricType: 'ARO' },
        { id: 'bm-c', value: new Decimal(300), metricType: 'ARO' },
      ];

      // Returns data only for ARO, empty for the other 4 metric types
      prisma.benchmarkMetric.findMany
        .mockResolvedValueOnce(allMetrics) // ARO
        .mockResolvedValueOnce([]) // CAR_COUNT
        .mockResolvedValueOnce([]) // LABOR_RATE
        .mockResolvedValueOnce([]) // PARTS_MARGIN
        .mockResolvedValueOnce([]); // TECH_EFFICIENCY
      prisma.industryBenchmark.upsert.mockResolvedValue({});
      prisma.benchmarkMetric.update.mockResolvedValue({});

      await service.calculateIndustryAverages('IT', 'MEDIUM', PERIOD);

      expect(prisma.industryBenchmark.upsert).toHaveBeenCalledTimes(1);
      expect(prisma.benchmarkMetric.update).toHaveBeenCalledTimes(3);
    });

    it('dovrebbe saltare metric type senza dati', async () => {
      prisma.benchmarkMetric.findMany.mockResolvedValue([]);

      await service.calculateIndustryAverages('IT', 'MEDIUM', PERIOD);

      expect(prisma.industryBenchmark.upsert).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // getShopRanking
  // =========================================================================

  describe('getShopRanking', () => {
    it('dovrebbe restituire ranking con percentile complessivo', async () => {
      prisma.benchmarkMetric.findMany.mockResolvedValue(mockBenchmarkMetrics);
      prisma.industryBenchmark.findMany.mockResolvedValue(mockIndustryBenchmarks);

      const ranking = await service.getShopRanking(TENANT_ID, PERIOD);

      expect(ranking.period).toBe(PERIOD);
      expect(ranking.overallPercentile).toBe(53); // (65 + 40) / 2 = 52.5 rounded
      expect(ranking.metrics).toHaveLength(2);
    });

    it('dovrebbe lanciare NotFoundException senza metriche', async () => {
      prisma.benchmarkMetric.findMany.mockResolvedValue([]);

      await expect(service.getShopRanking(TENANT_ID, PERIOD)).rejects.toThrow(NotFoundException);
    });
  });
});
