/**
 * MechMind OS - Benchmarking Service
 *
 * Confronto metriche officina con medie di settore:
 * ARO, car count, tariffa manodopera effettiva, margine ricambi,
 * efficienza tecnici.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

export type MetricType = 'ARO' | 'CAR_COUNT' | 'LABOR_RATE' | 'PARTS_MARGIN' | 'TECH_EFFICIENCY';

const ALL_METRICS: MetricType[] = [
  'ARO',
  'CAR_COUNT',
  'LABOR_RATE',
  'PARTS_MARGIN',
  'TECH_EFFICIENCY',
];

export interface ShopMetric {
  metricType: MetricType;
  value: number;
  label: string;
  unit: string;
}

export interface ShopBenchmark {
  metricType: MetricType;
  shopValue: number;
  industryAvg: number;
  industryMedian: number;
  percentile: number;
  label: string;
  unit: string;
}

export interface ShopRanking {
  period: string;
  overallPercentile: number;
  metrics: ShopBenchmark[];
}

const METRIC_LABELS: Record<MetricType, { label: string; unit: string }> = {
  ARO: { label: 'Ricavo Medio per Ordine', unit: '€' },
  CAR_COUNT: { label: 'Veicoli Serviti', unit: '' },
  LABOR_RATE: { label: 'Tariffa Manodopera Effettiva', unit: '€/h' },
  PARTS_MARGIN: { label: 'Margine Ricambi', unit: '%' },
  TECH_EFFICIENCY: { label: 'Efficienza Tecnici', unit: '%' },
};

@Injectable()
export class BenchmarkingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcola le metriche dell'officina per un periodo
   */
  async calculateShopMetrics(tenantId: string, period: string): Promise<ShopMetric[]> {
    const periodStart = new Date(`${period}-01`);
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Ordini completati nel periodo
    const completedOrders = await this.prisma.workOrder.findMany({
      where: {
        tenantId,
        status: { in: ['COMPLETED', 'INVOICED'] },
        updatedAt: { gte: periodStart, lt: periodEnd },
      },
      include: {
        services: { include: { service: true } },
        parts: { include: { part: true } },
        timeLogs: true,
      },
    });

    const carCount = completedOrders.length;

    // ARO: ricavo medio per ordine
    let totalRevenue = 0;
    let totalPartsCost = 0;
    let totalPartsRevenue = 0;
    let totalBilledMinutes = 0;
    let totalActualMinutes = 0;

    for (const wo of completedOrders) {
      // Service.price è in Decimal(10,2) formato euro (es. 150.00)
      const serviceRevenue = wo.services.reduce(
        (sum: number, s: { service: { price: Decimal } }) => sum + Number(s.service.price) * 100,
        0,
      );
      // Part: retailPrice per ricavo, costPrice per costo
      const partsRevenue = wo.parts.reduce(
        (sum: number, p: { part: { retailPrice: Decimal }; quantity: number }) =>
          sum + Number(p.part.retailPrice) * 100 * p.quantity,
        0,
      );
      const partsCost = wo.parts.reduce(
        (sum: number, p: { part: { costPrice: Decimal }; quantity: number }) =>
          sum + Number(p.part.costPrice) * 100 * p.quantity,
        0,
      );

      totalRevenue += serviceRevenue + partsRevenue;
      totalPartsRevenue += partsRevenue;
      totalPartsCost += partsCost;

      // Efficienza: minuti stimati (fatturati) vs minuti effettivi
      const billedMinutes = wo.services.reduce(
        (sum: number, s: { estimatedMinutes: number }) => sum + (s.estimatedMinutes ?? 0),
        0,
      );
      const actualMinutes = wo.timeLogs.reduce(
        (sum: number, t: { durationMinutes: number | null }) => sum + (t.durationMinutes ?? 0),
        0,
      );

      totalBilledMinutes += billedMinutes;
      totalActualMinutes += actualMinutes;
    }

    const aro = carCount > 0 ? totalRevenue / carCount / 100 : 0;
    const laborRate =
      totalActualMinutes > 0
        ? (totalRevenue - totalPartsRevenue) / (totalActualMinutes / 60) / 100
        : 0;
    const partsMargin =
      totalPartsRevenue > 0 ? ((totalPartsRevenue - totalPartsCost) / totalPartsRevenue) * 100 : 0;
    const techEfficiency =
      totalActualMinutes > 0 ? (totalBilledMinutes / totalActualMinutes) * 100 : 0;

    const metrics: ShopMetric[] = [
      { metricType: 'ARO', value: Math.round(aro * 100) / 100, ...METRIC_LABELS.ARO },
      { metricType: 'CAR_COUNT', value: carCount, ...METRIC_LABELS.CAR_COUNT },
      {
        metricType: 'LABOR_RATE',
        value: Math.round(laborRate * 100) / 100,
        ...METRIC_LABELS.LABOR_RATE,
      },
      {
        metricType: 'PARTS_MARGIN',
        value: Math.round(partsMargin * 100) / 100,
        ...METRIC_LABELS.PARTS_MARGIN,
      },
      {
        metricType: 'TECH_EFFICIENCY',
        value: Math.round(techEfficiency * 100) / 100,
        ...METRIC_LABELS.TECH_EFFICIENCY,
      },
    ];

    // Salva metriche in DB
    for (const m of metrics) {
      await this.prisma.benchmarkMetric.upsert({
        where: {
          tenantId_period_metricType: {
            tenantId,
            period,
            metricType: m.metricType,
          },
        },
        create: {
          tenantId,
          period,
          metricType: m.metricType,
          value: new Decimal(m.value),
        },
        update: {
          value: new Decimal(m.value),
        },
      });
    }

    return metrics;
  }

  /**
   * Confronta metriche officina con medie di settore
   */
  async getShopBenchmark(tenantId: string, period: string): Promise<ShopBenchmark[]> {
    // Recupera metriche officina
    const shopMetrics = await this.prisma.benchmarkMetric.findMany({
      where: { tenantId, period },
    });

    if (shopMetrics.length === 0) {
      throw new NotFoundException(
        `Metriche non trovate per il periodo ${period}. Eseguire prima il calcolo.`,
      );
    }

    // Recupera benchmark di settore (IT, MEDIUM come default)
    const industryBenchmarks = await this.prisma.industryBenchmark.findMany({
      where: { region: 'IT', shopSize: 'MEDIUM', period },
    });

    const industryMap = new Map(industryBenchmarks.map(b => [b.metricType, b]));

    return shopMetrics.map(sm => {
      const industry = industryMap.get(sm.metricType);
      const shopValue = Number(sm.value);

      return {
        metricType: sm.metricType as MetricType,
        shopValue,
        industryAvg: industry ? Number(industry.avgValue) : 0,
        industryMedian: industry ? Number(industry.medianValue) : 0,
        percentile: sm.percentile ?? 0,
        ...(METRIC_LABELS[sm.metricType as MetricType] ?? { label: sm.metricType, unit: '' }),
      };
    });
  }

  /**
   * Calcola medie di settore aggregando da tutti i tenant
   */
  async calculateIndustryAverages(region: string, shopSize: string, period: string): Promise<void> {
    for (const metricType of ALL_METRICS) {
      const allMetrics = await this.prisma.benchmarkMetric.findMany({
        where: { period, metricType },
        orderBy: { value: 'asc' },
      });

      if (allMetrics.length === 0) {
        continue;
      }

      const values = allMetrics.map(m => Number(m.value));
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const sorted = [...values].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const p25 = sorted[Math.floor(sorted.length * 0.25)];
      const p75 = sorted[Math.floor(sorted.length * 0.75)];

      await this.prisma.industryBenchmark.upsert({
        where: {
          region_shopSize_period_metricType: {
            region,
            shopSize,
            period,
            metricType,
          },
        },
        create: {
          region,
          shopSize,
          period,
          metricType,
          avgValue: new Decimal(avg),
          medianValue: new Decimal(median),
          p25: new Decimal(p25),
          p75: new Decimal(p75),
          sampleSize: values.length,
          calculatedAt: new Date(),
        },
        update: {
          avgValue: new Decimal(avg),
          medianValue: new Decimal(median),
          p25: new Decimal(p25),
          p75: new Decimal(p75),
          sampleSize: values.length,
          calculatedAt: new Date(),
        },
      });

      // Aggiorna percentili per ogni tenant
      for (let i = 0; i < allMetrics.length; i++) {
        const percentile = Math.round((i / (allMetrics.length - 1 || 1)) * 100);
        await this.prisma.benchmarkMetric.update({
          where: { id: allMetrics[i].id },
          data: {
            percentile,
            industryAvg: new Decimal(avg),
          },
        });
      }
    }
  }

  /**
   * Ranking dell'officina rispetto al settore
   */
  async getShopRanking(tenantId: string, period: string): Promise<ShopRanking> {
    const shopMetrics = await this.prisma.benchmarkMetric.findMany({
      where: { tenantId, period },
    });

    if (shopMetrics.length === 0) {
      throw new NotFoundException(
        `Metriche non trovate per il periodo ${period}. Eseguire prima il calcolo.`,
      );
    }

    const industryBenchmarks = await this.prisma.industryBenchmark.findMany({
      where: { region: 'IT', shopSize: 'MEDIUM', period },
    });

    const industryMap = new Map(industryBenchmarks.map(b => [b.metricType, b]));

    const metrics: ShopBenchmark[] = shopMetrics.map(sm => {
      const industry = industryMap.get(sm.metricType);

      return {
        metricType: sm.metricType as MetricType,
        shopValue: Number(sm.value),
        industryAvg: industry ? Number(industry.avgValue) : 0,
        industryMedian: industry ? Number(industry.medianValue) : 0,
        percentile: sm.percentile ?? 0,
        ...(METRIC_LABELS[sm.metricType as MetricType] ?? { label: sm.metricType, unit: '' }),
      };
    });

    const percentiles = metrics.map(m => m.percentile);
    const overallPercentile =
      percentiles.length > 0
        ? Math.round(percentiles.reduce((a, b) => a + b, 0) / percentiles.length)
        : 0;

    return {
      period,
      overallPercentile,
      metrics,
    };
  }
}
