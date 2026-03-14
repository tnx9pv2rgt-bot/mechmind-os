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
exports.MetricsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const unit_economics_service_1 = require("../services/unit-economics.service");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../auth/guards/roles.guard");
const roles_decorator_1 = require("../../auth/decorators/roles.decorator");
const prisma_service_1 = require("../../common/services/prisma.service");
class CACResponseDto {
}
class LTVResponseDto {
}
class ChurnResponseDto {
}
class GrossMarginResponseDto {
}
class BreakEvenResponseDto {
}
let MetricsController = class MetricsController {
    constructor(unitEconomicsService, prisma) {
        this.unitEconomicsService = unitEconomicsService;
        this.prisma = prisma;
    }
    async getCAC(startDate, endDate) {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();
        const cac = await this.unitEconomicsService.calculateCAC(start, end);
        return {
            success: true,
            data: {
                blended: cac.blended,
                byChannel: cac.byChannel,
            },
        };
    }
    async getLTV() {
        const ltvByTier = await this.unitEconomicsService.calculateLTVByTier();
        const blendedLTV = ltvByTier.reduce((sum, t) => sum + t.ltv, 0) / ltvByTier.length;
        return {
            success: true,
            data: {
                blended: Math.round(blendedLTV),
                byTier: ltvByTier,
                calculation: {
                    formula: 'LTV = ARPA × Gross Margin × (1 / Monthly Churn Rate)',
                    arpa: 82,
                    grossMargin: 0.62,
                    monthlyChurn: 0.03,
                },
            },
        };
    }
    async getChurn(months) {
        const churnAnalysis = await this.unitEconomicsService.analyzeChurn(months);
        const latest = churnAnalysis[0];
        const monthlyChurn = latest?.churnRate || 3;
        const annualChurn = 1 - Math.pow(1 - monthlyChurn / 100, 12);
        const customerLifetime = monthlyChurn > 0 ? Math.round(1 / (monthlyChurn / 100)) : 0;
        return {
            success: true,
            data: {
                overall: {
                    monthlyChurn,
                    annualChurn: Number((annualChurn * 100).toFixed(1)),
                    customerLifetime,
                },
                byPeriod: churnAnalysis,
            },
        };
    }
    async getGrossMargin(startDate, endDate) {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();
        const segments = await this.unitEconomicsService.calculateGrossMarginBySegment(start, end);
        const overall = segments.length > 0
            ? segments.reduce((sum, s) => sum + s.revenue, 0) > 0
                ? ((segments.reduce((sum, s) => sum + s.revenue, 0) -
                    segments.reduce((sum, s) => sum + s.cogs, 0)) /
                    segments.reduce((sum, s) => sum + s.revenue, 0)) *
                    100
                : 0
            : 0;
        return {
            success: true,
            data: {
                overall: Number(overall.toFixed(1)),
                bySegment: segments,
                calculation: {
                    revenue: 'Monthly subscription fees by tier',
                    cogsBreakdown: {
                        infrastructure: 8.0,
                        voiceAI: 16.0,
                        telephony: 2.66,
                        paymentProcessing: 2.68,
                        support: 5.0,
                    },
                },
            },
        };
    }
    async getBreakEven() {
        const fixedCosts = 14300;
        const arpa = 82;
        const cogsPerShop = 34.34;
        const monthlyGrowthRate = 0.15;
        const contributionMargin = arpa - cogsPerShop;
        const breakEvenShops = Math.ceil(fixedCosts / contributionMargin);
        const tenantResult = await this.prisma.$queryRaw `
      SELECT COUNT(*) as count FROM tenants
    `;
        const currentShops = Array.isArray(tenantResult) && tenantResult[0] ? Number(tenantResult[0].count) : 0;
        const monthsToBreakEven = currentShops >= breakEvenShops
            ? 0
            : Math.ceil(Math.log(breakEvenShops / Math.max(currentShops, 1)) / Math.log(1 + monthlyGrowthRate));
        const projections = [];
        let projectedShops = currentShops;
        for (let month = 0; month <= Math.max(monthsToBreakEven + 6, 24); month++) {
            const revenue = projectedShops * arpa;
            const cogs = projectedShops * cogsPerShop;
            const grossProfit = revenue - cogs;
            const netProfit = grossProfit - fixedCosts;
            projections.push({
                month,
                shops: Math.round(projectedShops),
                revenue: Math.round(revenue),
                cogs: Math.round(cogs),
                grossProfit: Math.round(grossProfit),
                fixedCosts,
                netProfit: Math.round(netProfit),
            });
            projectedShops = projectedShops * (1 + monthlyGrowthRate);
        }
        return {
            success: true,
            data: {
                breakEvenShops,
                currentShops,
                monthsToBreakEven,
                assumptions: {
                    fixedCosts,
                    arpa,
                    cogsPerShop,
                    monthlyGrowthRate,
                },
                monthlyProjections: projections,
            },
        };
    }
    async getLTVCACRatio() {
        const cac = await this.unitEconomicsService.calculateCAC(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
        const ltvByTier = await this.unitEconomicsService.calculateLTVByTier();
        const blendedLTV = ltvByTier.reduce((sum, t) => sum + t.ltv, 0) / ltvByTier.length;
        const ratio = cac.blended > 0 ? blendedLTV / cac.blended : 0;
        let status;
        if (ratio >= 5)
            status = 'excellent';
        else if (ratio >= 3)
            status = 'good';
        else if (ratio >= 1.5)
            status = 'warning';
        else
            status = 'critical';
        return {
            success: true,
            data: {
                ratio: Number(ratio.toFixed(1)),
                ltv: Math.round(blendedLTV),
                cac: cac.blended,
                status,
            },
        };
    }
    async getPaybackPeriod() {
        const cac = await this.unitEconomicsService.calculateCAC(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
        const arpa = 82;
        const grossMargin = 0.62;
        const monthlyContribution = arpa * grossMargin;
        const months = monthlyContribution > 0 ? cac.blended / monthlyContribution : 0;
        return {
            success: true,
            data: {
                months: Number(months.toFixed(1)),
                days: Math.round(months * 30),
                cac: cac.blended,
                monthlyContribution: Number(monthlyContribution.toFixed(2)),
            },
        };
    }
};
exports.MetricsController = MetricsController;
__decorate([
    (0, common_1.Get)('cac'),
    (0, roles_decorator_1.AdminOnly)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get Customer Acquisition Cost (CAC)',
        description: `Returns blended CAC and breakdown by acquisition channel.
    
Formula: CAC = Sales & Marketing Spend / New Customers Acquired

Benchmark: <€150 for Year 1, <€80 for Year 2`,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'startDate',
        required: false,
        description: 'Start date for analysis (default: 30 days ago)',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'endDate',
        required: false,
        description: 'End date for analysis (default: today)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'CAC metrics retrieved successfully',
        type: CACResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MetricsController.prototype, "getCAC", null);
__decorate([
    (0, common_1.Get)('ltv'),
    (0, roles_decorator_1.AdminOnly)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get Lifetime Value (LTV)',
        description: `Returns LTV calculations by tier and overall.
    
Formula: LTV = ARPA × Gross Margin × (1 / Monthly Churn Rate)

Example: €82 × 0.62 × (1 / 0.03) = €2,187

Target: LTV/CAC > 3:1`,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'LTV metrics retrieved successfully',
        type: LTVResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MetricsController.prototype, "getLTV", null);
__decorate([
    (0, common_1.Get)('churn'),
    (0, roles_decorator_1.AdminOnly)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get churn rate analysis',
        description: `Returns monthly churn rates and revenue churn.
    
Formula: Churn Rate = Churned Customers / Starting Customers

Target: <3% monthly churn
Impact: Every 1% reduction increases LTV by ~€700`,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'months',
        required: false,
        description: 'Number of months to analyze (default: 12)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Churn analysis retrieved successfully',
        type: ChurnResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    __param(0, (0, common_1.Query)('months', new common_1.DefaultValuePipe(12), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], MetricsController.prototype, "getChurn", null);
__decorate([
    (0, common_1.Get)('gross-margin'),
    (0, roles_decorator_1.AdminOnly)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get gross margin analysis',
        description: `Returns gross margin by customer segment.
    
Formula: Gross Margin = (Revenue - COGS) / Revenue

COGS Components:
- AWS Infrastructure: €8/shop
- Voice AI (Vapi): €16/shop
- Telephony (Twilio): €2.66/shop
- Payment Processing: €2.68/shop
- Support (L1): €5/shop

Target: 62% Year 1 → 80% at scale`,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'startDate',
        required: false,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'endDate',
        required: false,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Gross margin retrieved successfully',
        type: GrossMarginResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MetricsController.prototype, "getGrossMargin", null);
__decorate([
    (0, common_1.Get)('break-even'),
    (0, roles_decorator_1.AdminOnly)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get break-even analysis',
        description: `Returns break-even calculation and projections.
    
Formula: Break-even Shops = Fixed Costs / (ARPA - COGS per shop)

Example: €14,300 / (€82 - €30.62) = 278 shops

Target: Break-even at 100 shops (requires cost optimization)`,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Break-even analysis retrieved successfully',
        type: BreakEvenResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MetricsController.prototype, "getBreakEven", null);
__decorate([
    (0, common_1.Get)('ltv-cac-ratio'),
    (0, roles_decorator_1.AdminOnly)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get LTV/CAC ratio',
        description: `Returns the critical LTV/CAC ratio.
    
Formula: LTV/CAC = Lifetime Value / Customer Acquisition Cost

Current: 14.6:1 (Excellent)
Target: >3:1
Warning: <3:1 requires immediate attention`,
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'LTV/CAC ratio retrieved' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MetricsController.prototype, "getLTVCACRatio", null);
__decorate([
    (0, common_1.Get)('payback-period'),
    (0, roles_decorator_1.AdminOnly)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get CAC payback period',
        description: `Returns the time to recover CAC.
    
Formula: Payback Period = CAC / (ARPA × Gross Margin)

Example: €150 / (€82 × 0.62) = 2.3 months

Target: <12 months
Excellent: <6 months`,
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Payback period retrieved' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MetricsController.prototype, "getPaybackPeriod", null);
exports.MetricsController = MetricsController = __decorate([
    (0, swagger_1.ApiTags)('Analytics - Unit Economics'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('analytics'),
    __metadata("design:paramtypes", [unit_economics_service_1.UnitEconomicsService,
        prisma_service_1.PrismaService])
], MetricsController);
