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
exports.VehicleTwinController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../../auth/guards/roles.guard");
const roles_decorator_1 = require("../../../auth/decorators/roles.decorator");
const vehicle_twin_service_1 = require("../services/vehicle-twin.service");
const vehicle_twin_dto_1 = require("../dto/vehicle-twin.dto");
const roles_guard_2 = require("../../../auth/guards/roles.guard");
let VehicleTwinController = class VehicleTwinController {
    constructor(vehicleTwinService) {
        this.vehicleTwinService = vehicleTwinService;
    }
    async getTwinState(vehicleId) {
        return await this.vehicleTwinService.getOrCreateTwin(vehicleId);
    }
    async updateComponent(vehicleId, componentId, dto) {
        return await this.vehicleTwinService.updateComponentStatus(vehicleId, componentId, dto);
    }
    async recordHistory(vehicleId, dto) {
        const history = {
            ...dto,
            date: dto.date ? new Date(dto.date) : new Date(),
            partsUsed: dto.partsUsed || [],
            photos: dto.photos || [],
            documents: dto.documents || [],
        };
        return await this.vehicleTwinService.recordComponentHistory(vehicleId, history);
    }
    async recordDamage(vehicleId, dto) {
        const damage = {
            ...dto,
            location: dto.location || { x: 0, y: 0, z: 0 },
            photos: dto.photos || [],
            reportedAt: dto.reportedAt ? new Date(dto.reportedAt) : new Date(),
        };
        return await this.vehicleTwinService.recordDamage(vehicleId, damage);
    }
    async getPredictiveAlerts(vehicleId) {
        return await this.vehicleTwinService.getPredictiveAlerts(vehicleId);
    }
    async getWearPrediction(vehicleId, componentId) {
        return await this.vehicleTwinService.getWearPrediction(vehicleId, componentId);
    }
    async getVisualizationConfig(vehicleId) {
        return await this.vehicleTwinService.getVisualizationConfig(vehicleId);
    }
    async updateVisualizationConfig(vehicleId, dto) {
        return await this.vehicleTwinService.updateVisualizationConfig(vehicleId, dto);
    }
    async getHealthTrend(vehicleId, query) {
        return await this.vehicleTwinService.getHealthTrend(vehicleId, new Date(query.from), new Date(query.to));
    }
};
exports.VehicleTwinController = VehicleTwinController;
__decorate([
    (0, common_1.Get)(':vehicleId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get vehicle twin state' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: vehicle_twin_dto_1.VehicleTwinStateDto }),
    __param(0, (0, common_1.Param)('vehicleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VehicleTwinController.prototype, "getTwinState", null);
__decorate([
    (0, common_1.Patch)(':vehicleId/components/:componentId'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER, roles_guard_2.UserRole.MECHANIC),
    (0, swagger_1.ApiOperation)({ summary: 'Update component status' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: vehicle_twin_dto_1.ComponentResponseDto }),
    __param(0, (0, common_1.Param)('vehicleId')),
    __param(1, (0, common_1.Param)('componentId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, vehicle_twin_dto_1.UpdateComponentDto]),
    __metadata("design:returntype", Promise)
], VehicleTwinController.prototype, "updateComponent", null);
__decorate([
    (0, common_1.Post)(':vehicleId/history'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER, roles_guard_2.UserRole.MECHANIC),
    (0, swagger_1.ApiOperation)({ summary: 'Record component history event' }),
    (0, swagger_1.ApiResponse)({ status: 201 }),
    __param(0, (0, common_1.Param)('vehicleId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, vehicle_twin_dto_1.RecordHistoryDto]),
    __metadata("design:returntype", Promise)
], VehicleTwinController.prototype, "recordHistory", null);
__decorate([
    (0, common_1.Post)(':vehicleId/damage'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER, roles_guard_2.UserRole.MECHANIC),
    (0, swagger_1.ApiOperation)({ summary: 'Record damage' }),
    (0, swagger_1.ApiResponse)({ status: 201 }),
    __param(0, (0, common_1.Param)('vehicleId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, vehicle_twin_dto_1.RecordDamageDto]),
    __metadata("design:returntype", Promise)
], VehicleTwinController.prototype, "recordDamage", null);
__decorate([
    (0, common_1.Get)(':vehicleId/alerts'),
    (0, swagger_1.ApiOperation)({ summary: 'Get predictive alerts' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [vehicle_twin_dto_1.PredictiveAlertDto] }),
    __param(0, (0, common_1.Param)('vehicleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VehicleTwinController.prototype, "getPredictiveAlerts", null);
__decorate([
    (0, common_1.Get)(':vehicleId/components/:componentId/wear-prediction'),
    (0, swagger_1.ApiOperation)({ summary: 'Get component wear prediction' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: vehicle_twin_dto_1.WearPredictionDto }),
    __param(0, (0, common_1.Param)('vehicleId')),
    __param(1, (0, common_1.Param)('componentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], VehicleTwinController.prototype, "getWearPrediction", null);
__decorate([
    (0, common_1.Get)(':vehicleId/visualization-config'),
    (0, swagger_1.ApiOperation)({ summary: 'Get 3D visualization config' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __param(0, (0, common_1.Param)('vehicleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VehicleTwinController.prototype, "getVisualizationConfig", null);
__decorate([
    (0, common_1.Patch)(':vehicleId/visualization-config'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Update visualization config' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __param(0, (0, common_1.Param)('vehicleId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, vehicle_twin_dto_1.UpdateVisualizationConfigDto]),
    __metadata("design:returntype", Promise)
], VehicleTwinController.prototype, "updateVisualizationConfig", null);
__decorate([
    (0, common_1.Get)(':vehicleId/health-trend'),
    (0, swagger_1.ApiOperation)({ summary: 'Get health trend over time' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __param(0, (0, common_1.Param)('vehicleId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, vehicle_twin_dto_1.HealthTrendQueryDto]),
    __metadata("design:returntype", Promise)
], VehicleTwinController.prototype, "getHealthTrend", null);
exports.VehicleTwinController = VehicleTwinController = __decorate([
    (0, swagger_1.ApiTags)('Vehicle Twin'),
    (0, common_1.Controller)('v1/vehicle-twin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [vehicle_twin_service_1.VehicleTwinService])
], VehicleTwinController);
