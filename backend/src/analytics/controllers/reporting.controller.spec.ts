import { Test, TestingModule } from '@nestjs/testing';
import { ReportingController } from './reporting.controller';
import { ReportingService } from '../services/reporting.service';
import { SearchService } from '../services/search.service';
import { KpiService } from '../services/kpi.service';

describe('ReportingController', () => {
  let controller: ReportingController;
  let service: jest.Mocked<ReportingService>;
  let module: TestingModule;

  const TENANT_ID = 'tenant-001';

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [ReportingController],
      providers: [
        {
          provide: ReportingService,
          useValue: {
            getDashboardKpis: jest.fn(),
            getDashboardSummary: jest.fn(),
            getCustomKPIs: jest.fn(),
            getBookingMetrics: jest.fn(),
            getRevenueAnalytics: jest.fn(),
            getCustomerRetention: jest.fn(),
            getTopCustomers: jest.fn(),
            getServicePopularity: jest.fn(),
            getMechanicPerformance: jest.fn(),
            getInventoryStatus: jest.fn(),
            getInventoryValuation: jest.fn(),
            exportBookings: jest.fn(),
            exportInventory: jest.fn(),
            exportRevenue: jest.fn(),
            refreshAnalyticsViews: jest.fn(),
          },
        },
        {
          provide: SearchService,
          useValue: {
            search: jest.fn(),
          },
        },
        {
          provide: KpiService,
          useValue: {
            getDashboardKpi: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ReportingController>(ReportingController);
    service = module.get(ReportingService) as jest.Mocked<ReportingService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============== DASHBOARD ==============

  describe('getDashboardKpis', () => {
    it('should delegate to service with tenantId', async () => {
      const kpis = { revenue: 5000, bookings: 20 };
      service.getDashboardKpis.mockResolvedValue(kpis as never);

      const result = await controller.getDashboardKpis(TENANT_ID);

      expect(service.getDashboardKpis).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual(kpis);
    });
  });

  describe('getDashboardSummary', () => {
    it('should delegate to service with tenantId', async () => {
      const summary = {
        clientiTotali: 50,
        veicoliTotali: 75,
        fatturatoMese: 10000,
        prenotazioniOggi: 5,
        workOrderAperti: 8,
        efficiency: 85,
        efficiencyChange: 5,
        conversion: 65,
        conversionChange: 10,
        unpaidAmount: 2000,
        overdueAmount: 500,
        grossMargin: 35,
        cashFlow7d: 8000,
        revenueTarget: 11500,
        scorteInAllarme: 3,
        preventiviInScadenza: 2,
        rightToRepairPct: 92,
      };
      service.getDashboardKpis.mockResolvedValue(summary as never);

      const result = await controller.getDashboardSummary(TENANT_ID);

      expect(service.getDashboardKpis).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual(summary);
    });
  });

  describe('getCustomKPIs', () => {
    it('should delegate to service with tenantId', async () => {
      const kpis = { avgTicket: 250, repeatRate: 0.65 };
      service.getCustomKPIs.mockResolvedValue(kpis as never);

      const result = await controller.getCustomKPIs(TENANT_ID);

      expect(service.getCustomKPIs).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual(kpis);
    });
  });

  // ============== BOOKING ANALYTICS ==============

  describe('getBookingMetrics', () => {
    it('should delegate to service with tenantId and date range', async () => {
      const metrics = { daily: [{ date: '2026-03-01', count: 5 }] };
      service.getBookingMetrics.mockResolvedValue(metrics as never);
      const dto = { from: '2026-03-01', to: '2026-03-31' };

      const result = await controller.getBookingMetrics(TENANT_ID, dto as never);

      expect(service.getBookingMetrics).toHaveBeenCalledWith(
        TENANT_ID,
        new Date('2026-03-01'),
        new Date('2026-03-31'),
      );
      expect(result).toEqual(metrics);
    });
  });

  // ============== REVENUE ANALYTICS ==============

  describe('getRevenueAnalytics', () => {
    it('should delegate to service with tenantId, year, and month', async () => {
      const revenue = { monthly: [{ month: 1, total: 5000 }] };
      service.getRevenueAnalytics.mockResolvedValue(revenue as never);
      const dto = { year: 2026, month: 3 };

      const result = await controller.getRevenueAnalytics(TENANT_ID, dto as never);

      expect(service.getRevenueAnalytics).toHaveBeenCalledWith(TENANT_ID, 2026, 3);
      expect(result).toEqual(revenue);
    });
  });

  // ============== CUSTOMER ANALYTICS ==============

  describe('getCustomerRetention', () => {
    it('should delegate to service with tenantId', async () => {
      const retention = { rate: 0.75, churnRate: 0.25 };
      service.getCustomerRetention.mockResolvedValue(retention as never);

      const result = await controller.getCustomerRetention(TENANT_ID);

      expect(service.getCustomerRetention).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual(retention);
    });
  });

  describe('getTopCustomers', () => {
    it('should delegate to service with tenantId and limit', async () => {
      const customers = [{ id: 'cust-001', revenue: 5000 }];
      service.getTopCustomers.mockResolvedValue(customers as never);
      const dto = { limit: 10 };

      const result = await controller.getTopCustomers(TENANT_ID, dto as never);

      expect(service.getTopCustomers).toHaveBeenCalledWith(TENANT_ID, 10);
      expect(result).toEqual(customers);
    });
  });

  // ============== SERVICE ANALYTICS ==============

  describe('getServicePopularity', () => {
    it('should delegate to service with tenantId and year', async () => {
      const popularity = [{ service: 'Oil Change', count: 100 }];
      service.getServicePopularity.mockResolvedValue(popularity as never);
      const dto = { year: 2026 };

      const result = await controller.getServicePopularity(TENANT_ID, dto as never);

      expect(service.getServicePopularity).toHaveBeenCalledWith(TENANT_ID, 2026);
      expect(result).toEqual(popularity);
    });
  });

  describe('getMechanicPerformance', () => {
    it('should delegate to service with tenantId, year, and month', async () => {
      const performance = [{ mechanicId: 'mech-001', jobsCompleted: 20 }];
      service.getMechanicPerformance.mockResolvedValue(performance as never);
      const dto = { year: 2026, month: 3 };

      const result = await controller.getMechanicPerformance(TENANT_ID, dto as never);

      expect(service.getMechanicPerformance).toHaveBeenCalledWith(TENANT_ID, 2026, 3);
      expect(result).toEqual(performance);
    });
  });

  // ============== INVENTORY REPORTS ==============

  describe('getInventoryStatus', () => {
    it('should delegate to service with tenantId and status filter', async () => {
      const inventory = [{ partId: 'part-001', status: 'LOW_STOCK' }];
      service.getInventoryStatus.mockResolvedValue(inventory as never);

      const result = await controller.getInventoryStatus(TENANT_ID, 'LOW_STOCK');

      expect(service.getInventoryStatus).toHaveBeenCalledWith(TENANT_ID, 'LOW_STOCK');
      expect(result).toEqual(inventory);
    });

    it('should pass undefined status when not provided', async () => {
      service.getInventoryStatus.mockResolvedValue([] as never);

      await controller.getInventoryStatus(TENANT_ID);

      expect(service.getInventoryStatus).toHaveBeenCalledWith(TENANT_ID, undefined);
    });
  });

  describe('getInventoryValuation', () => {
    it('should delegate to service with tenantId', async () => {
      const valuation = { totalValue: 50000, categories: [] };
      service.getInventoryValuation.mockResolvedValue(valuation as never);

      const result = await controller.getInventoryValuation(TENANT_ID);

      expect(service.getInventoryValuation).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual(valuation);
    });
  });

  // ============== EXPORTS ==============

  describe('exportBookings', () => {
    it('should call service and set response headers for CSV', async () => {
      const csvData = 'id,date,status\n1,2026-03-01,COMPLETED';
      service.exportBookings.mockResolvedValue(csvData as never);

      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };
      const dto = { from: '2026-03-01', to: '2026-03-31', format: 'csv' as const };

      await controller.exportBookings(TENANT_ID, mockRes as never, dto as never);

      expect(service.exportBookings).toHaveBeenCalledWith(
        TENANT_ID,
        new Date('2026-03-01'),
        new Date('2026-03-31'),
        'csv',
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('bookings_'),
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockRes.send).toHaveBeenCalledWith(csvData);
    });
  });

  describe('exportInventory', () => {
    it('should call service and set response headers', async () => {
      const jsonData = JSON.stringify([{ partId: 'part-001' }]);
      service.exportInventory.mockResolvedValue(jsonData as never);

      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      await controller.exportInventory(TENANT_ID, mockRes as never, 'json');

      expect(service.exportInventory).toHaveBeenCalledWith(TENANT_ID, 'json');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(mockRes.send).toHaveBeenCalledWith(jsonData);
    });
  });

  describe('exportRevenue', () => {
    it('should call service and set response headers', async () => {
      const csvData = 'month,revenue\n1,5000';
      service.exportRevenue.mockResolvedValue(csvData as never);

      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };
      const dto = { from: '2026-01-01', to: '2026-12-31', format: 'csv' as const };

      await controller.exportRevenue(TENANT_ID, mockRes as never, dto as never);

      expect(service.exportRevenue).toHaveBeenCalledWith(TENANT_ID, 2026, 'csv');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockRes.send).toHaveBeenCalledWith(csvData);
    });
  });

  // ============== SEARCH ==============

  describe('search', () => {
    it('should wrap search results in success response', async () => {
      const searchService = module.get(SearchService) as jest.Mocked<SearchService>;
      searchService.search.mockResolvedValue({
        results: [{ id: '1', type: 'customer' }],
        total: 1,
      } as never);

      const result = await controller.search(TENANT_ID, 'test query');

      expect(searchService.search).toHaveBeenCalledWith(TENANT_ID, 'test query');
      expect(result).toEqual({
        success: true,
        data: [{ id: '1', type: 'customer' }],
        meta: { total: 1 },
      });
    });

    it('should return empty results when nothing matches', async () => {
      const searchService = module.get(SearchService) as jest.Mocked<SearchService>;
      searchService.search.mockResolvedValue({ results: [], total: 0 } as never);

      const result = await controller.search(TENANT_ID, 'nonexistent');

      expect(result).toEqual({
        success: true,
        data: [],
        meta: { total: 0 },
      });
    });
  });

  // ============== KPI DASHBOARD ==============

  describe('getKpiDashboard', () => {
    it('should wrap KPI data in success response', async () => {
      const kpiService = module.get(KpiService) as jest.Mocked<KpiService>;
      kpiService.getDashboardKpi.mockResolvedValue({ revenue: 5000, bookings: 20 } as never);

      const result = await controller.getKpiDashboard(TENANT_ID, '2026-03-01', '2026-03-31');

      expect(kpiService.getDashboardKpi).toHaveBeenCalledWith(
        TENANT_ID,
        new Date('2026-03-01'),
        new Date('2026-03-31'),
      );
      expect(result).toEqual({
        success: true,
        data: { revenue: 5000, bookings: 20 },
      });
    });
  });

  // ============== EXPORT FORMAT BRANCHES ==============

  describe('exportBookings — JSON format', () => {
    it('should set Content-Type to application/json for JSON format', async () => {
      const jsonData = JSON.stringify([{ id: '1' }]);
      service.exportBookings.mockResolvedValue(jsonData as never);

      const mockRes = { setHeader: jest.fn(), send: jest.fn() };
      const dto = { from: '2026-03-01', to: '2026-03-31', format: 'json' as const };

      await controller.exportBookings(TENANT_ID, mockRes as never, dto as never);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    });
  });

  describe('exportInventory — CSV format (default)', () => {
    it('should default to CSV when format not provided', async () => {
      const csvData = 'id,name\n1,Part';
      service.exportInventory.mockResolvedValue(csvData as never);

      const mockRes = { setHeader: jest.fn(), send: jest.fn() };

      await controller.exportInventory(TENANT_ID, mockRes as never, undefined as never);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    });
  });

  describe('exportRevenue — JSON format', () => {
    it('should set Content-Type to application/json for JSON format', async () => {
      const jsonData = JSON.stringify({ revenue: [] });
      service.exportRevenue.mockResolvedValue(jsonData as never);

      const mockRes = { setHeader: jest.fn(), send: jest.fn() };
      const dto = { from: '2026-01-01', to: '2026-12-31', format: 'json' as const };

      await controller.exportRevenue(TENANT_ID, mockRes as never, dto as never);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    });
  });

  // ============== ADMIN ==============

  describe('refreshViews', () => {
    it('should call service to refresh views', async () => {
      service.refreshAnalyticsViews.mockResolvedValue(undefined);

      const result = await controller.refreshViews();

      expect(service.refreshAnalyticsViews).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Analytics views refreshed successfully' });
    });
  });

  // ============== ADDITIONAL BRANCH COVERAGE ==============

  describe('exportBookings — filename sanitization', () => {
    it('should sanitize special characters in from date', async () => {
      const csvData = 'id,date\n1,2026-03-01';
      service.exportBookings.mockResolvedValue(csvData as never);

      const mockRes = { setHeader: jest.fn(), send: jest.fn() };
      const dto = { from: '2026-03-01T10:30:00Z', to: '2026-03-31', format: 'csv' as const };

      await controller.exportBookings(TENANT_ID, mockRes as never, dto as never);

      const dispCall = (mockRes.setHeader as jest.Mock).mock.calls.find(
        c => c[0] === 'Content-Disposition',
      );
      expect(dispCall[1]).toMatch(/bookings_/);
    });

    it('should sanitize special characters in to date', async () => {
      const csvData = 'data';
      service.exportBookings.mockResolvedValue(csvData as never);

      const mockRes = { setHeader: jest.fn(), send: jest.fn() };
      const dto = { from: '2026-03-01', to: '2026-03-31T23:59:59Z', format: 'csv' as const };

      await controller.exportBookings(TENANT_ID, mockRes as never, dto as never);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('bookings_'),
      );
    });

    it('should handle hyphens and underscores in filenames', async () => {
      const csvData = 'id,date\n1,2026-03-01';
      service.exportBookings.mockResolvedValue(csvData as never);

      const mockRes = { setHeader: jest.fn(), send: jest.fn() };
      const dto = { from: '2026-03-01', to: '2026-03-31', format: 'csv' as const };

      await controller.exportBookings(TENANT_ID, mockRes as never, dto as never);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('.csv'),
      );
    });
  });

  describe('exportInventory — format branching', () => {
    it('should set CSV content-type by default', async () => {
      const csvData = 'id,name\npart-1,Oil';
      service.exportInventory.mockResolvedValue(csvData as never);

      const mockRes = { setHeader: jest.fn(), send: jest.fn() };

      await controller.exportInventory(TENANT_ID, mockRes as never);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    });

    it('should set JSON content-type when JSON format specified', async () => {
      const jsonData = JSON.stringify([{ id: 'part-1' }]);
      service.exportInventory.mockResolvedValue(jsonData as never);

      const mockRes = { setHeader: jest.fn(), send: jest.fn() };

      await controller.exportInventory(TENANT_ID, mockRes as never, 'json');

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    });

    it('should include current date in inventory filename', async () => {
      const csvData = 'data';
      service.exportInventory.mockResolvedValue(csvData as never);

      const mockRes = { setHeader: jest.fn(), send: jest.fn() };

      await controller.exportInventory(TENANT_ID, mockRes as never, 'csv');

      const dispCall = (mockRes.setHeader as jest.Mock).mock.calls.find(
        c => c[0] === 'Content-Disposition',
      );
      expect(dispCall[1]).toContain('inventory_');
      expect(dispCall[1]).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  describe('exportRevenue — year extraction from date', () => {
    it('should extract 2026 when from year is 2026', async () => {
      const csvData = 'month,revenue';
      service.exportRevenue.mockResolvedValue(csvData as never);

      const mockRes = { setHeader: jest.fn(), send: jest.fn() };
      const dto = { from: '2026-03-15', to: '2026-12-31', format: 'csv' as const };

      await controller.exportRevenue(TENANT_ID, mockRes as never, dto as never);

      expect(service.exportRevenue).toHaveBeenCalledWith(TENANT_ID, 2026, 'csv');
    });

    it('should extract 2025 when from year is 2025', async () => {
      const csvData = 'data';
      service.exportRevenue.mockResolvedValue(csvData as never);

      const mockRes = { setHeader: jest.fn(), send: jest.fn() };
      const dto = { from: '2025-06-01', to: '2025-12-31', format: 'csv' as const };

      await controller.exportRevenue(TENANT_ID, mockRes as never, dto as never);

      expect(service.exportRevenue).toHaveBeenCalledWith(TENANT_ID, 2025, 'csv');
    });

    it('should set correct content-type for JSON format', async () => {
      const jsonData = JSON.stringify({ months: [] });
      service.exportRevenue.mockResolvedValue(jsonData as never);

      const mockRes = { setHeader: jest.fn(), send: jest.fn() };
      const dto = { from: '2026-01-01', to: '2026-12-31', format: 'json' as const };

      await controller.exportRevenue(TENANT_ID, mockRes as never, dto as never);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    });
  });

  describe('getBookingMetrics — date parsing', () => {
    it('should parse ISO date strings to Date objects', async () => {
      const metrics = { bookings: [] };
      service.getBookingMetrics.mockResolvedValue(metrics as never);

      const dto = { from: '2026-01-15T08:00:00Z', to: '2026-01-31T23:59:59Z' };

      await controller.getBookingMetrics(TENANT_ID, dto as never);

      expect(service.getBookingMetrics).toHaveBeenCalledWith(
        TENANT_ID,
        expect.any(Date),
        expect.any(Date),
      );
    });

    it('should pass dates to service in correct order', async () => {
      const metrics = { bookings: [] };
      service.getBookingMetrics.mockResolvedValue(metrics as never);

      const dto = { from: '2026-03-01', to: '2026-03-31' };

      await controller.getBookingMetrics(TENANT_ID, dto as never);

      const calls = service.getBookingMetrics.mock.calls[0];
      expect(calls[1].getTime()).toBeLessThan(calls[2].getTime());
    });
  });

  describe('getRevenueAnalytics — parameter passing', () => {
    it('should pass year and month parameters correctly', async () => {
      const revenue = { monthly: [] };
      service.getRevenueAnalytics.mockResolvedValue(revenue as never);

      const dto = { year: 2026, month: 5 };

      await controller.getRevenueAnalytics(TENANT_ID, dto as never);

      expect(service.getRevenueAnalytics).toHaveBeenCalledWith(TENANT_ID, 2026, 5);
    });

    it('should handle month 12 (December)', async () => {
      const revenue = { monthly: [] };
      service.getRevenueAnalytics.mockResolvedValue(revenue as never);

      const dto = { year: 2026, month: 12 };

      await controller.getRevenueAnalytics(TENANT_ID, dto as never);

      expect(service.getRevenueAnalytics).toHaveBeenCalledWith(TENANT_ID, 2026, 12);
    });

    it('should handle month 1 (January)', async () => {
      const revenue = { monthly: [] };
      service.getRevenueAnalytics.mockResolvedValue(revenue as never);

      const dto = { year: 2026, month: 1 };

      await controller.getRevenueAnalytics(TENANT_ID, dto as never);

      expect(service.getRevenueAnalytics).toHaveBeenCalledWith(TENANT_ID, 2026, 1);
    });
  });

  describe('getServicePopularity — year only', () => {
    it('should pass only year parameter (not month)', async () => {
      const popularity = { services: [] };
      service.getServicePopularity.mockResolvedValue(popularity as never);

      const dto = { year: 2026, month: 3 };

      await controller.getServicePopularity(TENANT_ID, dto as never);

      expect(service.getServicePopularity).toHaveBeenCalledWith(TENANT_ID, 2026);
      expect(service.getServicePopularity).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        3,
      );
    });
  });

  describe('getMechanicPerformance — year and month', () => {
    it('should pass both year and month to service', async () => {
      const perf = { mechanics: [] };
      service.getMechanicPerformance.mockResolvedValue(perf as never);

      const dto = { year: 2026, month: 7 };

      await controller.getMechanicPerformance(TENANT_ID, dto as never);

      expect(service.getMechanicPerformance).toHaveBeenCalledWith(TENANT_ID, 2026, 7);
    });
  });

  describe('getInventoryStatus — status parameter handling', () => {
    it('should accept and pass LOW_STOCK status', async () => {
      service.getInventoryStatus.mockResolvedValue([]);

      await controller.getInventoryStatus(TENANT_ID, 'LOW_STOCK');

      expect(service.getInventoryStatus).toHaveBeenCalledWith(TENANT_ID, 'LOW_STOCK');
    });

    it('should accept and pass REORDER status', async () => {
      service.getInventoryStatus.mockResolvedValue([]);

      await controller.getInventoryStatus(TENANT_ID, 'REORDER');

      expect(service.getInventoryStatus).toHaveBeenCalledWith(TENANT_ID, 'REORDER');
    });

    it('should accept and pass OK status', async () => {
      service.getInventoryStatus.mockResolvedValue([]);

      await controller.getInventoryStatus(TENANT_ID, 'OK');

      expect(service.getInventoryStatus).toHaveBeenCalledWith(TENANT_ID, 'OK');
    });

    it('should handle undefined status when not provided', async () => {
      service.getInventoryStatus.mockResolvedValue([]);

      await controller.getInventoryStatus(TENANT_ID);

      expect(service.getInventoryStatus).toHaveBeenCalledWith(TENANT_ID, undefined);
    });
  });

  describe('getKpiDashboard — date range handling', () => {
    it('should parse ISO date strings correctly', async () => {
      const kpiService = module.get(KpiService) as jest.Mocked<KpiService>;
      kpiService.getDashboardKpi.mockResolvedValue({ revenue: 1000 } as never);

      const from = '2026-03-01T00:00:00Z';
      const to = '2026-03-31T23:59:59Z';

      await controller.getKpiDashboard(TENANT_ID, from, to);

      expect(kpiService.getDashboardKpi).toHaveBeenCalledWith(
        TENANT_ID,
        expect.any(Date),
        expect.any(Date),
      );
    });

    it('should wrap result in success response object', async () => {
      const kpiService = module.get(KpiService) as jest.Mocked<KpiService>;
      const kpiData = { revenue: 5000, bookings: 20 };
      kpiService.getDashboardKpi.mockResolvedValue(kpiData as never);

      const result = await controller.getKpiDashboard(TENANT_ID, '2026-03-01', '2026-03-31');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(kpiData);
    });
  });

  // ============== RESPONSE FORMAT BRANCHES ==============

  describe('search — response wrapping', () => {
    it('should return success=true with wrapped data and total meta', async () => {
      const searchService = module.get(SearchService) as jest.Mocked<SearchService>;
      searchService.search.mockResolvedValue({
        results: [
          { id: '1', type: 'booking' },
          { id: '2', type: 'customer' },
        ],
        total: 2,
      } as never);

      const result = await controller.search(TENANT_ID, 'booking');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('should handle empty search results', async () => {
      const searchService = module.get(SearchService) as jest.Mocked<SearchService>;
      searchService.search.mockResolvedValue({ results: [], total: 0 } as never);

      const result = await controller.search(TENANT_ID, 'xyz');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('exportBookings — error handling with dates', () => {
    it('should parse dates from from and to fields separately', async () => {
      service.exportBookings.mockResolvedValue('csv data' as never);
      const mockRes = { setHeader: jest.fn(), send: jest.fn() };
      const dto = {
        from: '2026-01-01',
        to: '2026-12-31',
        format: 'csv' as const,
      };

      await controller.exportBookings(TENANT_ID, mockRes as never, dto as never);

      const calls = service.exportBookings.mock.calls[0];
      expect(calls[0]).toBe(TENANT_ID);
      expect(calls[1]).toEqual(new Date('2026-01-01'));
      expect(calls[2]).toEqual(new Date('2026-12-31'));
      expect(calls[3]).toBe('csv');
    });

    it('should sanitize from date with special characters in filename', async () => {
      service.exportBookings.mockResolvedValue('data' as never);
      const mockRes = { setHeader: jest.fn(), send: jest.fn() };
      const dto = {
        from: '2026-01-01T10:30:45Z',
        to: '2026-12-31',
        format: 'csv' as const,
      };

      await controller.exportBookings(TENANT_ID, mockRes as never, dto as never);

      const dispCall = (mockRes.setHeader as jest.Mock).mock.calls.find(
        c => c[0] === 'Content-Disposition',
      );
      // Date input passes through sanitizeFilenameSegment
      expect(dispCall[1]).toMatch(/bookings_/);
      expect(dispCall[1]).toMatch(/\.csv/);
    });
  });

  describe('exportRevenue — year extraction and format handling', () => {
    it('should extract year correctly from various from dates', async () => {
      service.exportRevenue.mockResolvedValue('data' as never);
      const mockRes = { setHeader: jest.fn(), send: jest.fn() };

      const dto2025 = { from: '2025-06-15', to: '2025-12-31', format: 'csv' as const };
      await controller.exportRevenue(TENANT_ID, mockRes as never, dto2025 as never);

      expect(service.exportRevenue).toHaveBeenCalledWith(TENANT_ID, 2025, 'csv');
    });

    it('should handle leap year dates in export', async () => {
      service.exportRevenue.mockResolvedValue('data' as never);
      const mockRes = { setHeader: jest.fn(), send: jest.fn() };

      const dtoLeap = { from: '2024-02-29', to: '2024-12-31', format: 'csv' as const };
      await controller.exportRevenue(TENANT_ID, mockRes as never, dtoLeap as never);

      expect(service.exportRevenue).toHaveBeenCalledWith(TENANT_ID, 2024, 'csv');
    });

    it('should send correct Content-Type for CSV', async () => {
      service.exportRevenue.mockResolvedValue('csv,data' as never);
      const mockRes = { setHeader: jest.fn(), send: jest.fn() };
      const dto = { from: '2026-01-01', to: '2026-12-31', format: 'csv' as const };

      await controller.exportRevenue(TENANT_ID, mockRes as never, dto as never);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    });

    it('should send correct Content-Type for JSON', async () => {
      service.exportRevenue.mockResolvedValue('{}' as never);
      const mockRes = { setHeader: jest.fn(), send: jest.fn() };
      const dto = { from: '2026-01-01', to: '2026-12-31', format: 'json' as const };

      await controller.exportRevenue(TENANT_ID, mockRes as never, dto as never);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    });
  });

  describe('exportInventory — format and filename', () => {
    it('should include ISO date in inventory filename', async () => {
      service.exportInventory.mockResolvedValue('part,qty\nP1,100' as never);
      const mockRes = { setHeader: jest.fn(), send: jest.fn() };

      await controller.exportInventory(TENANT_ID, mockRes as never, 'csv');

      const dispCall = (mockRes.setHeader as jest.Mock).mock.calls.find(
        c => c[0] === 'Content-Disposition',
      );
      expect(dispCall[1]).toMatch(/inventory_\d{4}-\d{2}-\d{2}/);
    });

    it('should use CSV as default format when undefined', async () => {
      service.exportInventory.mockResolvedValue('data' as never);
      const mockRes = { setHeader: jest.fn(), send: jest.fn() };

      await controller.exportInventory(TENANT_ID, mockRes as never);

      expect(service.exportInventory).toHaveBeenCalledWith(TENANT_ID, 'csv');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    });

    it('should handle JSON export for inventory', async () => {
      const jsonData = JSON.stringify([{ id: 'part-1', name: 'Oil', qty: 50 }]);
      service.exportInventory.mockResolvedValue(jsonData as never);
      const mockRes = { setHeader: jest.fn(), send: jest.fn() };

      await controller.exportInventory(TENANT_ID, mockRes as never, 'json');

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(mockRes.send).toHaveBeenCalledWith(jsonData);
    });
  });

  describe('endpoint integration — error paths', () => {
    it('getDashboardKpis should pass tenantId directly to service', async () => {
      service.getDashboardKpis.mockResolvedValue({ revenue: 1000 } as never);

      await controller.getDashboardKpis(TENANT_ID);

      expect(service.getDashboardKpis).toHaveBeenCalledWith(TENANT_ID);
      expect(service.getDashboardKpis).toHaveBeenCalledTimes(1);
    });

    it('getDashboardSummary should delegate to getDashboardKpis service method', async () => {
      service.getDashboardKpis.mockResolvedValue({
        clientiTotali: 100,
        veicoliTotali: 150,
      } as never);

      const result = await controller.getDashboardSummary(TENANT_ID);

      expect(service.getDashboardKpis).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual(expect.objectContaining({ clientiTotali: 100 }));
    });

    it('getCustomKPIs should delegate to service', async () => {
      service.getCustomKPIs.mockResolvedValue({ metric1: 50 } as never);

      const result = await controller.getCustomKPIs(TENANT_ID);

      expect(service.getCustomKPIs).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual({ metric1: 50 });
    });
  });

  describe('parameter handling — edge cases', () => {
    it('getTopCustomers should pass limit correctly', async () => {
      service.getTopCustomers.mockResolvedValue([]);
      const dto = { limit: 50 };

      await controller.getTopCustomers(TENANT_ID, dto as never);

      expect(service.getTopCustomers).toHaveBeenCalledWith(TENANT_ID, 50);
    });

    it('getServicePopularity should pass only year (not month)', async () => {
      service.getServicePopularity.mockResolvedValue([]);
      const dto = { year: 2026, month: 6 };

      await controller.getServicePopularity(TENANT_ID, dto as never);

      expect(service.getServicePopularity).toHaveBeenCalledWith(TENANT_ID, 2026);
    });

    it('getMechanicPerformance should pass both year and month', async () => {
      service.getMechanicPerformance.mockResolvedValue([]);
      const dto = { year: 2026, month: 11 };

      await controller.getMechanicPerformance(TENANT_ID, dto as never);

      expect(service.getMechanicPerformance).toHaveBeenCalledWith(TENANT_ID, 2026, 11);
    });
  });

  describe('getInventoryStatus — status filter logic', () => {
    it('should pass LOW_STOCK status when provided', async () => {
      service.getInventoryStatus.mockResolvedValue([]);

      await controller.getInventoryStatus(TENANT_ID, 'LOW_STOCK');

      expect(service.getInventoryStatus).toHaveBeenCalledWith(TENANT_ID, 'LOW_STOCK');
    });

    it('should pass REORDER status when provided', async () => {
      service.getInventoryStatus.mockResolvedValue([]);

      await controller.getInventoryStatus(TENANT_ID, 'REORDER');

      expect(service.getInventoryStatus).toHaveBeenCalledWith(TENANT_ID, 'REORDER');
    });

    it('should pass OK status when provided', async () => {
      service.getInventoryStatus.mockResolvedValue([]);

      await controller.getInventoryStatus(TENANT_ID, 'OK');

      expect(service.getInventoryStatus).toHaveBeenCalledWith(TENANT_ID, 'OK');
    });

    it('should pass undefined status when not provided', async () => {
      service.getInventoryStatus.mockResolvedValue([]);

      await controller.getInventoryStatus(TENANT_ID);

      expect(service.getInventoryStatus).toHaveBeenCalledWith(TENANT_ID, undefined);
    });

    it('should return data from service directly', async () => {
      const mockData = [
        { partId: 'P1', status: 'LOW_STOCK' },
        { partId: 'P2', status: 'OK' },
      ];
      service.getInventoryStatus.mockResolvedValue(mockData as never);

      const result = await controller.getInventoryStatus(TENANT_ID, 'LOW_STOCK');

      expect(result).toEqual(mockData);
    });
  });

  describe('refreshViews — admin operation', () => {
    it('should call refreshAnalyticsViews on service', async () => {
      service.refreshAnalyticsViews.mockResolvedValue(undefined);

      await controller.refreshViews();

      expect(service.refreshAnalyticsViews).toHaveBeenCalledTimes(1);
    });

    it('should return success message after refresh', async () => {
      service.refreshAnalyticsViews.mockResolvedValue(undefined);

      const result = await controller.refreshViews();

      expect(result.message).toBe('Analytics views refreshed successfully');
    });
  });

  describe('date conversion edge cases', () => {
    it('should handle ISO date string with milliseconds', async () => {
      const metrics = {};
      service.getBookingMetrics.mockResolvedValue(metrics as never);
      const dto = { from: '2026-03-01T10:30:45.123Z', to: '2026-03-31T18:45:30.999Z' };

      await controller.getBookingMetrics(TENANT_ID, dto as never);

      expect(service.getBookingMetrics).toHaveBeenCalledWith(
        TENANT_ID,
        expect.any(Date),
        expect.any(Date),
      );
    });

    it('getKpiDashboard should parse basic ISO dates', async () => {
      const kpiService = module.get(KpiService) as jest.Mocked<KpiService>;
      kpiService.getDashboardKpi.mockResolvedValue({ data: 'test' } as never);

      const result = await controller.getKpiDashboard(TENANT_ID, '2026-03-01', '2026-03-31');

      expect(result.success).toBe(true);
      expect(kpiService.getDashboardKpi).toHaveBeenCalled();
    });
  });
});
