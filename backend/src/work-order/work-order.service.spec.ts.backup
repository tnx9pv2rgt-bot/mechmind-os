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
    priority: 'MEDIUM',
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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkOrderService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<WorkOrderService>(WorkOrderService);
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
