import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';
import { PrismaService } from '../../../common/services/prisma.service';
import { NotificationsService } from '../../../notifications/services/notifications.service';
import { VehicleTwinService } from './vehicle-twin.service';

describe('VehicleTwinService', () => {
  let service: VehicleTwinService;
  let prisma: Record<string, Record<string, jest.Mock>>;
  let redis: Record<string, jest.Mock>;

  const mockTenantId = 'tenant-uuid-1';
  const mockVehicleId = 'vehicle-uuid-1';
  const mockComponentId = 'engine';

  const mockVehicle = {
    id: mockVehicleId,
    vin: 'WBA12345678901234',
    make: 'BMW',
    model: 'X3',
    year: 2022,
    mileage: 45000,
    customer: { id: 'cust-1', name: 'Mario Rossi' },
    obdDevices: [
      {
        readings: [{ recordedAt: new Date(), distance: 45000, runTime: 1200 }],
        dtcs: [],
      },
    ],
    workOrders: [
      {
        id: 'wo-1',
        createdAt: new Date(),
        services: [{ relatedComponentId: 'engine' }],
        parts: [],
      },
    ],
  };

  beforeEach(async () => {
    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      publish: jest.fn().mockResolvedValue(1),
    };

    prisma = {
      vehicle: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      vehicleTwinComponent: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        createMany: jest.fn(),
        upsert: jest.fn(),
      },
      componentHistory: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      vehicleDamage: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      vehicleHealthHistory: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      vehicleTwinConfig: {
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleTwinService,
        {
          provide: PrismaService,
          useValue: prisma,
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

    service = module.get<VehicleTwinService>(VehicleTwinService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============== getOrCreateTwin ==============

  describe('getOrCreateTwin', () => {
    it('should return cached twin if available', async () => {
      const cachedTwin = {
        vehicleId: mockVehicleId,
        make: 'BMW',
        overallHealth: 95,
      };
      redis.get.mockResolvedValue(JSON.stringify(cachedTwin));

      const result = await service.getOrCreateTwin(mockTenantId, mockVehicleId);

      expect(result).toEqual(cachedTwin);
      expect(prisma.vehicle.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when vehicle not found', async () => {
      redis.get.mockResolvedValue(null);
      prisma.vehicle.findUnique.mockResolvedValue(null);
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.getOrCreateTwin(mockTenantId, mockVehicleId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should build and cache twin state when vehicle exists', async () => {
      redis.get.mockResolvedValue(null);
      prisma.vehicle.findUnique.mockResolvedValue(mockVehicle);
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleTwinComponent.findMany.mockResolvedValue([]);
      prisma.vehicleTwinComponent.createMany.mockResolvedValue({ count: 10 });
      prisma.componentHistory.findMany.mockResolvedValue([]);
      prisma.vehicleDamage.findMany.mockResolvedValue([]);

      const result = await service.getOrCreateTwin(mockTenantId, mockVehicleId);

      expect(result.vehicleId).toBe(mockVehicleId);
      expect(result.make).toBe('BMW');
      expect(result.model).toBe('X3');
      expect(result.year).toBe(2022);
      expect(result.components).toHaveLength(10); // default components
      expect(result.overallHealth).toBe(100); // all new components
      expect(redis.setex).toHaveBeenCalledWith(`twin:${mockVehicleId}`, 300, expect.any(String));
    });

    it('should use existing components if already initialized', async () => {
      redis.get.mockResolvedValue(null);
      prisma.vehicle.findUnique.mockResolvedValue(mockVehicle);
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);

      const existingComponents = [
        {
          componentId: 'engine',
          name: 'Engine',
          category: 'ENGINE',
          status: 'WARNING',
          healthScore: 70,
          lastServiceDate: null,
          nextServiceDue: null,
          estimatedLifespan: null,
          positionX: 0,
          positionY: 0.5,
          positionZ: 1.5,
          modelPartId: null,
          metadata: {},
        },
      ];
      prisma.vehicleTwinComponent.findMany.mockResolvedValue(existingComponents);
      prisma.componentHistory.findMany.mockResolvedValue([]);
      prisma.vehicleDamage.findMany.mockResolvedValue([]);

      const result = await service.getOrCreateTwin(mockTenantId, mockVehicleId);

      expect(result.components).toHaveLength(1);
      expect(result.components[0].status).toBe('WARNING');
      expect(result.overallHealth).toBe(70);
      expect(prisma.vehicleTwinComponent.createMany).not.toHaveBeenCalled();
    });

    it('should include recent history records in twin state', async () => {
      redis.get.mockResolvedValue(null);
      prisma.vehicle.findUnique.mockResolvedValue(mockVehicle);
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleTwinComponent.findMany.mockResolvedValue([]);
      prisma.vehicleTwinComponent.createMany.mockResolvedValue({ count: 10 });
      prisma.componentHistory.findMany.mockResolvedValue([
        {
          id: 'hist-1',
          componentId: 'engine',
          eventType: 'MAINTENANCE',
          date: new Date('2024-05-01'),
          description: 'Oil change',
          technicianId: 'tech-1',
          cost: 120,
          partsUsed: ['OIL-5W30'],
          photos: ['photo-oil.jpg'],
          documents: ['invoice.pdf'],
          odometer: 40000,
        },
        {
          id: 'hist-2',
          componentId: 'brakes_front',
          eventType: 'REPLACEMENT',
          date: new Date('2024-03-15'),
          description: null,
          technicianId: null,
          cost: null,
          partsUsed: [],
          photos: [],
          documents: [],
          odometer: null,
        },
      ]);
      prisma.vehicleDamage.findMany.mockResolvedValue([]);

      const result = await service.getOrCreateTwin(mockTenantId, mockVehicleId);

      expect(result.recentHistory).toHaveLength(2);
      expect(result.recentHistory[0].id).toBe('hist-1');
      expect(result.recentHistory[0].technicianId).toBe('tech-1');
      expect(result.recentHistory[0].cost).toBe(120);
      expect(result.recentHistory[0].odometer).toBe(40000);
      // Null values should become undefined
      expect(result.recentHistory[1].technicianId).toBeUndefined();
      expect(result.recentHistory[1].cost).toBeUndefined();
      expect(result.recentHistory[1].odometer).toBeUndefined();
    });

    it('should include damage records in twin state', async () => {
      redis.get.mockResolvedValue(null);
      prisma.vehicle.findUnique.mockResolvedValue(mockVehicle);
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleTwinComponent.findMany.mockResolvedValue([]);
      prisma.vehicleTwinComponent.createMany.mockResolvedValue({ count: 10 });
      prisma.componentHistory.findMany.mockResolvedValue([]);
      prisma.vehicleDamage.findMany.mockResolvedValue([
        {
          id: 'dmg-1',
          componentId: 'body_front',
          type: 'DENT',
          severity: 'MODERATE',
          description: 'Front bumper dent',
          locationX: 1.0,
          locationY: 0.5,
          locationZ: 2.5,
          photos: ['photo1.jpg'],
          reportedAt: new Date('2024-06-01'),
          repairedAt: new Date('2024-06-15'),
          repairCost: 350,
        },
        {
          id: 'dmg-2',
          componentId: 'body_rear',
          type: 'SCRATCH',
          severity: 'MINOR',
          description: 'Rear scratch',
          locationX: 0,
          locationY: 0.3,
          locationZ: -2.0,
          photos: [],
          reportedAt: new Date('2024-07-01'),
          repairedAt: null,
          repairCost: null,
        },
      ]);

      const result = await service.getOrCreateTwin(mockTenantId, mockVehicleId);

      expect(result.damageRecords).toHaveLength(2);
      expect(result.damageRecords[0].id).toBe('dmg-1');
      expect(result.damageRecords[0].location).toEqual({ x: 1.0, y: 0.5, z: 2.5 });
      expect(result.damageRecords[0].repairedAt).toEqual(new Date('2024-06-15'));
      expect(result.damageRecords[0].repairCost).toBe(350);
      expect(result.damageRecords[1].repairedAt).toBeUndefined();
      expect(result.damageRecords[1].repairCost).toBeUndefined();
    });

    it('should sort multiple OBD readings and use the latest', async () => {
      redis.get.mockResolvedValue(null);
      const olderDate = new Date('2024-01-01');
      const newerDate = new Date('2024-06-01');
      const vehicleWithMultipleReadings = {
        ...mockVehicle,
        obdDevices: [
          {
            readings: [
              { recordedAt: olderDate, distance: 30000, runTime: 800 },
              { recordedAt: newerDate, distance: 55000, runTime: 1500 },
            ],
            dtcs: [],
          },
        ],
      };
      prisma.vehicle.findUnique.mockResolvedValue(vehicleWithMultipleReadings);
      prisma.vehicle.findFirst.mockResolvedValue(vehicleWithMultipleReadings);
      prisma.vehicleTwinComponent.findMany.mockResolvedValue([]);
      prisma.vehicleTwinComponent.createMany.mockResolvedValue({ count: 10 });
      prisma.componentHistory.findMany.mockResolvedValue([]);
      prisma.vehicleDamage.findMany.mockResolvedValue([]);

      const result = await service.getOrCreateTwin(mockTenantId, mockVehicleId);

      expect(result.mileage).toBe(55000);
      expect(result.engineHours).toBe(1500);
    });

    it('should include mileage from latest OBD reading', async () => {
      redis.get.mockResolvedValue(null);
      const vehicleWithObd = {
        ...mockVehicle,
        obdDevices: [
          {
            readings: [{ recordedAt: new Date(), distance: 55000, runTime: 2000 }],
            dtcs: [],
          },
        ],
      };
      prisma.vehicle.findUnique.mockResolvedValue(vehicleWithObd);
      prisma.vehicle.findFirst.mockResolvedValue(vehicleWithObd);
      prisma.vehicleTwinComponent.findMany.mockResolvedValue([]);
      prisma.vehicleTwinComponent.createMany.mockResolvedValue({ count: 10 });
      prisma.componentHistory.findMany.mockResolvedValue([]);
      prisma.vehicleDamage.findMany.mockResolvedValue([]);

      const result = await service.getOrCreateTwin(mockTenantId, mockVehicleId);

      expect(result.mileage).toBe(55000);
      expect(result.engineHours).toBe(2000);
    });
  });

  // ============== updateComponentStatus ==============

  describe('updateComponentStatus', () => {
    it('should upsert component, invalidate cache, and return updated component', async () => {
      prisma.vehicleTwinComponent.upsert.mockResolvedValue({});
      prisma.vehicleTwinComponent.findUnique.mockResolvedValue({
        componentId: mockComponentId,
        name: 'Engine',
        category: 'ENGINE',
        status: 'WARNING',
        healthScore: 75,
        lastServiceDate: null,
        nextServiceDue: null,
        estimatedLifespan: null,
        positionX: 0,
        positionY: 0.5,
        positionZ: 1.5,
        modelPartId: null,
        metadata: {},
      });

      const result = await service.updateComponentStatus(
        mockTenantId,
        mockVehicleId,
        mockComponentId,
        {
          status: 'WARNING',
          healthScore: 75,
        },
      );

      expect(prisma.vehicleTwinComponent.upsert).toHaveBeenCalled();
      expect(redis.del).toHaveBeenCalledWith(`twin:${mockVehicleId}`);
      expect(result.status).toBe('WARNING');
      expect(result.healthScore).toBe(75);
    });

    it('should handle update with only status', async () => {
      prisma.vehicleTwinComponent.upsert.mockResolvedValue({});
      prisma.vehicleTwinComponent.findUnique.mockResolvedValue({
        componentId: mockComponentId,
        name: 'Engine',
        category: 'ENGINE',
        status: 'CRITICAL',
        healthScore: 100,
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        metadata: {},
      });

      const result = await service.updateComponentStatus(
        mockTenantId,
        mockVehicleId,
        mockComponentId,
        {
          status: 'CRITICAL',
        },
      );

      expect(result.status).toBe('CRITICAL');
    });

    it('should throw NotFoundException when component not found after upsert', async () => {
      prisma.vehicleTwinComponent.upsert.mockResolvedValue({});
      prisma.vehicleTwinComponent.findUnique.mockResolvedValue(null);

      await expect(
        service.updateComponentStatus(mockTenantId, mockVehicleId, mockComponentId, {
          status: 'HEALTHY',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============== recordComponentHistory ==============

  describe('recordComponentHistory', () => {
    const historyInput = {
      componentId: 'brakes_front',
      eventType: 'MAINTENANCE' as const,
      date: new Date(),
      description: 'Brake pads replaced',
      technicianId: 'tech-1',
      cost: 250,
      partsUsed: ['PAD-001'],
      photos: [],
      documents: [],
      odometer: 45000,
    };

    it('should create history record and update component status', async () => {
      prisma.componentHistory.create.mockResolvedValue({
        id: 'history-1',
        ...historyInput,
      });
      prisma.vehicleTwinComponent.upsert.mockResolvedValue({});
      prisma.vehicleTwinComponent.findUnique.mockResolvedValue({
        componentId: 'brakes_front',
        name: 'Front Brakes',
        category: 'BRAKES',
        status: 'HEALTHY',
        healthScore: 100,
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        metadata: {},
      });

      const result = await service.recordComponentHistory(
        mockTenantId,
        mockVehicleId,
        historyInput,
      );

      expect(result.id).toBe('history-1');
      expect(result.componentId).toBe('brakes_front');
      expect(prisma.componentHistory.create).toHaveBeenCalled();
      expect(redis.del).toHaveBeenCalledWith(`twin:${mockVehicleId}`);
    });

    it('should map REPAIR event type to REPAIRING status', async () => {
      const repairHistory = { ...historyInput, eventType: 'REPAIR' as const };
      prisma.componentHistory.create.mockResolvedValue({
        id: 'history-2',
        ...repairHistory,
      });
      prisma.vehicleTwinComponent.upsert.mockResolvedValue({});
      prisma.vehicleTwinComponent.findUnique.mockResolvedValue({
        componentId: 'brakes_front',
        name: 'Front Brakes',
        category: 'BRAKES',
        status: 'REPAIRING',
        healthScore: 100,
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        metadata: {},
      });

      await service.recordComponentHistory(mockTenantId, mockVehicleId, repairHistory);

      const upsertCall = prisma.vehicleTwinComponent.upsert.mock.calls[0][0];
      expect(upsertCall.create.status).toBe('REPAIRING');
    });

    it('should map REPLACEMENT to REPLACED status', async () => {
      const replaceHistory = { ...historyInput, eventType: 'REPLACEMENT' as const };
      prisma.componentHistory.create.mockResolvedValue({
        id: 'history-3',
        ...replaceHistory,
      });
      prisma.vehicleTwinComponent.upsert.mockResolvedValue({});
      prisma.vehicleTwinComponent.findUnique.mockResolvedValue({
        componentId: 'brakes_front',
        name: 'Front Brakes',
        category: 'BRAKES',
        status: 'REPLACED',
        healthScore: 100,
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        metadata: {},
      });

      await service.recordComponentHistory(mockTenantId, mockVehicleId, replaceHistory);

      const upsertCall = prisma.vehicleTwinComponent.upsert.mock.calls[0][0];
      expect(upsertCall.create.status).toBe('REPLACED');
    });

    it('should map DAMAGE event to CRITICAL status', async () => {
      const damageHistory = { ...historyInput, eventType: 'DAMAGE' as const };
      prisma.componentHistory.create.mockResolvedValue({
        id: 'history-4',
        ...damageHistory,
      });
      prisma.vehicleTwinComponent.upsert.mockResolvedValue({});
      prisma.vehicleTwinComponent.findUnique.mockResolvedValue({
        componentId: 'brakes_front',
        name: 'Front Brakes',
        category: 'BRAKES',
        status: 'CRITICAL',
        healthScore: 100,
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        metadata: {},
      });

      await service.recordComponentHistory(mockTenantId, mockVehicleId, damageHistory);

      const upsertCall = prisma.vehicleTwinComponent.upsert.mock.calls[0][0];
      expect(upsertCall.create.status).toBe('CRITICAL');
    });

    it('should handle null partsUsed and photos', async () => {
      const historyNoOptional = {
        ...historyInput,
        partsUsed: undefined,
        photos: undefined,
        documents: undefined,
      };
      prisma.componentHistory.create.mockResolvedValue({
        id: 'history-5',
        ...historyNoOptional,
      });
      prisma.vehicleTwinComponent.upsert.mockResolvedValue({});
      prisma.vehicleTwinComponent.findUnique.mockResolvedValue({
        componentId: 'brakes_front',
        name: 'Front Brakes',
        category: 'BRAKES',
        status: 'HEALTHY',
        healthScore: 100,
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        metadata: {},
      });

      await service.recordComponentHistory(mockTenantId, mockVehicleId, historyNoOptional);

      const createCall = prisma.componentHistory.create.mock.calls[0][0];
      expect(createCall.data.partsUsed).toEqual([]);
      expect(createCall.data.photos).toEqual([]);
      expect(createCall.data.documents).toEqual([]);
    });
  });

  // ============== recordDamage ==============

  describe('recordDamage', () => {
    const damageInput = {
      componentId: 'body_front',
      type: 'DENT' as const,
      severity: 'MODERATE' as const,
      description: 'Front bumper dent from parking',
      location: { x: 0, y: 0.5, z: 2.5 },
      photos: ['photo1.jpg'],
      reportedAt: new Date(),
      repairCost: 500,
    };

    it('should create damage record and update component health', async () => {
      prisma.vehicleDamage.create.mockResolvedValue({
        id: 'damage-1',
        ...damageInput,
      });
      // getComponent called from recordDamage
      prisma.vehicleTwinComponent.findUnique.mockResolvedValue({
        componentId: 'body_front',
        name: 'Body Front',
        category: 'BODY',
        status: 'HEALTHY',
        healthScore: 100,
        positionX: 0,
        positionY: 0.5,
        positionZ: 2.5,
        metadata: {},
      });
      prisma.vehicleTwinComponent.upsert.mockResolvedValue({});

      const result = await service.recordDamage(mockTenantId, mockVehicleId, damageInput);

      expect(result.id).toBe('damage-1');
      expect(result.type).toBe('DENT');
      expect(prisma.vehicleDamage.create).toHaveBeenCalled();
      expect(redis.del).toHaveBeenCalledWith(`twin:${mockVehicleId}`);
    });

    it('should set CRITICAL status for SEVERE damage', async () => {
      const severeDamage = { ...damageInput, severity: 'SEVERE' as const };
      prisma.vehicleDamage.create.mockResolvedValue({
        id: 'damage-2',
        ...severeDamage,
      });
      prisma.vehicleTwinComponent.findUnique.mockResolvedValue({
        componentId: 'body_front',
        name: 'Body Front',
        category: 'BODY',
        status: 'HEALTHY',
        healthScore: 80,
        positionX: 0,
        positionY: 0.5,
        positionZ: 2.5,
        metadata: {},
      });
      prisma.vehicleTwinComponent.upsert.mockResolvedValue({});

      await service.recordDamage(mockTenantId, mockVehicleId, severeDamage);

      const upsertCall = prisma.vehicleTwinComponent.upsert.mock.calls[0][0];
      expect(upsertCall.create.status).toBe('CRITICAL');
    });

    it('should set WARNING status for non-severe damage', async () => {
      prisma.vehicleDamage.create.mockResolvedValue({
        id: 'damage-3',
        ...damageInput,
      });
      prisma.vehicleTwinComponent.findUnique.mockResolvedValue({
        componentId: 'body_front',
        name: 'Body Front',
        category: 'BODY',
        status: 'HEALTHY',
        healthScore: 100,
        positionX: 0,
        positionY: 0.5,
        positionZ: 2.5,
        metadata: {},
      });
      prisma.vehicleTwinComponent.upsert.mockResolvedValue({});

      await service.recordDamage(mockTenantId, mockVehicleId, damageInput);

      const upsertCall = prisma.vehicleTwinComponent.upsert.mock.calls[0][0];
      expect(upsertCall.create.status).toBe('WARNING');
    });

    it('should not reduce health below zero', async () => {
      const severeCrack = {
        ...damageInput,
        type: 'CRACK' as const,
        severity: 'SEVERE' as const,
      };
      prisma.vehicleDamage.create.mockResolvedValue({
        id: 'damage-4',
        ...severeCrack,
      });
      prisma.vehicleTwinComponent.findUnique.mockResolvedValue({
        componentId: 'body_front',
        name: 'Body Front',
        category: 'BODY',
        status: 'CRITICAL',
        healthScore: 10, // low health
        positionX: 0,
        positionY: 0.5,
        positionZ: 2.5,
        metadata: {},
      });
      prisma.vehicleTwinComponent.upsert.mockResolvedValue({});

      await service.recordDamage(mockTenantId, mockVehicleId, severeCrack);

      const upsertCall = prisma.vehicleTwinComponent.upsert.mock.calls[0][0];
      expect(upsertCall.create.condition).toBeGreaterThanOrEqual(0);
    });
  });

  // ============== getPredictiveAlerts ==============

  describe('getPredictiveAlerts', () => {
    it('should throw NotFoundException when vehicle not found', async () => {
      prisma.vehicle.findUnique.mockResolvedValue(null);
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.getPredictiveAlerts(mockTenantId, mockVehicleId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return alerts for critical DTCs', async () => {
      const vehicleWithDtcs = {
        ...mockVehicle,
        mileage: 50000,
        obdDevices: [
          {
            readings: [],
            dtcs: [
              {
                id: 'dtc-1',
                code: 'P0301',
                severity: 'CRITICAL',
                description: 'Cylinder 1 misfire',
                symptoms: 'Rough idle',
                causes: 'Bad spark plug',
                isActive: true,
              },
            ],
          },
        ],
      };
      prisma.vehicle.findUnique.mockResolvedValue(vehicleWithDtcs);
      prisma.vehicle.findFirst.mockResolvedValue(vehicleWithDtcs);
      prisma.vehicleTwinComponent.findMany.mockResolvedValue([]);
      prisma.componentHistory.findMany.mockResolvedValue([]);

      const result = await service.getPredictiveAlerts(mockTenantId, mockVehicleId);

      const dtcAlert = result.find(a => a.id.startsWith('dtc:'));
      expect(dtcAlert).toBeDefined();
      expect(dtcAlert?.severity).toBe('CRITICAL');
      expect(dtcAlert?.componentId).toBe('engine');
    });

    it('should return alerts for high-severity DTCs', async () => {
      const vehicleWithHighDtc = {
        ...mockVehicle,
        obdDevices: [
          {
            readings: [],
            dtcs: [
              {
                id: 'dtc-2',
                code: 'P0700',
                severity: 'HIGH',
                description: 'Transmission issue',
              },
            ],
          },
        ],
      };
      prisma.vehicle.findUnique.mockResolvedValue(vehicleWithHighDtc);
      prisma.vehicle.findFirst.mockResolvedValue(vehicleWithHighDtc);
      prisma.vehicleTwinComponent.findMany.mockResolvedValue([]);
      prisma.componentHistory.findMany.mockResolvedValue([]);

      const result = await service.getPredictiveAlerts(mockTenantId, mockVehicleId);

      const dtcAlert = result.find(a => a.id.startsWith('dtc:'));
      expect(dtcAlert).toBeDefined();
      expect(dtcAlert?.severity).toBe('HIGH');
    });

    it('should generate wear-based alerts for components past lifespan', async () => {
      const highMileageVehicle = {
        ...mockVehicle,
        mileage: 100000,
        obdDevices: [{ readings: [], dtcs: [] }],
      };
      prisma.vehicle.findUnique.mockResolvedValue(highMileageVehicle);
      prisma.vehicle.findFirst.mockResolvedValue(highMileageVehicle);
      prisma.vehicleTwinComponent.findMany.mockResolvedValue([
        {
          componentId: 'brakes_front',
          name: 'Front Brakes',
          category: 'BRAKES',
          status: 'HEALTHY',
          healthScore: 50,
        },
      ]);
      // No service history => milesSinceService = 100000 which > 90% of max 60000
      prisma.componentHistory.findMany.mockResolvedValue([]);

      const result = await service.getPredictiveAlerts(mockTenantId, mockVehicleId);

      const wearAlert = result.find(a => a.id.startsWith('pred:brakes'));
      expect(wearAlert).toBeDefined();
      expect(wearAlert?.severity).toBe('CRITICAL');
    });

    it('should sort alerts by severity (CRITICAL first)', async () => {
      const vehicleWithMultiple = {
        ...mockVehicle,
        mileage: 80000,
        obdDevices: [
          {
            readings: [],
            dtcs: [
              {
                id: 'dtc-low',
                code: 'P0700',
                severity: 'HIGH',
                description: 'Trans issue',
              },
              {
                id: 'dtc-crit',
                code: 'P0301',
                severity: 'CRITICAL',
                description: 'Misfire',
              },
            ],
          },
        ],
      };
      prisma.vehicle.findUnique.mockResolvedValue(vehicleWithMultiple);
      prisma.vehicle.findFirst.mockResolvedValue(vehicleWithMultiple);
      prisma.vehicleTwinComponent.findMany.mockResolvedValue([]);
      prisma.componentHistory.findMany.mockResolvedValue([]);

      const result = await service.getPredictiveAlerts(mockTenantId, mockVehicleId);

      if (result.length >= 2) {
        const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        for (let i = 1; i < result.length; i++) {
          expect(severityOrder[result[i - 1].severity]).toBeLessThanOrEqual(
            // eslint-disable-next-line security/detect-object-injection
            severityOrder[result[i].severity],
          );
        }
      }
    });

    it('should generate HIGH severity alert for components at 75-90% wear', async () => {
      // BRAKES max lifespan = 60000km
      // 80% wear => milesSinceService/60000 = 0.80 => milesSinceService = 48000
      const vehicleHighWear = {
        ...mockVehicle,
        mileage: 48000,
        obdDevices: [{ readings: [], dtcs: [] }],
      };
      prisma.vehicle.findUnique.mockResolvedValue(vehicleHighWear);
      prisma.vehicle.findFirst.mockResolvedValue(vehicleHighWear);
      prisma.vehicleTwinComponent.findMany.mockResolvedValue([
        {
          componentId: 'brakes_front',
          name: 'Front Brakes',
          category: 'BRAKES',
          status: 'HEALTHY',
          healthScore: 60,
        },
      ]);
      // No service history => serviceMileage = 0, milesSinceService = 48000
      // wearPercentage = 48000/60000 * 100 = 80% => HIGH
      prisma.componentHistory.findMany.mockResolvedValue([]);

      const result = await service.getPredictiveAlerts(mockTenantId, mockVehicleId);

      const wearAlert = result.find(a => a.id.startsWith('pred:brakes'));
      expect(wearAlert).toBeDefined();
      expect(wearAlert?.severity).toBe('HIGH');
      expect(wearAlert?.confidence).toBe(0.75);
    });

    it('should generate MEDIUM severity alert for components at 50-75% wear', async () => {
      // BRAKES max lifespan = 60000km
      // 60% wear => milesSinceService/60000 = 0.60 => milesSinceService = 36000
      const vehicleMediumWear = {
        ...mockVehicle,
        mileage: 36000,
        obdDevices: [{ readings: [], dtcs: [] }],
      };
      prisma.vehicle.findUnique.mockResolvedValue(vehicleMediumWear);
      prisma.vehicle.findFirst.mockResolvedValue(vehicleMediumWear);
      prisma.vehicleTwinComponent.findMany.mockResolvedValue([
        {
          componentId: 'brakes_front',
          name: 'Front Brakes',
          category: 'BRAKES',
          status: 'HEALTHY',
          healthScore: 70,
        },
      ]);
      // No service history => serviceMileage = 0, milesSinceService = 36000
      // wearPercentage = 36000/60000 * 100 = 60% => MEDIUM
      prisma.componentHistory.findMany.mockResolvedValue([]);

      const result = await service.getPredictiveAlerts(mockTenantId, mockVehicleId);

      const wearAlert = result.find(a => a.id.startsWith('pred:brakes'));
      expect(wearAlert).toBeDefined();
      expect(wearAlert?.severity).toBe('MEDIUM');
      expect(wearAlert?.confidence).toBe(0.6);
    });

    it('should return empty alerts when no issues', async () => {
      const healthyVehicle = {
        ...mockVehicle,
        mileage: 5000,
        obdDevices: [{ readings: [], dtcs: [] }],
      };
      prisma.vehicle.findUnique.mockResolvedValue(healthyVehicle);
      prisma.vehicle.findFirst.mockResolvedValue(healthyVehicle);
      prisma.vehicleTwinComponent.findMany.mockResolvedValue([
        {
          componentId: 'engine',
          name: 'Engine',
          category: 'ENGINE',
          status: 'HEALTHY',
          healthScore: 100,
        },
      ]);
      // Recent maintenance at 4000km
      prisma.componentHistory.findMany.mockResolvedValue([
        { eventType: 'MAINTENANCE', odometer: 4000 },
      ]);

      const result = await service.getPredictiveAlerts(mockTenantId, mockVehicleId);

      // No critical alerts expected for low-mileage vehicle with recent service
      const criticalAlerts = result.filter(a => a.severity === 'CRITICAL');
      expect(criticalAlerts).toHaveLength(0);
    });
  });

  // ============== getWearPrediction ==============

  describe('getWearPrediction', () => {
    it('should throw NotFoundException when vehicle not found', async () => {
      prisma.vehicle.findUnique.mockResolvedValue(null);
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(
        service.getWearPrediction(mockTenantId, mockVehicleId, mockComponentId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return wear prediction with 12-month forecast', async () => {
      prisma.vehicle.findUnique.mockResolvedValue({
        ...mockVehicle,
        mileage: 30000,
      });
      prisma.vehicle.findFirst.mockResolvedValue({
        ...mockVehicle,
        mileage: 30000,
      });
      prisma.vehicleTwinComponent.findUnique.mockResolvedValue({
        componentId: 'brakes_front',
        name: 'Front Brakes',
        category: 'BRAKES',
        status: 'HEALTHY',
        healthScore: 80,
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        metadata: {},
      });

      const result = await service.getWearPrediction(mockTenantId, mockVehicleId, 'brakes_front');

      expect(result.componentId).toBe('brakes_front');
      expect(result.currentWear).toBe(20); // 100 - healthScore
      expect(result.predictedWear).toHaveLength(12);
      expect(result.factors).toHaveProperty('drivingStyle');
      expect(result.factors).toHaveProperty('mileage');
      expect(result.factors).toHaveProperty('age');
      expect(result.factors).toHaveProperty('maintenanceHistory');
      expect(result.factors).toHaveProperty('environment');
    });

    it('should cap wear percentage at 100%', async () => {
      prisma.vehicle.findUnique.mockResolvedValue({
        ...mockVehicle,
        mileage: 200000,
      });
      prisma.vehicle.findFirst.mockResolvedValue({
        ...mockVehicle,
        mileage: 200000,
      });
      prisma.vehicleTwinComponent.findUnique.mockResolvedValue({
        componentId: 'brakes_front',
        name: 'Front Brakes',
        category: 'BRAKES',
        status: 'CRITICAL',
        healthScore: 10,
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        metadata: {},
      });

      const result = await service.getWearPrediction(mockTenantId, mockVehicleId, 'brakes_front');

      for (const prediction of result.predictedWear) {
        expect(prediction.wearPercentage).toBeLessThanOrEqual(100);
      }
    });

    it('should handle component with no lifespan estimates', async () => {
      prisma.vehicle.findUnique.mockResolvedValue(mockVehicle);
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleTwinComponent.findUnique.mockResolvedValue({
        componentId: 'exhaust',
        name: 'Exhaust System',
        category: 'EXHAUST',
        status: 'HEALTHY',
        healthScore: 90,
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        metadata: {},
      });

      const result = await service.getWearPrediction(mockTenantId, mockVehicleId, 'exhaust');

      expect(result.componentId).toBe('exhaust');
      expect(result.predictedWear).toHaveLength(0); // no lifespan data
    });
  });

  // ============== getVisualizationConfig ==============

  describe('getVisualizationConfig', () => {
    it('should return cached config if available', async () => {
      const cachedConfig = {
        vehicleId: mockVehicleId,
        modelFormat: 'GLB',
        modelUrl: '/models/test.glb',
      };
      redis.get.mockResolvedValue(JSON.stringify(cachedConfig));

      const result = await service.getVisualizationConfig(mockTenantId, mockVehicleId);

      expect(result).toEqual(cachedConfig);
      expect(prisma.vehicle.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when vehicle not found', async () => {
      redis.get.mockResolvedValue(null);
      prisma.vehicle.findUnique.mockResolvedValue(null);
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.getVisualizationConfig(mockTenantId, mockVehicleId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return default config and cache it when no twinConfig exists', async () => {
      redis.get.mockResolvedValue(null);
      prisma.vehicle.findUnique.mockResolvedValue({
        ...mockVehicle,
        twinConfig: null,
      });
      prisma.vehicle.findFirst.mockResolvedValue({
        ...mockVehicle,
        twinConfig: null,
      });

      const result = await service.getVisualizationConfig(mockTenantId, mockVehicleId);

      expect(result.vehicleId).toBe(mockVehicleId);
      expect(result.modelFormat).toBe('GLB');
      expect(result.modelUrl).toContain('bmw');
      expect(result.modelUrl).toContain('x3');
      expect(result.componentMappings.length).toBeGreaterThan(0);
      expect(redis.setex).toHaveBeenCalledWith(
        `twin:config:${mockVehicleId}`,
        3600,
        expect.any(String),
      );
    });

    it('should use existing twinConfig when available', async () => {
      redis.get.mockResolvedValue(null);
      const existingConfig = {
        vehicleId: mockVehicleId,
        modelFormat: 'FBX',
        modelUrl: '/models/custom.fbx',
        componentMappings: [],
        defaultCameraPosition: { x: 5, y: 5, z: 5 },
        hotspots: [],
      };
      prisma.vehicle.findUnique.mockResolvedValue({
        ...mockVehicle,
        twinConfig: existingConfig,
      });
      prisma.vehicle.findFirst.mockResolvedValue({
        ...mockVehicle,
        twinConfig: existingConfig,
      });

      const result = await service.getVisualizationConfig(mockTenantId, mockVehicleId);

      expect(result.modelFormat).toBe('FBX');
      expect(result.modelUrl).toBe('/models/custom.fbx');
    });
  });

  // ============== updateVisualizationConfig ==============

  describe('updateVisualizationConfig', () => {
    it('should upsert config, invalidate cache, and return updated config', async () => {
      prisma.vehicleTwinConfig.upsert.mockResolvedValue({});
      // After invalidation, getVisualizationConfig will be called
      redis.get.mockResolvedValue(null);
      prisma.vehicle.findUnique.mockResolvedValue({
        ...mockVehicle,
        twinConfig: null,
      });
      prisma.vehicle.findFirst.mockResolvedValue({
        ...mockVehicle,
        twinConfig: null,
      });

      const result = await service.updateVisualizationConfig(mockTenantId, mockVehicleId, {
        modelFormat: 'OBJ',
        modelUrl: '/models/custom.obj',
      });

      expect(prisma.vehicleTwinConfig.upsert).toHaveBeenCalled();
      expect(redis.del).toHaveBeenCalledWith(`twin:config:${mockVehicleId}`);
      expect(result).toBeDefined();
    });

    it('should use default values when partial config provided', async () => {
      prisma.vehicleTwinConfig.upsert.mockResolvedValue({});
      redis.get.mockResolvedValue(null);
      prisma.vehicle.findUnique.mockResolvedValue({
        ...mockVehicle,
        twinConfig: null,
      });
      prisma.vehicle.findFirst.mockResolvedValue({
        ...mockVehicle,
        twinConfig: null,
      });

      await service.updateVisualizationConfig(mockTenantId, mockVehicleId, {});

      const upsertCall = prisma.vehicleTwinConfig.upsert.mock.calls[0][0];
      expect(upsertCall.create.modelFormat).toBe('GLB');
      expect(upsertCall.create.modelUrl).toBe('');
      expect(upsertCall.create.componentMappings).toEqual([]);
      expect(upsertCall.create.defaultCameraPosition).toEqual({ x: 3, y: 2, z: 3 });
    });
  });

  // ============== getHealthTrend ==============

  describe('getHealthTrend', () => {
    it('should return health history for date range', async () => {
      const from = new Date('2024-01-01');
      const to = new Date('2024-06-30');
      const mockHistory = [
        {
          recordedAt: new Date('2024-02-01'),
          overallHealth: 95,
          componentHealth: { engine: 100, brakes: 90 },
        },
        {
          recordedAt: new Date('2024-04-01'),
          overallHealth: 88,
          componentHealth: { engine: 95, brakes: 80 },
        },
      ];
      prisma.vehicleHealthHistory.findMany.mockResolvedValue(mockHistory);

      const result = await service.getHealthTrend(mockTenantId, mockVehicleId, from, to);

      expect(result).toHaveLength(2);
      expect(result[0].overallHealth).toBe(95);
      expect(result[1].overallHealth).toBe(88);
      expect(result[0].componentHealth).toEqual({ engine: 100, brakes: 90 });
    });

    it('should return empty array when no history', async () => {
      prisma.vehicleHealthHistory.findMany.mockResolvedValue([]);

      const result = await service.getHealthTrend(
        mockTenantId,
        mockVehicleId,
        new Date('2024-01-01'),
        new Date('2024-12-31'),
      );

      expect(result).toEqual([]);
    });

    it('should query with correct date range', async () => {
      const from = new Date('2024-03-01');
      const to = new Date('2024-09-30');
      prisma.vehicleHealthHistory.findMany.mockResolvedValue([]);

      await service.getHealthTrend(mockTenantId, mockVehicleId, from, to);

      expect(prisma.vehicleHealthHistory.findMany).toHaveBeenCalledWith({
        where: {
          vehicleId: mockVehicleId,
          recordedAt: { gte: from, lte: to },
        },
        orderBy: { recordedAt: 'asc' },
      });
    });
  });
});
