/**
 * MechMind OS - Vehicle Twin Service
 * 
 * Digital twin for vehicle visualization and predictive maintenance
 * - 3D model management
 * - Component health tracking
 * - Historical repair visualization
 * - Predictive failure alerts
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';
import { NotificationsService } from '../../../notifications/services/notifications.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import {
  VehicleComponent,
  ComponentHistory,
  PredictiveAlert,
  DamageRecord,
  VehicleTwinState,
  TwinVisualizationConfig,
  ComponentWearPrediction,
} from '../interfaces/vehicle-twin.interface';

@Injectable()
export class VehicleTwinService {
  private readonly logger = new Logger(VehicleTwinService.name);

  // Component lifespan estimates (in km) by category
  private readonly LIFESPAN_ESTIMATES: Record<string, { min: number; max: number }> = {
    BRAKES: { min: 20000, max: 60000 },
    TIRES: { min: 40000, max: 80000 },
    BATTERY: { min: 40000, max: 80000 },
    TRANSMISSION_FLUID: { min: 60000, max: 100000 },
    ENGINE_OIL: { min: 10000, max: 15000 },
    SPARK_PLUGS: { min: 30000, max: 100000 },
    AIR_FILTER: { min: 15000, max: 30000 },
    FUEL_FILTER: { min: 30000, max: 60000 },
    TIMING_BELT: { min: 100000, max: 150000 },
    SUSPENSION: { min: 80000, max: 150000 },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * Initialize or get vehicle twin
   */
  async getOrCreateTwin(vehicleId: string): Promise<VehicleTwinState> {
    // Check cache first
    const cached = await this.redis.get(`twin:${vehicleId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get vehicle data
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        customer: true,
        obdDevices: {
          include: {
            readings: { orderBy: { recordedAt: 'desc' }, take: 1 },
            dtcs: { where: { isActive: true } },
          },
        },
        workOrders: {
          include: {
            services: true,
            parts: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    // Build twin state
    const twin = await this.buildTwinState(vehicle);

    // Cache for 5 minutes
    await this.redis.setex(`twin:${vehicleId}`, 300, JSON.stringify(twin));

    return twin;
  }

  /**
   * Update component status
   */
  async updateComponentStatus(
    vehicleId: string,
    componentId: string,
    update: {
      status?: VehicleComponent['status'];
      healthScore?: number;
      metadata?: Record<string, any>;
    },
  ): Promise<VehicleComponent> {
    // Update in database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.prisma.vehicleTwinComponent.upsert as any)({
      where: { id: componentId },
      create: {
        vehicleId,
        name: componentId,
        category: 'ENGINE',
        status: update.status || 'HEALTHY',
        condition: update.healthScore ?? 100,
      },
      update: {
        ...(update.status && { status: update.status }),
        ...(update.healthScore !== undefined && { condition: update.healthScore }),
        updatedAt: new Date(),
      },
    });

    // Invalidate cache
    await this.redis.del(`twin:${vehicleId}`);

    return this.getComponent(vehicleId, componentId);
  }

  /**
   * Record component history event
   */
  async recordComponentHistory(
    vehicleId: string,
    history: Omit<ComponentHistory, 'id'>,
  ): Promise<ComponentHistory> {
    const record = await (this.prisma.componentHistory.create as any)({
      data: {
        vehicleId,
        componentId: history.componentId,
        eventType: history.eventType,
        date: history.date,
        description: history.description,
        technicianId: history.technicianId,
        cost: history.cost,
        partsUsed: history.partsUsed || [],
        photos: history.photos || [],
        documents: history.documents || [],
        odometer: history.odometer,
      },
    });

    // Update component status based on event type
    const status = this.mapEventTypeToStatus(history.eventType);
    await this.updateComponentStatus(vehicleId, history.componentId, {
      status,
      metadata: {
        lastServiceDate: history.date,
      },
    });

    // Invalidate cache
    await this.redis.del(`twin:${vehicleId}`);

    return {
      id: record.id,
      ...history,
    };
  }

  /**
   * Record damage
   */
  async recordDamage(
    vehicleId: string,
    damage: Omit<DamageRecord, 'id'>,
  ): Promise<DamageRecord> {
    const record = await (this.prisma.vehicleDamage.create as any)({
      data: {
        vehicleId,
        componentId: damage.componentId,
        type: damage.type,
        severity: damage.severity,
        description: damage.description,
        locationX: damage.location.x,
        locationY: damage.location.y,
        locationZ: damage.location.z,
        photos: damage.photos,
        reportedAt: damage.reportedAt,
        repairCost: damage.repairCost,
      },
    });

    // Update component health based on damage
    const healthImpact = this.calculateDamageHealthImpact(damage.type, damage.severity);
    const component = await this.getComponent(vehicleId, damage.componentId);
    
    await this.updateComponentStatus(vehicleId, damage.componentId, {
      status: damage.severity === 'SEVERE' ? 'CRITICAL' : 'WARNING',
      healthScore: Math.max(0, component.healthScore - healthImpact),
    });

    // Invalidate cache
    await this.redis.del(`twin:${vehicleId}`);

    return {
      id: record.id,
      ...damage,
    };
  }

  /**
   * Get predictive alerts for vehicle
   */
  async getPredictiveAlerts(vehicleId: string): Promise<PredictiveAlert[]> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        workOrders: {
          include: { services: true },
          orderBy: { createdAt: 'desc' },
        },
        obdDevices: {
          include: {
            readings: { orderBy: { recordedAt: 'desc' }, take: 100 },
            dtcs: { where: { isActive: true } },
          },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return this.generatePredictiveAlerts(vehicle);
  }

  /**
   * Get component wear prediction
   */
  async getWearPrediction(
    vehicleId: string,
    componentId: string,
  ): Promise<ComponentWearPrediction> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        workOrders: {
          where: {
            services: {
              some: {
                relatedComponentId: componentId,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        obdDevices: {
          include: {
            readings: { orderBy: { recordedAt: 'desc' }, take: 50 },
          },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    const component = await this.getComponent(vehicleId, componentId);
    
    return this.predictComponentWear(component, vehicle);
  }

  /**
   * Get or create 3D visualization config
   */
  async getVisualizationConfig(vehicleId: string): Promise<TwinVisualizationConfig> {
    const cached = await this.redis.get(`twin:config:${vehicleId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { twinConfig: true },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    // Default config based on make/model
    const config: TwinVisualizationConfig = (vehicle.twinConfig as any) || {
      vehicleId,
      modelFormat: 'GLB',
      modelUrl: `/models/vehicles/${vehicle.make.toLowerCase()}_${vehicle.model.toLowerCase()}.glb`,
      componentMappings: this.getDefaultComponentMappings(),
      defaultCameraPosition: { x: 3, y: 2, z: 3 },
      hotspots: [],
    };

    await this.redis.setex(`twin:config:${vehicleId}`, 3600, JSON.stringify(config));

    return config;
  }

  /**
   * Update visualization config
   */
  async updateVisualizationConfig(
    vehicleId: string,
    config: Partial<TwinVisualizationConfig>,
  ): Promise<TwinVisualizationConfig> {
    await (this.prisma.vehicleTwinConfig.upsert as any)({
      where: { vehicleId },
      create: {
        vehicleId,
        modelFormat: config.modelFormat || 'GLB',
        modelUrl: config.modelUrl || '',
        componentMappings: config.componentMappings || [],
        defaultCameraPosition: config.defaultCameraPosition || { x: 3, y: 2, z: 3 },
        hotspots: config.hotspots || [],
      },
      update: {
        ...(config.modelFormat && { modelFormat: config.modelFormat }),
        ...(config.modelUrl && { modelUrl: config.modelUrl }),
        ...(config.componentMappings && { componentMappings: config.componentMappings }),
        ...(config.defaultCameraPosition && { defaultCameraPosition: config.defaultCameraPosition }),
        ...(config.hotspots && { hotspots: config.hotspots }),
      },
    });

    // Invalidate cache
    await this.redis.del(`twin:config:${vehicleId}`);

    return this.getVisualizationConfig(vehicleId);
  }

  /**
   * Get health trend over time
   */
  async getHealthTrend(
    vehicleId: string,
    from: Date,
    to: Date,
  ): Promise<{ date: Date; overallHealth: number; componentHealth: Record<string, number> }[]> {
    const history = await (this.prisma.vehicleHealthHistory.findMany as any)({
      where: {
        vehicleId,
        recordedAt: { gte: from, lte: to },
      },
      orderBy: { recordedAt: 'asc' },
    });

    return history.map((h: { recordedAt: Date; overallHealth: number; componentHealth: any }) => ({
      date: h.recordedAt,
      overallHealth: h.overallHealth,
      componentHealth: h.componentHealth as Record<string, number>,
    }));
  }

  // ============== PRIVATE METHODS ==============

  private async buildTwinState(vehicle: any): Promise<VehicleTwinState> {
    // Get or initialize components
    const components = await this.getOrInitializeComponents(vehicle);
    
    // Get component history
    const history = await (this.prisma.componentHistory.findMany as any)({
      where: { vehicleId: vehicle.id },
      orderBy: { date: 'desc' },
      take: 20,
    });

    // Get damage records
    const damageRecords = await (this.prisma.vehicleDamage.findMany as any)({
      where: { vehicleId: vehicle.id },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate overall health
    const overallHealth = this.calculateOverallHealth(components);

    // Generate predictive alerts
    const activeAlerts = await this.generatePredictiveAlerts(vehicle);

    // Get latest OBD reading for mileage/hours
    const latestReading = vehicle.obdDevices
      .flatMap((d: any) => d.readings)
      .sort((a: any, b: any) => b.recordedAt.getTime() - a.recordedAt.getTime())[0];

    return {
      vehicleId: vehicle.id,
      vin: vehicle.vin,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      overallHealth,
      lastUpdated: new Date(),
      components,
      activeAlerts,
      recentHistory: history.map((h: { id: string; componentId: string; eventType: string; date: Date; description?: string | null; technicianId?: string | null; cost?: number | null; partsUsed: any; photos: any; documents: any; odometer?: number | null }) => ({
        id: h.id,
        componentId: h.componentId,
        eventType: h.eventType as any,
        date: h.date,
        description: h.description,
        technicianId: h.technicianId || undefined,
        cost: h.cost || undefined,
        partsUsed: h.partsUsed as string[],
        photos: h.photos as string[],
        documents: h.documents as string[],
        odometer: h.odometer || undefined,
      })),
      damageRecords: damageRecords.map((d: { id: string; componentId: string; type: string; severity: string; description: string; locationX: number; locationY: number; locationZ: number; photos: any; reportedAt: Date; repairedAt?: Date | null; repairCost?: number | null }) => ({
        id: d.id,
        componentId: d.componentId,
        type: d.type as any,
        severity: d.severity as any,
        description: d.description,
        location: { x: d.locationX, y: d.locationY, z: d.locationZ },
        photos: d.photos as string[],
        reportedAt: d.reportedAt,
        repairedAt: d.repairedAt || undefined,
        repairCost: d.repairCost || undefined,
      })),
      mileage: latestReading?.distance || 0,
      engineHours: latestReading?.runTime || 0,
    };
  }

  private async getOrInitializeComponents(vehicle: any): Promise<VehicleComponent[]> {
    const existing = await (this.prisma.vehicleTwinComponent.findMany as any)({
      where: { vehicleId: vehicle.id },
    });

    if (existing.length > 0) {
      return existing.map((c: { componentId: string; name: string; category: string; status: string; healthScore: number; lastServiceDate?: Date | null; nextServiceDue?: Date | null; estimatedLifespan?: number | null; positionX: number; positionY: number; positionZ: number; modelPartId?: string | null; metadata: any }) => ({
        id: c.componentId,
        name: c.name,
        category: c.category as any,
        status: c.status as any,
        healthScore: c.healthScore,
        lastServiceDate: c.lastServiceDate || undefined,
        nextServiceDue: c.nextServiceDue || undefined,
        estimatedLifespan: c.estimatedLifespan || undefined,
        position: { x: c.positionX, y: c.positionY, z: c.positionZ },
        modelPartId: c.modelPartId || undefined,
        metadata: c.metadata as Record<string, any>,
      }));
    }

    // Initialize default components
    const defaultComponents = this.getDefaultComponents(vehicle);
    
    await (this.prisma.vehicleTwinComponent.createMany as any)({
      data: defaultComponents.map(c => ({
        vehicleId: vehicle.id,
        componentId: c.id,
        name: c.name,
        category: c.category,
        status: c.status,
        healthScore: c.healthScore,
        positionX: c.position.x,
        positionY: c.position.y,
        positionZ: c.position.z,
        modelPartId: c.modelPartId,
        metadata: c.metadata,
      })),
    });

    return defaultComponents;
  }

  private getDefaultComponents(vehicle: any): VehicleComponent[] {
    // Default vehicle component structure
    return [
      {
        id: 'engine',
        name: 'Engine',
        category: 'ENGINE',
        status: 'HEALTHY',
        healthScore: 100,
        position: { x: 0, y: 0.5, z: 1.5 },
        metadata: { type: 'main' },
      },
      {
        id: 'transmission',
        name: 'Transmission',
        category: 'TRANSMISSION',
        status: 'HEALTHY',
        healthScore: 100,
        position: { x: 0, y: 0.3, z: 0.8 },
        metadata: { type: 'automatic' },
      },
      {
        id: 'brakes_front',
        name: 'Front Brakes',
        category: 'BRAKES',
        status: 'HEALTHY',
        healthScore: 100,
        position: { x: 0.8, y: 0.2, z: 2.2 },
        metadata: { type: 'disc' },
      },
      {
        id: 'brakes_rear',
        name: 'Rear Brakes',
        category: 'BRAKES',
        status: 'HEALTHY',
        healthScore: 100,
        position: { x: 0.8, y: 0.2, z: -1.2 },
        metadata: { type: 'disc' },
      },
      {
        id: 'suspension_front',
        name: 'Front Suspension',
        category: 'SUSPENSION',
        status: 'HEALTHY',
        healthScore: 100,
        position: { x: 0.7, y: 0.1, z: 2.0 },
        metadata: { type: 'independent' },
      },
      {
        id: 'suspension_rear',
        name: 'Rear Suspension',
        category: 'SUSPENSION',
        status: 'HEALTHY',
        healthScore: 100,
        position: { x: 0.7, y: 0.1, z: -1.0 },
        metadata: { type: 'independent' },
      },
      {
        id: 'battery',
        name: 'Battery',
        category: 'ELECTRICAL',
        status: 'HEALTHY',
        healthScore: 100,
        position: { x: -0.5, y: 0.4, z: 2.0 },
        metadata: { voltage: 12.6 },
      },
      {
        id: 'alternator',
        name: 'Alternator',
        category: 'ELECTRICAL',
        status: 'HEALTHY',
        healthScore: 100,
        position: { x: -0.3, y: 0.4, z: 1.8 },
        metadata: { output: '14V' },
      },
      {
        id: 'fuel_system',
        name: 'Fuel System',
        category: 'FUEL',
        status: 'HEALTHY',
        healthScore: 100,
        position: { x: 0, y: 0.3, z: 0.5 },
        metadata: { type: 'injection' },
      },
      {
        id: 'exhaust',
        name: 'Exhaust System',
        category: 'EXHAUST',
        status: 'HEALTHY',
        healthScore: 100,
        position: { x: 0, y: 0.2, z: -2.0 },
        metadata: { hasCatalytic: true },
      },
    ];
  }

  private async getComponent(
    vehicleId: string,
    componentId: string,
  ): Promise<VehicleComponent> {
    const component = await (this.prisma.vehicleTwinComponent.findUnique as any)({
      where: {
        vehicleId_componentId: {
          vehicleId,
          componentId,
        },
      },
    });

    if (!component) {
      throw new NotFoundException('Component not found');
    }

    return {
      id: component.componentId,
      name: component.name,
      category: component.category as any,
      status: component.status as any,
      healthScore: component.healthScore,
      lastServiceDate: component.lastServiceDate || undefined,
      nextServiceDue: component.nextServiceDue || undefined,
      estimatedLifespan: component.estimatedLifespan || undefined,
      position: { x: component.positionX, y: component.positionY, z: component.positionZ },
      modelPartId: component.modelPartId || undefined,
      metadata: component.metadata as Record<string, any>,
    };
  }

  private calculateOverallHealth(components: VehicleComponent[]): number {
    if (components.length === 0) return 100;
    
    const totalScore = components.reduce((sum, c) => sum + c.healthScore, 0);
    return Math.round(totalScore / components.length);
  }

  private async generatePredictiveAlerts(vehicle: any): Promise<PredictiveAlert[]> {
    const alerts: PredictiveAlert[] = [];
    const mileage = vehicle.mileage || 0;

    // Analyze DTCs
    const activeDtcs = vehicle.obdDevices.flatMap((d: any) => d.dtcs);
    for (const dtc of activeDtcs) {
      if (dtc.severity === 'CRITICAL' || dtc.severity === 'HIGH') {
        alerts.push({
          id: `dtc:${dtc.id}`,
          componentId: this.mapDtcToComponent(dtc.code),
          componentName: dtc.description,
          severity: dtc.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
          predictedFailureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          confidence: 0.85,
          recommendedAction: `Address ${dtc.code}: ${dtc.description}`,
          estimatedCost: this.estimateRepairCost(dtc.code),
          reasoning: [dtc.description, dtc.symptoms, dtc.causes].filter(Boolean),
        });
      }
    }

    // Analyze wear patterns from service history
    const components = await (this.prisma.vehicleTwinComponent.findMany as any)({
      where: { vehicleId: vehicle.id },
    });

    for (const component of components) {
      const serviceHistory = await (this.prisma.componentHistory.findMany as any)({
        where: {
          vehicleId: vehicle.id,
          componentId: component.componentId,
        },
        orderBy: { date: 'desc' },
      });

      const prediction = this.predictComponentFailure(
        component,
        serviceHistory,
        mileage,
      );

      if (prediction.shouldAlert) {
        alerts.push({
          id: `pred:${component.componentId}:${Date.now()}`,
          componentId: component.componentId,
          componentName: component.name,
          severity: prediction.severity,
          predictedFailureDate: prediction.failureDate,
          confidence: prediction.confidence,
          recommendedAction: prediction.recommendedAction,
          estimatedCost: prediction.estimatedCost,
          reasoning: prediction.reasoning,
        });
      }
    }

    return alerts.sort((a, b) => {
      const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  private predictComponentFailure(
    component: any,
    history: any[],
    currentMileage: number,
  ): {
    shouldAlert: boolean;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    failureDate: Date;
    confidence: number;
    recommendedAction: string;
    estimatedCost: number;
    reasoning: string[];
  } {
    const reasoning: string[] = [];
    let shouldAlert = false;
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let confidence = 0.5;

    // Check last service
    const lastService = history.find(h => 
      h.eventType === 'MAINTENANCE' || h.eventType === 'REPLACEMENT'
    );

    const lifespan = this.LIFESPAN_ESTIMATES[component.category];
    if (lifespan) {
      const serviceMileage = lastService?.odometer || 0;
      const milesSinceService = currentMileage - serviceMileage;
      const wearPercentage = (milesSinceService / lifespan.max) * 100;

      if (wearPercentage > 90) {
        shouldAlert = true;
        severity = 'CRITICAL';
        confidence = 0.9;
        reasoning.push(`${component.name} has exceeded ${Math.round(wearPercentage)}% of expected lifespan`);
      } else if (wearPercentage > 75) {
        shouldAlert = true;
        severity = 'HIGH';
        confidence = 0.75;
        reasoning.push(`${component.name} is at ${Math.round(wearPercentage)}% of expected lifespan`);
      } else if (wearPercentage > 50) {
        shouldAlert = true;
        severity = 'MEDIUM';
        confidence = 0.6;
        reasoning.push(`${component.name} is approaching service interval (${Math.round(wearPercentage)}% wear)`);
      }

      // Calculate predicted failure
      const remainingMiles = lifespan.max - milesSinceService;
      const dailyMiles = 50; // Assumption - could be calculated from history
      const daysUntilFailure = remainingMiles / dailyMiles;

      return {
        shouldAlert,
        severity,
        failureDate: new Date(Date.now() + daysUntilFailure * 24 * 60 * 60 * 1000),
        confidence,
        recommendedAction: `Schedule ${component.name.toLowerCase()} inspection and potential replacement`,
        estimatedCost: this.getEstimatedComponentCost(component.category),
        reasoning,
      };
    }

    return {
      shouldAlert: false,
      severity: 'LOW',
      failureDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      confidence: 0.3,
      recommendedAction: 'Continue regular monitoring',
      estimatedCost: 0,
      reasoning: ['Insufficient data for prediction'],
    };
  }

  private predictComponentWear(
    component: VehicleComponent,
    vehicle: any,
  ): ComponentWearPrediction {
    const currentMileage = vehicle.mileage || 0;
    const predictions: { date: Date; wearPercentage: number }[] = [];

    // Project wear over next 12 months
    const monthlyMiles = 1500; // Assumption
    const lifespan = this.LIFESPAN_ESTIMATES[component.category];

    if (lifespan) {
      for (let month = 1; month <= 12; month++) {
        const projectedMileage = currentMileage + (monthlyMiles * month);
        const wearPercentage = Math.min(100, (projectedMileage / lifespan.max) * 100);
        
        predictions.push({
          date: new Date(Date.now() + month * 30 * 24 * 60 * 60 * 1000),
          wearPercentage,
        });
      }
    }

    return {
      componentId: component.id,
      currentWear: 100 - component.healthScore,
      predictedWear: predictions,
      factors: {
        drivingStyle: 0.7,
        mileage: currentMileage / 200000, // Normalized
        age: (new Date().getFullYear() - vehicle.year) / 20,
        maintenanceHistory: vehicle.workOrders.length / 10,
        environment: 0.5,
      },
    };
  }

  private mapDtcToComponent(dtcCode: string): string {
    const prefix = dtcCode.substring(0, 2);
    const mappings: Record<string, string> = {
      'P0': 'engine',
      'P1': 'engine',
      'P2': 'fuel_system',
      'P3': 'transmission',
      'B0': 'battery',
      'B1': 'electrical',
      'C0': 'brakes_front',
      'C1': 'suspension_front',
      'U0': 'engine',
    };
    return mappings[prefix] || 'engine';
  }

  private mapEventTypeToStatus(eventType: string): VehicleComponent['status'] {
    const mappings: Record<string, VehicleComponent['status']> = {
      'INSPECTION': 'HEALTHY',
      'REPAIR': 'REPAIRING',
      'REPLACEMENT': 'REPLACED',
      'DAMAGE': 'CRITICAL',
      'MAINTENANCE': 'HEALTHY',
    };
    return mappings[eventType] || 'HEALTHY';
  }

  private calculateDamageHealthImpact(type: string, severity: string): number {
    const baseImpact = { MINOR: 10, MODERATE: 25, SEVERE: 50 };
    const typeMultiplier = { DENT: 1, SCRATCH: 0.5, CRACK: 1.5, CORROSION: 1.2, WEAR: 1, IMPACT: 1.5 };
    return baseImpact[severity as keyof typeof baseImpact] * (typeMultiplier[type as keyof typeof typeMultiplier] || 1);
  }

  private estimateRepairCost(dtcCode: string): number {
    // Simplified cost estimation
    const prefix = dtcCode.substring(0, 3);
    const baseCosts: Record<string, number> = {
      'P01': 150, // Fuel
      'P02': 200, // Injector
      'P03': 300, // Ignition
      'P04': 250, // Emissions
      'P07': 800, // Transmission
      'P08': 1000, // Transmission
    };
    return baseCosts[prefix] || 200;
  }

  private getEstimatedComponentCost(category: string): number {
    const costs: Record<string, number> = {
      ENGINE: 3000,
      TRANSMISSION: 2500,
      BRAKES: 400,
      SUSPENSION: 800,
      ELECTRICAL: 300,
      BODY: 1000,
      HVAC: 600,
      FUEL: 500,
      EXHAUST: 800,
    };
    return costs[category] || 500;
  }

  private getDefaultComponentMappings() {
    return [
      { componentId: 'engine', meshName: 'Engine_Block', materialName: 'Engine_Metal' },
      { componentId: 'transmission', meshName: 'Transmission', materialName: 'Transmission_Metal' },
      { componentId: 'brakes_front', meshName: 'Brake_Front_L', materialName: 'Brake_Disc' },
      { componentId: 'brakes_rear', meshName: 'Brake_Rear_L', materialName: 'Brake_Disc' },
      { componentId: 'suspension_front', meshName: 'Suspension_Front', materialName: 'Suspension_Metal' },
      { componentId: 'suspension_rear', meshName: 'Suspension_Rear', materialName: 'Suspension_Metal' },
      { componentId: 'battery', meshName: 'Battery', materialName: 'Battery_Case' },
      { componentId: 'exhaust', meshName: 'Exhaust_System', materialName: 'Exhaust_Metal' },
    ];
  }
}
