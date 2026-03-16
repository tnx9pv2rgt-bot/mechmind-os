import { Test, TestingModule } from '@nestjs/testing';
import { VehicleController } from './vehicle.controller';
import { VehicleService } from '../services/vehicle.service';

describe('VehicleController', () => {
  let controller: VehicleController;
  let service: jest.Mocked<VehicleService>;

  const TENANT_ID = 'tenant-001';

  const mockVehicle = {
    id: 'veh-001',
    tenantId: TENANT_ID,
    customerId: 'cust-001',
    make: 'Toyota',
    model: 'Corolla',
    year: 2024,
    vin: 'JTDBR32E660012345',
    licensePlate: 'AB123CD',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VehicleController],
      providers: [
        {
          provide: VehicleService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<VehicleController>(VehicleController);
    service = module.get(VehicleService) as jest.Mocked<VehicleService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getVehicles', () => {
    it('should delegate to service and return wrapped response with meta', async () => {
      const expected = { vehicles: [mockVehicle], total: 1 };
      service.findAll.mockResolvedValue(expected as never);

      const result = await controller.getVehicles(TENANT_ID, '20', '0', 'Toyota', 'ACTIVE');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        limit: 20,
        offset: 0,
        search: 'Toyota',
        status: 'ACTIVE',
      });
      expect(result).toEqual({
        success: true,
        data: [mockVehicle],
        meta: { total: 1, limit: 20, offset: 0 },
      });
    });

    it('should use default limit and offset when not provided', async () => {
      service.findAll.mockResolvedValue({ vehicles: [], total: 0 } as never);

      const result = await controller.getVehicles(TENANT_ID);

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        limit: undefined,
        offset: undefined,
        search: undefined,
        status: undefined,
      });
      expect(result).toEqual({
        success: true,
        data: [],
        meta: { total: 0, limit: 50, offset: 0 },
      });
    });
  });

  describe('getVehicle', () => {
    it('should delegate to service with tenantId and vehicleId', async () => {
      service.findById.mockResolvedValue(mockVehicle as never);

      const result = await controller.getVehicle(TENANT_ID, 'veh-001');

      expect(service.findById).toHaveBeenCalledWith(TENANT_ID, 'veh-001');
      expect(result).toEqual({ success: true, data: mockVehicle });
    });
  });

  describe('createVehicle', () => {
    it('should delegate to service with tenantId, customerId, and dto', async () => {
      service.create.mockResolvedValue(mockVehicle as never);
      const body = {
        customerId: 'cust-001',
        make: 'Toyota',
        model: 'Corolla',
        year: 2024,
        vin: 'JTDBR32E660012345',
        licensePlate: 'AB123CD',
      };

      const result = await controller.createVehicle(TENANT_ID, body as never);

      expect(service.create).toHaveBeenCalledWith(
        TENANT_ID,
        'cust-001',
        expect.objectContaining({ make: 'Toyota', model: 'Corolla' }),
      );
      expect(result).toEqual({ success: true, data: mockVehicle });
    });
  });

  describe('updateVehicle', () => {
    it('should delegate to service with tenantId, vehicleId, and dto', async () => {
      const updated = { ...mockVehicle, model: 'Camry' };
      service.update.mockResolvedValue(updated as never);
      const dto = { model: 'Camry' };

      const result = await controller.updateVehicle(TENANT_ID, 'veh-001', dto as never);

      expect(service.update).toHaveBeenCalledWith(TENANT_ID, 'veh-001', dto);
      expect(result).toEqual({ success: true, data: updated });
    });
  });

  describe('deleteVehicle', () => {
    it('should delegate to service and return success message', async () => {
      service.delete.mockResolvedValue(undefined as never);

      const result = await controller.deleteVehicle(TENANT_ID, 'veh-001');

      expect(service.delete).toHaveBeenCalledWith(TENANT_ID, 'veh-001');
      expect(result).toEqual({ success: true, message: 'Vehicle deleted successfully' });
    });
  });
});
