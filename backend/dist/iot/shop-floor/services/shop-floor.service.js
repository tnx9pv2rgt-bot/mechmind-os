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
var ShopFloorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopFloorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../common/services/prisma.service");
const notifications_service_1 = require("../../../notifications/services/notifications.service");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = __importDefault(require("ioredis"));
const shop_floor_interface_1 = require("../interfaces/shop-floor.interface");
let ShopFloorService = ShopFloorService_1 = class ShopFloorService {
    constructor(prisma, notifications, redis) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.redis = redis;
        this.logger = new common_1.Logger(ShopFloorService_1.name);
        this.activeTechnicians = new Map();
    }
    async initializeShopFloor(tenantId, config) {
        this.logger.warn(`Shop floor initialization for tenant ${tenantId} - models not in schema yet`);
        return config.bays.map((bayConfig, index) => ({
            ...bayConfig,
            id: `bay-${index}`,
            status: shop_floor_interface_1.BayStatus.AVAILABLE,
            sensors: [],
        }));
    }
    async addBaySensor(bayId, sensor) {
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
    async processSensorReading(reading) {
        this.logger.debug(`Processing sensor reading: ${reading.sensorId}`);
        switch (reading.type) {
            case shop_floor_interface_1.SensorType.ULTRASONIC:
            case shop_floor_interface_1.SensorType.PIR:
                await this.processOccupancySensor(reading);
                break;
            case shop_floor_interface_1.SensorType.RFID:
                await this.processRfidReading(reading);
                break;
            case shop_floor_interface_1.SensorType.BLUETOOTH_BEACON:
                await this.processBeaconReading(reading);
                break;
            case shop_floor_interface_1.SensorType.CAMERA:
                await this.processCameraReading(reading);
                break;
            case shop_floor_interface_1.SensorType.PRESSURE:
                await this.processPressureReading(reading);
                break;
        }
        await this.redis.publish(`shopfloor:sensor:${reading.bayId}`, JSON.stringify(reading));
    }
    async assignVehicleToBay(bayId, vehicleId, workOrderId, technicianIds) {
        this.logger.warn(`Assigning vehicle to bay ${bayId} - Shop floor models not in schema yet`);
        await this.createEvent({
            type: 'BAY_ASSIGNMENT',
            timestamp: new Date(),
            bayId,
            vehicleId,
            workOrderId,
            metadata: { technicianIds },
        });
        await this.redis.del(`bay:${bayId}`);
        return this.getBay(bayId);
    }
    async releaseBay(bayId) {
        this.logger.warn(`Releasing bay ${bayId} - Shop floor models not in schema yet`);
        await this.createEvent({
            type: 'VEHICLE_EXIT',
            timestamp: new Date(),
            bayId,
        });
        await this.redis.del(`bay:${bayId}`);
        return this.getBay(bayId);
    }
    async getBay(bayId) {
        const cached = await this.redis.get(`bay:${bayId}`);
        if (cached) {
            return JSON.parse(cached);
        }
        const serviceBay = {
            id: bayId,
            name: `Bay ${bayId}`,
            type: 'LIFT',
            status: shop_floor_interface_1.BayStatus.AVAILABLE,
            sensors: [],
            location: { x: 0, y: 0, floor: 1 },
            capabilities: [],
            maxVehicleWeight: 5000,
        };
        await this.redis.setex(`bay:${bayId}`, 60, JSON.stringify(serviceBay));
        return serviceBay;
    }
    async getAllBays(tenantId) {
        this.logger.warn(`Getting all bays for tenant ${tenantId} - Shop floor models not in schema yet`);
        return [];
    }
    async updateTechnicianLocation(technicianId, location) {
        const user = await this.prisma.user.findUnique({
            where: { id: technicianId },
        });
        if (!user) {
            throw new common_1.NotFoundException('Technician not found');
        }
        const techLocation = {
            technicianId,
            name: user.name,
            lastSeenAt: new Date(),
            location: { x: location.x, y: location.y, floor: location.floor },
            beaconId: location.beaconId,
            status: 'AVAILABLE',
        };
        this.activeTechnicians.set(technicianId, techLocation);
        await this.redis.setex(`technician:${technicianId}:location`, 300, JSON.stringify(techLocation));
        await this.redis.publish('shopfloor:technicians', JSON.stringify(techLocation));
        return techLocation;
    }
    async getActiveTechnicians(tenantId) {
        const users = await this.prisma.user.findMany({
            where: { tenantId, isActive: true },
        });
        const locations = [];
        for (const user of users) {
            const cached = await this.redis.get(`technician:${user.id}:location`);
            if (cached) {
                locations.push(JSON.parse(cached));
            }
        }
        return locations;
    }
    async getWorkOrderProgress(workOrderId) {
        this.logger.warn(`Getting work order progress for ${workOrderId} - WorkOrder services not in schema yet`);
        throw new common_1.NotFoundException('Work order progress tracking not implemented - models not in schema');
    }
    async updateJobStatus(workOrderId, status) {
        this.logger.warn(`Updating job status for ${workOrderId} - WorkOrder status not in schema yet`);
        await this.createEvent({
            type: 'STATUS_CHANGE',
            timestamp: new Date(),
            workOrderId,
            toStatus: status,
        });
        return this.getWorkOrderProgress(workOrderId);
    }
    async getShopFloorAnalytics(tenantId, _from, _to) {
        this.logger.warn(`Getting shop floor analytics for tenant ${tenantId} - Shop floor models not in schema yet`);
        return {
            totalVehicles: 0,
            averageServiceTime: 0,
            bayUtilization: {},
            technicianEfficiency: {},
        };
    }
    async getRecentEvents(tenantId, _limit = 50) {
        this.logger.warn(`Getting recent events for tenant ${tenantId} - ShopFloorEvent model not in schema yet`);
        return [];
    }
    async processOccupancySensor(reading) {
        this.logger.debug(`Processing occupancy sensor reading for bay ${reading.bayId}`);
        const isOccupied = reading.data.presence || (reading.data.distance && reading.data.distance < 50);
        if (isOccupied) {
            await this.createEvent({
                type: 'VEHICLE_ENTRY',
                timestamp: reading.timestamp,
                bayId: reading.bayId,
            });
            this.logger.log(`Vehicle entry detected in bay ${reading.bayId}`);
        }
    }
    async processRfidReading(reading) {
        if (!reading.data.rfidTag)
            return;
        this.logger.debug(`Processing RFID reading: ${reading.data.rfidTag}`);
        await this.createEvent({
            type: 'VEHICLE_ENTRY',
            timestamp: reading.timestamp,
            bayId: reading.bayId,
            metadata: { rfidTag: reading.data.rfidTag },
        });
    }
    async processBeaconReading(reading) {
        if (!reading.data.beaconId)
            return;
        this.logger.debug(`Processing beacon reading: ${reading.data.beaconId}`);
        this.logger.log(`Beacon ${reading.data.beaconId} detected in bay ${reading.bayId}`);
    }
    async processCameraReading(reading) {
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
    async processPressureReading(reading) {
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
    async createEvent(event) {
        this.logger.debug(`Creating shop floor event: ${event.type}`);
        await this.redis.publish('shopfloor:events', JSON.stringify(event));
    }
};
exports.ShopFloorService = ShopFloorService;
exports.ShopFloorService = ShopFloorService = ShopFloorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        ioredis_2.default])
], ShopFloorService);
