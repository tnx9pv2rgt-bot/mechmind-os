import { Test, TestingModule } from '@nestjs/testing';
import { WorkOrderController } from './work-order.controller';
import { WorkOrderService } from './work-order.service';
import { PdfService } from '../invoice/services/pdf.service';

describe('WorkOrderController', () => {
  let controller: WorkOrderController;
  let service: jest.Mocked<WorkOrderService>;
  let pdfService: jest.Mocked<PdfService>;

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
            checkIn: jest.fn(),
            checkOut: jest.fn(),
            startTimer: jest.fn(),
            stopTimer: jest.fn(),
            getTimer: jest.fn(),
          },
        },
        {
          provide: PdfService,
          useValue: {
            generateWorkOrderPdf: jest.fn().mockResolvedValue(Buffer.from('<html></html>')),
          },
        },
      ],
    }).compile();

    controller = module.get<WorkOrderController>(WorkOrderController);
    service = module.get(WorkOrderService) as jest.Mocked<WorkOrderService>;
    pdfService = module.get(PdfService) as jest.Mocked<PdfService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should delegate to service with filters and return wrapped response', async () => {
      const expected = { workOrders: [mockWorkOrder], total: 1, page: 1, limit: 20, pages: 1 };
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(TENANT_ID, 'OPEN', 'veh-001', 'cust-001');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        status: 'OPEN',
        vehicleId: 'veh-001',
        customerId: 'cust-001',
        page: undefined,
        limit: undefined,
      });
      expect(result).toEqual({
        success: true,
        data: expected.workOrders,
        meta: { total: 1, page: 1, limit: 20, pages: 1 },
      });
    });

    it('should pass undefined filters when not provided', async () => {
      service.findAll.mockResolvedValue({ workOrders: [], total: 0, page: 1, limit: 20, pages: 0 });

      await controller.findAll(TENANT_ID);

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        status: undefined,
        vehicleId: undefined,
        customerId: undefined,
        page: undefined,
        limit: undefined,
      });
    });

    it('should parse page and limit query params', async () => {
      service.findAll.mockResolvedValue({
        workOrders: [],
        total: 50,
        page: 2,
        limit: 10,
        pages: 5,
      });

      const result = await controller.findAll(
        TENANT_ID,
        undefined,
        undefined,
        undefined,
        undefined,
        '2',
        '10',
      );

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        status: undefined,
        vehicleId: undefined,
        customerId: undefined,
        search: undefined,
        page: 2,
        limit: 10,
      });
      expect(result).toEqual({
        success: true,
        data: [],
        meta: { total: 50, page: 2, limit: 10, pages: 5 },
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

  describe('checkIn', () => {
    it('should delegate to service with tenantId, id, and dto', async () => {
      const checkedIn = { ...mockWorkOrder, status: 'CHECKED_IN' };
      service.checkIn.mockResolvedValue(checkedIn as never);
      const dto = { mileage: 50000, fuelLevel: 'HALF', notes: 'Minor scratches on door' };

      const result = await controller.checkIn(TENANT_ID, 'wo-001', dto as never);

      expect(service.checkIn).toHaveBeenCalledWith(TENANT_ID, 'wo-001', dto);
      expect(result).toEqual({ success: true, data: checkedIn });
    });
  });

  describe('checkOut', () => {
    it('should delegate to service with tenantId, id, and dto', async () => {
      const checkedOut = { ...mockWorkOrder, status: 'CHECKED_OUT' };
      service.checkOut.mockResolvedValue(checkedOut as never);
      const dto = { mileage: 50010, fuelLevel: 'FULL', notes: 'All repairs completed' };

      const result = await controller.checkOut(TENANT_ID, 'wo-001', dto as never);

      expect(service.checkOut).toHaveBeenCalledWith(TENANT_ID, 'wo-001', dto);
      expect(result).toEqual({ success: true, data: checkedOut });
    });
  });

  describe('startTimer', () => {
    it('should delegate to service with tenantId, id, and technicianId', async () => {
      const timerLog = {
        id: 'log-001',
        workOrderId: 'wo-001',
        technicianId: 'tech-001',
        startedAt: new Date(),
      };
      service.startTimer.mockResolvedValue(timerLog as never);

      const result = await controller.startTimer(TENANT_ID, 'wo-001', 'tech-001');

      expect(service.startTimer).toHaveBeenCalledWith(TENANT_ID, 'wo-001', 'tech-001');
      expect(result).toEqual({ success: true, data: timerLog });
    });
  });

  describe('stopTimer', () => {
    it('should delegate to service with tenantId, id, and technicianId', async () => {
      const timerLog = {
        id: 'log-001',
        workOrderId: 'wo-001',
        technicianId: 'tech-001',
        startedAt: new Date(),
        stoppedAt: new Date(),
      };
      service.stopTimer.mockResolvedValue(timerLog as never);

      const result = await controller.stopTimer(TENANT_ID, 'wo-001', 'tech-001');

      expect(service.stopTimer).toHaveBeenCalledWith(TENANT_ID, 'wo-001', 'tech-001');
      expect(result).toEqual({ success: true, data: timerLog });
    });
  });

  describe('getTimer', () => {
    it('should delegate to service with tenantId and id', async () => {
      const timerStatus = { running: true, elapsed: 3600, technicianId: 'tech-001' };
      service.getTimer.mockResolvedValue(timerStatus as never);

      const result = await controller.getTimer(TENANT_ID, 'wo-001');

      expect(service.getTimer).toHaveBeenCalledWith(TENANT_ID, 'wo-001');
      expect(result).toEqual({ success: true, data: timerStatus });
    });
  });

  describe('downloadPdf', () => {
    it('should generate PDF and send buffer as response', async () => {
      const buf = Buffer.from('<html>work order</html>');
      pdfService.generateWorkOrderPdf.mockResolvedValue(buf);

      const res = {
        set: jest.fn(),
        send: jest.fn(),
      } as unknown as import('express').Response;

      await controller.downloadPdf(TENANT_ID, 'wo-001', res);

      expect(pdfService.generateWorkOrderPdf).toHaveBeenCalledWith('wo-001', TENANT_ID);
      expect(res.set).toHaveBeenCalledWith({
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'inline; filename="ordine-lavoro-wo-001.html"',
      });
      expect(res.send).toHaveBeenCalledWith(buf);
    });
  });
});
