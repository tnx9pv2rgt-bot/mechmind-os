import { Test, TestingModule } from '@nestjs/testing';
import { ObdController } from './obd.controller';
import { ObdService } from '../services/obd.service';

describe('ObdController', () => {
  let controller: ObdController;
  let service: jest.Mocked<ObdService>;

  const TENANT_ID = 'tenant-001';
  const USER_ID = 'user-001';

  const mockDevice = {
    id: 'dev-001',
    tenantId: TENANT_ID,
    vehicleId: 'veh-001',
    serialNumber: 'OBD-123',
    status: 'ACTIVE',
  };

  const mockReading = {
    id: 'read-001',
    deviceId: 'dev-001',
    rpm: 3000,
    speed: 60,
    coolantTemp: 90,
    timestamp: new Date(),
  };

  const mockTroubleCode = {
    id: 'tc-001',
    deviceId: 'dev-001',
    code: 'P0301',
    description: 'Cylinder 1 Misfire',
    active: true,
  };

  const mockHealthReport = {
    vehicleId: 'veh-001',
    overallScore: 85,
    issues: [],
    lastReading: mockReading,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ObdController],
      providers: [
        {
          provide: ObdService,
          useValue: {
            registerDevice: jest.fn(),
            listDevices: jest.fn(),
            getDevice: jest.fn(),
            updateDevice: jest.fn(),
            recordReading: jest.fn(),
            recordTroubleCodes: jest.fn(),
            getReadings: jest.fn(),
            getLatestReading: jest.fn(),
            getTroubleCodes: jest.fn(),
            clearTroubleCodes: jest.fn(),
            generateHealthReport: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ObdController>(ObdController);
    service = module.get(ObdService) as jest.Mocked<ObdService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('registerDevice', () => {
    it('should delegate to service with tenantId and dto', async () => {
      service.registerDevice.mockResolvedValue(mockDevice as never);
      const dto = { serialNumber: 'OBD-123', vehicleId: 'veh-001' };

      const result = await controller.registerDevice(TENANT_ID, dto as never);

      expect(service.registerDevice).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual(mockDevice);
    });
  });

  describe('listDevices', () => {
    it('should delegate to service with tenantId and optional vehicleId', async () => {
      service.listDevices.mockResolvedValue([mockDevice] as never);

      const result = await controller.listDevices(TENANT_ID, 'veh-001');

      expect(service.listDevices).toHaveBeenCalledWith(TENANT_ID, 'veh-001');
      expect(result).toEqual([mockDevice]);
    });

    it('should pass undefined when vehicleId not provided', async () => {
      service.listDevices.mockResolvedValue([] as never);

      await controller.listDevices(TENANT_ID);

      expect(service.listDevices).toHaveBeenCalledWith(TENANT_ID, undefined);
    });
  });

  describe('getDevice', () => {
    it('should delegate to service with tenantId and id', async () => {
      service.getDevice.mockResolvedValue(mockDevice as never);

      const result = await controller.getDevice(TENANT_ID, 'dev-001');

      expect(service.getDevice).toHaveBeenCalledWith(TENANT_ID, 'dev-001');
      expect(result).toEqual(mockDevice);
    });
  });

  describe('updateDevice', () => {
    it('should delegate to service with tenantId, id, and dto', async () => {
      const updated = { ...mockDevice, status: 'INACTIVE' };
      service.updateDevice.mockResolvedValue(updated as never);
      const dto = { status: 'INACTIVE' };

      const result = await controller.updateDevice(TENANT_ID, 'dev-001', dto as never);

      expect(service.updateDevice).toHaveBeenCalledWith(TENANT_ID, 'dev-001', dto);
      expect(result).toEqual(updated);
    });
  });

  describe('recordReading', () => {
    it('should delegate to service with dto and tenantId', async () => {
      service.recordReading.mockResolvedValue(mockReading as never);
      const dto = { deviceId: 'dev-001', rpm: 3000, speed: 60 };

      const result = await controller.recordReading(TENANT_ID, dto as never);

      expect(service.recordReading).toHaveBeenCalledWith(dto, TENANT_ID);
      expect(result).toEqual(mockReading);
    });
  });

  describe('recordTroubleCodes', () => {
    it('should delegate to service with deviceId, codes, and tenantId', async () => {
      service.recordTroubleCodes.mockResolvedValue(undefined);
      const codes = [{ code: 'P0301', description: 'Cylinder 1 Misfire' }];

      await controller.recordTroubleCodes(TENANT_ID, 'dev-001', codes as never);

      expect(service.recordTroubleCodes).toHaveBeenCalledWith('dev-001', codes, TENANT_ID);
    });
  });

  describe('getReadings', () => {
    it('should delegate to service with tenantId and parsed query', async () => {
      service.getReadings.mockResolvedValue([mockReading] as never);
      const query = {
        deviceId: 'dev-001',
        vehicleId: 'veh-001',
        from: '2026-01-01',
        to: '2026-12-31',
        limit: 100,
      };

      const result = await controller.getReadings(TENANT_ID, query as never);

      expect(service.getReadings).toHaveBeenCalledWith(TENANT_ID, {
        deviceId: 'dev-001',
        vehicleId: 'veh-001',
        from: new Date('2026-01-01'),
        to: new Date('2026-12-31'),
        limit: 100,
      });
      expect(result).toEqual([mockReading]);
    });

    it('should pass undefined dates when not provided', async () => {
      service.getReadings.mockResolvedValue([] as never);
      const query = { deviceId: 'dev-001' };

      await controller.getReadings(TENANT_ID, query as never);

      expect(service.getReadings).toHaveBeenCalledWith(TENANT_ID, {
        deviceId: 'dev-001',
        vehicleId: undefined,
        from: undefined,
        to: undefined,
        limit: undefined,
      });
    });
  });

  describe('getLatestReading', () => {
    it('should delegate to service with tenantId and deviceId', async () => {
      service.getLatestReading.mockResolvedValue(mockReading as never);

      const result = await controller.getLatestReading(TENANT_ID, 'dev-001');

      expect(service.getLatestReading).toHaveBeenCalledWith(TENANT_ID, 'dev-001');
      expect(result).toEqual(mockReading);
    });
  });

  describe('getTroubleCodes', () => {
    it('should delegate to service with tenantId and filters', async () => {
      service.getTroubleCodes.mockResolvedValue([mockTroubleCode] as never);

      const result = await controller.getTroubleCodes(TENANT_ID, 'dev-001', 'veh-001', 'true');

      expect(service.getTroubleCodes).toHaveBeenCalledWith(TENANT_ID, {
        deviceId: 'dev-001',
        vehicleId: 'veh-001',
        active: true,
      });
      expect(result).toEqual([mockTroubleCode]);
    });

    it('should pass undefined active when not provided', async () => {
      service.getTroubleCodes.mockResolvedValue([] as never);

      await controller.getTroubleCodes(TENANT_ID);

      expect(service.getTroubleCodes).toHaveBeenCalledWith(TENANT_ID, {
        deviceId: undefined,
        vehicleId: undefined,
        active: undefined,
      });
    });
  });

  describe('clearTroubleCodes', () => {
    it('should delegate to service with tenantId, deviceId, dto and userId', async () => {
      service.clearTroubleCodes.mockResolvedValue(undefined);
      const dto = { codeIds: ['tc-001'] };

      await controller.clearTroubleCodes(TENANT_ID, USER_ID, 'dev-001', dto as never);

      expect(service.clearTroubleCodes).toHaveBeenCalledWith(TENANT_ID, 'dev-001', {
        ...dto,
        clearedBy: USER_ID,
      });
    });
  });

  describe('getHealthReport', () => {
    it('should delegate to service with tenantId and vehicleId', async () => {
      service.generateHealthReport.mockResolvedValue(mockHealthReport as never);

      const result = await controller.getHealthReport(TENANT_ID, 'veh-001');

      expect(service.generateHealthReport).toHaveBeenCalledWith(TENANT_ID, 'veh-001');
      expect(result).toEqual(mockHealthReport);
    });
  });
});
