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

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { createObjectCsvStringifier } from 'csv-writer';

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

  // ============== DASHBOARD KPIs ==============

  async getDashboardSummary(tenantId: string) {
    const result = await this.prisma.$queryRaw`
      SELECT * FROM mv_dashboard_summary 
      WHERE tenant_id = ${tenantId}::uuid
      LIMIT 1
    `;
    
    return (result as any[])[0] || null;
  }

  async getBookingMetrics(
    tenantId: string,
    fromDate: Date,
    toDate: Date,
  ) {
    return this.prisma.$queryRaw`
      SELECT * FROM mv_daily_booking_metrics
      WHERE tenant_id = ${tenantId}::uuid
        AND date >= ${fromDate}
        AND date <= ${toDate}
      ORDER BY date DESC
    `;
  }

  async getRevenueAnalytics(
    tenantId: string,
    year: number,
    month?: number,
  ) {
    let query = `
      SELECT * FROM mv_revenue_analytics
      WHERE tenant_id = $1::uuid
        AND EXTRACT(YEAR FROM date) = $2
    `;
    
    const params: any[] = [tenantId, year];
    
    if (month) {
      query += ` AND EXTRACT(MONTH FROM date) = $3`;
      params.push(month);
    }
    
    query += ` ORDER BY date DESC`;
    
    return this.prisma.$queryRawUnsafe(query, ...params);
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

  async getMechanicPerformance(
    tenantId: string,
    year: number,
    month?: number,
  ) {
    let query = `
      SELECT * FROM mv_mechanic_performance
      WHERE tenant_id = $1::uuid
        AND EXTRACT(YEAR FROM month) = $2
    `;
    
    const params: any[] = [tenantId, year];
    
    if (month) {
      query += ` AND EXTRACT(MONTH FROM month) = $3`;
      params.push(month);
    }
    
    query += ` ORDER BY total_revenue_generated DESC`;
    
    return this.prisma.$queryRawUnsafe(query, ...params);
  }

  // ============== INVENTORY REPORTS ==============

  async getInventoryStatus(tenantId: string, status?: string) {
    let query = `
      SELECT * FROM mv_inventory_status
      WHERE tenant_id = $1::uuid
    `;
    
    const params: any[] = [tenantId];
    
    if (status) {
      query += ` AND stock_status = $2`;
      params.push(status);
    }
    
    query += ` ORDER BY inventory_value DESC`;
    
    return this.prisma.$queryRawUnsafe(query, ...params);
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

    const records = (bookings as any[]).map(b => ({
      ...b,
      scheduled_date: new Date(b.scheduled_date).toISOString().split('T')[0],
      total: b.total?.toString(),
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

    const records = (inventory as any[]).map(i => ({
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

    const records = (revenue as any[]).map(r => ({
      ...r,
      date: new Date(r.date).toISOString().split('T')[0],
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
    const [
      bookingMetrics,
      revenueMetrics,
      customerMetrics,
      inventoryMetrics,
    ] = await Promise.all([
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
      bookings: (bookingMetrics as any[])[0],
      revenue: (revenueMetrics as any[])[0],
      customers: (customerMetrics as any[])[0] || {},
      inventory: (inventoryMetrics as any[])[0],
    };
  }
}
