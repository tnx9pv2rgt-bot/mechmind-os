import { Test, TestingModule } from '@nestjs/testing';
import { ReportingService } from './reporting.service';
import { PrismaService } from '../../common/services/prisma.service';

const mockPrisma = {
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
};

describe('ReportingService', () => {
  let service: ReportingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportingService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<ReportingService>(ReportingService);
    jest.clearAllMocks();
  });

  const tenantId = '550e8400-e29b-41d4-a716-446655440000';

  // ============== getDashboardSummary ==============

  describe('getDashboardSummary', () => {
    it('should return first row from mv_dashboard_summary', async () => {
      const row = { tenant_id: tenantId, total_bookings: 42, revenue: 10000 };
      mockPrisma.$queryRaw.mockResolvedValue([row]);

      const result = await service.getDashboardSummary(tenantId);

      expect(result).toEqual(row);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should return null when no data exists', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getDashboardSummary(tenantId);

      expect(result).toBeNull();
    });

    it('should propagate database errors', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('DB connection failed'));

      await expect(service.getDashboardSummary(tenantId)).rejects.toThrow('DB connection failed');
    });
  });

  // ============== getBookingMetrics ==============

  describe('getBookingMetrics', () => {
    const fromDate = new Date('2026-01-01');
    const toDate = new Date('2026-01-31');

    it('should return booking metrics for date range', async () => {
      const rows = [
        { date: '2026-01-15', total_bookings: 5, completed: 3 },
        { date: '2026-01-10', total_bookings: 8, completed: 7 },
      ];
      mockPrisma.$queryRaw.mockResolvedValue(rows);

      const result = await service.getBookingMetrics(tenantId, fromDate, toDate);

      expect(result).toEqual(rows);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no metrics exist', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getBookingMetrics(tenantId, fromDate, toDate);

      expect(result).toEqual([]);
    });

    it('should propagate database errors', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Query timeout'));

      await expect(service.getBookingMetrics(tenantId, fromDate, toDate)).rejects.toThrow(
        'Query timeout',
      );
    });
  });

  // ============== getRevenueAnalytics ==============

  describe('getRevenueAnalytics', () => {
    it('should return revenue analytics for a full year', async () => {
      const rows = [{ date: '2026-03-01', total_revenue: 50000 }];
      mockPrisma.$queryRaw.mockResolvedValue(rows);

      const result = await service.getRevenueAnalytics(tenantId, 2026);

      expect(result).toEqual(rows);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should apply month filter when month is provided', async () => {
      const rows = [{ date: '2026-03-01', total_revenue: 15000 }];
      mockPrisma.$queryRaw.mockResolvedValue(rows);

      const result = await service.getRevenueAnalytics(tenantId, 2026, 3);

      expect(result).toEqual(rows);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no data exists', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getRevenueAnalytics(tenantId, 2020);

      expect(result).toEqual([]);
    });
  });

  // ============== getCustomerRetention ==============

  describe('getCustomerRetention', () => {
    it('should return up to 12 months of retention data', async () => {
      const rows = Array.from({ length: 12 }, (_, i) => ({
        month: `2026-${String(i + 1).padStart(2, '0')}-01`,
        retention_rate: 0.85,
      }));
      mockPrisma.$queryRaw.mockResolvedValue(rows);

      const result = await service.getCustomerRetention(tenantId);

      expect(result).toHaveLength(12);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should return empty array for new tenant', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getCustomerRetention(tenantId);

      expect(result).toEqual([]);
    });
  });

  // ============== getTopCustomers ==============

  describe('getTopCustomers', () => {
    it('should return top customers with default limit of 10', async () => {
      const rows = [
        { id: 'c1', first_name: 'enc1', last_name: 'enc2', total_bookings: 20, total_spent: 5000 },
      ];
      mockPrisma.$queryRaw.mockResolvedValue(rows);

      const result = await service.getTopCustomers(tenantId);

      expect(result).toEqual(rows);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should accept a custom limit', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getTopCustomers(tenantId, 5);

      expect(result).toEqual([]);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no completed bookings', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getTopCustomers(tenantId);

      expect(result).toEqual([]);
    });
  });

  // ============== getServicePopularity ==============

  describe('getServicePopularity', () => {
    it('should return service popularity data', async () => {
      const rows = [
        { service_name: 'Oil Change', times_booked: 150 },
        { service_name: 'Brake Pads', times_booked: 90 },
      ];
      mockPrisma.$queryRaw.mockResolvedValue(rows);

      const result = await service.getServicePopularity(tenantId, 2026);

      expect(result).toEqual(rows);
    });

    it('should return empty array for year with no data', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getServicePopularity(tenantId, 2020);

      expect(result).toEqual([]);
    });
  });

  // ============== getMechanicPerformance ==============

  describe('getMechanicPerformance', () => {
    it('should return mechanic performance for a full year', async () => {
      const rows = [{ mechanic: 'John', total_revenue_generated: 25000 }];
      mockPrisma.$queryRaw.mockResolvedValue(rows);

      const result = await service.getMechanicPerformance(tenantId, 2026);

      expect(result).toEqual(rows);
    });

    it('should apply month filter when provided', async () => {
      const rows = [{ mechanic: 'John', total_revenue_generated: 5000 }];
      mockPrisma.$queryRaw.mockResolvedValue(rows);

      const result = await service.getMechanicPerformance(tenantId, 2026, 3);

      expect(result).toEqual(rows);
    });

    it('should return empty array when no data', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getMechanicPerformance(tenantId, 2020, 1);

      expect(result).toEqual([]);
    });
  });

  // ============== getInventoryStatus ==============

  describe('getInventoryStatus', () => {
    it('should return all inventory items without status filter', async () => {
      const rows = [{ sku: 'P001', stock_quantity: 50, inventory_value: 500 }];
      mockPrisma.$queryRaw.mockResolvedValue(rows);

      const result = await service.getInventoryStatus(tenantId);

      expect(result).toEqual(rows);
    });

    it('should filter by stock status when provided', async () => {
      const rows = [{ sku: 'P002', stock_status: 'LOW_STOCK', inventory_value: 100 }];
      mockPrisma.$queryRaw.mockResolvedValue(rows);

      const result = await service.getInventoryStatus(tenantId, 'LOW_STOCK');

      expect(result).toEqual(rows);
    });

    it('should return empty array when no inventory', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getInventoryStatus(tenantId);

      expect(result).toEqual([]);
    });
  });

  // ============== getInventoryValuation ==============

  describe('getInventoryValuation', () => {
    it('should return valuation grouped by category', async () => {
      const rows = [
        { category: 'Brakes', part_count: 15, total_value: 3000, avg_retail_price: 250 },
        { category: 'Filters', part_count: 30, total_value: 900, avg_retail_price: 35 },
      ];
      mockPrisma.$queryRaw.mockResolvedValue(rows);

      const result = await service.getInventoryValuation(tenantId);

      expect(result).toEqual(rows);
    });

    it('should return empty array for empty inventory', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getInventoryValuation(tenantId);

      expect(result).toEqual([]);
    });
  });

  // ============== exportBookings ==============

  describe('exportBookings', () => {
    const fromDate = new Date('2026-01-01');
    const toDate = new Date('2026-01-31');

    const bookingRows = [
      {
        id: 'b1',
        scheduled_date: '2026-01-15T10:00:00Z',
        status: 'COMPLETED',
        source: 'ONLINE',
        duration_minutes: 60,
        customer_name: 'Mario Rossi',
        customer_phone: '+39123456',
        vehicle: 'Fiat Panda (AA123BB)',
        mechanic: 'Luigi Verdi',
        services: 'Oil Change, Filter',
        total: 150,
      },
    ];

    it('should export bookings as JSON', async () => {
      mockPrisma.$queryRaw.mockResolvedValue(bookingRows);

      const result = await service.exportBookings(tenantId, fromDate, toDate, 'json');
      const parsed = JSON.parse(result);

      expect(parsed).toEqual(bookingRows);
    });

    it('should export bookings as CSV by default', async () => {
      mockPrisma.$queryRaw.mockResolvedValue(bookingRows);

      const result = await service.exportBookings(tenantId, fromDate, toDate);

      expect(result).toContain('Booking ID');
      expect(result).toContain('Date');
      expect(result).toContain('Status');
      expect(result).toContain('COMPLETED');
      expect(result).toContain('2026-01-15');
    });

    it('should handle empty bookings for CSV export', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.exportBookings(tenantId, fromDate, toDate, 'csv');

      expect(result).toContain('Booking ID');
    });

    it('should handle empty bookings for JSON export', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.exportBookings(tenantId, fromDate, toDate, 'json');

      expect(JSON.parse(result)).toEqual([]);
    });

    it('should handle null total in CSV export', async () => {
      const rowsWithNullTotal = [{ ...bookingRows[0], total: null }];
      mockPrisma.$queryRaw.mockResolvedValue(rowsWithNullTotal);

      const result = await service.exportBookings(tenantId, fromDate, toDate, 'csv');

      expect(result).toContain('Booking ID');
    });
  });

  // ============== exportInventory ==============

  describe('exportInventory', () => {
    const inventoryRows = [
      {
        sku: 'P001',
        part_name: 'Brake Pad Set',
        category: 'Brakes',
        stock_quantity: 50,
        available_quantity: 45,
        min_stock_level: 10,
        stock_status: 'IN_STOCK',
        cost_price: 25,
        retail_price: 45,
        inventory_value: 1250,
        supplier_name: 'AutoParts Co',
      },
    ];

    it('should export inventory as JSON', async () => {
      mockPrisma.$queryRaw.mockResolvedValue(inventoryRows);

      const result = await service.exportInventory(tenantId, 'json');
      const parsed = JSON.parse(result);

      expect(parsed).toEqual(inventoryRows);
    });

    it('should export inventory as CSV by default', async () => {
      mockPrisma.$queryRaw.mockResolvedValue(inventoryRows);

      const result = await service.exportInventory(tenantId);

      expect(result).toContain('SKU');
      expect(result).toContain('Part Name');
      expect(result).toContain('P001');
      expect(result).toContain('Brake Pad Set');
    });

    it('should handle empty inventory for CSV', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.exportInventory(tenantId, 'csv');

      expect(result).toContain('SKU');
    });

    it('should handle null price fields in CSV export', async () => {
      const rowsWithNulls = [
        {
          ...inventoryRows[0],
          cost_price: null,
          retail_price: null,
          inventory_value: null,
        },
      ];
      mockPrisma.$queryRaw.mockResolvedValue(rowsWithNulls);

      const result = await service.exportInventory(tenantId, 'csv');

      expect(result).toContain('SKU');
    });
  });

  // ============== exportRevenue ==============

  describe('exportRevenue', () => {
    const revenueRows = [
      {
        date: '2026-03-01T00:00:00Z',
        total_revenue: 50000,
        realized_revenue: 45000,
        lost_revenue: 5000,
        booking_count: 120,
        avg_revenue_per_booking: 416.67,
      },
    ];

    it('should export revenue as JSON', async () => {
      mockPrisma.$queryRaw.mockResolvedValue(revenueRows);

      const result = await service.exportRevenue(tenantId, 2026, 'json');
      const parsed = JSON.parse(result);

      expect(parsed).toEqual(revenueRows);
    });

    it('should export revenue as CSV by default', async () => {
      mockPrisma.$queryRaw.mockResolvedValue(revenueRows);

      const result = await service.exportRevenue(tenantId, 2026);

      expect(result).toContain('Date');
      expect(result).toContain('Total Revenue');
      expect(result).toContain('2026-03-01');
    });

    it('should handle empty revenue data for CSV', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.exportRevenue(tenantId, 2020, 'csv');

      expect(result).toContain('Date');
    });

    it('should handle null revenue fields in CSV export', async () => {
      const rowsWithNulls = [
        {
          ...revenueRows[0],
          total_revenue: null,
          realized_revenue: null,
          lost_revenue: null,
          avg_revenue_per_booking: null,
        },
      ];
      mockPrisma.$queryRaw.mockResolvedValue(rowsWithNulls);

      const result = await service.exportRevenue(tenantId, 2026, 'csv');

      expect(result).toContain('Date');
    });
  });

  // ============== refreshAnalyticsViews ==============

  describe('refreshAnalyticsViews', () => {
    it('should call refresh_analytics_views function', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(0);

      await service.refreshAnalyticsViews();

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('should silently handle missing refresh function', async () => {
      mockPrisma.$executeRaw.mockRejectedValue(new Error('Function not found'));

      await expect(service.refreshAnalyticsViews()).resolves.toBeUndefined();
    });
  });

  // ============== safeViewQuery edge cases ==============

  describe('safeViewQuery (via getDashboardSummary)', () => {
    it('should return empty array when error contains "relation"', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(
        new Error('relation "mv_dashboard_summary" does not exist'),
      );

      const result = await service.getDashboardSummary(tenantId);

      // safeViewQuery returns [] then getDashboardSummary accesses [0] which is undefined → null
      expect(result).toBeNull();
    });

    it('should return empty array when error contains "does not exist" (non-relation)', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('column "foo" does not exist'));

      const result = await service.getDashboardSummary(tenantId);

      expect(result).toBeNull();
    });

    it('should handle non-Error thrown values', async () => {
      mockPrisma.$queryRaw.mockRejectedValue('string error with relation message');

      // String(error) includes "relation"
      const result = await service.getDashboardSummary(tenantId);
      expect(result).toBeNull();
    });

    it('should rethrow errors that do not match view-missing patterns', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('permission denied'));

      await expect(service.getDashboardSummary(tenantId)).rejects.toThrow('permission denied');
    });
  });

  // ============== getDashboardKpis ==============

  describe('getDashboardKpis', () => {
    let mockKpiPrisma: Record<string, Record<string, jest.Mock>>;

    beforeEach(() => {
      mockKpiPrisma = {
        customer: { count: jest.fn().mockResolvedValue(0) },
        vehicle: { count: jest.fn().mockResolvedValue(0) },
        invoice: {
          aggregate: jest.fn().mockResolvedValue({ _sum: { total: null, subtotal: null } }),
        },
        booking: { count: jest.fn().mockResolvedValue(0) },
        workOrder: { count: jest.fn().mockResolvedValue(0) },
        estimate: { count: jest.fn().mockResolvedValue(0) },
        part: { count: jest.fn().mockResolvedValue(0) },
        $queryRaw: jest.fn().mockResolvedValue([{ count: BigInt(0) }]) as unknown as Record<
          string,
          jest.Mock
        >,
      };
    });

    async function buildServiceWithKpiPrisma(): Promise<ReportingService> {
      const mod = await Test.createTestingModule({
        providers: [ReportingService, { provide: PrismaService, useValue: mockKpiPrisma }],
      }).compile();
      return mod.get<ReportingService>(ReportingService);
    }

    it('should return all zero KPIs when database is empty', async () => {
      // invoice.aggregate is called 4 times: fatturatoMese, unpaidInvoices, overdueInvoices, laborRevenue, paymentsLast7d
      mockKpiPrisma.invoice.aggregate
        .mockResolvedValueOnce({ _sum: { total: null } }) // fatturatoMese
        .mockResolvedValueOnce({ _sum: { total: null } }) // unpaidInvoices
        .mockResolvedValueOnce({ _sum: { total: null } }) // overdueInvoices
        .mockResolvedValueOnce({ _sum: { subtotal: null, total: null } }) // laborRevenue
        .mockResolvedValueOnce({ _sum: { total: null } }); // paymentsLast7d

      // workOrder.count called 4 times
      mockKpiPrisma.workOrder.count
        .mockResolvedValueOnce(0) // workOrderAperti
        .mockResolvedValueOnce(0) // woCompletedThisMonth
        .mockResolvedValueOnce(0) // woTotalThisMonth
        .mockResolvedValueOnce(0) // woCompletedPrevMonth
        .mockResolvedValueOnce(0); // woTotalPrevMonth

      // estimate.count called 5 times (4 original + 1 for preventiviInScadenza)
      mockKpiPrisma.estimate.count
        .mockResolvedValueOnce(0) // estimatesThisMonth
        .mockResolvedValueOnce(0) // estimatesConvertedThisMonth
        .mockResolvedValueOnce(0) // estimatesPrevMonth
        .mockResolvedValueOnce(0) // estimatesConvertedPrevMonth
        .mockResolvedValueOnce(0); // preventiviInScadenza

      const svc = await buildServiceWithKpiPrisma();
      const result = await svc.getDashboardKpis(tenantId);

      expect(result.clientiTotali).toBe(0);
      expect(result.veicoliTotali).toBe(0);
      expect(result.fatturatoMese).toBe(0);
      expect(result.prenotazioniOggi).toBe(0);
      expect(result.workOrderAperti).toBe(0);
      expect(result.efficiency).toBe(0);
      expect(result.efficiencyChange).toBe(0);
      expect(result.conversion).toBe(0);
      expect(result.conversionChange).toBe(0);
      expect(result.unpaidAmount).toBe(0);
      expect(result.overdueAmount).toBe(0);
      expect(result.grossMargin).toBe(0);
      expect(result.cashFlow7d).toBe(0);
      expect(result.revenueTarget).toBe(0);
      expect(result.scorteInAllarme).toBe(0);
      expect(result.preventiviInScadenza).toBe(0);
      expect(result.rightToRepairPct).toBe(100); // no parts → 100%
    });

    it('should calculate efficiency and conversion with non-zero data', async () => {
      mockKpiPrisma.customer.count.mockResolvedValue(50);
      mockKpiPrisma.vehicle.count.mockResolvedValue(75);
      mockKpiPrisma.booking.count.mockResolvedValue(3);

      // invoice aggregates
      mockKpiPrisma.invoice.aggregate
        .mockResolvedValueOnce({ _sum: { total: 10000 } }) // fatturatoMese
        .mockResolvedValueOnce({ _sum: { total: 2000 } }) // unpaidInvoices
        .mockResolvedValueOnce({ _sum: { total: 500 } }) // overdueInvoices
        .mockResolvedValueOnce({ _sum: { subtotal: 8000, total: 10000 } }) // laborRevenue
        .mockResolvedValueOnce({ _sum: { total: 5000 } }); // paymentsLast7d

      // workOrder.count: open, completedThisMonth, totalThisMonth, completedPrev, totalPrev
      mockKpiPrisma.workOrder.count
        .mockResolvedValueOnce(5) // workOrderAperti
        .mockResolvedValueOnce(8) // woCompletedThisMonth
        .mockResolvedValueOnce(10) // woTotalThisMonth
        .mockResolvedValueOnce(6) // woCompletedPrevMonth
        .mockResolvedValueOnce(10); // woTotalPrevMonth

      // estimate.count
      mockKpiPrisma.estimate.count
        .mockResolvedValueOnce(20) // estimatesThisMonth
        .mockResolvedValueOnce(15) // estimatesConvertedThisMonth
        .mockResolvedValueOnce(10) // estimatesPrevMonth
        .mockResolvedValueOnce(5) // estimatesConvertedPrevMonth
        .mockResolvedValueOnce(2); // preventiviInScadenza

      const svc = await buildServiceWithKpiPrisma();
      const result = await svc.getDashboardKpis(tenantId);

      expect(result.clientiTotali).toBe(50);
      expect(result.veicoliTotali).toBe(75);
      expect(result.fatturatoMese).toBe(10000);
      expect(result.prenotazioniOggi).toBe(3);
      expect(result.workOrderAperti).toBe(5);
      // efficiency: 8/10 = 80%, prev: 6/10 = 60%, change = 20
      expect(result.efficiency).toBe(80);
      expect(result.efficiencyChange).toBe(20);
      // conversion: 15/20 = 75%, prev: 5/10 = 50%, change = 25
      expect(result.conversion).toBe(75);
      expect(result.conversionChange).toBe(25);
      expect(result.unpaidAmount).toBe(2000);
      expect(result.overdueAmount).toBe(500);
      // grossMargin: 8000/10000 = 80%
      expect(result.grossMargin).toBe(80);
      expect(result.cashFlow7d).toBe(5000);
      // revenueTarget: round(10000 * 1.15) = 11500
      expect(result.revenueTarget).toBe(11500);
    });

    it('should handle null _sum values gracefully (zero-division guard)', async () => {
      mockKpiPrisma.invoice.aggregate
        .mockResolvedValueOnce({ _sum: { total: null } })
        .mockResolvedValueOnce({ _sum: { total: null } })
        .mockResolvedValueOnce({ _sum: { total: null } })
        .mockResolvedValueOnce({ _sum: { subtotal: null, total: null } })
        .mockResolvedValueOnce({ _sum: { total: null } });

      mockKpiPrisma.workOrder.count.mockResolvedValue(0);
      mockKpiPrisma.estimate.count.mockResolvedValue(0);

      const svc = await buildServiceWithKpiPrisma();
      const result = await svc.getDashboardKpis(tenantId);

      // All should be 0, no NaN
      expect(result.grossMargin).toBe(0);
      expect(result.efficiency).toBe(0);
      expect(result.conversion).toBe(0);
    });
  });

  // ============== getCustomKPIs ==============

  describe('getCustomKPIs', () => {
    it('should aggregate KPIs from multiple queries', async () => {
      const bookingMetrics = [{ today_bookings: 5, completed_today: 3 }];
      const revenueMetrics = [{ month_revenue: 25000 }];
      const customerMetrics = [
        { active_customers_30d: 150, returning_customers: 80, avg_bookings_per_customer: 2.5 },
      ];
      const inventoryMetrics = [{ low_stock_count: 3, total_inventory_value: 45000 }];

      mockPrisma.$queryRaw
        .mockResolvedValueOnce(bookingMetrics)
        .mockResolvedValueOnce(revenueMetrics)
        .mockResolvedValueOnce(customerMetrics)
        .mockResolvedValueOnce(inventoryMetrics);

      const result = await service.getCustomKPIs(tenantId);

      expect(result).toEqual({
        bookings: bookingMetrics[0],
        revenue: revenueMetrics[0],
        customers: customerMetrics[0],
        inventory: inventoryMetrics[0],
      });
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(4);
    });

    it('should return empty object for customers when no data', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ today_bookings: 0, completed_today: 0 }])
        .mockResolvedValueOnce([{ month_revenue: 0 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ low_stock_count: 0, total_inventory_value: 0 }]);

      const result = await service.getCustomKPIs(tenantId);

      expect(result.customers).toEqual({});
    });

    it('should propagate error if any query fails', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ today_bookings: 0 }])
        .mockRejectedValueOnce(new Error('Connection lost'))
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await expect(service.getCustomKPIs(tenantId)).rejects.toThrow('Connection lost');
    });

    it('should convert BigInt values to Number for JSON serialization', async () => {
      const bookingMetrics = [{ today_bookings: BigInt(5), completed_today: BigInt(3) }];
      const revenueMetrics = [{ month_revenue: BigInt(25000) }];
      const customerMetrics = [
        {
          active_customers_30d: BigInt(150),
          returning_customers: BigInt(80),
          avg_bookings_per_customer: 2.5,
        },
      ];
      const inventoryMetrics = [
        { low_stock_count: BigInt(3), total_inventory_value: BigInt(45000) },
      ];

      mockPrisma.$queryRaw
        .mockResolvedValueOnce(bookingMetrics)
        .mockResolvedValueOnce(revenueMetrics)
        .mockResolvedValueOnce(customerMetrics)
        .mockResolvedValueOnce(inventoryMetrics);

      const result = await service.getCustomKPIs(tenantId);

      // BigInt values should be converted to Number
      expect(result.bookings).toEqual({ today_bookings: 5, completed_today: 3 });
      expect(result.revenue).toEqual({ month_revenue: 25000 });
      expect(result.customers).toEqual({
        active_customers_30d: 150,
        returning_customers: 80,
        avg_bookings_per_customer: 2.5,
      });
      expect(result.inventory).toEqual({ low_stock_count: 3, total_inventory_value: 45000 });
    });

    it('should use fallback defaults when query returns empty arrays', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // booking - empty
        .mockResolvedValueOnce([]) // revenue - empty
        .mockResolvedValueOnce([]) // customer - empty
        .mockResolvedValueOnce([]); // inventory - empty

      const result = await service.getCustomKPIs(tenantId);

      expect(result.bookings).toEqual({ today_bookings: 0, completed_today: 0 });
      expect(result.revenue).toEqual({ month_revenue: 0 });
      expect(result.customers).toEqual({});
      expect(result.inventory).toEqual({ low_stock_count: 0, total_inventory_value: 0 });
    });
  });
});
