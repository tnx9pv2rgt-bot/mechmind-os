/**
 * MechMind OS - License Plate Recognition Service
 * 
 * OCR-based license plate detection and recognition
 * - Multi-provider support (Google Vision, Azure, AWS, OpenALPR)
 * - Entry/exit logging
 * - Vehicle lookup by plate
 * - Parking management
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';
import { NotificationsService } from '../../../notifications/services/notifications.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { S3Service } from '../../../common/services/s3.service';
import {
  OcrProvider,
  EntryExitType,
  LicensePlateDetection,
  VehicleEntryExit,
  ParkingSession,
  LprCamera,
  PlateValidationResult,
  LprStats,
} from '../interfaces/license-plate.interface';

@Injectable()
export class LicensePlateService {
  private readonly logger = new Logger(LicensePlateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly s3Service: S3Service,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * Process license plate image
   */
  async detectLicensePlate(
    imageBuffer: Buffer,
    options: {
      cameraId?: string;
      provider?: OcrProvider;
      minConfidence?: number;
    } = {},
  ): Promise<LicensePlateDetection> {
    const provider = options.provider || OcrProvider.GOOGLE_VISION;
    const minConfidence = options.minConfidence || 0.8;

    // Upload image to S3
    const imageKey = `lpr/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    await this.s3Service.uploadBuffer(imageBuffer, imageKey, 'image/jpeg');
    const imageUrl = await this.s3Service.getSignedUrl(imageKey, 3600);

    // Perform OCR based on provider
    let detection: LicensePlateDetection;
    
    switch (provider) {
      case OcrProvider.GOOGLE_VISION:
        detection = await this.detectWithGoogleVision(imageBuffer, imageUrl, provider);
        break;
      case OcrProvider.AZURE_COMPUTER_VISION:
        detection = await this.detectWithAzure(imageBuffer, imageUrl, provider);
        break;
      case OcrProvider.AWS_REKOGNITION:
        detection = await this.detectWithAws(imageBuffer, imageUrl, provider);
        break;
      case OcrProvider.OPENALPR:
        detection = await this.detectWithOpenAlpr(imageBuffer, imageUrl, provider);
        break;
      default:
        throw new Error(`Unsupported OCR provider: ${provider}`);
    }

    // Store detection
    await this.prisma.licensePlateDetection.create({
      data: {
        id: detection.id,
        imageUrl: detection.imageUrl,
        detectedText: detection.detectedText,
        confidence: detection.confidence,
        country: detection.country,
        region: detection.region,
        vehicleType: detection.vehicleType,
        boundingBox: detection.boundingBox as any,
        provider: detection.provider,
        rawResponse: detection.rawResponse as any,
        cameraId: options.cameraId,
      },
    });

    // Cache recent detection
    await this.redis.setex(
      `lpr:recent:${detection.detectedText}`,
      300, // 5 minutes
      JSON.stringify(detection),
    );

    // Update stats
    await this.updateStats(provider, detection.confidence);

    this.logger.log(`Detected plate: ${detection.detectedText} (${detection.confidence.toFixed(2)} confidence)`);

    return detection;
  }

  /**
   * Record vehicle entry/exit
   */
  async recordEntryExit(
    detection: LicensePlateDetection,
    type: EntryExitType,
    options: {
      cameraId?: string;
      location?: string;
      isAuthorized?: boolean;
    } = {},
  ): Promise<VehicleEntryExit> {
    // Validate and normalize plate
    const validation = await this.validatePlate(detection.detectedText);
    const normalizedPlate = validation.normalizedPlate;

    // Find vehicle by plate
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { licensePlate: normalizedPlate },
      include: { customer: true },
    });

    // Create entry/exit record
    const record = await this.prisma.vehicleEntryExit.create({
      data: {
        type,
        licensePlate: normalizedPlate,
        detectionId: detection.id,
        imageUrl: detection.imageUrl,
        confidence: detection.confidence,
        timestamp: new Date(),
        location: options.location,
        cameraId: options.cameraId,
        vehicleId: vehicle?.id,
        isAuthorized: options.isAuthorized ?? !!vehicle,
      },
    });

    // Handle parking session
    if (type === EntryExitType.ENTRY) {
      await this.createParkingSession(record.id, normalizedPlate, detection);
    } else {
      await this.closeParkingSession(normalizedPlate, record.id);
    }

    // Notify if unauthorized
    if (!record.isAuthorized) {
      await this.notifications.sendToTenant(vehicle?.customer?.tenantId || '', {
        title: `Unauthorized Vehicle ${type}`,
        body: `License plate: ${normalizedPlate}`,
        priority: 'normal',
        data: {
          type: 'UNAUTHORIZED_VEHICLE',
          plate: normalizedPlate,
          detectionId: detection.id,
        },
      });
    }

    // Publish event
    await this.redis.publish(
      'lpr:entry-exit',
      JSON.stringify({
        type,
        plate: normalizedPlate,
        timestamp: record.timestamp,
        vehicleId: vehicle?.id,
      }),
    );

    return {
      id: record.id,
      type: record.type as EntryExitType,
      licensePlate: record.licensePlate,
      detectionId: record.detectionId,
      imageUrl: record.imageUrl,
      confidence: record.confidence,
      timestamp: record.timestamp,
      location: record.location || undefined,
      cameraId: record.cameraId || undefined,
      vehicleId: record.vehicleId || undefined,
      isAuthorized: record.isAuthorized,
    };
  }

  /**
   * Lookup vehicle by license plate
   */
  async lookupVehicle(licensePlate: string): Promise<{
    vehicle?: any;
    recentHistory: VehicleEntryExit[];
    activeSession?: ParkingSession;
  }> {
    const validation = await this.validatePlate(licensePlate);
    const normalizedPlate = validation.normalizedPlate;

    // Find vehicle
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { licensePlate: normalizedPlate },
      include: {
        customer: true,
        workOrders: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    // Get recent entry/exit history
    const recentHistory = await this.prisma.vehicleEntryExit.findMany({
      where: { licensePlate: normalizedPlate },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    // Get active parking session
    const activeSession = await this.prisma.parkingSession.findFirst({
      where: {
        licensePlate: normalizedPlate,
        status: 'ACTIVE',
      },
    });

    return {
      vehicle,
      recentHistory: recentHistory.map((h: VehicleEntryExit) => ({
        id: h.id,
        type: h.type as EntryExitType,
        licensePlate: h.licensePlate,
        detectionId: h.detectionId,
        imageUrl: h.imageUrl,
        confidence: h.confidence,
        timestamp: h.timestamp,
        location: h.location || undefined,
        cameraId: h.cameraId || undefined,
        vehicleId: h.vehicleId || undefined,
        isAuthorized: h.isAuthorized,
      })),
      activeSession: activeSession ? {
        id: activeSession.id,
        licensePlate: activeSession.licensePlate,
        entry: {} as any, // Would populate from relation
        status: activeSession.status as any,
        entryTime: activeSession.entryTime,
        parkingSpotId: activeSession.parkingSpotId || undefined,
      } : undefined,
    };
  }

  /**
   * Get active parking sessions
   */
  async getActiveSessions(tenantId?: string): Promise<ParkingSession[]> {
    const where: any = { status: 'ACTIVE' };
    
    if (tenantId) {
      where.vehicle = { customer: { tenantId } };
    }

    const sessions = await this.prisma.parkingSession.findMany({
      where,
      include: {
        entry: true,
        vehicle: {
          include: { customer: true },
        },
      },
      orderBy: { entryTime: 'desc' },
    });

    return sessions.map((s: ParkingSession & { entry: VehicleEntryExit }) => ({
      id: s.id,
      licensePlate: s.licensePlate,
      entry: {
        id: s.entry.id,
        type: s.entry.type as EntryExitType,
        licensePlate: s.entry.licensePlate,
        detectionId: s.entry.detectionId,
        imageUrl: s.entry.imageUrl,
        confidence: s.entry.confidence,
        timestamp: s.entry.timestamp,
        location: s.entry.location || undefined,
        cameraId: s.entry.cameraId || undefined,
        vehicleId: s.entry.vehicleId || undefined,
        isAuthorized: s.entry.isAuthorized,
      },
      status: s.status as any,
      entryTime: s.entryTime,
      durationMinutes: s.durationMinutes || undefined,
      parkingSpotId: s.parkingSpotId || undefined,
    }));
  }

  /**
   * Register LPR camera
   */
  async registerCamera(
    tenantId: string,
    config: Omit<LprCamera, 'id' | 'isActive' | 'lastCapture'>,
  ): Promise<LprCamera> {
    const camera = await this.prisma.lprCamera.create({
      data: {
        tenantId,
        name: config.name,
        location: config.location,
        direction: config.direction,
        provider: config.provider,
        config: config.config as any,
        isActive: true,
      },
    });

    return {
      id: camera.id,
      name: camera.name,
      location: camera.location,
      direction: camera.direction as EntryExitType,
      isActive: camera.isActive,
      provider: camera.provider as OcrProvider,
      config: camera.config as any,
      lastCapture: camera.lastCapture || undefined,
    };
  }

  /**
   * Get camera by ID
   */
  async getCamera(cameraId: string): Promise<LprCamera> {
    const camera = await this.prisma.lprCamera.findUnique({
      where: { id: cameraId },
    });

    if (!camera) {
      throw new NotFoundException('Camera not found');
    }

    return {
      id: camera.id,
      name: camera.name,
      location: camera.location,
      direction: camera.direction as EntryExitType,
      isActive: camera.isActive,
      provider: camera.provider as OcrProvider,
      config: camera.config as any,
      lastCapture: camera.lastCapture || undefined,
    };
  }

  /**
   * Get all cameras for tenant
   */
  async getCameras(tenantId: string): Promise<LprCamera[]> {
    const cameras = await this.prisma.lprCamera.findMany({
      where: { tenantId },
    });

    return cameras.map((c: LprCamera) => ({
      id: c.id,
      name: c.name,
      location: c.location,
      direction: c.direction as EntryExitType,
      isActive: c.isActive,
      provider: c.provider as OcrProvider,
      config: c.config as any,
      lastCapture: c.lastCapture || undefined,
    }));
  }

  /**
   * Update camera status
   */
  async updateCameraStatus(
    cameraId: string,
    isActive: boolean,
  ): Promise<LprCamera> {
    const camera = await this.prisma.lprCamera.update({
      where: { id: cameraId },
      data: { isActive },
    });

    return {
      id: camera.id,
      name: camera.name,
      location: camera.location,
      direction: camera.direction as EntryExitType,
      isActive: camera.isActive,
      provider: camera.provider as OcrProvider,
      config: camera.config as any,
      lastCapture: camera.lastCapture || undefined,
    };
  }

  /**
   * Get LPR statistics
   */
  async getStats(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<LprStats> {
    const detections = await this.prisma.licensePlateDetection.findMany({
      where: {
        camera: { tenantId },
        processedAt: { gte: from, lte: to },
      },
    });

    const totalDetections = detections.length;
    const avgConfidence = totalDetections > 0
      ? detections.reduce((sum: number, d: { confidence: number }) => sum + d.confidence, 0) / totalDetections
      : 0;

    // Group by provider
    const byProvider: Record<OcrProvider, { count: number; avgConfidence: number }> = {} as any;
    for (const provider of Object.values(OcrProvider)) {
      const providerDetections = detections.filter((d: { provider: OcrProvider }) => d.provider === provider);
      byProvider[provider] = {
        count: providerDetections.length,
        avgConfidence: providerDetections.length > 0
          ? providerDetections.reduce((sum: number, d: { confidence: number }) => sum + d.confidence, 0) / providerDetections.length
          : 0,
      };
    }

    // Group by hour
    const byHour: Record<number, number> = {};
    for (const detection of detections) {
      const hour = detection.processedAt.getHours();
      byHour[hour] = (byHour[hour] || 0) + 1;
    }

    return {
      totalDetections,
      avgConfidence,
      falsePositives: 0, // Would calculate from validation feedback
      processingTimeMs: 0, // Would track actual processing time
      byProvider,
      byHour,
    };
  }

  // ============== PRIVATE METHODS ==============

  private async detectWithGoogleVision(
    imageBuffer: Buffer,
    imageUrl: string,
    provider: OcrProvider,
  ): Promise<LicensePlateDetection> {
    // Mock implementation - would use @google-cloud/vision
    // const vision = require('@google-cloud/vision');
    // const client = new vision.ImageAnnotatorClient();
    // const [result] = await client.textDetection(imageBuffer);

    // Mock detection
    return {
      id: `det:${Date.now()}`,
      imageUrl,
      detectedText: 'AB123CD',
      confidence: 0.92,
      country: 'IT',
      boundingBox: { x: 100, y: 150, width: 200, height: 50 },
      processedAt: new Date(),
      provider,
    };
  }

  private async detectWithAzure(
    imageBuffer: Buffer,
    imageUrl: string,
    provider: OcrProvider,
  ): Promise<LicensePlateDetection> {
    // Mock implementation - would use Azure Computer Vision SDK
    return {
      id: `det:${Date.now()}`,
      imageUrl,
      detectedText: 'AB123CD',
      confidence: 0.88,
      country: 'IT',
      boundingBox: { x: 100, y: 150, width: 200, height: 50 },
      processedAt: new Date(),
      provider,
    };
  }

  private async detectWithAws(
    imageBuffer: Buffer,
    imageUrl: string,
    provider: OcrProvider,
  ): Promise<LicensePlateDetection> {
    // Mock implementation - would use AWS Rekognition
    return {
      id: `det:${Date.now()}`,
      imageUrl,
      detectedText: 'AB123CD',
      confidence: 0.85,
      country: 'IT',
      boundingBox: { x: 100, y: 150, width: 200, height: 50 },
      processedAt: new Date(),
      provider,
    };
  }

  private async detectWithOpenAlpr(
    imageBuffer: Buffer,
    imageUrl: string,
    provider: OcrProvider,
  ): Promise<LicensePlateDetection> {
    // Mock implementation - would call OpenALPR API
    return {
      id: `det:${Date.now()}`,
      imageUrl,
      detectedText: 'AB123CD',
      confidence: 0.95,
      country: 'IT',
      boundingBox: { x: 100, y: 150, width: 200, height: 50 },
      processedAt: new Date(),
      provider,
    };
  }

  private async validatePlate(plate: string): Promise<PlateValidationResult> {
    // Remove spaces and special characters
    const normalized = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Basic validation rules
    const errors: string[] = [];

    if (normalized.length < 4 || normalized.length > 10) {
      errors.push('Invalid plate length');
    }

    // Try to detect country format
    let country: string | undefined;
    let state: string | undefined;

    // Italian format: AB123CD
    if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(normalized)) {
      country = 'IT';
    }
    // European format variations
    else if (/^[A-Z]{1,3}[\s-]?[A-Z0-9]{1,4}$/.test(normalized)) {
      country = 'EU';
    }

    return {
      isValid: errors.length === 0,
      normalizedPlate: normalized,
      country,
      state,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private async createParkingSession(
    entryId: string,
    licensePlate: string,
    detection: LicensePlateDetection,
  ): Promise<void> {
    await this.prisma.parkingSession.create({
      data: {
        licensePlate,
        entryId,
        status: 'ACTIVE',
        entryTime: new Date(),
      },
    });
  }

  private async closeParkingSession(
    licensePlate: string,
    exitId: string,
  ): Promise<void> {
    const session = await this.prisma.parkingSession.findFirst({
      where: {
        licensePlate,
        status: 'ACTIVE',
      },
    });

    if (session) {
      const exitTime = new Date();
      const durationMinutes = Math.floor(
        (exitTime.getTime() - session.entryTime.getTime()) / (1000 * 60)
      );

      await this.prisma.parkingSession.update({
        where: { id: session.id },
        data: {
          exitId,
          status: 'COMPLETED',
          exitTime,
          durationMinutes,
        },
      });
    }
  }

  private async updateStats(provider: OcrProvider, confidence: number): Promise<void> {
    const key = `lpr:stats:${provider}`;
    const today = new Date().toISOString().split('T')[0];
    
    const pipeline = this.redis.pipeline();
    pipeline.hincrby(`${key}:count`, today, 1);
    pipeline.hincrbyfloat(`${key}:confidence`, today, confidence);
    pipeline.expire(`${key}:count`, 86400 * 30); // 30 days
    pipeline.expire(`${key}:confidence`, 86400 * 30);
    
    await pipeline.exec();
  }
}
