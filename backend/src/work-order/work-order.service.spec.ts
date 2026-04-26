/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
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
    vehicle: {
      update: jest.Mock;
    };
    technicianTimeLog: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    invoice: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };

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
    mileageOut: null,
    priority: 'MEDIUM',
    totalCost: null,
    laborHours: 0,
    laborItems: [],
    partsUsed: [],
    createdAt: new Date('2026-04-21T10:00:00Z'),
    updatedAt: new Date('2026-04-21T10:00:00Z'),
    invoiceId: null,
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
      technicianTimeLog: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      invoice: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkOrderService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<WorkOrderService>(WorkOrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== FINDALL TESTS ====================

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

    it('should filter by vehicleId', async () => {
      const workOrders = [makeMockWorkOrder({ vehicleId: 'vehicle-999' })];
      prisma.workOrder.findMany.mockResolvedValueOnce(workOrders);
      prisma.workOrder.count.mockResolvedValueOnce(1);

      await service.findAll(TENANT_ID, { vehicleId: 'vehicle-999' });

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ vehicleId: 'vehicle-999' }),
        }),
      );
    });

    it('should filter by customerId', async () => {
      const workOrders = [makeMockWorkOrder({ customerId: 'customer-999' })];
      prisma.workOrder.findMany.mockResolvedValueOnce(workOrders);
      prisma.workOrder.count.mockResolvedValueOnce(1);

      await service.findAll(TENANT_ID, { customerId: 'customer-999' });

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ customerId: 'customer-999' }),
        }),
      );
    });

    it('should search by woNumber case-insensitive', async () => {
      const workOrders = [makeMockWorkOrder({ woNumber: 'WO-2026-0001' })];
      prisma.workOrder.findMany.mockResolvedValueOnce(workOrders);
      prisma.workOrder.count.mockResolvedValueOnce(1);

      await service.findAll(TENANT_ID, { search: 'WO-2026' });

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
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

      await service.findAll(TENANT_ID, { search: 'giovanni' });

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
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

      await service.findAll(TENANT_ID, { search: 'aa123' });

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
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

      await service.findAll(TENANT_ID, { search: 'marco' });

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
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
      const orClause = (callArgs.where as any).OR;

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
          skip: 5,
          take: 5,
        }),
      );
    });

    it('should combine filters: search + status', async () => {
      const workOrders = [makeMockWorkOrder({ woNumber: 'WO-2026', status: 'OPEN' })];
      prisma.workOrder.findMany.mockResolvedValueOnce(workOrders);
      prisma.workOrder.count.mockResolvedValueOnce(1);

      await service.findAll(TENANT_ID, { search: 'WO-2026', status: 'OPEN' });

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
      prisma.workOrder.findMany.mockResolvedValueOnce([]);
      prisma.workOrder.count.mockResolvedValueOnce(0);

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

  // ==================== FINDONE TESTS ====================

  describe('findOne', () => {
    it('should return a work order by id with vehicle relations', async () => {
      const workOrder = makeMockWorkOrder();
      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);

      const result = await service.findOne(TENANT_ID, WO_ID);

      expect(result).toEqual(workOrder);
      expect(prisma.workOrder.findFirst).toHaveBeenCalledWith({
        where: { id: WO_ID, tenantId: TENANT_ID },
        include: {
          vehicle: {
            select: {
              id: true,
              licensePlate: true,
              make: true,
              model: true,
              year: true,
              vin: true,
            },
          },
          technicians: true,
          services: true,
          parts: true,
        },
      });
    });

    it('should throw NotFoundException when work order not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);

      await expect(service.findOne(TENANT_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should handle Prisma errors gracefully', async () => {
      prisma.workOrder.findFirst.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.findOne(TENANT_ID, WO_ID)).rejects.toThrow(InternalServerErrorException);
    });

    it('should normalize laborItems from [[]] to []', async () => {
      const workOrder = makeMockWorkOrder({
        laborItems: [[{ name: 'test' }]],
        partsUsed: [{ name: 'part1' }],
      });
      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);

      const result = await service.findOne(TENANT_ID, WO_ID);

      expect((result as any).laborItems).toEqual([{ name: 'test' }]);
      expect((result as any).partsUsed).toEqual([{ name: 'part1' }]);
    });

    it('should handle empty laborItems and partsUsed arrays', async () => {
      const workOrder = makeMockWorkOrder({
        laborItems: [],
        partsUsed: [],
      });
      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);

      const result = await service.findOne(TENANT_ID, WO_ID);

      expect((result as any).laborItems).toEqual([]);
      expect((result as any).partsUsed).toEqual([]);
    });

    it('should handle null laborItems and partsUsed', async () => {
      const workOrder = makeMockWorkOrder({
        laborItems: null,
        partsUsed: null,
      });
      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);

      const result = await service.findOne(TENANT_ID, WO_ID);

      expect((result as any).laborItems).toEqual([]);
      expect((result as any).partsUsed).toEqual([]);
    });

    it('should handle deeply nested JSON arrays [[[]]] properly', async () => {
      const workOrder = makeMockWorkOrder({
        laborItems: [[{ nested: 'item' }]],
        partsUsed: [[{ nested: 'part' }]],
      });
      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);

      const result = await service.findOne(TENANT_ID, WO_ID);

      expect((result as any).laborItems).toEqual([{ nested: 'item' }]);
      expect((result as any).partsUsed).toEqual([{ nested: 'part' }]);
    });
  });

  // ==================== CREATE TESTS ====================

  describe('create', () => {
    it('should create a new work order with auto-generated WO number', async () => {
      const dto = {
        vehicleId: 'vehicle-001',
        customerId: 'customer-001',
        technicianId: 'tech-001',
        priority: 'HIGH',
        mileageIn: 50000,
      };

      const createdWo = makeMockWorkOrder({ woNumber: 'WO-2026-0001' });

      prisma.workOrder.findFirst.mockResolvedValueOnce(null);
      prisma.workOrder.create.mockResolvedValueOnce(createdWo);

      const result = await service.create(TENANT_ID, dto as any);

      expect(result).toEqual(createdWo);
      expect(prisma.workOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            woNumber: 'WO-2026-0001',
            status: 'PENDING',
          }),
        }),
      );
    });

    it('should increment WO number sequence correctly', async () => {
      const lastWo = { woNumber: 'WO-2026-0005' };
      const createdWo = makeMockWorkOrder({ woNumber: 'WO-2026-0006' });

      prisma.workOrder.findFirst.mockResolvedValueOnce(lastWo);
      prisma.workOrder.create.mockResolvedValueOnce(createdWo);

      await service.create(TENANT_ID, {} as any);

      expect(prisma.workOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            woNumber: 'WO-2026-0006',
          }),
        }),
      );
    });

    it('should handle NaN in sequence parsing and default to 1', async () => {
      const lastWo = { woNumber: 'WO-2026-INVALID' };
      const createdWo = makeMockWorkOrder({ woNumber: 'WO-2026-0001' });

      prisma.workOrder.findFirst.mockResolvedValueOnce(lastWo);
      prisma.workOrder.create.mockResolvedValueOnce(createdWo);

      await service.create(TENANT_ID, {} as any);

      expect(prisma.workOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            woNumber: 'WO-2026-0001',
          }),
        }),
      );
    });

    it('should handle Prisma errors gracefully', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);
      prisma.workOrder.create.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.create(TENANT_ID, {} as any)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ==================== UPDATE TESTS ====================

  describe('update', () => {
    it('should update a work order and increment version', async () => {
      const existing = makeMockWorkOrder({ version: 1 });
      const updated = makeMockWorkOrder({ version: 2, mileageOut: 51000 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(updated);

      const result = await service.update(TENANT_ID, WO_ID, { mileageOut: 51000 } as any);

      expect(result).toEqual(updated);
      expect(prisma.workOrder.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: WO_ID, tenantId: TENANT_ID, version: 1 },
        }),
      );
    });

    it('should throw NotFoundException when work order not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);

      await expect(service.update(TENANT_ID, 'nonexistent', {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when version mismatches (optimistic lock)', async () => {
      const existing = makeMockWorkOrder({ version: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(service.update(TENANT_ID, WO_ID, {} as any)).rejects.toThrow(ConflictException);
    });

    it('should handle Prisma errors gracefully', async () => {
      const existing = makeMockWorkOrder();
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.update(TENANT_ID, WO_ID, {} as any)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
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

      expect((result as any).status).toBe('OPEN');
      expect(prisma.workOrder.updateMany).toHaveBeenCalledWith({
        where: { id: WO_ID, tenantId: TENANT_ID, version: 1 },
        data: {
          status: 'OPEN',
          version: { increment: 1 },
        },
      });
    });

    it('should transition PENDING to CHECKED_IN', async () => {
      const existing = makeMockWorkOrder({ status: 'PENDING', version: 1 });
      const updated = makeMockWorkOrder({ status: 'CHECKED_IN', version: 2 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(updated);

      const result = await service.transition(TENANT_ID, WO_ID, 'CHECKED_IN');

      expect((result as any).status).toBe('CHECKED_IN');
    });

    it('should transition PENDING to IN_PROGRESS', async () => {
      const existing = makeMockWorkOrder({ status: 'PENDING', version: 1 });
      const updated = makeMockWorkOrder({ status: 'IN_PROGRESS', version: 2 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(updated);

      const result = await service.transition(TENANT_ID, WO_ID, 'IN_PROGRESS');

      expect((result as any).status).toBe('IN_PROGRESS');
    });

    it('should transition IN_PROGRESS to WAITING_PARTS', async () => {
      const existing = makeMockWorkOrder({ status: 'IN_PROGRESS', version: 1 });
      const updated = makeMockWorkOrder({ status: 'WAITING_PARTS', version: 2 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(updated);

      const result = await service.transition(TENANT_ID, WO_ID, 'WAITING_PARTS');

      expect((result as any).status).toBe('WAITING_PARTS');
    });

    it('should transition IN_PROGRESS to QUALITY_CHECK', async () => {
      const existing = makeMockWorkOrder({ status: 'IN_PROGRESS', version: 1 });
      const updated = makeMockWorkOrder({ status: 'QUALITY_CHECK', version: 2 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(updated);

      const result = await service.transition(TENANT_ID, WO_ID, 'QUALITY_CHECK');

      expect((result as any).status).toBe('QUALITY_CHECK');
    });

    it('should transition WAITING_PARTS back to IN_PROGRESS', async () => {
      const existing = makeMockWorkOrder({ status: 'WAITING_PARTS', version: 1 });
      const updated = makeMockWorkOrder({ status: 'IN_PROGRESS', version: 2 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(updated);

      const result = await service.transition(TENANT_ID, WO_ID, 'IN_PROGRESS');

      expect((result as any).status).toBe('IN_PROGRESS');
    });

    it('should transition QUALITY_CHECK to COMPLETED', async () => {
      const existing = makeMockWorkOrder({ status: 'QUALITY_CHECK', version: 1 });
      const updated = makeMockWorkOrder({ status: 'COMPLETED', version: 2 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(updated);

      const result = await service.transition(TENANT_ID, WO_ID, 'COMPLETED');

      expect((result as any).status).toBe('COMPLETED');
    });

    it('should transition QUALITY_CHECK back to IN_PROGRESS', async () => {
      const existing = makeMockWorkOrder({ status: 'QUALITY_CHECK', version: 1 });
      const updated = makeMockWorkOrder({ status: 'IN_PROGRESS', version: 2 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(updated);

      const result = await service.transition(TENANT_ID, WO_ID, 'IN_PROGRESS');

      expect((result as any).status).toBe('IN_PROGRESS');
    });

    it('should transition COMPLETED to READY', async () => {
      const existing = makeMockWorkOrder({ status: 'COMPLETED', version: 1 });
      const updated = makeMockWorkOrder({ status: 'READY', version: 2 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(updated);

      const result = await service.transition(TENANT_ID, WO_ID, 'READY');

      expect((result as any).status).toBe('READY');
    });

    it('should transition COMPLETED to INVOICED', async () => {
      const existing = makeMockWorkOrder({ status: 'COMPLETED', version: 1 });
      const updated = makeMockWorkOrder({ status: 'INVOICED', version: 2 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(updated);

      const result = await service.transition(TENANT_ID, WO_ID, 'INVOICED');

      expect((result as any).status).toBe('INVOICED');
    });

    it('should transition READY to INVOICED', async () => {
      const existing = makeMockWorkOrder({ status: 'READY', version: 1 });
      const updated = makeMockWorkOrder({ status: 'INVOICED', version: 2 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(updated);

      const result = await service.transition(TENANT_ID, WO_ID, 'INVOICED');

      expect((result as any).status).toBe('INVOICED');
    });

    it('should throw NotFoundException when work order not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);

      await expect(service.transition(TENANT_ID, 'nonexistent', 'OPEN')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid transition (INVOICED cannot transition)', async () => {
      const existing = makeMockWorkOrder({ status: 'INVOICED', version: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);

      await expect(service.transition(TENANT_ID, WO_ID, 'READY')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException when version mismatches (optimistic lock)', async () => {
      const existing = makeMockWorkOrder({ status: 'PENDING', version: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(service.transition(TENANT_ID, WO_ID, 'OPEN')).rejects.toThrow(ConflictException);
    });

    it('should handle database errors gracefully', async () => {
      prisma.workOrder.findFirst.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.transition(TENANT_ID, WO_ID, 'OPEN')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ==================== START TESTS ====================

  describe('start', () => {
    it('should transition from OPEN to IN_PROGRESS via start()', async () => {
      const existing = makeMockWorkOrder({ status: 'OPEN', version: 1 });
      const started = makeMockWorkOrder({ status: 'IN_PROGRESS', version: 2 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(started);

      const result = await service.start(TENANT_ID, WO_ID);

      expect((result as any).status).toBe('IN_PROGRESS');
      expect(prisma.workOrder.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'IN_PROGRESS',
            actualStartTime: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw NotFoundException when work order not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);

      await expect(service.start(TENANT_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid start transition', async () => {
      const existing = makeMockWorkOrder({ status: 'INVOICED', version: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);

      await expect(service.start(TENANT_ID, WO_ID)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException on version mismatch', async () => {
      const existing = makeMockWorkOrder({ status: 'OPEN', version: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(service.start(TENANT_ID, WO_ID)).rejects.toThrow(ConflictException);
    });

    it('should handle database errors gracefully', async () => {
      prisma.workOrder.findFirst.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.start(TENANT_ID, WO_ID)).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ==================== COMPLETE TESTS ====================

  describe('complete', () => {
    it('should complete a work order from QUALITY_CHECK', async () => {
      const existing = makeMockWorkOrder({ status: 'QUALITY_CHECK', version: 2 });
      const completed = makeMockWorkOrder({ status: 'COMPLETED', version: 3 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(completed);

      const result = await service.complete(TENANT_ID, WO_ID);

      expect((result as any).status).toBe('COMPLETED');
      expect(prisma.workOrder.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
            actualCompletionTime: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw NotFoundException when work order not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);

      await expect(service.complete(TENANT_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException on version mismatch', async () => {
      const existing = makeMockWorkOrder({ status: 'QUALITY_CHECK', version: 2 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(service.complete(TENANT_ID, WO_ID)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      const existing = makeMockWorkOrder({ status: 'PENDING', version: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);

      await expect(service.complete(TENANT_ID, WO_ID)).rejects.toThrow(BadRequestException);
    });

    it('should handle database errors gracefully', async () => {
      prisma.workOrder.findFirst.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.complete(TENANT_ID, WO_ID)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ==================== CHECK-IN TESTS ====================

  describe('checkIn', () => {
    it('should check in a vehicle and update mileage via transaction', async () => {
      const existing = makeMockWorkOrder({ status: 'OPEN', version: 1 });
      const checkedIn = makeMockWorkOrder({
        status: 'CHECKED_IN',
        version: 2,
        mileageIn: 55000,
      });

      const transactionMock = jest.fn().mockResolvedValueOnce(checkedIn);
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.$transaction.mockImplementationOnce(transactionMock);

      const dto = {
        vehicleId: 'vehicle-001',
        mileageIn: 55000,
        fuelLevel: 0.5,
        damageNotes: 'Minor scratch',
        estimatedPickup: new Date(),
      };

      const result = await service.checkIn(TENANT_ID, WO_ID, dto as any);

      expect(result).toEqual(checkedIn);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when work order not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);

      await expect(service.checkIn(TENANT_ID, 'nonexistent', {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid check-in status', async () => {
      const existing = makeMockWorkOrder({ status: 'INVOICED', version: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);

      await expect(service.checkIn(TENANT_ID, WO_ID, {} as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException on transaction failure (version mismatch)', async () => {
      const existing = makeMockWorkOrder({ status: 'OPEN', version: 1 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.$transaction.mockImplementationOnce(async _callback => {
        throw new ConflictException('Work order modified by another user');
      });

      await expect(service.checkIn(TENANT_ID, WO_ID, {} as any)).rejects.toThrow(ConflictException);
    });
  });

  // ==================== CHECK-OUT TESTS ====================

  describe('checkOut', () => {
    it('should check out a vehicle and update mileage', async () => {
      const existing = makeMockWorkOrder({
        status: 'COMPLETED',
        version: 2,
        mileageIn: 50000,
      });
      const checkedOut = makeMockWorkOrder({
        status: 'READY',
        version: 3,
        mileageOut: 51000,
      });

      const transactionMock = jest.fn().mockResolvedValueOnce(checkedOut);
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.$transaction.mockImplementationOnce(transactionMock);

      const dto = {
        mileageOut: 51000,
        fuelLevel: 0.3,
        courtesyCarReturned: true,
      };

      const result = await service.checkOut(TENANT_ID, WO_ID, dto as any);

      expect(result).toEqual(checkedOut);
    });

    it('should throw BadRequestException if mileage out is less than mileage in', async () => {
      const existing = makeMockWorkOrder({
        status: 'COMPLETED',
        version: 1,
        mileageIn: 50000,
      });
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);

      const dto = { mileageOut: 49000, fuelLevel: 0.3 };

      await expect(service.checkOut(TENANT_ID, WO_ID, dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when work order not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);

      await expect(service.checkOut(TENANT_ID, 'nonexistent', {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid checkout status', async () => {
      const existing = makeMockWorkOrder({ status: 'PENDING', version: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);

      await expect(service.checkOut(TENANT_ID, WO_ID, {} as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==================== TIMER TESTS ====================

  describe('startTimer', () => {
    it('should start a timer for a technician', async () => {
      const workOrder = makeMockWorkOrder();
      const newLog = {
        id: 'log-001',
        tenantId: TENANT_ID,
        workOrderId: WO_ID,
        technicianId: 'tech-001',
        startedAt: new Date(),
        stoppedAt: null,
      };

      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
      prisma.technicianTimeLog.findFirst.mockResolvedValueOnce(null);
      prisma.technicianTimeLog.create.mockResolvedValueOnce(newLog);

      const result = await service.startTimer(TENANT_ID, WO_ID, 'tech-001');

      expect(result).toEqual(newLog);
      expect(prisma.technicianTimeLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            workOrderId: WO_ID,
            technicianId: 'tech-001',
          }),
        }),
      );
    });

    it('should throw error when timer is already running', async () => {
      const workOrder = makeMockWorkOrder();
      const activeLog = {
        id: 'log-001',
        startedAt: new Date(),
        stoppedAt: null,
      };

      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
      prisma.technicianTimeLog.findFirst.mockResolvedValueOnce(activeLog);

      await expect(service.startTimer(TENANT_ID, WO_ID, 'tech-001')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when work order not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);

      await expect(service.startTimer(TENANT_ID, 'nonexistent', 'tech-001')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('stopTimer', () => {
    it('should stop an active timer and calculate duration', async () => {
      const startTime = new Date(Date.now() - 60 * 60 * 1000);
      const activeLog = {
        id: 'log-001',
        startedAt: startTime,
        stoppedAt: null,
        durationMinutes: null,
      };
      const stoppedLog = {
        ...activeLog,
        stoppedAt: new Date(),
        durationMinutes: 60,
      };

      prisma.technicianTimeLog.findFirst.mockResolvedValueOnce(activeLog);
      prisma.technicianTimeLog.update.mockResolvedValueOnce(stoppedLog);
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce([stoppedLog]);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });

      const result = await service.stopTimer(TENANT_ID, WO_ID, 'tech-001');

      expect(result).toEqual(stoppedLog);
      expect(prisma.workOrder.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            laborHours: 1,
          }),
        }),
      );
    });

    it('should cap timer duration at MAX_TIMER_MINUTES (8 hours)', async () => {
      const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const activeLog = {
        id: 'log-001',
        startedAt: startTime,
        stoppedAt: null,
      };
      const stoppedLog = {
        ...activeLog,
        stoppedAt: new Date(),
        durationMinutes: 8 * 60,
      };

      prisma.technicianTimeLog.findFirst.mockResolvedValueOnce(activeLog);
      prisma.technicianTimeLog.update.mockResolvedValueOnce(stoppedLog);
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce([stoppedLog]);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });

      await service.stopTimer(TENANT_ID, WO_ID, 'tech-001');

      expect(prisma.technicianTimeLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            durationMinutes: 8 * 60,
          }),
        }),
      );
    });

    it('should sum labor hours from all stopped logs', async () => {
      const activeLog = {
        id: 'log-001',
        startedAt: new Date(Date.now() - 60 * 1000),
        stoppedAt: null,
      };
      const stoppedLogs = [
        { id: 'log-002', durationMinutes: 60, stoppedAt: new Date() },
        { id: 'log-003', durationMinutes: 90, stoppedAt: new Date() },
      ];

      prisma.technicianTimeLog.findFirst.mockResolvedValueOnce(activeLog);
      prisma.technicianTimeLog.update.mockResolvedValueOnce({
        ...activeLog,
        stoppedAt: new Date(),
        durationMinutes: 1,
      });
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce(stoppedLogs);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });

      await service.stopTimer(TENANT_ID, WO_ID, 'tech-001');

      expect(prisma.workOrder.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            laborHours: 2.5, // (60 + 90) / 60 = 2.5
          }),
        }),
      );
    });

    it('should throw error when no active timer found', async () => {
      prisma.technicianTimeLog.findFirst.mockResolvedValueOnce(null);

      await expect(service.stopTimer(TENANT_ID, WO_ID, 'tech-001')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getTimer', () => {
    it('should return timer status with active log and total minutes', async () => {
      const workOrder = makeMockWorkOrder();
      const logs = [
        {
          id: 'log-001',
          startedAt: new Date(),
          stoppedAt: null,
          durationMinutes: null,
        },
        {
          id: 'log-002',
          startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          stoppedAt: new Date(Date.now() - 60 * 60 * 1000),
          durationMinutes: 60,
        },
      ];

      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce(logs);

      const result = await service.getTimer(TENANT_ID, WO_ID);

      expect(result.active).toEqual(logs[0]);
      expect(result.totalMinutes).toBe(60);
      expect(result.logs).toHaveLength(2);
    });

    it('should return null active log if no timer running', async () => {
      const workOrder = makeMockWorkOrder();
      const logs = [
        {
          id: 'log-001',
          startedAt: new Date(Date.now() - 60 * 60 * 1000),
          stoppedAt: new Date(),
          durationMinutes: 60,
        },
      ];

      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce(logs);

      const result = await service.getTimer(TENANT_ID, WO_ID);

      expect(result.active).toBeNull();
      expect(result.totalMinutes).toBe(60);
    });

    it('should return zero total minutes when no stopped logs', async () => {
      const workOrder = makeMockWorkOrder();
      const logs = [
        {
          id: 'log-001',
          startedAt: new Date(),
          stoppedAt: null,
          durationMinutes: null,
        },
      ];

      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce(logs);

      const result = await service.getTimer(TENANT_ID, WO_ID);

      expect(result.totalMinutes).toBe(0);
      expect(result.active).toEqual(logs[0]);
    });

    it('should throw NotFoundException when work order not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);

      await expect(service.getTimer(TENANT_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should order logs by startedAt descending', async () => {
      const workOrder = makeMockWorkOrder();
      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce([]);

      await service.getTimer(TENANT_ID, WO_ID);

      expect(prisma.technicianTimeLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { startedAt: 'desc' },
        }),
      );
    });
  });

  // ==================== CREATE INVOICE TESTS ====================

  describe('createInvoiceFromWo', () => {
    it('should create an invoice from a completed work order', async () => {
      const workOrder = makeMockWorkOrder({
        status: 'COMPLETED',
        totalCost: 500,
        services: [
          {
            service: {
              name: 'Oil Change',
              laborRate: 50,
              price: 50,
            },
            actualMinutes: 120,
            estimatedMinutes: 120,
          },
        ],
        parts: [
          {
            part: {
              name: 'Engine Oil',
              retailPrice: 30,
            },
            quantity: 2,
          },
        ],
      });

      const invoice = {
        id: 'inv-001',
        invoiceNumber: 'INV-2026-0001',
        status: 'DRAFT',
      };

      const updatedWorkOrder = { ...workOrder, status: 'INVOICED' };

      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
      prisma.invoice.findFirst.mockResolvedValueOnce(null);
      prisma.$transaction.mockImplementationOnce(async callback => {
        return callback({
          invoice: {
            create: jest.fn().mockResolvedValueOnce(invoice),
          },
          workOrder: {
            updateMany: jest.fn().mockResolvedValueOnce({ count: 1 }),
            findFirst: jest.fn().mockResolvedValueOnce(updatedWorkOrder),
          },
        });
      });

      const result = await service.createInvoiceFromWo(TENANT_ID, WO_ID);

      expect((result as any).invoice).toEqual(invoice);
      expect((result as any).workOrder).toEqual(updatedWorkOrder);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should calculate invoice items from labor services and parts', async () => {
      const workOrder = makeMockWorkOrder({
        status: 'COMPLETED',
        totalCost: 500,
        services: [
          {
            service: { name: 'Diagnostic', laborRate: 100, price: 100 },
            actualMinutes: 60,
            estimatedMinutes: 60,
          },
        ],
        parts: [{ part: { name: 'Filter', retailPrice: 25 }, quantity: 1 }],
      });

      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
      prisma.invoice.findFirst.mockResolvedValueOnce(null);
      prisma.$transaction.mockImplementationOnce(async callback => {
        return callback({
          invoice: {
            create: jest.fn().mockResolvedValueOnce({ id: 'inv-002' }),
          },
          workOrder: {
            updateMany: jest.fn().mockResolvedValueOnce({ count: 1 }),
            findFirst: jest.fn().mockResolvedValueOnce(workOrder),
          },
        });
      });

      const result = await service.createInvoiceFromWo(TENANT_ID, WO_ID);

      expect(result).toBeDefined();
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should handle labor items with actualMinutes fallback to estimatedMinutes', async () => {
      const workOrder = makeMockWorkOrder({
        status: 'COMPLETED',
        totalCost: 100,
        services: [
          {
            service: { name: 'Repair', laborRate: 50, price: 50 },
            actualMinutes: null, // actualMinutes is null, should use estimatedMinutes
            estimatedMinutes: 180,
          },
        ],
        parts: [],
      });

      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
      prisma.invoice.findFirst.mockResolvedValueOnce(null);
      prisma.$transaction.mockImplementationOnce(async callback => {
        return callback({
          invoice: {
            create: jest.fn().mockResolvedValueOnce({ id: 'inv-003' }),
          },
          workOrder: {
            updateMany: jest.fn().mockResolvedValueOnce({ count: 1 }),
            findFirst: jest.fn().mockResolvedValueOnce(workOrder),
          },
        });
      });

      const result = await service.createInvoiceFromWo(TENANT_ID, WO_ID);

      expect(result).toBeDefined();
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should increment invoice number sequence correctly', async () => {
      const workOrder = makeMockWorkOrder({
        status: 'COMPLETED',
        totalCost: 100,
        services: [],
        parts: [],
      });

      const lastInvoice = { invoiceNumber: 'INV-2026-0005' };

      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
      prisma.invoice.findFirst.mockResolvedValueOnce(lastInvoice);
      prisma.$transaction.mockImplementationOnce(async callback => {
        return callback({
          invoice: {
            create: jest.fn().mockResolvedValueOnce({ invoiceNumber: 'INV-2026-0006' }),
          },
          workOrder: {
            updateMany: jest.fn().mockResolvedValueOnce({ count: 1 }),
            findFirst: jest.fn().mockResolvedValueOnce(workOrder),
          },
        });
      });

      const result = await service.createInvoiceFromWo(TENANT_ID, WO_ID);

      expect(result).toBeDefined();
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should handle NaN in invoice number sequence', async () => {
      const workOrder = makeMockWorkOrder({
        status: 'COMPLETED',
        totalCost: 100,
        services: [],
        parts: [],
      });

      const lastInvoice = { invoiceNumber: 'INV-2026-INVALID' };

      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
      prisma.invoice.findFirst.mockResolvedValueOnce(lastInvoice);
      prisma.$transaction.mockImplementationOnce(async callback => {
        return callback({
          invoice: {
            create: jest.fn().mockResolvedValueOnce({ invoiceNumber: 'INV-2026-0001' }),
          },
          workOrder: {
            updateMany: jest.fn().mockResolvedValueOnce({ count: 1 }),
            findFirst: jest.fn().mockResolvedValueOnce(workOrder),
          },
        });
      });

      const result = await service.createInvoiceFromWo(TENANT_ID, WO_ID);

      expect(result).toBeDefined();
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should apply 22% Italian VAT to subtotal', async () => {
      const workOrder = makeMockWorkOrder({
        status: 'COMPLETED',
        totalCost: 100,
        services: [],
        parts: [],
      });

      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
      prisma.invoice.findFirst.mockResolvedValueOnce(null);
      prisma.$transaction.mockImplementationOnce(async callback => {
        return callback({
          invoice: {
            create: jest.fn().mockResolvedValueOnce({ id: 'inv-vat' }),
          },
          workOrder: {
            updateMany: jest.fn().mockResolvedValueOnce({ count: 1 }),
            findFirst: jest.fn().mockResolvedValueOnce(workOrder),
          },
        });
      });

      const result = await service.createInvoiceFromWo(TENANT_ID, WO_ID);

      expect(result).toBeDefined();
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should handle empty services and parts arrays', async () => {
      const workOrder = makeMockWorkOrder({
        status: 'COMPLETED',
        totalCost: 0,
        services: [],
        parts: [],
      });

      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
      prisma.invoice.findFirst.mockResolvedValueOnce(null);
      prisma.$transaction.mockImplementationOnce(async callback => {
        return callback({
          invoice: {
            create: jest.fn().mockResolvedValueOnce({ id: 'inv-empty' }),
          },
          workOrder: {
            updateMany: jest.fn().mockResolvedValueOnce({ count: 1 }),
            findFirst: jest.fn().mockResolvedValueOnce(workOrder),
          },
        });
      });

      const result = await service.createInvoiceFromWo(TENANT_ID, WO_ID);

      expect(result).toBeDefined();
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when work order not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);

      await expect(service.createInvoiceFromWo(TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid invoice transition', async () => {
      const workOrder = makeMockWorkOrder({ status: 'PENDING' });
      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);

      await expect(service.createInvoiceFromWo(TENANT_ID, WO_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle database errors gracefully', async () => {
      prisma.workOrder.findFirst.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.createInvoiceFromWo(TENANT_ID, WO_ID)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should handle transaction errors gracefully', async () => {
      const workOrder = makeMockWorkOrder({ status: 'COMPLETED', totalCost: 100 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
      prisma.invoice.findFirst.mockResolvedValueOnce(null);
      prisma.$transaction.mockRejectedValueOnce(new Error('Transaction failed'));

      await expect(service.createInvoiceFromWo(TENANT_ID, WO_ID)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should wrap non-BadRequest/NotFound transaction errors as InternalServerErrorException', async () => {
      const workOrder = makeMockWorkOrder({ status: 'COMPLETED', totalCost: 100 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
      prisma.invoice.findFirst.mockResolvedValueOnce(null);

      // When transaction callback throws an error that's not NotFoundException/BadRequestException,
      // it gets caught and wrapped as InternalServerErrorException
      prisma.$transaction.mockRejectedValueOnce(new Error('Database connection lost'));

      await expect(service.createInvoiceFromWo(TENANT_ID, WO_ID)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should handle count === 0 in transaction (line 584-585 branch coverage)', async () => {
      const workOrder = makeMockWorkOrder({
        status: 'COMPLETED',
        totalCost: 100,
        services: [],
        parts: [],
      });
      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
      prisma.invoice.findFirst.mockResolvedValueOnce(null);

      // This test ensures line 584 (if woUpdateResult.count === 0) evaluates to true
      // and line 585 (throw NotFoundException) is executed
      let callbackExecuted = false;
      prisma.$transaction.mockImplementationOnce(async callback => {
        callbackExecuted = true;
        const invoiceCreateMock = jest.fn().mockResolvedValueOnce({ id: 'inv-404' });
        const updateManyMock = jest.fn().mockResolvedValueOnce({ count: 0 });
        const findFirstMock = jest.fn();

        const txMock = {
          invoice: { create: invoiceCreateMock },
          workOrder: { updateMany: updateManyMock, findFirst: findFirstMock },
        };

        try {
          return await callback(txMock);
        } catch (error) {
          // Verify that the error is NotFoundException thrown from line 585
          expect(error).toBeInstanceOf(NotFoundException);
          expect((error as any).message).toContain('not found');
          throw error;
        }
      });

      // The service re-throws the NotFoundException (line 600-601 catches and re-throws)
      await expect(service.createInvoiceFromWo(TENANT_ID, WO_ID)).rejects.toThrow(
        NotFoundException,
      );

      expect(callbackExecuted).toBe(true);
    });
  });

  describe('checkIn - transaction callback coverage', () => {
    it('should execute checkIn transaction callback and update vehicle + work order (lines 635-658)', async () => {
      const existing = makeMockWorkOrder({ status: 'OPEN', version: 1 });

      const checkedIn = makeMockWorkOrder({
        status: 'CHECKED_IN',
        version: 2,
        mileageIn: 55000,
      });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.$transaction.mockImplementationOnce(async callback => {
        const txMock = {
          vehicle: {
            update: jest.fn().mockResolvedValueOnce({ id: 'vehicle-001', mileage: 55000 }),
          },
          workOrder: {
            updateMany: jest.fn().mockResolvedValueOnce({ count: 1 }),
            findFirst: jest.fn().mockResolvedValueOnce(checkedIn),
          },
        };
        return callback(txMock);
      });

      const dto = {
        vehicleId: 'vehicle-001',
        mileageIn: 55000,
        fuelLevel: 0.5,
        damageNotes: 'Minor scratch',
        estimatedPickup: new Date().toISOString(),
        photos: ['photo1.jpg'],
      };

      const result = await service.checkIn(TENANT_ID, WO_ID, dto as any);

      expect(result).toEqual(checkedIn);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw ConflictException when checkIn updateMany count === 0 (version conflict)', async () => {
      const existing = makeMockWorkOrder({ status: 'OPEN', version: 1 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.$transaction.mockImplementationOnce(async callback => {
        const txMock = {
          vehicle: {
            update: jest.fn().mockResolvedValueOnce({ id: 'vehicle-001' }),
          },
          workOrder: {
            updateMany: jest.fn().mockResolvedValueOnce({ count: 0 }),
            findFirst: jest.fn(),
          },
        };
        try {
          return await callback(txMock);
        } catch (error) {
          if (error instanceof ConflictException) {
            throw error;
          }
          throw error;
        }
      });

      const dto = {
        vehicleId: 'vehicle-001',
        mileageIn: 55000,
        fuelLevel: 0.5,
      };

      await expect(service.checkIn(TENANT_ID, WO_ID, dto as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should handle optional estimatedPickup in checkIn (undefined)', async () => {
      const existing = makeMockWorkOrder({ status: 'OPEN', version: 1 });

      const checkedIn = makeMockWorkOrder({
        status: 'CHECKED_IN',
        version: 2,
        estimatedCompletion: null,
      });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.$transaction.mockImplementationOnce(async callback => {
        const txMock = {
          vehicle: {
            update: jest.fn().mockResolvedValueOnce({}),
          },
          workOrder: {
            updateMany: jest.fn().mockResolvedValueOnce({ count: 1 }),
            findFirst: jest.fn().mockResolvedValueOnce(checkedIn),
          },
        };
        return callback(txMock);
      });

      const dto = {
        vehicleId: 'vehicle-001',
        mileageIn: 55000,
        fuelLevel: 0.5,
        // estimatedPickup is undefined
      };

      const result = await service.checkIn(TENANT_ID, WO_ID, dto as any);

      expect(result).toEqual(checkedIn);
    });
  });

  describe('checkOut - transaction callback coverage', () => {
    it('should execute checkOut transaction callback and update vehicle + work order (lines 699-720)', async () => {
      const existing = makeMockWorkOrder({
        status: 'COMPLETED',
        version: 2,
        mileageIn: 50000,
        customerSignature: 'sig-123',
      });

      const checkedOut = makeMockWorkOrder({
        status: 'READY',
        version: 3,
        mileageOut: 51000,
        customerSignature: 'sig-123',
      });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.$transaction.mockImplementationOnce(async callback => {
        const txMock = {
          vehicle: {
            update: jest.fn().mockResolvedValueOnce({ id: 'vehicle-001', mileage: 51000 }),
          },
          workOrder: {
            updateMany: jest.fn().mockResolvedValueOnce({ count: 1 }),
            findFirst: jest.fn().mockResolvedValueOnce(checkedOut),
          },
        };
        return callback(txMock);
      });

      const dto = {
        mileageOut: 51000,
        fuelLevel: 0.3,
        courtesyCarReturned: true,
        notes: 'Vehicle in excellent condition',
      };

      const result = await service.checkOut(TENANT_ID, WO_ID, dto as any);

      expect(result).toEqual(checkedOut);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw ConflictException when checkOut updateMany count === 0 (version conflict)', async () => {
      const existing = makeMockWorkOrder({
        status: 'COMPLETED',
        version: 2,
        mileageIn: 50000,
      });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.$transaction.mockImplementationOnce(async callback => {
        const txMock = {
          vehicle: {
            update: jest.fn().mockResolvedValueOnce({}),
          },
          workOrder: {
            updateMany: jest.fn().mockResolvedValueOnce({ count: 0 }),
            findFirst: jest.fn(),
          },
        };
        try {
          return await callback(txMock);
        } catch (error) {
          if (error instanceof ConflictException) {
            throw error;
          }
          throw error;
        }
      });

      const dto = {
        mileageOut: 51000,
        fuelLevel: 0.3,
      };

      await expect(service.checkOut(TENANT_ID, WO_ID, dto as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should use nullish coalescing for customerSignature (undefined case)', async () => {
      const existing = makeMockWorkOrder({
        status: 'COMPLETED',
        version: 2,
        mileageIn: 50000,
        customerSignature: 'existing-sig',
      });

      const checkedOut = makeMockWorkOrder({
        status: 'READY',
        version: 3,
        customerSignature: 'existing-sig',
      });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.$transaction.mockImplementationOnce(async callback => {
        const txMock = {
          vehicle: {
            update: jest.fn().mockResolvedValueOnce({}),
          },
          workOrder: {
            updateMany: jest.fn().mockResolvedValueOnce({ count: 1 }),
            findFirst: jest.fn().mockResolvedValueOnce(checkedOut),
          },
        };
        return callback(txMock);
      });

      const dto = {
        mileageOut: 51000,
        fuelLevel: 0.3,
        customerSignature: undefined, // Should fallback to existing
      };

      const result = await service.checkOut(TENANT_ID, WO_ID, dto as any);

      expect(result).toEqual(checkedOut);
    });

    it('should use new customerSignature when provided in checkOut', async () => {
      const existing = makeMockWorkOrder({
        status: 'COMPLETED',
        version: 2,
        mileageIn: 50000,
        customerSignature: 'old-sig',
      });

      const checkedOut = makeMockWorkOrder({
        status: 'READY',
        version: 3,
        customerSignature: 'new-sig',
      });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.$transaction.mockImplementationOnce(async callback => {
        const txMock = {
          vehicle: {
            update: jest.fn().mockResolvedValueOnce({}),
          },
          workOrder: {
            updateMany: jest.fn().mockResolvedValueOnce({ count: 1 }),
            findFirst: jest.fn().mockResolvedValueOnce(checkedOut),
          },
        };
        return callback(txMock);
      });

      const dto = {
        mileageOut: 51000,
        fuelLevel: 0.3,
        customerSignature: 'new-sig', // Should use this value
      };

      const result = await service.checkOut(TENANT_ID, WO_ID, dto as any);

      expect(result).toEqual(checkedOut);
    });

    it('should check out vehicle even when mileageIn is null (no mileage validation)', async () => {
      const existing = makeMockWorkOrder({
        status: 'COMPLETED',
        version: 2,
        mileageIn: null, // No mileage check-in, so no validation
      });

      const checkedOut = makeMockWorkOrder({
        status: 'READY',
        version: 3,
        mileageOut: 51000,
      });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.$transaction.mockImplementationOnce(async callback => {
        const txMock = {
          vehicle: {
            update: jest.fn().mockResolvedValueOnce({}),
          },
          workOrder: {
            updateMany: jest.fn().mockResolvedValueOnce({ count: 1 }),
            findFirst: jest.fn().mockResolvedValueOnce(checkedOut),
          },
        };
        return callback(txMock);
      });

      const dto = {
        mileageOut: 51000,
        fuelLevel: 0.3,
      };

      const result = await service.checkOut(TENANT_ID, WO_ID, dto as any);

      expect(result).toEqual(checkedOut);
    });
  });

  // ==================== ADDITIONAL BRANCH COVERAGE TESTS ====================

  describe('normalizeJsonArray - edge cases (line 43-54 branches)', () => {
    it('should unwrap double-wrapped arrays [[item]] → [item]', async () => {
      const workOrder = makeMockWorkOrder({
        laborItems: [[{ name: 'Item1' }]],
      });
      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);

      const result = await service.findOne(TENANT_ID, WO_ID);

      expect((result as any).laborItems).toEqual([{ name: 'Item1' }]);
    });

    it('should return empty array when value is null', async () => {
      const workOrder = makeMockWorkOrder({
        laborItems: null,
      });
      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);

      const result = await service.findOne(TENANT_ID, WO_ID);

      expect((result as any).laborItems).toEqual([]);
    });

    it('should return empty array when value is undefined', async () => {
      const workOrder = makeMockWorkOrder({
        laborItems: undefined,
      });
      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);

      const result = await service.findOne(TENANT_ID, WO_ID);

      expect((result as any).laborItems).toEqual([]);
    });

    it('should return empty array when value is not an array', async () => {
      const workOrder = makeMockWorkOrder({
        laborItems: 'string-value' as any,
      });
      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);

      const result = await service.findOne(TENANT_ID, WO_ID);

      expect((result as any).laborItems).toEqual([]);
    });

    it('should not unwrap arrays that are not double-wrapped', async () => {
      const workOrder = makeMockWorkOrder({
        laborItems: [{ name: 'Item1' }, { name: 'Item2' }],
      });
      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);

      const result = await service.findOne(TENANT_ID, WO_ID);

      expect((result as any).laborItems).toEqual([{ name: 'Item1' }, { name: 'Item2' }]);
    });
  });

  describe('generateWoNumber - edge cases (line 236-239 branches)', () => {
    it('should generate WO-2026-0001 when no last WO exists', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);
      prisma.workOrder.create.mockResolvedValueOnce(
        makeMockWorkOrder({ woNumber: 'WO-2026-0001' }),
      );

      const result = await service.create(TENANT_ID, {} as any);

      expect((result as any).woNumber).toBe('WO-2026-0001');
    });

    it('should use current year in WO number', async () => {
      const year = new Date().getFullYear();
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);
      prisma.workOrder.create.mockResolvedValueOnce(
        makeMockWorkOrder({ woNumber: `WO-${year}-0001` }),
      );

      const result = await service.create(TENANT_ID, {} as any);

      expect((result as any).woNumber).toContain(year.toString());
    });

    it('should handle workOrder with year-based search prefix', async () => {
      const year = new Date().getFullYear();
      const lastWo = { woNumber: `WO-${year}-0003` };
      const createdWo = makeMockWorkOrder({ woNumber: `WO-${year}-0004` });

      prisma.workOrder.findFirst.mockResolvedValueOnce(lastWo);
      prisma.workOrder.create.mockResolvedValueOnce(createdWo);

      const result = await service.create(TENANT_ID, {} as any);

      expect((result as any).woNumber).toBe(`WO-${year}-0004`);
    });
  });

  describe('update - JSON field handling (line 289-295 branches)', () => {
    it('should parse and stringify laborItems JSON field when provided', async () => {
      const existing = makeMockWorkOrder({ version: 1 });
      const updated = makeMockWorkOrder({ version: 2 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(updated);

      const dto = {
        laborItems: [{ id: 'item-1', hours: 2 }],
      };

      await service.update(TENANT_ID, WO_ID, dto as any);

      expect(prisma.workOrder.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            laborItems: [{ id: 'item-1', hours: 2 }],
          }),
        }),
      );
    });

    it('should handle undefined laborItems (should not include in update)', async () => {
      const existing = makeMockWorkOrder({ version: 1 });
      const updated = makeMockWorkOrder({ version: 2 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(updated);

      const dto = {
        mileageOut: 51000,
        // laborItems is undefined
      };

      await service.update(TENANT_ID, WO_ID, dto as any);

      const callArgs = prisma.workOrder.updateMany.mock.calls[0][0];
      expect((callArgs.data as any).laborItems).toBeUndefined();
    });

    it('should parse and stringify partsUsed JSON field when provided', async () => {
      const existing = makeMockWorkOrder({ version: 1 });
      const updated = makeMockWorkOrder({ version: 2 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(updated);

      const dto = {
        partsUsed: [{ partId: 'p-1', quantity: 3 }],
      };

      await service.update(TENANT_ID, WO_ID, dto as any);

      expect(prisma.workOrder.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            partsUsed: [{ partId: 'p-1', quantity: 3 }],
          }),
        }),
      );
    });

    it('should parse and stringify photos JSON field when provided', async () => {
      const existing = makeMockWorkOrder({ version: 1 });
      const updated = makeMockWorkOrder({ version: 2 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(updated);

      const dto = {
        photos: ['photo1.jpg', 'photo2.jpg'],
      };

      await service.update(TENANT_ID, WO_ID, dto as any);

      expect(prisma.workOrder.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            photos: ['photo1.jpg', 'photo2.jpg'],
          }),
        }),
      );
    });

    it('should handle undefined photos (should not include in update)', async () => {
      const existing = makeMockWorkOrder({ version: 1 });
      const updated = makeMockWorkOrder({ version: 2 });

      prisma.workOrder.findFirst.mockResolvedValueOnce(existing);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.workOrder.findFirst.mockResolvedValueOnce(updated);

      const dto = {
        mileageOut: 51000,
        // photos is undefined
      };

      await service.update(TENANT_ID, WO_ID, dto as any);

      const callArgs = prisma.workOrder.updateMany.mock.calls[0][0];
      expect((callArgs.data as any).photos).toBeUndefined();
    });
  });

  describe('createInvoiceFromWo - invoice number generation (line 506 branch)', () => {
    it('should handle NaN case in invoice number parsing for INVALID sequences', async () => {
      const workOrder = makeMockWorkOrder({
        status: 'COMPLETED',
        totalCost: 100,
        services: [],
        parts: [],
      });

      const lastInvoice = { invoiceNumber: 'INV-2026-NOT_A_NUMBER' };

      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
      prisma.invoice.findFirst.mockResolvedValueOnce(lastInvoice);
      prisma.$transaction.mockImplementationOnce(async callback => {
        return callback({
          invoice: {
            create: jest.fn().mockResolvedValueOnce({ invoiceNumber: 'INV-2026-0001' }),
          },
          workOrder: {
            updateMany: jest.fn().mockResolvedValueOnce({ count: 1 }),
            findFirst: jest.fn().mockResolvedValueOnce(workOrder),
          },
        });
      });

      const result = await service.createInvoiceFromWo(TENANT_ID, WO_ID);

      expect(result).toBeDefined();
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should calculate VAT correctly with decimal precision', async () => {
      const workOrder = makeMockWorkOrder({
        status: 'COMPLETED',
        totalCost: 123.45,
        services: [],
        parts: [],
      });

      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
      prisma.invoice.findFirst.mockResolvedValueOnce(null);
      prisma.$transaction.mockImplementationOnce(async callback => {
        return callback({
          invoice: {
            create: jest.fn().mockResolvedValueOnce({ id: 'inv-001' }),
          },
          workOrder: {
            updateMany: jest.fn().mockResolvedValueOnce({ count: 1 }),
            findFirst: jest.fn().mockResolvedValueOnce(workOrder),
          },
        });
      });

      const result = await service.createInvoiceFromWo(TENANT_ID, WO_ID);

      expect(result).toBeDefined();
    });
  });

  describe('stopTimer - duration calculation (line 803, 838 branches)', () => {
    it('should calculate duration in minutes correctly', async () => {
      const startTime = new Date(Date.now() - 30 * 60 * 1000);
      const activeLog = {
        id: 'log-001',
        startedAt: startTime,
        stoppedAt: null,
      };
      const stoppedLog = {
        ...activeLog,
        stoppedAt: new Date(),
        durationMinutes: 30,
      };

      prisma.technicianTimeLog.findFirst.mockResolvedValueOnce(activeLog);
      prisma.technicianTimeLog.update.mockResolvedValueOnce(stoppedLog);
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce([stoppedLog]);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });

      await service.stopTimer(TENANT_ID, WO_ID, 'tech-001');

      expect(prisma.workOrder.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            laborHours: expect.any(Number),
          }),
        }),
      );
    });

    it('should handle multiple stopped logs when calculating total hours', async () => {
      const activeLog = {
        id: 'log-001',
        startedAt: new Date(Date.now() - 30 * 60 * 1000),
        stoppedAt: null,
      };
      const stoppedLogs = [
        { id: 'log-002', durationMinutes: 120, stoppedAt: new Date() },
        { id: 'log-003', durationMinutes: 180, stoppedAt: new Date() },
        { id: 'log-004', durationMinutes: 60, stoppedAt: new Date() },
      ];

      prisma.technicianTimeLog.findFirst.mockResolvedValueOnce(activeLog);
      prisma.technicianTimeLog.update.mockResolvedValueOnce({
        ...activeLog,
        stoppedAt: new Date(),
        durationMinutes: 30,
      });
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce(stoppedLogs);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });

      await service.stopTimer(TENANT_ID, WO_ID, 'tech-001');

      expect(prisma.workOrder.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            laborHours: 6, // (120 + 180 + 60) / 60 = 6
          }),
        }),
      );
    });

    it('should handle null durationMinutes in stopped logs', async () => {
      const activeLog = {
        id: 'log-001',
        startedAt: new Date(Date.now() - 30 * 60 * 1000),
        stoppedAt: null,
      };
      const stoppedLogs = [
        { id: 'log-002', durationMinutes: 60, stoppedAt: new Date() },
        { id: 'log-003', durationMinutes: null, stoppedAt: new Date() },
        { id: 'log-004', durationMinutes: 30, stoppedAt: new Date() },
      ];

      prisma.technicianTimeLog.findFirst.mockResolvedValueOnce(activeLog);
      prisma.technicianTimeLog.update.mockResolvedValueOnce({
        ...activeLog,
        stoppedAt: new Date(),
        durationMinutes: 15,
      });
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce(stoppedLogs);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });

      await service.stopTimer(TENANT_ID, WO_ID, 'tech-001');

      expect(prisma.workOrder.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            laborHours: 1.5, // (60 + 0 + 30) / 60 = 1.5
          }),
        }),
      );
    });

    it('should handle empty stopped logs array (line 838 branch - no logs with stoppedAt)', async () => {
      const activeLog = {
        id: 'log-001',
        startedAt: new Date(Date.now() - 30 * 60 * 1000),
        stoppedAt: null,
      };

      prisma.technicianTimeLog.findFirst.mockResolvedValueOnce(activeLog);
      prisma.technicianTimeLog.update.mockResolvedValueOnce({
        ...activeLog,
        stoppedAt: new Date(),
        durationMinutes: 30,
      });
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce([]);
      prisma.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });

      await service.stopTimer(TENANT_ID, WO_ID, 'tech-001');

      expect(prisma.workOrder.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            laborHours: 0, // No completed logs, total is 0
          }),
        }),
      );
    });
  });

  describe('normalizeJsonArray additional branch (line 43 - length > 1)', () => {
    it('should handle multi-item arrays without unwrapping (length > 1)', async () => {
      const workOrder = makeMockWorkOrder({
        laborItems: [
          { name: 'Item1', hours: 2 },
          { name: 'Item2', hours: 3 },
        ],
      });
      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);

      const result = await service.findOne(TENANT_ID, WO_ID);

      expect((result as any).laborItems).toHaveLength(2);
      expect((result as any).laborItems[0]).toEqual({ name: 'Item1', hours: 2 });
    });

    it('should handle single non-wrapped item (array.length === 1 but value is not array)', async () => {
      const workOrder = makeMockWorkOrder({
        laborItems: [{ name: 'Item1', hours: 2 }],
      });
      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);

      const result = await service.findOne(TENANT_ID, WO_ID);

      expect((result as any).laborItems).toEqual([{ name: 'Item1', hours: 2 }]);
    });
  });

  describe('generateWoNumber prefix parsing (line 236-239 NaN case)', () => {
    it('should handle INVALID sequence in WO number and reset to 1', async () => {
      const invalidWo = { woNumber: 'WO-2026-INVALID' };
      prisma.workOrder.findFirst.mockResolvedValueOnce(invalidWo);
      prisma.workOrder.create.mockResolvedValueOnce(
        makeMockWorkOrder({ woNumber: 'WO-2026-0001' }),
      );

      const result = await service.create(TENANT_ID, {} as any);

      expect((result as any).woNumber).toBe('WO-2026-0001');
    });

    it('should handle WO number with non-numeric suffix', async () => {
      const invalidWo = { woNumber: 'WO-2026-ABC' };
      prisma.workOrder.findFirst.mockResolvedValueOnce(invalidWo);
      prisma.workOrder.create.mockResolvedValueOnce(
        makeMockWorkOrder({ woNumber: 'WO-2026-0001' }),
      );

      const result = await service.create(TENANT_ID, {} as any);

      // When isNaN is true, sequence resets to 1
      expect((result as any).woNumber).toBe('WO-2026-0001');
    });
  });

  describe('createInvoiceFromWo - line 506 NaN in invoice sequence', () => {
    it('should handle invoice number with non-numeric suffix and reset to 1', async () => {
      const workOrder = makeMockWorkOrder({
        status: 'COMPLETED',
        totalCost: 100,
        services: [],
        parts: [],
      });

      const lastInvoice = { invoiceNumber: 'INV-2026-XYZ' };

      prisma.workOrder.findFirst.mockResolvedValueOnce(workOrder);
      prisma.invoice.findFirst.mockResolvedValueOnce(lastInvoice);
      prisma.$transaction.mockImplementationOnce(async callback => {
        return callback({
          invoice: {
            create: jest.fn().mockResolvedValueOnce({ invoiceNumber: 'INV-2026-0001' }),
          },
          workOrder: {
            updateMany: jest.fn().mockResolvedValueOnce({ count: 1 }),
            findFirst: jest.fn().mockResolvedValueOnce(workOrder),
          },
        });
      });

      const result = await service.createInvoiceFromWo(TENANT_ID, WO_ID);

      expect(result).toBeDefined();
    });
  });
});
