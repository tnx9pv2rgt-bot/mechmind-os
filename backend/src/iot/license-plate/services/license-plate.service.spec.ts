import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';
import { LicensePlateService } from './license-plate.service';
import { PrismaService } from '../../../common/services/prisma.service';
import { NotificationsService } from '../../../notifications/services/notifications.service';
import { S3Service } from '../../../common/services/s3.service';
import {
  OcrProvider,
  EntryExitType,
  LicensePlateDetection,
} from '../interfaces/license-plate.interface';

describe('LicensePlateService', () => {
  let service: LicensePlateService;
  let prisma: jest.Mocked<PrismaService>;
  let notifications: jest.Mocked<NotificationsService>;
  let s3Service: jest.Mocked<S3Service>;
  let redis: Record<string, jest.Mock>;

  const mockDetection: LicensePlateDetection = {
    id: 'det:123',
    imageUrl: 'https://s3.example.com/image.jpg',
    detectedText: 'AB123CD',
    confidence: 0.92,
    country: 'IT',
    boundingBox: { x: 100, y: 150, width: 200, height: 50 },
    processedAt: new Date('2026-01-01'),
    provider: OcrProvider.GOOGLE_VISION,
  };

  const mockPipelineExec = jest.fn().mockResolvedValue([]);
  const mockPipeline = {
    hincrby: jest.fn().mockReturnThis(),
    hincrbyfloat: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    exec: mockPipelineExec,
  };

  beforeEach(async () => {
    redis = {
      setex: jest.fn().mockResolvedValue('OK'),
      publish: jest.fn().mockResolvedValue(1),
      pipeline: jest.fn().mockReturnValue(mockPipeline),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicensePlateService,
        {
          provide: PrismaService,
          useValue: {
            licensePlateDetection: {
              create: jest.fn().mockResolvedValue({ id: 'det:123' }),
              findMany: jest.fn().mockResolvedValue([]),
            },
            vehicle: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
            vehicleEntryExit: {
              create: jest.fn().mockResolvedValue({
                id: 'ee:1',
                type: EntryExitType.ENTRY,
                licensePlate: 'AB123CD',
                detectionId: 'det:123',
                imageUrl: 'https://s3.example.com/image.jpg',
                confidence: 0.92,
                timestamp: new Date('2026-01-01'),
                location: null,
                cameraId: null,
                vehicleId: null,
                isAuthorized: false,
              }),
              findMany: jest.fn().mockResolvedValue([]),
            },
            parkingSession: {
              create: jest.fn().mockResolvedValue({ id: 'ps:1' }),
              findFirst: jest.fn().mockResolvedValue(null),
              findMany: jest.fn().mockResolvedValue([]),
              update: jest.fn().mockResolvedValue({ id: 'ps:1' }),
            },
            lprCamera: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn().mockResolvedValue([]),
              update: jest.fn(),
            },
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            sendToTenant: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: S3Service,
          useValue: {
            uploadBuffer: jest.fn().mockResolvedValue(undefined),
            getSignedUrlForKey: jest.fn().mockResolvedValue('https://s3.example.com/signed.jpg'),
          },
        },
        {
          provide: getRedisConnectionToken(),
          useValue: redis,
        },
      ],
    }).compile();

    service = module.get<LicensePlateService>(LicensePlateService);
    prisma = module.get(PrismaService);
    notifications = module.get(NotificationsService);
    s3Service = module.get(S3Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== detectLicensePlate ====================
  describe('detectLicensePlate', () => {
    const imageBuffer = Buffer.from('fake-image');

    it('should detect plate with Google Vision (default provider)', async () => {
      const result = await service.detectLicensePlate(imageBuffer);

      expect(s3Service.uploadBuffer).toHaveBeenCalledWith(
        imageBuffer,
        expect.stringContaining('lpr/'),
        'image/jpeg',
      );
      expect(s3Service.getSignedUrlForKey).toHaveBeenCalled();
      expect(prisma.licensePlateDetection.create).toHaveBeenCalled();
      expect(redis.setex).toHaveBeenCalledWith(
        expect.stringContaining('lpr:recent:'),
        300,
        expect.any(String),
      );
      expect(result.detectedText).toBe('AB123CD');
      expect(result.provider).toBe(OcrProvider.GOOGLE_VISION);
    });

    it('should detect plate with Azure provider', async () => {
      const result = await service.detectLicensePlate(imageBuffer, {
        provider: OcrProvider.AZURE_COMPUTER_VISION,
      });

      expect(result.provider).toBe(OcrProvider.AZURE_COMPUTER_VISION);
      expect(result.confidence).toBe(0.88);
    });

    it('should detect plate with AWS Rekognition provider', async () => {
      const result = await service.detectLicensePlate(imageBuffer, {
        provider: OcrProvider.AWS_REKOGNITION,
      });

      expect(result.provider).toBe(OcrProvider.AWS_REKOGNITION);
      expect(result.confidence).toBe(0.85);
    });

    it('should detect plate with OpenALPR provider', async () => {
      const result = await service.detectLicensePlate(imageBuffer, {
        provider: OcrProvider.OPENALPR,
      });

      expect(result.provider).toBe(OcrProvider.OPENALPR);
      expect(result.confidence).toBe(0.95);
    });

    it('should throw error for unsupported provider', async () => {
      await expect(
        service.detectLicensePlate(imageBuffer, {
          provider: 'UNKNOWN' as OcrProvider,
        }),
      ).rejects.toThrow('Unsupported OCR provider');
    });

    it('should store detection in database with tenantId', async () => {
      await service.detectLicensePlate(imageBuffer, { tenantId: 'tenant-1' });

      expect(prisma.licensePlateDetection.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
        }),
      });
    });

    it('should use default tenantId when not provided', async () => {
      await service.detectLicensePlate(imageBuffer);

      expect(prisma.licensePlateDetection.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'default',
        }),
      });
    });

    it('should pass cameraId to detection record', async () => {
      await service.detectLicensePlate(imageBuffer, { cameraId: 'cam-1' });

      expect(prisma.licensePlateDetection.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cameraId: 'cam-1',
        }),
      });
    });

    it('should update stats via Redis pipeline', async () => {
      await service.detectLicensePlate(imageBuffer);

      expect(redis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.hincrby).toHaveBeenCalled();
      expect(mockPipeline.hincrbyfloat).toHaveBeenCalled();
      expect(mockPipeline.expire).toHaveBeenCalled();
      expect(mockPipelineExec).toHaveBeenCalled();
    });
  });

  // ==================== recordEntryExit ====================
  describe('recordEntryExit', () => {
    it('should record an entry and create parking session', async () => {
      const result = await service.recordEntryExit(mockDetection, EntryExitType.ENTRY);

      expect(prisma.vehicleEntryExit.create).toHaveBeenCalled();
      expect(prisma.parkingSession.create).toHaveBeenCalled();
      expect(result.type).toBe(EntryExitType.ENTRY);
      expect(result.licensePlate).toBe('AB123CD');
    });

    it('should record an exit and close parking session', async () => {
      const mockSession = {
        id: 'ps:1',
        entryTime: new Date('2026-01-01T10:00:00Z'),
      };
      (prisma.parkingSession.findFirst as jest.Mock).mockResolvedValueOnce(mockSession);
      (prisma.vehicleEntryExit.create as jest.Mock).mockResolvedValueOnce({
        id: 'ee:2',
        type: EntryExitType.EXIT,
        licensePlate: 'AB123CD',
        detectionId: 'det:123',
        imageUrl: 'https://s3.example.com/image.jpg',
        confidence: 0.92,
        timestamp: new Date('2026-01-01'),
        location: null,
        cameraId: null,
        vehicleId: null,
        isAuthorized: false,
      });

      await service.recordEntryExit(mockDetection, EntryExitType.EXIT);

      expect(prisma.parkingSession.update).toHaveBeenCalledWith({
        where: { id: 'ps:1' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          exitId: 'ee:2',
        }),
      });
    });

    it('should set isAuthorized true when vehicle exists', async () => {
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'v-1',
        customer: { id: 'c-1', tenantId: 't-1' },
      });
      (prisma.vehicleEntryExit.create as jest.Mock).mockResolvedValueOnce({
        id: 'ee:3',
        type: EntryExitType.ENTRY,
        licensePlate: 'AB123CD',
        detectionId: 'det:123',
        imageUrl: 'https://s3.example.com/image.jpg',
        confidence: 0.92,
        timestamp: new Date('2026-01-01'),
        location: null,
        cameraId: null,
        vehicleId: 'v-1',
        isAuthorized: true,
      });

      const result = await service.recordEntryExit(mockDetection, EntryExitType.ENTRY);

      expect(result.isAuthorized).toBe(true);
    });

    it('should notify tenant for unauthorized vehicle', async () => {
      await service.recordEntryExit(mockDetection, EntryExitType.ENTRY);

      expect(notifications.sendToTenant).toHaveBeenCalledWith(
        '',
        expect.objectContaining({
          title: expect.stringContaining('Unauthorized'),
        }),
      );
    });

    it('should publish entry/exit event to Redis', async () => {
      await service.recordEntryExit(mockDetection, EntryExitType.ENTRY);

      expect(redis.publish).toHaveBeenCalledWith('lpr:entry-exit', expect.any(String));
    });

    it('should pass location and cameraId in options', async () => {
      await service.recordEntryExit(mockDetection, EntryExitType.ENTRY, {
        location: 'Gate A',
        cameraId: 'cam-1',
      });

      expect(prisma.vehicleEntryExit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          location: 'Gate A',
          cameraId: 'cam-1',
        }),
      });
    });
  });

  // ==================== lookupVehicle ====================
  describe('lookupVehicle', () => {
    it('should return vehicle data when found', async () => {
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'v-1',
        make: 'Toyota',
        model: 'Corolla',
        year: 2022,
        licensePlate: 'AB123CD',
        customer: {
          id: 'c-1',
          encryptedFirstName: 'Mario',
          encryptedLastName: 'Rossi',
          encryptedPhone: '+39123456789',
        },
        inspections: [],
      });

      const result = await service.lookupVehicle('tenant-1', 'AB123CD');

      expect(result.vehicle).toBeDefined();
      expect(result.vehicle?.make).toBe('Toyota');
      expect(result.vehicle?.customer.name).toBe('Mario Rossi');
    });

    it('should return undefined vehicle when not found', async () => {
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const result = await service.lookupVehicle('tenant-1', 'ZZ999ZZ');

      expect(result.vehicle).toBeUndefined();
    });

    it('should return recent entry/exit history', async () => {
      const historyRecords = [
        {
          id: 'ee:1',
          type: EntryExitType.ENTRY,
          licensePlate: 'AB123CD',
          detectionId: 'det:1',
          imageUrl: 'https://example.com/1.jpg',
          confidence: 0.9,
          timestamp: new Date(),
          location: 'Gate A',
          cameraId: null,
          vehicleId: null,
          isAuthorized: true,
        },
      ];
      (prisma.vehicleEntryExit.findMany as jest.Mock).mockResolvedValueOnce(historyRecords);

      const result = await service.lookupVehicle('tenant-1', 'AB123CD');

      expect(result.recentHistory).toHaveLength(1);
      expect(result.recentHistory[0].location).toBe('Gate A');
    });

    it('should return active parking session when exists', async () => {
      (prisma.parkingSession.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'ps:1',
        licensePlate: 'AB123CD',
        status: 'ACTIVE',
        entryTime: new Date('2026-01-01T08:00:00Z'),
        parkingSpotId: 'spot-A1',
      });

      const result = await service.lookupVehicle('tenant-1', 'AB123CD');

      expect(result.activeSession).toBeDefined();
      expect(result.activeSession?.status).toBe('ACTIVE');
      expect(result.activeSession?.parkingSpotId).toBe('spot-A1');
    });

    it('should normalize plate before lookup (uppercase, strip special chars)', async () => {
      await service.lookupVehicle('tenant-1', 'ab-123 cd');

      expect(prisma.vehicle.findFirst).toHaveBeenCalledWith({
        where: { licensePlate: 'AB123CD', customer: { tenantId: 'tenant-1' } },
        include: expect.anything(),
      });
    });

    it('should handle vehicle without customer gracefully', async () => {
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'v-1',
        make: 'Fiat',
        model: '500',
        year: 2020,
        licensePlate: 'AB123CD',
        customer: null,
        inspections: [],
      });

      const result = await service.lookupVehicle('tenant-1', 'AB123CD');

      expect(result.vehicle?.customer).toEqual({ id: '', name: '' });
    });
  });

  // ==================== getActiveSessions ====================
  describe('getActiveSessions', () => {
    it('should return active parking sessions', async () => {
      (prisma.parkingSession.findMany as jest.Mock).mockResolvedValueOnce([
        {
          id: 'ps:1',
          licensePlate: 'AB123CD',
          status: 'ACTIVE',
          entryTime: new Date(),
          durationMinutes: null,
          parkingSpotId: null,
          entry: {
            id: 'ee:1',
            type: EntryExitType.ENTRY,
            licensePlate: 'AB123CD',
            detectionId: 'det:1',
            imageUrl: 'https://example.com/1.jpg',
            confidence: 0.9,
            timestamp: new Date(),
            location: null,
            cameraId: null,
            vehicleId: null,
            isAuthorized: true,
          },
          vehicle: { customer: { tenantId: 't-1' } },
        },
      ]);

      const result = await service.getActiveSessions('tenant-1');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('ACTIVE');
    });

    it('should filter by tenantId when provided', async () => {
      (prisma.parkingSession.findMany as jest.Mock).mockResolvedValueOnce([]);

      await service.getActiveSessions('tenant-1');

      expect(prisma.parkingSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: 'tenant-1',
            status: 'ACTIVE',
          },
        }),
      );
    });

    it('should return empty array when no active sessions', async () => {
      (prisma.parkingSession.findMany as jest.Mock).mockResolvedValueOnce([]);

      const result = await service.getActiveSessions('tenant-1');

      expect(result).toEqual([]);
    });
  });

  // ==================== registerCamera ====================
  describe('registerCamera', () => {
    const cameraConfig = {
      name: 'Front Gate Camera',
      location: 'Main Entrance',
      direction: EntryExitType.ENTRY,
      provider: OcrProvider.GOOGLE_VISION,
      config: {
        minConfidence: 0.8,
        imageQuality: 'HIGH' as const,
        captureTrigger: 'MOTION' as const,
      },
    };

    it('should register a new camera', async () => {
      (prisma.lprCamera.create as jest.Mock).mockResolvedValueOnce({
        id: 'cam-1',
        name: 'Front Gate Camera',
        location: 'Main Entrance',
        direction: 'ENTRY',
        isActive: true,
        provider: 'GOOGLE_VISION',
        config: cameraConfig.config,
        lastCapture: null,
      });

      const result = await service.registerCamera('tenant-1', cameraConfig);

      expect(result.id).toBe('cam-1');
      expect(result.isActive).toBe(true);
      expect(prisma.lprCamera.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          name: 'Front Gate Camera',
          isActive: true,
        }),
      });
    });
  });

  // ==================== getCamera ====================
  describe('getCamera', () => {
    it('should return camera by ID', async () => {
      (prisma.lprCamera.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'cam-1',
        name: 'Test Cam',
        location: 'Gate B',
        direction: 'EXIT',
        isActive: true,
        provider: 'OPENALPR',
        config: { minConfidence: 0.7, imageQuality: 'MEDIUM', captureTrigger: 'ALWAYS' },
        lastCapture: new Date('2026-01-01'),
      });

      const result = await service.getCamera('tenant-1', 'cam-1');

      expect(result.id).toBe('cam-1');
      expect(result.direction).toBe(EntryExitType.EXIT);
      expect(result.lastCapture).toEqual(new Date('2026-01-01'));
    });

    it('should throw NotFoundException when camera not found', async () => {
      (prisma.lprCamera.findFirst as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.getCamera('tenant-1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== getCameras ====================
  describe('getCameras', () => {
    it('should return all cameras for tenant', async () => {
      (prisma.lprCamera.findMany as jest.Mock).mockResolvedValueOnce([
        {
          id: 'cam-1',
          name: 'Cam 1',
          location: 'A',
          direction: 'ENTRY',
          isActive: true,
          provider: 'GOOGLE_VISION',
          config: {},
          lastCapture: null,
        },
        {
          id: 'cam-2',
          name: 'Cam 2',
          location: 'B',
          direction: 'EXIT',
          isActive: false,
          provider: 'AWS_REKOGNITION',
          config: {},
          lastCapture: null,
        },
      ]);

      const result = await service.getCameras('tenant-1');

      expect(result).toHaveLength(2);
      expect(prisma.lprCamera.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        take: 100,
      });
    });

    it('should return empty array when no cameras', async () => {
      const result = await service.getCameras('empty-tenant');

      expect(result).toEqual([]);
    });
  });

  // ==================== updateCameraStatus ====================
  describe('updateCameraStatus', () => {
    it('should activate a camera', async () => {
      (prisma.lprCamera.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'cam-1' });
      (prisma.lprCamera.update as jest.Mock).mockResolvedValueOnce({
        id: 'cam-1',
        name: 'Cam 1',
        location: 'A',
        direction: 'ENTRY',
        isActive: true,
        provider: 'GOOGLE_VISION',
        config: {},
        lastCapture: null,
      });

      const result = await service.updateCameraStatus('tenant-1', 'cam-1', true);

      expect(result.isActive).toBe(true);
      expect(prisma.lprCamera.update).toHaveBeenCalledWith({
        where: { id: 'cam-1' },
        data: { isActive: true },
      });
    });

    it('should deactivate a camera', async () => {
      (prisma.lprCamera.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'cam-1' });
      (prisma.lprCamera.update as jest.Mock).mockResolvedValueOnce({
        id: 'cam-1',
        name: 'Cam 1',
        location: 'A',
        direction: 'ENTRY',
        isActive: false,
        provider: 'GOOGLE_VISION',
        config: {},
        lastCapture: null,
      });

      const result = await service.updateCameraStatus('tenant-1', 'cam-1', false);

      expect(result.isActive).toBe(false);
    });
  });

  // ==================== getStats ====================
  describe('getStats', () => {
    const from = new Date('2026-01-01');
    const to = new Date('2026-01-31');

    it('should return stats with detections', async () => {
      const mockDetections = [
        {
          confidence: 0.9,
          provider: OcrProvider.GOOGLE_VISION,
          processedAt: new Date('2026-01-15T10:00:00Z'),
        },
        {
          confidence: 0.8,
          provider: OcrProvider.GOOGLE_VISION,
          processedAt: new Date('2026-01-15T14:00:00Z'),
        },
        {
          confidence: 0.95,
          provider: OcrProvider.OPENALPR,
          processedAt: new Date('2026-01-15T10:00:00Z'),
        },
      ];
      (prisma.licensePlateDetection.findMany as jest.Mock).mockResolvedValueOnce(mockDetections);

      const result = await service.getStats('tenant-1', from, to);

      expect(result.totalDetections).toBe(3);
      expect(result.avgConfidence).toBeCloseTo(0.883, 2);
      expect(result.byProvider[OcrProvider.GOOGLE_VISION].count).toBe(2);
      expect(result.byProvider[OcrProvider.OPENALPR].count).toBe(1);
    });

    it('should return zero stats when no detections', async () => {
      (prisma.licensePlateDetection.findMany as jest.Mock).mockResolvedValueOnce([]);

      const result = await service.getStats('tenant-1', from, to);

      expect(result.totalDetections).toBe(0);
      expect(result.avgConfidence).toBe(0);
    });

    it('should group detections by hour', async () => {
      const date1 = new Date('2026-01-15T10:30:00Z');
      const date2 = new Date('2026-01-15T10:45:00Z');
      const date3 = new Date('2026-01-15T14:00:00Z');
      const mockDetections = [
        { confidence: 0.9, provider: OcrProvider.GOOGLE_VISION, processedAt: date1 },
        { confidence: 0.8, provider: OcrProvider.GOOGLE_VISION, processedAt: date2 },
        { confidence: 0.95, provider: OcrProvider.GOOGLE_VISION, processedAt: date3 },
      ];
      (prisma.licensePlateDetection.findMany as jest.Mock).mockResolvedValueOnce(mockDetections);

      const result = await service.getStats('tenant-1', from, to);

      // getHours() returns local time, so use the same approach as the service
      const hour1 = date1.getHours();
      const hour3 = date3.getHours();
      // eslint-disable-next-line security/detect-object-injection
      expect(result.byHour[hour1]).toBe(2);
      // eslint-disable-next-line security/detect-object-injection
      expect(result.byHour[hour3]).toBe(1);
    });
  });
});
