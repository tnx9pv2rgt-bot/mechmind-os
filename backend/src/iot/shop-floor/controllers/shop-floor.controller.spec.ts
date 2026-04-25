import { Test, TestingModule } from '@nestjs/testing';
import { ShopFloorController } from './shop-floor.controller';
import { ShopFloorService } from '../services/shop-floor.service';

describe('ShopFloorController', () => {
  let controller: ShopFloorController;
  let service: jest.Mocked<ShopFloorService>;

  const TENANT_ID = 'tenant-001';

  const mockBay = {
    id: 'bay-001',
    name: 'Bay 1',
    status: 'available',
    tenantId: TENANT_ID,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShopFloorController],
      providers: [
        {
          provide: ShopFloorService,
          useValue: {
            initializeShopFloor: jest.fn(),
            getAllBays: jest.fn(),
            getBay: jest.fn(),
            addBaySensor: jest.fn(),
            processSensorReading: jest.fn(),
            assignVehicleToBay: jest.fn(),
            releaseBay: jest.fn(),
            updateTechnicianLocation: jest.fn(),
            getActiveTechnicians: jest.fn(),
            getWorkOrderProgress: jest.fn(),
            updateJobStatus: jest.fn(),
            getShopFloorAnalytics: jest.fn(),
            getRecentEvents: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ShopFloorController>(ShopFloorController);
    service = module.get(ShopFloorService) as jest.Mocked<ShopFloorService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('initializeShopFloor', () => {
    it('should delegate to service with tenantId and dto', async () => {
      const dto = { bayCount: 4, layout: 'linear' } as never;
      service.initializeShopFloor.mockResolvedValue([mockBay] as never);

      const result = await controller.initializeShopFloor(TENANT_ID, dto);

      expect(service.initializeShopFloor).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual([mockBay]);
    });

    it('should handle multiple bays', async () => {
      const dto = { bayCount: 8, layout: 'grid' } as never;
      const bays = Array(8)
        .fill(null)
        .map((_, i) => ({ ...mockBay, id: `bay-${i}` }));
      service.initializeShopFloor.mockResolvedValue(bays as never);

      const result = await controller.initializeShopFloor(TENANT_ID, dto);

      expect(result).toHaveLength(8);
    });

    it('should propagate service errors', async () => {
      const dto = { bayCount: 4, layout: 'linear' } as never;
      service.initializeShopFloor.mockRejectedValue(new Error('Initialization failed'));

      await expect(controller.initializeShopFloor(TENANT_ID, dto)).rejects.toThrow(
        'Initialization failed',
      );
    });
  });

  describe('getAllBays', () => {
    it('should delegate to service with tenantId', async () => {
      service.getAllBays.mockResolvedValue([mockBay] as never);

      const result = await controller.getAllBays(TENANT_ID);

      expect(service.getAllBays).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual([mockBay]);
    });
  });

  describe('getBay', () => {
    it('should delegate to service with bayId', async () => {
      service.getBay.mockResolvedValue(mockBay as never);

      const result = await controller.getBay(TENANT_ID, 'bay-001');

      expect(service.getBay).toHaveBeenCalledWith(TENANT_ID, 'bay-001');
      expect(result).toEqual(mockBay);
    });
  });

  describe('addBaySensor', () => {
    it('should delegate to service with parsed sensor data', async () => {
      const dto = {
        type: 'temperature',
        name: 'Temp Sensor 1',
        isActive: 'true',
        batteryLevel: 95,
        config: { threshold: 40 },
      } as never;
      const sensor = { id: 'sensor-001', type: 'temperature', name: 'Temp Sensor 1' };
      service.addBaySensor.mockResolvedValue(sensor as never);

      const result = await controller.addBaySensor(TENANT_ID, 'bay-001', dto);

      expect(service.addBaySensor).toHaveBeenCalledWith(TENANT_ID, 'bay-001', {
        type: 'temperature',
        name: 'Temp Sensor 1',
        isActive: true,
        batteryLevel: 95,
        config: { threshold: 40 },
      });
      expect(result).toEqual(sensor);
    });

    it('should handle isActive false string', async () => {
      const dto = {
        type: 'humidity',
        name: 'Humidity Sensor',
        isActive: 'false',
        batteryLevel: 50,
        config: {},
      } as never;
      const sensor = { id: 'sensor-002', type: 'humidity', name: 'Humidity Sensor' };
      service.addBaySensor.mockResolvedValue(sensor as never);

      const result = await controller.addBaySensor(TENANT_ID, 'bay-001', dto);

      expect(service.addBaySensor).toHaveBeenCalledWith(TENANT_ID, 'bay-001', {
        type: 'humidity',
        name: 'Humidity Sensor',
        isActive: false,
        batteryLevel: 50,
        config: {},
      });
      expect(result).toEqual(sensor);
    });

    it('should handle missing config', async () => {
      const dto = {
        type: 'pressure',
        name: 'Pressure Sensor',
        isActive: 'true',
        batteryLevel: 80,
      } as never;
      const sensor = { id: 'sensor-003', type: 'pressure' };
      service.addBaySensor.mockResolvedValue(sensor as never);

      await controller.addBaySensor(TENANT_ID, 'bay-001', dto);

      expect(service.addBaySensor).toHaveBeenCalledWith(TENANT_ID, 'bay-001', {
        type: 'pressure',
        name: 'Pressure Sensor',
        isActive: true,
        batteryLevel: 80,
        config: {},
      });
    });

    it('should propagate service errors', async () => {
      const dto = {
        type: 'temperature',
        name: 'Bad Sensor',
        isActive: 'true',
        batteryLevel: 0,
      } as never;
      service.addBaySensor.mockRejectedValue(new Error('Sensor add failed'));

      await expect(controller.addBaySensor(TENANT_ID, 'bay-001', dto)).rejects.toThrow(
        'Sensor add failed',
      );
    });
  });

  describe('processSensorReading', () => {
    it('should delegate to service with reading dto', async () => {
      const dto = { sensorId: 'sensor-001', value: 38.5, unit: 'celsius' } as never;
      service.processSensorReading.mockResolvedValue(undefined);

      await controller.processSensorReading(TENANT_ID, dto);

      expect(service.processSensorReading).toHaveBeenCalledWith(TENANT_ID, dto);
    });
  });

  describe('assignVehicleToBay', () => {
    it('should delegate to service with bay and vehicle data', async () => {
      const dto = {
        vehicleId: 'vehicle-001',
        workOrderId: 'wo-001',
        technicianIds: ['tech-001'],
      } as never;
      const assigned = { ...mockBay, status: 'occupied', vehicleId: 'vehicle-001' };
      service.assignVehicleToBay.mockResolvedValue(assigned as never);

      const result = await controller.assignVehicleToBay(TENANT_ID, 'bay-001', dto);

      expect(service.assignVehicleToBay).toHaveBeenCalledWith(
        TENANT_ID,
        'bay-001',
        'vehicle-001',
        'wo-001',
        ['tech-001'],
      );
      expect(result).toEqual(assigned);
    });
  });

  describe('releaseBay', () => {
    it('should delegate to service with bayId', async () => {
      service.releaseBay.mockResolvedValue(mockBay as never);

      const result = await controller.releaseBay(TENANT_ID, 'bay-001');

      expect(service.releaseBay).toHaveBeenCalledWith(TENANT_ID, 'bay-001');
      expect(result).toEqual(mockBay);
    });
  });

  describe('updateTechnicianLocation', () => {
    it('should delegate to service with technicianId and location data', async () => {
      const dto = { x: 10, y: 20, floor: 1, beaconId: 'beacon-001' } as never;
      const location = { technicianId: 'tech-001', x: 10, y: 20, floor: 1 };
      service.updateTechnicianLocation.mockResolvedValue(location as never);

      const result = await controller.updateTechnicianLocation(TENANT_ID, 'tech-001', dto);

      expect(service.updateTechnicianLocation).toHaveBeenCalledWith(TENANT_ID, 'tech-001', {
        x: 10,
        y: 20,
        floor: 1,
        beaconId: 'beacon-001',
      });
      expect(result).toEqual(location);
    });
  });

  describe('getActiveTechnicians', () => {
    it('should delegate to service with tenantId', async () => {
      const technicians = [{ technicianId: 'tech-001', x: 10, y: 20 }];
      service.getActiveTechnicians.mockResolvedValue(technicians as never);

      const result = await controller.getActiveTechnicians(TENANT_ID);

      expect(service.getActiveTechnicians).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual(technicians);
    });
  });

  describe('getWorkOrderProgress', () => {
    it('should delegate to service with workOrderId', async () => {
      const progress = { workOrderId: 'wo-001', percentComplete: 60 };
      service.getWorkOrderProgress.mockResolvedValue(progress as never);

      const result = await controller.getWorkOrderProgress(TENANT_ID, 'wo-001');

      expect(service.getWorkOrderProgress).toHaveBeenCalledWith(TENANT_ID, 'wo-001');
      expect(result).toEqual(progress);
    });
  });

  describe('updateJobStatus', () => {
    it('should delegate to service with workOrderId and status', async () => {
      const dto = { status: 'in_progress' } as never;
      const updated = { workOrderId: 'wo-001', status: 'in_progress' };
      service.updateJobStatus.mockResolvedValue(updated as never);

      const result = await controller.updateJobStatus(TENANT_ID, 'wo-001', dto);

      expect(service.updateJobStatus).toHaveBeenCalledWith(TENANT_ID, 'wo-001', 'in_progress');
      expect(result).toEqual(updated);
    });
  });

  describe('getShopFloorAnalytics', () => {
    it('should delegate to service with tenantId and parsed dates', async () => {
      const analytics = { bayUtilization: 0.75, avgServiceTime: 120 };
      service.getShopFloorAnalytics.mockResolvedValue(analytics as never);
      const query = { from: '2026-01-01', to: '2026-03-16' } as never;

      const result = await controller.getShopFloorAnalytics(TENANT_ID, query);

      expect(service.getShopFloorAnalytics).toHaveBeenCalledWith(
        TENANT_ID,
        new Date('2026-01-01'),
        new Date('2026-03-16'),
      );
      expect(result).toEqual(analytics);
    });
  });

  describe('getRecentEvents', () => {
    it('should delegate to service with tenantId and default limit', async () => {
      const events = [{ id: 'evt-001', type: 'bay_assigned' }];
      service.getRecentEvents.mockResolvedValue(events as never);

      const result = await controller.getRecentEvents(TENANT_ID);

      expect(service.getRecentEvents).toHaveBeenCalledWith(TENANT_ID, 50);
      expect(result).toEqual(events);
    });

    it('should pass custom limit when provided', async () => {
      service.getRecentEvents.mockResolvedValue([] as never);

      await controller.getRecentEvents(TENANT_ID, 10);

      expect(service.getRecentEvents).toHaveBeenCalledWith(TENANT_ID, 10);
    });

    it('should use default 50 when limit is undefined', async () => {
      service.getRecentEvents.mockResolvedValue([] as never);

      await controller.getRecentEvents(TENANT_ID, undefined);

      expect(service.getRecentEvents).toHaveBeenCalledWith(TENANT_ID, 50);
    });

    it('should propagate service errors', async () => {
      service.getRecentEvents.mockRejectedValue(new Error('Event fetch failed'));

      await expect(controller.getRecentEvents(TENANT_ID)).rejects.toThrow('Event fetch failed');
    });
  });
});
