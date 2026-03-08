"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/services/prisma.service");
const csv_writer_1 = require("csv-writer");
let ReportingService = class ReportingService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboardSummary(tenantId) {
        const result = await this.prisma.$queryRaw `
      SELECT * FROM mv_dashboard_summary 
      WHERE tenant_id = ${tenantId}::uuid
      LIMIT 1
    `;
        return result[0] || null;
    }
    async getBookingMetrics(tenantId, fromDate, toDate) {
        return this.prisma.$queryRaw `
      SELECT * FROM mv_daily_booking_metrics
      WHERE tenant_id = ${tenantId}::uuid
        AND date >= ${fromDate}
        AND date <= ${toDate}
      ORDER BY date DESC
    `;
    }
    async getRevenueAnalytics(tenantId, year, month) {
        let query = `
      SELECT * FROM mv_revenue_analytics
      WHERE tenant_id = $1::uuid
        AND EXTRACT(YEAR FROM date) = $2
    `;
        const params = [tenantId, year];
        if (month) {
            query += ` AND EXTRACT(MONTH FROM date) = $3`;
            params.push(month);
        }
        query += ` ORDER BY date DESC`;
        return this.prisma.$queryRawUnsafe(query, ...params);
    }
    async getCustomerRetention(tenantId) {
        return this.prisma.$queryRaw `
      SELECT * FROM mv_customer_retention
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY month DESC
      LIMIT 12
    `;
    }
    async getTopCustomers(tenantId, limit = 10) {
        return this.prisma.$queryRaw `
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
    async getServicePopularity(tenantId, year) {
        return this.prisma.$queryRaw `
      SELECT * FROM mv_service_popularity
      WHERE tenant_id = ${tenantId}::uuid
        AND EXTRACT(YEAR FROM month) = ${year}
      ORDER BY times_booked DESC
    `;
    }
    async getMechanicPerformance(tenantId, year, month) {
        let query = `
      SELECT * FROM mv_mechanic_performance
      WHERE tenant_id = $1::uuid
        AND EXTRACT(YEAR FROM month) = $2
    `;
        const params = [tenantId, year];
        if (month) {
            query += ` AND EXTRACT(MONTH FROM month) = $3`;
            params.push(month);
        }
        query += ` ORDER BY total_revenue_generated DESC`;
        return this.prisma.$queryRawUnsafe(query, ...params);
    }
    async getInventoryStatus(tenantId, status) {
        let query = `
      SELECT * FROM mv_inventory_status
      WHERE tenant_id = $1::uuid
    `;
        const params = [tenantId];
        if (status) {
            query += ` AND stock_status = $2`;
            params.push(status);
        }
        query += ` ORDER BY inventory_value DESC`;
        return this.prisma.$queryRawUnsafe(query, ...params);
    }
    async getInventoryValuation(tenantId) {
        return this.prisma.$queryRaw `
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
    async exportBookings(tenantId, fromDate, toDate, format = 'csv') {
        const bookings = await this.prisma.$queryRaw `
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
        const csvStringifier = (0, csv_writer_1.createObjectCsvStringifier)({
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
        const records = bookings.map(b => ({
            ...b,
            scheduled_date: new Date(b.scheduled_date).toISOString().split('T')[0],
            total: b.total?.toString(),
        }));
        return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
    }
    async exportInventory(tenantId, format = 'csv') {
        const inventory = await this.getInventoryStatus(tenantId);
        if (format === 'json') {
            return JSON.stringify(inventory, null, 2);
        }
        const csvStringifier = (0, csv_writer_1.createObjectCsvStringifier)({
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
        const records = inventory.map(i => ({
            ...i,
            cost_price: i.cost_price?.toString(),
            retail_price: i.retail_price?.toString(),
            inventory_value: i.inventory_value?.toString(),
        }));
        return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
    }
    async exportRevenue(tenantId, year, format = 'csv') {
        const revenue = await this.getRevenueAnalytics(tenantId, year);
        if (format === 'json') {
            return JSON.stringify(revenue, null, 2);
        }
        const csvStringifier = (0, csv_writer_1.createObjectCsvStringifier)({
            header: [
                { id: 'date', title: 'Date' },
                { id: 'total_revenue', title: 'Total Revenue (€)' },
                { id: 'realized_revenue', title: 'Realized (€)' },
                { id: 'lost_revenue', title: 'Lost (€)' },
                { id: 'booking_count', title: 'Bookings' },
                { id: 'avg_revenue_per_booking', title: 'Avg per Booking (€)' },
            ],
        });
        const records = revenue.map(r => ({
            ...r,
            date: new Date(r.date).toISOString().split('T')[0],
            total_revenue: r.total_revenue?.toString(),
            realized_revenue: r.realized_revenue?.toString(),
            lost_revenue: r.lost_revenue?.toString(),
            avg_revenue_per_booking: r.avg_revenue_per_booking?.toString(),
        }));
        return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
    }
    async refreshAnalyticsViews() {
        await this.prisma.$executeRaw `SELECT refresh_analytics_views()`;
    }
    async getCustomKPIs(tenantId) {
        const [bookingMetrics, revenueMetrics, customerMetrics, inventoryMetrics,] = await Promise.all([
            this.prisma.$queryRaw `
        SELECT 
          COUNT(*) as today_bookings,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_today
        FROM bookings
        WHERE tenant_id = ${tenantId}::uuid
          AND DATE(scheduled_date) = CURRENT_DATE
      `,
            this.prisma.$queryRaw `
        SELECT COALESCE(SUM(total), 0) as month_revenue
        FROM mv_revenue_analytics
        WHERE tenant_id = ${tenantId}::uuid
          AND month = DATE_TRUNC('month', CURRENT_DATE)
      `,
            this.prisma.$queryRaw `
        SELECT 
          active_customers_30d,
          returning_customers,
          avg_bookings_per_customer
        FROM mv_customer_retention
        WHERE tenant_id = ${tenantId}::uuid
        ORDER BY month DESC
        LIMIT 1
      `,
            this.prisma.$queryRaw `
        SELECT 
          COUNT(*) as low_stock_count,
          SUM(inventory_value) as total_inventory_value
        FROM mv_inventory_status
        WHERE tenant_id = ${tenantId}::uuid
          AND stock_status IN ('LOW_STOCK', 'REORDER')
      `,
        ]);
        return {
            bookings: bookingMetrics[0],
            revenue: revenueMetrics[0],
            customers: customerMetrics[0] || {},
            inventory: inventoryMetrics[0],
        };
    }
};
exports.ReportingService = ReportingService;
exports.ReportingService = ReportingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportingService);
