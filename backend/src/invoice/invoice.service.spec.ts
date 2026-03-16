import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { PrismaService } from '../common/services/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

// ---------------------------------------------------------------------------
// Type helpers for Prisma mock delegates
// ---------------------------------------------------------------------------

interface MockInvoiceDelegate {
  findFirst: jest.Mock;
  findMany: jest.Mock;
  count: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  groupBy: jest.Mock;
  aggregate: jest.Mock;
}

interface MockPrisma {
  invoice: MockInvoiceDelegate;
  $transaction: jest.Mock;
}

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const INVOICE_ID = 'invoice-001';
const CUSTOMER_ID = 'customer-001';
const YEAR = new Date().getFullYear();

// ---------------------------------------------------------------------------
// Mock data factories
// ---------------------------------------------------------------------------

function makeMockInvoice(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: INVOICE_ID,
    tenantId: TENANT_ID,
    customerId: CUSTOMER_ID,
    invoiceNumber: `INV-${YEAR}-0001`,
    status: 'DRAFT',
    items: [
      { description: 'Brake Repair', itemType: 'LABOR', quantity: 1, unitPrice: 150, vatRate: 22 },
    ],
    subtotal: new Decimal('150.00'),
    taxRate: new Decimal('22.00'),
    taxAmount: new Decimal('33.00'),
    total: new Decimal('183.00'),
    notes: null,
    dueDate: null,
    bookingId: null,
    workOrderId: null,
    sentAt: null,
    paidAt: null,
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-01'),
    customer: {
      id: CUSTOMER_ID,
      firstName: 'Mario',
      lastName: 'Rossi',
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('InvoiceService', () => {
  let service: InvoiceService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = {
      invoice: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        groupBy: jest.fn(),
        aggregate: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [InvoiceService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
  });

  // -----------------------------------------------------------------------
  // findAll
  // -----------------------------------------------------------------------

  describe('findAll', () => {
    it('should return all invoices for a tenant', async () => {
      const invoices = [makeMockInvoice()];
      prisma.invoice.findMany.mockResolvedValue(invoices);
      prisma.invoice.count.mockResolvedValue(1);

      const result = await service.findAll(TENANT_ID);

      expect(result).toEqual({ invoices, total: 1 });
      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
          include: { customer: true },
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(prisma.invoice.count).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
      });
    });

    it('should apply status filter', async () => {
      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.invoice.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, { status: 'PAID' });

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, status: 'PAID' },
        }),
      );
    });

    it('should apply customerId filter', async () => {
      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.invoice.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, { customerId: CUSTOMER_ID });

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, customerId: CUSTOMER_ID },
        }),
      );
    });

    it('should apply date range filters', async () => {
      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.invoice.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, {
        dateFrom: '2026-01-01',
        dateTo: '2026-03-31',
      });

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TENANT_ID,
            createdAt: {
              gte: new Date('2026-01-01'),
              lte: new Date('2026-03-31'),
            },
          },
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // findOne
  // -----------------------------------------------------------------------

  describe('findOne', () => {
    it('should return a single invoice', async () => {
      const invoice = makeMockInvoice();
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.findOne(TENANT_ID, INVOICE_ID);

      expect(result).toEqual(invoice);
      expect(prisma.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: INVOICE_ID, tenantId: TENANT_ID },
        include: { customer: true },
      });
    });

    it('should throw NotFoundException when invoice does not exist', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.findOne(TENANT_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------

  describe('create', () => {
    const dto: CreateInvoiceDto = {
      customerId: CUSTOMER_ID,
      items: [
        {
          description: 'Oil Change',
          itemType: 'LABOR' as const,
          quantity: 1,
          unitPrice: 50,
          vatRate: 22,
        },
        {
          description: 'Oil Filter',
          itemType: 'PART' as const,
          quantity: 2,
          unitPrice: 15,
          vatRate: 22,
        },
      ],
      taxRate: 22,
      notes: 'Test invoice',
    };

    it('should create an invoice within a transaction', async () => {
      const createdInvoice = makeMockInvoice({
        invoiceNumber: `INV-${YEAR}-0001`,
        subtotal: new Decimal('80.00'),
        taxAmount: new Decimal('17.60'),
        total: new Decimal('97.60'),
        notes: 'Test invoice',
      });

      const mockTx = {
        invoice: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(createdInvoice),
        },
      };

      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn(mockTx);
      });

      const result = await service.create(TENANT_ID, dto);

      expect(result).toEqual(createdInvoice);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(mockTx.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            customerId: CUSTOMER_ID,
            invoiceNumber: `INV-${YEAR}-0001`,
            notes: 'Test invoice',
          }),
          include: { customer: true },
        }),
      );
    });

    it('should increment invoice number when previous invoices exist', async () => {
      const mockTx = {
        invoice: {
          findFirst: jest.fn().mockResolvedValue({
            invoiceNumber: `INV-${YEAR}-0005`,
          }),
          create: jest.fn().mockResolvedValue(
            makeMockInvoice({
              invoiceNumber: `INV-${YEAR}-0006`,
            }),
          ),
        },
      };

      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn(mockTx);
      });

      await service.create(TENANT_ID, dto);

      expect(mockTx.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            invoiceNumber: `INV-${YEAR}-0006`,
          }),
        }),
      );
    });

    it('should use default tax rate of 22 when not provided', async () => {
      const dtoNoTax: CreateInvoiceDto = {
        customerId: CUSTOMER_ID,
        items: [
          {
            description: 'Service',
            itemType: 'LABOR' as const,
            quantity: 1,
            unitPrice: 100,
            vatRate: 22,
          },
        ],
      };

      const mockTx = {
        invoice: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(makeMockInvoice()),
        },
      };

      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn(mockTx);
      });

      await service.create(TENANT_ID, dtoNoTax);

      expect(mockTx.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taxRate: new Decimal('22.00'),
          }),
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------

  describe('update', () => {
    it('should update a DRAFT invoice', async () => {
      const existing = makeMockInvoice({ status: 'DRAFT' });
      prisma.invoice.findFirst.mockResolvedValue(existing);

      const dto: UpdateInvoiceDto = { notes: 'Updated notes' };
      const updated = makeMockInvoice({ notes: 'Updated notes' });
      prisma.invoice.update.mockResolvedValue(updated);

      const result = await service.update(TENANT_ID, INVOICE_ID, dto);

      expect(result).toEqual(updated);
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: INVOICE_ID },
        data: expect.objectContaining({ notes: 'Updated notes' }),
        include: { customer: true },
      });
    });

    it('should throw BadRequestException when editing non-DRAFT without status change', async () => {
      const existing = makeMockInvoice({ status: 'SENT' });
      prisma.invoice.findFirst.mockResolvedValue(existing);

      const dto: UpdateInvoiceDto = { notes: 'Try update' };

      await expect(service.update(TENANT_ID, INVOICE_ID, dto)).rejects.toThrow(BadRequestException);
    });

    it('should allow valid status transition SENT → PAID', async () => {
      const existing = makeMockInvoice({ status: 'SENT' });
      prisma.invoice.findFirst.mockResolvedValue(existing);

      const dto: UpdateInvoiceDto = { status: 'PAID' as const };
      const updated = makeMockInvoice({ status: 'PAID' });
      prisma.invoice.update.mockResolvedValue(updated);

      const result = await service.update(TENANT_ID, INVOICE_ID, dto);

      expect(result).toEqual(updated);
    });

    it('should block invalid status transition DRAFT → PAID', async () => {
      const existing = makeMockInvoice({ status: 'DRAFT' });
      prisma.invoice.findFirst.mockResolvedValue(existing);

      const dto: UpdateInvoiceDto = { status: 'PAID' as const };

      await expect(service.update(TENANT_ID, INVOICE_ID, dto)).rejects.toThrow(BadRequestException);
    });

    it('should block invalid status transition PAID → DRAFT', async () => {
      const existing = makeMockInvoice({ status: 'PAID' });
      prisma.invoice.findFirst.mockResolvedValue(existing);

      const dto: UpdateInvoiceDto = { status: 'DRAFT' as const };

      await expect(service.update(TENANT_ID, INVOICE_ID, dto)).rejects.toThrow(BadRequestException);
    });

    it('should block invalid status transition CANCELLED → SENT', async () => {
      const existing = makeMockInvoice({ status: 'CANCELLED' });
      prisma.invoice.findFirst.mockResolvedValue(existing);

      const dto: UpdateInvoiceDto = { status: 'SENT' as const };

      await expect(service.update(TENANT_ID, INVOICE_ID, dto)).rejects.toThrow(BadRequestException);
    });

    it('should recalculate totals when items are updated', async () => {
      const existing = makeMockInvoice({ status: 'DRAFT' });
      prisma.invoice.findFirst.mockResolvedValue(existing);

      const dto: UpdateInvoiceDto = {
        items: [
          {
            description: 'New Service',
            itemType: 'LABOR' as const,
            quantity: 2,
            unitPrice: 100,
            vatRate: 10,
          },
        ],
        taxRate: 10,
      };
      prisma.invoice.update.mockResolvedValue(makeMockInvoice());

      await service.update(TENANT_ID, INVOICE_ID, dto);

      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: new Decimal('200.00'),
            taxRate: new Decimal('10.00'),
            taxAmount: new Decimal('20.00'),
            total: new Decimal('220.00'),
          }),
        }),
      );
    });

    it('should throw NotFoundException for non-existent invoice', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.update(TENANT_ID, 'nonexistent', { notes: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -----------------------------------------------------------------------
  // remove
  // -----------------------------------------------------------------------

  describe('remove', () => {
    it('should delete a DRAFT invoice', async () => {
      const existing = makeMockInvoice({ status: 'DRAFT' });
      prisma.invoice.findFirst.mockResolvedValue(existing);
      prisma.invoice.delete.mockResolvedValue(existing);

      await service.remove(TENANT_ID, INVOICE_ID);

      expect(prisma.invoice.delete).toHaveBeenCalledWith({
        where: { id: INVOICE_ID },
      });
    });

    it('should throw BadRequestException when deleting non-DRAFT invoice', async () => {
      const existing = makeMockInvoice({ status: 'SENT' });
      prisma.invoice.findFirst.mockResolvedValue(existing);

      await expect(service.remove(TENANT_ID, INVOICE_ID)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent invoice', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.remove(TENANT_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // send
  // -----------------------------------------------------------------------

  describe('send', () => {
    it('should mark a DRAFT invoice as SENT', async () => {
      const existing = makeMockInvoice({ status: 'DRAFT' });
      prisma.invoice.findFirst.mockResolvedValue(existing);

      const sent = makeMockInvoice({ status: 'SENT', sentAt: new Date() });
      prisma.invoice.update.mockResolvedValue(sent);

      const result = await service.send(TENANT_ID, INVOICE_ID);

      expect(result).toEqual(sent);
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: INVOICE_ID },
        data: { status: 'SENT', sentAt: expect.any(Date) },
        include: { customer: true },
      });
    });

    it('should throw BadRequestException when sending non-DRAFT invoice', async () => {
      const existing = makeMockInvoice({ status: 'PAID' });
      prisma.invoice.findFirst.mockResolvedValue(existing);

      await expect(service.send(TENANT_ID, INVOICE_ID)).rejects.toThrow(BadRequestException);
    });
  });

  // -----------------------------------------------------------------------
  // markPaid
  // -----------------------------------------------------------------------

  describe('markPaid', () => {
    it('should mark a SENT invoice as PAID', async () => {
      const existing = makeMockInvoice({ status: 'SENT' });
      prisma.invoice.findFirst.mockResolvedValue(existing);

      const paid = makeMockInvoice({ status: 'PAID', paidAt: new Date() });
      prisma.invoice.update.mockResolvedValue(paid);

      const result = await service.markPaid(TENANT_ID, INVOICE_ID);

      expect(result).toEqual(paid);
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: INVOICE_ID },
        data: { status: 'PAID', paidAt: expect.any(Date) },
        include: { customer: true },
      });
    });

    it('should throw BadRequestException when invoice is already PAID', async () => {
      const existing = makeMockInvoice({ status: 'PAID' });
      prisma.invoice.findFirst.mockResolvedValue(existing);

      await expect(service.markPaid(TENANT_ID, INVOICE_ID)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when invoice is CANCELLED', async () => {
      const existing = makeMockInvoice({ status: 'CANCELLED' });
      prisma.invoice.findFirst.mockResolvedValue(existing);

      await expect(service.markPaid(TENANT_ID, INVOICE_ID)).rejects.toThrow(BadRequestException);
    });

    it('should allow marking a DRAFT invoice as PAID', async () => {
      const existing = makeMockInvoice({ status: 'DRAFT' });
      prisma.invoice.findFirst.mockResolvedValue(existing);

      const paid = makeMockInvoice({ status: 'PAID', paidAt: new Date() });
      prisma.invoice.update.mockResolvedValue(paid);

      const result = await service.markPaid(TENANT_ID, INVOICE_ID);

      expect(result).toEqual(paid);
    });
  });

  // -----------------------------------------------------------------------
  // getStats
  // -----------------------------------------------------------------------

  describe('getStats', () => {
    it('should return invoice statistics', async () => {
      const statusCounts = [
        { status: 'DRAFT', _count: { id: 5 } },
        { status: 'SENT', _count: { id: 3 } },
        { status: 'PAID', _count: { id: 10 } },
      ];
      const monthlyRevenue = {
        _sum: { total: new Decimal('5000.00') },
        _count: { id: 8 },
      };

      prisma.invoice.groupBy.mockResolvedValue(statusCounts);
      prisma.invoice.aggregate.mockResolvedValue(monthlyRevenue);

      const result = await service.getStats(TENANT_ID);

      expect(result).toEqual({
        byStatus: { DRAFT: 5, SENT: 3, PAID: 10 },
        monthlyRevenue: {
          total: new Decimal('5000.00'),
          count: 8,
        },
      });
      expect(prisma.invoice.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['status'],
          where: { tenantId: TENANT_ID },
        }),
      );
    });

    it('should return zero revenue when no paid invoices exist', async () => {
      prisma.invoice.groupBy.mockResolvedValue([]);
      prisma.invoice.aggregate.mockResolvedValue({
        _sum: { total: null },
        _count: { id: 0 },
      });

      const result = await service.getStats(TENANT_ID);

      expect(result).toEqual({
        byStatus: {},
        monthlyRevenue: {
          total: new Decimal(0),
          count: 0,
        },
      });
    });
  });
});
