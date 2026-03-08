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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObdService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/services/prisma.service");
const notifications_service_1 = require("../../notifications/services/notifications.service");
const client_1 = require("@prisma/client");
let ObdService = class ObdService {
    constructor(prisma, notifications) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.DTC_SEVERITY_MAP = {
            'P01': client_1.TroubleCodeSeverity.MEDIUM,
            'P02': client_1.TroubleCodeSeverity.HIGH,
            'P03': client_1.TroubleCodeSeverity.HIGH,
            'P04': client_1.TroubleCodeSeverity.MEDIUM,
            'P05': client_1.TroubleCodeSeverity.LOW,
            'P06': client_1.TroubleCodeSeverity.HIGH,
            'P07': client_1.TroubleCodeSeverity.MEDIUM,
            'P08': client_1.TroubleCodeSeverity.HIGH,
            'P0A': client_1.TroubleCodeSeverity.HIGH,
            'B00': client_1.TroubleCodeSeverity.MEDIUM,
            'C00': client_1.TroubleCodeSeverity.HIGH,
            'U00': client_1.TroubleCodeSeverity.HIGH,
        };
    }
    async registerDevice(tenantId, dto) {
        const device = await this.prisma.obdDevice.create({
            data: {
                tenantId,
                serialNumber: dto.serialNumber,
                name: dto.name,
                model: dto.model,
                vehicleId: dto.vehicleId,
                isActive: true,
            },
            include: { vehicle: true },
        });
        return this.mapDeviceToDto(device);
    }
    async getDevice(tenantId, deviceId) {
        const device = await this.prisma.obdDevice.findFirst({
            where: { id: deviceId, tenantId },
            include: { vehicle: true },
        });
        if (!device) {
            throw new common_1.NotFoundException('OBD device not found');
        }
        return this.mapDeviceToDto(device);
    }
    async listDevices(tenantId, vehicleId) {
        const devices = await this.prisma.obdDevice.findMany({
            where: {
                tenantId,
                ...(vehicleId && { vehicleId }),
            },
            include: { vehicle: true },
            orderBy: { lastConnected: 'desc' },
        });
        return devices.map(d => this.mapDeviceToDto(d));
    }
    async updateDevice(tenantId, deviceId, dto) {
        const device = await this.prisma.obdDevice.update({
            where: { id: deviceId, tenantId },
            data: dto,
            include: { vehicle: true },
        });
        return this.mapDeviceToDto(device);
    }
    async recordReading(dto) {
        const reading = await this.prisma.obdReading.create({
            data: {
                deviceId: dto.deviceId,
                rpm: dto.rpm,
                speed: dto.speed,
                coolantTemp: dto.coolantTemp,
                engineLoad: dto.engineLoad,
                fuelLevel: dto.fuelLevel,
                fuelRate: dto.fuelRate,
                intakeTemp: dto.intakeTemp,
                maf: dto.maf,
                barometric: dto.barometric,
                intakeMap: dto.intakeMap,
                throttlePos: dto.throttlePos,
                voltage: dto.voltage,
                runTime: dto.runTime,
                distance: dto.distance,
                rawData: dto.rawData,
                latitude: dto.latitude,
                longitude: dto.longitude,
            },
        });
        await this.prisma.obdDevice.update({
            where: { id: dto.deviceId },
            data: { lastConnected: new Date() },
        });
        await this.checkAnomalies(dto.deviceId, dto);
        return this.mapReadingToDto(reading);
    }
    async getReadings(tenantId, filters) {
        const readings = await this.prisma.obdReading.findMany({
            where: {
                device: { tenantId },
                ...(filters.deviceId && { deviceId: filters.deviceId }),
                ...(filters.vehicleId && { device: { vehicleId: filters.vehicleId } }),
                ...(filters.from && { recordedAt: { gte: filters.from } }),
                ...(filters.to && { recordedAt: { lte: filters.to } }),
            },
            orderBy: { recordedAt: 'desc' },
            take: filters.limit || 100,
        });
        return readings.map(r => this.mapReadingToDto(r));
    }
    async getLatestReading(tenantId, deviceId) {
        const reading = await this.prisma.obdReading.findFirst({
            where: { deviceId, device: { tenantId } },
            orderBy: { recordedAt: 'desc' },
        });
        return reading ? this.mapReadingToDto(reading) : null;
    }
    async recordTroubleCodes(deviceId, codes) {
        const device = await this.prisma.obdDevice.findUnique({
            where: { id: deviceId },
            include: { tenant: true, vehicle: true },
        });
        if (!device) {
            throw new common_1.NotFoundException('Device not found');
        }
        const latestReading = await this.prisma.obdReading.findFirst({
            where: { deviceId },
            orderBy: { recordedAt: 'desc' },
        });
        for (const code of codes) {
            const severity = code.severity || this.getSeverityFromCode(code.code);
            const existing = await this.prisma.obdTroubleCode.findFirst({
                where: { deviceId, code: code.code, isActive: true },
            });
            if (existing) {
                await this.prisma.obdTroubleCode.update({
                    where: { id: existing.id },
                    data: { lastSeenAt: new Date() },
                });
            }
            else {
                const newCode = await this.prisma.obdTroubleCode.create({
                    data: {
                        deviceId,
                        code: code.code,
                        category: code.category || this.getCategoryFromCode(code.code),
                        severity,
                        description: code.description,
                        symptoms: code.symptoms,
                        causes: code.causes,
                        isPending: code.isPending ?? false,
                        isPermanent: code.isPermanent ?? false,
                        readingSnapshot: latestReading?.rawData,
                    },
                });
                if (severity === client_1.TroubleCodeSeverity.CRITICAL || severity === client_1.TroubleCodeSeverity.HIGH) {
                    await this.notifications.sendToTenant(device.tenantId, {
                        title: `Vehicle Alert: ${code.code}`,
                        body: `${device.vehicle?.make} ${device.vehicle?.model}: ${code.description}`,
                        priority: severity === client_1.TroubleCodeSeverity.CRITICAL ? 'high' : 'normal',
                        data: {
                            type: 'OBD_TROUBLE_CODE',
                            codeId: newCode.id,
                            vehicleId: device.vehicleId,
                            deviceId,
                        },
                    });
                }
            }
        }
    }
    async getTroubleCodes(tenantId, filters) {
        const codes = await this.prisma.obdTroubleCode.findMany({
            where: {
                device: { tenantId },
                ...(filters.deviceId && { deviceId: filters.deviceId }),
                ...(filters.vehicleId && { device: { vehicleId: filters.vehicleId } }),
                ...(filters.active !== undefined && { isActive: filters.active }),
            },
            orderBy: [{ severity: 'desc' }, { firstSeenAt: 'desc' }],
        });
        return codes.map(c => this.mapTroubleCodeToDto(c));
    }
    async clearTroubleCodes(tenantId, deviceId, dto) {
        await this.prisma.obdTroubleCode.updateMany({
            where: { deviceId, device: { tenantId }, isActive: true },
            data: {
                isActive: false,
                clearedAt: new Date(),
                clearedBy: dto.clearedBy,
            },
        });
    }
    async generateHealthReport(tenantId, vehicleId) {
        const vehicle = await this.prisma.vehicle.findFirst({
            where: { id: vehicleId, customer: { tenantId } },
            include: {
                obdDevices: {
                    include: {
                        readings: { orderBy: { recordedAt: 'desc' }, take: 1 },
                        dtcs: { where: { isActive: true } },
                    },
                },
            },
        });
        if (!vehicle) {
            throw new common_1.NotFoundException('Vehicle not found');
        }
        const allReadings = vehicle.obdDevices.flatMap(d => d.readings);
        const allCodes = vehicle.obdDevices.flatMap(d => d.dtcs);
        const latestReading = allReadings.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0];
        const activeCodes = allCodes.filter(c => c.isActive && !c.isPending).length;
        const pendingCodes = allCodes.filter(c => c.isActive && c.isPending).length;
        let score = 100;
        const recommendations = [];
        allCodes.forEach(code => {
            if (!code.isActive)
                return;
            switch (code.severity) {
                case client_1.TroubleCodeSeverity.CRITICAL:
                    score -= 30;
                    recommendations.push(`CRITICAL: ${code.code} - ${code.description}. Immediate attention required.`);
                    break;
                case client_1.TroubleCodeSeverity.HIGH:
                    score -= 15;
                    recommendations.push(`HIGH: ${code.code} - ${code.description}. Schedule service soon.`);
                    break;
                case client_1.TroubleCodeSeverity.MEDIUM:
                    score -= 5;
                    recommendations.push(`MEDIUM: ${code.code} - ${code.description}. Monitor and address when possible.`);
                    break;
                case client_1.TroubleCodeSeverity.LOW:
                    score -= 2;
                    recommendations.push(`LOW: ${code.code} - ${code.description}. Minor issue.`);
                    break;
            }
        });
        if (latestReading) {
            if (latestReading.coolantTemp && latestReading.coolantTemp > 100) {
                score -= 20;
                recommendations.push('Engine overheating detected. Check cooling system immediately.');
            }
            if (latestReading.voltage && latestReading.voltage < 12.0) {
                score -= 10;
                recommendations.push('Low battery voltage. Have battery tested.');
            }
            if (latestReading.engineLoad && latestReading.engineLoad > 90) {
                recommendations.push('High engine load detected. Check for transmission issues.');
            }
        }
        score = Math.max(0, Math.min(100, score));
        let overallStatus;
        if (score >= 90)
            overallStatus = 'EXCELLENT';
        else if (score >= 75)
            overallStatus = 'GOOD';
        else if (score >= 50)
            overallStatus = 'FAIR';
        else if (score >= 25)
            overallStatus = 'POOR';
        else
            overallStatus = 'CRITICAL';
        return {
            vehicleId,
            vehicleInfo: `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`,
            overallStatus,
            score,
            activeCodes,
            pendingCodes,
            lastReading: latestReading ? this.mapReadingToDto(latestReading) : undefined,
            recommendations: recommendations.length > 0 ? recommendations : ['No issues detected. Vehicle is in good condition.'],
        };
    }
    getSeverityFromCode(code) {
        const prefix = code.substring(0, 3).toUpperCase();
        return this.DTC_SEVERITY_MAP[prefix] || client_1.TroubleCodeSeverity.MEDIUM;
    }
    getCategoryFromCode(code) {
        const type = code.charAt(0);
        switch (type) {
            case 'P': return 'POWERTRAIN';
            case 'B': return 'BODY';
            case 'C': return 'CHASSIS';
            case 'U': return 'NETWORK';
            default: return 'UNKNOWN';
        }
    }
    async checkAnomalies(deviceId, reading) {
        if (reading.coolantTemp && reading.coolantTemp > 110) {
            const device = await this.prisma.obdDevice.findUnique({
                where: { id: deviceId },
                include: { tenant: true },
            });
            if (device) {
                await this.notifications.sendToTenant(device.tenantId, {
                    title: '⚠️ Critical Engine Temperature',
                    body: `Engine temperature: ${reading.coolantTemp}°C. Immediate attention required.`,
                    priority: 'high',
                    data: { type: 'CRITICAL_TEMP', deviceId, reading },
                });
            }
        }
    }
    mapDeviceToDto(device) {
        return {
            id: device.id,
            serialNumber: device.serialNumber,
            name: device.name ?? undefined,
            model: device.model ?? undefined,
            isActive: device.isActive,
            lastConnected: device.lastConnected ?? undefined,
            batteryLevel: device.batteryLevel ?? undefined,
            vehicle: device.vehicle ? {
                id: device.vehicle.id,
                make: device.vehicle.make,
                model: device.vehicle.model,
                licensePlate: device.vehicle.licensePlate,
            } : undefined,
        };
    }
    mapReadingToDto(reading) {
        return {
            id: reading.id,
            recordedAt: reading.recordedAt,
            rpm: reading.rpm ?? undefined,
            speed: reading.speed ?? undefined,
            coolantTemp: reading.coolantTemp ?? undefined,
            engineLoad: reading.engineLoad ?? undefined,
            fuelLevel: reading.fuelLevel ?? undefined,
            fuelRate: reading.fuelRate ?? undefined,
            throttlePos: reading.throttlePos ?? undefined,
            voltage: reading.voltage ?? undefined,
            latitude: reading.latitude ?? undefined,
            longitude: reading.longitude ?? undefined,
        };
    }
    mapTroubleCodeToDto(code) {
        return {
            id: code.id,
            code: code.code,
            category: code.category,
            severity: code.severity,
            description: code.description,
            symptoms: code.symptoms ?? undefined,
            causes: code.causes ?? undefined,
            isActive: code.isActive,
            isPending: code.isPending,
            firstSeenAt: code.firstSeenAt,
            lastSeenAt: code.lastSeenAt,
            clearedAt: code.clearedAt ?? undefined,
        };
    }
};
exports.ObdService = ObdService;
exports.ObdService = ObdService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], ObdService);
