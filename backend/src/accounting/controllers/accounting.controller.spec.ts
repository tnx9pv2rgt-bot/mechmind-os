import { Test, TestingModule } from '@nestjs/testing';
import { AccountingController } from './accounting.controller';
import { AccountingService } from '../services/accounting.service';
import { QuickBooksService } from '../services/quickbooks.service';

describe('AccountingController', () => {
  let controller: AccountingController;
  let service: jest.Mocked<AccountingService>;

  const TENANT_ID = 'tenant-001';

  const mockSyncRecord = {
    id: 'sync-001',
    tenantId: TENANT_ID,
    entityType: 'INVOICE',
    entityId: 'inv-001',
    provider: 'FATTURA_ELETTRONICA',
    status: 'PENDING',
    externalId: null,
    error: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountingController],
      providers: [
        {
          provide: AccountingService,
          useValue: {
            syncInvoice: jest.fn(),
            syncCustomer: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            retry: jest.fn(),
            getStatus: jest.fn(),
          },
        },
        {
          provide: QuickBooksService,
          useValue: {
            exportInvoicesForQuickBooks: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AccountingController>(AccountingController);
    service = module.get(AccountingService) as jest.Mocked<AccountingService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('syncInvoice', () => {
    it('should delegate to service with tenantId, invoiceId, and provider', async () => {
      service.syncInvoice.mockResolvedValue(mockSyncRecord as never);
      const dto = { invoiceId: 'inv-001', provider: 'FATTURA_ELETTRONICA' };

      const result = await controller.syncInvoice(TENANT_ID, dto as never);

      expect(service.syncInvoice).toHaveBeenCalledWith(TENANT_ID, 'inv-001', 'FATTURA_ELETTRONICA');
      expect(result).toEqual({ success: true, data: mockSyncRecord });
    });

    it('should sync with QuickBooks provider', async () => {
      const qbRecord = { ...mockSyncRecord, provider: 'QUICKBOOKS' };
      service.syncInvoice.mockResolvedValue(qbRecord as never);
      const dto = { invoiceId: 'inv-002', provider: 'QUICKBOOKS' };

      const result = await controller.syncInvoice(TENANT_ID, dto as never);

      expect(service.syncInvoice).toHaveBeenCalledWith(TENANT_ID, 'inv-002', 'QUICKBOOKS');
      expect(result.data.provider).toBe('QUICKBOOKS');
    });

    it('should sync with Xero provider', async () => {
      const xeroRecord = { ...mockSyncRecord, provider: 'XERO' };
      service.syncInvoice.mockResolvedValue(xeroRecord as never);
      const dto = { invoiceId: 'inv-003', provider: 'XERO' };

      const result = await controller.syncInvoice(TENANT_ID, dto as never);

      expect(service.syncInvoice).toHaveBeenCalledWith(TENANT_ID, 'inv-003', 'XERO');
      expect(result.data.provider).toBe('XERO');
    });
  });

  describe('syncCustomer', () => {
    it('should delegate to service with tenantId, customerId, and provider', async () => {
      const customerSync = { ...mockSyncRecord, entityType: 'CUSTOMER', entityId: 'cust-001' };
      service.syncCustomer.mockResolvedValue(customerSync as never);
      const dto = { customerId: 'cust-001', provider: 'FATTURA_ELETTRONICA' };

      const result = await controller.syncCustomer(TENANT_ID, dto as never);

      expect(service.syncCustomer).toHaveBeenCalledWith(
        TENANT_ID,
        'cust-001',
        'FATTURA_ELETTRONICA',
      );
      expect(result).toEqual({ success: true, data: customerSync });
    });

    it('should sync customer with XERO provider', async () => {
      const xeroCustomer = {
        ...mockSyncRecord,
        entityType: 'CUSTOMER',
        entityId: 'cust-002',
        provider: 'XERO',
      };
      service.syncCustomer.mockResolvedValue(xeroCustomer as never);
      const dto = { customerId: 'cust-002', provider: 'XERO' };

      const result = await controller.syncCustomer(TENANT_ID, dto as never);

      expect(service.syncCustomer).toHaveBeenCalledWith(TENANT_ID, 'cust-002', 'XERO');
      expect(result.data.provider).toBe('XERO');
    });

    it('should sync customer with QuickBooks provider', async () => {
      const qbCustomer = {
        ...mockSyncRecord,
        entityType: 'CUSTOMER',
        entityId: 'cust-003',
        provider: 'QUICKBOOKS',
      };
      service.syncCustomer.mockResolvedValue(qbCustomer as never);
      const dto = { customerId: 'cust-003', provider: 'QUICKBOOKS' };

      const result = await controller.syncCustomer(TENANT_ID, dto as never);

      expect(service.syncCustomer).toHaveBeenCalledWith(TENANT_ID, 'cust-003', 'QUICKBOOKS');
      expect(result.data.provider).toBe('QUICKBOOKS');
    });
  });

  describe('findAll', () => {
    it('should delegate to service and return wrapped response with meta', async () => {
      const expected = { records: [mockSyncRecord], total: 1 };
      service.findAll.mockResolvedValue(expected as never);
      const filters = { limit: 20, offset: 0 };

      const result = await controller.findAll(TENANT_ID, filters as never);

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, filters);
      expect(result).toEqual({
        success: true,
        data: [mockSyncRecord],
        meta: { total: 1, limit: 20, offset: 0 },
      });
    });

    it('should use default limit and offset when not provided', async () => {
      service.findAll.mockResolvedValue({ records: [], total: 0 } as never);
      const filters = {};

      const result = await controller.findAll(TENANT_ID, filters as never);

      expect(result).toEqual({
        success: true,
        data: [],
        meta: { total: 0, limit: 50, offset: 0 },
      });
    });

    it('should filter by provider', async () => {
      const records = [{ ...mockSyncRecord, provider: 'XERO' }];
      service.findAll.mockResolvedValue({ records, total: 1 } as never);
      const filters = { provider: 'XERO', limit: 50, offset: 0 };

      const result = await controller.findAll(TENANT_ID, filters as never);

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, filters);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].provider).toBe('XERO');
    });

    it('should filter by status', async () => {
      const records = [{ ...mockSyncRecord, status: 'SYNCED' }];
      service.findAll.mockResolvedValue({ records, total: 1 } as never);
      const filters = { status: 'SYNCED', limit: 50, offset: 0 };

      const result = await controller.findAll(TENANT_ID, filters as never);

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, filters);
      expect(result.data[0].status).toBe('SYNCED');
    });

    it('should handle multiple records with pagination', async () => {
      const records = Array.from({ length: 3 }, (_, i) => ({
        ...mockSyncRecord,
        id: `sync-00${i}`,
      }));
      service.findAll.mockResolvedValue({ records, total: 10 } as never);
      const filters = { limit: 3, offset: 0 };

      const result = await controller.findAll(TENANT_ID, filters as never);

      expect(result.data).toHaveLength(3);
      expect(result.meta.total).toBe(10);
      expect(result.meta.limit).toBe(3);
    });
  });

  describe('findById', () => {
    it('should delegate to service with tenantId and id', async () => {
      service.findById.mockResolvedValue(mockSyncRecord as never);

      const result = await controller.findById(TENANT_ID, 'sync-001');

      expect(service.findById).toHaveBeenCalledWith(TENANT_ID, 'sync-001');
      expect(result).toEqual({ success: true, data: mockSyncRecord });
    });
  });

  describe('retry', () => {
    it('should delegate to service with tenantId and id', async () => {
      const retried = { ...mockSyncRecord, status: 'PENDING' };
      service.retry.mockResolvedValue(retried as never);

      const result = await controller.retry(TENANT_ID, 'sync-001');

      expect(service.retry).toHaveBeenCalledWith(TENANT_ID, 'sync-001');
      expect(result).toEqual({ success: true, data: retried });
    });
  });

  describe('getStatus', () => {
    it('should delegate to service with tenantId, entityType, and entityId', async () => {
      service.getStatus.mockResolvedValue([mockSyncRecord] as never);

      const result = await controller.getStatus(TENANT_ID, 'INVOICE', 'inv-001');

      expect(service.getStatus).toHaveBeenCalledWith(TENANT_ID, 'INVOICE', 'inv-001');
      expect(result).toEqual({ success: true, data: [mockSyncRecord] });
    });
  });

  describe('exportQuickBooks', () => {
    it('should export invoices in CSV format with correct headers', async () => {
      const mockQBService = controller['quickBooksService'] as jest.Mocked<QuickBooksService>;
      const mockCsv = Buffer.from('col1,col2\nval1,val2\n');
      mockQBService.exportInvoicesForQuickBooks.mockResolvedValue(mockCsv);

      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      await controller.exportQuickBooks(TENANT_ID, mockRes as never, '2026-01-01', '2026-03-31');

      expect(mockQBService.exportInvoicesForQuickBooks).toHaveBeenCalledWith(
        TENANT_ID,
        new Date('2026-01-01'),
        new Date('2026-03-31'),
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockRes.send).toHaveBeenCalledWith(mockCsv);
    });

    it('should handle export failures', async () => {
      const mockQBService = controller['quickBooksService'] as jest.Mocked<QuickBooksService>;
      mockQBService.exportInvoicesForQuickBooks.mockRejectedValueOnce(new Error('Export failed'));
      const mockRes = { setHeader: jest.fn(), send: jest.fn() };

      await expect(
        controller.exportQuickBooks(TENANT_ID, mockRes as never, '2026-01-01', '2026-03-31'),
      ).rejects.toThrow();
    });
  });
});
