import { Test, TestingModule } from '@nestjs/testing';
import { VehicleController } from './vehicle.controller';
import { VehicleService } from '../services/vehicle.service';
import { VinDecoderService } from '../services/vin-decoder.service';

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
        {
          provide: VinDecoderService,
          useValue: { decode: jest.fn() },
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

    it('should parse limit when provided and use default offset', async () => {
      service.findAll.mockResolvedValue({ vehicles: [mockVehicle], total: 1 } as never);

      const result = await controller.getVehicles(TENANT_ID, '30');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        limit: 30,
        offset: undefined,
        search: undefined,
        status: undefined,
      });
      expect(result.meta.limit).toBe(30);
      expect(result.meta.offset).toBe(0);
    });

    it('should parse offset when provided and use default limit', async () => {
      service.findAll.mockResolvedValue({ vehicles: [mockVehicle], total: 1 } as never);

      const result = await controller.getVehicles(TENANT_ID, undefined, '10');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        limit: undefined,
        offset: 10,
        search: undefined,
        status: undefined,
      });
      expect(result.meta.limit).toBe(50);
      expect(result.meta.offset).toBe(10);
    });

    it('should apply search filter when provided', async () => {
      service.findAll.mockResolvedValue({ vehicles: [mockVehicle], total: 1 } as never);

      await controller.getVehicles(TENANT_ID, undefined, undefined, 'Corolla');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        limit: undefined,
        offset: undefined,
        search: 'Corolla',
        status: undefined,
      });
    });

    it('should apply status filter when provided', async () => {
      service.findAll.mockResolvedValue({ vehicles: [mockVehicle], total: 1 } as never);

      await controller.getVehicles(TENANT_ID, undefined, undefined, undefined, 'INACTIVE');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        limit: undefined,
        offset: undefined,
        search: undefined,
        status: 'INACTIVE',
      });
    });
  });

  describe('getExpiringVehicles', () => {
    it('should call findExpiring with default days when not provided', async () => {
      service.findExpiring = jest.fn().mockResolvedValue({
        vehicles: [mockVehicle],
        summary: { totalExpiring: 1, byType: {} },
      });

      const result = await controller.getExpiringVehicles(TENANT_ID);

      expect(service.findExpiring).toHaveBeenCalledWith(TENANT_ID, 60);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockVehicle]);
    });

    it('should call findExpiring with provided days parameter', async () => {
      service.findExpiring = jest.fn().mockResolvedValue({
        vehicles: [mockVehicle],
        summary: { totalExpiring: 1, byType: { insurance: 1 } },
      });

      const result = (await controller.getExpiringVehicles(TENANT_ID, '30')) as {
        success: boolean;
        data: unknown;
        summary: unknown;
      };

      expect(service.findExpiring).toHaveBeenCalledWith(TENANT_ID, 30);
      expect(result.summary).toBeDefined();
    });

    it('should return empty list when no vehicles are expiring', async () => {
      service.findExpiring = jest.fn().mockResolvedValue({
        vehicles: [],
        summary: { totalExpiring: 0, byType: {} },
      });

      const result = (await controller.getExpiringVehicles(TENANT_ID, '90')) as {
        success: boolean;
        data: unknown;
        summary: unknown;
      };

      expect(result.data).toEqual([]);
      expect(result.summary).toBeDefined();
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

  describe('decodeVin', () => {
    it('should call vinDecoderService.decode and return result wrapped in success response', async () => {
      const vinDecoderService = controller['vinDecoderService'];
      const decodedVin = {
        vin: '1HGBH41JXMN109186',
        make: 'Honda',
        model: 'Civic',
        year: 2021,
        fuelType: 'Gasoline',
        engineDisplacement: '1.5',
        power: '174',
        transmissionType: 'Automatic',
        driveType: 'FWD',
        vehicleType: 'PASSENGER CAR',
        bodyClass: 'Sedan',
      };

      (vinDecoderService.decode as jest.Mock).mockResolvedValueOnce(decodedVin);

      const result = await controller.decodeVin('1HGBH41JXMN109186');

      expect(vinDecoderService.decode).toHaveBeenCalledWith('1HGBH41JXMN109186');
      expect(result).toEqual({ success: true, data: decodedVin });
    });
  });
});
