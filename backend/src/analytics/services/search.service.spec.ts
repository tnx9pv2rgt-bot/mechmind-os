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

  // ============== ADDITIONAL BRANCH COVERAGE ==============

  it('should handle null vehicle reference in work orders', async () => {
    mockPrisma.workOrder.findMany.mockResolvedValue([
      {
        id: 'wo-1',
        woNumber: 'WO-001',
        status: 'COMPLETED',
        vehicle: null, // null vehicle reference
      },
    ]);

    const result = await service.search(tenantId, 'WO-001');

    expect(result.results).toHaveLength(1);
    expect(result.results[0].subtitle).toBe('COMPLETED — ');
  });

  it('should handle missing vehicle data in work order subtitle', async () => {
    mockPrisma.workOrder.findMany.mockResolvedValue([
      {
        id: 'wo-2',
        woNumber: 'WO-2026-002',
        status: 'IN_PROGRESS',
        vehicle: { licensePlate: 'XYZ789' },
      },
    ]);

    const result = await service.search(tenantId, 'WO-2026');

    expect(result.results[0].subtitle).toBe('IN_PROGRESS — XYZ789');
  });

  it('should search work orders by diagnosis', async () => {
    mockPrisma.workOrder.findMany.mockResolvedValue([
      {
        id: 'wo-3',
        woNumber: 'WO-001',
        status: 'PENDING',
        diagnosis: 'Engine knock detected',
        vehicle: { licensePlate: 'AB123' },
      },
    ]);

    const result = await service.search(tenantId, 'Engine');

    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe('workOrder');
  });

  it('should search vehicles by VIN', async () => {
    mockPrisma.vehicle.findMany.mockResolvedValue([
      {
        id: 'v-1',
        licensePlate: 'AB123CD',
        make: 'Fiat',
        model: 'Tipo',
        vin: 'WFZZZ3000000',
      },
    ]);

    const result = await service.search(tenantId, 'WFZZZ');

    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe('vehicle');
  });

  it('should search vehicles by make', async () => {
    mockPrisma.vehicle.findMany.mockResolvedValue([
      {
        id: 'v-2',
        licensePlate: 'CD456EF',
        make: 'BMW',
        model: '320',
        vin: null,
      },
    ]);

    const result = await service.search(tenantId, 'BMW');

    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe('vehicle');
  });

  it('should search vehicles by model', async () => {
    mockPrisma.vehicle.findMany.mockResolvedValue([
      {
        id: 'v-3',
        licensePlate: 'GH789IJ',
        make: 'Mercedes',
        model: 'E-Class',
        vin: null,
      },
    ]);

    const result = await service.search(tenantId, 'E-Class');

    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toBe('Mercedes E-Class');
  });

  it('should search bookings by notes', async () => {
    mockPrisma.booking.findMany.mockResolvedValue([
      {
        id: 'b-1234567890abcd',
        status: 'CONFIRMED',
        scheduledDate: new Date('2026-04-15'),
        notes: 'Urgent maintenance needed',
      },
    ]);

    const result = await service.search(tenantId, 'Urgent');

    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe('booking');
    expect(result.results[0].score).toBe(50);
  });

  it('should format booking dates correctly in results', async () => {
    mockPrisma.booking.findMany.mockResolvedValue([
      {
        id: 'b-9876543210xyz',
        status: 'PENDING',
        scheduledDate: new Date('2026-05-20T14:30:00Z'),
        notes: 'test',
      },
    ]);

    const result = await service.search(tenantId, 'test');

    expect(result.results[0].subtitle).toContain('2026-05-20');
  });

  it('should truncate booking IDs to 8 chars in title', async () => {
    mockPrisma.booking.findMany.mockResolvedValue([
      {
        id: 'b-verylongbookingid12345',
        status: 'CONFIRMED',
        scheduledDate: new Date('2026-03-20'),
        notes: 'test',
      },
    ]);

    const result = await service.search(tenantId, 'test');

    expect(result.results[0].title).toBe('Booking b-verylo');
  });

  it('should return parallel search results in correct order', async () => {
    mockPrisma.vehicle.findMany.mockResolvedValue([
      {
        id: 'v-1',
        licensePlate: 'EXACT-MATCH',
        make: 'Fiat',
        model: 'Punto',
        vin: null,
      },
    ]);
    mockPrisma.workOrder.findMany.mockResolvedValue([
      {
        id: 'wo-1',
        woNumber: 'WO-001',
        status: 'PENDING',
        vehicle: { licensePlate: 'AB123' },
      },
    ]);
    mockPrisma.invoice.findMany.mockResolvedValue([
      { id: 'inv-1', invoiceNumber: 'INV-001', total: 100, status: 'PAID' },
    ]);
    mockPrisma.booking.findMany.mockResolvedValue([]);

    const result = await service.search(tenantId, 'test');

    // Vehicles (score 80) should come before work orders (70) before invoices (70) before bookings (50)
    if (result.results.length > 1) {
      let prevScore = 101;
      for (const r of result.results) {
        expect(r.score).toBeLessThanOrEqual(prevScore);
        prevScore = r.score;
      }
    }
  });

  it('should handle case-insensitive license plate exact match', async () => {
    mockPrisma.vehicle.findMany.mockResolvedValue([
      {
        id: 'v-1',
        licensePlate: 'AB123CD',
        make: 'Fiat',
        model: 'Punto',
        vin: null,
      },
    ]);

    const result = await service.search(tenantId, 'ab123cd');

    expect(result.results[0].score).toBe(100);
  });

  it('should treat partial license plate match as score 80', async () => {
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

    expect(result.results[0].score).toBe(80);
  });

  it('should trim whitespace from query', async () => {
    mockPrisma.vehicle.findMany.mockResolvedValue([
      {
        id: 'v-1',
        licensePlate: 'AB123CD',
        make: 'Fiat',
        model: 'Punto',
        vin: null,
      },
    ]);

    const result = await service.search(tenantId, '  AB123  ');

    expect(result.results).toHaveLength(1);
  });

  it('should return correct total count', async () => {
    mockPrisma.vehicle.findMany.mockResolvedValue([
      { id: 'v-1', licensePlate: 'AB', make: 'F', model: 'P', vin: null },
      { id: 'v-2', licensePlate: 'CD', make: 'M', model: 'E', vin: null },
    ]);

    const result = await service.search(tenantId, 'test');

    expect(result.total).toBe(2);
    expect(result.results.length).toBe(result.total);
  });

  it('should include invoice status in subtitle', async () => {
    mockPrisma.invoice.findMany.mockResolvedValue([
      {
        id: 'inv-1',
        invoiceNumber: 'INV-2026-001',
        total: 500.5,
        status: 'UNPAID',
      },
    ]);

    const result = await service.search(tenantId, 'INV-2026');

    expect(result.results[0].subtitle).toContain('UNPAID');
    expect(result.results[0].subtitle).toContain('500.5');
  });

  it('should call prisma with tenantId in customer filter for vehicles', async () => {
    mockPrisma.vehicle.findMany.mockResolvedValue([]);

    await service.search(tenantId, 'query');

    expect(mockPrisma.vehicle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          customer: { tenantId },
        }),
      }),
    );
  });

  it('should call prisma with tenantId for work orders', async () => {
    mockPrisma.workOrder.findMany.mockResolvedValue([]);

    await service.search(tenantId, 'query');

    expect(mockPrisma.workOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId }),
      }),
    );
  });

  it('should call prisma with tenantId for invoices', async () => {
    mockPrisma.invoice.findMany.mockResolvedValue([]);

    await service.search(tenantId, 'query');

    expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId }),
      }),
    );
  });

  it('should call prisma with tenantId for bookings', async () => {
    mockPrisma.booking.findMany.mockResolvedValue([]);

    await service.search(tenantId, 'query');

    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId }),
      }),
    );
  });
});
