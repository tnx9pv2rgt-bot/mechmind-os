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
      const summary = { totalRevenue: 10000, totalCustomers: 50 };
      service.getDashboardSummary.mockResolvedValue(summary as never);

      const result = await controller.getDashboardSummary(TENANT_ID);

      expect(service.getDashboardSummary).toHaveBeenCalledWith(TENANT_ID);
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
});
