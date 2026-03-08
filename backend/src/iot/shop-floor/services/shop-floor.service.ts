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
  ParkingSpot,
} from '../interfaces/shop-floor.interface';
import { InitializeShopFloorDto } from '../dto/shop-floor.dto';

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
   */
  async initializeShopFloor(
    tenantId: string,
    config: InitializeShopFloorDto,
  ): Promise<ServiceBay[]> {
    const floor = await this.prisma.shopFloor.create({
      data: {
        tenantId,
        name: config.name,
      },
    });

    // Create bays
    const createdBays: ServiceBay[] = [];
    for (const bayConfig of config.bays) {
      const bay = await this.prisma.serviceBay.create({
        data: {
          shopFloorId: floor.id,
          name: bayConfig.name,
          type: bayConfig.type,
          status: BayStatus.AVAILABLE,
          locationX: bayConfig.location.x,
          locationY: bayConfig.location.y,
          floor: bayConfig.location.floor,
          capabilities: bayConfig.capabilities,
          maxVehicleWeight: bayConfig.maxVehicleWeight,
          liftCapacity: bayConfig.liftCapacity,
        },
      });

      createdBays.push({
        ...bayConfig,
        id: bay.id,
        status: BayStatus.AVAILABLE,
        sensors: [],
      });
    }

    // Create parking spots
    if (config.parkingSpots) {
      for (const spotConfig of config.parkingSpots) {
        await this.prisma.parkingSpot.create({
          data: {
            shopFloorId: floor.id,
            name: spotConfig.name,
            type: spotConfig.type,
            locationX: spotConfig.location.x,
            locationY: spotConfig.location.y,
            status: 'AVAILABLE',
          },
        });
      }
    }

    this.logger.log(`Initialized shop floor ${floor.id} with ${createdBays.length} bays`);

    return createdBays;
  }

  /**
   * Add sensor to bay
   */
  async addBaySensor(
    bayId: string,
    sensor: Omit<BaySensor, 'id'>,
  ): Promise<BaySensor> {
    const created = await this.prisma.baySensor.create({
      data: {
        bayId,
        type: sensor.type,
        name: sensor.name,
        isActive: sensor.isActive,
        batteryLevel: sensor.batteryLevel,
        config: sensor.config,
      },
    });

    return {
      id: created.id,
      type: created.type as SensorType,
      name: created.name,
      isActive: created.isActive,
      batteryLevel: created.batteryLevel || undefined,
      config: created.config as Record<string, any>,
    };
  }

  /**
   * Process sensor reading
   */
  async processSensorReading(reading: SensorReading): Promise<void> {
    // Store reading
    await this.prisma.sensorReading.create({
      data: {
        sensorId: reading.sensorId,
        bayId: reading.bayId,
        type: reading.type,
        data: reading.data,
        timestamp: reading.timestamp,
      },
    });

    // Update sensor last reading
    await this.prisma.baySensor.update({
      where: { id: reading.sensorId },
      data: { lastReading: reading.timestamp },
    });

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
    await this.redis.publish(
      `shopfloor:sensor:${reading.bayId}`,
      JSON.stringify(reading),
    );
  }

  /**
   * Assign vehicle to bay
   */
  async assignVehicleToBay(
    bayId: string,
    vehicleId: string,
    workOrderId: string,
    technicianIds: string[],
  ): Promise<ServiceBay> {
    const bay = await this.prisma.serviceBay.findUnique({
      where: { id: bayId },
      include: { sensors: true },
    });

    if (!bay) {
      throw new NotFoundException('Bay not found');
    }

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    // Update bay
    await this.prisma.serviceBay.update({
      where: { id: bayId },
      data: {
        status: BayStatus.OCCUPIED,
        currentVehicleId: vehicleId,
        currentWorkOrderId: workOrderId,
        checkInTime: new Date(),
      },
    });

    // Update work order
    await this.prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        assignedBayId: bayId,
        status: JobStatus.CHECKED_IN,
        actualStartTime: new Date(),
      },
    });

    // Assign technicians
    for (const techId of technicianIds) {
      await this.prisma.workOrderTechnician.create({
        data: {
          workOrderId,
          technicianId: techId,
          assignedAt: new Date(),
        },
      });
    }

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
    const bay = await this.prisma.serviceBay.findUnique({
      where: { id: bayId },
    });

    if (!bay) {
      throw new NotFoundException('Bay not found');
    }

    // Update work order if exists
    if (bay.currentWorkOrderId) {
      await this.prisma.workOrder.update({
        where: { id: bay.currentWorkOrderId },
        data: {
          status: JobStatus.COMPLETED,
          actualCompletionTime: new Date(),
        },
      });
    }

    // Create exit event
    await this.createEvent({
      type: 'VEHICLE_EXIT',
      timestamp: new Date(),
      bayId,
      vehicleId: bay.currentVehicleId || undefined,
      workOrderId: bay.currentWorkOrderId || undefined,
    });

    // Clear bay
    await this.prisma.serviceBay.update({
      where: { id: bayId },
      data: {
        status: BayStatus.AVAILABLE,
        currentVehicleId: null,
        currentWorkOrderId: null,
        checkInTime: null,
      },
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
      return JSON.parse(cached);
    }

    const bay = await this.prisma.serviceBay.findUnique({
      where: { id: bayId },
      include: {
        sensors: true,
        currentVehicle: true,
        currentWorkOrder: {
          include: {
            technicians: { include: { technician: true } },
          },
        },
      },
    });

    if (!bay) {
      throw new NotFoundException('Bay not found');
    }

    const serviceBay: ServiceBay = {
      id: bay.id,
      name: bay.name,
      type: bay.type as any,
      status: bay.status as BayStatus,
      currentVehicle: bay.currentVehicle ? {
        vehicleId: bay.currentVehicle.id,
        licensePlate: bay.currentVehicle.licensePlate,
        make: bay.currentVehicle.make,
        model: bay.currentVehicle.model,
        workOrderId: bay.currentWorkOrderId!,
        technicianIds: bay.currentWorkOrder?.technicians.map((t: any) => t.technicianId) || [],
        checkInTime: bay.checkInTime!,
        estimatedCompletion: bay.currentWorkOrder?.estimatedCompletion || undefined,
      } : undefined,
      sensors: bay.sensors.map((s: any) => ({
        id: s.id,
        type: s.type as SensorType,
        name: s.name,
        isActive: s.isActive,
        lastReading: s.lastReading || undefined,
        batteryLevel: s.batteryLevel || undefined,
        config: s.config as Record<string, any>,
      })),
      location: { x: bay.locationX, y: bay.locationY, floor: bay.floor },
      capabilities: bay.capabilities as string[],
      maxVehicleWeight: bay.maxVehicleWeight,
      liftCapacity: bay.liftCapacity || undefined,
    };

    await this.redis.setex(`bay:${bayId}`, 60, JSON.stringify(serviceBay));

    return serviceBay;
  }

  /**
   * Get all bays
   */
  async getAllBays(tenantId: string): Promise<ServiceBay[]> {
    const bays = await this.prisma.serviceBay.findMany({
      where: { shopFloor: { tenantId } },
      include: {
        sensors: true,
        currentVehicle: true,
        currentWorkOrder: {
          include: {
            technicians: { include: { technician: true } },
          },
        },
      },
    });

    return bays.map((bay: ServiceBay & { currentVehicle?: { id: string; licensePlate: string; make?: string; model?: string }; currentWorkOrder?: { technicians: { technicianId: string }[]; estimatedCompletion?: Date }; currentWorkOrderId?: string; checkInTime?: Date; sensors: Array<{ id: string; type: string; name: string; isActive: boolean; lastReading?: any; batteryLevel?: number; config: any }> }) => ({
      id: bay.id,
      name: bay.name,
      type: bay.type as any,
      status: bay.status as BayStatus,
      currentVehicle: bay.currentVehicle ? {
        vehicleId: bay.currentVehicle.id,
        licensePlate: bay.currentVehicle.licensePlate,
        make: bay.currentVehicle.make,
        model: bay.currentVehicle.model,
        workOrderId: bay.currentWorkOrderId!,
        technicianIds: bay.currentWorkOrder?.technicians.map((t: any) => t.technicianId) || [],
        checkInTime: bay.checkInTime!,
        estimatedCompletion: bay.currentWorkOrder?.estimatedCompletion || undefined,
      } : undefined,
      sensors: bay.sensors.map((s: any) => ({
        id: s.id,
        type: s.type as SensorType,
        name: s.name,
        isActive: s.isActive,
        lastReading: s.lastReading || undefined,
        batteryLevel: s.batteryLevel || undefined,
        config: s.config as Record<string, any>,
      })),
      location: { x: bay.locationX, y: bay.locationY, floor: bay.floor },
      capabilities: bay.capabilities as string[],
      maxVehicleWeight: bay.maxVehicleWeight,
      liftCapacity: bay.liftCapacity || undefined,
    }));
  }

  /**
   * Update technician location
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
    const technician = await this.prisma.technician.findUnique({
      where: { id: technicianId },
    });

    if (!technician) {
      throw new NotFoundException('Technician not found');
    }

    // Find nearest bay
    const nearestBay = await this.prisma.serviceBay.findFirst({
      where: {
        floor: location.floor,
        locationX: { gte: location.x - 2, lte: location.x + 2 },
        locationY: { gte: location.y - 2, lte: location.y + 2 },
      },
    });

    const techLocation: TechnicianLocation = {
      technicianId,
      name: technician.name,
      currentBayId: nearestBay?.id,
      lastSeenAt: new Date(),
      location: { x: location.x, y: location.y, floor: location.floor },
      beaconId: location.beaconId,
      status: nearestBay ? 'WORKING' : 'AVAILABLE',
    };

    this.activeTechnicians.set(technicianId, techLocation);

    // Store in Redis for real-time tracking
    await this.redis.setex(
      `technician:${technicianId}:location`,
      300, // 5 minutes TTL
      JSON.stringify(techLocation),
    );

    // Publish location update
    await this.redis.publish(
      'shopfloor:technicians',
      JSON.stringify(techLocation),
    );

    return techLocation;
  }

  /**
   * Get all active technicians
   */
  async getActiveTechnicians(tenantId: string): Promise<TechnicianLocation[]> {
    const technicians = await this.prisma.technician.findMany({
      where: { tenantId, isActive: true },
    });

    const locations: TechnicianLocation[] = [];
    
    for (const tech of technicians) {
      const cached = await this.redis.get(`technician:${tech.id}:location`);
      if (cached) {
        locations.push(JSON.parse(cached));
      } else {
        // Return offline status
        locations.push({
          technicianId: tech.id,
          name: tech.name,
          lastSeenAt: new Date(0),
          location: { x: 0, y: 0, floor: 0 },
          beaconId: '',
          status: 'OFFLINE',
        });
      }
    }

    return locations;
  }

  /**
   * Get work order progress
   */
  async getWorkOrderProgress(workOrderId: string): Promise<WorkOrderProgress> {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        vehicle: true,
        services: {
          include: { service: true },
        },
        technicians: { include: { technician: true } },
      },
    });

    if (!workOrder) {
      throw new NotFoundException('Work order not found');
    }

    const completedServices = workOrder.services.filter((s: any) => s.status === 'COMPLETED').length;
    const progressPercentage = workOrder.services.length > 0
      ? Math.round((completedServices / workOrder.services.length) * 100)
      : 0;

    return {
      workOrderId: workOrder.id,
      vehicleId: workOrder.vehicleId,
      licensePlate: workOrder.vehicle.licensePlate,
      status: workOrder.status as JobStatus,
      currentBayId: workOrder.assignedBayId || undefined,
      assignedTechnicians: workOrder.technicians.map((t: any) => t.technicianId),
      services: workOrder.services.map((s: any) => ({
        serviceId: s.serviceId,
        name: s.service.name,
        status: s.status,
        estimatedMinutes: s.estimatedMinutes,
        actualMinutes: s.actualMinutes || 0,
        technicianId: s.technicianId || undefined,
      })),
      startTime: workOrder.actualStartTime || undefined,
      estimatedCompletion: workOrder.estimatedCompletion || undefined,
      actualCompletion: workOrder.actualCompletionTime || undefined,
      progressPercentage,
    };
  }

  /**
   * Update job status
   */
  async updateJobStatus(
    workOrderId: string,
    status: JobStatus,
  ): Promise<WorkOrderProgress> {
    await this.prisma.workOrder.update({
      where: { id: workOrderId },
      data: { status },
    });

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
    from: Date,
    to: Date,
  ): Promise<{
    totalVehicles: number;
    averageServiceTime: number;
    bayUtilization: Record<string, number>;
    technicianEfficiency: Record<string, number>;
  }> {
    const workOrders = await this.prisma.workOrder.findMany({
      where: {
        tenantId,
        createdAt: { gte: from, lte: to },
        actualCompletionTime: { not: null },
      },
    });

    const totalVehicles = workOrders.length;
    
    const serviceTimes = workOrders
      .filter((wo: any) => wo.actualStartTime && wo.actualCompletionTime)
      .map((wo: any) => 
        (wo.actualCompletionTime!.getTime() - wo.actualStartTime!.getTime()) / (1000 * 60) // minutes
      );

    const averageServiceTime = serviceTimes.length > 0
      ? serviceTimes.reduce((a: number, b: number) => a + b, 0) / serviceTimes.length
      : 0;

    // Calculate bay utilization
    const bayUsage = await this.prisma.workOrder.groupBy({
      by: ['assignedBayId'],
      where: {
        tenantId,
        createdAt: { gte: from, lte: to },
      },
      _count: { id: true },
    });

    const bayUtilization: Record<string, number> = {};
    for (const usage of bayUsage) {
      if (usage.assignedBayId) {
        bayUtilization[usage.assignedBayId] = usage._count.id;
      }
    }

    return {
      totalVehicles,
      averageServiceTime,
      bayUtilization,
      technicianEfficiency: {}, // Would calculate from technician work logs
    };
  }

  /**
   * Get recent events
   */
  async getRecentEvents(
    tenantId: string,
    limit: number = 50,
  ): Promise<ShopFloorEvent[]> {
    const events = await this.prisma.shopFloorEvent.findMany({
      where: { tenantId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return events.map((e: { id: string; type: string; timestamp: Date; bayId?: string | null; vehicleId?: string | null; technicianId?: string | null; workOrderId?: string | null; fromStatus?: string | null; toStatus?: string | null; message?: string | null }) => ({
      id: e.id,
      type: e.type as any,
      timestamp: e.timestamp,
      bayId: e.bayId || undefined,
      vehicleId: e.vehicleId || undefined,
      technicianId: e.technicianId || undefined,
      workOrderId: e.workOrderId || undefined,
      fromStatus: e.fromStatus || undefined,
      toStatus: e.toStatus || undefined,
      metadata: e.metadata as Record<string, any> || undefined,
    }));
  }

  // ============== PRIVATE METHODS ==============

  private async processOccupancySensor(reading: SensorReading): Promise<void> {
    const bay = await this.prisma.serviceBay.findUnique({
      where: { id: reading.bayId },
    });

    if (!bay) return;

    const isOccupied = reading.data.presence || (reading.data.distance && reading.data.distance < 50);

    if (isOccupied && bay.status === BayStatus.AVAILABLE) {
      // Vehicle entered bay without assignment
      await this.prisma.serviceBay.update({
        where: { id: reading.bayId },
        data: { status: BayStatus.OCCUPIED },
      });

      await this.createEvent({
        type: 'VEHICLE_ENTRY',
        timestamp: reading.timestamp,
        bayId: reading.bayId,
      });

      // Notify managers
      await this.notifications.sendToTenant(bay.shopFloor.tenantId, {
        title: 'Vehicle Entered Bay',
        body: `${bay.name} is now occupied`,
        priority: 'normal',
        data: { type: 'BAY_OCCUPIED', bayId: bay.id },
      });
    } else if (!isOccupied && bay.status === BayStatus.OCCUPIED && !bay.currentVehicleId) {
      // Bay is empty again
      await this.prisma.serviceBay.update({
        where: { id: reading.bayId },
        data: { status: BayStatus.AVAILABLE },
      });
    }
  }

  private async processRfidReading(reading: SensorReading): Promise<void> {
    if (!reading.data.rfidTag) return;

    // Find vehicle by RFID tag
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { rfidTag: reading.data.rfidTag },
    });

    if (vehicle) {
      await this.createEvent({
        type: 'VEHICLE_ENTRY',
        timestamp: reading.timestamp,
        bayId: reading.bayId,
        vehicleId: vehicle.id,
        metadata: { rfidTag: reading.data.rfidTag },
      });
    }
  }

  private async processBeaconReading(reading: SensorReading): Promise<void> {
    if (!reading.data.beaconId) return;

    // Find technician by beacon
    const technician = await this.prisma.technician.findFirst({
      where: { beaconId: reading.data.beaconId },
    });

    if (technician) {
      // Get bay location
      const bay = await this.prisma.serviceBay.findUnique({
        where: { id: reading.bayId },
      });

      if (bay) {
        await this.updateTechnicianLocation(technician.id, {
          x: bay.locationX,
          y: bay.locationY,
          floor: bay.floor,
          beaconId: reading.data.beaconId,
        });
      }
    }
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
    await this.prisma.shopFloorEvent.create({
      data: {
        type: event.type,
        timestamp: event.timestamp,
        bayId: event.bayId,
        vehicleId: event.vehicleId,
        technicianId: event.technicianId,
        workOrderId: event.workOrderId,
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
        metadata: event.metadata,
      },
    });

    // Publish event
    await this.redis.publish(
      'shopfloor:events',
      JSON.stringify(event),
    );
  }
}
