import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';

export interface DashboardKpi {
  aro: number;
  carCount: number;
  closeRate: number;
  revenuePerBay: number;
  revenuePerTechnician: number;
  techEfficiency: number;
  averageCycleTime: number;
  customerRetentionRate: number;
  topServices: Array<{ name: string; revenue: number; count: number }>;
  topCustomers: Array<{ name: string; revenue: number; visits: number }>;
  revenueByMonth: Array<{ month: string; revenue: number }>;
}

@Injectable()
export class KpiService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardKpi(tenantId: string, dateFrom: Date, dateTo: Date): Promise<DashboardKpi> {
    const [
      invoiceStats,
      carCount,
      estimateStats,
      bayCount,
      techCount,
      laborStats,
      cycleTimeStats,
      retentionStats,
      topServices,
      topCustomers,
      revenueByMonth,
    ] = await Promise.all([
      // ARO: total paid invoices revenue + count
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          status: 'PAID',
          paidAt: { gte: dateFrom, lte: dateTo },
        },
        _sum: { total: true },
        _count: true,
      }),

      // Car count: unique vehicles in completed work orders
      this.prisma.workOrder.findMany({
        where: {
          tenantId,
          status: { in: ['COMPLETED', 'INVOICED'] },
          createdAt: { gte: dateFrom, lte: dateTo },
        },
        select: { vehicleId: true },
        distinct: ['vehicleId'],
      }),

      // Close rate: accepted / sent estimates
      Promise.all([
        this.prisma.estimate.count({
          where: {
            tenantId,
            status: 'ACCEPTED',
            acceptedAt: { gte: dateFrom, lte: dateTo },
          },
        }),
        this.prisma.estimate.count({
          where: {
            tenantId,
            status: { in: ['SENT', 'ACCEPTED', 'REJECTED'] },
            sentAt: { gte: dateFrom, lte: dateTo },
          },
        }),
      ]),

      // Bay count (child model via ShopFloor)
      this.prisma.serviceBay.count({
        where: {
          shopFloor: { tenantId },
          status: { not: 'MAINTENANCE' },
        },
      }),

      // Technician count
      this.prisma.technician.count({
        where: { tenantId, isActive: true },
      }),

      // Labor stats: billed vs worked hours
      Promise.all([
        this.prisma.workOrder.aggregate({
          where: {
            tenantId,
            status: { in: ['COMPLETED', 'INVOICED'] },
            createdAt: { gte: dateFrom, lte: dateTo },
          },
          _sum: { laborHours: true },
        }),
        this.prisma.technicianTimeLog.aggregate({
          where: {
            tenantId,
            stoppedAt: { not: null },
            startedAt: { gte: dateFrom, lte: dateTo },
          },
          _sum: { durationMinutes: true },
        }),
      ]),

      // Cycle time: avg start to completion
      this.prisma.workOrder.findMany({
        where: {
          tenantId,
          actualStartTime: { not: null },
          actualCompletionTime: { not: null },
          createdAt: { gte: dateFrom, lte: dateTo },
        },
        select: { actualStartTime: true, actualCompletionTime: true },
      }),

      // Retention: customers with 2+ work orders in period
      Promise.all([
        this.prisma.customer.count({ where: { tenantId } }),
        this.prisma.$queryRaw`
          SELECT COUNT(*) as cnt FROM (
            SELECT customer_id FROM work_orders
            WHERE tenant_id = ${tenantId}::uuid
              AND created_at >= ${dateFrom} AND created_at <= ${dateTo}
            GROUP BY customer_id HAVING COUNT(*) >= 2
          ) sub
        `,
      ]),

      // Top services
      this.prisma.$queryRaw`
        SELECT s.name, SUM(COALESCE(wo.total_cost, 0)) as revenue, COUNT(*) as count
        FROM work_order_services wos
        JOIN services s ON wos.service_id = s.id
        JOIN work_orders wo ON wos.work_order_id = wo.id
        WHERE wo.tenant_id = ${tenantId}::uuid
          AND wo.created_at >= ${dateFrom} AND wo.created_at <= ${dateTo}
        GROUP BY s.name
        ORDER BY revenue DESC
        LIMIT 10
      `,

      // Top customers (note: name is encrypted, shown as-is)
      this.prisma.$queryRaw`
        SELECT c.encrypted_first_name as name, SUM(i.total) as revenue, COUNT(DISTINCT wo.id) as visits
        FROM customers c
        JOIN work_orders wo ON c.id = wo.customer_id
        LEFT JOIN invoices i ON wo.invoice_id = i.id AND i.status = 'PAID'
        WHERE c.tenant_id = ${tenantId}::uuid
          AND wo.created_at >= ${dateFrom} AND wo.created_at <= ${dateTo}
        GROUP BY c.id, c.encrypted_first_name
        ORDER BY revenue DESC NULLS LAST
        LIMIT 10
      `,

      // Revenue by month
      this.prisma.$queryRaw`
        SELECT TO_CHAR(paid_at, 'YYYY-MM') as month, SUM(total) as revenue
        FROM invoices
        WHERE tenant_id = ${tenantId}::uuid
          AND status = 'PAID'
          AND paid_at >= ${dateFrom} AND paid_at <= ${dateTo}
        GROUP BY TO_CHAR(paid_at, 'YYYY-MM')
        ORDER BY month ASC
      `,
    ]);

    // Calculate metrics
    const totalRevenue = Number(invoiceStats._sum.total ?? 0);
    const invoiceCount = invoiceStats._count;
    const aro = invoiceCount > 0 ? parseFloat((totalRevenue / invoiceCount).toFixed(2)) : 0;

    const [accepted, sent] = estimateStats;
    const closeRate = sent > 0 ? parseFloat(((accepted / sent) * 100).toFixed(1)) : 0;

    const revenuePerBay = bayCount > 0 ? parseFloat((totalRevenue / bayCount).toFixed(2)) : 0;

    const revenuePerTechnician =
      techCount > 0 ? parseFloat((totalRevenue / techCount).toFixed(2)) : 0;

    const [billedHoursAgg, workedMinutesAgg] = laborStats;
    const billedHours = Number(billedHoursAgg._sum.laborHours ?? 0);
    const workedHours = Number(workedMinutesAgg._sum.durationMinutes ?? 0) / 60;
    const techEfficiency =
      workedHours > 0 ? parseFloat(((billedHours / workedHours) * 100).toFixed(1)) : 0;

    // Cycle time
    let averageCycleTime = 0;
    if (cycleTimeStats.length > 0) {
      const totalHours = cycleTimeStats.reduce((sum, wo) => {
        const start = wo.actualStartTime!.getTime();
        const end = wo.actualCompletionTime!.getTime();
        return sum + (end - start) / 3600000;
      }, 0);
      averageCycleTime = parseFloat((totalHours / cycleTimeStats.length).toFixed(1));
    }

    // Retention
    const [totalCustomers, retentionResult] = retentionStats;
    const returningCustomers = Number((retentionResult as Array<{ cnt: bigint }>)[0]?.cnt ?? 0);
    const customerRetentionRate =
      totalCustomers > 0 ? parseFloat(((returningCustomers / totalCustomers) * 100).toFixed(1)) : 0;

    return {
      aro,
      carCount: carCount.length,
      closeRate,
      revenuePerBay,
      revenuePerTechnician,
      techEfficiency,
      averageCycleTime,
      customerRetentionRate,
      topServices: (
        topServices as Array<{
          name: string;
          revenue: unknown;
          count: unknown;
        }>
      ).map(s => ({
        name: s.name,
        revenue: Number(s.revenue ?? 0),
        count: Number(s.count ?? 0),
      })),
      topCustomers: (
        topCustomers as Array<{
          name: string;
          revenue: unknown;
          visits: unknown;
        }>
      ).map(c => ({
        name: c.name ?? 'Unknown',
        revenue: Number(c.revenue ?? 0),
        visits: Number(c.visits ?? 0),
      })),
      revenueByMonth: (revenueByMonth as Array<{ month: string; revenue: unknown }>).map(r => ({
        month: r.month,
        revenue: Number(r.revenue ?? 0),
      })),
    };
  }
}
