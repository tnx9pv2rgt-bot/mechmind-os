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
exports.LicensePlateController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../../auth/guards/roles.guard");
const roles_decorator_1 = require("../../../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../../../auth/decorators/current-user.decorator");
const license_plate_service_1 = require("../services/license-plate.service");
const license_plate_dto_1 = require("../dto/license-plate.dto");
const roles_guard_2 = require("../../../auth/guards/roles.guard");
let LicensePlateController = class LicensePlateController {
    constructor(licensePlateService) {
        this.licensePlateService = licensePlateService;
    }
    async detectLicensePlate(file, dto) {
        return await this.licensePlateService.detectLicensePlate(file.buffer, {
            cameraId: dto.cameraId,
            provider: dto.provider,
            minConfidence: dto.minConfidence,
        });
    }
    async recordEntryExit(dto) {
        const detection = await this.licensePlateService.detectLicensePlate(Buffer.from(''), { cameraId: dto.cameraId });
        return await this.licensePlateService.recordEntryExit(detection, dto.type, {
            location: dto.location,
            isAuthorized: dto.isAuthorized,
        });
    }
    async registerCamera(tenantId, dto) {
        return await this.licensePlateService.registerCamera(tenantId, dto);
    }
    async getCameras(tenantId) {
        return await this.licensePlateService.getCameras(tenantId);
    }
    async getCamera(cameraId) {
        return await this.licensePlateService.getCamera(cameraId);
    }
    async updateCameraStatus(cameraId, isActive) {
        return await this.licensePlateService.updateCameraStatus(cameraId, isActive);
    }
    async lookupVehicle(plate) {
        return await this.licensePlateService.lookupVehicle(plate);
    }
    async getActiveSessions(tenantId) {
        return await this.licensePlateService.getActiveSessions(tenantId);
    }
    async getStats(tenantId, query) {
        return await this.licensePlateService.getStats(tenantId, new Date(query.from), new Date(query.to));
    }
};
exports.LicensePlateController = LicensePlateController;
__decorate([
    (0, common_1.Post)('detect'),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image')),
    (0, swagger_1.ApiOperation)({ summary: 'Detect license plate from image' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: license_plate_dto_1.LicensePlateDetectionDto }),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, license_plate_dto_1.DetectLicensePlateDto]),
    __metadata("design:returntype", Promise)
], LicensePlateController.prototype, "detectLicensePlate", null);
__decorate([
    (0, common_1.Post)('entry-exit'),
    (0, swagger_1.ApiOperation)({ summary: 'Record vehicle entry or exit' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: license_plate_dto_1.VehicleEntryExitDto }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [license_plate_dto_1.RecordEntryExitDto]),
    __metadata("design:returntype", Promise)
], LicensePlateController.prototype, "recordEntryExit", null);
__decorate([
    (0, common_1.Post)('cameras'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Register LPR camera' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: license_plate_dto_1.LprCameraDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, license_plate_dto_1.RegisterCameraDto]),
    __metadata("design:returntype", Promise)
], LicensePlateController.prototype, "registerCamera", null);
__decorate([
    (0, common_1.Get)('cameras'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all cameras' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [license_plate_dto_1.LprCameraDto] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LicensePlateController.prototype, "getCameras", null);
__decorate([
    (0, common_1.Get)('cameras/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get camera details' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: license_plate_dto_1.LprCameraDto }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LicensePlateController.prototype, "getCamera", null);
__decorate([
    (0, common_1.Patch)('cameras/:id/status'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Update camera status' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: license_plate_dto_1.LprCameraDto }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('isActive')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", Promise)
], LicensePlateController.prototype, "updateCameraStatus", null);
__decorate([
    (0, common_1.Get)('lookup/:plate'),
    (0, swagger_1.ApiOperation)({ summary: 'Lookup vehicle by license plate' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: license_plate_dto_1.VehicleLookupResponseDto }),
    __param(0, (0, common_1.Param)('plate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LicensePlateController.prototype, "lookupVehicle", null);
__decorate([
    (0, common_1.Get)('sessions/active'),
    (0, swagger_1.ApiOperation)({ summary: 'Get active parking sessions' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [license_plate_dto_1.ParkingSessionDto] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LicensePlateController.prototype, "getActiveSessions", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Get LPR statistics' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: license_plate_dto_1.LprStatsDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, license_plate_dto_1.LprStatsQueryDto]),
    __metadata("design:returntype", Promise)
], LicensePlateController.prototype, "getStats", null);
exports.LicensePlateController = LicensePlateController = __decorate([
    (0, swagger_1.ApiTags)('License Plate Recognition'),
    (0, common_1.Controller)('v1/lpr'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [license_plate_service_1.LicensePlateService])
], LicensePlateController);
