import { Test, TestingModule } from '@nestjs/testing';
import { LicensePlateController } from './license-plate.controller';
import { LicensePlateService } from '../services/license-plate.service';

describe('LicensePlateController', () => {
  let controller: LicensePlateController;
  let service: jest.Mocked<LicensePlateService>;

  const TENANT_ID = 'tenant-001';

  const mockCamera = {
    id: 'cam-001',
    name: 'Front Gate Camera',
    tenantId: TENANT_ID,
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LicensePlateController],
      providers: [
        {
          provide: LicensePlateService,
          useValue: {
            detectLicensePlate: jest.fn(),
            recordEntryExit: jest.fn(),
            registerCamera: jest.fn(),
            getCameras: jest.fn(),
            getCamera: jest.fn(),
            updateCameraStatus: jest.fn(),
            lookupVehicle: jest.fn(),
            getActiveSessions: jest.fn(),
            getStats: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<LicensePlateController>(LicensePlateController);
    service = module.get(LicensePlateService) as jest.Mocked<LicensePlateService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('detectLicensePlate', () => {
    it('should delegate to service with file buffer and options', async () => {
      const file = { buffer: Buffer.from('image-data') } as Express.Multer.File;
      const dto = { cameraId: 'cam-001', provider: 'openalpr', minConfidence: 0.8 } as never;
      const detection = { plate: 'AB123CD', confidence: 0.95 };
      service.detectLicensePlate.mockResolvedValue(detection as never);

      const result = await controller.detectLicensePlate(TENANT_ID, file, dto);

      expect(service.detectLicensePlate).toHaveBeenCalledWith(file.buffer, {
        cameraId: 'cam-001',
        provider: 'openalpr',
        minConfidence: 0.8,
        tenantId: TENANT_ID,
      });
      expect(result).toEqual(detection);
    });

    it('should handle missing optional fields in DTO', async () => {
      const file = { buffer: Buffer.from('image-data') } as Express.Multer.File;
      const dto = { cameraId: 'cam-002' } as never;
      const detection = { plate: 'XY789AB', confidence: 0.87 };
      service.detectLicensePlate.mockResolvedValue(detection as never);

      const result = await controller.detectLicensePlate(TENANT_ID, file, dto);

      expect(service.detectLicensePlate).toHaveBeenCalledWith(file.buffer, {
        cameraId: 'cam-002',
        provider: undefined,
        minConfidence: undefined,
        tenantId: TENANT_ID,
      });
      expect(result).toEqual(detection);
    });

    it('should propagate service errors', async () => {
      const file = { buffer: Buffer.from('invalid') } as Express.Multer.File;
      const dto = { cameraId: 'cam-bad' } as never;
      service.detectLicensePlate.mockRejectedValue(new Error('Detection failed'));

      await expect(controller.detectLicensePlate(TENANT_ID, file, dto)).rejects.toThrow(
        'Detection failed',
      );
    });
  });

  describe('recordEntryExit', () => {
    it('should detect plate then record entry/exit', async () => {
      const dto = {
        cameraId: 'cam-001',
        type: 'entry',
        location: 'front-gate',
        isAuthorized: true,
      } as never;
      const detection = { plate: 'AB123CD', confidence: 0.95 };
      const entryExit = { id: 'ee-001', plate: 'AB123CD', type: 'entry' };
      service.detectLicensePlate.mockResolvedValue(detection as never);
      service.recordEntryExit.mockResolvedValue(entryExit as never);

      const result = await controller.recordEntryExit(TENANT_ID, dto);

      expect(service.detectLicensePlate).toHaveBeenCalledWith(Buffer.from(''), {
        cameraId: 'cam-001',
        tenantId: TENANT_ID,
      });
      expect(service.recordEntryExit).toHaveBeenCalledWith(detection, 'entry', {
        location: 'front-gate',
        isAuthorized: true,
        tenantId: TENANT_ID,
      });
      expect(result).toEqual(entryExit);
    });
  });

  describe('registerCamera', () => {
    it('should delegate to service with tenantId and dto', async () => {
      const dto = { name: 'Front Gate Camera', location: 'entrance' } as never;
      service.registerCamera.mockResolvedValue(mockCamera as never);

      const result = await controller.registerCamera(TENANT_ID, dto);

      expect(service.registerCamera).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual(mockCamera);
    });
  });

  describe('getCameras', () => {
    it('should delegate to service with tenantId', async () => {
      service.getCameras.mockResolvedValue([mockCamera] as never);

      const result = await controller.getCameras(TENANT_ID);

      expect(service.getCameras).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual([mockCamera]);
    });
  });

  describe('getCamera', () => {
    it('should delegate to service with cameraId', async () => {
      service.getCamera.mockResolvedValue(mockCamera as never);

      const result = await controller.getCamera(TENANT_ID, 'cam-001');

      expect(service.getCamera).toHaveBeenCalledWith(TENANT_ID, 'cam-001');
      expect(result).toEqual(mockCamera);
    });
  });

  describe('updateCameraStatus', () => {
    it('should delegate to service with cameraId and isActive flag', async () => {
      const updated = { ...mockCamera, isActive: false };
      service.updateCameraStatus.mockResolvedValue(updated as never);

      const result = await controller.updateCameraStatus(TENANT_ID, 'cam-001', false);

      expect(service.updateCameraStatus).toHaveBeenCalledWith(TENANT_ID, 'cam-001', false);
      expect(result).toEqual(updated);
    });
  });

  describe('lookupVehicle', () => {
    it('should delegate to service with plate number', async () => {
      const lookup = { plate: 'AB123CD', vehicleId: 'vehicle-001', customerId: 'cust-001' };
      service.lookupVehicle.mockResolvedValue(lookup as never);

      const result = await controller.lookupVehicle(TENANT_ID, 'AB123CD');

      expect(service.lookupVehicle).toHaveBeenCalledWith(TENANT_ID, 'AB123CD');
      expect(result).toEqual(lookup);
    });
  });

  describe('getActiveSessions', () => {
    it('should delegate to service with tenantId', async () => {
      const sessions = [{ id: 'session-001', plate: 'AB123CD', enteredAt: new Date() }];
      service.getActiveSessions.mockResolvedValue(sessions as never);

      const result = await controller.getActiveSessions(TENANT_ID);

      expect(service.getActiveSessions).toHaveBeenCalledWith(TENANT_ID, { page: 1, limit: 20 });
      expect(result).toEqual(sessions);
    });

    it('should respect custom pagination parameters', async () => {
      const sessions: any[] = [];
      service.getActiveSessions.mockResolvedValue(sessions as never);

      await controller.getActiveSessions(TENANT_ID, 2, 50);

      expect(service.getActiveSessions).toHaveBeenCalledWith(TENANT_ID, { page: 2, limit: 50 });
    });

    it('should cap limit at 100', async () => {
      const sessions: any[] = [];
      service.getActiveSessions.mockResolvedValue(sessions as never);

      await controller.getActiveSessions(TENANT_ID, 1, 200);

      expect(service.getActiveSessions).toHaveBeenCalledWith(TENANT_ID, { page: 1, limit: 100 });
    });

    it('should handle string pagination parameters', async () => {
      const sessions: any[] = [];
      service.getActiveSessions.mockResolvedValue(sessions as never);

      await controller.getActiveSessions(TENANT_ID, '3' as never, '30' as never);

      expect(service.getActiveSessions).toHaveBeenCalledWith(TENANT_ID, { page: 3, limit: 30 });
    });
  });

  describe('getStats', () => {
    it('should delegate to service with tenantId and parsed dates', async () => {
      const stats = { totalDetections: 150, totalEntries: 80, totalExits: 70 };
      service.getStats.mockResolvedValue(stats as never);
      const query = { from: '2026-01-01', to: '2026-03-16' } as never;

      const result = await controller.getStats(TENANT_ID, query);

      expect(service.getStats).toHaveBeenCalledWith(
        TENANT_ID,
        new Date('2026-01-01'),
        new Date('2026-03-16'),
      );
      expect(result).toEqual(stats);
    });
  });
});
