/**
 * MechMind OS - Business Intelligence Reporting Service
 *
 * Provides analytics and reporting using PostgreSQL Materialized Views:
 * - Dashboard KPIs
 * - Revenue analytics
 * - Customer retention metrics
 * - Mechanic performance
 * - Inventory status
 * - Data export (CSV/Excel)
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/services/prisma.service';
import { createObjectCsvStringifier } from 'csv-writer';

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Execute a raw query on a materialized view, returning empty array if the view doesn't exist.
   */
  private async safeViewQuery<T = Record<string, unknown>[]>(
    queryFn: () => Promise<T>,
  ): Promise<T> {
    try {
      return await queryFn();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('does not exist') || msg.includes('relation')) {
        return [] as unknown as T;
      }
      throw error;
    }
  }

  // ============== REAL-TIME DASHBOARD KPIs ==============

  async getDashboardKpis(tenantId: string): Promise<{
    clientiTotali: number;
    veicoliTotali: number;
    fatturatoMese: number;
    prenotazioniOggi: number;
    workOrderAperti: number;
    efficiency: number;
    efficiencyChange: number;
    conversion: number;
    conversionChange: number;
    unpaidAmount: number;
    overdueAmount: number;
    grossMargin: number;
    cashFlow7d: number;
    revenueTarget: number;
    // 2026 Compliance KPIs
    scorteInAllarme: number;
    preventiviInScadenza: number;
    rightToRepairPct: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Previous month boundaries for month-over-month comparison
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // 7 days ago for cash flow
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 30 days ago for overdue threshold
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 7 days from now for expiring estimates
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      clientiTotali,
      veicoliTotali,
      fatturatoMese,
      prenotazioniOggi,
      workOrderAperti,
      // Efficiency: completed vs total work orders this month
      woCompletedThisMonth,
      woTotalThisMonth,
      woCompletedPrevMonth,
      woTotalPrevMonth,
      // Conversion: estimates converted to work orders this month
      estimatesThisMonth,
      estimatesConvertedThisMonth,
      estimatesPrevMonth,
      estimatesConvertedPrevMonth,
      // Financial: unpaid invoices
      unpaidInvoices,
      // Financial: overdue invoices (issued > 30 days ago, still unpaid)
      overdueInvoices,
      // Financial: labor revenue this month (from work order line items)
      laborRevenue,
      // Financial: cash flow last 7 days (payments received - refunds)
      paymentsLast7d,
      // 2026 compliance KPIs
      preventiviInScadenza,
      totalPartsCount,
      trackedPartsCount,
      lowStockRaw,
    ] = await Promise.all([
      // KPI 1: Clienti totali del tenant
      this.prisma.customer.count({
        where: { tenantId },
      }),

      // KPI 2: Veicoli totali (via customer.tenantId, Vehicle non ha tenantId)
      this.prisma.vehicle.count({
        where: { customer: { tenantId } },
      }),

      // KPI 3: Fatturato mese corrente (fatture pagate)
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          status: 'PAID',
          paidAt: { gte: startOfMonth },
        },
        _sum: { total: true },
      }),

      // KPI 4: Prenotazioni di oggi
      this.prisma.booking.count({
        where: {
          tenantId,
          scheduledDate: { gte: startOfDay, lte: endOfDay },
        },
      }),

      // KPI 5: Work order aperti
      this.prisma.workOrder.count({
        where: {
          tenantId,
          status: { in: ['OPEN', 'PENDING', 'IN_PROGRESS', 'CHECKED_IN', 'WAITING_PARTS'] },
        },
      }),

      // KPI 6: Work orders completed this month
      this.prisma.workOrder.count({
        where: {
          tenantId,
          status: 'COMPLETED',
          updatedAt: { gte: startOfMonth },
        },
      }),

      // KPI 7: Total work orders this month
      this.prisma.workOrder.count({
        where: {
          tenantId,
          createdAt: { gte: startOfMonth },
        },
      }),

      // KPI 8: Work orders completed previous month
      this.prisma.workOrder.count({
        where: {
          tenantId,
          status: 'COMPLETED',
          updatedAt: { gte: startOfPrevMonth, lte: endOfPrevMonth },
        },
      }),

      // KPI 9: Total work orders previous month
      this.prisma.workOrder.count({
        where: {
          tenantId,
          createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth },
        },
      }),

      // KPI 10: Estimates created this month
      this.prisma.estimate.count({
        where: {
          tenantId,
          createdAt: { gte: startOfMonth },
        },
      }),

      // KPI 11: Estimates converted this month (status CONVERTED or with linked work order)
      this.prisma.estimate.count({
        where: {
          tenantId,
          createdAt: { gte: startOfMonth },
          status: 'CONVERTED',
        },
      }),

      // KPI 12: Estimates created previous month
      this.prisma.estimate.count({
        where: {
          tenantId,
          createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth },
        },
      }),

      // KPI 13: Estimates converted previous month
      this.prisma.estimate.count({
        where: {
          tenantId,
          createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth },
          status: 'CONVERTED',
        },
      }),

      // KPI 14: Unpaid invoices total
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          status: { in: ['SENT', 'OVERDUE'] },
        },
        _sum: { total: true },
      }),

      // KPI 15: Overdue invoices (sent > 30 days ago, still unpaid)
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          status: { in: ['SENT', 'OVERDUE'] },
          sentAt: { lte: thirtyDaysAgo },
        },
        _sum: { total: true },
      }),

      // KPI 16: Revenue breakdown this month (paid invoices subtotal vs total for margin)
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          status: 'PAID',
          paidAt: { gte: startOfMonth },
        },
        _sum: { subtotal: true, total: true },
      }),

      // KPI 17: Payments received last 7 days
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          status: 'PAID',
          paidAt: { gte: sevenDaysAgo },
        },
        _sum: { total: true },
      }),

      // KPI 18: Preventivi in scadenza entro 7 giorni (Right to Repair 2024/1799 + D.Lgs. 206/2005)
      this.prisma.estimate.count({
        where: {
          tenantId,
          status: { in: ['SENT', 'PARTIALLY_APPROVED'] },
          validUntil: { gte: now, lte: sevenDaysFromNow },
        },
      }),

      // KPI 19 & 20: Right to Repair traceability — parti con barcode / totale parti attive
      this.prisma.part.count({ where: { tenantId, isActive: true } }),
      this.prisma.part.count({ where: { tenantId, isActive: true, barcode: { not: null } } }),

      // KPI 21: Scorte in allarme via raw correlated query (Prisma ORM non supporta cross-model field comparison)
      this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint AS count
        FROM inventory_items ii
        JOIN parts p ON ii.part_id = p.id
        WHERE p.tenant_id = ${tenantId}::uuid
          AND p.is_active = true
          AND ii.quantity <= p.min_stock_level
      `,
    ]);

    // Calculate efficiency (completed / total work orders)
    const efficiencyThisMonth =
      woTotalThisMonth > 0 ? Math.round((woCompletedThisMonth / woTotalThisMonth) * 100) : 0;
    const efficiencyPrevMonth =
      woTotalPrevMonth > 0 ? Math.round((woCompletedPrevMonth / woTotalPrevMonth) * 100) : 0;
    const efficiencyChange = efficiencyThisMonth - efficiencyPrevMonth;

    // Calculate conversion (converted estimates / total estimates)
    const conversionThisMonth =
      estimatesThisMonth > 0
        ? Math.round((estimatesConvertedThisMonth / estimatesThisMonth) * 100)
        : 0;
    const conversionPrevMonth =
      estimatesPrevMonth > 0
        ? Math.round((estimatesConvertedPrevMonth / estimatesPrevMonth) * 100)
        : 0;
    const conversionChange = conversionThisMonth - conversionPrevMonth;

    // Gross margin: approximate as (subtotal - tax) / total; subtotal represents net revenue
    const totalRevenue = Number(laborRevenue._sum.total ?? 0);
    const subtotalRevenue = Number(laborRevenue._sum.subtotal ?? 0);
    // Gross margin estimate: subtotal (pre-tax) as % of total (post-tax)
    const grossMargin = totalRevenue > 0 ? Math.round((subtotalRevenue / totalRevenue) * 100) : 0;

    const currentMonthRevenue = Number(fatturatoMese._sum.total ?? 0);

    const rightToRepairPct =
      totalPartsCount > 0 ? Math.round((trackedPartsCount / totalPartsCount) * 100) : 100;

    const scorteInAllarme = Number((lowStockRaw as [{ count: bigint }])[0]?.count ?? 0);

    return {
      clientiTotali,
      veicoliTotali,
      fatturatoMese: currentMonthRevenue,
      prenotazioniOggi,
      workOrderAperti,
      efficiency: efficiencyThisMonth,
      efficiencyChange,
      conversion: conversionThisMonth,
      conversionChange,
      unpaidAmount: Number(unpaidInvoices._sum.total ?? 0),
      overdueAmount: Number(overdueInvoices._sum.total ?? 0),
      grossMargin,
      cashFlow7d: Number(paymentsLast7d._sum.total ?? 0),
      revenueTarget: Math.round(currentMonthRevenue * 1.15),
      scorteInAllarme,
      preventiviInScadenza,
      rightToRepairPct,
    };
  }

  // ============== DASHBOARD SUMMARY (Materialized View) ==============

  async getDashboardSummary(tenantId: string) {
    const result = await this.safeViewQuery(
      () =>
        this.prisma.$queryRaw`
        SELECT * FROM mv_dashboard_summary
        WHERE tenant_id = ${tenantId}
        LIMIT 1
      `,
    );

    return (result as Record<string, unknown>[])[0] || null;
  }

  async getBookingMetrics(tenantId: string, fromDate: Date, toDate: Date) {
    return this.safeViewQuery(
      () =>
        this.prisma.$queryRaw`
        SELECT * FROM mv_daily_booking_metrics
        WHERE tenant_id = ${tenantId}
          AND date >= ${fromDate}
          AND date <= ${toDate}
        ORDER BY date DESC
      `,
    );
  }

  async getRevenueAnalytics(tenantId: string, year: number, month?: number) {
    const monthFilter = month ? Prisma.sql`AND EXTRACT(MONTH FROM date) = ${month}` : Prisma.empty;

    return this.safeViewQuery(
      () =>
        this.prisma.$queryRaw`
        SELECT * FROM mv_revenue_analytics
        WHERE tenant_id = ${tenantId}
          AND EXTRACT(YEAR FROM date) = ${year}
          ${monthFilter}
        ORDER BY date DESC
      `,
    );
  }

  // ============== CUSTOMER ANALYTICS ==============

  async getCustomerRetention(tenantId: string) {
    return this.safeViewQuery(
      () =>
        this.prisma.$queryRaw`
        SELECT * FROM mv_customer_retention
        WHERE tenant_id = ${tenantId}
        ORDER BY month DESC
        LIMIT 12
      `,
    );
  }

  async getTopCustomers(tenantId: string, limit: number = 10) {
    return this.prisma.$queryRaw`
      SELECT 
        c.id,
        c.encrypted_first_name as first_name,
        c.encrypted_last_name as last_name,
        COUNT(b.id) as total_bookings,
        SUM(bs.price) as total_spent,
        MAX(b.scheduled_date) as last_visit
      FROM customers c
      JOIN bookings b ON c.id = b.customer_id
      JOIN booking_services bs ON b.id = bs.booking_id
      WHERE c.tenant_id = ${tenantId}
        AND b.status = 'COMPLETED'
      GROUP BY c.id, c.encrypted_first_name, c.encrypted_last_name
      ORDER BY total_spent DESC
      LIMIT ${limit}
    `;
  }

  // ============== SERVICE ANALYTICS ==============

  async getServicePopularity(tenantId: string, year: number) {
    return this.safeViewQuery(
      () =>
        this.prisma.$queryRaw`
        SELECT * FROM mv_service_popularity
        WHERE tenant_id = ${tenantId}
          AND EXTRACT(YEAR FROM month) = ${year}
        ORDER BY times_booked DESC
      `,
    );
  }

  async getMechanicPerformance(tenantId: string, year: number, month?: number) {
    const monthFilter = month ? Prisma.sql`AND EXTRACT(MONTH FROM month) = ${month}` : Prisma.empty;

    return this.safeViewQuery(
      () =>
        this.prisma.$queryRaw`
        SELECT * FROM mv_mechanic_performance
        WHERE tenant_id = ${tenantId}
          AND EXTRACT(YEAR FROM month) = ${year}
          ${monthFilter}
        ORDER BY total_revenue_generated DESC
      `,
    );
  }

  // ============== INVENTORY REPORTS ==============

  async getInventoryStatus(tenantId: string, status?: string) {
    const statusFilter = status ? Prisma.sql`AND stock_status = ${status}` : Prisma.empty;

    return this.safeViewQuery(
      () =>
        this.prisma.$queryRaw`
        SELECT * FROM mv_inventory_status
        WHERE tenant_id = ${tenantId}
          ${statusFilter}
        ORDER BY inventory_value DESC
      `,
    );
  }

  async getInventoryValuation(tenantId: string) {
    return this.safeViewQuery(
      () =>
        this.prisma.$queryRaw`
        SELECT
          category,
          COUNT(*) as part_count,
          SUM(inventory_value) as total_value,
          AVG(retail_price) as avg_retail_price
        FROM mv_inventory_status
        WHERE tenant_id = ${tenantId}
        GROUP BY category
        ORDER BY total_value DESC
      `,
    );
  }

  // ============== EXPORT FUNCTIONS ==============

  async exportBookings(
    tenantId: string,
    fromDate: Date,
    toDate: Date,
    format: 'csv' | 'json' = 'csv',
  ): Promise<string> {
    const bookings = await this.prisma.$queryRaw`
      SELECT 
        b.id,
        b.scheduled_date,
        b.status,
        b.source,
        b.duration_minutes,
        c.encrypted_first_name || ' ' || c.encrypted_last_name as customer_name,
        c.encrypted_phone as customer_phone,
        v.make || ' ' || v.model || ' (' || v.license_plate || ')' as vehicle,
        u.first_name || ' ' || u.last_name as mechanic,
        string_agg(s.name, ', ') as services,
        SUM(bs.price) as total
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      JOIN vehicles v ON b.vehicle_id = v.id
      JOIN users u ON b.mechanic_id = u.id
      JOIN booking_services bs ON b.id = bs.booking_id
      JOIN services s ON bs.service_id = s.id
      WHERE b.tenant_id = ${tenantId}
        AND b.scheduled_date >= ${fromDate}
        AND b.scheduled_date <= ${toDate}
      GROUP BY b.id, b.scheduled_date, b.status, b.source, b.duration_minutes,
               c.encrypted_first_name, c.encrypted_last_name, c.encrypted_phone,
               v.make, v.model, v.license_plate, u.first_name, u.last_name
      ORDER BY b.scheduled_date DESC
    `;

    if (format === 'json') {
      return JSON.stringify(bookings, null, 2);
    }

    // CSV export
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'id', title: 'Booking ID' },
        { id: 'scheduled_date', title: 'Date' },
        { id: 'status', title: 'Status' },
        { id: 'source', title: 'Source' },
        { id: 'customer_name', title: 'Customer' },
        { id: 'customer_phone', title: 'Phone' },
        { id: 'vehicle', title: 'Vehicle' },
        { id: 'mechanic', title: 'Mechanic' },
        { id: 'services', title: 'Services' },
        { id: 'duration_minutes', title: 'Duration (min)' },
        { id: 'total', title: 'Total (€)' },
      ],
    });

    const records = (bookings as Record<string, unknown>[]).map(b => ({
      ...b,
      scheduled_date: new Date(b.scheduled_date as string).toISOString().split('T')[0],
      total: (b.total as number | null)?.toString(),
    }));

    return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
  }

  async exportInventory(tenantId: string, format: 'csv' | 'json' = 'csv'): Promise<string> {
    const inventory = await this.getInventoryStatus(tenantId);

    if (format === 'json') {
      return JSON.stringify(inventory, null, 2);
    }

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'sku', title: 'SKU' },
        { id: 'part_name', title: 'Part Name' },
        { id: 'category', title: 'Category' },
        { id: 'stock_quantity', title: 'Stock Qty' },
        { id: 'available_quantity', title: 'Available' },
        { id: 'min_stock_level', title: 'Min Level' },
        { id: 'stock_status', title: 'Status' },
        { id: 'cost_price', title: 'Cost (€)' },
        { id: 'retail_price', title: 'Retail (€)' },
        { id: 'inventory_value', title: 'Value (€)' },
        { id: 'supplier_name', title: 'Supplier' },
      ],
    });

    const records = (inventory as Record<string, unknown>[]).map(i => ({
      ...i,
      cost_price: i.cost_price?.toString(),
      retail_price: i.retail_price?.toString(),
      inventory_value: i.inventory_value?.toString(),
    }));

    return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
  }

  async exportRevenue(
    tenantId: string,
    year: number,
    format: 'csv' | 'json' = 'csv',
  ): Promise<string> {
    const revenue = await this.getRevenueAnalytics(tenantId, year);

    if (format === 'json') {
      return JSON.stringify(revenue, null, 2);
    }

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'date', title: 'Date' },
        { id: 'total_revenue', title: 'Total Revenue (€)' },
        { id: 'realized_revenue', title: 'Realized (€)' },
        { id: 'lost_revenue', title: 'Lost (€)' },
        { id: 'booking_count', title: 'Bookings' },
        { id: 'avg_revenue_per_booking', title: 'Avg per Booking (€)' },
      ],
    });

    const records = (revenue as Record<string, unknown>[]).map(r => ({
      ...r,
      date: new Date(r.date as string).toISOString().split('T')[0],
      total_revenue: r.total_revenue?.toString(),
      realized_revenue: r.realized_revenue?.toString(),
      lost_revenue: r.lost_revenue?.toString(),
      avg_revenue_per_booking: r.avg_revenue_per_booking?.toString(),
    }));

    return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
  }

  // ============== REFRESH MATERIALIZED VIEWS ==============

  async refreshAnalyticsViews(): Promise<void> {
    try {
      await this.prisma.$executeRaw`SELECT refresh_analytics_views()`;
    } catch {
      // Function doesn't exist if materialized views haven't been created
    }
  }

  // ============== CUSTOM KPIs ==============

  async getCustomKPIs(tenantId: string) {
    const [bookingMetrics, revenueMetrics, customerMetrics, inventoryMetrics] = await Promise.all([
      this.prisma.$queryRaw`
        SELECT
          COUNT(*) as today_bookings,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_today
        FROM bookings
        WHERE tenant_id = ${tenantId}
          AND DATE(scheduled_date) = CURRENT_DATE
      `,
      this.safeViewQuery(
        () =>
          this.prisma.$queryRaw`
          SELECT COALESCE(SUM(total), 0) as month_revenue
          FROM mv_revenue_analytics
          WHERE tenant_id = ${tenantId}
            AND month = DATE_TRUNC('month', CURRENT_DATE)
        `,
      ),
      this.safeViewQuery(
        () =>
          this.prisma.$queryRaw`
          SELECT
            active_customers_30d,
            returning_customers,
            avg_bookings_per_customer
          FROM mv_customer_retention
          WHERE tenant_id = ${tenantId}
          ORDER BY month DESC
          LIMIT 1
        `,
      ),
      this.safeViewQuery(
        () =>
          this.prisma.$queryRaw`
          SELECT
            COUNT(*) as low_stock_count,
            SUM(inventory_value) as total_inventory_value
          FROM mv_inventory_status
          WHERE tenant_id = ${tenantId}
            AND stock_status IN ('LOW_STOCK', 'REORDER')
        `,
      ),
    ]);

    // Convert BigInt values from COUNT/SUM to Number for JSON serialization
    const toBigIntSafe = (obj: Record<string, unknown>): Record<string, unknown> => {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        result[k] = typeof v === 'bigint' ? Number(v) : v;
      }
      return result;
    };

    return {
      bookings: toBigIntSafe(
        (bookingMetrics as Record<string, unknown>[])[0] || {
          today_bookings: 0,
          completed_today: 0,
        },
      ),
      revenue: toBigIntSafe(
        (revenueMetrics as Record<string, unknown>[])[0] || { month_revenue: 0 },
      ),
      customers: toBigIntSafe((customerMetrics as Record<string, unknown>[])[0] || {}),
      inventory: toBigIntSafe(
        (inventoryMetrics as Record<string, unknown>[])[0] || {
          low_stock_count: 0,
          total_inventory_value: 0,
        },
      ),
    };
  }
}
