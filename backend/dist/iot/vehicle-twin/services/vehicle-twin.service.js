"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var VehicleTwinService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VehicleTwinService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../common/services/prisma.service");
const notifications_service_1 = require("../../../notifications/services/notifications.service");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = __importDefault(require("ioredis"));
let VehicleTwinService = VehicleTwinService_1 = class VehicleTwinService {
    constructor(prisma, notifications, redis) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.redis = redis;
        this.logger = new common_1.Logger(VehicleTwinService_1.name);
        this.LIFESPAN_ESTIMATES = {
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
    }
    async getOrCreateTwin(vehicleId) {
        const cached = await this.redis.get(`twin:${vehicleId}`);
        if (cached) {
            return JSON.parse(cached);
        }
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
            throw new common_1.NotFoundException('Vehicle not found');
        }
        const twin = await this.buildTwinState(vehicle);
        await this.redis.setex(`twin:${vehicleId}`, 300, JSON.stringify(twin));
        return twin;
    }
    async updateComponentStatus(vehicleId, componentId, update) {
        await this.prisma.vehicleTwinComponent.upsert({
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
        await this.redis.del(`twin:${vehicleId}`);
        return this.getComponent(vehicleId, componentId);
    }
    async recordComponentHistory(vehicleId, history) {
        const record = await this.prisma.componentHistory.create({
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
        const status = this.mapEventTypeToStatus(history.eventType);
        await this.updateComponentStatus(vehicleId, history.componentId, {
            status,
            metadata: {
                lastServiceDate: history.date,
            },
        });
        await this.redis.del(`twin:${vehicleId}`);
        return {
            id: record.id,
            ...history,
        };
    }
    async recordDamage(vehicleId, damage) {
        const record = await this.prisma.vehicleDamage.create({
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
        const healthImpact = this.calculateDamageHealthImpact(damage.type, damage.severity);
        const component = await this.getComponent(vehicleId, damage.componentId);
        await this.updateComponentStatus(vehicleId, damage.componentId, {
            status: damage.severity === 'SEVERE' ? 'CRITICAL' : 'WARNING',
            healthScore: Math.max(0, component.healthScore - healthImpact),
        });
        await this.redis.del(`twin:${vehicleId}`);
        return {
            id: record.id,
            ...damage,
        };
    }
    async getPredictiveAlerts(vehicleId) {
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
            throw new common_1.NotFoundException('Vehicle not found');
        }
        return this.generatePredictiveAlerts(vehicle);
    }
    async getWearPrediction(vehicleId, componentId) {
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
            throw new common_1.NotFoundException('Vehicle not found');
        }
        const component = await this.getComponent(vehicleId, componentId);
        return this.predictComponentWear(component, vehicle);
    }
    async getVisualizationConfig(vehicleId) {
        const cached = await this.redis.get(`twin:config:${vehicleId}`);
        if (cached) {
            return JSON.parse(cached);
        }
        const vehicle = await this.prisma.vehicle.findUnique({
            where: { id: vehicleId },
            include: { twinConfig: true },
        });
        if (!vehicle) {
            throw new common_1.NotFoundException('Vehicle not found');
        }
        const config = vehicle.twinConfig || {
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
    async updateVisualizationConfig(vehicleId, config) {
        await this.prisma.vehicleTwinConfig.upsert({
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
        await this.redis.del(`twin:config:${vehicleId}`);
        return this.getVisualizationConfig(vehicleId);
    }
    async getHealthTrend(vehicleId, from, to) {
        const history = await this.prisma.vehicleHealthHistory.findMany({
            where: {
                vehicleId,
                recordedAt: { gte: from, lte: to },
            },
            orderBy: { recordedAt: 'asc' },
        });
        return history.map((h) => ({
            date: h.recordedAt,
            overallHealth: h.overallHealth,
            componentHealth: h.componentHealth,
        }));
    }
    async buildTwinState(vehicle) {
        const components = await this.getOrInitializeComponents(vehicle);
        const history = await this.prisma.componentHistory.findMany({
            where: { vehicleId: vehicle.id },
            orderBy: { date: 'desc' },
            take: 20,
        });
        const damageRecords = await this.prisma.vehicleDamage.findMany({
            where: { vehicleId: vehicle.id },
            orderBy: { createdAt: 'desc' },
        });
        const overallHealth = this.calculateOverallHealth(components);
        const activeAlerts = await this.generatePredictiveAlerts(vehicle);
        const latestReading = vehicle.obdDevices
            .flatMap((d) => d.readings)
            .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0];
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
            recentHistory: history.map((h) => ({
                id: h.id,
                componentId: h.componentId,
                eventType: h.eventType,
                date: h.date,
                description: h.description,
                technicianId: h.technicianId || undefined,
                cost: h.cost || undefined,
                partsUsed: h.partsUsed,
                photos: h.photos,
                documents: h.documents,
                odometer: h.odometer || undefined,
            })),
            damageRecords: damageRecords.map((d) => ({
                id: d.id,
                componentId: d.componentId,
                type: d.type,
                severity: d.severity,
                description: d.description,
                location: { x: d.locationX, y: d.locationY, z: d.locationZ },
                photos: d.photos,
                reportedAt: d.reportedAt,
                repairedAt: d.repairedAt || undefined,
                repairCost: d.repairCost || undefined,
            })),
            mileage: latestReading?.distance || 0,
            engineHours: latestReading?.runTime || 0,
        };
    }
    async getOrInitializeComponents(vehicle) {
        const existing = await this.prisma.vehicleTwinComponent.findMany({
            where: { vehicleId: vehicle.id },
        });
        if (existing.length > 0) {
            return existing.map((c) => ({
                id: c.componentId,
                name: c.name,
                category: c.category,
                status: c.status,
                healthScore: c.healthScore,
                lastServiceDate: c.lastServiceDate || undefined,
                nextServiceDue: c.nextServiceDue || undefined,
                estimatedLifespan: c.estimatedLifespan || undefined,
                position: { x: c.positionX, y: c.positionY, z: c.positionZ },
                modelPartId: c.modelPartId || undefined,
                metadata: c.metadata,
            }));
        }
        const defaultComponents = this.getDefaultComponents(vehicle);
        await this.prisma.vehicleTwinComponent.createMany({
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
    getDefaultComponents(vehicle) {
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
    async getComponent(vehicleId, componentId) {
        const component = await this.prisma.vehicleTwinComponent.findUnique({
            where: {
                vehicleId_componentId: {
                    vehicleId,
                    componentId,
                },
            },
        });
        if (!component) {
            throw new common_1.NotFoundException('Component not found');
        }
        return {
            id: component.componentId,
            name: component.name,
            category: component.category,
            status: component.status,
            healthScore: component.healthScore,
            lastServiceDate: component.lastServiceDate || undefined,
            nextServiceDue: component.nextServiceDue || undefined,
            estimatedLifespan: component.estimatedLifespan || undefined,
            position: { x: component.positionX, y: component.positionY, z: component.positionZ },
            modelPartId: component.modelPartId || undefined,
            metadata: component.metadata,
        };
    }
    calculateOverallHealth(components) {
        if (components.length === 0)
            return 100;
        const totalScore = components.reduce((sum, c) => sum + c.healthScore, 0);
        return Math.round(totalScore / components.length);
    }
    async generatePredictiveAlerts(vehicle) {
        const alerts = [];
        const mileage = vehicle.mileage || 0;
        const activeDtcs = vehicle.obdDevices.flatMap((d) => d.dtcs);
        for (const dtc of activeDtcs) {
            if (dtc.severity === 'CRITICAL' || dtc.severity === 'HIGH') {
                alerts.push({
                    id: `dtc:${dtc.id}`,
                    componentId: this.mapDtcToComponent(dtc.code),
                    componentName: dtc.description,
                    severity: dtc.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
                    predictedFailureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    confidence: 0.85,
                    recommendedAction: `Address ${dtc.code}: ${dtc.description}`,
                    estimatedCost: this.estimateRepairCost(dtc.code),
                    reasoning: [dtc.description, dtc.symptoms, dtc.causes].filter(Boolean),
                });
            }
        }
        const components = await this.prisma.vehicleTwinComponent.findMany({
            where: { vehicleId: vehicle.id },
        });
        for (const component of components) {
            const serviceHistory = await this.prisma.componentHistory.findMany({
                where: {
                    vehicleId: vehicle.id,
                    componentId: component.componentId,
                },
                orderBy: { date: 'desc' },
            });
            const prediction = this.predictComponentFailure(component, serviceHistory, mileage);
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
    predictComponentFailure(component, history, currentMileage) {
        const reasoning = [];
        let shouldAlert = false;
        let severity = 'LOW';
        let confidence = 0.5;
        const lastService = history.find(h => h.eventType === 'MAINTENANCE' || h.eventType === 'REPLACEMENT');
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
            }
            else if (wearPercentage > 75) {
                shouldAlert = true;
                severity = 'HIGH';
                confidence = 0.75;
                reasoning.push(`${component.name} is at ${Math.round(wearPercentage)}% of expected lifespan`);
            }
            else if (wearPercentage > 50) {
                shouldAlert = true;
                severity = 'MEDIUM';
                confidence = 0.6;
                reasoning.push(`${component.name} is approaching service interval (${Math.round(wearPercentage)}% wear)`);
            }
            const remainingMiles = lifespan.max - milesSinceService;
            const dailyMiles = 50;
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
    predictComponentWear(component, vehicle) {
        const currentMileage = vehicle.mileage || 0;
        const predictions = [];
        const monthlyMiles = 1500;
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
                mileage: currentMileage / 200000,
                age: (new Date().getFullYear() - vehicle.year) / 20,
                maintenanceHistory: vehicle.workOrders.length / 10,
                environment: 0.5,
            },
        };
    }
    mapDtcToComponent(dtcCode) {
        const prefix = dtcCode.substring(0, 2);
        const mappings = {
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
    mapEventTypeToStatus(eventType) {
        const mappings = {
            'INSPECTION': 'HEALTHY',
            'REPAIR': 'REPAIRING',
            'REPLACEMENT': 'REPLACED',
            'DAMAGE': 'CRITICAL',
            'MAINTENANCE': 'HEALTHY',
        };
        return mappings[eventType] || 'HEALTHY';
    }
    calculateDamageHealthImpact(type, severity) {
        const baseImpact = { MINOR: 10, MODERATE: 25, SEVERE: 50 };
        const typeMultiplier = { DENT: 1, SCRATCH: 0.5, CRACK: 1.5, CORROSION: 1.2, WEAR: 1, IMPACT: 1.5 };
        return baseImpact[severity] * (typeMultiplier[type] || 1);
    }
    estimateRepairCost(dtcCode) {
        const prefix = dtcCode.substring(0, 3);
        const baseCosts = {
            'P01': 150,
            'P02': 200,
            'P03': 300,
            'P04': 250,
            'P07': 800,
            'P08': 1000,
        };
        return baseCosts[prefix] || 200;
    }
    getEstimatedComponentCost(category) {
        const costs = {
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
    getDefaultComponentMappings() {
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
};
exports.VehicleTwinService = VehicleTwinService;
exports.VehicleTwinService = VehicleTwinService = VehicleTwinService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        ioredis_2.default])
], VehicleTwinService);
