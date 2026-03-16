import { Test, TestingModule } from '@nestjs/testing';
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
        id: 'inv-1',
        tenantId: 't1',
        invoiceNumber: 'INV-001',
        customerId: 'cust-1',
        customer: { id: 'cust-1', encryptedFirstName: 'enc_Mario' },
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

    expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 't1',
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      include: { customer: true },
      orderBy: { createdAt: 'asc' },
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
    // No data rows
    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(1); // Header only
  });
});
