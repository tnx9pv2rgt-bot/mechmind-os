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
exports.VehicleController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const vehicle_service_1 = require("../services/vehicle.service");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../auth/guards/roles.guard");
const roles_decorator_1 = require("../../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../../auth/decorators/current-user.decorator");
const vehicle_dto_1 = require("../dto/vehicle.dto");
let VehicleController = class VehicleController {
    constructor(vehicleService) {
        this.vehicleService = vehicleService;
    }
    async getVehicles(tenantId, limit, offset, search, status) {
        const result = await this.vehicleService.findAll(tenantId, {
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
            search,
            status,
        });
        return {
            success: true,
            data: result.vehicles,
            meta: {
                total: result.total,
                limit: limit ? parseInt(limit) : 50,
                offset: offset ? parseInt(offset) : 0,
            },
        };
    }
    async getVehicle(tenantId, vehicleId) {
        const vehicle = await this.vehicleService.findById(tenantId, vehicleId);
        return {
            success: true,
            data: vehicle,
        };
    }
    async createVehicle(tenantId, body) {
        const { customerId, ...dto } = body;
        const vehicle = await this.vehicleService.create(tenantId, customerId, dto);
        return {
            success: true,
            data: vehicle,
        };
    }
    async updateVehicle(tenantId, vehicleId, dto) {
        const vehicle = await this.vehicleService.update(tenantId, vehicleId, dto);
        return {
            success: true,
            data: vehicle,
        };
    }
    async deleteVehicle(tenantId, vehicleId) {
        await this.vehicleService.delete(tenantId, vehicleId);
        return {
            success: true,
            message: 'Vehicle deleted successfully',
        };
    }
};
exports.VehicleController = VehicleController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get all vehicles with filtering and pagination' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'offset', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, type: String }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [vehicle_dto_1.VehicleResponseDto] }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('offset')),
    __param(3, (0, common_1.Query)('search')),
    __param(4, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], VehicleController.prototype, "getVehicles", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get vehicle by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Vehicle ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: vehicle_dto_1.VehicleResponseDto }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], VehicleController.prototype, "getVehicle", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Create vehicle (requires customerId in body)' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: vehicle_dto_1.VehicleResponseDto }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VehicleController.prototype, "createVehicle", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Update vehicle' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Vehicle ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: vehicle_dto_1.VehicleResponseDto }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, vehicle_dto_1.UpdateVehicleDto]),
    __metadata("design:returntype", Promise)
], VehicleController.prototype, "updateVehicle", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Delete vehicle' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Vehicle ID' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], VehicleController.prototype, "deleteVehicle", null);
exports.VehicleController = VehicleController = __decorate([
    (0, swagger_1.ApiTags)('Vehicles'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('vehicles'),
    __metadata("design:paramtypes", [vehicle_service_1.VehicleService])
], VehicleController);
