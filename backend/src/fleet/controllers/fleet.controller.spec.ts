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
      const dto = {
        name: 'Main Fleet',
        companyName: 'Acme',
        description: 'Test description',
        contactName: 'John',
        contactEmail: 'john@acme.com',
        contactPhone: '+1234567890',
      };
      service.create.mockResolvedValue(mockFleet as never);

      const result = await controller.create(TENANT_ID, dto as never);

      expect(service.create).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual(mockFleet);
      expect(result.id).toBe('fleet-001');
    });

    it('should pass minimal DTO to service', async () => {
      const dto = { name: 'New Fleet', companyName: 'Corp' };
      const created = { id: 'new-fleet', tenantId: TENANT_ID, ...dto } as never;
      service.create.mockResolvedValue(created);

      const result = await controller.create(TENANT_ID, dto as never);
      expect(result.id).toBe('new-fleet');
    });
  });

  describe('findAll', () => {
    it('should delegate to service with tenantId and default pagination', async () => {
      const paginated = { data: [mockFleet], total: 1, page: 1, limit: 20, pages: 1 };
      service.findAll.mockResolvedValue(paginated as never);

      const result = await controller.findAll(TENANT_ID);

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, undefined, undefined);
      expect(result.data).toEqual([mockFleet]);
      expect(result.total).toBe(1);
    });

    it('should parse page and limit string parameters to integers', async () => {
      const paginated = { data: [mockFleet], total: 50, page: 3, limit: 10, pages: 5 };
      service.findAll.mockResolvedValueOnce(paginated as never);

      const result = await controller.findAll(TENANT_ID, '3', '10');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, 3, 10);
      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.pages).toBe(5);
    });

    it('should handle undefined page parameter', async () => {
      const paginated = { data: [], total: 0, page: 1, limit: 20, pages: 1 };
      service.findAll.mockResolvedValue(paginated as never);

      await controller.findAll(TENANT_ID, undefined, undefined);
      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, undefined, undefined);
    });

    it('should handle single page parameter without limit', async () => {
      const paginated = { data: [mockFleet], total: 30, page: 2, limit: 20, pages: 2 };
      service.findAll.mockResolvedValue(paginated as never);

      await controller.findAll(TENANT_ID, '2', undefined);
      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, 2, undefined);
    });

    it('should handle limit without page', async () => {
      const paginated = { data: [mockFleet], total: 100, page: 1, limit: 50, pages: 2 };
      service.findAll.mockResolvedValue(paginated as never);

      await controller.findAll(TENANT_ID, undefined, '50');
      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, undefined, 50);
    });

    it('should parse page as base 10 integer', async () => {
      const paginated = { data: [], total: 0, page: 1, limit: 20, pages: 0 };
      service.findAll.mockResolvedValue(paginated as never);

      await controller.findAll(TENANT_ID, '01', undefined);
      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, 1, undefined);
    });

    it('should parse limit as base 10 integer', async () => {
      const paginated = { data: [], total: 0, page: 1, limit: 25, pages: 0 };
      service.findAll.mockResolvedValue(paginated as never);

      await controller.findAll(TENANT_ID, undefined, '25');
      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, undefined, 25);
    });
  });

  describe('findById', () => {
    it('should delegate to service with tenantId and id', async () => {
      service.findById.mockResolvedValue(mockFleet as never);

      const result = await controller.findById(TENANT_ID, 'fleet-001');

      expect(service.findById).toHaveBeenCalledWith(TENANT_ID, 'fleet-001');
      expect(result).toEqual(mockFleet);
      expect(result.id).toBe('fleet-001');
    });

    it('should pass correct parameters to service', async () => {
      const fleet = { ...mockFleet, name: 'Different Fleet' } as never;
      service.findById.mockResolvedValue(fleet);

      const result = await controller.findById(TENANT_ID, 'fleet-xyz');
      expect(service.findById).toHaveBeenCalledWith(TENANT_ID, 'fleet-xyz');
      expect(result.name).toBe('Different Fleet');
    });
  });

  describe('update', () => {
    it('should delegate to service with tenantId, id, and dto', async () => {
      const dto = { name: 'Updated Fleet', description: 'New description' };
      const updated = { ...mockFleet, name: 'Updated Fleet', description: 'New description' };
      service.update.mockResolvedValue(updated as never);

      const result = await controller.update(TENANT_ID, 'fleet-001', dto as never);

      expect(service.update).toHaveBeenCalledWith(TENANT_ID, 'fleet-001', dto);
      expect(result).toEqual(updated);
      expect(result.name).toBe('Updated Fleet');
    });

    it('should handle partial update dto', async () => {
      const dto = { contactName: 'Jane Doe' };
      const updated = { ...mockFleet, contactName: 'Jane Doe' } as never;
      service.update.mockResolvedValue(updated);

      const result = await controller.update(TENANT_ID, 'fleet-001', dto as never);
      expect(service.update).toHaveBeenCalledWith(TENANT_ID, 'fleet-001', dto);
      expect(result.contactName).toBe('Jane Doe');
    });
  });

  describe('delete', () => {
    it('should delegate to service with tenantId and id', async () => {
      const deactivated = { ...mockFleet, isActive: false };
      service.delete.mockResolvedValue(deactivated as never);

      const result = await controller.delete(TENANT_ID, 'fleet-001');

      expect(service.delete).toHaveBeenCalledWith(TENANT_ID, 'fleet-001');
      expect(result).toEqual(deactivated);
      expect(result.isActive).toBe(false);
    });

    it('should return deactivated fleet with isActive=false', async () => {
      const deactivated = { ...mockFleet, isActive: false } as never;
      service.delete.mockResolvedValue(deactivated);

      const result = await controller.delete(TENANT_ID, 'fleet-xyz');
      expect(result.isActive).toBe(false);
    });
  });

  describe('addVehicle', () => {
    it('should delegate to service with tenantId, fleetId, and vehicleId from dto', async () => {
      const dto = { vehicleId: 'veh-001' };
      const fleetVehicle = { id: 'fv-001', fleetId: 'fleet-001', vehicleId: 'veh-001' } as never;
      service.addVehicle.mockResolvedValue(fleetVehicle);

      const result = await controller.addVehicle(TENANT_ID, 'fleet-001', dto as never);

      expect(service.addVehicle).toHaveBeenCalledWith(TENANT_ID, 'fleet-001', 'veh-001');
      expect(result).toEqual(fleetVehicle);
      expect(result.id).toBe('fv-001');
    });

    it('should extract vehicleId from DTO', async () => {
      const dto = { vehicleId: 'vehicle-xyz' };
      const fleetVehicle = { id: 'fv-xyz', fleetId: 'fleet-001', vehicleId: 'vehicle-xyz' } as never;
      service.addVehicle.mockResolvedValue(fleetVehicle);

      await controller.addVehicle(TENANT_ID, 'fleet-001', dto as never);
      expect(service.addVehicle).toHaveBeenCalledWith(TENANT_ID, 'fleet-001', 'vehicle-xyz');
    });
  });

  describe('removeVehicle', () => {
    it('should delegate to service with tenantId, fleetId, and vehicleId', async () => {
      const removed = { id: 'fv-001', fleetId: 'fleet-001', vehicleId: 'veh-001', removedAt: new Date() } as never;
      service.removeVehicle.mockResolvedValue(removed);

      const result = await controller.removeVehicle(TENANT_ID, 'fleet-001', 'veh-001');

      expect(service.removeVehicle).toHaveBeenCalledWith(TENANT_ID, 'fleet-001', 'veh-001');
      expect(result).toEqual(removed);
      expect(result.removedAt).toBeDefined();
    });

    it('should pass correct parameters to service', async () => {
      const removed = { id: 'fv-xyz', fleetId: 'fleet-xyz', vehicleId: 'veh-xyz', removedAt: new Date() } as never;
      service.removeVehicle.mockResolvedValue(removed);

      await controller.removeVehicle(TENANT_ID, 'fleet-xyz', 'veh-xyz');
      expect(service.removeVehicle).toHaveBeenCalledWith(TENANT_ID, 'fleet-xyz', 'veh-xyz');
    });
  });
});
