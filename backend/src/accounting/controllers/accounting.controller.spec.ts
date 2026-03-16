import { Test, TestingModule } from '@nestjs/testing';
import { AccountingController } from './accounting.controller';
import { AccountingService } from '../services/accounting.service';

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
});
