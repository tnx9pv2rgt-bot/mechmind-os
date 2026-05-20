import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';
import { PrismaService } from '../../../common/services/prisma.service';
import { NotificationsService } from '../../../notifications/services/notifications.service';
import { ShopFloorService } from './shop-floor.service';
import {
  BayStatus,
  SensorType,
  JobStatus,
  SensorReading,
} from '../interfaces/shop-floor.interface';
import { InitializeShopFloorDto } from '../dto/shop-floor.dto';

describe('ShopFloorService', () => {
  let service: ShopFloorService;
  let prisma: PrismaService;
  let redis: Record<string, jest.Mock>;

  const mockTenantId = 'tenant-uuid-1';
  const mockBayId = 'bay-1';
  const mockVehicleId = 'vehicle-uuid-1';
  const mockWorkOrderId = 'wo-uuid-1';
  const mockTechnicianId = 'tech-uuid-1';

  beforeEach(async () => {
    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      publish: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopFloorService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: NotificationsService,
          useValue: {},
        },
        {
          provide: getRedisConnectionToken('default'),
          useValue: redis,
        },
      ],
    }).compile();

    service = module.get<ShopFloorService>(ShopFloorService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============== initializeShopFloor ==============

  describe('initializeShopFloor', () => {
    const config: InitializeShopFloorDto = {
      name: 'Main Floor',
      bays: [
        {
          name: 'Bay A',
          type: 'LIFT',
          location: { x: 0, y: 0, floor: 1 },
          capabilities: ['oil-change', 'brake-service'],
          maxVehicleWeight: 5000,
        },
        {
          name: 'Bay B',
          type: 'PIT',
          location: { x: 5, y: 0, floor: 1 },
          capabilities: ['inspection'],
          maxVehicleWeight: 3000,
        },
      ],
    };

    it('should return mock bays matching config count', async () => {
      const result = await service.initializeShopFloor(mockTenantId, config);

      expect(result).toHaveLength(2);
    });

    it('should assign sequential IDs to bays', async () => {
      const result = await service.initializeShopFloor(mockTenantId, config);

      expect(result[0].id).toBe('bay-0');
      expect(result[1].id).toBe('bay-1');
    });

    it('should set all bays to AVAILABLE status', async () => {
      const result = await service.initializeShopFloor(mockTenantId, config);

      for (const bay of result) {
        expect(bay.status).toBe(BayStatus.AVAILABLE);
      }
    });

    it('should preserve bay config properties', async () => {
      const result = await service.initializeShopFloor(mockTenantId, config);

      expect(result[0].name).toBe('Bay A');
      expect(result[0].type).toBe('LIFT');
      expect(result[1].name).toBe('Bay B');
      expect(result[1].type).toBe('PIT');
    });

    it('should return empty sensors for each bay', async () => {
      const result = await service.initializeShopFloor(mockTenantId, config);

      for (const bay of result) {
        expect(bay.sensors).toEqual([]);
      }
    });

    it('should handle empty bays array', async () => {
      const emptyConfig: InitializeShopFloorDto = {
        name: 'Empty Floor',
        bays: [],
      };

      const result = await service.initializeShopFloor(mockTenantId, emptyConfig);

      expect(result).toHaveLength(0);
    });
  });

  // ============== addBaySensor ==============

  describe('addBaySensor', () => {
    it('should return a sensor with generated ID', async () => {
      const sensor = {
        type: SensorType.ULTRASONIC,
        name: 'Distance Sensor',
        isActive: true,
        batteryLevel: 85,
        config: { threshold: 50 },
      };

      const result = await service.addBaySensor(mockTenantId, mockBayId, sensor);

      expect(result.id).toMatch(/^sensor-/);
      expect(result.type).toBe(SensorType.ULTRASONIC);
      expect(result.name).toBe('Distance Sensor');
      expect(result.isActive).toBe(true);
      expect(result.batteryLevel).toBe(85);
      expect(result.config).toEqual({ threshold: 50 });
    });

    it('should handle sensor without optional fields', async () => {
      const sensor = {
        type: SensorType.PIR,
        name: 'Motion Sensor',
        isActive: false,
        batteryLevel: undefined,
        config: {},
      };

      const result = await service.addBaySensor(mockTenantId, mockBayId, sensor);

      expect(result.type).toBe(SensorType.PIR);
      expect(result.batteryLevel).toBeUndefined();
    });
  });

  // ============== processSensorReading ==============

  describe('processSensorReading', () => {
    it('should process ultrasonic sensor and publish to Redis', async () => {
      const reading: SensorReading = {
        sensorId: 'sensor-1',
        bayId: mockBayId,
        timestamp: new Date(),
        type: SensorType.ULTRASONIC,
        data: { distance: 30 },
      };

      await service.processSensorReading(mockTenantId, reading);

      expect(redis.publish).toHaveBeenCalledWith(
        `shopfloor:sensor:${mockBayId}`,
        expect.any(String),
      );
    });

    it('should process PIR sensor with presence detection', async () => {
      const reading: SensorReading = {
        sensorId: 'sensor-2',
        bayId: mockBayId,
        timestamp: new Date(),
        type: SensorType.PIR,
        data: { presence: true },
      };

      await service.processSensorReading(mockTenantId, reading);

      // Should publish both the event and the sensor reading
      expect(redis.publish).toHaveBeenCalledWith(
        'shopfloor:events',
        expect.stringContaining('VEHICLE_ENTRY'),
      );
      expect(redis.publish).toHaveBeenCalledWith(
        `shopfloor:sensor:${mockBayId}`,
        expect.any(String),
      );
    });

    it('should process RFID reading with tag', async () => {
      const reading: SensorReading = {
        sensorId: 'sensor-3',
        bayId: mockBayId,
        timestamp: new Date(),
        type: SensorType.RFID,
        data: { rfidTag: 'TAG-001' },
      };

      await service.processSensorReading(mockTenantId, reading);

      expect(redis.publish).toHaveBeenCalledWith(
        'shopfloor:events',
        expect.stringContaining('TAG-001'),
      );
    });

    it('should skip RFID processing when no rfidTag', async () => {
      const reading: SensorReading = {
        sensorId: 'sensor-3',
        bayId: mockBayId,
        timestamp: new Date(),
        type: SensorType.RFID,
        data: {},
      };

      await service.processSensorReading(mockTenantId, reading);

      // Should only publish the sensor reading, not an event
      expect(redis.publish).toHaveBeenCalledTimes(1);
      expect(redis.publish).toHaveBeenCalledWith(
        `shopfloor:sensor:${mockBayId}`,
        expect.any(String),
      );
    });

    it('should process beacon reading with beaconId', async () => {
      const reading: SensorReading = {
        sensorId: 'sensor-4',
        bayId: mockBayId,
        timestamp: new Date(),
        type: SensorType.BLUETOOTH_BEACON,
        data: { beaconId: 'BEACON-001' },
      };

      await service.processSensorReading(mockTenantId, reading);

      // Beacon reading only logs, no event created
      expect(redis.publish).toHaveBeenCalledTimes(1);
    });

    it('should skip beacon processing when no beaconId', async () => {
      const reading: SensorReading = {
        sensorId: 'sensor-4',
        bayId: mockBayId,
        timestamp: new Date(),
        type: SensorType.BLUETOOTH_BEACON,
        data: {},
      };

      await service.processSensorReading(mockTenantId, reading);

      expect(redis.publish).toHaveBeenCalledTimes(1);
    });

    it('should process camera reading with license plate', async () => {
      const reading: SensorReading = {
        sensorId: 'sensor-5',
        bayId: mockBayId,
        timestamp: new Date(),
        type: SensorType.CAMERA,
        data: {
          licensePlate: 'AB123CD',
          confidence: 0.95,
          imageUrl: 'https://example.com/img.jpg',
        },
      };

      await service.processSensorReading(mockTenantId, reading);

      expect(redis.publish).toHaveBeenCalledWith(
        'shopfloor:events',
        expect.stringContaining('AB123CD'),
      );
    });

    it('should skip camera processing when no license plate', async () => {
      const reading: SensorReading = {
        sensorId: 'sensor-5',
        bayId: mockBayId,
        timestamp: new Date(),
        type: SensorType.CAMERA,
        data: {},
      };

      await service.processSensorReading(mockTenantId, reading);

      expect(redis.publish).toHaveBeenCalledTimes(1);
    });

    it('should process pressure reading above threshold', async () => {
      const reading: SensorReading = {
        sensorId: 'sensor-6',
        bayId: mockBayId,
        timestamp: new Date(),
        type: SensorType.PRESSURE,
        data: { pressure: 500 },
      };

      await service.processSensorReading(mockTenantId, reading);

      expect(redis.publish).toHaveBeenCalledWith(
        'shopfloor:events',
        expect.stringContaining('VEHICLE_ENTRY'),
      );
    });

    it('should skip pressure event when pressure is below threshold', async () => {
      const reading: SensorReading = {
        sensorId: 'sensor-6',
        bayId: mockBayId,
        timestamp: new Date(),
        type: SensorType.PRESSURE,
        data: { pressure: 50 },
      };

      await service.processSensorReading(mockTenantId, reading);

      expect(redis.publish).toHaveBeenCalledTimes(1);
    });

    it('should not detect occupancy when distance is above threshold', async () => {
      const reading: SensorReading = {
        sensorId: 'sensor-1',
        bayId: mockBayId,
        timestamp: new Date(),
        type: SensorType.ULTRASONIC,
        data: { distance: 100 },
      };

      await service.processSensorReading(mockTenantId, reading);

      // Only sensor publish, no event
      expect(redis.publish).toHaveBeenCalledTimes(1);
    });
  });

  // ============== assignVehicleToBay ==============

  describe('assignVehicleToBay', () => {
    it('should create an event, invalidate cache, and return bay', async () => {
      const result = await service.assignVehicleToBay(
        mockTenantId,
        mockBayId,
        mockVehicleId,
        mockWorkOrderId,
        [mockTechnicianId],
      );

      expect(redis.publish).toHaveBeenCalledWith(
        'shopfloor:events',
        expect.stringContaining('BAY_ASSIGNMENT'),
      );
      expect(redis.del).toHaveBeenCalledWith(`bay:${mockBayId}`);
      expect(result.id).toBe(mockBayId);
    });
  });

  // ============== releaseBay ==============

  describe('releaseBay', () => {
    it('should create exit event, invalidate cache, and return bay', async () => {
      const result = await service.releaseBay(mockTenantId, mockBayId);

      expect(redis.publish).toHaveBeenCalledWith(
        'shopfloor:events',
        expect.stringContaining('VEHICLE_EXIT'),
      );
      expect(redis.del).toHaveBeenCalledWith(`bay:${mockBayId}`);
      expect(result.id).toBe(mockBayId);
    });
  });

  // ============== getBay ==============

  describe('getBay', () => {
    it('should return cached bay if available', async () => {
      const cachedBay = {
        id: mockBayId,
        name: 'Cached Bay',
        status: BayStatus.OCCUPIED,
        sensors: [],
      };
      redis.get.mockResolvedValue(JSON.stringify(cachedBay));

      const result = await service.getBay(mockTenantId, mockBayId);

      expect(result).toEqual(cachedBay);
      expect(redis.setex).not.toHaveBeenCalled();
    });

    it('should return mock bay and cache it when no cache exists', async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.getBay(mockTenantId, mockBayId);

      expect(result.id).toBe(mockBayId);
      expect(result.status).toBe(BayStatus.AVAILABLE);
      expect(redis.setex).toHaveBeenCalledWith(`bay:${mockBayId}`, 60, expect.any(String));
    });
  });

  // ============== getAllBays ==============

  describe('getAllBays', () => {
    it('should return empty array (scaffold)', async () => {
      const result = await service.getAllBays(mockTenantId);

      expect(result).toEqual([]);
    });
  });

  // ============== updateTechnicianLocation ==============

  describe('updateTechnicianLocation', () => {
    const location = { x: 10, y: 20, floor: 1, beaconId: 'BEACON-A' };

    it('should update location when technician exists', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: mockTechnicianId,
        name: 'Mario Rossi',
      });

      const result = await service.updateTechnicianLocation(
        mockTenantId,
        mockTechnicianId,
        location,
      );

      expect(result.technicianId).toBe(mockTechnicianId);
      expect(result.name).toBe('Mario Rossi');
      expect(result.location).toEqual({ x: 10, y: 20, floor: 1 });
      expect(result.beaconId).toBe('BEACON-A');
      expect(result.status).toBe('AVAILABLE');
      expect(redis.setex).toHaveBeenCalledWith(
        `technician:${mockTechnicianId}:location`,
        300,
        expect.any(String),
      );
      expect(redis.publish).toHaveBeenCalledWith('shopfloor:technicians', expect.any(String));
    });

    it('should throw NotFoundException when technician does not exist', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateTechnicianLocation(mockTenantId, mockTechnicianId, location),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============== getActiveTechnicians ==============

  describe('getActiveTechnicians', () => {
    it('should return locations from Redis for active users', async () => {
      const mockUsers = [
        { id: 'tech-1', name: 'Tech A' },
        { id: 'tech-2', name: 'Tech B' },
      ];
      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const techLocation = {
        technicianId: 'tech-1',
        name: 'Tech A',
        status: 'AVAILABLE',
      };
      redis.get.mockResolvedValueOnce(JSON.stringify(techLocation)).mockResolvedValueOnce(null);

      const result = await service.getActiveTechnicians(mockTenantId);

      expect(result).toHaveLength(1);
      expect(result[0].technicianId).toBe('tech-1');
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, isActive: true },
        take: 200,
      });
    });

    it('should return empty array when no users have cached locations', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 'tech-1' }]);
      redis.get.mockResolvedValue(null);

      const result = await service.getActiveTechnicians(mockTenantId);

      expect(result).toEqual([]);
    });

    it('should return empty array when no active users', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getActiveTechnicians(mockTenantId);

      expect(result).toEqual([]);
    });
  });

  // ============== getWorkOrderProgress ==============

  describe('getWorkOrderProgress', () => {
    it('should throw NotFoundException (scaffold)', async () => {
      await expect(service.getWorkOrderProgress(mockTenantId, mockWorkOrderId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============== updateJobStatus ==============

  describe('updateJobStatus', () => {
    it('should create status change event and throw (delegates to getWorkOrderProgress)', async () => {
      await expect(
        service.updateJobStatus(mockTenantId, mockWorkOrderId, JobStatus.IN_PROGRESS),
      ).rejects.toThrow(NotFoundException);

      expect(redis.publish).toHaveBeenCalledWith(
        'shopfloor:events',
        expect.stringContaining('STATUS_CHANGE'),
      );
    });
  });

  // ============== getShopFloorAnalytics ==============

  describe('getShopFloorAnalytics', () => {
    it('should return default analytics (scaffold)', async () => {
      const from = new Date('2024-01-01');
      const to = new Date('2024-12-31');

      const result = await service.getShopFloorAnalytics(mockTenantId, from, to);

      expect(result).toEqual({
        totalVehicles: 0,
        averageServiceTime: 0,
        bayUtilization: {},
        technicianEfficiency: {},
      });
    });
  });

  // ============== getRecentEvents ==============

  describe('getRecentEvents', () => {
    it('should return empty array (scaffold)', async () => {
      const result = await service.getRecentEvents(mockTenantId);

      expect(result).toEqual([]);
    });

    it('should accept custom limit parameter', async () => {
      const result = await service.getRecentEvents(mockTenantId, 10);

      expect(result).toEqual([]);
    });
  });
});
