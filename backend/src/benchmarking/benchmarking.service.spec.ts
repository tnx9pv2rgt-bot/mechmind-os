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
      expect(metrics.find(m => m.metricType === 'LABOR_RATE')?.value).toBe(0);
      expect(metrics.find(m => m.metricType === 'PARTS_MARGIN')?.value).toBe(0);
      expect(metrics.find(m => m.metricType === 'TECH_EFFICIENCY')?.value).toBe(0);
    });

    it('dovrebbe calcolare LABOR_RATE quando totalActualMinutes > 0', async () => {
      prisma.workOrder.findMany.mockResolvedValue(mockCompletedOrders);
      prisma.benchmarkMetric.upsert.mockResolvedValue({});

      const metrics = await service.calculateShopMetrics(TENANT_ID, PERIOD);

      const laborRate = metrics.find(m => m.metricType === 'LABOR_RATE');
      expect(laborRate?.value).toBeGreaterThan(0);
      expect(laborRate?.unit).toBe('€/h');
    });

    it('dovrebbe calcolare PARTS_MARGIN quando partsRevenue > 0', async () => {
      prisma.workOrder.findMany.mockResolvedValue(mockCompletedOrders);
      prisma.benchmarkMetric.upsert.mockResolvedValue({});

      const metrics = await service.calculateShopMetrics(TENANT_ID, PERIOD);

      const partsMargin = metrics.find(m => m.metricType === 'PARTS_MARGIN');
      expect(partsMargin?.value).toBeGreaterThan(0);
      expect(partsMargin?.value).toBeLessThanOrEqual(100);
    });

    it('dovrebbe calcolare TECH_EFFICIENCY quando billed > 0', async () => {
      prisma.workOrder.findMany.mockResolvedValue(mockCompletedOrders);
      prisma.benchmarkMetric.upsert.mockResolvedValue({});

      const metrics = await service.calculateShopMetrics(TENANT_ID, PERIOD);

      const techEfficiency = metrics.find(m => m.metricType === 'TECH_EFFICIENCY');
      expect(techEfficiency?.value).toBeGreaterThan(0);
    });

    it('dovrebbe filtrare per tenantId', async () => {
      prisma.workOrder.findMany.mockResolvedValue(mockCompletedOrders);
      prisma.benchmarkMetric.upsert.mockResolvedValue({});

      await service.calculateShopMetrics(TENANT_ID, PERIOD);

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID }),
        }),
      );
    });

    it('dovrebbe gestire ordini con nessun timeLog (totalActualMinutes === 0)', async () => {
      const ordersNoTimeLogs = [
        {
          id: 'wo-001',
          tenantId: TENANT_ID,
          status: 'COMPLETED',
          services: [{ estimatedMinutes: 120, service: { price: new Decimal(150) } }],
          parts: [],
          timeLogs: [],
        },
      ];
      prisma.workOrder.findMany.mockResolvedValue(ordersNoTimeLogs);
      prisma.benchmarkMetric.upsert.mockResolvedValue({});

      const metrics = await service.calculateShopMetrics(TENANT_ID, PERIOD);

      expect(metrics.find(m => m.metricType === 'LABOR_RATE')?.value).toBe(0);
      expect(metrics.find(m => m.metricType === 'TECH_EFFICIENCY')?.value).toBe(0);
    });

    it('dovrebbe gestire ordini senza ricambi (totalPartsRevenue === 0)', async () => {
      const ordersNoParts = [
        {
          id: 'wo-001',
          tenantId: TENANT_ID,
          status: 'COMPLETED',
          services: [{ estimatedMinutes: 120, service: { price: new Decimal(150) } }],
          parts: [],
          timeLogs: [{ durationMinutes: 120 }],
        },
      ];
      prisma.workOrder.findMany.mockResolvedValue(ordersNoParts);
      prisma.benchmarkMetric.upsert.mockResolvedValue({});

      const metrics = await service.calculateShopMetrics(TENANT_ID, PERIOD);

      expect(metrics.find(m => m.metricType === 'PARTS_MARGIN')?.value).toBe(0);
    });

    it('dovrebbe gestire ordini senza servizi', async () => {
      const ordersNoServices = [
        {
          id: 'wo-001',
          tenantId: TENANT_ID,
          status: 'COMPLETED',
          services: [],
          parts: [
            { quantity: 1, part: { retailPrice: new Decimal(50), costPrice: new Decimal(30) } },
          ],
          timeLogs: [{ durationMinutes: 60 }],
        },
      ];
      prisma.workOrder.findMany.mockResolvedValue(ordersNoServices);
      prisma.benchmarkMetric.upsert.mockResolvedValue({});

      const metrics = await service.calculateShopMetrics(TENANT_ID, PERIOD);

      expect(metrics.find(m => m.metricType === 'ARO')?.value).toBeGreaterThan(0);
      expect(prisma.benchmarkMetric.upsert).toHaveBeenCalledTimes(5);
    });

    it('dovrebbe arrotondare i valori metriche correttamente', async () => {
      const ordersForRounding = [
        {
          id: 'wo-001',
          tenantId: TENANT_ID,
          status: 'COMPLETED',
          services: [{ estimatedMinutes: 100, service: { price: new Decimal(123.456) } }],
          parts: [],
          timeLogs: [{ durationMinutes: 100 }],
        },
      ];
      prisma.workOrder.findMany.mockResolvedValue(ordersForRounding);
      prisma.benchmarkMetric.upsert.mockResolvedValue({});

      const metrics = await service.calculateShopMetrics(TENANT_ID, PERIOD);

      const aro = metrics.find(m => m.metricType === 'ARO');
      expect(aro?.value).toEqual(expect.any(Number));
      expect(Number.isInteger(aro!.value * 100)).toBe(true); // check decimal places
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

    it('dovrebbe mappare METRIC_LABELS per ogni metrica', async () => {
      prisma.benchmarkMetric.findMany.mockResolvedValue(mockBenchmarkMetrics);
      prisma.industryBenchmark.findMany.mockResolvedValue(mockIndustryBenchmarks);

      const benchmarks = await service.getShopBenchmark(TENANT_ID, PERIOD);

      expect(benchmarks[0].label).toBe('Ricavo Medio per Ordine');
      expect(benchmarks[0].unit).toBe('€');
      expect(benchmarks[1].label).toBe('Veicoli Serviti');
      expect(benchmarks[1].unit).toBe('');
    });

    it('dovrebbe filtrare per tenantId e period', async () => {
      prisma.benchmarkMetric.findMany.mockResolvedValue(mockBenchmarkMetrics);
      prisma.industryBenchmark.findMany.mockResolvedValue(mockIndustryBenchmarks);

      await service.getShopBenchmark(TENANT_ID, PERIOD);

      expect(prisma.benchmarkMetric.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, period: PERIOD },
      });
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

    it('dovrebbe calcolare percentile con numero dispari di metriche', async () => {
      const allMetrics = [
        { id: 'bm-1', value: new Decimal(50) },
        { id: 'bm-2', value: new Decimal(100) },
        { id: 'bm-3', value: new Decimal(150) },
        { id: 'bm-4', value: new Decimal(200) },
        { id: 'bm-5', value: new Decimal(250) },
      ];
      prisma.benchmarkMetric.findMany
        .mockResolvedValueOnce(allMetrics)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prisma.industryBenchmark.upsert.mockResolvedValue({});
      prisma.benchmarkMetric.update.mockResolvedValue({});

      await service.calculateIndustryAverages('IT', 'MEDIUM', PERIOD);

      expect(prisma.benchmarkMetric.update).toHaveBeenCalledTimes(5);
      expect(prisma.benchmarkMetric.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            percentile: expect.any(Number),
          }),
        }),
      );
    });

    it('dovrebbe calcolare p25 e p75 percentili con numero pari di metriche', async () => {
      const allMetrics = [
        { id: 'bm-a', value: new Decimal(100) },
        { id: 'bm-b', value: new Decimal(200) },
        { id: 'bm-c', value: new Decimal(300) },
        { id: 'bm-d', value: new Decimal(400) },
      ];
      prisma.benchmarkMetric.findMany
        .mockResolvedValueOnce(allMetrics)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prisma.industryBenchmark.upsert.mockResolvedValue({});
      prisma.benchmarkMetric.update.mockResolvedValue({});

      await service.calculateIndustryAverages('IT', 'MEDIUM', PERIOD);

      // Verify upsert was called (median and percentiles computed)
      expect(prisma.industryBenchmark.upsert).toHaveBeenCalledTimes(1);
      expect(prisma.benchmarkMetric.update).toHaveBeenCalledTimes(4);
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

    it('dovrebbe gestire overallPercentile con percentili vuoti', async () => {
      const emptyMetrics: Array<{ metricType: string; value: number; percentile: number }> = [];
      prisma.benchmarkMetric.findMany.mockResolvedValueOnce(emptyMetrics);

      await expect(service.getShopRanking(TENANT_ID, PERIOD)).rejects.toThrow(NotFoundException);
    });

    it('dovrebbe mappare metriche con industryBenchmarks per ranking', async () => {
      prisma.benchmarkMetric.findMany.mockResolvedValue(mockBenchmarkMetrics);
      prisma.industryBenchmark.findMany.mockResolvedValue(mockIndustryBenchmarks);

      const ranking = await service.getShopRanking(TENANT_ID, PERIOD);

      expect(ranking.metrics[0]).toEqual(
        expect.objectContaining({
          metricType: 'ARO',
          shopValue: 280,
          industryAvg: 250,
          percentile: 65,
        }),
      );
    });

    it('dovrebbe filtrare per tenantId e period', async () => {
      prisma.benchmarkMetric.findMany.mockResolvedValue(mockBenchmarkMetrics);
      prisma.industryBenchmark.findMany.mockResolvedValue(mockIndustryBenchmarks);

      await service.getShopRanking(TENANT_ID, PERIOD);

      expect(prisma.benchmarkMetric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, period: PERIOD },
        }),
      );
    });

    it('dovrebbe cercare industryBenchmark con IT/MEDIUM default', async () => {
      prisma.benchmarkMetric.findMany.mockResolvedValue(mockBenchmarkMetrics);
      prisma.industryBenchmark.findMany.mockResolvedValue(mockIndustryBenchmarks);

      await service.getShopRanking(TENANT_ID, PERIOD);

      expect(prisma.industryBenchmark.findMany).toHaveBeenCalledWith({
        where: { region: 'IT', shopSize: 'MEDIUM', period: PERIOD },
      });
    });
  });
});
