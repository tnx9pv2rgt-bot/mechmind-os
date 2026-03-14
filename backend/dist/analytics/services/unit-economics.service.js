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
var UnitEconomicsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitEconomicsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/services/prisma.service");
const logger_service_1 = require("../../common/services/logger.service");
let UnitEconomicsService = UnitEconomicsService_1 = class UnitEconomicsService {
    constructor(prisma, loggerService) {
        this.prisma = prisma;
        this.loggerService = loggerService;
        this.logger = new common_1.Logger(UnitEconomicsService_1.name);
        this.STANDARD_COGS = 30.38;
    }
    async calculateCAC(startDate, endDate) {
        this.logger.debug(`Calculating CAC from ${startDate} to ${endDate}`);
        const channelData = [
            {
                channel: 'organic_seo',
                spend: 4000,
                newCustomers: 100,
                cac: 40,
                percentageOfTotal: 25,
            },
            {
                channel: 'paid_search',
                spend: 8000,
                newCustomers: 40,
                cac: 200,
                percentageOfTotal: 20,
            },
            {
                channel: 'social_ads',
                spend: 5400,
                newCustomers: 30,
                cac: 180,
                percentageOfTotal: 15,
            },
            {
                channel: 'partner_referrals',
                spend: 3000,
                newCustomers: 30,
                cac: 100,
                percentageOfTotal: 20,
            },
            {
                channel: 'events_trade_shows',
                spend: 6000,
                newCustomers: 15,
                cac: 400,
                percentageOfTotal: 10,
            },
            {
                channel: 'outbound_sales',
                spend: 4500,
                newCustomers: 15,
                cac: 300,
                percentageOfTotal: 10,
            },
        ];
        const totalSpend = channelData.reduce((sum, c) => sum + c.spend, 0);
        const totalNewCustomers = channelData.reduce((sum, c) => sum + c.newCustomers, 0);
        const blendedCAC = totalNewCustomers > 0 ? totalSpend / totalNewCustomers : 0;
        return {
            blended: Math.round(blendedCAC),
            byChannel: channelData,
        };
    }
    async calculateLTVByCohort(months = 12) {
        this.logger.debug(`Calculating LTV for last ${months} cohorts`);
        const cohorts = [];
        const now = new Date();
        for (let i = 0; i < months; i++) {
            const cohortDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const cohortMonth = cohortDate.toISOString().slice(0, 7);
            const customers = await this.prisma.$queryRaw `
        SELECT 
          t.id,
          t.created_at,
          (SELECT COUNT(*) FROM bookings b WHERE b.tenant_id = t.id) as booking_count
        FROM tenants t
        WHERE DATE_TRUNC('month', t.created_at) = DATE_TRUNC('month', ${cohortDate}::timestamp)
      `;
            const customerCount = Array.isArray(customers) ? customers.length : 0;
            const monthlyRevenue = [];
            for (let m = 0; m <= Math.min(i, 24); m++) {
                const activeCustomers = Math.round(customerCount * Math.pow(0.97, m));
                const avgRevenue = activeCustomers * 82;
                monthlyRevenue.push({
                    month: m,
                    revenue: avgRevenue,
                    customers: activeCustomers,
                });
            }
            const arpa = 82;
            const grossMargin = 0.62;
            const monthlyChurn = 0.03;
            const ltv = arpa * grossMargin * (1 / monthlyChurn);
            const cac = 150;
            cohorts.push({
                cohortMonth,
                startingCustomers: customerCount,
                monthlyRevenue,
                ltv: Math.round(ltv),
                cac,
                ltvCacRatio: Number((ltv / cac).toFixed(1)),
            });
        }
        return cohorts;
    }
    async calculateLTVByTier() {
        const tiers = [
            { name: 'starter', arpa: 49 },
            { name: 'pro', arpa: 99 },
            { name: 'enterprise', arpa: 299 },
        ];
        const grossMargin = 0.62;
        const monthlyChurn = 0.03;
        return tiers.map(tier => ({
            tier: tier.name,
            arpa: tier.arpa,
            ltv: Math.round(tier.arpa * grossMargin * (1 / monthlyChurn)),
        }));
    }
    async analyzeChurn(months = 12) {
        this.logger.debug(`Analyzing churn for last ${months} months`);
        const analyses = [];
        const now = new Date();
        for (let i = 0; i < months; i++) {
            const periodStart = new Date(now.getFullYear(), now.getMonth() - i - 1, 1);
            const periodEnd = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const periodLabel = periodStart.toISOString().slice(0, 7);
            const startingCustomersResult = await this.prisma.$queryRaw `
        SELECT COUNT(*) as count
        FROM tenants
        WHERE created_at < ${periodEnd}
      `;
            const startingCustomers = Array.isArray(startingCustomersResult) && startingCustomersResult[0]
                ? Number(startingCustomersResult[0].count)
                : 0;
            const churnedCustomers = Math.round(startingCustomers * 0.03);
            const churnRate = startingCustomers > 0 ? churnedCustomers / startingCustomers : 0;
            const avgRevenuePerCustomer = 82;
            const revenueChurn = churnedCustomers * avgRevenuePerCustomer;
            const totalRevenue = startingCustomers * avgRevenuePerCustomer;
            const revenueChurnRate = totalRevenue > 0 ? revenueChurn / totalRevenue : 0;
            analyses.push({
                period: periodLabel,
                startingCustomers,
                churnedCustomers,
                churnRate: Number((churnRate * 100).toFixed(2)),
                revenueChurn,
                revenueChurnRate: Number((revenueChurnRate * 100).toFixed(2)),
                byTier: [
                    { tier: 'starter', churnRate: 4.0 },
                    { tier: 'pro', churnRate: 2.5 },
                    { tier: 'enterprise', churnRate: 1.5 },
                ],
            });
        }
        return analyses;
    }
    async calculateGrossMarginBySegment(_startDate, _endDate) {
        this.logger.debug(`Calculating gross margin by segment`);
        let starterCount = 40;
        let proCount = 25;
        let enterpriseCount = 5;
        try {
            const tierCounts = await this.prisma.$queryRaw `
        SELECT 
          subscription_tier,
          COUNT(*) as count
        FROM tenants
        GROUP BY subscription_tier
      `;
            if (Array.isArray(tierCounts)) {
                tierCounts.forEach((t) => {
                    if (t.subscription_tier === 'starter')
                        starterCount = Number(t.count);
                    if (t.subscription_tier === 'pro')
                        proCount = Number(t.count);
                    if (t.subscription_tier === 'enterprise')
                        enterpriseCount = Number(t.count);
                });
            }
        }
        catch (error) {
            this.logger.warn('Could not query tier counts, using defaults', error);
        }
        const segments = [
            { name: 'starter', avgShops: starterCount, arpa: 49 },
            { name: 'pro', avgShops: proCount, arpa: 99 },
            { name: 'enterprise', avgShops: enterpriseCount, arpa: 299 },
        ];
        return segments.map(segment => {
            const revenue = segment.avgShops * segment.arpa;
            const cogs = segment.avgShops * this.STANDARD_COGS;
            const grossMargin = revenue - cogs;
            const grossMarginPercentage = revenue > 0 ? (grossMargin / revenue) * 100 : 0;
            return {
                segment: segment.name,
                revenue,
                cogs,
                grossMargin,
                grossMarginPercentage: Number(grossMarginPercentage.toFixed(1)),
            };
        });
    }
    calculatePaybackPeriod(cac, arpa, grossMargin) {
        const monthlyContribution = arpa * grossMargin;
        return monthlyContribution > 0 ? Number((cac / monthlyContribution).toFixed(1)) : 0;
    }
    async generateReport(startDate, endDate) {
        this.logger.warn('UnitEconomicsReport: using sample data. Real calculations require marketing_spend and revenue tables.');
        const [cac, ltvByCohort, ltvByTier, churn, grossMarginBySegment] = await Promise.all([
            this.calculateCAC(startDate, endDate),
            this.calculateLTVByCohort(12),
            this.calculateLTVByTier(),
            this.analyzeChurn(12),
            this.calculateGrossMarginBySegment(startDate, endDate),
        ]);
        const blendedLTV = ltvByCohort.length > 0
            ? ltvByCohort.reduce((sum, c) => sum + c.ltv, 0) / ltvByCohort.length
            : 0;
        const totalRevenue = grossMarginBySegment.reduce((sum, s) => sum + s.revenue, 0);
        const totalCOGS = grossMarginBySegment.reduce((sum, s) => sum + s.cogs, 0);
        const overallGrossMargin = totalRevenue > 0 ? ((totalRevenue - totalCOGS) / totalRevenue) * 100 : 0;
        const arpa = 82;
        const paybackPeriod = this.calculatePaybackPeriod(cac.blended, arpa, 0.62);
        return {
            generatedAt: new Date(),
            isSampleData: true,
            period: { start: startDate, end: endDate },
            cac,
            ltv: {
                blended: Math.round(blendedLTV),
                byCohort: ltvByCohort,
                byTier: ltvByTier,
            },
            churn,
            grossMargin: {
                overall: Number(overallGrossMargin.toFixed(1)),
                bySegment: grossMarginBySegment,
            },
            paybackPeriod,
            ltvCacRatio: cac.blended > 0 ? Number((blendedLTV / cac.blended).toFixed(1)) : 0,
            arpa,
        };
    }
    async exportInvestorMetrics(_startDate, _endDate) {
        const customerResult = await this.prisma.$queryRaw `
      SELECT COUNT(*) as count FROM tenants
    `;
        const customerCount = Array.isArray(customerResult) && customerResult[0] ? Number(customerResult[0].count) : 0;
        const mrr = customerCount * 82;
        const arr = mrr * 12;
        const netDollarRetention = 102.4;
        const grossDollarRetention = 97.0;
        const netNewARR = arr * 0.15;
        const salesAndMarketingSpend = 15000;
        const magicNumber = salesAndMarketingSpend > 0 ? (netNewARR * 12) / salesAndMarketingSpend : 0;
        const growthRate = 150;
        const ebitdaMargin = -100;
        const ruleOf40 = growthRate + ebitdaMargin;
        return {
            arr,
            mrr,
            customers: customerCount,
            netDollarRetention,
            grossDollarRetention,
            magicNumber: Number(magicNumber.toFixed(2)),
            ruleOf40,
        };
    }
};
exports.UnitEconomicsService = UnitEconomicsService;
exports.UnitEconomicsService = UnitEconomicsService = UnitEconomicsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        logger_service_1.LoggerService])
], UnitEconomicsService);
