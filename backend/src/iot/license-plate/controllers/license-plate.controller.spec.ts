/* eslint-disable @typescript-eslint/no-explicit-any */
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

    it('should handle exit type', async () => {
      const dto = {
        cameraId: 'cam-001',
        type: 'exit',
        location: 'rear-gate',
        isAuthorized: false,
      } as never;
      const detection = { plate: 'XY789AB', confidence: 0.88 };
      const entryExit = { id: 'ee-002', plate: 'XY789AB', type: 'exit' };
      service.detectLicensePlate.mockResolvedValue(detection as never);
      service.recordEntryExit.mockResolvedValue(entryExit as never);

      const result = await controller.recordEntryExit(TENANT_ID, dto);

      expect(service.recordEntryExit).toHaveBeenCalledWith(detection, 'exit', {
        location: 'rear-gate',
        isAuthorized: false,
        tenantId: TENANT_ID,
      });
      expect(result).toEqual(entryExit);
    });

    it('should propagate detection error', async () => {
      const dto = {
        cameraId: 'cam-bad',
        type: 'entry',
        location: 'front-gate',
        isAuthorized: true,
      } as never;
      service.detectLicensePlate.mockRejectedValue(new Error('Detection failed'));

      await expect(controller.recordEntryExit(TENANT_ID, dto)).rejects.toThrow('Detection failed');
    });

    it('should propagate recordEntryExit error', async () => {
      const dto = {
        cameraId: 'cam-001',
        type: 'entry',
        location: 'front-gate',
        isAuthorized: true,
      } as never;
      const detection = { plate: 'AB123CD', confidence: 0.95 };
      service.detectLicensePlate.mockResolvedValue(detection as never);
      service.recordEntryExit.mockRejectedValue(new Error('Recording failed'));

      await expect(controller.recordEntryExit(TENANT_ID, dto)).rejects.toThrow('Recording failed');
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

    it('should propagate service errors', async () => {
      const dto = { name: 'Bad Camera', location: 'invalid' } as never;
      service.registerCamera.mockRejectedValue(new Error('Registration failed'));

      await expect(controller.registerCamera(TENANT_ID, dto)).rejects.toThrow(
        'Registration failed',
      );
    });
  });

  describe('getCameras', () => {
    it('should delegate to service with tenantId', async () => {
      service.getCameras.mockResolvedValue([mockCamera] as never);

      const result = await controller.getCameras(TENANT_ID);

      expect(service.getCameras).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual([mockCamera]);
    });

    it('should return empty array when no cameras exist', async () => {
      service.getCameras.mockResolvedValue([] as never);

      const result = await controller.getCameras(TENANT_ID);

      expect(result).toEqual([]);
    });

    it('should propagate service errors', async () => {
      service.getCameras.mockRejectedValue(new Error('Fetch failed'));

      await expect(controller.getCameras(TENANT_ID)).rejects.toThrow('Fetch failed');
    });
  });

  describe('getCamera', () => {
    it('should delegate to service with cameraId', async () => {
      service.getCamera.mockResolvedValue(mockCamera as never);

      const result = await controller.getCamera(TENANT_ID, 'cam-001');

      expect(service.getCamera).toHaveBeenCalledWith(TENANT_ID, 'cam-001');
      expect(result).toEqual(mockCamera);
    });

    it('should handle camera not found', async () => {
      service.getCamera.mockRejectedValue(new Error('Camera not found'));

      await expect(controller.getCamera(TENANT_ID, 'cam-999')).rejects.toThrow('Camera not found');
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

    it('should handle activating camera', async () => {
      const updated = { ...mockCamera, isActive: true };
      service.updateCameraStatus.mockResolvedValue(updated as never);

      const result = await controller.updateCameraStatus(TENANT_ID, 'cam-001', true);

      expect(service.updateCameraStatus).toHaveBeenCalledWith(TENANT_ID, 'cam-001', true);
      expect(result.isActive).toBe(true);
    });

    it('should propagate service errors', async () => {
      service.updateCameraStatus.mockRejectedValue(new Error('Update failed'));

      await expect(controller.updateCameraStatus(TENANT_ID, 'cam-001', true)).rejects.toThrow(
        'Update failed',
      );
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

    it('should handle vehicle not found', async () => {
      service.lookupVehicle.mockResolvedValue(null as never);

      const result = await controller.lookupVehicle(TENANT_ID, 'NOTFOUND');

      expect(result).toBeNull();
    });

    it('should propagate service errors', async () => {
      service.lookupVehicle.mockRejectedValue(new Error('Lookup failed'));

      await expect(controller.lookupVehicle(TENANT_ID, 'AB123CD')).rejects.toThrow('Lookup failed');
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

    it('should handle undefined pagination parameters with defaults', async () => {
      const sessions: any[] = [];
      service.getActiveSessions.mockResolvedValue(sessions as never);

      await controller.getActiveSessions(TENANT_ID, undefined, undefined);

      expect(service.getActiveSessions).toHaveBeenCalledWith(TENANT_ID, { page: 1, limit: 20 });
    });

    it('should handle page 0 (falsy but not undefined)', async () => {
      const sessions: any[] = [];
      service.getActiveSessions.mockResolvedValue(sessions as never);

      await controller.getActiveSessions(TENANT_ID, 0 as never, 20);

      expect(service.getActiveSessions).toHaveBeenCalledWith(TENANT_ID, { page: 1, limit: 20 });
    });

    it('should handle limit 0 (falsy but not undefined)', async () => {
      const sessions: any[] = [];
      service.getActiveSessions.mockResolvedValue(sessions as never);

      await controller.getActiveSessions(TENANT_ID, 1, 0 as never);

      expect(service.getActiveSessions).toHaveBeenCalledWith(TENANT_ID, { page: 1, limit: 20 });
    });

    it('should apply Math.min when limit exceeds 100', async () => {
      const sessions: any[] = [];
      service.getActiveSessions.mockResolvedValue(sessions as never);

      await controller.getActiveSessions(TENANT_ID, 1, 250);

      expect(service.getActiveSessions).toHaveBeenCalledWith(TENANT_ID, { page: 1, limit: 100 });
    });

    it('should allow limit exactly at 100', async () => {
      const sessions: any[] = [];
      service.getActiveSessions.mockResolvedValue(sessions as never);

      await controller.getActiveSessions(TENANT_ID, 1, 100);

      expect(service.getActiveSessions).toHaveBeenCalledWith(TENANT_ID, { page: 1, limit: 100 });
    });

    it('should handle propagated service errors', async () => {
      service.getActiveSessions.mockRejectedValue(new Error('Database error'));

      await expect(controller.getActiveSessions(TENANT_ID)).rejects.toThrow('Database error');
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

    it('should handle different date ranges', async () => {
      const stats = { totalDetections: 500, totalEntries: 250, totalExits: 250 };
      service.getStats.mockResolvedValue(stats as never);
      const query = { from: '2026-02-01', to: '2026-02-28' } as never;

      const result = await controller.getStats(TENANT_ID, query);

      expect(service.getStats).toHaveBeenCalledWith(
        TENANT_ID,
        new Date('2026-02-01'),
        new Date('2026-02-28'),
      );
      expect(result).toEqual(stats);
    });

    it('should propagate service errors', async () => {
      const query = { from: '2026-01-01', to: '2026-03-16' } as never;
      service.getStats.mockRejectedValue(new Error('Stats calculation failed'));

      await expect(controller.getStats(TENANT_ID, query)).rejects.toThrow(
        'Stats calculation failed',
      );
    });

    it('should handle invalid date strings', async () => {
      const stats = { totalDetections: 0, totalEntries: 0, totalExits: 0 };
      service.getStats.mockResolvedValue(stats as never);
      const query = { from: 'invalid-date', to: 'also-invalid' } as never;

      const result = await controller.getStats(TENANT_ID, query);

      expect(result).toEqual(stats);
    });
  });

  describe('recordEntryExit - type validation', () => {
    it('should handle unknown entry/exit type gracefully', async () => {
      const dto = {
        cameraId: 'cam-001',
        detectionId: 'det-001',
        type: 'unknown-type' as never,
        location: 'gate',
        isAuthorized: true,
      };
      const detection = { plate: 'AB123CD', confidence: 0.95 };
      const result = { id: 'ee-001', plate: 'AB123CD', type: 'unknown-type' };
      service.detectLicensePlate.mockResolvedValue(detection as never);
      service.recordEntryExit.mockResolvedValue(result as never);

      const response = await controller.recordEntryExit(TENANT_ID, dto);

      expect(service.recordEntryExit).toHaveBeenCalledWith(detection, 'unknown-type', {
        location: 'gate',
        isAuthorized: true,
        tenantId: TENANT_ID,
      });
      expect(response).toEqual(result);
    });
  });

  describe('lookupVehicle - different plate formats', () => {
    it('should handle empty plate lookup', async () => {
      service.lookupVehicle.mockResolvedValue(null as never);

      const result = await controller.lookupVehicle(TENANT_ID, '');

      expect(service.lookupVehicle).toHaveBeenCalledWith(TENANT_ID, '');
      expect(result).toBeNull();
    });

    it('should handle special characters in plate', async () => {
      const lookup = { plate: 'TEST-123-@#$', vehicleId: 'v1', customerId: 'c1' };
      service.lookupVehicle.mockResolvedValue(lookup as never);

      const result = await controller.lookupVehicle(TENANT_ID, 'TEST-123-@#$');

      expect(service.lookupVehicle).toHaveBeenCalledWith(TENANT_ID, 'TEST-123-@#$');
      expect(result).toEqual(lookup);
    });
  });

  describe('updateCameraStatus - boundary cases', () => {
    it('should handle status change to same value (idempotent)', async () => {
      const camera = { ...mockCamera, isActive: true };
      service.updateCameraStatus.mockResolvedValue(camera as never);

      const result = await controller.updateCameraStatus(TENANT_ID, 'cam-001', true);

      expect(result.isActive).toBe(true);
    });

    it('should handle rapid status toggling', async () => {
      const activatedCamera = { ...mockCamera, isActive: true };
      const deactivatedCamera = { ...mockCamera, isActive: false };

      service.updateCameraStatus
        .mockResolvedValueOnce(deactivatedCamera as never)
        .mockResolvedValueOnce(activatedCamera as never);

      await controller.updateCameraStatus(TENANT_ID, 'cam-001', false);
      const result = await controller.updateCameraStatus(TENANT_ID, 'cam-001', true);

      expect(result.isActive).toBe(true);
      expect(service.updateCameraStatus).toHaveBeenCalledTimes(2);
    });
  });

  describe('getStats - date edge cases', () => {
    it('should handle same start and end date', async () => {
      const stats = { totalDetections: 5, totalEntries: 3, totalExits: 2 };
      service.getStats.mockResolvedValue(stats as never);
      const query = { from: '2026-03-16', to: '2026-03-16' } as never;

      const result = await controller.getStats(TENANT_ID, query);

      expect(service.getStats).toHaveBeenCalledWith(
        TENANT_ID,
        new Date('2026-03-16'),
        new Date('2026-03-16'),
      );
      expect(result).toEqual(stats);
    });

    it('should handle date range where end < start', async () => {
      const stats = { totalDetections: 0, totalEntries: 0, totalExits: 0 };
      service.getStats.mockResolvedValue(stats as never);
      const query = { from: '2026-03-20', to: '2026-03-10' } as never;

      const result = await controller.getStats(TENANT_ID, query);

      expect(result).toEqual(stats);
    });

    it('should handle undefined date query (optional)', async () => {
      const stats = { totalDetections: 100, totalEntries: 50, totalExits: 50 };
      service.getStats.mockResolvedValue(stats as never);
      const query = { from: undefined, to: undefined } as any;

      const result = await controller.getStats(TENANT_ID, query);

      // Should call with parsed dates (NaN dates or defaults)
      expect(service.getStats).toHaveBeenCalledWith(TENANT_ID, expect.any(Date), expect.any(Date));
      expect(result).toEqual(stats);
    });
  });

  describe('getCameras - empty/no results', () => {
    it('should handle service returning empty array', async () => {
      service.getCameras.mockResolvedValue([] as never);

      const result = await controller.getCameras(TENANT_ID);

      expect(service.getCameras).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('registerCamera - validation errors', () => {
    it('should propagate validation errors from service', async () => {
      const dto = { name: '', location: '' } as never;
      service.registerCamera.mockRejectedValue(new Error('Validation failed: name required'));

      await expect(controller.registerCamera(TENANT_ID, dto)).rejects.toThrow(
        'Validation failed: name required',
      );
    });
  });
});
