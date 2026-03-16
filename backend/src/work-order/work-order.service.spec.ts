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

      expect(result).toEqual({ workOrders, total: 1 });
      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
          orderBy: { createdAt: 'desc' },
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

      expect(result).toEqual(wo);
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
      prisma.workOrder.findFirst.mockResolvedValue(existing);

      const updated = makeMockWorkOrder({
        diagnosis: 'Updated diagnosis',
        laborHours: 2.5,
        laborCost: 125,
      });
      prisma.workOrder.update.mockResolvedValue(updated);

      const result = await service.update(TENANT_ID, WO_ID, dto);

      expect(result).toEqual(updated);
      expect(prisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: WO_ID },
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
      prisma.workOrder.update.mockRejectedValue(new Error('DB error'));

      await expect(service.update(TENANT_ID, WO_ID, dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should serialize laborItems and partsUsed as JSON', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder());
      prisma.workOrder.update.mockResolvedValue(makeMockWorkOrder());

      const dtoWithItems: UpdateWorkOrderDto = {
        laborItems: [{ description: 'Brake pad replacement', hours: 1.5, rate: 80 }],
        partsUsed: [{ name: 'Brake pads', quantity: 1, unitPrice: 45 }],
      };

      await service.update(TENANT_ID, WO_ID, dtoWithItems);

      expect(prisma.workOrder.update).toHaveBeenCalledWith(
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
      prisma.workOrder.findFirst.mockResolvedValue(existing);

      const started = makeMockWorkOrder({
        status: 'IN_PROGRESS',
        actualStartTime: new Date(),
      });
      prisma.workOrder.update.mockResolvedValue(started);

      const result = await service.start(TENANT_ID, WO_ID);

      expect(result).toEqual(started);
      expect(prisma.workOrder.update).toHaveBeenCalledWith({
        where: { id: WO_ID },
        data: {
          status: 'IN_PROGRESS',
          actualStartTime: expect.any(Date),
        },
      });
    });

    it('should start a CHECKED_IN work order', async () => {
      const existing = makeMockWorkOrder({ status: 'CHECKED_IN' });
      prisma.workOrder.findFirst.mockResolvedValue(existing);
      prisma.workOrder.update.mockResolvedValue(makeMockWorkOrder({ status: 'IN_PROGRESS' }));

      const result = await service.start(TENANT_ID, WO_ID);

      expect(result).toBeDefined();
    });

    it('should start an OPEN work order', async () => {
      const existing = makeMockWorkOrder({ status: 'OPEN' });
      prisma.workOrder.findFirst.mockResolvedValue(existing);
      prisma.workOrder.update.mockResolvedValue(makeMockWorkOrder({ status: 'IN_PROGRESS' }));

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
      prisma.workOrder.findFirst.mockResolvedValue(existing);

      const completed = makeMockWorkOrder({
        status: 'COMPLETED',
        actualCompletionTime: new Date(),
      });
      prisma.workOrder.update.mockResolvedValue(completed);

      const result = await service.complete(TENANT_ID, WO_ID);

      expect(result).toEqual(completed);
      expect(prisma.workOrder.update).toHaveBeenCalledWith({
        where: { id: WO_ID },
        data: {
          status: 'COMPLETED',
          actualCompletionTime: expect.any(Date),
        },
      });
    });

    it('should complete a QUALITY_CHECK work order', async () => {
      const existing = makeMockWorkOrder({ status: 'QUALITY_CHECK' });
      prisma.workOrder.findFirst.mockResolvedValue(existing);
      prisma.workOrder.update.mockResolvedValue(makeMockWorkOrder({ status: 'COMPLETED' }));

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
        laborItems: [{ description: 'Brake repair', hours: 2, rate: 80, total: 160 }],
        partsUsed: [{ name: 'Brake pads', quantity: 2, unitPrice: 45, total: 90 }],
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
          update: jest.fn().mockResolvedValue(mockUpdatedWo),
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
      expect(mockTx.workOrder.update).toHaveBeenCalledWith({
        where: { id: WO_ID },
        data: {
          status: 'INVOICED',
          invoiceId: 'invoice-new',
        },
      });
    });

    it('should create an invoice from a READY work order', async () => {
      const wo = makeMockWorkOrder({ status: 'READY', totalCost: 200 });
      prisma.workOrder.findFirst.mockResolvedValue(wo);
      prisma.invoice.findFirst.mockResolvedValue(null);

      const mockTx = {
        invoice: { create: jest.fn().mockResolvedValue({ id: 'inv-1' }) },
        workOrder: { update: jest.fn().mockResolvedValue({ ...wo, status: 'INVOICED' }) },
      };
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(mockTx),
      );

      const result = await service.createInvoiceFromWo(TENANT_ID, WO_ID);

      expect(result).toBeDefined();
    });

    it('should throw BadRequestException when work order is already INVOICED', async () => {
      const wo = makeMockWorkOrder({ status: 'INVOICED' });
      prisma.workOrder.findFirst.mockResolvedValue(wo);

      await expect(service.createInvoiceFromWo(TENANT_ID, WO_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when status is PENDING', async () => {
      const wo = makeMockWorkOrder({ status: 'PENDING' });
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
      const wo = makeMockWorkOrder({ status: 'COMPLETED', totalCost: 100 });
      prisma.workOrder.findFirst.mockResolvedValue(wo);
      prisma.invoice.findFirst.mockResolvedValue({
        invoiceNumber: `INV-${YEAR}-0003`,
      });

      const mockTx = {
        invoice: { create: jest.fn().mockResolvedValue({ id: 'inv-new' }) },
        workOrder: { update: jest.fn().mockResolvedValue({ ...wo, status: 'INVOICED' }) },
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
        laborItems: null,
        partsUsed: null,
      });
      prisma.workOrder.findFirst.mockResolvedValue(wo);
      prisma.invoice.findFirst.mockResolvedValue(null);

      const mockTx = {
        invoice: { create: jest.fn().mockResolvedValue({ id: 'inv-empty' }) },
        workOrder: { update: jest.fn().mockResolvedValue({ ...wo, status: 'INVOICED' }) },
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
});
