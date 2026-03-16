import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '../../common/services/prisma.service';

const mockPrisma = {
  vehicle: { findMany: jest.fn() },
  workOrder: { findMany: jest.fn() },
  invoice: { findMany: jest.fn() },
  booking: { findMany: jest.fn() },
};

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<SearchService>(SearchService);
    jest.clearAllMocks();

    // Default: return empty arrays
    mockPrisma.vehicle.findMany.mockResolvedValue([]);
    mockPrisma.workOrder.findMany.mockResolvedValue([]);
    mockPrisma.invoice.findMany.mockResolvedValue([]);
    mockPrisma.booking.findMany.mockResolvedValue([]);
  });

  const tenantId = '550e8400-e29b-41d4-a716-446655440000';

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return empty for short query', async () => {
    const result = await service.search(tenantId, 'a');
    expect(result).toEqual({ results: [], total: 0 });
    expect(mockPrisma.vehicle.findMany).not.toHaveBeenCalled();
  });

  it('should return empty for empty query', async () => {
    const result = await service.search(tenantId, '');
    expect(result).toEqual({ results: [], total: 0 });
  });

  it('should search vehicles by license plate', async () => {
    mockPrisma.vehicle.findMany.mockResolvedValue([
      {
        id: 'v-1',
        licensePlate: 'AB123CD',
        make: 'Fiat',
        model: 'Punto',
        vin: null,
      },
    ]);

    const result = await service.search(tenantId, 'AB123');

    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toEqual({
      type: 'vehicle',
      id: 'v-1',
      title: 'Fiat Punto',
      subtitle: 'AB123CD',
      score: 80,
    });
    expect(result.total).toBe(1);
  });

  it('should give exact license plate match score 100', async () => {
    mockPrisma.vehicle.findMany.mockResolvedValue([
      {
        id: 'v-1',
        licensePlate: 'AB123CD',
        make: 'Fiat',
        model: 'Punto',
        vin: null,
      },
    ]);

    const result = await service.search(tenantId, 'AB123CD');

    expect(result.results[0].score).toBe(100);
  });

  it('should search work orders by woNumber', async () => {
    mockPrisma.workOrder.findMany.mockResolvedValue([
      {
        id: 'wo-1',
        woNumber: 'WO-2026-001',
        status: 'IN_PROGRESS',
        vehicle: { licensePlate: 'AB123CD' },
      },
    ]);

    const result = await service.search(tenantId, 'WO-2026');

    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toEqual({
      type: 'workOrder',
      id: 'wo-1',
      title: 'WO-2026-001',
      subtitle: 'IN_PROGRESS — AB123CD',
      score: 70,
    });
  });

  it('should return results sorted by score', async () => {
    mockPrisma.vehicle.findMany.mockResolvedValue([
      {
        id: 'v-1',
        licensePlate: 'TEST',
        make: 'Fiat',
        model: 'Punto',
        vin: null,
      },
    ]);
    mockPrisma.booking.findMany.mockResolvedValue([
      {
        id: 'b-1234567890',
        status: 'CONFIRMED',
        scheduledDate: new Date('2026-03-20'),
        notes: 'test note',
      },
    ]);

    const result = await service.search(tenantId, 'test');

    expect(result.results).toHaveLength(2);
    // Vehicle (score 80) should come before booking (score 50)
    expect(result.results[0].type).toBe('vehicle');
    expect(result.results[1].type).toBe('booking');
    expect(result.results[0].score).toBeGreaterThan(result.results[1].score);
  });

  it('should search invoices by invoiceNumber', async () => {
    mockPrisma.invoice.findMany.mockResolvedValue([
      {
        id: 'inv-1',
        invoiceNumber: 'INV-2026-042',
        total: 350.0,
        status: 'PAID',
      },
    ]);

    const result = await service.search(tenantId, 'INV-2026');

    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe('invoice');
    expect(result.results[0].title).toBe('INV-2026-042');
  });
});
