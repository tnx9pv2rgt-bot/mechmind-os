import { Test, TestingModule } from '@nestjs/testing';
import { VehicleHistoryController } from './vehicle-history.controller';
import { VehicleHistoryService } from './vehicle-history.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';

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
        {
          provide: JwtAuthGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).overrideGuard(JwtAuthGuard).useValue({
      canActivate: jest.fn().mockReturnValue(true),
    }).compile();

    controller = module.get<VehicleHistoryController>(VehicleHistoryController);
    service = module.get(VehicleHistoryService) as jest.Mocked<VehicleHistoryService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have service injected', () => {
    expect(controller['vehicleHistoryService']).toBeDefined();
    expect(controller['vehicleHistoryService']).toBe(service);
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

    it('should propagate service errors', async () => {
      const dto = { type: 'SERVICE', date: '2026-03-01', description: 'Test' };
      service.addManualRecord.mockRejectedValueOnce(new Error('Service error'));

      await expect(controller.addManualRecord(TENANT_ID, 'veh-001', dto as never)).rejects.toThrow(
        'Service error',
      );
    });
  });

  describe('getFullHistory error handling', () => {
    it('should propagate service errors', async () => {
      service.getFullHistory.mockRejectedValueOnce(new Error('Service error'));

      await expect(controller.getFullHistory(TENANT_ID, 'veh-001')).rejects.toThrow('Service error');
    });
  });

  describe('importHistory error handling', () => {
    it('should propagate service errors', async () => {
      const dto = { source: 'MOTORNET', records: [] };
      service.importExternalHistory.mockRejectedValueOnce(new Error('Service error'));

      await expect(controller.importHistory(TENANT_ID, 'veh-001', dto as never)).rejects.toThrow(
        'Service error',
      );
    });
  });

  describe('response structure validation', () => {
    it('getFullHistory returns correct response structure', async () => {
      const history = [
        { id: 'rec-001', eventType: 'SERVICE', eventDate: new Date('2026-01-15') },
      ];
      service.getFullHistory.mockResolvedValue(history as never);

      const result = await controller.getFullHistory(TENANT_ID, 'veh-001');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('importHistory returns correct response structure with count', async () => {
      service.importExternalHistory.mockResolvedValue({ imported: 3 } as never);
      const dto = { source: 'CARFAX', records: [] };

      const result = await controller.importHistory(TENANT_ID, 'veh-001', dto as never);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('imported');
      expect(typeof result.data.imported).toBe('number');
    });

    it('addManualRecord returns correct response structure', async () => {
      const record = { id: 'rec-003', eventType: 'REPAIR', eventDate: new Date() };
      service.addManualRecord.mockResolvedValue(record as never);
      const dto = { type: 'REPAIR', date: '2026-03-01', description: 'Test' };

      const result = await controller.addManualRecord(TENANT_ID, 'veh-001', dto as never);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('tenantId isolation', () => {
    it('getFullHistory uses correct tenant context', async () => {
      service.getFullHistory.mockResolvedValue([]);

      await controller.getFullHistory(TENANT_ID, 'veh-001');

      expect(service.getFullHistory).toHaveBeenCalledWith(TENANT_ID, expect.anything());
    });

    it('importHistory uses correct tenant context', async () => {
      service.importExternalHistory.mockResolvedValue({ imported: 0 });
      const dto = { source: 'MOTORNET', records: [] };

      await controller.importHistory(TENANT_ID, 'veh-001', dto as never);

      expect(service.importExternalHistory).toHaveBeenCalledWith(TENANT_ID, expect.anything(), dto);
    });

    it('addManualRecord uses correct tenant context', async () => {
      service.addManualRecord.mockResolvedValue({} as never);
      const dto = { type: 'SERVICE', date: '2026-03-01', description: 'Test' };

      await controller.addManualRecord(TENANT_ID, 'veh-001', dto as never);

      expect(service.addManualRecord).toHaveBeenCalledWith(TENANT_ID, expect.anything(), dto);
    });
  });

  describe('edge cases and additional coverage', () => {
    it('getFullHistory with empty history list', async () => {
      service.getFullHistory.mockResolvedValue([]);

      const result = await controller.getFullHistory(TENANT_ID, 'veh-999');

      expect(result).toEqual({ success: true, data: [] });
      expect(service.getFullHistory).toHaveBeenCalledWith(TENANT_ID, 'veh-999');
    });

    it('importHistory with multiple records', async () => {
      service.importExternalHistory.mockResolvedValue({ imported: 3 });
      const dto = {
        source: 'MOTORNET',
        records: [
          { eventType: 'SERVICE', eventDate: '2025-01-01T00:00:00Z', description: 'Record 1' },
          { eventType: 'REPAIR', eventDate: '2025-02-01T00:00:00Z', description: 'Record 2' },
          { eventType: 'INSPECTION', eventDate: '2025-03-01T00:00:00Z', description: 'Record 3' },
        ],
      };

      const result = await controller.importHistory(TENANT_ID, 'veh-001', dto as never);

      expect(result).toEqual({ success: true, data: { imported: 3 } });
      expect(service.importExternalHistory).toHaveBeenCalledWith(TENANT_ID, 'veh-001', dto);
    });

    it('addManualRecord with all optional fields provided', async () => {
      const fullRecord = {
        id: 'rec-full',
        source: 'MANUAL',
        eventType: 'REPAIR',
        eventDate: new Date('2026-03-01'),
        description: 'Full repair with all fields',
        mileage: 45000,
        shopName: 'My Shop',
        costCents: 150000,
        metadata: { notes: 'test' },
        importedAt: null,
        createdAt: new Date(),
      };
      service.addManualRecord.mockResolvedValue(fullRecord as never);
      const dto = {
        type: 'REPAIR',
        date: '2026-03-01T10:00:00Z',
        description: 'Full repair with all fields',
        mileage: 45000,
        shopName: 'My Shop',
        costCents: 150000,
        metadata: { notes: 'test' },
      };

      const result = await controller.addManualRecord(TENANT_ID, 'veh-001', dto as never);

      expect(result).toEqual({ success: true, data: fullRecord });
    });

    it('getFullHistory delegates correctly to service', async () => {
      const testHistory = [
        {
          id: 'rec-1',
          eventType: 'SERVICE',
          eventDate: new Date(),
          source: 'LOCAL',
          description: 'Test',
          mileage: null,
          shopName: null,
          costCents: null,
          metadata: null,
          importedAt: null,
          createdAt: new Date(),
        },
      ];
      service.getFullHistory.mockResolvedValue(testHistory as never);

      const result = await controller.getFullHistory(TENANT_ID, 'veh-001');

      expect(service.getFullHistory).toHaveBeenCalledTimes(1);
      expect(service.getFullHistory).toHaveBeenCalledWith(TENANT_ID, 'veh-001');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(testHistory);
    });

    it('importHistory delegates correctly to service', async () => {
      service.importExternalHistory.mockResolvedValue({ imported: 2 });
      const dto = { source: 'CARFAX', records: [] };

      const result = await controller.importHistory(TENANT_ID, 'veh-001', dto as never);

      expect(service.importExternalHistory).toHaveBeenCalledTimes(1);
      expect(service.importExternalHistory).toHaveBeenCalledWith(TENANT_ID, 'veh-001', dto);
      expect(result.success).toBe(true);
    });

    it('addManualRecord delegates correctly to service', async () => {
      const record = { id: 'rec-new', source: 'MANUAL' };
      service.addManualRecord.mockResolvedValue(record as never);
      const dto = { type: 'SERVICE', date: '2026-04-01T10:00:00Z', description: 'New' };

      const result = await controller.addManualRecord(TENANT_ID, 'veh-001', dto as never);

      expect(service.addManualRecord).toHaveBeenCalledTimes(1);
      expect(service.addManualRecord).toHaveBeenCalledWith(TENANT_ID, 'veh-001', dto);
      expect(result.success).toBe(true);
    });
  });

  describe('response wrapping validation', () => {
    it('getFullHistory wraps data with success flag', async () => {
      const mockData = [{ id: 'test' }];
      service.getFullHistory.mockResolvedValue(mockData as never);

      const result = await controller.getFullHistory(TENANT_ID, 'veh-001');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data', mockData);
      expect(typeof result.success).toBe('boolean');
    });

    it('importHistory wraps count with success flag', async () => {
      service.importExternalHistory.mockResolvedValue({ imported: 5 });
      const dto = { source: 'MOTORNET', records: [] };

      const result = await controller.importHistory(TENANT_ID, 'veh-001', dto as never);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('imported', 5);
      expect(typeof result.data.imported).toBe('number');
    });

    it('addManualRecord wraps record with success flag', async () => {
      const mockRecord = { id: 'test', eventType: 'SERVICE' };
      service.addManualRecord.mockResolvedValue(mockRecord as never);
      const dto = { type: 'SERVICE', date: '2026-04-01T10:00:00Z', description: 'Test' };

      const result = await controller.addManualRecord(TENANT_ID, 'veh-001', dto as never);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data', mockRecord);
      expect(result.success).toBe(true);
    });
  });
});
