import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { WorkOrderService } from './work-order.service';
import { PrismaService } from '../common/services/prisma.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';

// ---------------------------------------------------------------------------
// Type helpers for Prisma mock delegates
// ---------------------------------------------------------------------------

interface MockWorkOrderDelegate {
  findFirst: jest.Mock;
  findMany: jest.Mock;
  count: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
}

interface MockInvoiceDelegate {
  findFirst: jest.Mock;
  create: jest.Mock;
}

interface MockPrisma {
  workOrder: MockWorkOrderDelegate;
  invoice: MockInvoiceDelegate;
  $transaction: jest.Mock;
}

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const WO_ID = 'wo-001';
const VEHICLE_ID = 'vehicle-001';
const CUSTOMER_ID = 'customer-001';
const YEAR = new Date().getFullYear();

// ---------------------------------------------------------------------------
// Mock data factories
// ---------------------------------------------------------------------------

function makeMockWorkOrder(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: WO_ID,
    tenantId: TENANT_ID,
    woNumber: `WO-${YEAR}-0001`,
    vehicleId: VEHICLE_ID,
    customerId: CUSTOMER_ID,
    technicianId: null,
    bookingId: null,
    diagnosis: 'Brake issue',
    customerRequest: 'Brakes squeaking',
    mileageIn: 50000,
    mileageOut: null,
    status: 'PENDING',
    laborItems: null,
    partsUsed: null,
    laborHours: null,
    laborCost: null,
    partsCost: null,
    totalCost: null,
    photos: null,
    customerSignature: null,
    assignedBayId: null,
    estimatedCompletion: null,
    actualStartTime: null,
    actualCompletionTime: null,
    invoiceId: null,
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-01'),
    vehicle: {
      id: VEHICLE_ID,
      licensePlate: 'AB123CD',
      make: 'BMW',
      model: '320d',
      year: 2020,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('WorkOrderService', () => {
  let service: WorkOrderService;
  let prisma: MockPrisma;

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

  // -----------------------------------------------------------------------
  // findAll
  // -----------------------------------------------------------------------

  describe('findAll', () => {
    it('should return all work orders for a tenant', async () => {
      const workOrders = [makeMockWorkOrder()];
      prisma.workOrder.findMany.mockResolvedValue(workOrders);
      prisma.workOrder.count.mockResolvedValue(1);

      const result = await service.findAll(TENANT_ID);

      // normalizeWorkOrder converts null laborItems/partsUsed to []
      const normalizedWo = { ...workOrders[0], laborItems: [], partsUsed: [] };
      expect(result).toEqual({
        workOrders: [normalizedWo],
        total: 1,
        page: 1,
        limit: 20,
        pages: 1,
      });
      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should apply status filter', async () => {
      prisma.workOrder.findMany.mockResolvedValue([]);
      prisma.workOrder.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, { status: 'IN_PROGRESS' });

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, status: 'IN_PROGRESS' },
        }),
      );
    });

    it('should apply vehicleId filter', async () => {
      prisma.workOrder.findMany.mockResolvedValue([]);
      prisma.workOrder.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, { vehicleId: VEHICLE_ID });

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, vehicleId: VEHICLE_ID },
        }),
      );
    });

    it('should apply customerId filter', async () => {
      prisma.workOrder.findMany.mockResolvedValue([]);
      prisma.workOrder.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, { customerId: CUSTOMER_ID });

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, customerId: CUSTOMER_ID },
        }),
      );
    });

    it('should throw InternalServerErrorException on database failure', async () => {
      prisma.workOrder.findMany.mockRejectedValue(new Error('DB connection lost'));

      await expect(service.findAll(TENANT_ID)).rejects.toThrow(InternalServerErrorException);
    });
  });

  // -----------------------------------------------------------------------
  // findOne
  // -----------------------------------------------------------------------

  describe('findOne', () => {
    it('should return a single work order with relations', async () => {
      const wo = makeMockWorkOrder();
      prisma.workOrder.findFirst.mockResolvedValue(wo);

      const result = await service.findOne(TENANT_ID, WO_ID);

      // normalizeWorkOrder converts null laborItems/partsUsed to []
      expect(result).toEqual({ ...wo, laborItems: [], partsUsed: [] });
      expect(prisma.workOrder.findFirst).toHaveBeenCalledWith({
        where: { id: WO_ID, tenantId: TENANT_ID },
        include: expect.objectContaining({
          vehicle: expect.any(Object),
          technicians: true,
          services: true,
          parts: true,
        }),
      });
    });

    it('should throw NotFoundException when work order does not exist', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null);

      await expect(service.findOne(TENANT_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      prisma.workOrder.findFirst.mockRejectedValue(new Error('DB error'));

      await expect(service.findOne(TENANT_ID, WO_ID)).rejects.toThrow(InternalServerErrorException);
    });
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------

  describe('create', () => {
    const dto: CreateWorkOrderDto = {
      vehicleId: VEHICLE_ID,
      customerId: CUSTOMER_ID,
      diagnosis: 'Brake issue',
      customerRequest: 'Brakes squeaking',
      mileageIn: 50000,
    };

    it('should create a work order with auto-generated WO number', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null); // no previous WO
      const created = makeMockWorkOrder();
      prisma.workOrder.create.mockResolvedValue(created);

      const result = await service.create(TENANT_ID, dto);

      expect(result).toEqual(created);
      expect(prisma.workOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            woNumber: `WO-${YEAR}-0001`,
            vehicleId: VEHICLE_ID,
            customerId: CUSTOMER_ID,
            status: 'PENDING',
          }),
        }),
      );
    });

    it('should increment WO number when previous orders exist', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({
        woNumber: `WO-${YEAR}-0010`,
      });
      prisma.workOrder.create.mockResolvedValue(makeMockWorkOrder({ woNumber: `WO-${YEAR}-0011` }));

      await service.create(TENANT_ID, dto);

      expect(prisma.workOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            woNumber: `WO-${YEAR}-0011`,
          }),
        }),
      );
    });

    it('should throw InternalServerErrorException on database failure', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null);
      prisma.workOrder.create.mockRejectedValue(new Error('DB write error'));

      await expect(service.create(TENANT_ID, dto)).rejects.toThrow(InternalServerErrorException);
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------

  describe('update', () => {
    const dto: UpdateWorkOrderDto = {
      diagnosis: 'Updated diagnosis',
      laborHours: 2.5,
      laborCost: 125,
    };

    it('should update an existing work order', async () => {
      const existing = makeMockWorkOrder();
      const updated = makeMockWorkOrder({
        diagnosis: 'Updated diagnosis',
        laborHours: 2.5,
        laborCost: 125,
      });
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);
      prisma.workOrder.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.update(TENANT_ID, WO_ID, dto);

      expect(result).toEqual(updated);
      expect(prisma.workOrder.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: WO_ID, tenantId: TENANT_ID }),
          data: expect.objectContaining({
            diagnosis: 'Updated diagnosis',
            laborHours: 2.5,
            laborCost: 125,
          }),
        }),
      );
    });

    it('should throw NotFoundException when work order does not exist', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null);

      await expect(service.update(TENANT_ID, 'nonexistent', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder());
      prisma.workOrder.updateMany.mockRejectedValue(new Error('DB error'));

      await expect(service.update(TENANT_ID, WO_ID, dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should serialize laborItems and partsUsed as JSON', async () => {
      const existing = makeMockWorkOrder();
      const updated = makeMockWorkOrder();
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);
      prisma.workOrder.updateMany.mockResolvedValue({ count: 1 });

      const dtoWithItems: UpdateWorkOrderDto = {
        laborItems: [{ description: 'Brake pad replacement', hours: 1.5, rate: 80 }],
        partsUsed: [{ name: 'Brake pads', quantity: 1, unitPrice: 45 }],
      };

      await service.update(TENANT_ID, WO_ID, dtoWithItems);

      expect(prisma.workOrder.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            laborItems: JSON.parse(JSON.stringify(dtoWithItems.laborItems)),
            partsUsed: JSON.parse(JSON.stringify(dtoWithItems.partsUsed)),
          }),
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // start
  // -----------------------------------------------------------------------

  describe('start', () => {
    it('should start a PENDING work order', async () => {
      const existing = makeMockWorkOrder({ status: 'PENDING' });
      const started = makeMockWorkOrder({
        status: 'IN_PROGRESS',
        actualStartTime: new Date(),
      });
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(started);
      prisma.workOrder.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.start(TENANT_ID, WO_ID);

      expect(result).toEqual(started);
      expect(prisma.workOrder.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: WO_ID, tenantId: TENANT_ID }),
          data: expect.objectContaining({
            status: 'IN_PROGRESS',
            actualStartTime: expect.any(Date),
          }),
        }),
      );
    });

    it('should start a CHECKED_IN work order', async () => {
      const existing = makeMockWorkOrder({ status: 'CHECKED_IN' });
      prisma.workOrder.findFirst
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(makeMockWorkOrder({ status: 'IN_PROGRESS' }));
      prisma.workOrder.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.start(TENANT_ID, WO_ID);

      expect(result).toBeDefined();
    });

    it('should start an OPEN work order', async () => {
      const existing = makeMockWorkOrder({ status: 'OPEN' });
      prisma.workOrder.findFirst
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(makeMockWorkOrder({ status: 'IN_PROGRESS' }));
      prisma.workOrder.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.start(TENANT_ID, WO_ID);

      expect(result).toBeDefined();
    });

    it('should throw BadRequestException when status is invalid for start', async () => {
      const existing = makeMockWorkOrder({ status: 'COMPLETED' });
      prisma.workOrder.findFirst.mockResolvedValue(existing);

      await expect(service.start(TENANT_ID, WO_ID)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when work order does not exist', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null);

      await expect(service.start(TENANT_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // complete
  // -----------------------------------------------------------------------

  describe('complete', () => {
    it('should complete an IN_PROGRESS work order', async () => {
      const existing = makeMockWorkOrder({ status: 'IN_PROGRESS' });
      const completed = makeMockWorkOrder({
        status: 'COMPLETED',
        actualCompletionTime: new Date(),
      });
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(completed);
      prisma.workOrder.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.complete(TENANT_ID, WO_ID);

      expect(result).toEqual(completed);
      expect(prisma.workOrder.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: WO_ID, tenantId: TENANT_ID }),
          data: expect.objectContaining({
            status: 'COMPLETED',
            actualCompletionTime: expect.any(Date),
          }),
        }),
      );
    });

    it('should complete a QUALITY_CHECK work order', async () => {
      const existing = makeMockWorkOrder({ status: 'QUALITY_CHECK' });
      prisma.workOrder.findFirst
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(makeMockWorkOrder({ status: 'COMPLETED' }));
      prisma.workOrder.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.complete(TENANT_ID, WO_ID);

      expect(result).toBeDefined();
    });

    it('should throw BadRequestException when status is invalid for completion', async () => {
      const existing = makeMockWorkOrder({ status: 'PENDING' });
      prisma.workOrder.findFirst.mockResolvedValue(existing);

      await expect(service.complete(TENANT_ID, WO_ID)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when work order does not exist', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null);

      await expect(service.complete(TENANT_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // createInvoiceFromWo
  // -----------------------------------------------------------------------

  describe('createInvoiceFromWo', () => {
    it('should create an invoice from a COMPLETED work order', async () => {
      const wo = makeMockWorkOrder({
        status: 'COMPLETED',
        totalCost: 500,
        services: [
          {
            actualMinutes: 120,
            estimatedMinutes: 120,
            service: { name: 'Brake repair', laborRate: 80, price: 80 },
          },
        ],
        parts: [
          {
            quantity: 2,
            part: { name: 'Brake pads', retailPrice: 45 },
          },
        ],
      });
      prisma.workOrder.findFirst.mockResolvedValue(wo);
      prisma.invoice.findFirst.mockResolvedValue(null);

      const mockInvoice = {
        id: 'invoice-new',
        invoiceNumber: `INV-${YEAR}-0001`,
        tenantId: TENANT_ID,
      };
      const mockUpdatedWo = { ...wo, status: 'INVOICED', invoiceId: 'invoice-new' };

      const mockTx = {
        invoice: {
          create: jest.fn().mockResolvedValue(mockInvoice),
        },
        workOrder: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findFirst: jest.fn().mockResolvedValue(mockUpdatedWo),
        },
      };

      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn(mockTx);
      });

      const result = (await service.createInvoiceFromWo(TENANT_ID, WO_ID)) as Record<
        string,
        unknown
      >;

      expect(result.invoice).toEqual(mockInvoice);
      expect(result.workOrder).toEqual(mockUpdatedWo);
      expect(mockTx.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            customerId: CUSTOMER_ID,
            workOrderId: WO_ID,
            invoiceNumber: `INV-${YEAR}-0001`,
            status: 'DRAFT',
            taxRate: 22,
          }),
        }),
      );
      expect(mockTx.workOrder.updateMany).toHaveBeenCalledWith({
        where: { id: WO_ID, tenantId: TENANT_ID },
        data: {
          status: 'INVOICED',
          invoiceId: 'invoice-new',
        },
      });
    });

    it('should create an invoice from a READY work order', async () => {
      const wo = makeMockWorkOrder({ status: 'READY', totalCost: 200, services: [], parts: [] });
      prisma.workOrder.findFirst.mockResolvedValue(wo);
      prisma.invoice.findFirst.mockResolvedValue(null);

      const mockTx = {
        invoice: { create: jest.fn().mockResolvedValue({ id: 'inv-1' }) },
        workOrder: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findFirst: jest.fn().mockResolvedValue({ ...wo, status: 'INVOICED' }),
        },
      };
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(mockTx),
      );

      const result = await service.createInvoiceFromWo(TENANT_ID, WO_ID);

      expect(result).toBeDefined();
    });

    it('should throw BadRequestException when work order is already INVOICED', async () => {
      const wo = makeMockWorkOrder({ status: 'INVOICED', services: [], parts: [] });
      prisma.workOrder.findFirst.mockResolvedValue(wo);

      await expect(service.createInvoiceFromWo(TENANT_ID, WO_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when status is PENDING', async () => {
      const wo = makeMockWorkOrder({ status: 'PENDING', services: [], parts: [] });
      prisma.workOrder.findFirst.mockResolvedValue(wo);

      await expect(service.createInvoiceFromWo(TENANT_ID, WO_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when work order does not exist', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null);

      await expect(service.createInvoiceFromWo(TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should increment invoice number when previous invoices exist', async () => {
      const wo = makeMockWorkOrder({
        status: 'COMPLETED',
        totalCost: 100,
        services: [],
        parts: [],
      });
      prisma.workOrder.findFirst.mockResolvedValue(wo);
      prisma.invoice.findFirst.mockResolvedValue({
        invoiceNumber: `INV-${YEAR}-0003`,
      });

      const mockTx = {
        invoice: { create: jest.fn().mockResolvedValue({ id: 'inv-new' }) },
        workOrder: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findFirst: jest.fn().mockResolvedValue({ ...wo, status: 'INVOICED' }),
        },
      };
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(mockTx),
      );

      await service.createInvoiceFromWo(TENANT_ID, WO_ID);

      expect(mockTx.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            invoiceNumber: `INV-${YEAR}-0004`,
          }),
        }),
      );
    });

    it('should handle work orders with no labor or parts', async () => {
      const wo = makeMockWorkOrder({
        status: 'COMPLETED',
        totalCost: 0,
        services: [],
        parts: [],
      });
      prisma.workOrder.findFirst.mockResolvedValue(wo);
      prisma.invoice.findFirst.mockResolvedValue(null);

      const mockTx = {
        invoice: { create: jest.fn().mockResolvedValue({ id: 'inv-empty' }) },
        workOrder: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findFirst: jest.fn().mockResolvedValue({ ...wo, status: 'INVOICED' }),
        },
      };
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(mockTx),
      );

      await service.createInvoiceFromWo(TENANT_ID, WO_ID);

      expect(mockTx.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            items: [],
            subtotal: 0,
          }),
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // State Machine — validateTransition coverage
  // -----------------------------------------------------------------------

  describe('State Machine', () => {
    beforeEach(() => {
      prisma.workOrder.update.mockResolvedValue(makeMockWorkOrder());
      prisma.workOrder.updateMany.mockResolvedValue({ count: 1 });
    });

    it('should allow PENDING → IN_PROGRESS (start)', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder({ status: 'PENDING' }));
      await expect(service.start(TENANT_ID, WO_ID)).resolves.toBeDefined();
    });

    it('should allow OPEN → CHECKED_IN (checkIn)', async () => {
      const checkedInWo = makeMockWorkOrder({ status: 'CHECKED_IN' });
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder({ status: 'OPEN' }));
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          vehicle: { update: jest.fn().mockResolvedValue({}) },
          workOrder: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            findFirst: jest.fn().mockResolvedValue(checkedInWo),
          },
        }),
      );

      await expect(
        service.checkIn(TENANT_ID, WO_ID, {
          vehicleId: VEHICLE_ID,
          mileageIn: 50000,
          fuelLevel: '3/4',
        } as never),
      ).resolves.toBeDefined();
    });

    it('should reject INVOICED → IN_PROGRESS (start)', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder({ status: 'INVOICED' }));
      await expect(service.start(TENANT_ID, WO_ID)).rejects.toThrow(BadRequestException);
    });

    it('should reject PENDING → COMPLETED (complete)', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder({ status: 'PENDING' }));
      await expect(service.complete(TENANT_ID, WO_ID)).rejects.toThrow(BadRequestException);
    });

    it('should reject IN_PROGRESS → INVOICED (createInvoiceFromWo)', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(
        makeMockWorkOrder({ status: 'IN_PROGRESS', services: [], parts: [] }),
      );
      await expect(service.createInvoiceFromWo(TENANT_ID, WO_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject INVOICED → INVOICED (createInvoiceFromWo)', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(
        makeMockWorkOrder({ status: 'INVOICED', services: [], parts: [] }),
      );
      await expect(service.createInvoiceFromWo(TENANT_ID, WO_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow IN_PROGRESS → WAITING_PARTS transition message', async () => {
      // This verifies the transition map exists and covers WAITING_PARTS
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder({ status: 'WAITING_PARTS' }));
      // WAITING_PARTS can only go to IN_PROGRESS, not COMPLETED
      await expect(service.complete(TENANT_ID, WO_ID)).rejects.toThrow(BadRequestException);
    });
  });

  // -----------------------------------------------------------------------
  // update — ConflictException on optimistic lock failure
  // -----------------------------------------------------------------------
  describe('update — optimistic lock conflict', () => {
    it('should throw ConflictException when updateMany returns count 0', async () => {
      const existing = makeMockWorkOrder();
      prisma.workOrder.findFirst.mockResolvedValue(existing);
      prisma.workOrder.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.update(TENANT_ID, WO_ID, { diagnosis: 'new' } as UpdateWorkOrderDto),
      ).rejects.toThrow('Work order modified by another user');
    });
  });

  // -----------------------------------------------------------------------
  // start — ConflictException & InternalServerErrorException
  // -----------------------------------------------------------------------
  describe('start — edge cases', () => {
    it('should throw ConflictException when updateMany returns count 0', async () => {
      const existing = makeMockWorkOrder({ status: 'PENDING' });
      prisma.workOrder.findFirst.mockResolvedValue(existing);
      prisma.workOrder.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.start(TENANT_ID, WO_ID)).rejects.toThrow('Work order modified');
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      const existing = makeMockWorkOrder({ status: 'PENDING' });
      prisma.workOrder.findFirst.mockResolvedValue(existing);
      prisma.workOrder.updateMany.mockRejectedValue(new Error('DB failure'));

      await expect(service.start(TENANT_ID, WO_ID)).rejects.toThrow(InternalServerErrorException);
    });
  });

  // -----------------------------------------------------------------------
  // complete — ConflictException & InternalServerErrorException
  // -----------------------------------------------------------------------
  describe('complete — edge cases', () => {
    it('should throw ConflictException when updateMany returns count 0', async () => {
      const existing = makeMockWorkOrder({ status: 'IN_PROGRESS' });
      prisma.workOrder.findFirst.mockResolvedValue(existing);
      prisma.workOrder.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.complete(TENANT_ID, WO_ID)).rejects.toThrow('Work order modified');
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      const existing = makeMockWorkOrder({ status: 'IN_PROGRESS' });
      prisma.workOrder.findFirst.mockResolvedValue(existing);
      prisma.workOrder.updateMany.mockRejectedValue(new Error('DB failure'));

      await expect(service.complete(TENANT_ID, WO_ID)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // -----------------------------------------------------------------------
  // createInvoiceFromWo — InternalServerErrorException
  // -----------------------------------------------------------------------
  describe('createInvoiceFromWo — error handling', () => {
    it('should throw InternalServerErrorException on unexpected error', async () => {
      const wo = makeMockWorkOrder({
        status: 'COMPLETED',
        totalCost: 100,
        services: [],
        parts: [],
      });
      prisma.workOrder.findFirst.mockResolvedValue(wo);
      prisma.invoice.findFirst.mockResolvedValue(null);
      prisma.$transaction.mockRejectedValue(new Error('TX fail'));

      await expect(service.createInvoiceFromWo(TENANT_ID, WO_ID)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should handle service with null laborRate falling back to price', async () => {
      const wo = makeMockWorkOrder({
        status: 'COMPLETED',
        totalCost: 100,
        services: [
          {
            actualMinutes: null,
            estimatedMinutes: 60,
            service: { name: 'Oil change', laborRate: null, price: 50 },
          },
        ],
        parts: [],
      });
      prisma.workOrder.findFirst.mockResolvedValue(wo);
      prisma.invoice.findFirst.mockResolvedValue(null);

      const mockTx = {
        invoice: { create: jest.fn().mockResolvedValue({ id: 'inv-1' }) },
        workOrder: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findFirst: jest.fn().mockResolvedValue({ ...wo, status: 'INVOICED' }),
        },
      };
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(mockTx),
      );

      await service.createInvoiceFromWo(TENANT_ID, WO_ID);

      expect(mockTx.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            items: expect.arrayContaining([
              expect.objectContaining({ type: 'LABOR', description: 'Oil change' }),
            ]),
          }),
        }),
      );
    });

    it('should handle invoice number with non-numeric suffix gracefully', async () => {
      const wo = makeMockWorkOrder({ status: 'COMPLETED', totalCost: 0, services: [], parts: [] });
      prisma.workOrder.findFirst.mockResolvedValue(wo);
      prisma.invoice.findFirst.mockResolvedValue({
        invoiceNumber: `INV-${YEAR}-INVALID`,
      });

      const mockTx = {
        invoice: { create: jest.fn().mockResolvedValue({ id: 'inv-1' }) },
        workOrder: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findFirst: jest.fn().mockResolvedValue({ ...wo, status: 'INVOICED' }),
        },
      };
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(mockTx),
      );

      await service.createInvoiceFromWo(TENANT_ID, WO_ID);

      // NaN check → sequence stays 1
      expect(mockTx.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            invoiceNumber: `INV-${YEAR}-0001`,
          }),
        }),
      );
    });

    it('should handle WO with null totalCost defaulting to 0', async () => {
      const wo = makeMockWorkOrder({
        status: 'COMPLETED',
        totalCost: null,
        services: [],
        parts: [],
      });
      prisma.workOrder.findFirst.mockResolvedValue(wo);
      prisma.invoice.findFirst.mockResolvedValue(null);

      const mockTx = {
        invoice: { create: jest.fn().mockResolvedValue({ id: 'inv-1' }) },
        workOrder: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findFirst: jest.fn().mockResolvedValue({ ...wo, status: 'INVOICED' }),
        },
      };
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(mockTx),
      );

      await service.createInvoiceFromWo(TENANT_ID, WO_ID);

      expect(mockTx.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ subtotal: 0 }),
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // create — estimatedCompletion/estimatedPickup date parsing
  // -----------------------------------------------------------------------
  describe('create — date fields', () => {
    it('should parse estimatedCompletion when provided', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null);
      prisma.workOrder.create.mockResolvedValue(makeMockWorkOrder());

      const dto: CreateWorkOrderDto = {
        vehicleId: VEHICLE_ID,
        customerId: CUSTOMER_ID,
        diagnosis: 'Test',
        estimatedCompletion: '2026-04-01T12:00:00Z',
      };

      await service.create(TENANT_ID, dto);

      expect(prisma.workOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estimatedCompletion: expect.any(Date),
          }),
        }),
      );
    });

    it('should parse estimatedPickup when provided', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null);
      prisma.workOrder.create.mockResolvedValue(makeMockWorkOrder());

      const dto: CreateWorkOrderDto = {
        vehicleId: VEHICLE_ID,
        customerId: CUSTOMER_ID,
        diagnosis: 'Test',
        estimatedPickup: '2026-04-02T10:00:00Z',
      };

      await service.create(TENANT_ID, dto);

      expect(prisma.workOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estimatedPickup: expect.any(Date),
          }),
        }),
      );
    });

    it('should handle WO number with non-numeric suffix', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({ woNumber: `WO-${YEAR}-ABC` });
      prisma.workOrder.create.mockResolvedValue(makeMockWorkOrder());

      const dto: CreateWorkOrderDto = {
        vehicleId: VEHICLE_ID,
        customerId: CUSTOMER_ID,
        diagnosis: 'Test',
      };

      await service.create(TENANT_ID, dto);

      expect(prisma.workOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ woNumber: `WO-${YEAR}-0001` }),
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // checkIn
  // -----------------------------------------------------------------------
  describe('checkIn', () => {
    const checkInDto = {
      vehicleId: VEHICLE_ID,
      mileageIn: 55000,
      fuelLevel: '3/4',
      damageNotes: 'Minor scratch',
      parkingSpot: 'A3',
      photos: ['photo1.jpg'],
      customerSignature: 'sig-data',
      estimatedPickup: '2026-04-02T17:00:00Z',
    };

    it('should check in a PENDING work order', async () => {
      const existing = makeMockWorkOrder({ status: 'PENDING', version: 1 });
      prisma.workOrder.findFirst.mockResolvedValue(existing);

      const checkedIn = makeMockWorkOrder({ status: 'CHECKED_IN' });
      const mockTx = {
        vehicle: { update: jest.fn().mockResolvedValue({}) },
        workOrder: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findFirst: jest.fn().mockResolvedValue(checkedIn),
        },
      };
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(mockTx),
      );

      const result = await service.checkIn(TENANT_ID, WO_ID, checkInDto as never);
      expect(result).toEqual(checkedIn);
    });

    it('should throw NotFoundException when WO not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null);

      await expect(service.checkIn(TENANT_ID, WO_ID, checkInDto as never)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException on optimistic lock failure', async () => {
      const existing = makeMockWorkOrder({ status: 'PENDING', version: 1 });
      prisma.workOrder.findFirst.mockResolvedValue(existing);

      const mockTx = {
        vehicle: { update: jest.fn().mockResolvedValue({}) },
        workOrder: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          findFirst: jest.fn(),
        },
      };
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(mockTx),
      );

      await expect(service.checkIn(TENANT_ID, WO_ID, checkInDto as never)).rejects.toThrow(
        'Work order modified',
      );
    });

    it('should throw BadRequestException for invalid transition', async () => {
      const existing = makeMockWorkOrder({ status: 'COMPLETED', version: 1 });
      prisma.workOrder.findFirst.mockResolvedValue(existing);

      await expect(service.checkIn(TENANT_ID, WO_ID, checkInDto as never)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // -----------------------------------------------------------------------
  // checkOut
  // -----------------------------------------------------------------------
  describe('checkOut', () => {
    const checkOutDto = {
      mileageOut: 55100,
      fuelLevel: '1/2',
      customerSignature: 'sig-out',
      courtesyCarReturned: true,
      notes: 'All good',
    };

    it('should check out a COMPLETED work order', async () => {
      const existing = makeMockWorkOrder({ status: 'COMPLETED', version: 1, mileageIn: 55000 });
      prisma.workOrder.findFirst.mockResolvedValue(existing);

      const checkedOut = makeMockWorkOrder({ status: 'READY' });
      const mockTx = {
        vehicle: { update: jest.fn().mockResolvedValue({}) },
        workOrder: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findFirst: jest.fn().mockResolvedValue(checkedOut),
        },
      };
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(mockTx),
      );

      const result = await service.checkOut(TENANT_ID, WO_ID, checkOutDto as never);
      expect(result).toEqual(checkedOut);
    });

    it('should throw NotFoundException when WO not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null);

      await expect(service.checkOut(TENANT_ID, WO_ID, checkOutDto as never)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when mileageOut < mileageIn', async () => {
      const existing = makeMockWorkOrder({ status: 'COMPLETED', version: 1, mileageIn: 60000 });
      prisma.workOrder.findFirst.mockResolvedValue(existing);

      await expect(
        service.checkOut(TENANT_ID, WO_ID, { ...checkOutDto, mileageOut: 50000 } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException on optimistic lock failure', async () => {
      const existing = makeMockWorkOrder({ status: 'COMPLETED', version: 1, mileageIn: null });
      prisma.workOrder.findFirst.mockResolvedValue(existing);

      const mockTx = {
        vehicle: { update: jest.fn().mockResolvedValue({}) },
        workOrder: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          findFirst: jest.fn(),
        },
      };
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(mockTx),
      );

      await expect(service.checkOut(TENANT_ID, WO_ID, checkOutDto as never)).rejects.toThrow(
        'Work order modified',
      );
    });
  });

  // -----------------------------------------------------------------------
  // startTimer / stopTimer / getTimer
  // -----------------------------------------------------------------------
  describe('startTimer', () => {
    it('should create a new time log', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder());
      (prisma as unknown as Record<string, unknown>).technicianTimeLog = {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'log-1', startedAt: new Date() }),
      };

      const result = await service.startTimer(TENANT_ID, WO_ID, 'tech-001');
      expect(result).toEqual(expect.objectContaining({ id: 'log-1' }));
    });

    it('should throw NotFoundException when WO not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null);

      await expect(service.startTimer(TENANT_ID, 'nonexistent', 'tech-001')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when timer already active', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder());
      (prisma as unknown as Record<string, unknown>).technicianTimeLog = {
        findFirst: jest.fn().mockResolvedValue({ id: 'active-log' }),
        create: jest.fn(),
      };

      await expect(service.startTimer(TENANT_ID, WO_ID, 'tech-001')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('stopTimer', () => {
    it('should stop active timer and update labor hours', async () => {
      const startedAt = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const activeLog = { id: 'log-1', startedAt, workOrderId: WO_ID, technicianId: 'tech-001' };

      (prisma as unknown as Record<string, unknown>).technicianTimeLog = {
        findFirst: jest.fn().mockResolvedValue(activeLog),
        findMany: jest.fn().mockResolvedValue([{ durationMinutes: 60 }]),
        update: jest
          .fn()
          .mockResolvedValue({ ...activeLog, stoppedAt: new Date(), durationMinutes: 60 }),
      };
      prisma.workOrder.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.stopTimer(TENANT_ID, WO_ID, 'tech-001');
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException when no active timer', async () => {
      (prisma as unknown as Record<string, unknown>).technicianTimeLog = {
        findFirst: jest.fn().mockResolvedValue(null),
      };

      await expect(service.stopTimer(TENANT_ID, WO_ID, 'tech-001')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should cap duration at MAX_TIMER_MINUTES', async () => {
      const startedAt = new Date(Date.now() - 10 * 60 * 60 * 1000); // 10 hours ago
      const activeLog = { id: 'log-1', startedAt, workOrderId: WO_ID, technicianId: 'tech-001' };

      (prisma as unknown as Record<string, unknown>).technicianTimeLog = {
        findFirst: jest.fn().mockResolvedValue(activeLog),
        findMany: jest.fn().mockResolvedValue([{ durationMinutes: 480 }]),
        update: jest
          .fn()
          .mockImplementation((_args: unknown) =>
            Promise.resolve({ ...activeLog, stoppedAt: new Date(), durationMinutes: 480 }),
          ),
      };
      prisma.workOrder.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.stopTimer(TENANT_ID, WO_ID, 'tech-001');
      expect(result).toBeDefined();
    });
  });

  describe('getTimer', () => {
    it('should return timer status with active timer', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder());
      const now = new Date();
      const logs = [
        { id: 'log-1', startedAt: now, stoppedAt: null, durationMinutes: null },
        { id: 'log-2', startedAt: now, stoppedAt: now, durationMinutes: 30 },
      ];
      (prisma as unknown as Record<string, unknown>).technicianTimeLog = {
        findMany: jest.fn().mockResolvedValue(logs),
      };

      const result = await service.getTimer(TENANT_ID, WO_ID);

      expect(result.active).toEqual(logs[0]);
      expect(result.totalMinutes).toBe(30);
      expect(result.logs).toEqual(logs);
    });

    it('should return null active when no running timer', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder());
      const now = new Date();
      const logs = [{ id: 'log-1', startedAt: now, stoppedAt: now, durationMinutes: 45 }];
      (prisma as unknown as Record<string, unknown>).technicianTimeLog = {
        findMany: jest.fn().mockResolvedValue(logs),
      };

      const result = await service.getTimer(TENANT_ID, WO_ID);

      expect(result.active).toBeNull();
      expect(result.totalMinutes).toBe(45);
    });

    it('should throw NotFoundException when WO not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null);

      await expect(service.getTimer(TENANT_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should handle logs with null durationMinutes', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder());
      const now = new Date();
      const logs = [{ id: 'log-1', startedAt: now, stoppedAt: now, durationMinutes: null }];
      (prisma as unknown as Record<string, unknown>).technicianTimeLog = {
        findMany: jest.fn().mockResolvedValue(logs),
      };

      const result = await service.getTimer(TENANT_ID, WO_ID);
      expect(result.totalMinutes).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // findAll — pagination edge cases
  // -----------------------------------------------------------------------
  describe('findAll — pagination', () => {
    it('should apply page and limit parameters', async () => {
      prisma.workOrder.findMany.mockResolvedValue([]);
      prisma.workOrder.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, { page: 3, limit: 10 });

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });
  });
});
