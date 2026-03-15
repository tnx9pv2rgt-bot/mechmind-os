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
exports.FleetController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../auth/guards/roles.guard");
const roles_decorator_1 = require("../../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../../auth/decorators/current-user.decorator");
const fleet_service_1 = require("../services/fleet.service");
const fleet_dto_1 = require("../dto/fleet.dto");
let FleetController = class FleetController {
    constructor(fleetService) {
        this.fleetService = fleetService;
    }
    async create(tenantId, dto) {
        const fleet = await this.fleetService.create(tenantId, dto);
        return fleet;
    }
    async findAll(tenantId) {
        const fleets = await this.fleetService.findAll(tenantId);
        return fleets;
    }
    async findById(tenantId, id) {
        const fleet = await this.fleetService.findById(tenantId, id);
        return fleet;
    }
    async update(tenantId, id, dto) {
        const fleet = await this.fleetService.update(tenantId, id, dto);
        return fleet;
    }
    async delete(tenantId, id) {
        const fleet = await this.fleetService.delete(tenantId, id);
        return fleet;
    }
    async addVehicle(tenantId, fleetId, dto) {
        return this.fleetService.addVehicle(tenantId, fleetId, dto.vehicleId);
    }
    async removeVehicle(tenantId, fleetId, vehicleId) {
        return this.fleetService.removeVehicle(tenantId, fleetId, vehicleId);
    }
};
exports.FleetController = FleetController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.ADMIN, roles_guard_1.UserRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new fleet' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Fleet created', type: fleet_dto_1.FleetResponseDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, fleet_dto_1.CreateFleetDto]),
    __metadata("design:returntype", Promise)
], FleetController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all active fleets' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of fleets', type: [fleet_dto_1.FleetResponseDto] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FleetController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get fleet by ID with vehicles' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Fleet ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Fleet details', type: fleet_dto_1.FleetResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Fleet not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FleetController.prototype, "findById", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.ADMIN, roles_guard_1.UserRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Update a fleet' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Fleet ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Fleet updated', type: fleet_dto_1.FleetResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Fleet not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, fleet_dto_1.UpdateFleetDto]),
    __metadata("design:returntype", Promise)
], FleetController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.ADMIN, roles_guard_1.UserRole.MANAGER),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Soft delete a fleet (set isActive=false)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Fleet ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Fleet deactivated', type: fleet_dto_1.FleetResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Fleet not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FleetController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)(':fleetId/vehicles'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.ADMIN, roles_guard_1.UserRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Add a vehicle to a fleet' }),
    (0, swagger_1.ApiParam)({ name: 'fleetId', description: 'Fleet ID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Vehicle added to fleet' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Vehicle already assigned' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Fleet or vehicle not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Param)('fleetId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, fleet_dto_1.AddFleetVehicleDto]),
    __metadata("design:returntype", Promise)
], FleetController.prototype, "addVehicle", null);
__decorate([
    (0, common_1.Delete)(':fleetId/vehicles/:vehicleId'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.ADMIN, roles_guard_1.UserRole.MANAGER),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Remove a vehicle from a fleet' }),
    (0, swagger_1.ApiParam)({ name: 'fleetId', description: 'Fleet ID' }),
    (0, swagger_1.ApiParam)({ name: 'vehicleId', description: 'Vehicle ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Vehicle removed from fleet' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Fleet-vehicle assignment not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Param)('fleetId')),
    __param(2, (0, common_1.Param)('vehicleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], FleetController.prototype, "removeVehicle", null);
exports.FleetController = FleetController = __decorate([
    (0, swagger_1.ApiTags)('Fleets'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('fleets'),
    __metadata("design:paramtypes", [fleet_service_1.FleetService])
], FleetController);
