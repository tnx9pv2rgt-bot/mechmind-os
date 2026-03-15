import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';

describe('InvoiceController', () => {
  let controller: InvoiceController;
  let service: jest.Mocked<InvoiceService>;

  const TENANT_ID = 'tenant-001';

  const mockInvoice = {
    id: 'inv-001',
    tenantId: TENANT_ID,
    invoiceNumber: 'INV-2026-0001',
    customerId: 'cust-001',
    status: 'DRAFT',
    subtotal: 100,
    taxRate: 22,
    taxAmount: 22,
    total: 122,
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoiceController],
      providers: [
        {
          provide: InvoiceService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            send: jest.fn(),
            markPaid: jest.fn(),
            getStats: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InvoiceController>(InvoiceController);
    service = module.get(InvoiceService) as jest.Mocked<InvoiceService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should delegate to service and return wrapped response', async () => {
      const expected = { invoices: [mockInvoice], total: 1 } as any;
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(
        TENANT_ID,
        'DRAFT',
        'cust-001',
        '2026-01-01',
        '2026-12-31',
      );

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        status: 'DRAFT',
        customerId: 'cust-001',
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
      });
      expect(result).toEqual({
        success: true,
        data: expected.invoices,
        meta: { total: 1 },
      });
    });

    it('should pass undefined filters when not provided', async () => {
      service.findAll.mockResolvedValue({ invoices: [], total: 0 });

      await controller.findAll(TENANT_ID);

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        status: undefined,
        customerId: undefined,
        dateFrom: undefined,
        dateTo: undefined,
      });
    });
  });

  describe('create', () => {
    it('should delegate to service with tenantId and dto', async () => {
      service.create.mockResolvedValue(mockInvoice as never);
      const dto = {
        customerId: 'cust-001',
        items: [{ description: 'Oil change', qty: 1, price: 50 }],
      };

      const result = await controller.create(TENANT_ID, dto as never);

      expect(service.create).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual({ success: true, data: mockInvoice });
    });
  });

  describe('getStats', () => {
    it('should delegate to service with tenantId', async () => {
      const stats = { byStatus: { DRAFT: 2, PAID: 5 }, monthlyRevenue: { total: 1000, count: 5 } };
      service.getStats.mockResolvedValue(stats as never);

      const result = await controller.getStats(TENANT_ID);

      expect(service.getStats).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual({ success: true, data: stats });
    });
  });

  describe('findOne', () => {
    it('should delegate to service with tenantId and id', async () => {
      service.findOne.mockResolvedValue(mockInvoice as never);

      const result = await controller.findOne(TENANT_ID, 'inv-001');

      expect(service.findOne).toHaveBeenCalledWith(TENANT_ID, 'inv-001');
      expect(result).toEqual({ success: true, data: mockInvoice });
    });
  });

  describe('update', () => {
    it('should delegate to service with tenantId, id, and dto', async () => {
      const updated = { ...mockInvoice, notes: 'Updated' };
      service.update.mockResolvedValue(updated as never);
      const dto = { notes: 'Updated' };

      const result = await controller.update(TENANT_ID, 'inv-001', dto as never);

      expect(service.update).toHaveBeenCalledWith(TENANT_ID, 'inv-001', dto);
      expect(result).toEqual({ success: true, data: updated });
    });
  });

  describe('remove', () => {
    it('should delegate to service and return success message', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove(TENANT_ID, 'inv-001');

      expect(service.remove).toHaveBeenCalledWith(TENANT_ID, 'inv-001');
      expect(result).toEqual({ success: true, message: 'Invoice deleted successfully' });
    });
  });

  describe('send', () => {
    it('should delegate to service with tenantId and id', async () => {
      const sent = { ...mockInvoice, status: 'SENT' };
      service.send.mockResolvedValue(sent as never);

      const result = await controller.send(TENANT_ID, 'inv-001');

      expect(service.send).toHaveBeenCalledWith(TENANT_ID, 'inv-001');
      expect(result).toEqual({ success: true, data: sent });
    });
  });

  describe('markPaid', () => {
    it('should delegate to service with tenantId and id', async () => {
      const paid = { ...mockInvoice, status: 'PAID' };
      service.markPaid.mockResolvedValue(paid as never);

      const result = await controller.markPaid(TENANT_ID, 'inv-001');

      expect(service.markPaid).toHaveBeenCalledWith(TENANT_ID, 'inv-001');
      expect(result).toEqual({ success: true, data: paid });
    });
  });
});
