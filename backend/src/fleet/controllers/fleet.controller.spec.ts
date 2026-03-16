import { Test, TestingModule } from '@nestjs/testing';
import { FleetController } from './fleet.controller';
import { FleetService } from '../services/fleet.service';

describe('FleetController', () => {
  let controller: FleetController;
  let service: jest.Mocked<FleetService>;

  const TENANT_ID = 'tenant-001';

  const mockFleet = {
    id: 'fleet-001',
    tenantId: TENANT_ID,
    name: 'Main Fleet',
    isActive: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FleetController],
      providers: [
        {
          provide: FleetService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            addVehicle: jest.fn(),
            removeVehicle: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<FleetController>(FleetController);
    service = module.get(FleetService) as jest.Mocked<FleetService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate to service with tenantId and dto', async () => {
      const dto = { name: 'Main Fleet' };
      service.create.mockResolvedValue(mockFleet as never);

      const result = await controller.create(TENANT_ID, dto as never);

      expect(service.create).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should delegate to service with tenantId', async () => {
      service.findAll.mockResolvedValue([mockFleet] as never);

      const result = await controller.findAll(TENANT_ID);

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toBeDefined();
    });
  });

  describe('findById', () => {
    it('should delegate to service with tenantId and id', async () => {
      service.findById.mockResolvedValue(mockFleet as never);

      const result = await controller.findById(TENANT_ID, 'fleet-001');

      expect(service.findById).toHaveBeenCalledWith(TENANT_ID, 'fleet-001');
      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    it('should delegate to service with tenantId, id, and dto', async () => {
      const dto = { name: 'Updated Fleet' };
      const updated = { ...mockFleet, name: 'Updated Fleet' };
      service.update.mockResolvedValue(updated as never);

      const result = await controller.update(TENANT_ID, 'fleet-001', dto as never);

      expect(service.update).toHaveBeenCalledWith(TENANT_ID, 'fleet-001', dto);
      expect(result).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delegate to service with tenantId and id', async () => {
      const deactivated = { ...mockFleet, isActive: false };
      service.delete.mockResolvedValue(deactivated as never);

      const result = await controller.delete(TENANT_ID, 'fleet-001');

      expect(service.delete).toHaveBeenCalledWith(TENANT_ID, 'fleet-001');
      expect(result).toBeDefined();
    });
  });

  describe('addVehicle', () => {
    it('should delegate to service with tenantId, fleetId, and vehicleId', async () => {
      const dto = { vehicleId: 'veh-001' };
      service.addVehicle.mockResolvedValue({ id: 'fv-001' } as never);

      const result = await controller.addVehicle(TENANT_ID, 'fleet-001', dto as never);

      expect(service.addVehicle).toHaveBeenCalledWith(TENANT_ID, 'fleet-001', 'veh-001');
      expect(result).toBeDefined();
    });
  });

  describe('removeVehicle', () => {
    it('should delegate to service with tenantId, fleetId, and vehicleId', async () => {
      service.removeVehicle.mockResolvedValue({ removed: true } as never);

      const result = await controller.removeVehicle(TENANT_ID, 'fleet-001', 'veh-001');

      expect(service.removeVehicle).toHaveBeenCalledWith(TENANT_ID, 'fleet-001', 'veh-001');
      expect(result).toBeDefined();
    });
  });
});
