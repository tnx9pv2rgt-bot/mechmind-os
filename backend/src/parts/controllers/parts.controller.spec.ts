import { Test, TestingModule } from '@nestjs/testing';
import { PartsController } from './parts.controller';
import { PartsService } from '../services/parts.service';

describe('PartsController', () => {
  let controller: PartsController;
  let service: jest.Mocked<PartsService>;

  const TENANT_ID = 'tenant-001';
  const USER_ID = 'user-001';

  const mockPart = {
    id: 'part-001',
    tenantId: TENANT_ID,
    name: 'Brake Pad',
    sku: 'BP-001',
    price: 45.99,
    quantity: 10,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartsController],
      providers: [
        {
          provide: PartsService,
          useValue: {
            createPart: jest.fn(),
            getParts: jest.fn(),
            getPart: jest.fn(),
            updatePart: jest.fn(),
            createSupplier: jest.fn(),
            getSuppliers: jest.fn(),
            adjustStock: jest.fn(),
            getInventoryHistory: jest.fn(),
            getLowStockAlerts: jest.fn(),
            createPurchaseOrder: jest.fn(),
            getPurchaseOrders: jest.fn(),
            receiveOrder: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PartsController>(PartsController);
    service = module.get(PartsService) as jest.Mocked<PartsService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPart', () => {
    it('should delegate to service with tenantId and dto', async () => {
      const dto = { name: 'Brake Pad', sku: 'BP-001', price: 45.99 };
      service.createPart.mockResolvedValue(mockPart as never);

      const result = await controller.createPart(TENANT_ID, dto as never);

      expect(service.createPart).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual(mockPart);
    });
  });

  describe('getParts', () => {
    it('should delegate to service with tenantId and query filters', async () => {
      const query = { category: 'brakes', search: 'pad' };
      service.getParts.mockResolvedValue([mockPart] as never);

      const result = await controller.getParts(TENANT_ID, query as never);

      expect(service.getParts).toHaveBeenCalledWith(TENANT_ID, {
        category: 'brakes',
        supplierId: undefined,
        lowStock: undefined,
        search: 'pad',
      });
      expect(result).toEqual([mockPart]);
    });
  });

  describe('getPart', () => {
    it('should delegate to service with tenantId and id', async () => {
      service.getPart.mockResolvedValue(mockPart as never);

      const result = await controller.getPart(TENANT_ID, 'part-001');

      expect(service.getPart).toHaveBeenCalledWith(TENANT_ID, 'part-001');
      expect(result).toEqual(mockPart);
    });
  });

  describe('updatePart', () => {
    it('should delegate to service with tenantId, id, and dto', async () => {
      const dto = { price: 49.99 };
      const updated = { ...mockPart, price: 49.99 };
      service.updatePart.mockResolvedValue(updated as never);

      const result = await controller.updatePart(TENANT_ID, 'part-001', dto as never);

      expect(service.updatePart).toHaveBeenCalledWith(TENANT_ID, 'part-001', dto);
      expect(result).toEqual(updated);
    });
  });

  describe('createSupplier', () => {
    it('should delegate to service with tenantId and dto', async () => {
      const dto = { name: 'Auto Parts Inc' };
      const mockSupplier = { id: 'sup-001', name: 'Auto Parts Inc' };
      service.createSupplier.mockResolvedValue(mockSupplier as never);

      const result = await controller.createSupplier(TENANT_ID, dto as never);

      expect(service.createSupplier).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual(mockSupplier);
    });
  });

  describe('getSuppliers', () => {
    it('should delegate to service with tenantId', async () => {
      const suppliers = [{ id: 'sup-001', name: 'Auto Parts Inc' }];
      service.getSuppliers.mockResolvedValue(suppliers as never);

      const result = await controller.getSuppliers(TENANT_ID);

      expect(service.getSuppliers).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual(suppliers);
    });
  });

  describe('adjustStock', () => {
    it('should delegate to service with tenantId, partId, dto, and userId', async () => {
      const dto = { adjustment: 5, reason: 'Restock' };
      service.adjustStock.mockResolvedValue(undefined as never);

      await controller.adjustStock(TENANT_ID, USER_ID, 'part-001', dto as never);

      expect(service.adjustStock).toHaveBeenCalledWith(TENANT_ID, 'part-001', dto, USER_ID);
    });
  });

  describe('getInventoryHistory', () => {
    it('should delegate to service with tenantId and partId', async () => {
      const history = [{ id: 'mov-001', quantity: 5, type: 'IN' }];
      service.getInventoryHistory.mockResolvedValue(history as never);

      const result = await controller.getInventoryHistory(TENANT_ID, 'part-001');

      expect(service.getInventoryHistory).toHaveBeenCalledWith(TENANT_ID, 'part-001');
      expect(result).toEqual(history);
    });
  });

  describe('getLowStockAlerts', () => {
    it('should delegate to service with tenantId', async () => {
      const alerts = [{ partId: 'part-001', current: 2, minimum: 5 }];
      service.getLowStockAlerts.mockResolvedValue(alerts as never);

      const result = await controller.getLowStockAlerts(TENANT_ID);

      expect(service.getLowStockAlerts).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual(alerts);
    });
  });

  describe('createPurchaseOrder', () => {
    it('should delegate to service with tenantId, dto, and userId', async () => {
      const dto = { supplierId: 'sup-001', items: [] };
      const mockOrder = { id: 'po-001', status: 'PENDING' };
      service.createPurchaseOrder.mockResolvedValue(mockOrder as never);

      const result = await controller.createPurchaseOrder(TENANT_ID, USER_ID, dto as never);

      expect(service.createPurchaseOrder).toHaveBeenCalledWith(TENANT_ID, dto, USER_ID);
      expect(result).toEqual(mockOrder);
    });
  });

  describe('getPurchaseOrders', () => {
    it('should delegate to service with tenantId and optional status', async () => {
      const orders = [{ id: 'po-001', status: 'PENDING' }];
      service.getPurchaseOrders.mockResolvedValue(orders as never);

      const result = await controller.getPurchaseOrders(TENANT_ID, 'PENDING' as never);

      expect(service.getPurchaseOrders).toHaveBeenCalledWith(TENANT_ID, 'PENDING');
      expect(result).toEqual(orders);
    });
  });

  describe('receiveOrder', () => {
    it('should delegate to service with tenantId, orderId, items, and userId', async () => {
      const items = [{ partId: 'part-001', receivedQuantity: 10 }];
      service.receiveOrder.mockResolvedValue(undefined as never);

      await controller.receiveOrder(TENANT_ID, USER_ID, 'po-001', items as never);

      expect(service.receiveOrder).toHaveBeenCalledWith(TENANT_ID, 'po-001', items, USER_ID);
    });
  });
});
