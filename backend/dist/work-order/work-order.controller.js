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
exports.WorkOrderController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const work_order_service_1 = require("./work-order.service");
const create_work_order_dto_1 = require("./dto/create-work-order.dto");
const update_work_order_dto_1 = require("./dto/update-work-order.dto");
let WorkOrderController = class WorkOrderController {
    constructor(workOrderService) {
        this.workOrderService = workOrderService;
    }
    async findAll(tenantId, status, vehicleId, customerId) {
        const result = await this.workOrderService.findAll(tenantId, {
            status,
            vehicleId,
            customerId,
        });
        return {
            success: true,
            data: result.workOrders,
            meta: { total: result.total },
        };
    }
    async create(tenantId, dto) {
        const workOrder = await this.workOrderService.create(tenantId, dto);
        return { success: true, data: workOrder };
    }
    async findOne(tenantId, id) {
        const workOrder = await this.workOrderService.findOne(tenantId, id);
        return { success: true, data: workOrder };
    }
    async update(tenantId, id, dto) {
        const workOrder = await this.workOrderService.update(tenantId, id, dto);
        return { success: true, data: workOrder };
    }
    async start(tenantId, id) {
        const workOrder = await this.workOrderService.start(tenantId, id);
        return { success: true, data: workOrder };
    }
    async complete(tenantId, id) {
        const workOrder = await this.workOrderService.complete(tenantId, id);
        return { success: true, data: workOrder };
    }
    async createInvoice(tenantId, id) {
        const result = await this.workOrderService.createInvoiceFromWo(tenantId, id);
        return { success: true, data: result };
    }
};
exports.WorkOrderController = WorkOrderController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all work orders' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'vehicleId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'customerId', required: false }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Work orders listed' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('vehicleId')),
    __param(3, (0, common_1.Query)('customerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], WorkOrderController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new work order' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Work order created' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_work_order_dto_1.CreateWorkOrderDto]),
    __metadata("design:returntype", Promise)
], WorkOrderController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a work order by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Work order ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Work order found' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Work order not found' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], WorkOrderController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a work order' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Work order ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Work order updated' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Work order not found' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_work_order_dto_1.UpdateWorkOrderDto]),
    __metadata("design:returntype", Promise)
], WorkOrderController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/start'),
    (0, swagger_1.ApiOperation)({ summary: 'Start a work order' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Work order ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Work order started' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid status transition' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Work order not found' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], WorkOrderController.prototype, "start", null);
__decorate([
    (0, common_1.Post)(':id/complete'),
    (0, swagger_1.ApiOperation)({ summary: 'Complete a work order' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Work order ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Work order completed' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid status transition' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Work order not found' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], WorkOrderController.prototype, "complete", null);
__decorate([
    (0, common_1.Post)(':id/invoice'),
    (0, swagger_1.ApiOperation)({ summary: 'Create an invoice from a work order' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Work order ID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Invoice created from work order' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid status for invoicing' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Work order not found' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], WorkOrderController.prototype, "createInvoice", null);
exports.WorkOrderController = WorkOrderController = __decorate([
    (0, swagger_1.ApiTags)('work-orders'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('work-orders'),
    __metadata("design:paramtypes", [work_order_service_1.WorkOrderService])
], WorkOrderController);
