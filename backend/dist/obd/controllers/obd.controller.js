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
exports.ObdController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../auth/guards/roles.guard");
const roles_decorator_1 = require("../../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../../auth/decorators/current-user.decorator");
const obd_service_1 = require("../services/obd.service");
const throttler_1 = require("@nestjs/throttler");
const obd_dto_1 = require("../dto/obd.dto");
const roles_guard_2 = require("../../auth/guards/roles.guard");
let ObdController = class ObdController {
    constructor(obdService) {
        this.obdService = obdService;
    }
    async registerDevice(tenantId, dto) {
        return this.obdService.registerDevice(tenantId, dto);
    }
    async listDevices(tenantId, vehicleId) {
        return this.obdService.listDevices(tenantId, vehicleId);
    }
    async getDevice(tenantId, id) {
        return this.obdService.getDevice(tenantId, id);
    }
    async updateDevice(tenantId, id, dto) {
        return this.obdService.updateDevice(tenantId, id, dto);
    }
    async recordReading(tenantId, dto) {
        return this.obdService.recordReading(dto, tenantId);
    }
    async recordTroubleCodes(tenantId, deviceId, codes) {
        return this.obdService.recordTroubleCodes(deviceId, codes, tenantId);
    }
    async getReadings(tenantId, query) {
        return this.obdService.getReadings(tenantId, {
            deviceId: query.deviceId,
            vehicleId: query.vehicleId,
            from: query.from ? new Date(query.from) : undefined,
            to: query.to ? new Date(query.to) : undefined,
            limit: query.limit,
        });
    }
    async getLatestReading(tenantId, deviceId) {
        return this.obdService.getLatestReading(tenantId, deviceId);
    }
    async getTroubleCodes(tenantId, deviceId, vehicleId, active) {
        return this.obdService.getTroubleCodes(tenantId, {
            deviceId,
            vehicleId,
            active: active !== undefined ? active === 'true' : undefined,
        });
    }
    async clearTroubleCodes(tenantId, userId, deviceId, dto) {
        return this.obdService.clearTroubleCodes(tenantId, deviceId, {
            ...dto,
            clearedBy: userId,
        });
    }
    async getHealthReport(tenantId, vehicleId) {
        return this.obdService.generateHealthReport(tenantId, vehicleId);
    }
};
exports.ObdController = ObdController;
__decorate([
    (0, common_1.Post)('devices'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Register new OBD device' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: obd_dto_1.ObdDeviceResponseDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, obd_dto_1.RegisterDeviceDto]),
    __metadata("design:returntype", Promise)
], ObdController.prototype, "registerDevice", null);
__decorate([
    (0, common_1.Get)('devices'),
    (0, swagger_1.ApiOperation)({ summary: 'List OBD devices' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [obd_dto_1.ObdDeviceResponseDto] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Query)('vehicleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ObdController.prototype, "listDevices", null);
__decorate([
    (0, common_1.Get)('devices/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get device details' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: obd_dto_1.ObdDeviceResponseDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ObdController.prototype, "getDevice", null);
__decorate([
    (0, common_1.Patch)('devices/:id'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Update device' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: obd_dto_1.ObdDeviceResponseDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, obd_dto_1.UpdateDeviceDto]),
    __metadata("design:returntype", Promise)
], ObdController.prototype, "updateDevice", null);
__decorate([
    (0, common_1.Post)('readings'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER, roles_guard_2.UserRole.MECHANIC),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 1000 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Record OBD reading (from device)' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: obd_dto_1.ObdReadingResponseDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, obd_dto_1.ObdReadingDto]),
    __metadata("design:returntype", Promise)
], ObdController.prototype, "recordReading", null);
__decorate([
    (0, common_1.Post)('devices/:id/codes'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER, roles_guard_2.UserRole.MECHANIC),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 100 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Record trouble codes (from device)' }),
    (0, swagger_1.ApiResponse)({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Array]),
    __metadata("design:returntype", Promise)
], ObdController.prototype, "recordTroubleCodes", null);
__decorate([
    (0, common_1.Get)('readings'),
    (0, swagger_1.ApiOperation)({ summary: 'Get OBD readings' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [obd_dto_1.ObdReadingResponseDto] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, obd_dto_1.ReadingQueryDto]),
    __metadata("design:returntype", Promise)
], ObdController.prototype, "getReadings", null);
__decorate([
    (0, common_1.Get)('devices/:id/readings/latest'),
    (0, swagger_1.ApiOperation)({ summary: 'Get latest reading from device' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: obd_dto_1.ObdReadingResponseDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ObdController.prototype, "getLatestReading", null);
__decorate([
    (0, common_1.Get)('trouble-codes'),
    (0, swagger_1.ApiOperation)({ summary: 'Get trouble codes' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [obd_dto_1.TroubleCodeResponseDto] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Query)('deviceId')),
    __param(2, (0, common_1.Query)('vehicleId')),
    __param(3, (0, common_1.Query)('active')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], ObdController.prototype, "getTroubleCodes", null);
__decorate([
    (0, common_1.Post)('devices/:id/codes/clear'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER, roles_guard_2.UserRole.MECHANIC),
    (0, swagger_1.ApiOperation)({ summary: 'Clear trouble codes' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, obd_dto_1.ClearTroubleCodesDto]),
    __metadata("design:returntype", Promise)
], ObdController.prototype, "clearTroubleCodes", null);
__decorate([
    (0, common_1.Get)('vehicles/:id/health'),
    (0, swagger_1.ApiOperation)({ summary: 'Get vehicle health report' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: obd_dto_1.VehicleHealthReportDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ObdController.prototype, "getHealthReport", null);
exports.ObdController = ObdController = __decorate([
    (0, swagger_1.ApiTags)('OBD Diagnostics'),
    (0, common_1.Controller)('obd'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [obd_service_1.ObdService])
], ObdController);
