import { Test, TestingModule } from '@nestjs/testing';
import { KpiService } from './kpi.service';
import { PrismaService } from '../../common/services/prisma.service';

const mockPrisma = {
  invoice: { aggregate: jest.fn() },
  workOrder: { findMany: jest.fn(), aggregate: jest.fn() },
  estimate: { count: jest.fn() },
  serviceBay: { count: jest.fn() },
  technician: { count: jest.fn() },
  technicianTimeLog: { aggregate: jest.fn() },
  customer: { count: jest.fn() },
  $queryRaw: jest.fn(),
};

/** Return default empty/zero mocks for all Prisma calls */
function setupEmptyMocks(): void {
  mockPrisma.invoice.aggregate.mockResolvedValue({
    _sum: { total: null },
    _count: 0,
  });
  mockPrisma.workOrder.findMany.mockResolvedValue([]);
  mockPrisma.workOrder.aggregate.mockResolvedValue({
    _sum: { laborHours: null },
  });
  mockPrisma.estimate.count.mockResolvedValue(0);
  mockPrisma.serviceBay.count.mockResolvedValue(0);
  mockPrisma.technician.count.mockResolvedValue(0);
  mockPrisma.technicianTimeLog.aggregate.mockResolvedValue({
    _sum: { durationMinutes: null },
  });
  mockPrisma.customer.count.mockResolvedValue(0);
  // $queryRaw is called 4 times: retention, topServices, topCustomers, revenueByMonth
  mockPrisma.$queryRaw
    .mockResolvedValueOnce([{ cnt: BigInt(0) }]) // retention
    .mockResolvedValueOnce([]) // topServices
    .mockResolvedValueOnce([]) // topCustomers
    .mockResolvedValueOnce([]); // revenueByMonth
}

describe('KpiService', () => {
  let service: KpiService;

  const tenantId = '550e8400-e29b-41d4-a716-446655440000';
  const dateFrom = new Date('2026-01-01');
  const dateTo = new Date('2026-03-31');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KpiService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<KpiService>(KpiService);
    jest.clearAllMocks();
    setupEmptyMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calculate ARO correctly (total revenue / invoice count)', async () => {
    mockPrisma.invoice.aggregate.mockResolvedValue({
      _sum: { total: 5000 },
      _count: 10,
    });

    const result = await service.getDashboardKpi(tenantId, dateFrom, dateTo);

    expect(result.aro).toBe(500);
  });

  it('should return 0 for all metrics with no data', async () => {
    const result = await service.getDashboardKpi(tenantId, dateFrom, dateTo);

    expect(result.aro).toBe(0);
    expect(result.carCount).toBe(0);
    expect(result.closeRate).toBe(0);
    expect(result.revenuePerBay).toBe(0);
    expect(result.revenuePerTechnician).toBe(0);
    expect(result.techEfficiency).toBe(0);
    expect(result.averageCycleTime).toBe(0);
    expect(result.customerRetentionRate).toBe(0);
    expect(result.topServices).toEqual([]);
    expect(result.topCustomers).toEqual([]);
    expect(result.revenueByMonth).toEqual([]);
  });

  it('should calculate close rate from estimates', async () => {
    // First call: accepted count, second call: total sent count
    mockPrisma.estimate.count
      .mockResolvedValueOnce(7) // accepted
      .mockResolvedValueOnce(10); // sent

    const result = await service.getDashboardKpi(tenantId, dateFrom, dateTo);

    expect(result.closeRate).toBe(70);
  });

  it('should calculate tech efficiency from labor logs', async () => {
    // Billed hours from work orders
    mockPrisma.workOrder.aggregate.mockResolvedValue({
      _sum: { laborHours: 80 },
    });
    // Worked minutes from time logs (100 hours = 6000 minutes)
    mockPrisma.technicianTimeLog.aggregate.mockResolvedValue({
      _sum: { durationMinutes: 6000 },
    });

    const result = await service.getDashboardKpi(tenantId, dateFrom, dateTo);

    // 80 billed / 100 worked = 80%
    expect(result.techEfficiency).toBe(80);
  });

  it('should calculate average cycle time from work orders', async () => {
    const start = new Date('2026-01-10T08:00:00Z');
    const end = new Date('2026-01-10T14:00:00Z'); // 6 hours later

    // The first findMany call is for carCount (distinct vehicles),
    // second is for cycleTimeStats
    mockPrisma.workOrder.findMany
      .mockResolvedValueOnce([]) // carCount
      .mockResolvedValueOnce([{ actualStartTime: start, actualCompletionTime: end }]);

    const result = await service.getDashboardKpi(tenantId, dateFrom, dateTo);

    expect(result.averageCycleTime).toBe(6);
  });

  it('should calculate car count from unique vehicles', async () => {
    mockPrisma.workOrder.findMany
      .mockResolvedValueOnce([{ vehicleId: 'v-1' }, { vehicleId: 'v-2' }, { vehicleId: 'v-3' }]) // carCount
      .mockResolvedValueOnce([]); // cycleTimeStats

    const result = await service.getDashboardKpi(tenantId, dateFrom, dateTo);

    expect(result.carCount).toBe(3);
  });

  it('should calculate customer retention rate', async () => {
    mockPrisma.customer.count.mockResolvedValue(100);
    // Reset $queryRaw and set up fresh chain for this test
    mockPrisma.$queryRaw.mockReset();
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ cnt: BigInt(25) }]) // retention
      .mockResolvedValueOnce([]) // topServices
      .mockResolvedValueOnce([]) // topCustomers
      .mockResolvedValueOnce([]); // revenueByMonth

    const result = await service.getDashboardKpi(tenantId, dateFrom, dateTo);

    expect(result.customerRetentionRate).toBe(25);
  });

  it('should calculate revenuePerBay when bays > 0', async () => {
    mockPrisma.invoice.aggregate.mockResolvedValue({
      _sum: { total: 10000 },
      _count: 5,
    });
    mockPrisma.serviceBay.count.mockResolvedValue(4);

    const result = await service.getDashboardKpi(tenantId, dateFrom, dateTo);

    expect(result.revenuePerBay).toBe(2500);
  });

  it('should calculate revenuePerTechnician when techs > 0', async () => {
    mockPrisma.invoice.aggregate.mockResolvedValue({
      _sum: { total: 9000 },
      _count: 3,
    });
    mockPrisma.technician.count.mockResolvedValue(3);

    const result = await service.getDashboardKpi(tenantId, dateFrom, dateTo);

    expect(result.revenuePerTechnician).toBe(3000);
  });

  it('should map topServices with null revenue/count', async () => {
    mockPrisma.$queryRaw.mockReset();
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ cnt: BigInt(0) }]) // retention
      .mockResolvedValueOnce([
        { name: 'Oil Change', revenue: null, count: null },
        { name: 'Brake Service', revenue: BigInt(5000), count: BigInt(10) },
      ]) // topServices
      .mockResolvedValueOnce([]) // topCustomers
      .mockResolvedValueOnce([]); // revenueByMonth

    const result = await service.getDashboardKpi(tenantId, dateFrom, dateTo);

    expect(result.topServices).toEqual([
      { name: 'Oil Change', revenue: 0, count: 0 },
      { name: 'Brake Service', revenue: 5000, count: 10 },
    ]);
  });

  it('should map topCustomers with null name falling back to Unknown', async () => {
    mockPrisma.$queryRaw.mockReset();
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ cnt: BigInt(0) }]) // retention
      .mockResolvedValueOnce([]) // topServices
      .mockResolvedValueOnce([
        { name: null, revenue: BigInt(3000), visits: BigInt(5) },
        { name: 'Mario', revenue: null, visits: null },
      ]) // topCustomers
      .mockResolvedValueOnce([]); // revenueByMonth

    const result = await service.getDashboardKpi(tenantId, dateFrom, dateTo);

    expect(result.topCustomers).toEqual([
      { name: 'Unknown', revenue: 3000, visits: 5 },
      { name: 'Mario', revenue: 0, visits: 0 },
    ]);
  });

  it('should map revenueByMonth with BigInt revenue', async () => {
    mockPrisma.$queryRaw.mockReset();
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ cnt: BigInt(0) }]) // retention
      .mockResolvedValueOnce([]) // topServices
      .mockResolvedValueOnce([]) // topCustomers
      .mockResolvedValueOnce([
        { month: '2026-01', revenue: BigInt(10000) },
        { month: '2026-02', revenue: null },
      ]); // revenueByMonth

    const result = await service.getDashboardKpi(tenantId, dateFrom, dateTo);

    expect(result.revenueByMonth).toEqual([
      { month: '2026-01', revenue: 10000 },
      { month: '2026-02', revenue: 0 },
    ]);
  });

  it('should calculate average cycle time from multiple work orders', async () => {
    const start1 = new Date('2026-01-10T08:00:00Z');
    const end1 = new Date('2026-01-10T12:00:00Z'); // 4 hours
    const start2 = new Date('2026-01-11T09:00:00Z');
    const end2 = new Date('2026-01-11T17:00:00Z'); // 8 hours

    mockPrisma.workOrder.findMany
      .mockResolvedValueOnce([]) // carCount
      .mockResolvedValueOnce([
        { actualStartTime: start1, actualCompletionTime: end1 },
        { actualStartTime: start2, actualCompletionTime: end2 },
      ]);

    const result = await service.getDashboardKpi(tenantId, dateFrom, dateTo);

    // average = (4 + 8) / 2 = 6
    expect(result.averageCycleTime).toBe(6);
  });
});
