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
exports.AccountingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const accounting_service_1 = require("../services/accounting.service");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../auth/guards/roles.guard");
const roles_decorator_1 = require("../../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../../auth/decorators/current-user.decorator");
const accounting_dto_1 = require("../dto/accounting.dto");
let AccountingController = class AccountingController {
    constructor(accountingService) {
        this.accountingService = accountingService;
    }
    async syncInvoice(tenantId, dto) {
        const record = await this.accountingService.syncInvoice(tenantId, dto.invoiceId, dto.provider);
        return { success: true, data: record };
    }
    async syncCustomer(tenantId, dto) {
        const record = await this.accountingService.syncCustomer(tenantId, dto.customerId, dto.provider);
        return { success: true, data: record };
    }
    async findAll(tenantId, filters) {
        const { records, total } = await this.accountingService.findAll(tenantId, filters);
        return {
            success: true,
            data: records,
            meta: {
                total,
                limit: filters.limit ?? 50,
                offset: filters.offset ?? 0,
            },
        };
    }
    async findById(tenantId, id) {
        const record = await this.accountingService.findById(tenantId, id);
        return { success: true, data: record };
    }
    async retry(tenantId, id) {
        const record = await this.accountingService.retry(tenantId, id);
        return { success: true, data: record };
    }
    async getStatus(tenantId, entityType, entityId) {
        const records = await this.accountingService.getStatus(tenantId, entityType, entityId);
        return { success: true, data: records };
    }
};
exports.AccountingController = AccountingController;
__decorate([
    (0, common_1.Post)('sync/invoice'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Sync an invoice to external accounting provider',
        description: 'Queues an invoice for synchronization with the specified accounting provider',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Sync record created',
        type: accounting_dto_1.AccountingSyncResponseDto,
    }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, accounting_dto_1.SyncInvoiceDto]),
    __metadata("design:returntype", Promise)
], AccountingController.prototype, "syncInvoice", null);
__decorate([
    (0, common_1.Post)('sync/customer'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Sync a customer to external accounting provider',
        description: 'Queues a customer for synchronization with the specified accounting provider',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Sync record created',
        type: accounting_dto_1.AccountingSyncResponseDto,
    }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, accounting_dto_1.SyncCustomerDto]),
    __metadata("design:returntype", Promise)
], AccountingController.prototype, "syncCustomer", null);
__decorate([
    (0, common_1.Get)('sync'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'List accounting sync records' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Sync records retrieved',
        type: [accounting_dto_1.AccountingSyncResponseDto],
    }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, accounting_dto_1.AccountingSyncFilterDto]),
    __metadata("design:returntype", Promise)
], AccountingController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('sync/:id'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get sync record by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Sync record ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Sync record retrieved',
        type: accounting_dto_1.AccountingSyncResponseDto,
    }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AccountingController.prototype, "findById", null);
__decorate([
    (0, common_1.Post)('sync/:id/retry'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Retry a failed sync record',
        description: 'Retries synchronization for a record in FAILED status',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Sync record ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Sync retried',
        type: accounting_dto_1.AccountingSyncResponseDto,
    }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AccountingController.prototype, "retry", null);
__decorate([
    (0, common_1.Get)('sync/status/:entityType/:entityId'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Get sync status for an entity',
        description: 'Returns all sync records for a specific entity across providers',
    }),
    (0, swagger_1.ApiParam)({ name: 'entityType', description: 'Entity type (INVOICE, CUSTOMER, PAYMENT)' }),
    (0, swagger_1.ApiParam)({ name: 'entityId', description: 'Entity ID' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('entityType')),
    __param(2, (0, common_1.Param)('entityId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AccountingController.prototype, "getStatus", null);
exports.AccountingController = AccountingController = __decorate([
    (0, swagger_1.ApiTags)('Accounting'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('accounting'),
    __metadata("design:paramtypes", [accounting_service_1.AccountingService])
], AccountingController);
