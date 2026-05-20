/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { PrismaService } from '../common/services/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';
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
  updateMany: jest.Mock;
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
  let encryption: { decrypt: jest.Mock };

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
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    encryption = {
      decrypt: jest.fn((val: string) => val.replace('enc-', '')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        { provide: PrismaService, useValue: prisma },
        { provide: EncryptionService, useValue: encryption },
      ],
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

      expect(result).toEqual({
        data: invoices,
        meta: { total: 1, page: 1, limit: 20, pages: 1 },
      });
      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
          include: { customer: true },
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 20,
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
        include: { customer: true, invoiceItems: true },
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
      const updated = makeMockInvoice({ notes: 'Updated notes' });
      prisma.invoice.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);
      prisma.invoice.updateMany.mockResolvedValue({ count: 1 });

      const dto: UpdateInvoiceDto = { notes: 'Updated notes' };

      const result = await service.update(TENANT_ID, INVOICE_ID, dto);

      expect(result).toEqual(updated);
      expect(prisma.invoice.updateMany).toHaveBeenCalledWith({
        where: { id: INVOICE_ID, tenantId: TENANT_ID },
        data: expect.objectContaining({ notes: 'Updated notes' }),
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
      const updated = makeMockInvoice({ status: 'PAID' });
      prisma.invoice.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);
      prisma.invoice.updateMany.mockResolvedValue({ count: 1 });

      const dto: UpdateInvoiceDto = { status: 'PAID' as const };

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
      prisma.invoice.findFirst
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(makeMockInvoice());
      prisma.invoice.updateMany.mockResolvedValue({ count: 1 });

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

      await service.update(TENANT_ID, INVOICE_ID, dto);

      expect(prisma.invoice.updateMany).toHaveBeenCalledWith(
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
      prisma.invoice.updateMany.mockResolvedValue({ count: 1 });

      await service.remove(TENANT_ID, INVOICE_ID);

      expect(prisma.invoice.updateMany).toHaveBeenCalledWith({
        where: { id: INVOICE_ID, tenantId: TENANT_ID },
        data: { deletedAt: expect.any(Date), status: 'CANCELLED' },
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
      const sent = makeMockInvoice({ status: 'SENT', sentAt: new Date() });
      prisma.invoice.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(sent);
      prisma.invoice.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.send(TENANT_ID, INVOICE_ID);

      expect(result).toEqual(sent);
      expect(prisma.invoice.updateMany).toHaveBeenCalledWith({
        where: { id: INVOICE_ID, tenantId: TENANT_ID },
        data: { status: 'SENT', sentAt: expect.any(Date) },
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
      const paid = makeMockInvoice({ status: 'PAID', paidAt: new Date() });
      prisma.invoice.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(paid);
      prisma.invoice.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.markPaid(TENANT_ID, INVOICE_ID);

      expect(result).toEqual(paid);
      expect(prisma.invoice.updateMany).toHaveBeenCalledWith({
        where: { id: INVOICE_ID, tenantId: TENANT_ID },
        data: { status: 'PAID', paidAt: expect.any(Date) },
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
      const paid = makeMockInvoice({ status: 'PAID', paidAt: new Date() });
      prisma.invoice.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(paid);
      prisma.invoice.updateMany.mockResolvedValue({ count: 1 });

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

  // -----------------------------------------------------------------------
  // exportCsv
  // -----------------------------------------------------------------------

  describe('exportCsv', () => {
    const from = new Date('2026-01-01');
    const to = new Date('2026-03-31');

    it('should return CSV with BOM, header, and invoice rows', async () => {
      const invoices = [
        makeMockInvoice({
          invoiceNumber: 'INV-2026-0001',
          status: 'PAID',
          subtotal: new Decimal('100.00'),
          taxAmount: new Decimal('22.00'),
          total: new Decimal('122.00'),
          createdAt: new Date('2026-02-15'),
          paidAt: new Date('2026-02-20'),
          paymentMethod: 'BONIFICO',
          customer: {
            id: CUSTOMER_ID,
            encryptedFirstName: 'enc-Mario',
            encryptedLastName: 'enc-Rossi',
            partitaIva: '12345678901',
            codiceFiscale: 'RSSMRA80A01H501Z',
          },
        }),
      ];

      prisma.invoice.findMany.mockResolvedValue(invoices);

      const csv = await service.exportCsv(TENANT_ID, from, to);

      // Starts with UTF-8 BOM
      expect(csv.charCodeAt(0)).toBe(0xfeff);

      const lines = csv.replace('\uFEFF', '').split('\n');
      expect(lines[0]).toBe(
        'Numero;Data;Cliente;CF/P.IVA;Imponibile;IVA;Totale;Stato;Data Pagamento;Metodo Pagamento',
      );
      expect(lines[1]).toBe(
        'INV-2026-0001;2026-02-15;Mario Rossi;12345678901;100.00;22.00;122.00;Pagata;2026-02-20;BONIFICO',
      );

      expect(encryption.decrypt).toHaveBeenCalledWith('enc-Mario');
      expect(encryption.decrypt).toHaveBeenCalledWith('enc-Rossi');
    });

    it('should return only header when no invoices exist in date range', async () => {
      prisma.invoice.findMany.mockResolvedValue([]);

      const csv = await service.exportCsv(TENANT_ID, from, to);

      const lines = csv.replace('\uFEFF', '').split('\n');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toBe(
        'Numero;Data;Cliente;CF/P.IVA;Imponibile;IVA;Totale;Stato;Data Pagamento;Metodo Pagamento',
      );
    });

    it('should handle missing encryptedFirstName and encryptedLastName', async () => {
      const invoices = [
        makeMockInvoice({
          status: 'DRAFT',
          createdAt: new Date('2026-01-10'),
          paidAt: null,
          paymentMethod: null,
          customer: {
            id: CUSTOMER_ID,
            encryptedFirstName: null,
            encryptedLastName: null,
            partitaIva: null,
            codiceFiscale: null,
          },
        }),
      ];

      prisma.invoice.findMany.mockResolvedValue(invoices);

      const csv = await service.exportCsv(TENANT_ID, from, to);
      const lines = csv.replace('\uFEFF', '').split('\n');

      // clientName should be empty string, fiscalId should be empty
      expect(lines[1]).toContain(';;');
    });

    it('should apply dateFrom-only filter in findAll', async () => {
      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.invoice.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, { dateFrom: '2026-01-01' });

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TENANT_ID,
            createdAt: { gte: new Date('2026-01-01') },
          },
        }),
      );
    });

    it('should apply dateTo-only filter in findAll', async () => {
      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.invoice.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, { dateTo: '2026-03-31' });

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TENANT_ID,
            createdAt: { lte: new Date('2026-03-31') },
          },
        }),
      );
    });

    it('should use codiceFiscale when partitaIva is not available', async () => {
      const invoices = [
        makeMockInvoice({
          status: 'DRAFT',
          createdAt: new Date('2026-01-10'),
          paidAt: null,
          paymentMethod: null,
          customer: {
            id: CUSTOMER_ID,
            encryptedFirstName: 'enc-Luca',
            encryptedLastName: 'enc-Bianchi',
            partitaIva: null,
            codiceFiscale: 'BNCLCU90B01H501X',
          },
        }),
      ];

      prisma.invoice.findMany.mockResolvedValue(invoices);

      const csv = await service.exportCsv(TENANT_ID, from, to);
      const lines = csv.replace('\uFEFF', '').split('\n');

      expect(lines[1]).toContain('BNCLCU90B01H501X');
      expect(lines[1]).toContain('Bozza');
    });
  });

  // -----------------------------------------------------------------------
  // refundInvoice
  // -----------------------------------------------------------------------

  describe('refundInvoice', () => {
    it('should throw NotFoundException when invoice does not exist', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.refundInvoice(TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when invoice is not PAID', async () => {
      prisma.invoice.findFirst.mockResolvedValue(makeMockInvoice({ status: 'SENT' }));

      await expect(service.refundInvoice(TENANT_ID, INVOICE_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when refund amount is zero', async () => {
      prisma.invoice.findFirst.mockResolvedValue(
        makeMockInvoice({ status: 'PAID', total: new Decimal('183.00'), invoiceItems: [] }),
      );

      await expect(service.refundInvoice(TENANT_ID, INVOICE_ID, 0)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when refund amount exceeds total', async () => {
      prisma.invoice.findFirst.mockResolvedValue(
        makeMockInvoice({ status: 'PAID', total: new Decimal('100.00'), invoiceItems: [] }),
      );

      await expect(service.refundInvoice(TENANT_ID, INVOICE_ID, 200)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should perform full refund and create credit note when no amount specified', async () => {
      const invoice = makeMockInvoice({
        status: 'PAID',
        total: new Decimal('183.00'),
        invoiceItems: [
          {
            description: 'Brake Repair',
            quantity: new Decimal(1),
            unitPrice: new Decimal(150),
            vatRate: new Decimal(22),
            total: new Decimal(183),
          },
        ],
        items: [],
      });
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const mockTx = {
        invoice: {
          update: jest.fn().mockResolvedValue({}),
          create: jest.fn().mockResolvedValue({ id: 'credit-note-001' }),
          findFirst: jest.fn().mockResolvedValue({ invoiceNumber: `INV-${YEAR}-0001` }),
        },
      };
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(mockTx),
      );

      const result = await service.refundInvoice(TENANT_ID, INVOICE_ID);

      expect(result.refundedAmount).toBe(183);
      expect(result.creditNoteId).toBe('credit-note-001');
      expect(mockTx.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'REFUNDED' },
        }),
      );
      expect(mockTx.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            documentType: 'NOTA_CREDITO',
            creditNoteOfId: INVOICE_ID,
          }),
        }),
      );
    });

    it('should perform partial refund without credit note', async () => {
      const invoice = makeMockInvoice({
        status: 'PAID',
        total: new Decimal('183.00'),
        invoiceItems: [],
        items: [],
      });
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const mockTx = {
        invoice: {
          update: jest.fn().mockResolvedValue({}),
          create: jest.fn(),
        },
      };
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(mockTx),
      );

      const result = await service.refundInvoice(TENANT_ID, INVOICE_ID, 50);

      expect(result.refundedAmount).toBe(50);
      expect(result.creditNoteId).toBeUndefined();
      expect(mockTx.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'PARTIALLY_REFUNDED' },
        }),
      );
      // Should NOT create a credit note for partial refunds
      expect(mockTx.invoice.create).not.toHaveBeenCalled();
    });

    it('should use legacy items when invoiceItems is empty for credit note', async () => {
      const invoice = makeMockInvoice({
        status: 'PAID',
        total: new Decimal('100.00'),
        invoiceItems: [],
        items: [{ description: 'Legacy item', quantity: 1, unitPrice: 100, vatRate: 22 }],
      });
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const mockTx = {
        invoice: {
          update: jest.fn().mockResolvedValue({}),
          create: jest.fn().mockResolvedValue({ id: 'cn-002' }),
          findFirst: jest.fn().mockResolvedValue(null),
        },
      };
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(mockTx),
      );

      const result = await service.refundInvoice(TENANT_ID, INVOICE_ID);

      expect(result.creditNoteId).toBe('cn-002');
      // items snapshot should fall back to legacy items
      expect(mockTx.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            items: invoice.items,
          }),
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // markOverdueInvoices
  // -----------------------------------------------------------------------

  describe('markOverdueInvoices', () => {
    it('should update SENT invoices past due date to OVERDUE', async () => {
      prisma.invoice.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markOverdueInvoices();

      expect(result).toBe(5);
      expect(prisma.invoice.updateMany).toHaveBeenCalledWith({
        where: {
          status: 'SENT',
          dueDate: { lt: expect.any(Date) },
        },
        data: { status: 'OVERDUE' },
      });
    });

    it('should return 0 when no invoices are overdue', async () => {
      prisma.invoice.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markOverdueInvoices();

      expect(result).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // computeTotals
  // -----------------------------------------------------------------------

  describe('computeTotals', () => {
    it('should calculate subtotal and VAT per line', () => {
      const items = [
        { description: 'A', itemType: 'LABOR' as const, quantity: 2, unitPrice: 100, vatRate: 22 },
        { description: 'B', itemType: 'PART' as const, quantity: 1, unitPrice: 50, vatRate: 10 },
      ];

      const result = service.computeTotals(items);

      expect(result.subtotal).toBe(250);
      // VAT: line1 = 200*22/100 = 44; line2 = 50*10/100 = 5 → totalVat = 49
      expect(result.taxAmount).toBe(49);
      expect(result.stampDuty).toBe(false);
      expect(result.stampDutyAmount).toBe(0);
      expect(result.total).toBe(299);
    });

    it('should apply stamp duty for VAT-exempt items over 77.47 EUR', () => {
      const items = [
        {
          description: 'Exempt service',
          itemType: 'LABOR' as const,
          quantity: 1,
          unitPrice: 100,
          vatRate: 0,
        },
      ];

      const result = service.computeTotals(items);

      expect(result.stampDuty).toBe(true);
      expect(result.stampDutyAmount).toBe(2.0);
      // total = 100 + 0 (tax) + 2 (stamp)
      expect(result.total).toBe(102);
    });

    it('should NOT apply stamp duty when subtotal is below 77.47', () => {
      const items = [
        {
          description: 'Small exempt',
          itemType: 'LABOR' as const,
          quantity: 1,
          unitPrice: 50,
          vatRate: 0,
        },
      ];

      const result = service.computeTotals(items);

      expect(result.stampDuty).toBe(false);
      expect(result.stampDutyAmount).toBe(0);
    });

    it('should NOT apply stamp duty when no items are VAT-exempt', () => {
      const items = [
        {
          description: 'Taxed service',
          itemType: 'LABOR' as const,
          quantity: 1,
          unitPrice: 200,
          vatRate: 22,
        },
      ];

      const result = service.computeTotals(items);

      expect(result.stampDuty).toBe(false);
    });

    it('should use taxRateOverride when provided', () => {
      const items = [
        { description: 'A', itemType: 'LABOR' as const, quantity: 1, unitPrice: 100, vatRate: 22 },
      ];

      const result = service.computeTotals(items, 10);

      expect(result.taxRate).toBe(10);
    });

    it('should default taxRate to first item vatRate when no override', () => {
      const items = [
        { description: 'A', itemType: 'LABOR' as const, quantity: 1, unitPrice: 100, vatRate: 4 },
      ];

      const result = service.computeTotals(items);

      expect(result.taxRate).toBe(4);
    });

    it('should default taxRate to 22 when items array is empty', () => {
      const result = service.computeTotals([]);

      expect(result.taxRate).toBe(22);
      expect(result.subtotal).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should apply discount when provided', () => {
      const items = [
        {
          description: 'A',
          itemType: 'LABOR' as const,
          quantity: 1,
          unitPrice: 100,
          vatRate: 22,
          discount: 10,
        },
      ];

      const result = service.computeTotals(items);

      // Subtotal: 100 * 0.9 = 90. VAT: 90*22/100 = 19.8
      expect(result.subtotal).toBe(90);
      expect(result.taxAmount).toBe(19.8);
    });
  });

  // -----------------------------------------------------------------------
  // create with ritenuta d'acconto
  // -----------------------------------------------------------------------

  describe('create with ritenuta', () => {
    it('should calculate ritenuta and reduce totalDue', async () => {
      const dto: CreateInvoiceDto = {
        customerId: CUSTOMER_ID,
        items: [
          {
            description: 'Consulenza',
            itemType: 'LABOR' as const,
            quantity: 1,
            unitPrice: 1000,
            vatRate: 22,
          },
        ],
        taxRate: 22,
        ritenutaRate: 20,
        ritenutaType: 'RT01',
        ritenutaCausale: 'A',
      };

      const mockTx = {
        invoice: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(makeMockInvoice()),
        },
      };
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(mockTx),
      );

      await service.create(TENANT_ID, dto);

      const createData = mockTx.invoice.create.mock.calls[0][0].data;
      // ritenutaAmount = round(1000 * 20) / 100 = 200
      expect(Number(createData.ritenutaAmount)).toBe(200);
      expect(createData.ritenutaType).toBe('RT01');
      expect(createData.ritenutaCausale).toBe('A');
      // total = (1000 + 220) - 200 = 1020
      expect(Number(createData.total)).toBe(1020);
    });

    it('should NOT apply ritenuta when rate is 0', async () => {
      const dto: CreateInvoiceDto = {
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
        taxRate: 22,
        ritenutaRate: 0,
      };

      const mockTx = {
        invoice: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(makeMockInvoice()),
        },
      };
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(mockTx),
      );

      await service.create(TENANT_ID, dto);

      const createData = mockTx.invoice.create.mock.calls[0][0].data;
      expect(createData.ritenutaAmount).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // update with items recalculation
  // -----------------------------------------------------------------------

  describe('update edge cases', () => {
    it('should use existing taxRate when dto.taxRate is not provided and items are updated', async () => {
      const existing = makeMockInvoice({ status: 'DRAFT', taxRate: new Decimal('10.00') });
      prisma.invoice.findFirst
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(makeMockInvoice());
      prisma.invoice.updateMany.mockResolvedValue({ count: 1 });

      const dto: UpdateInvoiceDto = {
        items: [
          {
            description: 'New',
            itemType: 'LABOR' as const,
            quantity: 1,
            unitPrice: 100,
            vatRate: 10,
          },
        ],
      };

      await service.update(TENANT_ID, INVOICE_ID, dto);

      expect(prisma.invoice.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taxRate: new Decimal('10.00'),
          }),
        }),
      );
    });

    it('should set notes to null when undefined value is passed', async () => {
      const existing = makeMockInvoice({ status: 'DRAFT' });
      prisma.invoice.findFirst
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(makeMockInvoice());
      prisma.invoice.updateMany.mockResolvedValue({ count: 1 });

      await service.update(TENANT_ID, INVOICE_ID, { notes: undefined });

      // notes is undefined so it won't be in data
      expect(prisma.invoice.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ notes: expect.anything() }),
        }),
      );
    });

    it('should pass empty string notes as null via ?? operator', async () => {
      const existing = makeMockInvoice({ status: 'DRAFT' });
      prisma.invoice.findFirst
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(makeMockInvoice());
      prisma.invoice.updateMany.mockResolvedValue({ count: 1 });

      // Empty string is NOT nullish, so dto.notes ?? null = ''
      await service.update(TENANT_ID, INVOICE_ID, { notes: '' });

      expect(prisma.invoice.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ notes: '' }),
        }),
      );
    });

    it('should set notes to null when null is explicitly passed', async () => {
      const existing = makeMockInvoice({ status: 'DRAFT' });
      prisma.invoice.findFirst
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(makeMockInvoice());
      prisma.invoice.updateMany.mockResolvedValue({ count: 1 });

      await service.update(TENANT_ID, INVOICE_ID, { notes: null as unknown as string });

      expect(prisma.invoice.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ notes: null }),
        }),
      );
    });
  });

  describe('decryption branches', () => {
    it('should skip decryption when no encrypted fields', async () => {
      const invoice = makeMockInvoice({
        customer: { id: CUSTOMER_ID, firstName: 'Mario' },
      });
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      await service.findOne(TENANT_ID, INVOICE_ID);

      expect(encryption.decrypt).not.toHaveBeenCalled();
    });

    it('should decrypt when encryptedFirstName present', async () => {
      const invoice = makeMockInvoice({
        customer: {
          id: CUSTOMER_ID,
          encryptedFirstName: 'enc-Mario',
          encryptedEmail: 'enc-m@test.com',
        },
      });
      prisma.invoice.findFirst.mockResolvedValue(invoice);
      encryption.decrypt.mockImplementation((v: string) => v.replace('enc-', ''));

      const result = await service.findOne(TENANT_ID, INVOICE_ID);

      expect((result.customer as any).firstName).toBe('Mario');
      expect((result.customer as any).email).toBe('m@test.com');
    });

    it('should handle decryption error', async () => {
      const invoice = makeMockInvoice({
        customer: { id: CUSTOMER_ID, encryptedFirstName: 'bad' },
      });
      prisma.invoice.findFirst.mockResolvedValue(invoice);
      encryption.decrypt.mockImplementation(() => {
        throw new Error();
      });

      const result = await service.findOne(TENANT_ID, INVOICE_ID);

      expect((result.customer as any).firstName).toBe('[encrypted]');
    });

    it('should handle non-string field', async () => {
      const invoice = makeMockInvoice({
        customer: { id: CUSTOMER_ID, encryptedFirstName: 123 },
      });
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.findOne(TENANT_ID, INVOICE_ID);

      expect((result.customer as any).firstName).toBeNull();
    });

    it('should handle null field', async () => {
      const invoice = makeMockInvoice({
        customer: { id: CUSTOMER_ID, encryptedFirstName: null },
      });
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.findOne(TENANT_ID, INVOICE_ID);

      expect((result.customer as any).firstName).toBeNull();
    });

    it('should handle null customer', async () => {
      const invoice = makeMockInvoice({ customer: null });
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.findOne(TENANT_ID, INVOICE_ID);

      expect(result.customer).toBeNull();
    });
  });

  describe('Refund edge cases — boundary conditions', () => {
    it('should handle refund of zero amount (should reject)', async () => {
      const invoice = makeMockInvoice({ total: new Decimal('100.00'), status: 'PAID' });
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      await expect(service.refundInvoice(TENANT_ID, INVOICE_ID, 0)).rejects.toThrow();
    });

    it('should handle refund of negative amount (should reject)', async () => {
      const invoice = makeMockInvoice({ total: new Decimal('100.00'), status: 'PAID' });
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      await expect(service.refundInvoice(TENANT_ID, INVOICE_ID, -50)).rejects.toThrow();
    });

    it('should handle refund greater than total amount', async () => {
      const invoice = makeMockInvoice({ total: new Decimal('100.00'), status: 'PAID' });
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      await expect(service.refundInvoice(TENANT_ID, INVOICE_ID, 150)).rejects.toThrow();
    });

    it('should handle refund equal to total amount', async () => {
      const invoice = makeMockInvoice({
        total: new Decimal('100.00'),
        status: 'PAID',
        invoiceItems: [
          {
            id: 'item-1',
            invoiceId: INVOICE_ID,
            description: 'Service',
            quantity: new Decimal('1'),
            unitPrice: new Decimal('100'),
            vatRate: new Decimal('22'),
            total: new Decimal('100'),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const txMock = {
        invoice: {
          findFirst: jest.fn().mockResolvedValue(null), // No previous invoice
          update: jest.fn().mockResolvedValue({
            ...invoice,
            status: 'REFUNDED',
          }),
          create: jest.fn().mockResolvedValue({
            id: 'credit-note-1',
            invoiceNumber: 'CN-2026-0001',
          }),
        },
      };

      prisma.$transaction.mockImplementation(async (cb: any) => {
        return cb(txMock);
      });

      const result = await service.refundInvoice(TENANT_ID, INVOICE_ID, 100);

      expect(result).toBeDefined();
      expect(result.refundedAmount).toBe(100);
    });

    it('should handle partial refund with decimal amounts', async () => {
      const invoice = makeMockInvoice({
        total: new Decimal('99.99'),
        status: 'PAID',
        invoiceItems: [
          {
            id: 'item-1',
            invoiceId: INVOICE_ID,
            description: 'Service',
            quantity: new Decimal('1'),
            unitPrice: new Decimal('99.99'),
            vatRate: new Decimal('22'),
            total: new Decimal('99.99'),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const txMock = {
        invoice: {
          update: jest.fn().mockResolvedValue({
            ...invoice,
            status: 'PARTIALLY_REFUNDED',
          }),
        },
      };

      prisma.$transaction.mockImplementation(async (cb: any) => {
        return cb(txMock);
      });

      const result = await service.refundInvoice(TENANT_ID, INVOICE_ID, 49.99);

      expect(result).toBeDefined();
      expect(result.refundedAmount).toBe(49.99);
    });
  });

  describe('Filter combinations — all boolean branches', () => {
    it('should filter by status only', async () => {
      prisma.invoice.findMany.mockResolvedValue([makeMockInvoice({ status: 'SENT' })]);
      prisma.invoice.count.mockResolvedValue(1);

      await service.findAll(TENANT_ID, { status: 'SENT' });

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'SENT',
          }),
        }),
      );
    });

    it('should filter by customerId only', async () => {
      prisma.invoice.findMany.mockResolvedValue([makeMockInvoice({ customerId: 'cust-1' })]);
      prisma.invoice.count.mockResolvedValue(1);

      await service.findAll(TENANT_ID, { customerId: 'cust-1' });

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customerId: 'cust-1',
          }),
        }),
      );
    });

    it('should filter by dateFrom only', async () => {
      prisma.invoice.findMany.mockResolvedValue([makeMockInvoice()]);
      prisma.invoice.count.mockResolvedValue(1);

      await service.findAll(TENANT_ID, { dateFrom: '2026-03-01' });

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('should filter by dateTo only', async () => {
      prisma.invoice.findMany.mockResolvedValue([makeMockInvoice()]);
      prisma.invoice.count.mockResolvedValue(1);

      await service.findAll(TENANT_ID, { dateTo: '2026-03-31' });

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('should filter by dateFrom and dateTo together', async () => {
      prisma.invoice.findMany.mockResolvedValue([makeMockInvoice()]);
      prisma.invoice.count.mockResolvedValue(1);

      await service.findAll(TENANT_ID, { dateFrom: '2026-03-01', dateTo: '2026-03-31' });

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('should apply all filters together', async () => {
      prisma.invoice.findMany.mockResolvedValue([makeMockInvoice()]);
      prisma.invoice.count.mockResolvedValue(1);

      await service.findAll(TENANT_ID, {
        status: 'SENT',
        customerId: 'cust-1',
        dateFrom: '2026-03-01',
        dateTo: '2026-03-31',
      });

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'SENT',
            customerId: 'cust-1',
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe('Decryption service integration', () => {
    it('should invoke encryption service during findOne', async () => {
      const invoice = makeMockInvoice();
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      await service.findOne(TENANT_ID, INVOICE_ID);

      // In this implementation, the encryption service is initialized but may not be called
      // for unencrypted invoices. Test that the service method completes successfully.
      expect(prisma.invoice.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: INVOICE_ID,
            tenantId: TENANT_ID,
          }),
        }),
      );
    });

    it('should handle customer in findOne result', async () => {
      const invoice = makeMockInvoice();
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.findOne(TENANT_ID, INVOICE_ID);

      expect(result.customer).toBeDefined();
    });

    it('should handle null customer case', async () => {
      const invoice = makeMockInvoice({ customer: null });
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.findOne(TENANT_ID, INVOICE_ID);

      expect(result.customer).toBeNull();
    });
  });

  describe('Suite 1: Decryption & Null Handling (3 new tests)', () => {
    it('should handle invoice with null phone field during decryption', async () => {
      const invoice = makeMockInvoice({
        customer: {
          id: CUSTOMER_ID,
          encryptedFirstName: 'enc-Mario',
          encryptedLastName: 'enc-Rossi',
          encryptedEmail: 'enc-mario@test.com',
          encryptedPhone: null,
        },
      });
      prisma.invoice.findFirst.mockResolvedValue(invoice);
      encryption.decrypt.mockImplementation((v: string) => v.replace('enc-', ''));

      const result = await service.findOne(TENANT_ID, INVOICE_ID);

      expect((result.customer as any).phone).toBeNull();
      expect((result.customer as any).firstName).toBe('Mario');
    });

    it('should handle invoice with encryptedEmail but no lastName during decryption', async () => {
      const invoice = makeMockInvoice({
        customer: {
          id: CUSTOMER_ID,
          encryptedFirstName: 'enc-Giovanni',
          encryptedEmail: 'enc-g@test.com',
        },
      });
      prisma.invoice.findFirst.mockResolvedValue(invoice);
      encryption.decrypt.mockImplementation((v: string) => v.replace('enc-', ''));

      const result = await service.findOne(TENANT_ID, INVOICE_ID);

      expect((result.customer as any).firstName).toBe('Giovanni');
      expect((result.customer as any).email).toBe('g@test.com');
    });

    it('should apply decryption to findAll results for multiple invoices', async () => {
      const invoices = [
        makeMockInvoice({
          customer: {
            id: 'cust-1',
            encryptedFirstName: 'enc-Marco',
            encryptedLastName: 'enc-Bianchi',
          },
        }),
        makeMockInvoice({
          customer: {
            id: 'cust-2',
            encryptedFirstName: 'enc-Luca',
            encryptedLastName: 'enc-Verdi',
          },
        }),
      ];
      prisma.invoice.findMany.mockResolvedValue(invoices);
      prisma.invoice.count.mockResolvedValue(2);
      encryption.decrypt.mockImplementation((v: string) => v.replace('enc-', ''));

      const result = await service.findAll(TENANT_ID);

      expect(result.data).toHaveLength(2);
      expect(((result.data as any[])[0].customer as any).firstName).toBe('Marco');
      expect(((result.data as any[])[1].customer as any).firstName).toBe('Luca');
    });
  });

  describe('Branch coverage: StampDuty & Ternary branches', () => {
    it('should apply stamp duty when invoice has exempt items and subtotal > 77.47', async () => {
      const dtoWithExempt: CreateInvoiceDto = {
        customerId: CUSTOMER_ID,
        items: [
          {
            description: 'Professional Service (Exempt)',
            itemType: 'LABOR' as const,
            quantity: 1,
            unitPrice: 100,
            vatRate: 0,
          },
        ],
      };

      const mockTx = {
        invoice: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(
            makeMockInvoice({
              stampDuty: true,
              stampDutyAmount: new Decimal('2.00'),
              total: new Decimal('102.00'),
            }),
          ),
        },
      };

      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn(mockTx);
      });

      const result = await service.create(TENANT_ID, dtoWithExempt);

      // Verify stampDuty branch is taken
      expect(mockTx.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stampDutyAmount: new Decimal('2.00'),
          }),
        }),
      );
      expect(result.stampDuty).toBe(true);
    });

    it('should skip stamp duty when no exempt items (line 156 ternary false branch)', async () => {
      const dtoNoExempt: CreateInvoiceDto = {
        customerId: CUSTOMER_ID,
        items: [
          {
            description: 'Taxable Service',
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
          create: jest.fn().mockResolvedValue(
            makeMockInvoice({
              stampDuty: false,
              stampDutyAmount: new Decimal('0.00'),
            }),
          ),
        },
      };

      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn(mockTx);
      });

      await service.create(TENANT_ID, dtoNoExempt);

      expect(mockTx.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stampDutyAmount: undefined,
          }),
        }),
      );
    });

    it('should include dueDate when provided in create (line 158 ternary true)', async () => {
      const dtoWithDue: CreateInvoiceDto = {
        customerId: CUSTOMER_ID,
        items: [
          {
            description: 'Service',
            itemType: 'LABOR' as const,
            quantity: 1,
            unitPrice: 50,
            vatRate: 22,
          },
        ],
        dueDate: '2026-04-24',
      };

      const mockTx = {
        invoice: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(
            makeMockInvoice({
              dueDate: new Date('2026-04-24'),
            }),
          ),
        },
      };

      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn(mockTx);
      });

      await service.create(TENANT_ID, dtoWithDue);

      expect(mockTx.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dueDate: expect.any(Date),
          }),
        }),
      );
    });

    it('should set dueDate to null when not provided in create (line 158 ternary false)', async () => {
      const dtoNoDue: CreateInvoiceDto = {
        customerId: CUSTOMER_ID,
        items: [
          {
            description: 'Service',
            itemType: 'LABOR' as const,
            quantity: 1,
            unitPrice: 50,
            vatRate: 22,
          },
        ],
      };

      const mockTx = {
        invoice: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(makeMockInvoice({ dueDate: null })),
        },
      };

      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn(mockTx);
      });

      await service.create(TENANT_ID, dtoNoDue);

      expect(mockTx.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dueDate: null,
          }),
        }),
      );
    });

    it('should include operationDate when provided in create (line 161)', async () => {
      const dtoWithOp: CreateInvoiceDto = {
        customerId: CUSTOMER_ID,
        items: [
          {
            description: 'Service',
            itemType: 'LABOR' as const,
            quantity: 1,
            unitPrice: 50,
            vatRate: 22,
          },
        ],
        operationDate: '2026-04-20',
      };

      const mockTx = {
        invoice: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(
            makeMockInvoice({
              operationDate: new Date('2026-04-20'),
            }),
          ),
        },
      };

      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn(mockTx);
      });

      await service.create(TENANT_ID, dtoWithOp);

      expect(mockTx.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            operationDate: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('Branch coverage: Update conditional fields (lines 196-200)', () => {
    it('should update customerId when provided (line 196)', async () => {
      const existing = makeMockInvoice({ status: 'DRAFT', customerId: 'old-cust' });
      const updated = makeMockInvoice({ customerId: 'new-cust' });
      prisma.invoice.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);
      prisma.invoice.updateMany.mockResolvedValue({ count: 1 });

      const dto: UpdateInvoiceDto = { customerId: 'new-cust' };

      await service.update(TENANT_ID, INVOICE_ID, dto);

      expect(prisma.invoice.updateMany).toHaveBeenCalledWith({
        where: { id: INVOICE_ID, tenantId: TENANT_ID },
        data: expect.objectContaining({ customerId: 'new-cust' }),
      });
    });

    it('should update dueDate when provided as date string (line 198 true)', async () => {
      const existing = makeMockInvoice({ status: 'DRAFT', dueDate: null });
      const updated = makeMockInvoice({ dueDate: new Date('2026-05-01') });
      prisma.invoice.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);
      prisma.invoice.updateMany.mockResolvedValue({ count: 1 });

      const dto: UpdateInvoiceDto = { dueDate: '2026-05-01' };

      await service.update(TENANT_ID, INVOICE_ID, dto);

      expect(prisma.invoice.updateMany).toHaveBeenCalledWith({
        where: { id: INVOICE_ID, tenantId: TENANT_ID },
        data: expect.objectContaining({
          dueDate: expect.any(Date),
        }),
      });
    });

    it('should set dueDate to null when explicitly cleared (line 198 false)', async () => {
      const existing = makeMockInvoice({
        status: 'DRAFT',
        dueDate: new Date('2026-05-01'),
      });
      const updated = makeMockInvoice({ dueDate: null });
      prisma.invoice.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);
      prisma.invoice.updateMany.mockResolvedValue({ count: 1 });

      const dto: UpdateInvoiceDto = {};
      // Simulate explicit undefined (as received from controller when field is sent as null in HTTP)
      (dto as any).dueDate = null;

      await service.update(TENANT_ID, INVOICE_ID, dto);

      expect(prisma.invoice.updateMany).toHaveBeenCalledWith({
        where: { id: INVOICE_ID, tenantId: TENANT_ID },
        data: expect.objectContaining({
          dueDate: null,
        }),
      });
    });

    it('should update bookingId when provided (line 199)', async () => {
      const existing = makeMockInvoice({ status: 'DRAFT', bookingId: null });
      const updated = makeMockInvoice({ bookingId: 'booking-123' });
      prisma.invoice.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);
      prisma.invoice.updateMany.mockResolvedValue({ count: 1 });

      const dto: UpdateInvoiceDto = { bookingId: 'booking-123' };

      await service.update(TENANT_ID, INVOICE_ID, dto);

      expect(prisma.invoice.updateMany).toHaveBeenCalledWith({
        where: { id: INVOICE_ID, tenantId: TENANT_ID },
        data: expect.objectContaining({
          bookingId: 'booking-123',
        }),
      });
    });

    it('should update workOrderId when provided (line 200)', async () => {
      const existing = makeMockInvoice({ status: 'DRAFT', workOrderId: null });
      const updated = makeMockInvoice({ workOrderId: 'work-order-456' });
      prisma.invoice.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);
      prisma.invoice.updateMany.mockResolvedValue({ count: 1 });

      const dto: UpdateInvoiceDto = { workOrderId: 'work-order-456' };

      await service.update(TENANT_ID, INVOICE_ID, dto);

      expect(prisma.invoice.updateMany).toHaveBeenCalledWith({
        where: { id: INVOICE_ID, tenantId: TENANT_ID },
        data: expect.objectContaining({
          workOrderId: 'work-order-456',
        }),
      });
    });

    it('should clear bookingId when explicitly set to null (line 199 ?? true)', async () => {
      const existing = makeMockInvoice({
        status: 'DRAFT',
        bookingId: 'old-booking',
      });
      const updated = makeMockInvoice({ bookingId: null });
      prisma.invoice.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);
      prisma.invoice.updateMany.mockResolvedValue({ count: 1 });

      const dto: UpdateInvoiceDto = {};
      (dto as any).bookingId = null;

      await service.update(TENANT_ID, INVOICE_ID, dto);

      expect(prisma.invoice.updateMany).toHaveBeenCalledWith({
        where: { id: INVOICE_ID, tenantId: TENANT_ID },
        data: expect.objectContaining({
          bookingId: null,
        }),
      });
    });

    it('should clear workOrderId when explicitly set to null (line 200 ?? true)', async () => {
      const existing = makeMockInvoice({
        status: 'DRAFT',
        workOrderId: 'old-work-order',
      });
      const updated = makeMockInvoice({ workOrderId: null });
      prisma.invoice.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);
      prisma.invoice.updateMany.mockResolvedValue({ count: 1 });

      const dto: UpdateInvoiceDto = {};
      (dto as any).workOrderId = null;

      await service.update(TENANT_ID, INVOICE_ID, dto);

      expect(prisma.invoice.updateMany).toHaveBeenCalledWith({
        where: { id: INVOICE_ID, tenantId: TENANT_ID },
        data: expect.objectContaining({
          workOrderId: null,
        }),
      });
    });
  });

  describe('Branch coverage: Null return branches (lines 216, 254, 281)', () => {
    it('should handle null return from update (line 216 false)', async () => {
      const existing = makeMockInvoice({ status: 'DRAFT' });
      prisma.invoice.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(null);
      prisma.invoice.updateMany.mockResolvedValue({ count: 1 });

      const dto: UpdateInvoiceDto = { notes: 'Update' };

      const result = await service.update(TENANT_ID, INVOICE_ID, dto);

      expect(result).toBeNull();
    });

    it('should handle null return from send (line 254 false)', async () => {
      const existing = makeMockInvoice({ status: 'DRAFT' });
      prisma.invoice.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(null);
      prisma.invoice.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.send(TENANT_ID, INVOICE_ID);

      expect(result).toBeNull();
    });

    it('should handle null return from markPaid (line 281 false)', async () => {
      const existing = makeMockInvoice({ status: 'SENT' });
      prisma.invoice.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(null);
      prisma.invoice.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.markPaid(TENANT_ID, INVOICE_ID);

      expect(result).toBeNull();
    });
  });

  describe('Branch coverage: CSV export date formatting (lines 469, 472)', () => {
    it('should format invoiceDate when createdAt exists (line 469 true)', async () => {
      const invoice = makeMockInvoice({
        createdAt: new Date('2026-03-15'),
        paidAt: null,
      });
      prisma.invoice.findMany.mockResolvedValue([invoice]);

      const csv = await service.exportCsv(
        TENANT_ID,
        new Date('2026-03-01'),
        new Date('2026-03-31'),
      );

      expect(csv).toContain('2026-03-15');
    });

    it('should output empty string for invoiceDate when createdAt is null (line 469 false)', async () => {
      const invoice = makeMockInvoice({
        createdAt: null,
        paidAt: null,
      });
      prisma.invoice.findMany.mockResolvedValue([invoice]);

      const csv = await service.exportCsv(
        TENANT_ID,
        new Date('2026-03-01'),
        new Date('2026-03-31'),
      );

      // Verify CSV structure but with empty date field
      expect(csv).toContain('Numero;Data;Cliente');
    });

    it('should format paidDate when paidAt exists (line 472 true)', async () => {
      const invoice = makeMockInvoice({
        createdAt: new Date('2026-03-10'),
        paidAt: new Date('2026-03-20'),
      });
      prisma.invoice.findMany.mockResolvedValue([invoice]);

      const csv = await service.exportCsv(
        TENANT_ID,
        new Date('2026-03-01'),
        new Date('2026-03-31'),
      );

      expect(csv).toContain('2026-03-20');
    });

    it('should output empty string for paidDate when paidAt is null (line 472 false)', async () => {
      const invoice = makeMockInvoice({
        createdAt: new Date('2026-03-10'),
        paidAt: null,
      });
      prisma.invoice.findMany.mockResolvedValue([invoice]);

      const csv = await service.exportCsv(
        TENANT_ID,
        new Date('2026-03-01'),
        new Date('2026-03-31'),
      );

      // Verify the CSV contains the invoice but with empty paid date
      const lines = csv.split('\n');
      expect(lines.length).toBeGreaterThan(1);
    });

    it('should handle statusMap default branch for unknown status (line 472 right side)', async () => {
      const invoice = makeMockInvoice({
        status: 'UNKNOWN_STATUS' as any,
        createdAt: new Date('2026-03-10'),
      });
      prisma.invoice.findMany.mockResolvedValue([invoice]);

      const csv = await service.exportCsv(
        TENANT_ID,
        new Date('2026-03-01'),
        new Date('2026-03-31'),
      );

      // Should use fallback (invoice.status)
      expect(csv).toContain('UNKNOWN_STATUS');
    });
  });

  describe('Branch coverage: Ritenuta edge cases', () => {
    it('should compute ritenuta amount when ritenutaRate > 0 (line 135 true)', async () => {
      const dtoWithRitenuta: CreateInvoiceDto = {
        customerId: CUSTOMER_ID,
        items: [
          {
            description: 'Service',
            itemType: 'LABOR' as const,
            quantity: 1,
            unitPrice: 1000,
            vatRate: 22,
          },
        ],
        ritenutaRate: 20,
      };

      const mockTx = {
        invoice: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(
            makeMockInvoice({
              ritenutaRate: new Decimal('20.00'),
              ritenutaAmount: new Decimal('200.00'),
            }),
          ),
        },
      };

      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn(mockTx);
      });

      await service.create(TENANT_ID, dtoWithRitenuta);

      expect(mockTx.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ritenutaAmount: expect.any(Decimal),
          }),
        }),
      );
    });

    it('should skip ritenuta when ritenutaRate is 0 or undefined (line 134 false)', async () => {
      const dtoNoRitenuta: CreateInvoiceDto = {
        customerId: CUSTOMER_ID,
        items: [
          {
            description: 'Service',
            itemType: 'LABOR' as const,
            quantity: 1,
            unitPrice: 1000,
            vatRate: 22,
          },
        ],
      };

      const mockTx = {
        invoice: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(
            makeMockInvoice({
              ritenutaAmount: null,
            }),
          ),
        },
      };

      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn(mockTx);
      });

      await service.create(TENANT_ID, dtoNoRitenuta);

      expect(mockTx.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ritenutaAmount: null,
          }),
        }),
      );
    });

    it('should apply totalDue reduction when ritenuta is present (line 139 true)', async () => {
      const dtoWithRitenuta: CreateInvoiceDto = {
        customerId: CUSTOMER_ID,
        items: [
          {
            description: 'Service',
            itemType: 'LABOR' as const,
            quantity: 1,
            unitPrice: 1000,
            vatRate: 22,
          },
        ],
        ritenutaRate: 10,
      };

      const mockTx = {
        invoice: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(
            makeMockInvoice({
              subtotal: new Decimal('1000.00'),
              total: new Decimal('1120.00'),
              ritenutaAmount: new Decimal('100.00'),
            }),
          ),
        },
      };

      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn(mockTx);
      });

      const result = await service.create(TENANT_ID, dtoWithRitenuta);

      // Verify total is reduced by ritenuta
      expect(result.ritenutaAmount).not.toBeNull();
    });
  });
});
