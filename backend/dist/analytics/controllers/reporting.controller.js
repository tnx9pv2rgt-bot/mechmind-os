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
exports.ReportingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../auth/guards/roles.guard");
const roles_decorator_1 = require("../../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../../auth/decorators/current-user.decorator");
const reporting_service_1 = require("../services/reporting.service");
const roles_guard_2 = require("../../auth/guards/roles.guard");
let ReportingController = class ReportingController {
    constructor(reportingService) {
        this.reportingService = reportingService;
    }
    async getDashboardSummary(tenantId) {
        return this.reportingService.getDashboardSummary(tenantId);
    }
    async getCustomKPIs(tenantId) {
        return this.reportingService.getCustomKPIs(tenantId);
    }
    async getBookingMetrics(tenantId, from, to) {
        return this.reportingService.getBookingMetrics(tenantId, new Date(from), new Date(to));
    }
    async getRevenueAnalytics(tenantId, year, month) {
        return this.reportingService.getRevenueAnalytics(tenantId, parseInt(year), month ? parseInt(month) : undefined);
    }
    async getCustomerRetention(tenantId) {
        return this.reportingService.getCustomerRetention(tenantId);
    }
    async getTopCustomers(tenantId, limit) {
        return this.reportingService.getTopCustomers(tenantId, limit ? parseInt(limit) : 10);
    }
    async getServicePopularity(tenantId, year) {
        return this.reportingService.getServicePopularity(tenantId, parseInt(year));
    }
    async getMechanicPerformance(tenantId, year, month) {
        return this.reportingService.getMechanicPerformance(tenantId, parseInt(year), month ? parseInt(month) : undefined);
    }
    async getInventoryStatus(tenantId, status) {
        return this.reportingService.getInventoryStatus(tenantId, status);
    }
    async getInventoryValuation(tenantId) {
        return this.reportingService.getInventoryValuation(tenantId);
    }
    async exportBookings(tenantId, res, from, to, format = 'csv') {
        const data = await this.reportingService.exportBookings(tenantId, new Date(from), new Date(to), format);
        const filename = `bookings_${from}_${to}.${format}`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
        res.send(data);
    }
    async exportInventory(tenantId, res, format = 'csv') {
        const data = await this.reportingService.exportInventory(tenantId, format);
        const filename = `inventory_${new Date().toISOString().split('T')[0]}.${format}`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
        res.send(data);
    }
    async exportRevenue(tenantId, res, year, format = 'csv') {
        const data = await this.reportingService.exportRevenue(tenantId, parseInt(year), format);
        const filename = `revenue_${year}.${format}`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
        res.send(data);
    }
    async refreshViews() {
        await this.reportingService.refreshAnalyticsViews();
        return { message: 'Analytics views refreshed successfully' };
    }
};
exports.ReportingController = ReportingController;
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, swagger_1.ApiOperation)({ summary: 'Get dashboard summary KPIs' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReportingController.prototype, "getDashboardSummary", null);
__decorate([
    (0, common_1.Get)('kpis'),
    (0, swagger_1.ApiOperation)({ summary: 'Get custom KPIs' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReportingController.prototype, "getCustomKPIs", null);
__decorate([
    (0, common_1.Get)('bookings/metrics'),
    (0, swagger_1.ApiOperation)({ summary: 'Get daily booking metrics' }),
    (0, swagger_1.ApiQuery)({ name: 'from', required: true, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'to', required: true, type: String }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ReportingController.prototype, "getBookingMetrics", null);
__decorate([
    (0, common_1.Get)('revenue'),
    (0, swagger_1.ApiOperation)({ summary: 'Get revenue analytics' }),
    (0, swagger_1.ApiQuery)({ name: 'year', required: true, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'month', required: false, type: Number }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ReportingController.prototype, "getRevenueAnalytics", null);
__decorate([
    (0, common_1.Get)('customers/retention'),
    (0, swagger_1.ApiOperation)({ summary: 'Get customer retention metrics' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReportingController.prototype, "getCustomerRetention", null);
__decorate([
    (0, common_1.Get)('customers/top'),
    (0, swagger_1.ApiOperation)({ summary: 'Get top customers by revenue' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReportingController.prototype, "getTopCustomers", null);
__decorate([
    (0, common_1.Get)('services/popularity'),
    (0, swagger_1.ApiOperation)({ summary: 'Get service popularity analytics' }),
    (0, swagger_1.ApiQuery)({ name: 'year', required: true, type: Number }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReportingController.prototype, "getServicePopularity", null);
__decorate([
    (0, common_1.Get)('mechanics/performance'),
    (0, swagger_1.ApiOperation)({ summary: 'Get mechanic performance metrics' }),
    (0, swagger_1.ApiQuery)({ name: 'year', required: true, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'month', required: false, type: Number }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ReportingController.prototype, "getMechanicPerformance", null);
__decorate([
    (0, common_1.Get)('inventory/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Get inventory status' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, enum: ['OK', 'REORDER', 'LOW_STOCK'] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReportingController.prototype, "getInventoryStatus", null);
__decorate([
    (0, common_1.Get)('inventory/valuation'),
    (0, swagger_1.ApiOperation)({ summary: 'Get inventory valuation by category' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReportingController.prototype, "getInventoryValuation", null);
__decorate([
    (0, common_1.Get)('export/bookings'),
    (0, swagger_1.ApiOperation)({ summary: 'Export bookings to CSV/JSON' }),
    (0, swagger_1.ApiQuery)({ name: 'from', required: true }),
    (0, swagger_1.ApiQuery)({ name: 'to', required: true }),
    (0, swagger_1.ApiQuery)({ name: 'format', required: false, enum: ['csv', 'json'] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __param(4, (0, common_1.Query)('format')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String, String]),
    __metadata("design:returntype", Promise)
], ReportingController.prototype, "exportBookings", null);
__decorate([
    (0, common_1.Get)('export/inventory'),
    (0, swagger_1.ApiOperation)({ summary: 'Export inventory to CSV/JSON' }),
    (0, swagger_1.ApiQuery)({ name: 'format', required: false, enum: ['csv', 'json'] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Query)('format')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], ReportingController.prototype, "exportInventory", null);
__decorate([
    (0, common_1.Get)('export/revenue'),
    (0, swagger_1.ApiOperation)({ summary: 'Export revenue report to CSV/JSON' }),
    (0, swagger_1.ApiQuery)({ name: 'year', required: true, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'format', required: false, enum: ['csv', 'json'] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Query)('year')),
    __param(3, (0, common_1.Query)('format')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], ReportingController.prototype, "exportRevenue", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Refresh analytics materialized views (Admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReportingController.prototype, "refreshViews", null);
exports.ReportingController = ReportingController = __decorate([
    (0, swagger_1.ApiTags)('Business Intelligence'),
    (0, common_1.Controller)('analytics'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [reporting_service_1.ReportingService])
], ReportingController);
