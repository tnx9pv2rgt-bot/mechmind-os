import { Test, TestingModule } from '@nestjs/testing';
import { WorkOrderController } from './work-order.controller';
import { WorkOrderService } from './work-order.service';

describe('WorkOrderController', () => {
  let controller: WorkOrderController;
  let service: jest.Mocked<WorkOrderService>;

  const TENANT_ID = 'tenant-001';

  const mockWorkOrder = {
    id: 'wo-001',
    tenantId: TENANT_ID,
    woNumber: 'WO-2026-0001',
    status: 'OPEN',
    vehicleId: 'veh-001',
    customerId: 'cust-001',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkOrderController],
      providers: [
        {
          provide: WorkOrderService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            start: jest.fn(),
            complete: jest.fn(),
            createInvoiceFromWo: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<WorkOrderController>(WorkOrderController);
    service = module.get(WorkOrderService) as jest.Mocked<WorkOrderService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should delegate to service with filters and return wrapped response', async () => {
      const expected = { workOrders: [mockWorkOrder], total: 1 };
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(TENANT_ID, 'OPEN', 'veh-001', 'cust-001');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        status: 'OPEN',
        vehicleId: 'veh-001',
        customerId: 'cust-001',
      });
      expect(result).toEqual({
        success: true,
        data: expected.workOrders,
        meta: { total: 1 },
      });
    });

    it('should pass undefined filters when not provided', async () => {
      service.findAll.mockResolvedValue({ workOrders: [], total: 0 });

      await controller.findAll(TENANT_ID);

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        status: undefined,
        vehicleId: undefined,
        customerId: undefined,
      });
    });
  });

  describe('create', () => {
    it('should delegate to service with tenantId and dto', async () => {
      service.create.mockResolvedValue(mockWorkOrder as never);
      const dto = { vehicleId: 'veh-001', customerId: 'cust-001', description: 'Brake repair' };

      const result = await controller.create(TENANT_ID, dto as never);

      expect(service.create).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual({ success: true, data: mockWorkOrder });
    });
  });

  describe('findOne', () => {
    it('should delegate to service with tenantId and id', async () => {
      service.findOne.mockResolvedValue(mockWorkOrder as never);

      const result = await controller.findOne(TENANT_ID, 'wo-001');

      expect(service.findOne).toHaveBeenCalledWith(TENANT_ID, 'wo-001');
      expect(result).toEqual({ success: true, data: mockWorkOrder });
    });
  });

  describe('update', () => {
    it('should delegate to service with tenantId, id, and dto', async () => {
      const updated = { ...mockWorkOrder, description: 'Updated' };
      service.update.mockResolvedValue(updated as never);
      const dto = { description: 'Updated' };

      const result = await controller.update(TENANT_ID, 'wo-001', dto as never);

      expect(service.update).toHaveBeenCalledWith(TENANT_ID, 'wo-001', dto);
      expect(result).toEqual({ success: true, data: updated });
    });
  });

  describe('start', () => {
    it('should delegate to service with tenantId and id', async () => {
      const started = { ...mockWorkOrder, status: 'IN_PROGRESS' };
      service.start.mockResolvedValue(started as never);

      const result = await controller.start(TENANT_ID, 'wo-001');

      expect(service.start).toHaveBeenCalledWith(TENANT_ID, 'wo-001');
      expect(result).toEqual({ success: true, data: started });
    });
  });

  describe('complete', () => {
    it('should delegate to service with tenantId and id', async () => {
      const completed = { ...mockWorkOrder, status: 'COMPLETED' };
      service.complete.mockResolvedValue(completed as never);

      const result = await controller.complete(TENANT_ID, 'wo-001');

      expect(service.complete).toHaveBeenCalledWith(TENANT_ID, 'wo-001');
      expect(result).toEqual({ success: true, data: completed });
    });
  });

  describe('createInvoice', () => {
    it('should delegate to service with tenantId and id', async () => {
      const invoice = { id: 'inv-001', invoiceNumber: 'INV-2026-0001' };
      service.createInvoiceFromWo.mockResolvedValue(invoice as never);

      const result = await controller.createInvoice(TENANT_ID, 'wo-001');

      expect(service.createInvoiceFromWo).toHaveBeenCalledWith(TENANT_ID, 'wo-001');
      expect(result).toEqual({ success: true, data: invoice });
    });
  });
});
