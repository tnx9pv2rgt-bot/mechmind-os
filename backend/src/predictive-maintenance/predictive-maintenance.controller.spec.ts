import { Test, TestingModule } from '@nestjs/testing';
import { PredictiveMaintenanceController } from './predictive-maintenance.controller';
import { PredictiveMaintenanceService } from './predictive-maintenance.service';

describe('PredictiveMaintenanceController', () => {
  let controller: PredictiveMaintenanceController;
  let service: jest.Mocked<PredictiveMaintenanceService>;

  const TENANT_ID = 'tenant-001';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PredictiveMaintenanceController],
      providers: [
        {
          provide: PredictiveMaintenanceService,
          useValue: {
            predictForVehicle: jest.fn(),
            getMaintenanceSchedule: jest.fn(),
            getPredictions: jest.fn(),
            createBookingFromPrediction: jest.fn(),
            sendMaintenanceReminders: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PredictiveMaintenanceController>(PredictiveMaintenanceController);
    service = module.get(PredictiveMaintenanceService) as jest.Mocked<PredictiveMaintenanceService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('predictForVehicle', () => {
    it('should delegate to service with tenantId and vehicleId', async () => {
      const predictions = [{ type: 'OIL_CHANGE', dueDate: '2026-05-01' }];
      service.predictForVehicle.mockResolvedValue(predictions as never);

      const result = await controller.predictForVehicle(TENANT_ID, 'veh-001');

      expect(service.predictForVehicle).toHaveBeenCalledWith(TENANT_ID, 'veh-001');
      expect(result).toEqual({ success: true, data: predictions });
    });
  });

  describe('getMaintenanceSchedule', () => {
    it('should delegate to service with tenantId and vehicleId', async () => {
      const schedule = [{ service: 'Oil Change', scheduled: true, completed: false }];
      service.getMaintenanceSchedule.mockResolvedValue(schedule as never);

      const result = await controller.getMaintenanceSchedule(TENANT_ID, 'veh-001');

      expect(service.getMaintenanceSchedule).toHaveBeenCalledWith(TENANT_ID, 'veh-001');
      expect(result).toEqual({ success: true, data: schedule });
    });
  });

  describe('getPredictions', () => {
    it('should delegate to service with tenantId and filters', async () => {
      service.getPredictions.mockResolvedValue({ predictions: [], total: 0 } as never);
      const filters = { severity: 'HIGH' };

      const result = await controller.getPredictions(TENANT_ID, filters as never);

      expect(service.getPredictions).toHaveBeenCalledWith(TENANT_ID, filters);
      expect(result).toEqual({ success: true, data: [], meta: { total: 0 } });
    });
  });

  describe('createBookingFromPrediction', () => {
    it('should delegate to service with tenantId and predictionId', async () => {
      const booking = { bookingId: 'book-001' };
      service.createBookingFromPrediction.mockResolvedValue(booking as never);

      const result = await controller.createBookingFromPrediction(TENANT_ID, 'pred-001');

      expect(service.createBookingFromPrediction).toHaveBeenCalledWith(TENANT_ID, 'pred-001');
      expect(result).toEqual({ success: true, data: booking });
    });
  });

  describe('sendReminders', () => {
    it('should delegate to service with tenantId', async () => {
      service.sendMaintenanceReminders.mockResolvedValue({ sent: 5 } as never);

      const result = await controller.sendReminders(TENANT_ID);

      expect(service.sendMaintenanceReminders).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual({ success: true, data: { sent: 5 } });
    });
  });
});
