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
exports.PartsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../auth/guards/roles.guard");
const roles_decorator_1 = require("../../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../../auth/decorators/current-user.decorator");
const parts_service_1 = require("../services/parts.service");
const parts_dto_1 = require("../dto/parts.dto");
const roles_guard_2 = require("../../auth/guards/roles.guard");
const client_1 = require("@prisma/client");
let PartsController = class PartsController {
    constructor(partsService) {
        this.partsService = partsService;
    }
    async createPart(tenantId, dto) {
        return this.partsService.createPart(tenantId, dto);
    }
    async getParts(tenantId, query) {
        return this.partsService.getParts(tenantId, {
            category: query.category,
            supplierId: query.supplierId,
            lowStock: query.lowStock,
            search: query.search,
        });
    }
    async getPart(tenantId, id) {
        return this.partsService.getPart(tenantId, id);
    }
    async updatePart(tenantId, id, dto) {
        return this.partsService.updatePart(tenantId, id, dto);
    }
    async createSupplier(tenantId, dto) {
        return this.partsService.createSupplier(tenantId, dto);
    }
    async getSuppliers(tenantId) {
        return this.partsService.getSuppliers(tenantId);
    }
    async adjustStock(tenantId, userId, partId, dto) {
        return this.partsService.adjustStock(tenantId, partId, dto, userId);
    }
    async getInventoryHistory(tenantId, partId) {
        return this.partsService.getInventoryHistory(tenantId, partId);
    }
    async getLowStockAlerts(tenantId) {
        return this.partsService.getLowStockAlerts(tenantId);
    }
    async createPurchaseOrder(tenantId, userId, dto) {
        return this.partsService.createPurchaseOrder(tenantId, dto, userId);
    }
    async getPurchaseOrders(tenantId, status) {
        return this.partsService.getPurchaseOrders(tenantId, status);
    }
    async receiveOrder(tenantId, userId, orderId, items) {
        return this.partsService.receiveOrder(tenantId, orderId, items, userId);
    }
};
exports.PartsController = PartsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Create new part' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: parts_dto_1.PartResponseDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, parts_dto_1.CreatePartDto]),
    __metadata("design:returntype", Promise)
], PartsController.prototype, "createPart", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List parts' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [parts_dto_1.PartResponseDto] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, parts_dto_1.PartQueryDto]),
    __metadata("design:returntype", Promise)
], PartsController.prototype, "getParts", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get part details' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: parts_dto_1.PartResponseDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PartsController.prototype, "getPart", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Update part' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: parts_dto_1.PartResponseDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, parts_dto_1.UpdatePartDto]),
    __metadata("design:returntype", Promise)
], PartsController.prototype, "updatePart", null);
__decorate([
    (0, common_1.Post)('suppliers'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Create supplier' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, parts_dto_1.CreateSupplierDto]),
    __metadata("design:returntype", Promise)
], PartsController.prototype, "createSupplier", null);
__decorate([
    (0, common_1.Get)('suppliers/list'),
    (0, swagger_1.ApiOperation)({ summary: 'List suppliers' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PartsController.prototype, "getSuppliers", null);
__decorate([
    (0, common_1.Post)(':id/stock/adjust'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Adjust stock level' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, parts_dto_1.AdjustStockDto]),
    __metadata("design:returntype", Promise)
], PartsController.prototype, "adjustStock", null);
__decorate([
    (0, common_1.Get)(':id/stock/history'),
    (0, swagger_1.ApiOperation)({ summary: 'Get inventory movement history' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [parts_dto_1.InventoryMovementResponseDto] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PartsController.prototype, "getInventoryHistory", null);
__decorate([
    (0, common_1.Get)('alerts/low-stock'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Get low stock alerts' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [parts_dto_1.LowStockAlertDto] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PartsController.prototype, "getLowStockAlerts", null);
__decorate([
    (0, common_1.Post)('purchase-orders'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Create purchase order' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: parts_dto_1.PurchaseOrderResponseDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, parts_dto_1.CreatePurchaseOrderDto]),
    __metadata("design:returntype", Promise)
], PartsController.prototype, "createPurchaseOrder", null);
__decorate([
    (0, common_1.Get)('purchase-orders/list'),
    (0, swagger_1.ApiOperation)({ summary: 'List purchase orders' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [parts_dto_1.PurchaseOrderResponseDto] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PartsController.prototype, "getPurchaseOrders", null);
__decorate([
    (0, common_1.Post)('purchase-orders/:id/receive'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Receive purchase order items' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Array]),
    __metadata("design:returntype", Promise)
], PartsController.prototype, "receiveOrder", null);
exports.PartsController = PartsController = __decorate([
    (0, swagger_1.ApiTags)('Parts Catalog'),
    (0, common_1.Controller)('v1/parts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [parts_service_1.PartsService])
], PartsController);
