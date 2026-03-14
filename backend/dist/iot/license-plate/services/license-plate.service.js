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
var LicensePlateService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LicensePlateService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../common/services/prisma.service");
const notifications_service_1 = require("../../../notifications/services/notifications.service");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = __importDefault(require("ioredis"));
const s3_service_1 = require("../../../common/services/s3.service");
const license_plate_interface_1 = require("../interfaces/license-plate.interface");
let LicensePlateService = LicensePlateService_1 = class LicensePlateService {
    constructor(prisma, notifications, s3Service, redis) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.s3Service = s3Service;
        this.redis = redis;
        this.logger = new common_1.Logger(LicensePlateService_1.name);
    }
    async detectLicensePlate(imageBuffer, options = {}) {
        const provider = options.provider || license_plate_interface_1.OcrProvider.GOOGLE_VISION;
        const imageKey = `lpr/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        await this.s3Service.uploadBuffer(imageBuffer, imageKey, 'image/jpeg');
        const imageUrl = await this.s3Service.getSignedUrlForKey(imageKey, 3600);
        let detection;
        switch (provider) {
            case license_plate_interface_1.OcrProvider.GOOGLE_VISION:
                detection = await this.detectWithGoogleVision(imageBuffer, imageUrl, provider);
                break;
            case license_plate_interface_1.OcrProvider.AZURE_COMPUTER_VISION:
                detection = await this.detectWithAzure(imageBuffer, imageUrl, provider);
                break;
            case license_plate_interface_1.OcrProvider.AWS_REKOGNITION:
                detection = await this.detectWithAws(imageBuffer, imageUrl, provider);
                break;
            case license_plate_interface_1.OcrProvider.OPENALPR:
                detection = await this.detectWithOpenAlpr(imageBuffer, imageUrl, provider);
                break;
            default:
                throw new Error(`Unsupported OCR provider: ${provider}`);
        }
        await this.prisma.licensePlateDetection.create({
            data: {
                id: detection.id,
                tenantId: options.tenantId || 'default',
                imageUrl: detection.imageUrl,
                detectedText: detection.detectedText,
                confidence: detection.confidence,
                country: detection.country,
                region: detection.region,
                vehicleType: detection.vehicleType,
                boundingBox: detection.boundingBox,
                provider: detection.provider,
                rawResponse: detection.rawResponse,
                cameraId: options.cameraId,
            },
        });
        await this.redis.setex(`lpr:recent:${detection.detectedText}`, 300, JSON.stringify(detection));
        await this.updateStats(provider, detection.confidence);
        this.logger.log(`Detected plate: ${detection.detectedText} (${detection.confidence.toFixed(2)} confidence)`);
        return detection;
    }
    async recordEntryExit(detection, type, options = {}) {
        const validation = await this.validatePlate(detection.detectedText);
        const normalizedPlate = validation.normalizedPlate;
        const vehicle = await this.prisma.vehicle.findFirst({
            where: { licensePlate: normalizedPlate },
            include: { customer: true },
        });
        const record = await this.prisma.vehicleEntryExit.create({
            data: {
                tenantId: options.tenantId || 'default',
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
        if (type === license_plate_interface_1.EntryExitType.ENTRY) {
            await this.createParkingSession(record.id, normalizedPlate, detection, options.tenantId);
        }
        else {
            await this.closeParkingSession(normalizedPlate, record.id);
        }
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
        await this.redis.publish('lpr:entry-exit', JSON.stringify({
            type,
            plate: normalizedPlate,
            timestamp: record.timestamp,
            vehicleId: vehicle?.id,
        }));
        return {
            id: record.id,
            type: record.type,
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
    async lookupVehicle(licensePlate) {
        const validation = await this.validatePlate(licensePlate);
        const normalizedPlate = validation.normalizedPlate;
        const vehicle = await this.prisma.vehicle.findFirst({
            where: { licensePlate: normalizedPlate },
            include: {
                customer: true,
                inspections: {
                    orderBy: { startedAt: 'desc' },
                    take: 5,
                },
            },
        });
        const recentHistory = await this.prisma.vehicleEntryExit.findMany({
            where: { licensePlate: normalizedPlate },
            orderBy: { timestamp: 'desc' },
            take: 10,
        });
        const activeSession = await this.prisma.parkingSession.findFirst({
            where: {
                licensePlate: normalizedPlate,
                status: 'ACTIVE',
            },
        });
        return {
            vehicle: vehicle
                ? {
                    id: vehicle.id,
                    make: vehicle.make,
                    model: vehicle.model,
                    year: vehicle.year || 0,
                    licensePlate: vehicle.licensePlate,
                    customer: vehicle.customer
                        ? {
                            id: vehicle.customer.id,
                            name: [vehicle.customer.encryptedFirstName, vehicle.customer.encryptedLastName]
                                .filter(Boolean)
                                .join(' ') || 'Unknown',
                            phone: vehicle.customer.encryptedPhone || undefined,
                        }
                        : { id: '', name: '' },
                    workOrders: [],
                }
                : undefined,
            recentHistory: recentHistory.map(h => ({
                id: h.id,
                type: h.type,
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
            activeSession: activeSession
                ? {
                    id: activeSession.id,
                    licensePlate: activeSession.licensePlate,
                    entry: {},
                    status: activeSession.status,
                    entryTime: activeSession.entryTime,
                    parkingSpotId: activeSession.parkingSpotId || undefined,
                }
                : undefined,
        };
    }
    async getActiveSessions(tenantId) {
        const where = { status: 'ACTIVE' };
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
        return sessions.map(s => ({
            id: s.id,
            licensePlate: s.licensePlate,
            entry: {
                id: s.entry.id,
                type: s.entry.type,
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
            status: s.status,
            entryTime: s.entryTime,
            durationMinutes: s.durationMinutes || undefined,
            parkingSpotId: s.parkingSpotId || undefined,
        }));
    }
    async registerCamera(tenantId, config) {
        const camera = await this.prisma.lprCamera.create({
            data: {
                tenantId,
                name: config.name,
                location: config.location,
                direction: config.direction,
                provider: config.provider,
                config: config.config,
                isActive: true,
            },
        });
        return {
            id: camera.id,
            name: camera.name,
            location: camera.location,
            direction: camera.direction,
            isActive: camera.isActive,
            provider: camera.provider,
            config: camera.config,
            lastCapture: camera.lastCapture || undefined,
        };
    }
    async getCamera(cameraId) {
        const camera = await this.prisma.lprCamera.findUnique({
            where: { id: cameraId },
        });
        if (!camera) {
            throw new common_1.NotFoundException('Camera not found');
        }
        return {
            id: camera.id,
            name: camera.name,
            location: camera.location,
            direction: camera.direction,
            isActive: camera.isActive,
            provider: camera.provider,
            config: camera.config,
            lastCapture: camera.lastCapture || undefined,
        };
    }
    async getCameras(tenantId) {
        const cameras = await this.prisma.lprCamera.findMany({
            where: { tenantId },
        });
        return cameras.map(c => ({
            id: c.id,
            name: c.name,
            location: c.location,
            direction: c.direction,
            isActive: c.isActive,
            provider: c.provider,
            config: c.config,
            lastCapture: c.lastCapture || undefined,
        }));
    }
    async updateCameraStatus(cameraId, isActive) {
        const camera = await this.prisma.lprCamera.update({
            where: { id: cameraId },
            data: { isActive },
        });
        return {
            id: camera.id,
            name: camera.name,
            location: camera.location,
            direction: camera.direction,
            isActive: camera.isActive,
            provider: camera.provider,
            config: camera.config,
            lastCapture: camera.lastCapture || undefined,
        };
    }
    async getStats(tenantId, from, to) {
        const detections = await this.prisma.licensePlateDetection.findMany({
            where: {
                camera: { tenantId },
                processedAt: { gte: from, lte: to },
            },
        });
        const totalDetections = detections.length;
        const avgConfidence = totalDetections > 0
            ? detections.reduce((sum, d) => sum + d.confidence, 0) / totalDetections
            : 0;
        const byProvider = {};
        for (const provider of Object.values(license_plate_interface_1.OcrProvider)) {
            const providerDetections = detections.filter(d => d.provider === provider);
            byProvider[provider] = {
                count: providerDetections.length,
                avgConfidence: providerDetections.length > 0
                    ? providerDetections.reduce((sum, d) => sum + d.confidence, 0) /
                        providerDetections.length
                    : 0,
            };
        }
        const byHour = {};
        for (const detection of detections) {
            const hour = detection.processedAt.getHours();
            byHour[hour] = (byHour[hour] || 0) + 1;
        }
        return {
            totalDetections,
            avgConfidence,
            falsePositives: 0,
            processingTimeMs: 0,
            byProvider,
            byHour,
        };
    }
    async detectWithGoogleVision(imageBuffer, imageUrl, provider) {
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
    async detectWithAzure(imageBuffer, imageUrl, provider) {
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
    async detectWithAws(imageBuffer, imageUrl, provider) {
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
    async detectWithOpenAlpr(imageBuffer, imageUrl, provider) {
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
    async validatePlate(plate) {
        const normalized = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const errors = [];
        if (normalized.length < 4 || normalized.length > 10) {
            errors.push('Invalid plate length');
        }
        let country;
        let state;
        if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(normalized)) {
            country = 'IT';
        }
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
    async createParkingSession(entryId, licensePlate, detection, tenantId) {
        await this.prisma.parkingSession.create({
            data: {
                tenantId: tenantId || 'default',
                licensePlate,
                entryId,
                status: 'ACTIVE',
                entryTime: new Date(),
            },
        });
    }
    async closeParkingSession(licensePlate, exitId) {
        const session = await this.prisma.parkingSession.findFirst({
            where: {
                licensePlate,
                status: 'ACTIVE',
            },
        });
        if (session) {
            const exitTime = new Date();
            const durationMinutes = Math.floor((exitTime.getTime() - session.entryTime.getTime()) / (1000 * 60));
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
    async updateStats(provider, confidence) {
        const key = `lpr:stats:${provider}`;
        const today = new Date().toISOString().split('T')[0];
        const pipeline = this.redis.pipeline();
        pipeline.hincrby(`${key}:count`, today, 1);
        pipeline.hincrbyfloat(`${key}:confidence`, today, confidence);
        pipeline.expire(`${key}:count`, 86400 * 30);
        pipeline.expire(`${key}:confidence`, 86400 * 30);
        await pipeline.exec();
    }
};
exports.LicensePlateService = LicensePlateService;
exports.LicensePlateService = LicensePlateService = LicensePlateService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        s3_service_1.S3Service,
        ioredis_2.default])
], LicensePlateService);
