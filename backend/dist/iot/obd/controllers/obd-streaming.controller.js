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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObdStreamingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../../auth/guards/roles.guard");
const roles_decorator_1 = require("../../../auth/decorators/roles.decorator");
const obd_streaming_service_1 = require("../services/obd-streaming.service");
const obd_streaming_dto_1 = require("../dto/obd-streaming.dto");
const roles_guard_2 = require("../../../auth/guards/roles.guard");
let ObdStreamingController = class ObdStreamingController {
    constructor(streamingService) {
        this.streamingService = streamingService;
    }
    async startStreaming(dto) {
        const stream = await this.streamingService.startStreaming(dto.deviceId, {
            adapterType: dto.adapterType,
            protocol: dto.protocol,
            sensors: dto.sensors,
            interval: dto.interval,
        });
        return {
            streamId: stream.id,
            deviceId: stream.deviceId,
            adapterType: stream.adapterType,
            protocol: stream.protocol,
            isActive: stream.isActive,
            startTime: stream.startTime,
            config: stream.config,
        };
    }
    async stopStreaming(streamId) {
        await this.streamingService.stopStreaming(streamId);
    }
    async getActiveStreams() {
        const streams = this.streamingService.getAllActiveStreams();
        return streams.map(stream => ({
            streamId: stream.id,
            deviceId: stream.deviceId,
            adapterType: stream.adapterType,
            protocol: stream.protocol,
            isActive: stream.isActive,
            startTime: stream.startTime,
            config: stream.config,
        }));
    }
    async getDeviceStream(deviceId) {
        const stream = this.streamingService.getActiveStream(deviceId);
        if (!stream)
            return null;
        return {
            streamId: stream.id,
            deviceId: stream.deviceId,
            adapterType: stream.adapterType,
            protocol: stream.protocol,
            isActive: stream.isActive,
            startTime: stream.startTime,
            config: stream.config,
        };
    }
    async captureFreezeFrame(dto) {
        const freezeFrame = await this.streamingService.captureFreezeFrame(dto.deviceId, dto.dtcCode);
        return {
            id: freezeFrame.id,
            deviceId: freezeFrame.deviceId,
            dtcCode: freezeFrame.dtcCode,
            capturedAt: freezeFrame.capturedAt,
            data: freezeFrame.data,
        };
    }
    async getMode06Tests(deviceId) {
        const results = await this.streamingService.getMode06Tests(deviceId);
        return results;
    }
    async executeEvapTest(dto) {
        const test = await this.streamingService.executeEvapTest(dto.deviceId, dto.testType);
        return {
            id: test.id,
            deviceId: test.deviceId,
            testType: test.testType,
            startedAt: test.startedAt,
            completedAt: test.completedAt,
            status: test.status,
            results: test.results,
        };
    }
    async getSensorHistory(query) {
        return await this.streamingService.getSensorHistory(query.deviceId, query.sensor, new Date(query.from), new Date(query.to), query.aggregation);
    }
    async applyRetentionPolicy(deviceId, days) {
        const deleted = await this.streamingService.applyRetentionPolicy(deviceId, days);
        return { deleted };
    }
};
exports.ObdStreamingController = ObdStreamingController;
__decorate([
    (0, common_1.Post)('streams'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER, roles_guard_2.UserRole.MECHANIC),
    (0, swagger_1.ApiOperation)({ summary: 'Start OBD streaming session' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: obd_streaming_dto_1.StreamResponseDto }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [obd_streaming_dto_1.StartStreamingDto]),
    __metadata("design:returntype", Promise)
], ObdStreamingController.prototype, "startStreaming", null);
__decorate([
    (0, common_1.Delete)('streams/:id'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER, roles_guard_2.UserRole.MECHANIC),
    (0, swagger_1.ApiOperation)({ summary: 'Stop OBD streaming session' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ObdStreamingController.prototype, "stopStreaming", null);
__decorate([
    (0, common_1.Get)('streams'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all active streams' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [obd_streaming_dto_1.StreamResponseDto] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ObdStreamingController.prototype, "getActiveStreams", null);
__decorate([
    (0, common_1.Get)('devices/:id/stream'),
    (0, swagger_1.ApiOperation)({ summary: 'Get active stream for device' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: obd_streaming_dto_1.StreamResponseDto }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ObdStreamingController.prototype, "getDeviceStream", null);
__decorate([
    (0, common_1.Post)('freeze-frame'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER, roles_guard_2.UserRole.MECHANIC),
    (0, swagger_1.ApiOperation)({ summary: 'Capture freeze frame data' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: obd_streaming_dto_1.FreezeFrameResponseDto }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [obd_streaming_dto_1.FreezeFrameRequestDto]),
    __metadata("design:returntype", Promise)
], ObdStreamingController.prototype, "captureFreezeFrame", null);
__decorate([
    (0, common_1.Get)('devices/:id/mode06'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER, roles_guard_2.UserRole.MECHANIC),
    (0, swagger_1.ApiOperation)({ summary: 'Get Mode $06 test results' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [obd_streaming_dto_1.Mode06TestResponseDto] }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ObdStreamingController.prototype, "getMode06Tests", null);
__decorate([
    (0, common_1.Post)('evap-test'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER, roles_guard_2.UserRole.MECHANIC),
    (0, swagger_1.ApiOperation)({ summary: 'Execute Mode $08 EVAP test' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: obd_streaming_dto_1.EvapTestResponseDto }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [obd_streaming_dto_1.EvapTestRequestDto]),
    __metadata("design:returntype", Promise)
], ObdStreamingController.prototype, "executeEvapTest", null);
__decorate([
    (0, common_1.Get)('sensor-history'),
    (0, swagger_1.ApiOperation)({ summary: 'Get sensor history' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [obd_streaming_dto_1.SensorHistoryQueryDto]),
    __metadata("design:returntype", Promise)
], ObdStreamingController.prototype, "getSensorHistory", null);
__decorate([
    (0, common_1.Post)('devices/:id/retention'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Apply data retention policy' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], ObdStreamingController.prototype, "applyRetentionPolicy", null);
exports.ObdStreamingController = ObdStreamingController = __decorate([
    (0, swagger_1.ApiTags)('OBD Streaming'),
    (0, common_1.Controller)('obd-streaming'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [obd_streaming_service_1.ObdStreamingService])
], ObdStreamingController);
