import { Test, TestingModule } from '@nestjs/testing';
import { AiSchedulingController } from './ai-scheduling.controller';
import { AiSchedulingService } from './ai-scheduling.service';

describe('AiSchedulingController', () => {
  let controller: AiSchedulingController;
  let service: jest.Mocked<AiSchedulingService>;

  const TENANT_ID = 'tenant-001';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiSchedulingController],
      providers: [
        {
          provide: AiSchedulingService,
          useValue: {
            suggestOptimalSlots: jest.fn(),
            optimizeDaySchedule: jest.fn(),
            getCapacityForecast: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AiSchedulingController>(AiSchedulingController);
    service = module.get(AiSchedulingService) as jest.Mocked<AiSchedulingService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('suggestSlots', () => {
    it('should delegate to service with tenantId and dto', async () => {
      const slots = [{ time: '09:00', score: 0.95, bayId: 'bay-001' }];
      service.suggestOptimalSlots.mockResolvedValue(slots as never);
      const dto = { serviceType: 'OIL_CHANGE', durationMinutes: 30 };

      const result = await controller.suggestSlots(TENANT_ID, dto as never);

      expect(service.suggestOptimalSlots).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual(slots);
    });
  });

  describe('optimizeDay', () => {
    it('should delegate to service with tenantId and date', async () => {
      const optimized = { schedule: [], savingsMinutes: 45 };
      service.optimizeDaySchedule.mockResolvedValue(optimized as never);

      const result = await controller.optimizeDay(TENANT_ID, { date: '2026-04-01' } as never);

      expect(service.optimizeDaySchedule).toHaveBeenCalledWith(TENANT_ID, '2026-04-01');
      expect(result).toEqual(optimized);
    });
  });

  describe('getCapacity', () => {
    it('should delegate to service with tenantId, from, and to', async () => {
      const capacity = [{ date: '2026-04-01', utilization: 0.75 }];
      service.getCapacityForecast.mockResolvedValue(capacity as never);

      const result = await controller.getCapacity(TENANT_ID, '2026-04-01', '2026-04-07');

      expect(service.getCapacityForecast).toHaveBeenCalledWith(
        TENANT_ID,
        '2026-04-01',
        '2026-04-07',
      );
      expect(result).toEqual(capacity);
    });
  });
});
