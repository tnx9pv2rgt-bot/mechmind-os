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
exports.CustomerController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const customer_service_1 = require("../services/customer.service");
const vehicle_service_1 = require("../services/vehicle.service");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../auth/guards/roles.guard");
const roles_decorator_1 = require("../../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../../auth/decorators/current-user.decorator");
const customer_dto_1 = require("../dto/customer.dto");
const vehicle_dto_1 = require("../dto/vehicle.dto");
let CustomerController = class CustomerController {
    constructor(customerService, vehicleService) {
        this.customerService = customerService;
        this.vehicleService = vehicleService;
    }
    async createCustomer(tenantId, dto) {
        const customer = await this.customerService.create(tenantId, dto);
        return {
            success: true,
            data: customer,
        };
    }
    async getCustomers(tenantId, limit, offset) {
        const result = await this.customerService.findAll(tenantId, {
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
        });
        return {
            success: true,
            data: result.customers,
            meta: {
                total: result.total,
                limit: limit ? parseInt(limit) : 50,
                offset: offset ? parseInt(offset) : 0,
            },
        };
    }
    async searchCustomers(tenantId, query) {
        const result = await this.customerService.search(tenantId, {
            name: query.name,
            email: query.email,
            limit: query.limit,
            offset: query.offset,
        });
        return {
            success: true,
            data: result.customers,
            meta: {
                total: result.total,
            },
        };
    }
    async getCustomer(tenantId, customerId) {
        const customer = await this.customerService.findById(tenantId, customerId);
        return {
            success: true,
            data: customer,
        };
    }
    async updateCustomer(tenantId, customerId, dto) {
        const customer = await this.customerService.update(tenantId, customerId, dto);
        return {
            success: true,
            data: customer,
        };
    }
    async addVehicle(tenantId, customerId, dto) {
        const vehicle = await this.vehicleService.create(tenantId, customerId, dto);
        return {
            success: true,
            data: vehicle,
        };
    }
    async getCustomerVehicles(tenantId, customerId) {
        const vehicles = await this.vehicleService.findByCustomer(tenantId, customerId);
        return {
            success: true,
            data: vehicles,
        };
    }
    async getVehicle(tenantId, vehicleId) {
        const vehicle = await this.vehicleService.findById(tenantId, vehicleId);
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
exports.CustomerController = CustomerController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new customer' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Customer created successfully',
        type: customer_dto_1.CustomerResponseDto,
    }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, customer_dto_1.CreateCustomerDto]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "createCustomer", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get all customers' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'offset', required: false, type: Number }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "getCustomers", null);
__decorate([
    (0, common_1.Get)('search'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Search customers' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, customer_dto_1.CustomerSearchDto]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "searchCustomers", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get customer by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Customer ID' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "getCustomer", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Update customer' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Customer ID' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, customer_dto_1.UpdateCustomerDto]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "updateCustomer", null);
__decorate([
    (0, common_1.Post)(':id/vehicles'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Add vehicle to customer' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Customer ID' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, vehicle_dto_1.CreateVehicleDto]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "addVehicle", null);
__decorate([
    (0, common_1.Get)(':id/vehicles'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get customer vehicles' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Customer ID' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "getCustomerVehicles", null);
__decorate([
    (0, common_1.Get)('vehicles/:vehicleId'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get vehicle by ID' }),
    (0, swagger_1.ApiParam)({ name: 'vehicleId', description: 'Vehicle ID' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('vehicleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "getVehicle", null);
__decorate([
    (0, common_1.Patch)('vehicles/:vehicleId'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Update vehicle' }),
    (0, swagger_1.ApiParam)({ name: 'vehicleId', description: 'Vehicle ID' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('vehicleId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, vehicle_dto_1.UpdateVehicleDto]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "updateVehicle", null);
__decorate([
    (0, common_1.Delete)('vehicles/:vehicleId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Delete vehicle' }),
    (0, swagger_1.ApiParam)({ name: 'vehicleId', description: 'Vehicle ID' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('vehicleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "deleteVehicle", null);
exports.CustomerController = CustomerController = __decorate([
    (0, swagger_1.ApiTags)('Customers'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('v1/customers'),
    __metadata("design:paramtypes", [customer_service_1.CustomerService,
        vehicle_service_1.VehicleService])
], CustomerController);
