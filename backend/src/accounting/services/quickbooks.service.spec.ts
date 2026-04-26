import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { QuickBooksService } from './quickbooks.service';
import { PrismaService } from '../../common/services/prisma.service';

const mockPrisma = {
  invoice: {
    findMany: jest.fn(),
  },
};

describe('QuickBooksService', () => {
  let service: QuickBooksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuickBooksService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<QuickBooksService>(QuickBooksService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should export CSV with correct headers', async () => {
    const mockInvoices = [
      {
        invoiceNumber: 'INV-001',
        customerId: 'cust-1',
        customer: { searchName: 'mario rossi' },
        subtotal: { toString: () => '100.00' },
        taxAmount: { toString: () => '22.00' },
        total: { toString: () => '122.00' },
        status: 'PAID',
        createdAt: new Date('2024-06-15T10:00:00Z'),
      },
    ];

    mockPrisma.invoice.findMany.mockResolvedValue(mockInvoices);

    const dateFrom = new Date('2024-01-01');
    const dateTo = new Date('2024-12-31');
    const result = await service.exportInvoicesForQuickBooks('t1', dateFrom, dateTo);

    expect(result).toBeInstanceOf(Buffer);
    const csv = result.toString('utf-8');
    expect(csv).toContain('Date');
    expect(csv).toContain('Invoice#');
    expect(csv).toContain('Customer');
    expect(csv).toContain('Amount');
    expect(csv).toContain('Tax');
    expect(csv).toContain('Total');
    expect(csv).toContain('Status');
    expect(csv).toContain('INV-001');
    expect(csv).toContain('100.00');
    expect(csv).toContain('22.00');
    expect(csv).toContain('122.00');
    expect(csv).toContain('PAID');
    expect(csv).toContain('mario rossi');

    expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 't1',
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      select: {
        createdAt: true,
        invoiceNumber: true,
        customerId: true,
        customer: { select: { searchName: true } },
        subtotal: true,
        taxAmount: true,
        total: true,
        status: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 5000,
    });
  });

  it('should return empty CSV for no invoices', async () => {
    mockPrisma.invoice.findMany.mockResolvedValue([]);

    const result = await service.exportInvoicesForQuickBooks(
      't1',
      new Date('2024-01-01'),
      new Date('2024-12-31'),
    );

    expect(result).toBeInstanceOf(Buffer);
    const csv = result.toString('utf-8');
    expect(csv).toContain('Date');
    expect(csv).toContain('Invoice#');
    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(1);
  });

  it('should fall back to customerId when customer relation is null', async () => {
    mockPrisma.invoice.findMany.mockResolvedValue([
      {
        invoiceNumber: 'INV-002',
        customerId: 'cust-fallback-id',
        customer: null,
        subtotal: { toString: () => '50.00' },
        taxAmount: { toString: () => '11.00' },
        total: { toString: () => '61.00' },
        status: 'DRAFT',
        createdAt: new Date('2024-07-01T00:00:00Z'),
      },
    ]);

    const result = await service.exportInvoicesForQuickBooks(
      't1',
      new Date('2024-01-01'),
      new Date('2024-12-31'),
    );

    const csv = result.toString('utf-8');
    expect(csv).toContain('cust-fallback-id');
    expect(csv).toContain('INV-002');
    expect(csv).toContain('DRAFT');
  });

  it('should fall back to customerId when customer.searchName is nullish', async () => {
    mockPrisma.invoice.findMany.mockResolvedValue([
      {
        invoiceNumber: 'INV-003',
        customerId: 'cust-no-name',
        customer: { searchName: null },
        subtotal: { toString: () => '10.00' },
        taxAmount: { toString: () => '2.20' },
        total: { toString: () => '12.20' },
        status: 'SENT',
        createdAt: new Date('2024-08-01T00:00:00Z'),
      },
    ]);

    const result = await service.exportInvoicesForQuickBooks(
      't1',
      new Date('2024-01-01'),
      new Date('2024-12-31'),
    );

    const csv = result.toString('utf-8');
    expect(csv).toContain('cust-no-name');
  });

  it('should throw InternalServerErrorException when prisma fails', async () => {
    mockPrisma.invoice.findMany.mockRejectedValue(new Error('DB down'));

    await expect(
      service.exportInvoicesForQuickBooks('t1', new Date('2024-01-01'), new Date('2024-12-31')),
    ).rejects.toThrow(InternalServerErrorException);

    await expect(
      service.exportInvoicesForQuickBooks('t1', new Date('2024-01-01'), new Date('2024-12-31')),
    ).rejects.toThrow('Esportazione QuickBooks fallita');
  });
});
