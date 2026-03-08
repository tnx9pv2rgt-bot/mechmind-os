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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GdprConsentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/services/prisma.service");
const logger_service_1 = require("../../common/services/logger.service");
let GdprConsentService = class GdprConsentService {
    constructor(prisma, loggerService) {
        this.prisma = prisma;
        this.loggerService = loggerService;
    }
    async recordConsent(customerId, tenantId, consentType, granted, context) {
        const customer = await this.prisma.withTenant(tenantId, async (prisma) => {
            return prisma.customerEncrypted.findFirst({
                where: { id: customerId, tenantId },
            });
        });
        if (!customer) {
            throw new common_1.NotFoundException(`Customer ${customerId} not found`);
        }
        const auditLog = await this.prisma.withTenant(tenantId, async (prisma) => {
            return prisma.consentAuditLog.create({
                data: {
                    tenantId,
                    customerId,
                    consentType,
                    granted,
                    timestamp: new Date(),
                    ipSource: context?.ipAddress ? context.ipAddress : null,
                    userAgent: context?.userAgent,
                    collectionMethod: context?.collectionMethod,
                    collectionPoint: context?.collectionPoint,
                    legalBasis: context?.legalBasis,
                    verifiedIdentity: context?.verifiedIdentity ?? false,
                    metadata: context?.metadata ? JSON.stringify(context.metadata) : null,
                },
            });
        });
        await this.updateCustomerConsentStatus(customerId, tenantId, consentType, granted);
        this.loggerService.log(`Consent recorded: customer=${customerId}, type=${consentType}, granted=${granted}`, 'GdprConsentService');
        return {
            id: auditLog.id.toString(),
            customerId,
            tenantId,
            consentType,
            granted,
            timestamp: auditLog.timestamp,
            ipSource: context?.ipAddress,
            userAgent: context?.userAgent,
            collectionMethod: context?.collectionMethod,
            legalBasis: context?.legalBasis,
        };
    }
    async revokeConsent(customerId, tenantId, consentType, reason, revokedBy) {
        const latestConsent = await this.prisma.withTenant(tenantId, async (prisma) => {
            return prisma.consentAuditLog.findFirst({
                where: {
                    customerId,
                    tenantId,
                    consentType,
                    granted: true,
                    revokedAt: null,
                },
                orderBy: { timestamp: 'desc' },
            });
        });
        if (!latestConsent) {
            throw new common_1.NotFoundException(`No active ${consentType} consent found for customer ${customerId}`);
        }
        await this.prisma.withTenant(tenantId, async (prisma) => {
            await prisma.consentAuditLog.update({
                where: { id: latestConsent.id },
                data: {
                    revokedAt: new Date(),
                    revokedBy: revokedBy || null,
                    revocationReason: reason,
                },
            });
        });
        await this.updateCustomerConsentStatus(customerId, tenantId, consentType, false);
        await this.recordConsent(customerId, tenantId, consentType, false, {
            collectionMethod: 'REVOKE_API',
            legalBasis: 'WITHDRAWAL',
            metadata: { revocationReason: reason, originalConsentId: latestConsent.id },
        });
        this.loggerService.log(`Consent revoked: customer=${customerId}, type=${consentType}, reason=${reason}`, 'GdprConsentService');
    }
    async getConsentAuditTrail(customerId, tenantId) {
        const logs = await this.prisma.withTenant(tenantId, async (prisma) => {
            return prisma.consentAuditLog.findMany({
                where: {
                    customerId,
                    tenantId,
                },
                orderBy: { timestamp: 'desc' },
            });
        });
        return logs.map((log) => ({
            type: log.consentType,
            consent: log.granted,
            timestamp: log.timestamp,
            ipSource: log.ipSource || undefined,
            userAgent: log.userAgent || undefined,
            method: log.collectionMethod || undefined,
            revoked: log.revokedAt !== null,
            revokedAt: log.revokedAt || undefined,
        }));
    }
    async getCustomerConsentStatus(customerId, tenantId) {
        const customer = await this.prisma.withTenant(tenantId, async (prisma) => {
            return prisma.customerEncrypted.findFirst({
                where: { id: customerId, tenantId },
                select: {
                    id: true,
                    gdprConsent: true,
                    gdprConsentDate: true,
                    marketingConsent: true,
                    marketingConsentDate: true,
                    callRecordingConsent: true,
                    updatedAt: true,
                },
            });
        });
        if (!customer) {
            throw new common_1.NotFoundException(`Customer ${customerId} not found`);
        }
        return {
            customerId: customer.id,
            gdprConsent: customer.gdprConsent,
            gdprConsentDate: customer.gdprConsentDate || undefined,
            marketingConsent: customer.marketingConsent,
            marketingConsentDate: customer.marketingConsentDate || undefined,
            callRecordingConsent: customer.callRecordingConsent,
            lastUpdated: customer.updatedAt,
        };
    }
    async hasConsent(customerId, tenantId, consentType) {
        const customer = await this.prisma.withTenant(tenantId, async (prisma) => {
            return prisma.customerEncrypted.findFirst({
                where: { id: customerId, tenantId },
                select: {
                    gdprConsent: true,
                    marketingConsent: true,
                    callRecordingConsent: true,
                },
            });
        });
        if (!customer) {
            return false;
        }
        switch (consentType) {
            case 'GDPR':
                return customer.gdprConsent;
            case 'MARKETING':
                return customer.marketingConsent;
            case 'CALL_RECORDING':
                return customer.callRecordingConsent;
            default:
                const latestConsent = await this.prisma.withTenant(tenantId, async (prisma) => {
                    return prisma.consentAuditLog.findFirst({
                        where: {
                            customerId,
                            tenantId,
                            consentType,
                            revokedAt: null,
                        },
                        orderBy: { timestamp: 'desc' },
                    });
                });
                return latestConsent?.granted ?? false;
        }
    }
    async bulkCheckConsent(customerIds, tenantId, consentType) {
        const customers = await this.prisma.withTenant(tenantId, async (prisma) => {
            return prisma.customerEncrypted.findMany({
                where: {
                    id: { in: customerIds },
                    tenantId,
                },
                select: {
                    id: true,
                    gdprConsent: true,
                    marketingConsent: true,
                    callRecordingConsent: true,
                },
            });
        });
        const result = new Map();
        for (const customer of customers) {
            let hasConsent = false;
            switch (consentType) {
                case 'GDPR':
                    hasConsent = customer.gdprConsent;
                    break;
                case 'MARKETING':
                    hasConsent = customer.marketingConsent;
                    break;
                case 'CALL_RECORDING':
                    hasConsent = customer.callRecordingConsent;
                    break;
            }
            result.set(customer.id, hasConsent);
        }
        for (const customerId of customerIds) {
            if (!result.has(customerId)) {
                result.set(customerId, false);
            }
        }
        return result;
    }
    async updateCustomerConsentStatus(customerId, tenantId, consentType, granted) {
        const updateData = {};
        switch (consentType) {
            case 'GDPR':
                updateData.gdprConsent = granted;
                updateData.gdprConsentDate = granted ? new Date() : null;
                break;
            case 'MARKETING':
                updateData.marketingConsent = granted;
                updateData.marketingConsentDate = granted ? new Date() : null;
                break;
            case 'CALL_RECORDING':
                updateData.callRecordingConsent = granted;
                break;
        }
        if (Object.keys(updateData).length > 0) {
            await this.prisma.withTenant(tenantId, async (prisma) => {
                await prisma.customerEncrypted.update({
                    where: { id: customerId },
                    data: updateData,
                });
            });
        }
    }
};
exports.GdprConsentService = GdprConsentService;
exports.GdprConsentService = GdprConsentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        logger_service_1.LoggerService])
], GdprConsentService);
