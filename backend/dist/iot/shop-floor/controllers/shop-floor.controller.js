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
exports.ShopFloorController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../../auth/guards/roles.guard");
const roles_decorator_1 = require("../../../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../../../auth/decorators/current-user.decorator");
const shop_floor_service_1 = require("../services/shop-floor.service");
const shop_floor_dto_1 = require("../dto/shop-floor.dto");
const roles_guard_2 = require("../../../auth/guards/roles.guard");
let ShopFloorController = class ShopFloorController {
    constructor(shopFloorService) {
        this.shopFloorService = shopFloorService;
    }
    async initializeShopFloor(tenantId, dto) {
        return await this.shopFloorService.initializeShopFloor(tenantId, dto);
    }
    async getAllBays(tenantId) {
        return await this.shopFloorService.getAllBays(tenantId);
    }
    async getBay(bayId) {
        return await this.shopFloorService.getBay(bayId);
    }
    async addBaySensor(bayId, dto) {
        return await this.shopFloorService.addBaySensor(bayId, {
            type: dto.type,
            name: dto.name,
            isActive: dto.isActive === 'true',
            batteryLevel: dto.batteryLevel,
            config: dto.config || {},
        });
    }
    async processSensorReading(dto) {
        await this.shopFloorService.processSensorReading(dto);
    }
    async assignVehicleToBay(bayId, dto) {
        return await this.shopFloorService.assignVehicleToBay(bayId, dto.vehicleId, dto.workOrderId, dto.technicianIds);
    }
    async releaseBay(bayId) {
        return await this.shopFloorService.releaseBay(bayId);
    }
    async updateTechnicianLocation(technicianId, dto) {
        return await this.shopFloorService.updateTechnicianLocation(technicianId, {
            x: dto.x,
            y: dto.y,
            floor: dto.floor,
            beaconId: dto.beaconId,
        });
    }
    async getActiveTechnicians(tenantId) {
        return await this.shopFloorService.getActiveTechnicians(tenantId);
    }
    async getWorkOrderProgress(workOrderId) {
        return await this.shopFloorService.getWorkOrderProgress(workOrderId);
    }
    async updateJobStatus(workOrderId, dto) {
        return await this.shopFloorService.updateJobStatus(workOrderId, dto.status);
    }
    async getShopFloorAnalytics(tenantId, query) {
        return await this.shopFloorService.getShopFloorAnalytics(tenantId, new Date(query.from), new Date(query.to));
    }
    async getRecentEvents(tenantId, limit) {
        return await this.shopFloorService.getRecentEvents(tenantId, limit || 50);
    }
};
exports.ShopFloorController = ShopFloorController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Initialize shop floor' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: [shop_floor_dto_1.BayResponseDto] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, shop_floor_dto_1.InitializeShopFloorDto]),
    __metadata("design:returntype", Promise)
], ShopFloorController.prototype, "initializeShopFloor", null);
__decorate([
    (0, common_1.Get)('bays'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all bays' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [shop_floor_dto_1.BayResponseDto] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShopFloorController.prototype, "getAllBays", null);
__decorate([
    (0, common_1.Get)('bays/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get bay details' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: shop_floor_dto_1.BayResponseDto }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShopFloorController.prototype, "getBay", null);
__decorate([
    (0, common_1.Post)('bays/:id/sensors'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Add sensor to bay' }),
    (0, swagger_1.ApiResponse)({ status: 201 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, shop_floor_dto_1.AddBaySensorDto]),
    __metadata("design:returntype", Promise)
], ShopFloorController.prototype, "addBaySensor", null);
__decorate([
    (0, common_1.Post)('sensor-readings'),
    (0, swagger_1.ApiOperation)({ summary: 'Process sensor reading' }),
    (0, swagger_1.ApiResponse)({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [shop_floor_dto_1.SensorReadingDto]),
    __metadata("design:returntype", Promise)
], ShopFloorController.prototype, "processSensorReading", null);
__decorate([
    (0, common_1.Post)('bays/:id/assign'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Assign vehicle to bay' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: shop_floor_dto_1.BayResponseDto }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, shop_floor_dto_1.AssignVehicleDto]),
    __metadata("design:returntype", Promise)
], ShopFloorController.prototype, "assignVehicleToBay", null);
__decorate([
    (0, common_1.Post)('bays/:id/release'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER, roles_guard_2.UserRole.MECHANIC),
    (0, swagger_1.ApiOperation)({ summary: 'Release bay' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: shop_floor_dto_1.BayResponseDto }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShopFloorController.prototype, "releaseBay", null);
__decorate([
    (0, common_1.Post)('technicians/:id/location'),
    (0, swagger_1.ApiOperation)({ summary: 'Update technician location' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: shop_floor_dto_1.TechnicianLocationDto }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, shop_floor_dto_1.UpdateTechnicianLocationDto]),
    __metadata("design:returntype", Promise)
], ShopFloorController.prototype, "updateTechnicianLocation", null);
__decorate([
    (0, common_1.Get)('technicians/active'),
    (0, swagger_1.ApiOperation)({ summary: 'Get active technicians' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [shop_floor_dto_1.TechnicianLocationDto] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShopFloorController.prototype, "getActiveTechnicians", null);
__decorate([
    (0, common_1.Get)('work-orders/:id/progress'),
    (0, swagger_1.ApiOperation)({ summary: 'Get work order progress' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: shop_floor_dto_1.WorkOrderProgressDto }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShopFloorController.prototype, "getWorkOrderProgress", null);
__decorate([
    (0, common_1.Patch)('work-orders/:id/status'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER, roles_guard_2.UserRole.MECHANIC),
    (0, swagger_1.ApiOperation)({ summary: 'Update job status' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: shop_floor_dto_1.WorkOrderProgressDto }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, shop_floor_dto_1.UpdateJobStatusDto]),
    __metadata("design:returntype", Promise)
], ShopFloorController.prototype, "updateJobStatus", null);
__decorate([
    (0, common_1.Get)('analytics'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Get shop floor analytics' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: shop_floor_dto_1.ShopFloorAnalyticsDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, shop_floor_dto_1.AnalyticsQueryDto]),
    __metadata("design:returntype", Promise)
], ShopFloorController.prototype, "getShopFloorAnalytics", null);
__decorate([
    (0, common_1.Get)('events'),
    (0, swagger_1.ApiOperation)({ summary: 'Get recent events' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [shop_floor_dto_1.ShopFloorEventDto] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], ShopFloorController.prototype, "getRecentEvents", null);
exports.ShopFloorController = ShopFloorController = __decorate([
    (0, swagger_1.ApiTags)('Shop Floor'),
    (0, common_1.Controller)('shop-floor'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [shop_floor_service_1.ShopFloorService])
], ShopFloorController);
