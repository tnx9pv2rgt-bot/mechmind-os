import { Test, TestingModule } from '@nestjs/testing';
import { EstimateController } from './estimate.controller';
import { EstimateService } from '../services/estimate.service';

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
  });
});
