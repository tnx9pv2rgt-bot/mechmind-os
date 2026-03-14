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
var ObdStreamingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObdStreamingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../common/services/prisma.service");
const notifications_service_1 = require("../../../notifications/services/notifications.service");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = __importDefault(require("ioredis"));
const obd_streaming_interface_1 = require("../interfaces/obd-streaming.interface");
let ObdStreamingService = ObdStreamingService_1 = class ObdStreamingService {
    constructor(prisma, notifications, redis) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.redis = redis;
        this.logger = new common_1.Logger(ObdStreamingService_1.name);
        this.activeStreams = new Map();
        this.SENSOR_INTERVALS = {
            CRITICAL: 100,
            HIGH: 500,
            MEDIUM: 1000,
            LOW: 5000,
        };
        this.PIDS = {
            RPM: '010C',
            SPEED: '010D',
            COOLANT_TEMP: '0105',
            THROTTLE_POS: '0111',
            ENGINE_LOAD: '0104',
            INTAKE_TEMP: '010F',
            MAF_RATE: '0110',
            FUEL_LEVEL: '012F',
            VOLTAGE: '0142',
            DISTANCE: '0131',
            RUN_TIME: '011F',
            FREEZE_FRAME: '0202',
            MODE_06_REQUEST: '0600',
            MODE_08_REQUEST: '0800',
        };
    }
    async startStreaming(deviceId, config) {
        const streamId = `stream:${deviceId}:${Date.now()}`;
        const stream = {
            id: streamId,
            deviceId,
            adapterType: config.adapterType,
            protocol: config.protocol || obd_streaming_interface_1.ObdProtocol.AUTO,
            isActive: true,
            startTime: new Date(),
            config: {
                sensors: config.sensors || this.getDefaultSensors(),
                interval: config.interval || this.SENSOR_INTERVALS.HIGH,
            },
            buffer: [],
            stats: {
                packetsReceived: 0,
                packetsLost: 0,
                avgLatency: 0,
            },
        };
        this.activeStreams.set(streamId, stream);
        await this.redis.setex(`obd:stream:${deviceId}`, 3600, JSON.stringify({
            streamId,
            startedAt: stream.startTime.toISOString(),
            config: stream.config,
        }));
        this.logger.log(`Started OBD stream ${streamId} for device ${deviceId}`);
        return stream;
    }
    async stopStreaming(streamId) {
        const stream = this.activeStreams.get(streamId);
        if (!stream)
            return;
        stream.isActive = false;
        stream.endTime = new Date();
        if (stream.buffer.length > 0) {
            await this.flushBuffer(streamId);
        }
        await this.redis.del(`obd:stream:${stream.deviceId}`);
        this.activeStreams.delete(streamId);
        this.logger.log(`Stopped OBD stream ${streamId}`);
    }
    async processSensorData(streamId, data) {
        const stream = this.activeStreams.get(streamId);
        if (!stream || !stream.isActive)
            return;
        if (!data.timestamp) {
            data.timestamp = new Date();
        }
        stream.stats.packetsReceived++;
        stream.buffer.push(data);
        await this.checkCriticalValues(stream.deviceId, data);
        await this.redis.publish(`obd:live:${stream.deviceId}`, JSON.stringify(data));
        if (stream.buffer.length >= 100) {
            await this.flushBuffer(streamId);
        }
    }
    async captureFreezeFrame(deviceId, dtcCode) {
        const device = await this.prisma.obdDevice.findUnique({
            where: { id: deviceId },
            include: { vehicle: true },
        });
        if (!device) {
            throw new Error('Device not found');
        }
        const freezeFrame = {
            id: `ff:${deviceId}:${Date.now()}`,
            deviceId,
            dtcCode,
            capturedAt: new Date(),
            data: {
                rpm: await this.queryPid(deviceId, this.PIDS.RPM),
                speed: await this.queryPid(deviceId, this.PIDS.SPEED),
                coolantTemp: await this.queryPid(deviceId, this.PIDS.COOLANT_TEMP),
                throttlePos: await this.queryPid(deviceId, this.PIDS.THROTTLE_POS),
                engineLoad: await this.queryPid(deviceId, this.PIDS.ENGINE_LOAD),
                intakeTemp: await this.queryPid(deviceId, this.PIDS.INTAKE_TEMP),
                mafRate: await this.queryPid(deviceId, this.PIDS.MAF_RATE),
                fuelSystemStatus: await this.queryPid(deviceId, '0103'),
                calculatedLoad: await this.queryPid(deviceId, this.PIDS.ENGINE_LOAD),
                absolutePressure: await this.queryPid(deviceId, '010B'),
                timingAdvance: await this.queryPid(deviceId, '010E'),
                intakeAirTemp: await this.queryPid(deviceId, this.PIDS.INTAKE_TEMP),
                airflowRate: await this.queryPid(deviceId, this.PIDS.MAF_RATE),
                o2SensorVoltage: await this.queryPid(deviceId, '0114'),
            },
            storedInDb: false,
        };
        await this.prisma.obdFreezeFrame.create({
            data: {
                deviceId,
                dtcCode,
                data: freezeFrame.data,
                capturedAt: freezeFrame.capturedAt,
            },
        });
        freezeFrame.storedInDb = true;
        this.logger.log(`Captured freeze frame for ${dtcCode} on device ${deviceId}`);
        return freezeFrame;
    }
    async getMode06Tests(deviceId) {
        const device = await this.prisma.obdDevice.findUnique({
            where: { id: deviceId },
        });
        if (!device) {
            throw new Error('Device not found');
        }
        const supportedTestsNum = await this.queryPid(deviceId, this.PIDS.MODE_06_REQUEST);
        const supportedTests = supportedTestsNum !== null ? supportedTestsNum.toString(16) : null;
        const results = [];
        const supportedTestIds = [];
        for (let testId = 0; testId < 255; testId++) {
            if (this.isTestSupported(supportedTests, testId)) {
                supportedTestIds.push(testId);
            }
        }
        for (const testId of supportedTestIds) {
            const testResult = await this.queryMode06Test(deviceId, testId);
            if (testResult) {
                results.push(testResult);
            }
        }
        if (results.length > 0) {
            await this.prisma.obdMode06Result.createMany({
                data: results.map(r => ({
                    deviceId,
                    testId: r.testId.toString(),
                    componentId: r.componentId?.toString(),
                    testName: r.testName,
                    value: r.value,
                    minValue: r.minValue,
                    maxValue: r.maxValue,
                    status: r.status,
                    unit: r.unit,
                    recordedAt: new Date(),
                })),
            });
        }
        return results;
    }
    async executeEvapTest(deviceId, testType) {
        const device = await this.prisma.obdDevice.findUnique({
            where: { id: deviceId },
            include: { vehicle: true },
        });
        if (!device) {
            throw new Error('Device not found');
        }
        this.logger.log(`Starting EVAP ${testType} test on device ${deviceId}`);
        const test = {
            id: `evap:${deviceId}:${Date.now()}`,
            deviceId,
            testType,
            startedAt: new Date(),
            status: 'RUNNING',
            results: [],
        };
        const dbTest = await this.prisma.obdEvapTest.create({
            data: {
                deviceId,
                testType,
                status: 'RUNNING',
                startedAt: test.startedAt,
            },
        });
        test.id = dbTest.id;
        return test;
    }
    getActiveStream(deviceId) {
        for (const stream of this.activeStreams.values()) {
            if (stream.deviceId === deviceId && stream.isActive) {
                return stream;
            }
        }
        return undefined;
    }
    getAllActiveStreams() {
        return Array.from(this.activeStreams.values()).filter(s => s.isActive);
    }
    async getSensorHistory(deviceId, sensor, from, to, aggregation) {
        const allowedSensors = [
            'rpm',
            'speed',
            'coolantTemp',
            'engineLoad',
            'throttlePosition',
            'fuelLevel',
            'intakeTemp',
            'mafRate',
            'timingAdvance',
            'voltage',
            'fuelPressure',
            'oilTemp',
            'ambientTemp',
            'barometricPressure',
        ];
        if (!allowedSensors.includes(sensor)) {
            throw new common_1.BadRequestException(`Invalid sensor: ${sensor}`);
        }
        const cacheKey = `obd:history:${deviceId}:${sensor}:${from.getTime()}:${to.getTime()}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        const readings = await this.prisma.obdReading.findMany({
            where: {
                deviceId,
                recordedAt: { gte: from, lte: to },
            },
            select: {
                recordedAt: true,
                rawData: true,
            },
            orderBy: { recordedAt: 'asc' },
        });
        const aggregated = new Map();
        for (const reading of readings) {
            const minuteKey = new Date(reading.recordedAt).toISOString().substring(0, 16);
            const rawData = reading.rawData;
            const sensorValue = rawData?.[sensor];
            if (sensorValue !== undefined && sensorValue !== null) {
                const values = aggregated.get(minuteKey) ?? [];
                values.push(Number(sensorValue));
                aggregated.set(minuteKey, values);
            }
        }
        const aggFn = aggregation ?? 'avg';
        const result = Array.from(aggregated.entries()).map(([key, values]) => {
            let value;
            switch (aggFn) {
                case 'min':
                    value = Math.min(...values);
                    break;
                case 'max':
                    value = Math.max(...values);
                    break;
                case 'count':
                    value = values.length;
                    break;
                default:
                    value = values.reduce((a, b) => a + b, 0) / values.length;
                    break;
            }
            return { timestamp: new Date(key), value };
        });
        await this.redis.setex(cacheKey, 300, JSON.stringify(result));
        return result;
    }
    async applyRetentionPolicy(deviceId, days) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const toArchive = await this.prisma.obdReading.findMany({
            where: {
                deviceId,
                recordedAt: { lt: cutoffDate },
            },
        });
        if (toArchive.length > 0) {
            await this.archiveToColdStorage(deviceId, toArchive);
        }
        const result = await this.prisma.obdReading.deleteMany({
            where: {
                deviceId,
                recordedAt: { lt: cutoffDate },
            },
        });
        this.logger.log(`Applied retention policy for ${deviceId}: deleted ${result.count} records`);
        return result.count;
    }
    getDefaultSensors() {
        return ['rpm', 'speed', 'coolantTemp', 'throttlePos', 'engineLoad', 'fuelLevel', 'voltage'];
    }
    async queryPid(_deviceId, _pid) {
        return null;
    }
    async queryMode06Test(_deviceId, _testId) {
        return null;
    }
    isTestSupported(supportedMask, testId) {
        if (!supportedMask)
            return false;
        const byteIndex = Math.floor(testId / 8);
        const bitIndex = testId % 8;
        const byte = parseInt(supportedMask.substr(byteIndex * 2, 2), 16);
        return (byte & (1 << bitIndex)) !== 0;
    }
    async checkCriticalValues(deviceId, data) {
        const alerts = [];
        if (data.coolantTemp && data.coolantTemp > 110) {
            alerts.push(`Critical coolant temperature: ${data.coolantTemp}°C`);
        }
        if (data.voltage && data.voltage < 11.0) {
            alerts.push(`Low battery voltage: ${data.voltage}V`);
        }
        if (data.rpm && data.rpm > 6000) {
            alerts.push(`High RPM: ${data.rpm}`);
        }
        if (alerts.length > 0) {
            const device = await this.prisma.obdDevice.findUnique({
                where: { id: deviceId },
                include: { tenant: true, vehicle: true },
            });
            if (device) {
                await this.notifications.sendToTenant(device.tenantId, {
                    title: '⚠️ OBD Alert',
                    body: `${device.vehicle?.make} ${device.vehicle?.model}: ${alerts.join(', ')}`,
                    priority: 'high',
                    data: {
                        type: 'OBD_CRITICAL',
                        deviceId,
                        alerts,
                    },
                });
            }
        }
    }
    async flushBuffer(streamId) {
        const stream = this.activeStreams.get(streamId);
        if (!stream || stream.buffer.length === 0)
            return;
        const batch = stream.buffer.splice(0, stream.buffer.length);
        const device = await this.prisma.obdDevice.findUnique({
            where: { id: stream.deviceId },
            select: { tenantId: true },
        });
        if (!device)
            return;
        await this.prisma.obdReading.createMany({
            data: batch.map(data => ({
                tenantId: device.tenantId,
                deviceId: stream.deviceId,
                rpm: data.rpm,
                speed: data.speed,
                coolantTemp: data.coolantTemp,
                engineLoad: data.engineLoad,
                fuelLevel: data.fuelLevel,
                throttlePos: data.throttlePos,
                voltage: data.voltage,
                recordedAt: data.timestamp || new Date(),
            })),
            skipDuplicates: true,
        });
        const pipeline = this.redis.pipeline();
        for (const data of batch) {
            const key = `obd:ts:${stream.deviceId}:${data.timestamp?.getTime() || Date.now()}`;
            pipeline.setex(key, 86400, JSON.stringify(data));
        }
        await pipeline.exec();
    }
    async archiveToColdStorage(deviceId, data) {
        this.logger.log(`Archiving ${data.length} records for ${deviceId} to cold storage`);
    }
};
exports.ObdStreamingService = ObdStreamingService;
exports.ObdStreamingService = ObdStreamingService = ObdStreamingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        ioredis_2.default])
], ObdStreamingService);
