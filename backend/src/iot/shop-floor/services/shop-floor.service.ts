/**
 * MechMind OS - Shop Floor Service
 *
 * Real-time shop floor tracking with IoT sensors
 * - Bay occupancy detection
 * - Technician location tracking
 * - Automatic job status updates
 * - Parking management
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';
import { NotificationsService } from '../../../notifications/services/notifications.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import {
  BayStatus,
  SensorType,
  JobStatus,
  ServiceBay,
  BaySensor,
  SensorReading,
  TechnicianLocation,
  ShopFloorEvent,
  WorkOrderProgress,
} from '../interfaces/shop-floor.interface';
import { InitializeShopFloorDto } from '../dto/shop-floor.dto';

// Extended Prisma models for shop floor (to be added to schema)
// These interfaces are kept for documentation purposes when models are added to schema

@Injectable()
export class ShopFloorService {
  private readonly logger = new Logger(ShopFloorService.name);
  private activeTechnicians = new Map<string, TechnicianLocation>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * Initialize shop floor with bays and sensors
   * Note: Shop floor models need to be added to Prisma schema
   */
  async initializeShopFloor(
    tenantId: string,
    config: InitializeShopFloorDto,
  ): Promise<ServiceBay[]> {
    // Shop floor module is scaffold-only: ShopFloor, ServiceBay, ParkingSpot models need Prisma schema addition before enabling
    this.logger.warn(`Shop floor initialization for tenant ${tenantId} - models not in schema yet`);

    // Return mock bays for now
    return config.bays.map((bayConfig, index) => ({
      ...bayConfig,
      id: `bay-${index}`,
      status: BayStatus.AVAILABLE,
      sensors: [],
    }));
  }

  /**
   * Add sensor to bay
   * Note: BaySensor model needs to be added to Prisma schema
   */
  async addBaySensor(bayId: string, sensor: Omit<BaySensor, 'id'>): Promise<BaySensor> {
    this.logger.warn(`Adding sensor to bay ${bayId} - BaySensor model not in schema yet`);

    return {
      id: `sensor-${Date.now()}`,
      type: sensor.type,
      name: sensor.name,
      isActive: sensor.isActive,
      batteryLevel: sensor.batteryLevel,
      config: sensor.config,
    };
  }

  /**
   * Process sensor reading
   * Note: SensorReading model needs to be added to Prisma schema
   */
  async processSensorReading(reading: SensorReading): Promise<void> {
    this.logger.debug(`Processing sensor reading: ${reading.sensorId}`);

    // Process based on sensor type
    switch (reading.type) {
      case SensorType.ULTRASONIC:
      case SensorType.PIR:
        await this.processOccupancySensor(reading);
        break;
      case SensorType.RFID:
        await this.processRfidReading(reading);
        break;
      case SensorType.BLUETOOTH_BEACON:
        await this.processBeaconReading(reading);
        break;
      case SensorType.CAMERA:
        await this.processCameraReading(reading);
        break;
      case SensorType.PRESSURE:
        await this.processPressureReading(reading);
        break;
    }

    // Publish to real-time subscribers
    await this.redis.publish(`shopfloor:sensor:${reading.bayId}`, JSON.stringify(reading));
  }

  /**
   * Assign vehicle to bay
   * Note: ServiceBay, WorkOrder models need bay-related fields in Prisma schema
   */
  async assignVehicleToBay(
    bayId: string,
    vehicleId: string,
    workOrderId: string,
    technicianIds: string[],
  ): Promise<ServiceBay> {
    this.logger.warn(`Assigning vehicle to bay ${bayId} - Shop floor models not in schema yet`);

    // Create event
    await this.createEvent({
      type: 'BAY_ASSIGNMENT',
      timestamp: new Date(),
      bayId,
      vehicleId,
      workOrderId,
      metadata: { technicianIds },
    });

    // Invalidate cache
    await this.redis.del(`bay:${bayId}`);

    return this.getBay(bayId);
  }

  /**
   * Release bay
   */
  async releaseBay(bayId: string): Promise<ServiceBay> {
    this.logger.warn(`Releasing bay ${bayId} - Shop floor models not in schema yet`);

    // Create exit event
    await this.createEvent({
      type: 'VEHICLE_EXIT',
      timestamp: new Date(),
      bayId,
    });

    // Invalidate cache
    await this.redis.del(`bay:${bayId}`);

    return this.getBay(bayId);
  }

  /**
   * Get bay status
   */
  async getBay(bayId: string): Promise<ServiceBay> {
    const cached = await this.redis.get(`bay:${bayId}`);
    if (cached) {
      return JSON.parse(cached) as ServiceBay;
    }

    // Return mock bay for now
    const serviceBay: ServiceBay = {
      id: bayId,
      name: `Bay ${bayId}`,
      type: 'LIFT',
      status: BayStatus.AVAILABLE,
      sensors: [],
      location: { x: 0, y: 0, floor: 1 },
      capabilities: [],
      maxVehicleWeight: 5000,
    };

    await this.redis.setex(`bay:${bayId}`, 60, JSON.stringify(serviceBay));

    return serviceBay;
  }

  /**
   * Get all bays
   */
  async getAllBays(tenantId: string): Promise<ServiceBay[]> {
    this.logger.warn(
      `Getting all bays for tenant ${tenantId} - Shop floor models not in schema yet`,
    );
    return [];
  }

  /**
   * Update technician location
   * Note: Technician model needs location fields in Prisma schema
   */
  async updateTechnicianLocation(
    technicianId: string,
    location: {
      x: number;
      y: number;
      floor: number;
      beaconId: string;
    },
  ): Promise<TechnicianLocation> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: technicianId },
    });

    if (!user) {
      throw new NotFoundException('Technician not found');
    }

    const techLocation: TechnicianLocation = {
      technicianId,
      name: user.name,
      lastSeenAt: new Date(),
      location: { x: location.x, y: location.y, floor: location.floor },
      beaconId: location.beaconId,
      status: 'AVAILABLE',
    };

    this.activeTechnicians.set(technicianId, techLocation);

    // Store in Redis for real-time tracking
    await this.redis.setex(
      `technician:${technicianId}:location`,
      300, // 5 minutes TTL
      JSON.stringify(techLocation),
    );

    // Publish location update
    await this.redis.publish('shopfloor:technicians', JSON.stringify(techLocation));

    return techLocation;
  }

  /**
   * Get all active technicians
   */
  async getActiveTechnicians(tenantId: string): Promise<TechnicianLocation[]> {
    const users = await this.prisma.user.findMany({
      where: { tenantId, isActive: true },
    });

    const locations: TechnicianLocation[] = [];

    for (const user of users) {
      const cached = await this.redis.get(`technician:${user.id}:location`);
      if (cached) {
        locations.push(JSON.parse(cached) as TechnicianLocation);
      }
    }

    return locations;
  }

  /**
   * Get work order progress
   * Note: WorkOrder model needs service tracking fields in Prisma schema
   */
  async getWorkOrderProgress(workOrderId: string): Promise<WorkOrderProgress> {
    this.logger.warn(
      `Getting work order progress for ${workOrderId} - WorkOrder services not in schema yet`,
    );

    throw new NotFoundException(
      'Work order progress tracking not implemented - models not in schema',
    );
  }

  /**
   * Update job status
   */
  async updateJobStatus(workOrderId: string, status: JobStatus): Promise<WorkOrderProgress> {
    this.logger.warn(`Updating job status for ${workOrderId} - WorkOrder status not in schema yet`);

    // Create status change event
    await this.createEvent({
      type: 'STATUS_CHANGE',
      timestamp: new Date(),
      workOrderId,
      toStatus: status,
    });

    return this.getWorkOrderProgress(workOrderId);
  }

  /**
   * Get shop floor analytics
   */
  async getShopFloorAnalytics(
    tenantId: string,
    _from: Date,
    _to: Date,
  ): Promise<{
    totalVehicles: number;
    averageServiceTime: number;
    bayUtilization: Record<string, number>;
    technicianEfficiency: Record<string, number>;
  }> {
    this.logger.warn(
      `Getting shop floor analytics for tenant ${tenantId} - Shop floor models not in schema yet`,
    );

    return {
      totalVehicles: 0,
      averageServiceTime: 0,
      bayUtilization: {},
      technicianEfficiency: {},
    };
  }

  /**
   * Get recent events
   * Note: ShopFloorEvent model needs to be added to Prisma schema
   */
  async getRecentEvents(tenantId: string, _limit: number = 50): Promise<ShopFloorEvent[]> {
    this.logger.warn(
      `Getting recent events for tenant ${tenantId} - ShopFloorEvent model not in schema yet`,
    );
    return [];
  }

  // ============== PRIVATE METHODS ==============

  private async processOccupancySensor(reading: SensorReading): Promise<void> {
    this.logger.debug(`Processing occupancy sensor reading for bay ${reading.bayId}`);

    const isOccupied =
      reading.data.presence || (reading.data.distance && reading.data.distance < 50);

    if (isOccupied) {
      await this.createEvent({
        type: 'VEHICLE_ENTRY',
        timestamp: reading.timestamp,
        bayId: reading.bayId,
      });

      this.logger.log(`Vehicle entry detected in bay ${reading.bayId}`);
    }
  }

  private async processRfidReading(reading: SensorReading): Promise<void> {
    if (!reading.data.rfidTag) return;

    this.logger.debug(`Processing RFID reading: ${reading.data.rfidTag}`);

    await this.createEvent({
      type: 'VEHICLE_ENTRY',
      timestamp: reading.timestamp,
      bayId: reading.bayId,
      metadata: { rfidTag: reading.data.rfidTag },
    });
  }

  private async processBeaconReading(reading: SensorReading): Promise<void> {
    if (!reading.data.beaconId) return;

    this.logger.debug(`Processing beacon reading: ${reading.data.beaconId}`);

    // Note: beaconId field doesn't exist in user schema - would need to be added
    // For now, just log the beacon detection
    this.logger.log(`Beacon ${reading.data.beaconId} detected in bay ${reading.bayId}`);
  }

  private async processCameraReading(reading: SensorReading): Promise<void> {
    if (reading.data.licensePlate) {
      await this.createEvent({
        type: 'VEHICLE_ENTRY',
        timestamp: reading.timestamp,
        bayId: reading.bayId,
        metadata: {
          licensePlate: reading.data.licensePlate,
          confidence: reading.data.confidence,
          imageUrl: reading.data.imageUrl,
        },
      });

      this.logger.log(`License plate detected: ${reading.data.licensePlate?.slice(0, 2)}***`);
    }
  }

  private async processPressureReading(reading: SensorReading): Promise<void> {
    // Pressure sensors detect vehicle weight on lifts
    const hasWeight = reading.data.pressure && reading.data.pressure > 100;

    if (hasWeight) {
      await this.createEvent({
        type: 'VEHICLE_ENTRY',
        timestamp: reading.timestamp,
        bayId: reading.bayId,
        metadata: { pressure: reading.data.pressure },
      });
    }
  }

  private async createEvent(event: Omit<ShopFloorEvent, 'id'>): Promise<void> {
    this.logger.debug(`Creating shop floor event: ${event.type}`);

    // Publish event
    await this.redis.publish('shopfloor:events', JSON.stringify(event));
  }
}
