import { Test, TestingModule } from '@nestjs/testing';
import { VehicleTwinController } from './vehicle-twin.controller';
import { VehicleTwinService } from '../services/vehicle-twin.service';

describe('VehicleTwinController', () => {
  let controller: VehicleTwinController;
  let service: jest.Mocked<VehicleTwinService>;

  const VEHICLE_ID = 'vehicle-001';
  const COMPONENT_ID = 'comp-001';

  const mockTwinState = {
    vehicleId: VEHICLE_ID,
    components: [],
    damageRecords: [],
    overallHealth: 95,
    lastUpdated: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VehicleTwinController],
      providers: [
        {
          provide: VehicleTwinService,
          useValue: {
            getOrCreateTwin: jest.fn(),
            updateComponentStatus: jest.fn(),
            recordComponentHistory: jest.fn(),
            recordDamage: jest.fn(),
            getPredictiveAlerts: jest.fn(),
            getWearPrediction: jest.fn(),
            getVisualizationConfig: jest.fn(),
            updateVisualizationConfig: jest.fn(),
            getHealthTrend: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<VehicleTwinController>(VehicleTwinController);
    service = module.get(VehicleTwinService) as jest.Mocked<VehicleTwinService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getTwinState', () => {
    it('should delegate to service.getOrCreateTwin', async () => {
      service.getOrCreateTwin.mockResolvedValue(mockTwinState as never);

      const result = await controller.getTwinState('tenant-test', VEHICLE_ID);

      expect(service.getOrCreateTwin).toHaveBeenCalledWith('tenant-test', VEHICLE_ID);
      expect(result).toEqual(mockTwinState);
    });
  });

  describe('updateComponent', () => {
    it('should delegate to service.updateComponentStatus with correct args', async () => {
      const dto = { health: 80, status: 'worn' } as never;
      const expected = { id: COMPONENT_ID, health: 80 };
      service.updateComponentStatus.mockResolvedValue(expected as never);

      const result = await controller.updateComponent('tenant-test', VEHICLE_ID, COMPONENT_ID, dto);

      expect(service.updateComponentStatus).toHaveBeenCalledWith(
        'tenant-test',
        VEHICLE_ID,
        COMPONENT_ID,
        dto,
      );
      expect(result).toEqual(expected);
    });
  });

  describe('recordHistory', () => {
    it('should delegate to service.recordComponentHistory', async () => {
      const dto = {
        componentId: COMPONENT_ID,
        type: 'replacement',
        description: 'Replaced brake pads',
        technicianId: 'tech-001',
      } as never;
      const expected = { id: 'hist-001', componentId: COMPONENT_ID };
      service.recordComponentHistory.mockResolvedValue(expected as never);

      const result = await controller.recordHistory('tenant-test', VEHICLE_ID, dto);

      expect(service.recordComponentHistory).toHaveBeenCalledWith(
        'tenant-test',
        VEHICLE_ID,
        expect.objectContaining({ componentId: COMPONENT_ID, type: 'replacement' }),
      );
      expect(result).toEqual(expected);
    });

    it('should use provided date when supplied', async () => {
      const specificDate = '2026-02-01T10:00:00Z';
      const dto = {
        componentId: COMPONENT_ID,
        type: 'inspection',
        description: 'Routine inspection',
        date: specificDate,
      } as never;
      const expected = { id: 'hist-002', date: new Date(specificDate) };
      service.recordComponentHistory.mockResolvedValue(expected as never);

      await controller.recordHistory('tenant-test', VEHICLE_ID, dto);

      expect(service.recordComponentHistory).toHaveBeenCalledWith(
        'tenant-test',
        VEHICLE_ID,
        expect.objectContaining({ date: new Date(specificDate) }),
      );
    });

    it('should use current date when not provided', async () => {
      const dto = {
        componentId: COMPONENT_ID,
        type: 'repair',
        description: 'Repair work',
      } as never;
      service.recordComponentHistory.mockResolvedValue({ id: 'hist-003' } as never);

      await controller.recordHistory('tenant-test', VEHICLE_ID, dto);

      expect(service.recordComponentHistory).toHaveBeenCalledWith(
        'tenant-test',
        VEHICLE_ID,
        expect.objectContaining({ partsUsed: [], photos: [], documents: [] }),
      );
    });

    it('should propagate service errors', async () => {
      const dto = {
        componentId: COMPONENT_ID,
        type: 'replacement',
        description: 'Bad data',
      } as never;
      service.recordComponentHistory.mockRejectedValue(new Error('History recording failed'));

      await expect(controller.recordHistory('tenant-test', VEHICLE_ID, dto)).rejects.toThrow(
        'History recording failed',
      );
    });
  });

  describe('recordDamage', () => {
    it('should delegate to service.recordDamage', async () => {
      const dto = {
        type: 'scratch',
        severity: 'minor',
        description: 'Small scratch on door',
      } as never;
      const expected = { id: 'dmg-001', type: 'scratch' };
      service.recordDamage.mockResolvedValue(expected as never);

      const result = await controller.recordDamage('tenant-test', VEHICLE_ID, dto);

      expect(service.recordDamage).toHaveBeenCalledWith(
        'tenant-test',
        VEHICLE_ID,
        expect.objectContaining({ type: 'scratch', severity: 'minor' }),
      );
      expect(result).toEqual(expected);
    });

    it('should use provided location', async () => {
      const dto = {
        type: 'dent',
        severity: 'major',
        location: { x: 10, y: 20, z: 5 },
      } as never;
      service.recordDamage.mockResolvedValue({ id: 'dmg-002' } as never);

      await controller.recordDamage('tenant-test', VEHICLE_ID, dto);

      expect(service.recordDamage).toHaveBeenCalledWith(
        'tenant-test',
        VEHICLE_ID,
        expect.objectContaining({ location: { x: 10, y: 20, z: 5 } }),
      );
    });

    it('should use default location when not provided', async () => {
      const dto = {
        type: 'crack',
        severity: 'critical',
      } as never;
      service.recordDamage.mockResolvedValue({ id: 'dmg-003' } as never);

      await controller.recordDamage('tenant-test', VEHICLE_ID, dto);

      expect(service.recordDamage).toHaveBeenCalledWith(
        'tenant-test',
        VEHICLE_ID,
        expect.objectContaining({ location: { x: 0, y: 0, z: 0 } }),
      );
    });

    it('should handle provided reportedAt date', async () => {
      const reportDate = '2026-02-15T14:30:00Z';
      const dto = {
        type: 'collision',
        severity: 'major',
        reportedAt: reportDate,
      } as never;
      service.recordDamage.mockResolvedValue({ id: 'dmg-004' } as never);

      await controller.recordDamage('tenant-test', VEHICLE_ID, dto);

      expect(service.recordDamage).toHaveBeenCalledWith(
        'tenant-test',
        VEHICLE_ID,
        expect.objectContaining({ reportedAt: new Date(reportDate) }),
      );
    });

    it('should propagate service errors', async () => {
      const dto = { type: 'unknown', severity: 'minor' } as never;
      service.recordDamage.mockRejectedValue(new Error('Damage recording failed'));

      await expect(controller.recordDamage('tenant-test', VEHICLE_ID, dto)).rejects.toThrow(
        'Damage recording failed',
      );
    });
  });

  describe('getPredictiveAlerts', () => {
    it('should delegate to service.getPredictiveAlerts', async () => {
      const alerts = [{ id: 'alert-001', component: 'brakes', severity: 'high' }];
      service.getPredictiveAlerts.mockResolvedValue(alerts as never);

      const result = await controller.getPredictiveAlerts('tenant-test', VEHICLE_ID);

      expect(service.getPredictiveAlerts).toHaveBeenCalledWith('tenant-test', VEHICLE_ID);
      expect(result).toEqual(alerts);
    });
  });

  describe('getWearPrediction', () => {
    it('should delegate to service.getWearPrediction', async () => {
      const prediction = {
        componentId: COMPONENT_ID,
        remainingLife: 75,
        estimatedReplacement: new Date(),
      };
      service.getWearPrediction.mockResolvedValue(prediction as never);

      const result = await controller.getWearPrediction('tenant-test', VEHICLE_ID, COMPONENT_ID);

      expect(service.getWearPrediction).toHaveBeenCalledWith(
        'tenant-test',
        VEHICLE_ID,
        COMPONENT_ID,
      );
      expect(result).toEqual(prediction);
    });
  });

  describe('getVisualizationConfig', () => {
    it('should delegate to service.getVisualizationConfig', async () => {
      const config = { modelUrl: '/models/car.glb', colorScheme: 'health' };
      service.getVisualizationConfig.mockResolvedValue(config as never);

      const result = await controller.getVisualizationConfig('tenant-test', VEHICLE_ID);

      expect(service.getVisualizationConfig).toHaveBeenCalledWith('tenant-test', VEHICLE_ID);
      expect(result).toEqual(config);
    });
  });

  describe('updateVisualizationConfig', () => {
    it('should delegate to service.updateVisualizationConfig', async () => {
      const dto = { colorScheme: 'temperature' } as never;
      const updated = { modelUrl: '/models/car.glb', colorScheme: 'temperature' };
      service.updateVisualizationConfig.mockResolvedValue(updated as never);

      const result = await controller.updateVisualizationConfig('tenant-test', VEHICLE_ID, dto);

      expect(service.updateVisualizationConfig).toHaveBeenCalledWith(
        'tenant-test',
        VEHICLE_ID,
        dto,
      );
      expect(result).toEqual(updated);
    });
  });

  describe('getHealthTrend', () => {
    it('should delegate to service.getHealthTrend with parsed dates', async () => {
      const trend = [{ date: new Date(), overallHealth: 90, componentHealth: {} }];
      service.getHealthTrend.mockResolvedValue(trend as never);
      const query = { from: '2026-01-01', to: '2026-03-16' } as never;

      const result = await controller.getHealthTrend('tenant-test', VEHICLE_ID, query);

      expect(service.getHealthTrend).toHaveBeenCalledWith(
        'tenant-test',
        VEHICLE_ID,
        new Date('2026-01-01'),
        new Date('2026-03-16'),
      );
      expect(result).toEqual(trend);
    });

    it('should handle different date ranges', async () => {
      const trend: object[] = [];
      service.getHealthTrend.mockResolvedValue(trend as never);
      const query = { from: '2026-02-01', to: '2026-02-28' } as never;

      const result = await controller.getHealthTrend('tenant-test', VEHICLE_ID, query);

      expect(service.getHealthTrend).toHaveBeenCalledWith(
        'tenant-test',
        VEHICLE_ID,
        new Date('2026-02-01'),
        new Date('2026-02-28'),
      );
      expect(result).toEqual([]);
    });

    it('should propagate service errors', async () => {
      const query = { from: '2026-01-01', to: '2026-03-16' } as never;
      service.getHealthTrend.mockRejectedValue(new Error('Trend retrieval failed'));

      await expect(controller.getHealthTrend('tenant-test', VEHICLE_ID, query)).rejects.toThrow(
        'Trend retrieval failed',
      );
    });
  });
});
