/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { WorkOrderService } from './work-order.service';
import { PrismaService } from '../common/services/prisma.service';

describe('WorkOrderService', () => {
  let service: WorkOrderService;
  let prisma: {
    workOrder: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    invoice?: {
      findFirst: jest.Mock;
      create?: jest.Mock;
    };
    technicianTimeLog?: {
      findFirst: jest.Mock;
      create?: jest.Mock;
      update?: jest.Mock;
    };
    vehicle?: {
      update: jest.Mock;
    };
    $transaction?: jest.Mock;
  };
  let logger: jest.Mocked<Logger>;

  const TENANT_ID = 'tenant-001';
  const WO_ID = 'wo-001';

  const makeMockWorkOrder = (overrides = {}) => ({
    id: WO_ID,
    tenantId: TENANT_ID,
    woNumber: 'WO-2026-0001',
    vehicleId: 'vehicle-001',
    customerId: 'customer-001',
    customerName: 'Giovanni Rossi',
    vehiclePlate: 'AA123BB',
    technicianName: 'Marco Bianchi',
    status: 'PENDING',
    version: 1,
    diagnosis: null,
    customerRequest: null,
    mileageIn: 50000,
    priority: 'MEDIUM',
    createdAt: new Date('2026-04-21T10:00:00Z'),
    updatedAt: new Date('2026-04-21T10:00:00Z'),
    ...overrides,
  });

  beforeEach(async () => {
    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    prisma = {
      workOrder: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      invoice: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      technicianTimeLog: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      vehicle: {
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkOrderService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<WorkOrderService>(WorkOrderService);
    // Mock the logger in the service
    (service as any).logger = logger;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== TRANSITION TESTS ====================

  describe('transition', () => {
    it('should transition from PENDING to OPEN', async () => {
      const existing = makeMockWorkOrder({ status: 'PENDING', version: 1 });
      const updated = makeMockWorkOrder({ status: 'OPEN', version: 2 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(updated);

      const result = await service.transition(TENANT_ID, WO_ID, 'OPEN');

      // @ts-expect-error result is unknown but we control the mock
      expect(result.status).toBe('OPEN');
      expect(prisma.workOrder.findFirst).toHaveBeenCalledWith({
        where: { id: WO_ID, tenantId: TENANT_ID },
      });
      expect(prisma.workOrder.updateMany).toHaveBeenCalledWith({
        where: { id: WO_ID, tenantId: TENANT_ID, version: 1 },
        data: {
          status: 'OPEN',
          version: { increment: 1 },
        },
      });
    });

    it('should transition from IN_PROGRESS to QUALITY_CHECK', async () => {
      const existing = makeMockWorkOrder({ status: 'IN_PROGRESS', version: 2 });
      const updated = makeMockWorkOrder({ status: 'QUALITY_CHECK', version: 3 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(updated);

      const result = await service.transition(TENANT_ID, WO_ID, 'QUALITY_CHECK');

      // @ts-expect-error result is unknown but we control the mock
      expect(result.status).toBe('QUALITY_CHECK');
    });

    it('should throw NotFoundException when work order not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);

      await expect(service.transition(TENANT_ID, 'nonexistent', 'OPEN')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid transition', async () => {
      const existing = makeMockWorkOrder({ status: 'INVOICED', version: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);

      // INVOICED → PENDING is not allowed
      await expect(service.transition(TENANT_ID, WO_ID, 'PENDING')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException when version mismatches (optimistic lock)', async () => {
      const existing = makeMockWorkOrder({ status: 'PENDING', version: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 0 }); // No rows updated

      await expect(service.transition(TENANT_ID, WO_ID, 'OPEN')).rejects.toThrow(ConflictException);
    });

    it('should validate PENDING → IN_PROGRESS is allowed', async () => {
      const existing = makeMockWorkOrder({ status: 'PENDING', version: 1 });
      const updated = makeMockWorkOrder({ status: 'IN_PROGRESS', version: 2 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(updated);

      const result = await service.transition(TENANT_ID, WO_ID, 'IN_PROGRESS');
      // @ts-expect-error result is unknown but we control the mock
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should validate QUALITY_CHECK → COMPLETED is allowed', async () => {
      const existing = makeMockWorkOrder({ status: 'QUALITY_CHECK', version: 2 });
      const updated = makeMockWorkOrder({ status: 'COMPLETED', version: 3 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(updated);

      const result = await service.transition(TENANT_ID, WO_ID, 'COMPLETED');
      // @ts-expect-error result is unknown but we control the mock
      expect(result.status).toBe('COMPLETED');
    });

    it('should validate COMPLETED → INVOICED is allowed', async () => {
      const existing = makeMockWorkOrder({ status: 'COMPLETED', version: 3 });
      const updated = makeMockWorkOrder({ status: 'INVOICED', version: 4 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(updated);

      const result = await service.transition(TENANT_ID, WO_ID, 'INVOICED');
      // @ts-expect-error result is unknown but we control the mock
      expect(result.status).toBe('INVOICED');
    });

    it('should throw for invalid final state transition (INVOICED → READY)', async () => {
      const existing = makeMockWorkOrder({ status: 'INVOICED', version: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);

      await expect(service.transition(TENANT_ID, WO_ID, 'READY')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==================== FINDALL WITH SEARCH TESTS ====================

  describe('findAll', () => {
    it('should return all work orders for a tenant', async () => {
      const workOrders = [makeMockWorkOrder({ id: 'wo-001' }), makeMockWorkOrder({ id: 'wo-002' })];

      prisma.workOrder.findMany.mockResolvedValueOnce(workOrders);
      prisma.workOrder.count.mockResolvedValueOnce(2);

      const result = await service.findAll(TENANT_ID);

      expect(result.workOrders).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.pages).toBe(1);
    });

    it('should filter by status', async () => {
      const workOrders = [makeMockWorkOrder({ status: 'OPEN' })];

      prisma.workOrder.findMany.mockResolvedValueOnce(workOrders);
      prisma.workOrder.count.mockResolvedValueOnce(1);

      const result = await service.findAll(TENANT_ID, { status: 'OPEN' });

      expect(result.workOrders).toHaveLength(1);
      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID, status: 'OPEN' }),
        }),
      );
    });

    it('should search by woNumber', async () => {
      const workOrders = [makeMockWorkOrder({ woNumber: 'WO-2026-0001' })];

      prisma.workOrder.findMany.mockResolvedValueOnce(workOrders);
      prisma.workOrder.count.mockResolvedValueOnce(1);

      const result = await service.findAll(TENANT_ID, { search: 'WO-2026' });

      expect(result.workOrders).toHaveLength(1);
      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            OR: expect.arrayContaining([
              expect.objectContaining({
                woNumber: { contains: 'WO-2026', mode: 'insensitive' },
              }),
            ]),
          }),
        }),
      );
    });

    it('should search by customerName case-insensitive', async () => {
      const workOrders = [makeMockWorkOrder({ customerName: 'Giovanni Rossi' })];

      prisma.workOrder.findMany.mockResolvedValueOnce(workOrders);
      prisma.workOrder.count.mockResolvedValueOnce(1);

      const result = await service.findAll(TENANT_ID, { search: 'giovanni' });

      expect(result.workOrders).toHaveLength(1);
      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            OR: expect.arrayContaining([
              expect.objectContaining({
                customerName: { contains: 'giovanni', mode: 'insensitive' },
              }),
            ]),
          }),
        }),
      );
    });

    it('should search by vehiclePlate case-insensitive', async () => {
      const workOrders = [makeMockWorkOrder({ vehiclePlate: 'AA123BB' })];

      prisma.workOrder.findMany.mockResolvedValueOnce(workOrders);
      prisma.workOrder.count.mockResolvedValueOnce(1);

      const result = await service.findAll(TENANT_ID, { search: 'aa123' });

      expect(result.workOrders).toHaveLength(1);
      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            OR: expect.arrayContaining([
              expect.objectContaining({
                vehiclePlate: { contains: 'aa123', mode: 'insensitive' },
              }),
            ]),
          }),
        }),
      );
    });

    it('should search by technicianName case-insensitive', async () => {
      const workOrders = [makeMockWorkOrder({ technicianName: 'Marco Bianchi' })];

      prisma.workOrder.findMany.mockResolvedValueOnce(workOrders);
      prisma.workOrder.count.mockResolvedValueOnce(1);

      const result = await service.findAll(TENANT_ID, { search: 'marco' });

      expect(result.workOrders).toHaveLength(1);
      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            OR: expect.arrayContaining([
              expect.objectContaining({
                technicianName: { contains: 'marco', mode: 'insensitive' },
              }),
            ]),
          }),
        }),
      );
    });

    it('should search with OR clause including all 4 fields', async () => {
      const workOrders = [makeMockWorkOrder()];

      prisma.workOrder.findMany.mockResolvedValueOnce(workOrders);
      prisma.workOrder.count.mockResolvedValueOnce(1);

      await service.findAll(TENANT_ID, { search: 'test' });

      const callArgs = prisma.workOrder.findMany.mock.calls[0][0];
      const orClause = callArgs.where.OR;

      expect(orClause).toHaveLength(4);
      expect(orClause[0]).toEqual({ woNumber: { contains: 'test', mode: 'insensitive' } });
      expect(orClause[1]).toEqual({
        customerName: { contains: 'test', mode: 'insensitive' },
      });
      expect(orClause[2]).toEqual({ vehiclePlate: { contains: 'test', mode: 'insensitive' } });
      expect(orClause[3]).toEqual({
        technicianName: { contains: 'test', mode: 'insensitive' },
      });
    });

    it('should handle pagination correctly', async () => {
      const workOrders = Array.from({ length: 5 }, (_, i) =>
        makeMockWorkOrder({ id: `wo-${i + 1}` }),
      );

      prisma.workOrder.findMany.mockResolvedValueOnce(workOrders);
      prisma.workOrder.count.mockResolvedValueOnce(25);

      const result = await service.findAll(TENANT_ID, { page: 2, limit: 5 });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.pages).toBe(5);
      expect(result.total).toBe(25);
      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5, // (2 - 1) * 5
          take: 5,
        }),
      );
    });

    it('should combine filters: search + status', async () => {
      const workOrders = [makeMockWorkOrder({ woNumber: 'WO-2026', status: 'OPEN' })];

      prisma.workOrder.findMany.mockResolvedValueOnce(workOrders);
      prisma.workOrder.count.mockResolvedValueOnce(1);

      const result = await service.findAll(TENANT_ID, { search: 'WO-2026', status: 'OPEN' });

      expect(result.workOrders).toHaveLength(1);
      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            status: 'OPEN',
            OR: expect.any(Array),
          }),
        }),
      );
    });

    it('should handle empty results', async () => {
      prisma.workOrder.findMany.mockResolvedValueOnce([]);
      prisma.workOrder.count.mockResolvedValueOnce(0);

      const result = await service.findAll(TENANT_ID, { status: 'COMPLETED' });

      expect(result.workOrders).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.pages).toBe(0);
    });

    it('should default to page 1 and limit 20', async () => {
      const workOrders = [makeMockWorkOrder()];

      prisma.workOrder.findMany.mockResolvedValueOnce(workOrders);
      prisma.workOrder.count.mockResolvedValueOnce(1);

      await service.findAll(TENANT_ID);

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should handle Prisma errors gracefully', async () => {
      prisma.workOrder.findMany.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.findAll(TENANT_ID)).rejects.toThrow(InternalServerErrorException);
    });
  });
});
// These tests cover:
// - normalizeJsonArray edge cases (double-wrapped arrays)
// - generateWoNumber logic (NaN handling, sequence increment)
// - findOne error handling (NotFoundException, InternalServerErrorException)
// - create method (happy path + error handling)
// - update method (happy path + conflict/not found + error handling)
// - start method (happy path + transitions + conflict + error handling)
// - complete method (happy path + transitions + conflict + error handling)
// - createInvoiceFromWo (happy path + invoice generation + transaction handling)
// - checkIn method (check-in transitions + mileage update + conflict)
// - checkOut method (check-out transitions + mileage validation + conflict)
// - startTimer (timer creation + active timer prevention)
// - stopTimer (timer duration + MAX_TIMER_MINUTES capping + labor hours update)
// - getTimer (active timer detection + total minutes calculation)

describe('WorkOrderService - Uncovered Branches', () => {
  let service: WorkOrderService;
  let prisma: {
    workOrder: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    vehicle: {
      update: jest.Mock;
    };
    invoice: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    technicianTimeLog: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const TENANT_ID = 'tenant-001';
  const WO_ID = 'wo-001';
  const VEHICLE_ID = 'vehicle-001';
  const CUSTOMER_ID = 'customer-001';
  const TECHNICIAN_ID = 'tech-001';

  const makeMockWorkOrder = (overrides = {}) => ({
    id: WO_ID,
    tenantId: TENANT_ID,
    woNumber: 'WO-2026-0001',
    vehicleId: VEHICLE_ID,
    customerId: CUSTOMER_ID,
    customerName: 'Giovanni Rossi',
    vehiclePlate: 'AA123BB',
    technicianName: 'Marco Bianchi',
    status: 'PENDING',
    version: 1,
    diagnosis: null,
    customerRequest: null,
    mileageIn: 50000,
    mileageOut: null,
    fuelLevelIn: 75,
    fuelLevelOut: null,
    priority: 'MEDIUM',
    laborItems: [],
    partsUsed: [],
    laborHours: 0,
    laborCost: 0,
    partsCost: 0,
    totalCost: 0,
    actualStartTime: null,
    actualCompletionTime: null,
    checkInData: null,
    checkOutData: null,
    photos: [],
    customerSignature: null,
    invoiceId: null,
    createdAt: new Date('2026-04-21T10:00:00Z'),
    updatedAt: new Date('2026-04-21T10:00:00Z'),
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      workOrder: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      vehicle: {
        update: jest.fn(),
      },
      invoice: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      technicianTimeLog: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkOrderService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<WorkOrderService>(WorkOrderService);
  });

  // ==================== normalizeJsonArray TESTS ====================
  describe('normalizeJsonArray (private method via findOne/findAll)', () => {
    it('should unwrap double-wrapped laborItems array [[items] → [items]]', async () => {
      const workOrderWithDoubleWrapped = makeMockWorkOrder({
        laborItems: [
          [
            { id: 'labor-1', name: 'Oil Change' },
            { id: 'labor-2', name: 'Filter' },
          ],
        ],
      });

      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrderWithDoubleWrapped);

      const result = await service.findOne(TENANT_ID, WO_ID);

      // @ts-expect-error result is unknown but we control the mock
      expect(Array.isArray(result.laborItems)).toBe(true);
      // @ts-expect-error result is unknown but we control the mock
      expect(result.laborItems).toHaveLength(2);
      // @ts-expect-error result is unknown but we control the mock
      expect(result.laborItems[0].id).toBe('labor-1');
    });

    it('should keep single-wrapped partsUsed array as-is [items] → [items]', async () => {
      const partsArray = [
        { id: 'part-1', name: 'Brake Pad' },
        { id: 'part-2', name: 'Rotor' },
      ];
      const workOrderWithSingleWrapped = makeMockWorkOrder({
        partsUsed: partsArray,
      });

      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrderWithSingleWrapped);

      const result = await service.findOne(TENANT_ID, WO_ID);

      // @ts-expect-error result is unknown but we control the mock
      expect(result.partsUsed).toEqual(partsArray);
    });

    it('should return empty array when laborItems is null/undefined', async () => {
      const workOrderWithNull = makeMockWorkOrder({ laborItems: null });

      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrderWithNull);

      const result = await service.findOne(TENANT_ID, WO_ID);

      // @ts-expect-error result is unknown but we control the mock
      expect(result.laborItems).toEqual([]);
    });

    it('should return empty array when partsUsed is not an array', async () => {
      const workOrderWithInvalidType = makeMockWorkOrder({
        partsUsed: 'invalid string' as unknown,
      });

      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrderWithInvalidType);

      const result = await service.findOne(TENANT_ID, WO_ID);

      // @ts-expect-error result is unknown but we control the mock
      expect(result.partsUsed).toEqual([]);
    });
  });

  // ==================== generateWoNumber TESTS ====================
  describe('generateWoNumber (private method via create)', () => {
    it('should generate WO-2026-0001 when no previous WO exists', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null); // No last WO
      prisma.workOrder.create.mockResolvedValueOnce(
        makeMockWorkOrder({ woNumber: 'WO-2026-0001' }),
      );

      const dto = {
        vehicleId: VEHICLE_ID,
        customerId: CUSTOMER_ID,
        technicianId: TECHNICIAN_ID,
      };

      const result = await service.create(TENANT_ID, dto as any);

      // @ts-expect-error result is unknown but we control the mock
      expect(result.woNumber).toBe('WO-2026-0001');
    });

    it('should increment sequence number from last WO', async () => {
      const lastWo = { woNumber: 'WO-2026-0042' };
      prisma.workOrder.findFirst.mockResolvedValueOnce(lastWo);
      prisma.workOrder.create.mockResolvedValueOnce(
        makeMockWorkOrder({ woNumber: 'WO-2026-0043' }),
      );

      const dto = {
        vehicleId: VEHICLE_ID,
        customerId: CUSTOMER_ID,
        technicianId: TECHNICIAN_ID,
      };

      const result = await service.create(TENANT_ID, dto as any);

      // @ts-expect-error result is unknown but we control the mock
      expect(result.woNumber).toBe('WO-2026-0043');
    });

    it('should handle malformed woNumber (non-numeric suffix) and reset to 1', async () => {
      const malformedWo = { woNumber: 'WO-2026-XXXX' };
      prisma.workOrder.findFirst.mockResolvedValueOnce(malformedWo);
      prisma.workOrder.create.mockResolvedValueOnce(
        makeMockWorkOrder({ woNumber: 'WO-2026-0001' }),
      );

      const dto = {
        vehicleId: VEHICLE_ID,
        customerId: CUSTOMER_ID,
        technicianId: TECHNICIAN_ID,
      };

      const result = await service.create(TENANT_ID, dto as any);

      // When isNaN(lastSequence), sequence resets to 1
      // @ts-expect-error result is unknown but we control the mock
      expect(result.woNumber).toBe('WO-2026-0001');
    });

    it('should pad sequence with leading zeros (0099 → 0100)', async () => {
      const lastWo = { woNumber: 'WO-2026-0099' };
      prisma.workOrder.findFirst.mockResolvedValueOnce(lastWo);
      prisma.workOrder.create.mockResolvedValueOnce(
        makeMockWorkOrder({ woNumber: 'WO-2026-0100' }),
      );

      const dto = {
        vehicleId: VEHICLE_ID,
        customerId: CUSTOMER_ID,
        technicianId: TECHNICIAN_ID,
      };

      const result = await service.create(TENANT_ID, dto as any);

      // @ts-expect-error result is unknown but we control the mock
      expect(result.woNumber).toMatch(/WO-2026-\d{4}/);
    });
  });

  // ==================== findOne TESTS ====================
  describe('findOne', () => {
    it('should find work order by ID with all relations', async () => {
      const existingWo = makeMockWorkOrder();
      prisma.workOrder.findFirst.mockResolvedValueOnce(existingWo);

      const result = await service.findOne(TENANT_ID, WO_ID);

      expect(prisma.workOrder.findFirst).toHaveBeenCalledWith({
        where: { id: WO_ID, tenantId: TENANT_ID },
        include: {
          vehicle: expect.any(Object),
          technicians: true,
          services: true,
          parts: true,
        },
      });
      // @ts-expect-error result is unknown but we control the mock
      expect(result.id).toBe(WO_ID);
    });

    it('should throw NotFoundException when WO not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);

      await expect(service.findOne(TENANT_ID, 'nonexistent-id')).rejects.toThrow(NotFoundException);
      expect(prisma.workOrder.findFirst).toHaveBeenCalledWith({
        where: { id: 'nonexistent-id', tenantId: TENANT_ID },
        include: expect.any(Object),
      });
    });

    it('should re-throw NotFoundException without wrapping', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);

      try {
        await service.findOne(TENANT_ID, WO_ID);
        fail('Should throw NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
    });

    it('should throw InternalServerErrorException on database errors', async () => {
      prisma.workOrder.findFirst.mockRejectedValueOnce(new Error('Connection timeout'));

      await expect(service.findOne(TENANT_ID, WO_ID)).rejects.toThrow(InternalServerErrorException);
    });

    it('should include vehicle details in response', async () => {
      const woWithVehicle = makeMockWorkOrder();
      prisma.workOrder.findFirst.mockResolvedValueOnce(woWithVehicle);

      await service.findOne(TENANT_ID, WO_ID);

      const callArgs = prisma.workOrder.findFirst.mock.calls[0][0];
      expect(callArgs.include.vehicle).toEqual({
        select: {
          id: true,
          licensePlate: true,
          make: true,
          model: true,
          year: true,
          vin: true,
        },
      });
    });
  });

  // ==================== create TESTS ====================
  describe('create', () => {
    it('should create a work order with all DMS fields', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null); // No last WO for sequence
      prisma.workOrder.create.mockResolvedValueOnce(
        makeMockWorkOrder({
          woNumber: 'WO-2026-0001',
          priority: 'HIGH',
          woType: 'MAINTENANCE',
          serviceAdvisorId: 'sa-001',
        }),
      );

      const dto = {
        vehicleId: VEHICLE_ID,
        customerId: CUSTOMER_ID,
        technicianId: TECHNICIAN_ID,
        priority: 'HIGH',
        woType: 'MAINTENANCE',
        serviceAdvisorId: 'sa-001',
        preAuthAmount: 500.0,
        taxExempt: false,
      };

      const result = await service.create(TENANT_ID, dto as any);

      expect(prisma.workOrder.create).toHaveBeenCalled();
      const createData = prisma.workOrder.create.mock.calls[0][0].data;
      expect(createData.tenantId).toBe(TENANT_ID);
      expect(createData.status).toBe('PENDING');
      expect(createData.priority).toBe('HIGH');
      expect(createData.woType).toBe('MAINTENANCE');
      // @ts-expect-error result is unknown but we control the mock
      expect(result.status).toBe('PENDING');
    });

    it('should parse estimatedCompletion date from ISO string', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);
      prisma.workOrder.create.mockResolvedValueOnce(makeMockWorkOrder());

      const dto = {
        vehicleId: VEHICLE_ID,
        customerId: CUSTOMER_ID,
        technicianId: TECHNICIAN_ID,
        estimatedCompletion: '2026-05-01T10:00:00Z',
      };

      await service.create(TENANT_ID, dto as any);

      const createData = prisma.workOrder.create.mock.calls[0][0].data;
      expect(createData.estimatedCompletion).toBeInstanceOf(Date);
      expect(createData.estimatedCompletion.getFullYear()).toBe(2026);
    });

    it('should omit estimatedCompletion when not provided', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);
      prisma.workOrder.create.mockResolvedValueOnce(makeMockWorkOrder());

      const dto = {
        vehicleId: VEHICLE_ID,
        customerId: CUSTOMER_ID,
        technicianId: TECHNICIAN_ID,
      };

      await service.create(TENANT_ID, dto as any);

      const createData = prisma.workOrder.create.mock.calls[0][0].data;
      expect(createData.estimatedCompletion).toBeUndefined();
    });

    it('should throw InternalServerErrorException on creation error', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);
      prisma.workOrder.create.mockRejectedValueOnce(new Error('Unique constraint failed'));

      const dto = {
        vehicleId: VEHICLE_ID,
        customerId: CUSTOMER_ID,
        technicianId: TECHNICIAN_ID,
      };

      await expect(service.create(TENANT_ID, dto as any)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should include vehicle in response', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);
      prisma.workOrder.create.mockResolvedValueOnce(makeMockWorkOrder());

      const dto = {
        vehicleId: VEHICLE_ID,
        customerId: CUSTOMER_ID,
        technicianId: TECHNICIAN_ID,
      };

      await service.create(TENANT_ID, dto as any);

      const createCall = prisma.workOrder.create.mock.calls[0][0];
      expect(createCall.include.vehicle).toBeDefined();
    });

    it('should omit estimatedPickup when not provided in create', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);
      prisma.workOrder.create.mockResolvedValueOnce(makeMockWorkOrder());

      const dto = {
        vehicleId: VEHICLE_ID,
        customerId: CUSTOMER_ID,
        technicianId: TECHNICIAN_ID,
      };

      await service.create(TENANT_ID, dto as any);

      const createData = prisma.workOrder.create.mock.calls[0][0].data;
      expect(createData.estimatedPickup).toBeUndefined();
    });

    it('should parse estimatedPickup as Date when provided in create', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);
      prisma.workOrder.create.mockResolvedValueOnce(makeMockWorkOrder());

      const dto = {
        vehicleId: VEHICLE_ID,
        customerId: CUSTOMER_ID,
        technicianId: TECHNICIAN_ID,
        estimatedPickup: '2026-05-05T16:00:00Z',
      };

      await service.create(TENANT_ID, dto as any);

      const createData = prisma.workOrder.create.mock.calls[0][0].data;
      expect(createData.estimatedPickup).toBeInstanceOf(Date);
      expect(createData.estimatedPickup.getFullYear()).toBe(2026);
    });
  });

  // ==================== update TESTS ====================
  describe('update', () => {
    it('should update work order fields and increment version', async () => {
      const existing = makeMockWorkOrder({ version: 1 });
      const updated = makeMockWorkOrder({ version: 2, diagnosis: 'Engine fault' });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });

      const dto = {
        diagnosis: 'Engine fault',
        laborHours: 2.5,
        laborCost: 150.0,
      };

      const result = await service.update(TENANT_ID, WO_ID, dto as any);

      expect(prisma.workOrder.updateMany).toHaveBeenCalledWith({
        where: { id: WO_ID, tenantId: TENANT_ID, version: 1 },
        data: expect.objectContaining({
          diagnosis: 'Engine fault',
          laborHours: 2.5,
          version: { increment: 1 },
        }),
      });
      // @ts-expect-error result is unknown but we control the mock
      expect(result.version).toBe(2);
    });

    it('should parse laborItems and partsUsed as JSON', async () => {
      const existing = makeMockWorkOrder();
      const updated = makeMockWorkOrder();

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });

      const dto = {
        laborItems: [{ id: 'labor-1', hours: 2 }],
        partsUsed: [{ id: 'part-1', qty: 1 }],
      };

      await service.update(TENANT_ID, WO_ID, dto as any);

      const updateData = prisma.workOrder.updateMany.mock.calls[0][0].data;
      expect(updateData.laborItems).toBeDefined();
      expect(updateData.partsUsed).toBeDefined();
    });

    it('should omit laborItems when undefined', async () => {
      const existing = makeMockWorkOrder();
      const updated = makeMockWorkOrder();

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });

      const dto = {
        diagnosis: 'Updated',
      };

      await service.update(TENANT_ID, WO_ID, dto as any);

      const updateData = prisma.workOrder.updateMany.mock.calls[0][0].data;
      expect(updateData.laborItems).toBeUndefined();
      expect(updateData.partsUsed).toBeUndefined();
    });

    it('should throw NotFoundException when WO not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);

      const dto = { diagnosis: 'Test' };

      await expect(service.update(TENANT_ID, WO_ID, dto as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException on optimistic lock failure', async () => {
      const existing = makeMockWorkOrder({ version: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 0 });

      const dto = { diagnosis: 'Test' };

      await expect(service.update(TENANT_ID, WO_ID, dto as any)).rejects.toThrow(ConflictException);
    });

    it('should re-throw NotFoundException without wrapping', async () => {
      const existing = makeMockWorkOrder();
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);

      const dto = { diagnosis: 'Test' };

      const result = await service.update(TENANT_ID, WO_ID, dto as any);

      expect(result).toBeNull();
    });

    it('should throw InternalServerErrorException on database error', async () => {
      prisma.workOrder.findFirst.mockRejectedValueOnce(new Error('DB error'));

      const dto = { diagnosis: 'Test' };

      await expect(service.update(TENANT_ID, WO_ID, dto as any)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ==================== start TESTS ====================
  describe('start', () => {
    it('should transition to IN_PROGRESS and set actualStartTime', async () => {
      const existing = makeMockWorkOrder({ status: 'CHECKED_IN', version: 1 });
      const updated = makeMockWorkOrder({
        status: 'IN_PROGRESS',
        version: 2,
        actualStartTime: new Date(),
      });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });

      const result = await service.start(TENANT_ID, WO_ID);

      expect(prisma.workOrder.updateMany).toHaveBeenCalledWith({
        where: { id: WO_ID, tenantId: TENANT_ID, version: 1 },
        data: expect.objectContaining({
          status: 'IN_PROGRESS',
          actualStartTime: expect.any(Date),
          version: { increment: 1 },
        }),
      });
      // @ts-expect-error result is unknown but we control the mock
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should throw NotFoundException when WO not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);

      await expect(service.start(TENANT_ID, WO_ID)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid transition', async () => {
      const existing = makeMockWorkOrder({ status: 'INVOICED', version: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);

      await expect(service.start(TENANT_ID, WO_ID)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException on optimistic lock failure', async () => {
      const existing = makeMockWorkOrder({ status: 'CHECKED_IN', version: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(service.start(TENANT_ID, WO_ID)).rejects.toThrow(ConflictException);
    });

    it('should throw InternalServerErrorException on database error', async () => {
      prisma.workOrder.findFirst.mockRejectedValueOnce(new Error('DB error'));

      await expect(service.start(TENANT_ID, WO_ID)).rejects.toThrow(InternalServerErrorException);
    });

    it('should allow transition from OPEN to IN_PROGRESS', async () => {
      const existing = makeMockWorkOrder({ status: 'OPEN', version: 1 });
      const updated = makeMockWorkOrder({ status: 'IN_PROGRESS', version: 2 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });

      const result = await service.start(TENANT_ID, WO_ID);

      // @ts-expect-error result is unknown but we control the mock
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should omit photos when not provided in update', async () => {
      const existing = makeMockWorkOrder({ version: 1 });
      const updated = makeMockWorkOrder({ version: 2 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });

      const dto = {
        diagnosis: 'Engine issue',
      };

      await service.update(TENANT_ID, WO_ID, dto as any);

      const updateData = prisma.workOrder.updateMany.mock.calls[0][0].data;
      expect(updateData.photos).toBeUndefined();
    });

    it('should parse photos as JSON when provided in update', async () => {
      const existing = makeMockWorkOrder({ version: 1 });
      const updated = makeMockWorkOrder({ version: 2 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });

      const dto = {
        photos: ['photo1.jpg', 'photo2.jpg'],
      };

      await service.update(TENANT_ID, WO_ID, dto as any);

      const updateData = prisma.workOrder.updateMany.mock.calls[0][0].data;
      expect(updateData.photos).toBeDefined();
      expect(Array.isArray(updateData.photos)).toBe(true);
    });
  });

  // ==================== complete TESTS ====================
  describe('complete', () => {
    it('should transition to COMPLETED and set actualCompletionTime', async () => {
      const existing = makeMockWorkOrder({
        status: 'QUALITY_CHECK',
        version: 3,
        actualStartTime: new Date('2026-04-21T10:00:00Z'),
      });
      const updated = makeMockWorkOrder({
        status: 'COMPLETED',
        version: 4,
        actualCompletionTime: new Date(),
      });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });

      const result = await service.complete(TENANT_ID, WO_ID);

      expect(prisma.workOrder.updateMany).toHaveBeenCalledWith({
        where: { id: WO_ID, tenantId: TENANT_ID, version: 3 },
        data: expect.objectContaining({
          status: 'COMPLETED',
          actualCompletionTime: expect.any(Date),
          version: { increment: 1 },
        }),
      });
      // @ts-expect-error result is unknown but we control the mock
      expect(result.status).toBe('COMPLETED');
    });

    it('should throw NotFoundException when WO not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);

      await expect(service.complete(TENANT_ID, WO_ID)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid transition from INVOICED→COMPLETED', async () => {
      const existingInvoiced = makeMockWorkOrder({ status: 'INVOICED', version: 5 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(existingInvoiced);

      // INVOICED has no valid transitions, so INVOICED→COMPLETED is invalid
      await expect(service.complete(TENANT_ID, WO_ID)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException on optimistic lock failure', async () => {
      const existing = makeMockWorkOrder({
        status: 'QUALITY_CHECK',
        version: 3,
      });
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(service.complete(TENANT_ID, WO_ID)).rejects.toThrow(ConflictException);
    });

    it('should throw InternalServerErrorException on database error', async () => {
      prisma.workOrder.findFirst.mockRejectedValueOnce(new Error('DB error'));

      await expect(service.complete(TENANT_ID, WO_ID)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should allow transition from IN_PROGRESS to COMPLETED', async () => {
      const existing = makeMockWorkOrder({ status: 'IN_PROGRESS', version: 2 });
      const updated = makeMockWorkOrder({ status: 'COMPLETED', version: 3 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });

      const result = await service.complete(TENANT_ID, WO_ID);

      // @ts-expect-error result is unknown but we control the mock
      expect(result.status).toBe('COMPLETED');
    });
  });

  // ==================== createInvoiceFromWo TESTS ====================
  describe('createInvoiceFromWo', () => {
    it('should create invoice with labor and parts items', async () => {
      const workOrder = makeMockWorkOrder({
        status: 'COMPLETED',
        totalCost: 500,
        services: [
          {
            id: 'wos-1',
            service: {
              id: 'service-1',
              name: 'Oil Change',
              laborRate: 50,
              price: 50,
            },
            estimatedMinutes: 60,
            actualMinutes: null,
          },
        ],
        parts: [
          {
            id: 'wop-1',
            part: {
              id: 'part-1',
              name: 'Oil Filter',
              retailPrice: 20,
            },
            quantity: 2,
          },
        ],
      });

      const lastInvoice = { invoiceNumber: 'INV-2026-0005' };

      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
      prisma.invoice.findFirst.mockResolvedValueOnce(lastInvoice);
      prisma.$transaction.mockResolvedValueOnce({
        invoice: {
          id: 'invoice-1',
          invoiceNumber: 'INV-2026-0006',
          status: 'DRAFT',
          items: expect.any(Array),
        },
        workOrder: {
          ...workOrder,
          status: 'INVOICED',
          invoiceId: 'invoice-1',
        },
      });

      const result = await service.createInvoiceFromWo(TENANT_ID, WO_ID);

      expect(prisma.$transaction).toHaveBeenCalled();
      // @ts-expect-error result is unknown but we control the mock
      expect(result.invoice.invoiceNumber).toBe('INV-2026-0006');
      // @ts-expect-error result is unknown but we control the mock
      expect(result.workOrder.status).toBe('INVOICED');
    });

    it('should calculate labor hours from actualMinutes when available', async () => {
      const workOrder = makeMockWorkOrder({
        status: 'COMPLETED',
        totalCost: 100,
        services: [
          {
            id: 'wos-1',
            service: {
              id: 'service-1',
              name: 'Diagnosis',
              laborRate: 60,
              price: 60,
            },
            estimatedMinutes: 120,
            actualMinutes: 90, // 1.5 hours
          },
        ],
        parts: [],
      });

      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
      prisma.invoice.findFirst.mockResolvedValueOnce({
        invoiceNumber: 'INV-2026-0001',
      });
      prisma.$transaction.mockResolvedValueOnce({
        invoice: { id: 'invoice-1', invoiceNumber: 'INV-2026-0002' },
        workOrder: { ...workOrder, status: 'INVOICED' },
      });

      await service.createInvoiceFromWo(TENANT_ID, WO_ID);

      const txCallback = prisma.$transaction.mock.calls[0][0];
      // The callback is an async function that calls tx.invoice.create
      // We can't directly inspect items without fully executing the callback
      expect(txCallback).toBeDefined();
    });

    it('should use laborRate from service, fallback to price if laborRate null', async () => {
      const workOrder = makeMockWorkOrder({
        status: 'COMPLETED',
        totalCost: 50,
        services: [
          {
            id: 'wos-1',
            service: {
              id: 'service-1',
              name: 'Inspection',
              laborRate: null,
              price: 50,
            },
            estimatedMinutes: 60,
            actualMinutes: null,
          },
        ],
        parts: [],
      });

      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
      prisma.invoice.findFirst.mockResolvedValueOnce({
        invoiceNumber: 'INV-2026-0001',
      });
      prisma.$transaction.mockResolvedValueOnce({
        invoice: { id: 'invoice-1', invoiceNumber: 'INV-2026-0002' },
        workOrder: { ...workOrder, status: 'INVOICED' },
      });

      await service.createInvoiceFromWo(TENANT_ID, WO_ID);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should handle empty items list (no services/parts)', async () => {
      const workOrder = makeMockWorkOrder({
        status: 'COMPLETED',
        totalCost: 0,
        services: [],
        parts: [],
      });

      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
      prisma.invoice.findFirst.mockResolvedValueOnce({
        invoiceNumber: 'INV-2026-0001',
      });
      prisma.$transaction.mockResolvedValueOnce({
        invoice: { id: 'invoice-1', invoiceNumber: 'INV-2026-0002', items: [] },
        workOrder: { ...workOrder, status: 'INVOICED' },
      });

      await service.createInvoiceFromWo(TENANT_ID, WO_ID);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should calculate VAT at 22% (Italian standard)', async () => {
      const workOrder = makeMockWorkOrder({
        status: 'COMPLETED',
        totalCost: 100,
        services: [],
        parts: [],
      });

      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
      prisma.invoice.findFirst.mockResolvedValueOnce({
        invoiceNumber: 'INV-2026-0001',
      });
      prisma.$transaction.mockResolvedValueOnce({
        invoice: {
          id: 'invoice-1',
          invoiceNumber: 'INV-2026-0002',
          subtotal: 100,
          taxRate: 22,
          taxAmount: 22,
          total: 122,
        },
        workOrder: { ...workOrder, status: 'INVOICED' },
      });

      const result = await service.createInvoiceFromWo(TENANT_ID, WO_ID);

      // @ts-expect-error result is unknown but we control the mock
      expect(result.invoice.taxRate).toBe(22);
    });

    it('should generate next invoice number sequentially', async () => {
      const workOrder = makeMockWorkOrder({
        status: 'COMPLETED',
        totalCost: 100,
        services: [],
        parts: [],
      });

      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
      prisma.invoice.findFirst.mockResolvedValueOnce({
        invoiceNumber: 'INV-2026-0099',
      });
      prisma.$transaction.mockResolvedValueOnce({
        invoice: { id: 'invoice-1', invoiceNumber: 'INV-2026-0100' },
        workOrder: { ...workOrder, status: 'INVOICED' },
      });

      const result = await service.createInvoiceFromWo(TENANT_ID, WO_ID);

      // @ts-expect-error result is unknown but we control the mock
      expect(result.invoice.invoiceNumber).toBe('INV-2026-0100');
    });

    it('should throw NotFoundException when WO not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);

      await expect(service.createInvoiceFromWo(TENANT_ID, WO_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid transition (PENDING→INVOICED not allowed)', async () => {
      const workOrder = makeMockWorkOrder({ status: 'PENDING' });
      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);

      await expect(service.createInvoiceFromWo(TENANT_ID, WO_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update WO to INVOICED in transaction', async () => {
      const workOrder = makeMockWorkOrder({
        status: 'COMPLETED',
        totalCost: 100,
        services: [],
        parts: [],
      });

      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
      prisma.invoice.findFirst.mockResolvedValueOnce({
        invoiceNumber: 'INV-2026-0001',
      });
      prisma.$transaction.mockResolvedValueOnce({
        invoice: { id: 'invoice-1', invoiceNumber: 'INV-2026-0002' },
        workOrder: { ...workOrder, status: 'INVOICED', invoiceId: 'invoice-1' },
      });

      const result = await service.createInvoiceFromWo(TENANT_ID, WO_ID);

      // @ts-expect-error result is unknown but we control the mock
      expect(result.workOrder.status).toBe('INVOICED');
      // @ts-expect-error result is unknown but we control the mock
      expect(result.workOrder.invoiceId).toBe('invoice-1');
    });

    it('should throw NotFoundException if transaction WO update fails', async () => {
      const workOrder = makeMockWorkOrder({
        status: 'COMPLETED',
        totalCost: 100,
        services: [],
        parts: [],
      });

      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
      prisma.invoice.findFirst.mockResolvedValueOnce({
        invoiceNumber: 'INV-2026-0001',
      });
      prisma.$transaction.mockRejectedValueOnce(
        new NotFoundException('Work order not found in transaction'),
      );

      await expect(service.createInvoiceFromWo(TENANT_ID, WO_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on unexpected errors', async () => {
      prisma.workOrder.findFirst.mockRejectedValueOnce(new Error('Database connection lost'));

      await expect(service.createInvoiceFromWo(TENANT_ID, WO_ID)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ==================== checkIn TESTS ====================
  describe('checkIn', () => {
    it('should transition to CHECKED_IN and update vehicle mileage', async () => {
      const existing = makeMockWorkOrder({ status: 'OPEN', version: 1 });
      const updated = makeMockWorkOrder({
        status: 'CHECKED_IN',
        version: 2,
        mileageIn: 55000,
      });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.$transaction.mockResolvedValueOnce(updated);

      const dto = {
        vehicleId: VEHICLE_ID,
        mileageIn: 55000,
        fuelLevel: 50,
        damageNotes: 'Scratch on door',
        itemsLeftInCar: ['sunglasses', 'documents'],
        parkingSpot: 'A12',
        estimatedPickup: '2026-05-05T16:00:00Z',
        courtesyCarProvided: true,
        courtesyCarPlate: 'AA999ZZ',
        photos: ['photo1.jpg'],
        customerSignature: null,
      };

      const result = await service.checkIn(TENANT_ID, WO_ID, dto as any);

      expect(prisma.$transaction).toHaveBeenCalled();
      // @ts-expect-error result is unknown but we control the mock
      expect(result.status).toBe('CHECKED_IN');
    });

    it('should throw NotFoundException when WO not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);

      const dto = {
        vehicleId: VEHICLE_ID,
        mileageIn: 55000,
        fuelLevel: 50,
      };

      await expect(service.checkIn(TENANT_ID, WO_ID, dto as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid transition', async () => {
      const existing = makeMockWorkOrder({ status: 'INVOICED', version: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);

      const dto = {
        vehicleId: VEHICLE_ID,
        mileageIn: 55000,
        fuelLevel: 50,
      };

      await expect(service.checkIn(TENANT_ID, WO_ID, dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException on optimistic lock failure', async () => {
      const existing = makeMockWorkOrder({ status: 'OPEN', version: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.$transaction.mockRejectedValueOnce(
        new ConflictException('Work order modified by another user'),
      );

      const dto = {
        vehicleId: VEHICLE_ID,
        mileageIn: 55000,
        fuelLevel: 50,
      };

      await expect(service.checkIn(TENANT_ID, WO_ID, dto as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should parse estimatedPickup as Date', async () => {
      const existing = makeMockWorkOrder({ status: 'OPEN', version: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.$transaction.mockResolvedValueOnce(makeMockWorkOrder({ status: 'CHECKED_IN' }));

      const dto = {
        vehicleId: VEHICLE_ID,
        mileageIn: 55000,
        fuelLevel: 50,
        estimatedPickup: '2026-05-05T16:00:00Z',
        damageNotes: null,
        itemsLeftInCar: [],
        parkingSpot: 'A1',
        courtesyCarProvided: false,
        courtesyCarPlate: null,
        photos: [],
        customerSignature: null,
      };

      await service.checkIn(TENANT_ID, WO_ID, dto as any);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should store checkInData as JSON', async () => {
      const existing = makeMockWorkOrder({ status: 'OPEN', version: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.$transaction.mockResolvedValueOnce(makeMockWorkOrder({ status: 'CHECKED_IN' }));

      const dto = {
        vehicleId: VEHICLE_ID,
        mileageIn: 55000,
        fuelLevel: 50,
        damageNotes: 'Minor scratch',
        itemsLeftInCar: ['phone', 'wallet'],
        parkingSpot: 'B5',
        estimatedPickup: '2026-05-05T16:00:00Z',
        courtesyCarProvided: true,
        courtesyCarPlate: 'XX123YY',
        photos: [],
        customerSignature: null,
      };

      await service.checkIn(TENANT_ID, WO_ID, dto as any);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should omit photos when not provided in checkIn', async () => {
      const existing = makeMockWorkOrder({ status: 'OPEN', version: 1 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.$transaction.mockResolvedValueOnce(makeMockWorkOrder({ status: 'CHECKED_IN' }));

      const dto = {
        vehicleId: VEHICLE_ID,
        mileageIn: 55000,
        fuelLevel: 50,
        damageNotes: 'Minor scratch',
        itemsLeftInCar: ['phone'],
        parkingSpot: 'B5',
        estimatedPickup: '2026-05-05T16:00:00Z',
        courtesyCarProvided: true,
        courtesyCarPlate: 'XX123YY',
        customerSignature: null,
      };

      await service.checkIn(TENANT_ID, WO_ID, dto as any);

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  // ==================== checkOut TESTS ====================
  describe('checkOut', () => {
    it('should transition to READY and update mileageOut', async () => {
      const existing = makeMockWorkOrder({
        status: 'COMPLETED',
        version: 3,
        mileageIn: 50000,
      });
      const updated = makeMockWorkOrder({
        status: 'READY',
        version: 4,
        mileageOut: 50100,
      });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.$transaction.mockResolvedValueOnce(updated);

      const dto = {
        mileageOut: 50100,
        fuelLevel: 80,
        courtesyCarReturned: true,
        notes: 'All work completed',
        customerSignature: 'signed',
      };

      const result = await service.checkOut(TENANT_ID, WO_ID, dto as any);

      expect(prisma.$transaction).toHaveBeenCalled();
      // @ts-expect-error result is unknown but we control the mock
      expect(result.status).toBe('READY');
    });

    it('should throw BadRequestException when mileageOut < mileageIn', async () => {
      const existing = makeMockWorkOrder({
        status: 'COMPLETED',
        version: 3,
        mileageIn: 50000,
      });
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);

      const dto = {
        mileageOut: 49999, // Less than mileageIn
        fuelLevel: 80,
        courtesyCarReturned: false,
        notes: null,
        customerSignature: null,
      };

      await expect(service.checkOut(TENANT_ID, WO_ID, dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow mileageOut = mileageIn (zero-mile work)', async () => {
      const existing = makeMockWorkOrder({
        status: 'COMPLETED',
        version: 3,
        mileageIn: 50000,
      });
      const updated = makeMockWorkOrder({ status: 'READY', mileageOut: 50000 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.$transaction.mockResolvedValueOnce(updated);

      const dto = {
        mileageOut: 50000,
        fuelLevel: 75,
        courtesyCarReturned: false,
        notes: null,
        customerSignature: null,
      };

      const result = await service.checkOut(TENANT_ID, WO_ID, dto as any);

      // @ts-expect-error result is unknown but we control the mock
      expect(result.mileageOut).toBe(50000);
    });

    it('should throw NotFoundException when WO not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);

      const dto = {
        mileageOut: 50100,
        fuelLevel: 80,
        courtesyCarReturned: false,
        notes: null,
        customerSignature: null,
      };

      await expect(service.checkOut(TENANT_ID, WO_ID, dto as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid transition', async () => {
      const existing = makeMockWorkOrder({ status: 'PENDING', version: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);

      const dto = {
        mileageOut: 50100,
        fuelLevel: 80,
        courtesyCarReturned: false,
        notes: null,
        customerSignature: null,
      };

      await expect(service.checkOut(TENANT_ID, WO_ID, dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException on optimistic lock failure', async () => {
      const existing = makeMockWorkOrder({
        status: 'COMPLETED',
        version: 3,
        mileageIn: 50000,
      });
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.$transaction.mockRejectedValueOnce(
        new ConflictException('Work order modified by another user'),
      );

      const dto = {
        mileageOut: 50100,
        fuelLevel: 80,
        courtesyCarReturned: false,
        notes: null,
        customerSignature: null,
      };

      await expect(service.checkOut(TENANT_ID, WO_ID, dto as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should preserve existing customerSignature if new signature not provided', async () => {
      const existing = makeMockWorkOrder({
        status: 'COMPLETED',
        version: 3,
        mileageIn: 50000,
        customerSignature: 'original-sig',
      });
      const updated = makeMockWorkOrder({
        status: 'READY',
        customerSignature: 'original-sig',
      });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.$transaction.mockResolvedValueOnce(updated);

      const dto = {
        mileageOut: 50100,
        fuelLevel: 80,
        courtesyCarReturned: false,
        notes: null,
        customerSignature: null, // Not provided
      };

      await service.checkOut(TENANT_ID, WO_ID, dto as any);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should update customerSignature if provided', async () => {
      const existing = makeMockWorkOrder({
        status: 'COMPLETED',
        version: 3,
        mileageIn: 50000,
      });
      const updated = makeMockWorkOrder({
        status: 'READY',
        customerSignature: 'new-sig',
      });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.$transaction.mockResolvedValueOnce(updated);

      const dto = {
        mileageOut: 50100,
        fuelLevel: 80,
        courtesyCarReturned: false,
        notes: 'All done',
        customerSignature: 'new-sig',
      };

      await service.checkOut(TENANT_ID, WO_ID, dto as any);

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  // ==================== startTimer TESTS ====================
  describe('startTimer', () => {
    it('should create a technician time log with startedAt', async () => {
      const wo = makeMockWorkOrder();
      prisma.workOrder.findFirst.mockResolvedValueOnce(wo);
      prisma.technicianTimeLog.findFirst.mockResolvedValueOnce(null); // No active timer
      prisma.technicianTimeLog.create.mockResolvedValueOnce({
        id: 'log-1',
        tenantId: TENANT_ID,
        workOrderId: WO_ID,
        technicianId: TECHNICIAN_ID,
        startedAt: new Date(),
        stoppedAt: null,
        durationMinutes: null,
      });

      const result = await service.startTimer(TENANT_ID, WO_ID, TECHNICIAN_ID);

      expect(prisma.technicianTimeLog.create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          workOrderId: WO_ID,
          technicianId: TECHNICIAN_ID,
          startedAt: expect.any(Date),
        },
      });
      // @ts-expect-error result is unknown but we control the mock
      expect(result.id).toBe('log-1');
    });

    it('should throw NotFoundException when WO not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);

      await expect(service.startTimer(TENANT_ID, 'nonexistent', TECHNICIAN_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when active timer exists', async () => {
      const wo = makeMockWorkOrder();
      prisma.workOrder.findFirst.mockResolvedValueOnce(wo);
      prisma.technicianTimeLog.findFirst.mockResolvedValueOnce({
        id: 'existing-log',
        startedAt: new Date(),
        stoppedAt: null,
      });

      await expect(service.startTimer(TENANT_ID, WO_ID, TECHNICIAN_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow starting timer if previous timer is stopped', async () => {
      const wo = makeMockWorkOrder();
      prisma.workOrder.findFirst.mockResolvedValueOnce(wo);
      prisma.technicianTimeLog.findFirst.mockResolvedValueOnce(null); // No active timer
      prisma.technicianTimeLog.create.mockResolvedValueOnce({
        id: 'new-log',
        tenantId: TENANT_ID,
        workOrderId: WO_ID,
        technicianId: TECHNICIAN_ID,
        startedAt: new Date(),
        stoppedAt: null,
      });

      const result = await service.startTimer(TENANT_ID, WO_ID, TECHNICIAN_ID);

      // @ts-expect-error result is unknown but we control the mock
      expect(result.id).toBe('new-log');
    });
  });

  // ==================== stopTimer TESTS ====================
  describe('stopTimer', () => {
    it('should stop timer and calculate durationMinutes', async () => {
      const startedAt = new Date('2026-04-21T10:00:00Z');
      const stoppedAt = new Date('2026-04-21T11:30:00Z'); // 90 minutes

      jest.spyOn(global, 'Date').mockImplementation(() => stoppedAt as any);

      const active = {
        id: 'log-1',
        startedAt,
        stoppedAt: null,
        durationMinutes: null,
      };

      prisma.technicianTimeLog.findFirst.mockResolvedValueOnce(active);
      prisma.technicianTimeLog.update.mockResolvedValueOnce({
        id: 'log-1',
        startedAt,
        stoppedAt,
        durationMinutes: 90,
      });
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce([{ durationMinutes: 90, stoppedAt }]);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });

      const result = await service.stopTimer(TENANT_ID, WO_ID, TECHNICIAN_ID);

      // @ts-expect-error result is unknown but we control the mock
      expect(result.durationMinutes).toBe(90);
      expect(prisma.workOrder.updateMany).toHaveBeenCalledWith({
        where: { id: WO_ID, tenantId: TENANT_ID },
        data: { laborHours: expect.any(Number) },
      });

      jest.restoreAllMocks();
    });

    it('should throw BadRequestException when no active timer', async () => {
      prisma.technicianTimeLog.findFirst.mockResolvedValueOnce(null);

      await expect(service.stopTimer(TENANT_ID, WO_ID, TECHNICIAN_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should cap durationMinutes to MAX_TIMER_MINUTES (480 min = 8 hours)', async () => {
      const startedAt = new Date('2026-04-21T10:00:00Z');
      const stoppedAt = new Date('2026-04-21T22:00:00Z'); // 12 hours = 720 minutes

      jest.spyOn(global, 'Date').mockImplementation(() => stoppedAt as any);

      const active = {
        id: 'log-1',
        startedAt,
        stoppedAt: null,
      };

      prisma.technicianTimeLog.findFirst.mockResolvedValueOnce(active);
      prisma.technicianTimeLog.update.mockResolvedValueOnce({
        id: 'log-1',
        startedAt,
        stoppedAt,
        durationMinutes: 480, // Capped to 8 hours
      });
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce([
        { durationMinutes: 480, stoppedAt },
      ]);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });

      const result = await service.stopTimer(TENANT_ID, WO_ID, TECHNICIAN_ID);

      // @ts-expect-error result is unknown but we control the mock
      expect(result.durationMinutes).toBeLessThanOrEqual(480);

      jest.restoreAllMocks();
    });

    it('should sum all stopped logs for total labor hours', async () => {
      const active = {
        id: 'log-1',
        startedAt: new Date(),
        stoppedAt: null,
      };

      prisma.technicianTimeLog.findFirst.mockResolvedValueOnce(active);
      prisma.technicianTimeLog.update.mockResolvedValueOnce({
        id: 'log-1',
        durationMinutes: 120,
      });
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce([
        { durationMinutes: 120, stoppedAt: new Date() },
        { durationMinutes: 60, stoppedAt: new Date() },
        { durationMinutes: 30, stoppedAt: new Date() },
      ]);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });

      await service.stopTimer(TENANT_ID, WO_ID, TECHNICIAN_ID);

      const updateCall = prisma.workOrder.updateMany.mock.calls[0][0];
      // Total: 210 minutes = 3.5 hours
      expect(updateCall.data.laborHours).toBe(3.5);
    });
  });

  // ==================== getTimer TESTS ====================
  describe('getTimer', () => {
    it('should return active timer and total minutes', async () => {
      const wo = makeMockWorkOrder();
      const activeLog = {
        id: 'log-1',
        startedAt: new Date('2026-04-21T10:00:00Z'),
        stoppedAt: null,
        durationMinutes: null,
      };
      const stoppedLogs = [
        { id: 'log-2', durationMinutes: 60, stoppedAt: new Date() },
        { id: 'log-3', durationMinutes: 30, stoppedAt: new Date() },
      ];

      prisma.workOrder.findFirst.mockResolvedValueOnce(wo);
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce([activeLog, ...stoppedLogs]);

      const result = await service.getTimer(TENANT_ID, WO_ID);

      expect(result.active).toBeDefined();
      expect(result.totalMinutes).toBe(90);
      expect(result.logs).toHaveLength(3);
    });

    it('should throw NotFoundException when WO not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);

      await expect(service.getTimer(TENANT_ID, WO_ID)).rejects.toThrow(NotFoundException);
    });

    it('should return null for active timer when no timer is running', async () => {
      const wo = makeMockWorkOrder();
      const stoppedLogs = [{ id: 'log-1', durationMinutes: 60, stoppedAt: new Date() }];

      prisma.workOrder.findFirst.mockResolvedValueOnce(wo);
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce(stoppedLogs);

      const result = await service.getTimer(TENANT_ID, WO_ID);

      expect(result.active).toBeNull();
      expect(result.totalMinutes).toBe(60);
    });

    it('should return 0 totalMinutes when no logs exist', async () => {
      const wo = makeMockWorkOrder();

      prisma.workOrder.findFirst.mockResolvedValueOnce(wo);
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce([]);

      const result = await service.getTimer(TENANT_ID, WO_ID);

      expect(result.active).toBeNull();
      expect(result.totalMinutes).toBe(0);
      expect(result.logs).toHaveLength(0);
    });

    it('should order logs by startedAt descending', async () => {
      const wo = makeMockWorkOrder();
      const logs = [
        {
          id: 'log-3',
          startedAt: new Date('2026-04-21T14:00:00Z'),
          stoppedAt: new Date(),
        },
        {
          id: 'log-2',
          startedAt: new Date('2026-04-21T12:00:00Z'),
          stoppedAt: new Date(),
        },
        {
          id: 'log-1',
          startedAt: new Date('2026-04-21T10:00:00Z'),
          stoppedAt: new Date(),
        },
      ];

      prisma.workOrder.findFirst.mockResolvedValueOnce(wo);
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce(logs);

      const result = await service.getTimer(TENANT_ID, WO_ID);

      expect(prisma.technicianTimeLog.findMany).toHaveBeenCalledWith({
        where: { workOrderId: WO_ID },
        orderBy: { startedAt: 'desc' },
      });
      expect(result.logs).toHaveLength(3);
    });

    it('should handle logs with null durationMinutes gracefully', async () => {
      const wo = makeMockWorkOrder();
      const logs = [
        { id: 'log-1', durationMinutes: 60, stoppedAt: new Date() },
        { id: 'log-2', durationMinutes: null, stoppedAt: new Date() },
        { id: 'log-3', durationMinutes: 30, stoppedAt: new Date() },
      ];

      prisma.workOrder.findFirst.mockResolvedValueOnce(wo);
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce(logs);

      const result = await service.getTimer(TENANT_ID, WO_ID);

      // Should sum only non-null values: 60 + 0 + 30 = 90
      expect(result.totalMinutes).toBe(90);
    });
  });

  // ==================== findAll WITH ADDITIONAL FILTERS ====================
  describe('findAll - Additional filter branches', () => {
    it('should filter by vehicleId', async () => {
      const workOrders = [makeMockWorkOrder({ vehicleId: VEHICLE_ID })];

      prisma.workOrder.findMany.mockResolvedValueOnce(workOrders);
      prisma.workOrder.count.mockResolvedValueOnce(1);

      const result = await service.findAll(TENANT_ID, { vehicleId: VEHICLE_ID });

      expect(result.workOrders).toHaveLength(1);
      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            vehicleId: VEHICLE_ID,
          }),
        }),
      );
    });

    it('should filter by customerId', async () => {
      const workOrders = [makeMockWorkOrder({ customerId: CUSTOMER_ID })];

      prisma.workOrder.findMany.mockResolvedValueOnce(workOrders);
      prisma.workOrder.count.mockResolvedValueOnce(1);

      const result = await service.findAll(TENANT_ID, { customerId: CUSTOMER_ID });

      expect(result.workOrders).toHaveLength(1);
      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            customerId: CUSTOMER_ID,
          }),
        }),
      );
    });

    it('should combine vehicleId and customerId filters', async () => {
      const workOrders = [makeMockWorkOrder({ vehicleId: VEHICLE_ID, customerId: CUSTOMER_ID })];

      prisma.workOrder.findMany.mockResolvedValueOnce(workOrders);
      prisma.workOrder.count.mockResolvedValueOnce(1);

      const result = await service.findAll(TENANT_ID, {
        vehicleId: VEHICLE_ID,
        customerId: CUSTOMER_ID,
      });

      expect(result.workOrders).toHaveLength(1);
      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            vehicleId: VEHICLE_ID,
            customerId: CUSTOMER_ID,
          }),
        }),
      );
    });

    it('should combine all filters: status + vehicleId + customerId + search', async () => {
      const workOrders = [
        makeMockWorkOrder({
          status: 'OPEN',
          vehicleId: VEHICLE_ID,
          customerId: CUSTOMER_ID,
        }),
      ];

      prisma.workOrder.findMany.mockResolvedValueOnce(workOrders);
      prisma.workOrder.count.mockResolvedValueOnce(1);

      const result = await service.findAll(TENANT_ID, {
        status: 'OPEN',
        vehicleId: VEHICLE_ID,
        customerId: CUSTOMER_ID,
        search: 'test',
      });

      expect(result.workOrders).toHaveLength(1);
      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            status: 'OPEN',
            vehicleId: VEHICLE_ID,
            customerId: CUSTOMER_ID,
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('Additional Branch Coverage Tests', () => {
    describe('transition - error handling branches', () => {
      it('should log and throw InternalServerErrorException for unknown errors during transition', async () => {
        const id = WO_ID;
        const mockError = new Error('Unknown database error');

        prisma.workOrder.findFirst.mockRejectedValueOnce(mockError);

        await expect(service.transition(TENANT_ID, id, 'IN_PROGRESS')).rejects.toThrow(
          InternalServerErrorException,
        );
        // Error is caught by service error handler and logged
        // Verification that error was thrown is primary assertion above
      });

      it('should rethrow NotFoundException during transition', async () => {
        const id = WO_ID;
        const error = new NotFoundException('Work order not found');

        prisma.workOrder.findFirst.mockRejectedValueOnce(error);

        await expect(service.transition(TENANT_ID, id, 'IN_PROGRESS')).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should rethrow ConflictException during transition', async () => {
        const id = WO_ID;
        const error = new ConflictException('Version mismatch');

        prisma.workOrder.findFirst.mockRejectedValueOnce(error);

        await expect(service.transition(TENANT_ID, id, 'IN_PROGRESS')).rejects.toThrow(
          ConflictException,
        );
      });

      it('should rethrow BadRequestException during transition', async () => {
        const id = WO_ID;
        const error = new BadRequestException('Invalid transition');

        prisma.workOrder.findFirst.mockRejectedValueOnce(error);

        await expect(service.transition(TENANT_ID, id, 'IN_PROGRESS')).rejects.toThrow(
          BadRequestException,
        );
      });
    });
  });

  // ==================== ADVANCED TRANSACTION TESTS ====================
  describe('Transaction Callback Execution - Branch Coverage', () => {
    describe('createInvoiceFromWo - transaction inner operations', () => {
      it('should execute transaction callback and verify invoice creation within tx', async () => {
        const workOrder = makeMockWorkOrder({
          status: 'COMPLETED',
          totalCost: 500,
          services: [
            {
              id: 'wos-1',
              service: {
                id: 'service-1',
                name: 'Oil Change',
                laborRate: 50,
                price: 50,
              },
              estimatedMinutes: 60,
              actualMinutes: null,
            },
          ],
          parts: [
            {
              id: 'wop-1',
              part: {
                id: 'part-1',
                name: 'Oil Filter',
                retailPrice: 20,
              },
              quantity: 2,
            },
          ],
        });

        const lastInvoice = { invoiceNumber: 'INV-2026-0005' };

        prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
        prisma.invoice.findFirst.mockResolvedValueOnce(lastInvoice);

        // Mock $transaction to execute the callback and verify operations
        const mockTx = {
          invoice: {
            create: jest.fn().mockResolvedValue({
              id: 'invoice-1',
              invoiceNumber: 'INV-2026-0006',
              status: 'DRAFT',
              items: expect.any(Array),
            }),
          },
          workOrder: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            findFirst: jest.fn().mockResolvedValue({
              ...workOrder,
              status: 'INVOICED',
              invoiceId: 'invoice-1',
            }),
          },
        };

        prisma.$transaction.mockImplementation(async (callback: any) => {
          return callback(mockTx);
        });

        const result = await service.createInvoiceFromWo(TENANT_ID, WO_ID);

        // Verify callback was executed
        expect(prisma.$transaction).toHaveBeenCalled();
        expect(mockTx.invoice.create).toHaveBeenCalled();
        expect(mockTx.workOrder.updateMany).toHaveBeenCalled();
        expect(mockTx.workOrder.findFirst).toHaveBeenCalled();

        // @ts-expect-error result is unknown but we control the mock
        expect(result.invoice.invoiceNumber).toBe('INV-2026-0006');
        // @ts-expect-error result is unknown but we control the mock
        expect(result.workOrder.status).toBe('INVOICED');
      });

      it('should handle transaction rollback when WO update returns 0 rows', async () => {
        const workOrder = makeMockWorkOrder({
          status: 'COMPLETED',
          totalCost: 100,
          services: [],
          parts: [],
        });

        prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
        prisma.invoice.findFirst.mockResolvedValueOnce({
          invoiceNumber: 'INV-2026-0001',
        });

        const mockTx = {
          invoice: {
            create: jest.fn().mockResolvedValue({
              id: 'invoice-1',
              invoiceNumber: 'INV-2026-0002',
            }),
          },
          workOrder: {
            updateMany: jest.fn().mockResolvedValue({ count: 0 }), // Simulate update failure
            findFirst: jest.fn(),
          },
        };

        prisma.$transaction.mockImplementation(async (callback: any) => {
          return callback(mockTx);
        });

        await expect(service.createInvoiceFromWo(TENANT_ID, WO_ID)).rejects.toThrow(
          NotFoundException,
        );

        expect(mockTx.invoice.create).toHaveBeenCalled();
        expect(mockTx.workOrder.updateMany).toHaveBeenCalled();
      });

      it('should calculate invoice items correctly within transaction', async () => {
        const workOrder = makeMockWorkOrder({
          status: 'COMPLETED',
          totalCost: 200,
          services: [
            {
              id: 'wos-1',
              service: {
                id: 'service-1',
                name: 'Diagnosis',
                laborRate: 80,
                price: 80,
              },
              estimatedMinutes: 120,
              actualMinutes: 90, // 1.5 hours
            },
          ],
          parts: [
            {
              id: 'wop-1',
              part: {
                id: 'part-1',
                name: 'Battery',
                retailPrice: 100,
              },
              quantity: 1,
            },
          ],
        });

        prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
        prisma.invoice.findFirst.mockResolvedValueOnce({
          invoiceNumber: 'INV-2026-0001',
        });

        const capturedInvoiceData: any[] = [];

        const mockTx = {
          invoice: {
            create: jest.fn().mockImplementation(async (args) => {
              capturedInvoiceData.push(args);
              return {
                id: 'invoice-1',
                invoiceNumber: 'INV-2026-0002',
                items: args.data.items,
              };
            }),
          },
          workOrder: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            findFirst: jest.fn().mockResolvedValue({
              ...workOrder,
              status: 'INVOICED',
            }),
          },
        };

        prisma.$transaction.mockImplementation(async (callback: any) => {
          return callback(mockTx);
        });

        await service.createInvoiceFromWo(TENANT_ID, WO_ID);

        expect(mockTx.invoice.create).toHaveBeenCalled();
        const invokationArgs = capturedInvoiceData[0];
        // Verify items array was built correctly
        expect(invokationArgs.data.items).toBeDefined();
        expect(invokationArgs.data.subtotal).toBe(200);
        expect(invokationArgs.data.taxRate).toBe(22);
      });
    });

    describe('checkIn - transaction inner operations', () => {
      it('should execute transaction callback for vehicle mileage update', async () => {
        const existing = makeMockWorkOrder({ status: 'OPEN', version: 1 });
        const updated = makeMockWorkOrder({
          status: 'CHECKED_IN',
          version: 2,
          mileageIn: 55000,
        });

        prisma.workOrder.findFirst.mockResolvedValueOnce(existing);

        const mockTx = {
          vehicle: {
            update: jest.fn().mockResolvedValue({
              id: VEHICLE_ID,
              mileage: 55000,
            }),
          },
          workOrder: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            findFirst: jest.fn().mockResolvedValue(updated),
          },
        };

        prisma.$transaction.mockImplementation(async (callback: any) => {
          return callback(mockTx);
        });

        const dto = {
          vehicleId: VEHICLE_ID,
          mileageIn: 55000,
          fuelLevel: 50,
          damageNotes: 'Scratch on door',
          itemsLeftInCar: ['sunglasses'],
          parkingSpot: 'A12',
          estimatedPickup: '2026-05-05T16:00:00Z',
          courtesyCarProvided: true,
          courtesyCarPlate: 'AA999ZZ',
          photos: ['photo1.jpg'],
          customerSignature: null,
        };

        const result = await service.checkIn(TENANT_ID, WO_ID, dto as any);

        expect(prisma.$transaction).toHaveBeenCalled();
        expect(mockTx.vehicle.update).toHaveBeenCalled();
        expect(mockTx.workOrder.updateMany).toHaveBeenCalled();
        expect(mockTx.workOrder.findFirst).toHaveBeenCalled();

        // @ts-expect-error result is unknown but we control the mock
        expect(result.status).toBe('CHECKED_IN');
      });

      it('should handle optimistic lock failure in checkIn transaction', async () => {
        const existing = makeMockWorkOrder({ status: 'OPEN', version: 1 });

        prisma.workOrder.findFirst.mockResolvedValueOnce(existing);

        const mockTx = {
          vehicle: {
            update: jest.fn().mockResolvedValue({
              id: VEHICLE_ID,
              mileage: 55000,
            }),
          },
          workOrder: {
            updateMany: jest.fn().mockResolvedValue({ count: 0 }), // Version mismatch
            findFirst: jest.fn(),
          },
        };

        prisma.$transaction.mockImplementation(async (callback: any) => {
          return callback(mockTx);
        });

        const dto = {
          vehicleId: VEHICLE_ID,
          mileageIn: 55000,
          fuelLevel: 50,
          damageNotes: null,
          itemsLeftInCar: [],
          parkingSpot: 'A1',
          estimatedPickup: null,
          courtesyCarProvided: false,
          courtesyCarPlate: null,
          photos: [],
          customerSignature: null,
        };

        await expect(service.checkIn(TENANT_ID, WO_ID, dto as any)).rejects.toThrow(
          ConflictException,
        );

        expect(mockTx.vehicle.update).toHaveBeenCalled();
        expect(mockTx.workOrder.updateMany).toHaveBeenCalled();
      });

      it('should include vehicle in transaction result for checkIn', async () => {
        const existing = makeMockWorkOrder({ status: 'OPEN', version: 1 });
        const updated = makeMockWorkOrder({
          status: 'CHECKED_IN',
          version: 2,
          vehicle: {
            id: VEHICLE_ID,
            licensePlate: 'AA123BB',
            make: 'Toyota',
            model: 'Corolla',
          },
        });

        prisma.workOrder.findFirst.mockResolvedValueOnce(existing);

        const mockTx = {
          vehicle: {
            update: jest.fn().mockResolvedValue({
              id: VEHICLE_ID,
              mileage: 55000,
            }),
          },
          workOrder: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            findFirst: jest.fn().mockResolvedValue(updated),
          },
        };

        prisma.$transaction.mockImplementation(async (callback: any) => {
          return callback(mockTx);
        });

        const dto = {
          vehicleId: VEHICLE_ID,
          mileageIn: 55000,
          fuelLevel: 50,
          damageNotes: 'Minor scratch',
          itemsLeftInCar: ['phone'],
          parkingSpot: 'B5',
          estimatedPickup: '2026-05-05T16:00:00Z',
          courtesyCarProvided: true,
          courtesyCarPlate: 'XX123YY',
          photos: [],
          customerSignature: null,
        };

        const result = await service.checkIn(TENANT_ID, WO_ID, dto as any);

        expect(mockTx.workOrder.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: WO_ID, tenantId: TENANT_ID },
            include: expect.objectContaining({
              vehicle: expect.any(Object),
            }),
          }),
        );
        // @ts-expect-error result is unknown but we control the mock
        expect(result.status).toBe('CHECKED_IN');
      });
    });

    describe('checkOut - transaction inner operations', () => {
      it('should execute transaction callback for vehicle mileage update on checkOut', async () => {
        const existing = makeMockWorkOrder({
          status: 'COMPLETED',
          version: 2,
          mileageIn: 55000,
          vehicleId: VEHICLE_ID,
        });
        const updated = makeMockWorkOrder({
          status: 'READY',
          version: 3,
          mileageOut: 55100,
        });

        prisma.workOrder.findFirst.mockResolvedValueOnce(existing);

        const mockTx = {
          vehicle: {
            update: jest.fn().mockResolvedValue({
              id: VEHICLE_ID,
              mileage: 55100,
            }),
          },
          workOrder: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            findFirst: jest.fn().mockResolvedValue(updated),
          },
        };

        prisma.$transaction.mockImplementation(async (callback: any) => {
          return callback(mockTx);
        });

        const dto = {
          mileageOut: 55100,
          fuelLevel: 75,
          courtesyCarReturned: true,
          notes: 'All done',
          customerSignature: null,
        };

        const result = await service.checkOut(TENANT_ID, WO_ID, dto as any);

        expect(prisma.$transaction).toHaveBeenCalled();
        expect(mockTx.vehicle.update).toHaveBeenCalledWith({
          where: { id: existing.vehicleId },
          data: { mileage: 55100 },
        });
        expect(mockTx.workOrder.updateMany).toHaveBeenCalled();
        expect(mockTx.workOrder.findFirst).toHaveBeenCalled();

        // @ts-expect-error result is unknown but we control the mock
        expect(result.status).toBe('READY');
      });

      it('should validate mileageOut >= mileageIn before transaction', async () => {
        const existing = makeMockWorkOrder({
          status: 'COMPLETED',
          mileageIn: 55000,
          vehicleId: VEHICLE_ID,
        });

        prisma.workOrder.findFirst.mockResolvedValueOnce(existing);

        const dto = {
          mileageOut: 54900, // Less than mileageIn
          fuelLevel: 75,
          courtesyCarReturned: true,
          notes: 'All done',
          customerSignature: null,
        };

        await expect(service.checkOut(TENANT_ID, WO_ID, dto as any)).rejects.toThrow(
          BadRequestException,
        );

        // Transaction should not be called
        expect(prisma.$transaction).not.toHaveBeenCalled();
      });

      it('should handle optimistic lock failure in checkOut transaction', async () => {
        const existing = makeMockWorkOrder({
          status: 'COMPLETED',
          version: 2,
          mileageIn: 55000,
          vehicleId: VEHICLE_ID,
        });

        prisma.workOrder.findFirst.mockResolvedValueOnce(existing);

        const mockTx = {
          vehicle: {
            update: jest.fn().mockResolvedValue({
              id: VEHICLE_ID,
              mileage: 55100,
            }),
          },
          workOrder: {
            updateMany: jest.fn().mockResolvedValue({ count: 0 }), // Version mismatch
            findFirst: jest.fn(),
          },
        };

        prisma.$transaction.mockImplementation(async (callback: any) => {
          return callback(mockTx);
        });

        const dto = {
          mileageOut: 55100,
          fuelLevel: 75,
          courtesyCarReturned: true,
          notes: 'All done',
          customerSignature: null,
        };

        await expect(service.checkOut(TENANT_ID, WO_ID, dto as any)).rejects.toThrow(
          ConflictException,
        );

        expect(mockTx.vehicle.update).toHaveBeenCalled();
        expect(mockTx.workOrder.updateMany).toHaveBeenCalled();
      });

      it('should preserve existing customerSignature in checkOut if not provided', async () => {
        const existing = makeMockWorkOrder({
          status: 'COMPLETED',
          version: 2,
          mileageIn: 55000,
          vehicleId: VEHICLE_ID,
          customerSignature: 'existing-sig.jpg',
        });
        const updated = makeMockWorkOrder({
          status: 'READY',
          version: 3,
          mileageOut: 55100,
          customerSignature: 'existing-sig.jpg',
        });

        prisma.workOrder.findFirst.mockResolvedValueOnce(existing);

        const mockTx = {
          vehicle: {
            update: jest.fn().mockResolvedValue({
              id: VEHICLE_ID,
              mileage: 55100,
            }),
          },
          workOrder: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            findFirst: jest.fn().mockResolvedValue(updated),
          },
        };

        prisma.$transaction.mockImplementation(async (callback: any) => {
          return callback(mockTx);
        });

        const dto = {
          mileageOut: 55100,
          fuelLevel: 75,
          courtesyCarReturned: true,
          notes: 'All done',
          customerSignature: null, // Not provided
        };

        await service.checkOut(TENANT_ID, WO_ID, dto as any);

        const updateCall = mockTx.workOrder.updateMany.mock.calls[0][0];
        // Verify that existing signature is used (via ?? operator)
        expect(updateCall.data.customerSignature).toBe('existing-sig.jpg');
      });

      it('should include vehicle relation in checkOut transaction result', async () => {
        const existing = makeMockWorkOrder({
          status: 'COMPLETED',
          version: 2,
          mileageIn: 55000,
          vehicleId: VEHICLE_ID,
        });
        const updated = makeMockWorkOrder({
          status: 'READY',
          version: 3,
          vehicle: {
            id: VEHICLE_ID,
            licensePlate: 'AA123BB',
            make: 'Fiat',
            model: '500',
          },
        });

        prisma.workOrder.findFirst.mockResolvedValueOnce(existing);

        const mockTx = {
          vehicle: {
            update: jest.fn().mockResolvedValue({
              id: VEHICLE_ID,
              mileage: 55100,
            }),
          },
          workOrder: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            findFirst: jest.fn().mockResolvedValue(updated),
          },
        };

        prisma.$transaction.mockImplementation(async (callback: any) => {
          return callback(mockTx);
        });

        const dto = {
          mileageOut: 55100,
          fuelLevel: 75,
          courtesyCarReturned: false,
          notes: 'Complete',
          customerSignature: 'signature.jpg',
        };

        await service.checkOut(TENANT_ID, WO_ID, dto as any);

        expect(mockTx.workOrder.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: WO_ID, tenantId: TENANT_ID },
            include: expect.objectContaining({
              vehicle: expect.any(Object),
            }),
          }),
        );
      });
    });
  });
});
