import { Test, TestingModule } from '@nestjs/testing';
import { VehicleHistoryController } from './vehicle-history.controller';
import { VehicleHistoryService } from './vehicle-history.service';

describe('VehicleHistoryController', () => {
  let controller: VehicleHistoryController;
  let service: jest.Mocked<VehicleHistoryService>;

  const TENANT_ID = 'tenant-001';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VehicleHistoryController],
      providers: [
        {
          provide: VehicleHistoryService,
          useValue: {
            getFullHistory: jest.fn(),
            importExternalHistory: jest.fn(),
            addManualRecord: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<VehicleHistoryController>(VehicleHistoryController);
    service = module.get(VehicleHistoryService) as jest.Mocked<VehicleHistoryService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getFullHistory', () => {
    it('should delegate to service with tenantId and vehicleId', async () => {
      const history = [{ id: 'rec-001', type: 'OIL_CHANGE', date: '2026-01-15' }];
      service.getFullHistory.mockResolvedValue(history as never);

      const result = await controller.getFullHistory(TENANT_ID, 'veh-001');

      expect(service.getFullHistory).toHaveBeenCalledWith(TENANT_ID, 'veh-001');
      expect(result).toEqual({ success: true, data: history });
    });
  });

  describe('importHistory', () => {
    it('should delegate to service with tenantId, vehicleId, and dto', async () => {
      service.importExternalHistory.mockResolvedValue({ imported: 5 } as never);
      const dto = { source: 'CARFAX', records: [] };

      const result = await controller.importHistory(TENANT_ID, 'veh-001', dto as never);

      expect(service.importExternalHistory).toHaveBeenCalledWith(TENANT_ID, 'veh-001', dto);
      expect(result).toEqual({ success: true, data: { imported: 5 } });
    });
  });

  describe('addManualRecord', () => {
    it('should delegate to service with tenantId, vehicleId, and dto', async () => {
      const record = { id: 'rec-002', type: 'BRAKE_SERVICE' };
      service.addManualRecord.mockResolvedValue(record as never);
      const dto = { type: 'BRAKE_SERVICE', date: '2026-03-01', description: 'Pastiglie freni' };

      const result = await controller.addManualRecord(TENANT_ID, 'veh-001', dto as never);

      expect(service.addManualRecord).toHaveBeenCalledWith(TENANT_ID, 'veh-001', dto);
      expect(result).toEqual({ success: true, data: record });
    });
  });
});
