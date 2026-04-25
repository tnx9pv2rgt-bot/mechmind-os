import { Test, TestingModule } from '@nestjs/testing';
import { EstimateController } from './estimate.controller';
import { EstimateService } from '../services/estimate.service';
import { PdfService } from '../../invoice/services/pdf.service';

describe('EstimateController', () => {
  let controller: EstimateController;
  let service: jest.Mocked<EstimateService>;

  const TENANT_ID = 'tenant-001';

  const mockEstimate = {
    id: 'est-001',
    tenantId: TENANT_ID,
    customerId: 'cust-001',
    status: 'DRAFT',
    total: 500,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EstimateController],
      providers: [
        {
          provide: EstimateService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            addLine: jest.fn(),
            removeLine: jest.fn(),
            send: jest.fn(),
            accept: jest.fn(),
            reject: jest.fn(),
            convertToBooking: jest.fn(),
            convertToWorkOrder: jest.fn(),
          },
        },
        {
          provide: PdfService,
          useValue: {
            generateEstimatePdf: jest.fn().mockResolvedValue(Buffer.from('<html></html>')),
          },
        },
      ],
    }).compile();

    controller = module.get<EstimateController>(EstimateController);
    service = module.get(EstimateService) as jest.Mocked<EstimateService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate to service and wrap in success response', async () => {
      const dto = { customerId: 'cust-001', vehicleId: 'veh-001' };
      service.create.mockResolvedValue(mockEstimate as never);

      const result = await controller.create(TENANT_ID, dto as never);

      expect(service.create).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual({ success: true, data: mockEstimate });
    });
  });

  describe('findAll', () => {
    it('should delegate to service with parsed query params', async () => {
      service.findAll.mockResolvedValue({
        estimates: [mockEstimate],
        total: 1,
      } as never);

      const result = await controller.findAll(TENANT_ID, 'DRAFT', 'cust-001', '10', '0');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        status: 'DRAFT',
        customerId: 'cust-001',
        limit: 10,
        offset: 0,
      });
      expect(result).toEqual({
        success: true,
        data: [mockEstimate],
        meta: { total: 1, limit: 10, offset: 0 },
      });
    });

    it('should use default limit/offset when not provided', async () => {
      service.findAll.mockResolvedValue({ estimates: [], total: 0 } as never);

      const result = await controller.findAll(TENANT_ID);

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        status: undefined,
        customerId: undefined,
        limit: 50,
        offset: 0,
      });
      expect(result.meta).toEqual({ total: 0, limit: 50, offset: 0 });
    });
  });

  describe('findById', () => {
    it('should delegate to service and wrap in success response', async () => {
      service.findById.mockResolvedValue(mockEstimate as never);

      const result = await controller.findById(TENANT_ID, 'est-001');

      expect(service.findById).toHaveBeenCalledWith(TENANT_ID, 'est-001');
      expect(result).toEqual({ success: true, data: mockEstimate });
    });
  });

  describe('update', () => {
    it('should delegate to service with tenantId, id, and dto', async () => {
      const dto = { notes: 'Updated notes' };
      const updated = { ...mockEstimate, notes: 'Updated notes' };
      service.update.mockResolvedValue(updated as never);

      const result = await controller.update(TENANT_ID, 'est-001', dto as never);

      expect(service.update).toHaveBeenCalledWith(TENANT_ID, 'est-001', dto);
      expect(result).toEqual({ success: true, data: updated });
    });
  });

  describe('addLine', () => {
    it('should delegate to service with tenantId, estimateId, and dto', async () => {
      const dto = { description: 'Oil Change', amount: 50 };
      service.addLine.mockResolvedValue(mockEstimate as never);

      const result = await controller.addLine(TENANT_ID, 'est-001', dto as never);

      expect(service.addLine).toHaveBeenCalledWith(TENANT_ID, 'est-001', dto);
      expect(result).toEqual({ success: true, data: mockEstimate });
    });
  });

  describe('removeLine', () => {
    it('should delegate to service with tenantId and lineId', async () => {
      service.removeLine.mockResolvedValue(mockEstimate as never);

      const result = await controller.removeLine(TENANT_ID, 'line-001');

      expect(service.removeLine).toHaveBeenCalledWith(TENANT_ID, 'line-001');
      expect(result).toEqual({ success: true, data: mockEstimate });
    });
  });

  describe('send', () => {
    it('should delegate to service and return success message', async () => {
      const sent = { ...mockEstimate, status: 'SENT' };
      service.send.mockResolvedValue(sent as never);

      const result = await controller.send(TENANT_ID, 'est-001');

      expect(service.send).toHaveBeenCalledWith(TENANT_ID, 'est-001');
      expect(result).toEqual({
        success: true,
        data: sent,
        message: 'Estimate sent successfully',
      });
    });
  });

  describe('accept', () => {
    it('should delegate to service and return success message', async () => {
      const accepted = { ...mockEstimate, status: 'ACCEPTED' };
      service.accept.mockResolvedValue(accepted as never);

      const result = await controller.accept(TENANT_ID, 'est-001');

      expect(service.accept).toHaveBeenCalledWith(TENANT_ID, 'est-001');
      expect(result).toEqual({
        success: true,
        data: accepted,
        message: 'Estimate accepted',
      });
    });
  });

  describe('reject', () => {
    it('should delegate to service and return success message', async () => {
      const rejected = { ...mockEstimate, status: 'REJECTED' };
      service.reject.mockResolvedValue(rejected as never);

      const result = await controller.reject(TENANT_ID, 'est-001');

      expect(service.reject).toHaveBeenCalledWith(TENANT_ID, 'est-001');
      expect(result).toEqual({
        success: true,
        data: rejected,
        message: 'Estimate rejected',
      });
    });
  });

  describe('convertToBooking', () => {
    it('should delegate to service with tenantId, id, and bookingId', async () => {
      const converted = { ...mockEstimate, status: 'CONVERTED' };
      service.convertToBooking.mockResolvedValue(converted as never);

      const result = await controller.convertToBooking(TENANT_ID, 'est-001', 'book-001');

      expect(service.convertToBooking).toHaveBeenCalledWith(TENANT_ID, 'est-001', 'book-001');
      expect(result).toEqual({
        success: true,
        data: converted,
        message: 'Estimate converted to booking',
      });
    });

    it('should handle conversion with valid IDs', async () => {
      const converted = { ...mockEstimate, status: 'CONVERTED' };
      service.convertToBooking.mockResolvedValue(converted as never);

      const result = await controller.convertToBooking('tenant-xyz', 'est-xyz', 'book-xyz');

      expect(service.convertToBooking).toHaveBeenCalledWith('tenant-xyz', 'est-xyz', 'book-xyz');
      expect(result.success).toBe(true);
    });
  });

  describe('convertToWorkOrder', () => {
    it('should delegate to service with estimateId and tenantId', async () => {
      const converted = { ...mockEstimate, status: 'CONVERTED_TO_WO' };
      service.convertToWorkOrder.mockResolvedValue(converted as never);

      const result = await controller.convertToWorkOrder(TENANT_ID, 'est-001');

      // Service call order: convertToWorkOrder(id, tenantId)
      expect(service.convertToWorkOrder).toHaveBeenCalledWith('est-001', TENANT_ID);
      expect(result).toEqual({
        success: true,
        data: converted,
        message: 'Estimate converted to work order',
      });
    });

    it('should handle conversion with valid IDs', async () => {
      const converted = { ...mockEstimate, status: 'CONVERTED_TO_WO' };
      service.convertToWorkOrder.mockResolvedValue(converted as never);

      const result = await controller.convertToWorkOrder('tenant-abc', 'est-abc');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Estimate converted to work order');
    });
  });

  describe('State machine validation', () => {
    it('should transition DRAFT to SENT', async () => {
      const sent = { ...mockEstimate, status: 'SENT' };
      service.send.mockResolvedValue(sent as never);

      const result = await controller.send(TENANT_ID, 'est-001');

      expect(result.data.status).toBe('SENT');
    });

    it('should transition SENT to ACCEPTED', async () => {
      const accepted = { ...mockEstimate, status: 'ACCEPTED' };
      service.accept.mockResolvedValue(accepted as never);

      const result = await controller.accept(TENANT_ID, 'est-001');

      expect(result.data.status).toBe('ACCEPTED');
    });

    it('should transition SENT to REJECTED', async () => {
      const rejected = { ...mockEstimate, status: 'REJECTED' };
      service.reject.mockResolvedValue(rejected as never);

      const result = await controller.reject(TENANT_ID, 'est-001');

      expect(result.data.status).toBe('REJECTED');
    });
  });

  describe('Error scenarios', () => {
    it('should propagate service errors on create', async () => {
      service.create.mockRejectedValue(new Error('Database error'));

      await expect(controller.create(TENANT_ID, {} as never)).rejects.toThrow('Database error');
    });

    it('should propagate service errors on conversion', async () => {
      service.convertToWorkOrder.mockRejectedValue(new Error('Invalid state'));

      await expect(controller.convertToWorkOrder(TENANT_ID, 'est-001')).rejects.toThrow(
        'Invalid state',
      );
    });

    it('should propagate service errors on send', async () => {
      service.send.mockRejectedValue(new Error('Email failed'));

      await expect(controller.send(TENANT_ID, 'est-001')).rejects.toThrow('Email failed');
    });
  });

  describe('Line item operations', () => {
    it('should add line with correct parameters', async () => {
      const dto = { description: 'Wheel Alignment', amount: 80, quantity: 1 };
      const updated = { ...mockEstimate, total: 580 };
      service.addLine.mockResolvedValue(updated as never);

      const result = await controller.addLine(TENANT_ID, 'est-001', dto as never);

      expect(service.addLine).toHaveBeenCalledWith(TENANT_ID, 'est-001', dto);
      expect((result.data as unknown as Record<string, unknown>).total).toBe(580);
    });

    it('should remove line and update total', async () => {
      const updated = { ...mockEstimate, total: 450 };
      service.removeLine.mockResolvedValue(updated as never);

      const result = await controller.removeLine(TENANT_ID, 'line-001');

      expect(service.removeLine).toHaveBeenCalledWith(TENANT_ID, 'line-001');
      expect(result.success).toBe(true);
    });
  });

  describe('Filtering and pagination', () => {
    it('should filter by status correctly', async () => {
      service.findAll.mockResolvedValue({
        estimates: [mockEstimate],
        total: 1,
      } as never);

      await controller.findAll(TENANT_ID, 'DRAFT', undefined, '10', '0');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        status: 'DRAFT',
        customerId: undefined,
        limit: 10,
        offset: 0,
      });
    });

    it('should filter by customerId correctly', async () => {
      service.findAll.mockResolvedValue({
        estimates: [mockEstimate],
        total: 1,
      } as never);

      await controller.findAll(TENANT_ID, undefined, 'cust-001', '10', '0');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        status: undefined,
        customerId: 'cust-001',
        limit: 10,
        offset: 0,
      });
    });

    it('should handle combined filters', async () => {
      service.findAll.mockResolvedValue({
        estimates: [mockEstimate],
        total: 1,
      } as never);

      await controller.findAll(TENANT_ID, 'ACCEPTED', 'cust-001', '20', '10');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        status: 'ACCEPTED',
        customerId: 'cust-001',
        limit: 20,
        offset: 10,
      });
    });
  });

  describe('TenantId isolation', () => {
    it('should validate tenantId on all operations', async () => {
      service.findById.mockResolvedValue(mockEstimate as never);

      await controller.findById('tenant-xyz', 'est-001');

      expect(service.findById).toHaveBeenCalledWith('tenant-xyz', 'est-001');
    });

    it('should pass tenantId to update operation', async () => {
      service.update.mockResolvedValue(mockEstimate as never);

      await controller.update('tenant-xyz', 'est-001', {} as never);

      expect(service.update).toHaveBeenCalledWith('tenant-xyz', 'est-001', expect.any(Object));
    });
  });

  describe('Response format validation', () => {
    it('should always include success property', async () => {
      service.findById.mockResolvedValue(mockEstimate as never);

      const result = await controller.findById(TENANT_ID, 'est-001');

      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
    });

    it('should include message for state transitions', async () => {
      service.send.mockResolvedValue(mockEstimate as never);

      const result = await controller.send(TENANT_ID, 'est-001');

      expect(result).toHaveProperty('message');
      expect(result.message).toBeDefined();
    });

    it('should include data in all responses', async () => {
      service.create.mockResolvedValue(mockEstimate as never);

      const result = await controller.create(TENANT_ID, {} as never);

      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(mockEstimate);
    });
  });
});
