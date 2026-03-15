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
exports.EstimateController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const estimate_service_1 = require("../services/estimate.service");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../auth/guards/roles.guard");
const roles_decorator_1 = require("../../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../../auth/decorators/current-user.decorator");
const estimate_dto_1 = require("../dto/estimate.dto");
const client_1 = require("@prisma/client");
let EstimateController = class EstimateController {
    constructor(estimateService) {
        this.estimateService = estimateService;
    }
    async create(tenantId, dto) {
        const estimate = await this.estimateService.create(tenantId, dto);
        return { success: true, data: estimate };
    }
    async findAll(tenantId, status, customerId, limit, offset) {
        const parsedLimit = limit ? parseInt(limit, 10) : 50;
        const parsedOffset = offset ? parseInt(offset, 10) : 0;
        const result = await this.estimateService.findAll(tenantId, {
            status: status,
            customerId,
            limit: Number.isNaN(parsedLimit) ? 50 : parsedLimit,
            offset: Number.isNaN(parsedOffset) ? 0 : parsedOffset,
        });
        return {
            success: true,
            data: result.estimates,
            meta: {
                total: result.total,
                limit: Number.isNaN(parsedLimit) ? 50 : parsedLimit,
                offset: Number.isNaN(parsedOffset) ? 0 : parsedOffset,
            },
        };
    }
    async findById(tenantId, id) {
        const estimate = await this.estimateService.findById(tenantId, id);
        return { success: true, data: estimate };
    }
    async update(tenantId, id, dto) {
        const estimate = await this.estimateService.update(tenantId, id, dto);
        return { success: true, data: estimate };
    }
    async addLine(tenantId, estimateId, dto) {
        const estimate = await this.estimateService.addLine(tenantId, estimateId, dto);
        return { success: true, data: estimate };
    }
    async removeLine(tenantId, lineId) {
        const estimate = await this.estimateService.removeLine(tenantId, lineId);
        return { success: true, data: estimate };
    }
    async send(tenantId, id) {
        const estimate = await this.estimateService.send(tenantId, id);
        return {
            success: true,
            data: estimate,
            message: 'Estimate sent successfully',
        };
    }
    async accept(tenantId, id) {
        const estimate = await this.estimateService.accept(tenantId, id);
        return {
            success: true,
            data: estimate,
            message: 'Estimate accepted',
        };
    }
    async reject(tenantId, id) {
        const estimate = await this.estimateService.reject(tenantId, id);
        return {
            success: true,
            data: estimate,
            message: 'Estimate rejected',
        };
    }
    async convertToBooking(tenantId, id, bookingId) {
        const estimate = await this.estimateService.convertToBooking(tenantId, id, bookingId);
        return {
            success: true,
            data: estimate,
            message: 'Estimate converted to booking',
        };
    }
};
exports.EstimateController = EstimateController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new estimate' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Estimate created', type: estimate_dto_1.EstimateResponseDto }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, estimate_dto_1.CreateEstimateDto]),
    __metadata("design:returntype", Promise)
], EstimateController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.MECHANIC, roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'List estimates' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, enum: client_1.EstimateStatus }),
    (0, swagger_1.ApiQuery)({ name: 'customerId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'offset', required: false, type: Number }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('customerId')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], EstimateController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.MECHANIC, roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get estimate by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Estimate ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: estimate_dto_1.EstimateResponseDto }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EstimateController.prototype, "findById", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Update estimate' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Estimate ID' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, estimate_dto_1.UpdateEstimateDto]),
    __metadata("design:returntype", Promise)
], EstimateController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/lines'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Add a line to an estimate' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Estimate ID' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, estimate_dto_1.CreateEstimateLineDto]),
    __metadata("design:returntype", Promise)
], EstimateController.prototype, "addLine", null);
__decorate([
    (0, common_1.Delete)('lines/:lineId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Remove a line from an estimate' }),
    (0, swagger_1.ApiParam)({ name: 'lineId', description: 'Estimate Line ID' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('lineId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EstimateController.prototype, "removeLine", null);
__decorate([
    (0, common_1.Patch)(':id/send'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Send estimate to customer' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Estimate ID' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EstimateController.prototype, "send", null);
__decorate([
    (0, common_1.Patch)(':id/accept'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Accept an estimate' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Estimate ID' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EstimateController.prototype, "accept", null);
__decorate([
    (0, common_1.Patch)(':id/reject'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Reject an estimate' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Estimate ID' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EstimateController.prototype, "reject", null);
__decorate([
    (0, common_1.Patch)(':id/convert'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Convert estimate to booking' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Estimate ID' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('bookingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], EstimateController.prototype, "convertToBooking", null);
exports.EstimateController = EstimateController = __decorate([
    (0, swagger_1.ApiTags)('Estimates'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('estimates'),
    __metadata("design:paramtypes", [estimate_service_1.EstimateService])
], EstimateController);
