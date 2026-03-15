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

  // ============== REAL-TIME DASHBOARD KPIs ==============

  async getDashboardKpis(tenantId: string): Promise<{
    clientiTotali: number;
    veicoliTotali: number;
    fatturatoMese: number;
    prenotazioniOggi: number;
    workOrderAperti: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [clientiTotali, veicoliTotali, fatturatoMese, prenotazioniOggi, workOrderAperti] =
      await Promise.all([
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
      ]);

    return {
      clientiTotali,
      veicoliTotali,
      fatturatoMese: Number(fatturatoMese._sum.total ?? 0),
      prenotazioniOggi,
      workOrderAperti,
    };
  }

  // ============== DASHBOARD SUMMARY (Materialized View) ==============

  async getDashboardSummary(tenantId: string) {
    const result = await this.prisma.$queryRaw`
      SELECT * FROM mv_dashboard_summary 
      WHERE tenant_id = ${tenantId}::uuid
      LIMIT 1
    `;

    return (result as Record<string, unknown>[])[0] || null;
  }

  async getBookingMetrics(tenantId: string, fromDate: Date, toDate: Date) {
    return this.prisma.$queryRaw`
      SELECT * FROM mv_daily_booking_metrics
      WHERE tenant_id = ${tenantId}::uuid
        AND date >= ${fromDate}
        AND date <= ${toDate}
      ORDER BY date DESC
    `;
  }

  async getRevenueAnalytics(tenantId: string, year: number, month?: number) {
    const monthFilter = month ? Prisma.sql`AND EXTRACT(MONTH FROM date) = ${month}` : Prisma.empty;

    return this.prisma.$queryRaw`
      SELECT * FROM mv_revenue_analytics
      WHERE tenant_id = ${tenantId}::uuid
        AND EXTRACT(YEAR FROM date) = ${year}
        ${monthFilter}
      ORDER BY date DESC
    `;
  }

  // ============== CUSTOMER ANALYTICS ==============

  async getCustomerRetention(tenantId: string) {
    return this.prisma.$queryRaw`
      SELECT * FROM mv_customer_retention
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY month DESC
      LIMIT 12
    `;
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
      WHERE c.tenant_id = ${tenantId}::uuid
        AND b.status = 'COMPLETED'
      GROUP BY c.id, c.encrypted_first_name, c.encrypted_last_name
      ORDER BY total_spent DESC
      LIMIT ${limit}
    `;
  }

  // ============== SERVICE ANALYTICS ==============

  async getServicePopularity(tenantId: string, year: number) {
    return this.prisma.$queryRaw`
      SELECT * FROM mv_service_popularity
      WHERE tenant_id = ${tenantId}::uuid
        AND EXTRACT(YEAR FROM month) = ${year}
      ORDER BY times_booked DESC
    `;
  }

  async getMechanicPerformance(tenantId: string, year: number, month?: number) {
    const monthFilter = month ? Prisma.sql`AND EXTRACT(MONTH FROM month) = ${month}` : Prisma.empty;

    return this.prisma.$queryRaw`
      SELECT * FROM mv_mechanic_performance
      WHERE tenant_id = ${tenantId}::uuid
        AND EXTRACT(YEAR FROM month) = ${year}
        ${monthFilter}
      ORDER BY total_revenue_generated DESC
    `;
  }

  // ============== INVENTORY REPORTS ==============

  async getInventoryStatus(tenantId: string, status?: string) {
    const statusFilter = status ? Prisma.sql`AND stock_status = ${status}` : Prisma.empty;

    return this.prisma.$queryRaw`
      SELECT * FROM mv_inventory_status
      WHERE tenant_id = ${tenantId}::uuid
        ${statusFilter}
      ORDER BY inventory_value DESC
    `;
  }

  async getInventoryValuation(tenantId: string) {
    return this.prisma.$queryRaw`
      SELECT 
        category,
        COUNT(*) as part_count,
        SUM(inventory_value) as total_value,
        AVG(retail_price) as avg_retail_price
      FROM mv_inventory_status
      WHERE tenant_id = ${tenantId}::uuid
      GROUP BY category
      ORDER BY total_value DESC
    `;
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
      WHERE b.tenant_id = ${tenantId}::uuid
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
    await this.prisma.$executeRaw`SELECT refresh_analytics_views()`;
  }

  // ============== CUSTOM KPIs ==============

  async getCustomKPIs(tenantId: string) {
    const [bookingMetrics, revenueMetrics, customerMetrics, inventoryMetrics] = await Promise.all([
      // Today's metrics
      this.prisma.$queryRaw`
        SELECT 
          COUNT(*) as today_bookings,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_today
        FROM bookings
        WHERE tenant_id = ${tenantId}::uuid
          AND DATE(scheduled_date) = CURRENT_DATE
      `,
      // Revenue this month
      this.prisma.$queryRaw`
        SELECT COALESCE(SUM(total), 0) as month_revenue
        FROM mv_revenue_analytics
        WHERE tenant_id = ${tenantId}::uuid
          AND month = DATE_TRUNC('month', CURRENT_DATE)
      `,
      // Active customers
      this.prisma.$queryRaw`
        SELECT 
          active_customers_30d,
          returning_customers,
          avg_bookings_per_customer
        FROM mv_customer_retention
        WHERE tenant_id = ${tenantId}::uuid
        ORDER BY month DESC
        LIMIT 1
      `,
      // Inventory alerts
      this.prisma.$queryRaw`
        SELECT 
          COUNT(*) as low_stock_count,
          SUM(inventory_value) as total_inventory_value
        FROM mv_inventory_status
        WHERE tenant_id = ${tenantId}::uuid
          AND stock_status IN ('LOW_STOCK', 'REORDER')
      `,
    ]);

    return {
      bookings: (bookingMetrics as Record<string, unknown>[])[0],
      revenue: (revenueMetrics as Record<string, unknown>[])[0],
      customers: (customerMetrics as Record<string, unknown>[])[0] || {},
      inventory: (inventoryMetrics as Record<string, unknown>[])[0],
    };
  }
}
