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

      const result = await controller.getTwinState(VEHICLE_ID);

      expect(service.getOrCreateTwin).toHaveBeenCalledWith(VEHICLE_ID);
      expect(result).toEqual(mockTwinState);
    });
  });

  describe('updateComponent', () => {
    it('should delegate to service.updateComponentStatus with correct args', async () => {
      const dto = { health: 80, status: 'worn' } as never;
      const expected = { id: COMPONENT_ID, health: 80 };
      service.updateComponentStatus.mockResolvedValue(expected as never);

      const result = await controller.updateComponent(VEHICLE_ID, COMPONENT_ID, dto);

      expect(service.updateComponentStatus).toHaveBeenCalledWith(VEHICLE_ID, COMPONENT_ID, dto);
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

      const result = await controller.recordHistory(VEHICLE_ID, dto);

      expect(service.recordComponentHistory).toHaveBeenCalledWith(
        VEHICLE_ID,
        expect.objectContaining({ componentId: COMPONENT_ID, type: 'replacement' }),
      );
      expect(result).toEqual(expected);
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

      const result = await controller.recordDamage(VEHICLE_ID, dto);

      expect(service.recordDamage).toHaveBeenCalledWith(
        VEHICLE_ID,
        expect.objectContaining({ type: 'scratch', severity: 'minor' }),
      );
      expect(result).toEqual(expected);
    });
  });

  describe('getPredictiveAlerts', () => {
    it('should delegate to service.getPredictiveAlerts', async () => {
      const alerts = [{ id: 'alert-001', component: 'brakes', severity: 'high' }];
      service.getPredictiveAlerts.mockResolvedValue(alerts as never);

      const result = await controller.getPredictiveAlerts(VEHICLE_ID);

      expect(service.getPredictiveAlerts).toHaveBeenCalledWith(VEHICLE_ID);
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

      const result = await controller.getWearPrediction(VEHICLE_ID, COMPONENT_ID);

      expect(service.getWearPrediction).toHaveBeenCalledWith(VEHICLE_ID, COMPONENT_ID);
      expect(result).toEqual(prediction);
    });
  });

  describe('getVisualizationConfig', () => {
    it('should delegate to service.getVisualizationConfig', async () => {
      const config = { modelUrl: '/models/car.glb', colorScheme: 'health' };
      service.getVisualizationConfig.mockResolvedValue(config as never);

      const result = await controller.getVisualizationConfig(VEHICLE_ID);

      expect(service.getVisualizationConfig).toHaveBeenCalledWith(VEHICLE_ID);
      expect(result).toEqual(config);
    });
  });

  describe('updateVisualizationConfig', () => {
    it('should delegate to service.updateVisualizationConfig', async () => {
      const dto = { colorScheme: 'temperature' } as never;
      const updated = { modelUrl: '/models/car.glb', colorScheme: 'temperature' };
      service.updateVisualizationConfig.mockResolvedValue(updated as never);

      const result = await controller.updateVisualizationConfig(VEHICLE_ID, dto);

      expect(service.updateVisualizationConfig).toHaveBeenCalledWith(VEHICLE_ID, dto);
      expect(result).toEqual(updated);
    });
  });

  describe('getHealthTrend', () => {
    it('should delegate to service.getHealthTrend with parsed dates', async () => {
      const trend = [{ date: new Date(), overallHealth: 90, componentHealth: {} }];
      service.getHealthTrend.mockResolvedValue(trend as never);
      const query = { from: '2026-01-01', to: '2026-03-16' } as never;

      const result = await controller.getHealthTrend(VEHICLE_ID, query);

      expect(service.getHealthTrend).toHaveBeenCalledWith(
        VEHICLE_ID,
        new Date('2026-01-01'),
        new Date('2026-03-16'),
      );
      expect(result).toEqual(trend);
    });
  });
});
