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
exports.AccountingService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../../common/services/prisma.service");
const logger_service_1 = require("../../common/services/logger.service");
const client_1 = require("@prisma/client");
class QuickBooksProvider {
    async syncInvoice(_tenantId, _invoiceId, _payload) {
        throw new common_1.BadRequestException('QuickBooks integration not yet connected. Configure API credentials in tenant settings.');
    }
    async syncCustomer(_tenantId, _customerId, _payload) {
        throw new common_1.BadRequestException('QuickBooks integration not yet connected. Configure API credentials in tenant settings.');
    }
}
class XeroProvider {
    async syncInvoice(_tenantId, _invoiceId, _payload) {
        throw new common_1.BadRequestException('Xero integration not yet connected. Configure API credentials in tenant settings.');
    }
    async syncCustomer(_tenantId, _customerId, _payload) {
        throw new common_1.BadRequestException('Xero integration not yet connected. Configure API credentials in tenant settings.');
    }
}
class FattureInCloudProvider {
    async syncInvoice(_tenantId, _invoiceId, _payload) {
        throw new common_1.BadRequestException('FattureInCloud integration not yet connected. Configure API credentials in tenant settings.');
    }
    async syncCustomer(_tenantId, _customerId, _payload) {
        throw new common_1.BadRequestException('FattureInCloud integration not yet connected. Configure API credentials in tenant settings.');
    }
}
let AccountingService = class AccountingService {
    constructor(prisma, logger, eventEmitter) {
        this.prisma = prisma;
        this.logger = logger;
        this.eventEmitter = eventEmitter;
        this.providers = new Map([
            [client_1.AccountingProvider.QUICKBOOKS, new QuickBooksProvider()],
            [client_1.AccountingProvider.XERO, new XeroProvider()],
            [client_1.AccountingProvider.FATTUREINCLOUD, new FattureInCloudProvider()],
        ]);
    }
    async syncInvoice(tenantId, invoiceId, provider) {
        const syncRecord = await this.prisma.accountingSync.create({
            data: {
                tenantId,
                provider,
                entityType: 'INVOICE',
                entityId: invoiceId,
                status: client_1.AccountingSyncStatus.PENDING,
                direction: 'OUTBOUND',
                payload: { invoiceId },
            },
        });
        this.logger.log(`Queued invoice sync: ${syncRecord.id} (invoice=${invoiceId}, provider=${provider})`);
        this.eventEmitter.emit('accounting.sync.queued', {
            tenantId,
            syncId: syncRecord.id,
            entityType: 'INVOICE',
            entityId: invoiceId,
            provider,
        });
        return this.executeSyncRecord(tenantId, syncRecord);
    }
    async syncCustomer(tenantId, customerId, provider) {
        const syncRecord = await this.prisma.accountingSync.create({
            data: {
                tenantId,
                provider,
                entityType: 'CUSTOMER',
                entityId: customerId,
                status: client_1.AccountingSyncStatus.PENDING,
                direction: 'OUTBOUND',
                payload: { customerId },
            },
        });
        this.logger.log(`Queued customer sync: ${syncRecord.id} (customer=${customerId}, provider=${provider})`);
        this.eventEmitter.emit('accounting.sync.queued', {
            tenantId,
            syncId: syncRecord.id,
            entityType: 'CUSTOMER',
            entityId: customerId,
            provider,
        });
        return this.executeSyncRecord(tenantId, syncRecord);
    }
    async findAll(tenantId, filters) {
        const where = {
            tenantId,
            ...(filters.provider && { provider: filters.provider }),
            ...(filters.status && { status: filters.status }),
            ...(filters.entityType && { entityType: filters.entityType }),
        };
        const limit = filters.limit ?? 50;
        const offset = filters.offset ?? 0;
        const [records, total] = await Promise.all([
            this.prisma.accountingSync.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            this.prisma.accountingSync.count({ where }),
        ]);
        return { records, total };
    }
    async findById(tenantId, id) {
        const record = await this.prisma.accountingSync.findFirst({
            where: { id, tenantId },
        });
        if (!record) {
            throw new common_1.NotFoundException(`Accounting sync record ${id} not found`);
        }
        return record;
    }
    async retry(tenantId, id) {
        const record = await this.findById(tenantId, id);
        if (record.status !== client_1.AccountingSyncStatus.FAILED) {
            throw new common_1.BadRequestException(`Cannot retry sync record with status ${record.status}. Only FAILED records can be retried.`);
        }
        const updated = await this.prisma.accountingSync.update({
            where: { id },
            data: {
                status: client_1.AccountingSyncStatus.PENDING,
                retryCount: { increment: 1 },
                lastRetryAt: new Date(),
                error: null,
            },
        });
        this.logger.log(`Retrying sync record: ${id} (attempt=${updated.retryCount})`);
        this.eventEmitter.emit('accounting.sync.retried', {
            tenantId,
            syncId: id,
            retryCount: updated.retryCount,
        });
        return this.executeSyncRecord(tenantId, updated);
    }
    async getStatus(tenantId, entityType, entityId) {
        return this.prisma.accountingSync.findMany({
            where: {
                tenantId,
                entityType,
                entityId,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async executeSyncRecord(tenantId, syncRecord) {
        const providerImpl = this.providers.get(syncRecord.provider);
        if (!providerImpl) {
            return this.prisma.accountingSync.update({
                where: { id: syncRecord.id },
                data: {
                    status: client_1.AccountingSyncStatus.FAILED,
                    error: `Unknown provider: ${syncRecord.provider}`,
                },
            });
        }
        await this.prisma.accountingSync.update({
            where: { id: syncRecord.id },
            data: { status: client_1.AccountingSyncStatus.SYNCING },
        });
        try {
            const payload = syncRecord.payload ?? {};
            let result;
            if (syncRecord.entityType === 'INVOICE') {
                result = await providerImpl.syncInvoice(tenantId, syncRecord.entityId, payload);
            }
            else if (syncRecord.entityType === 'CUSTOMER') {
                result = await providerImpl.syncCustomer(tenantId, syncRecord.entityId, payload);
            }
            else {
                result = {
                    success: false,
                    error: `Unsupported entity type: ${syncRecord.entityType}`,
                };
            }
            const updated = await this.prisma.accountingSync.update({
                where: { id: syncRecord.id },
                data: {
                    status: result.success ? client_1.AccountingSyncStatus.SYNCED : client_1.AccountingSyncStatus.FAILED,
                    externalId: result.externalId ?? syncRecord.externalId,
                    syncedAt: result.success ? new Date() : undefined,
                    error: result.error ?? null,
                    response: result.response ?? undefined,
                },
            });
            if (result.success) {
                this.eventEmitter.emit('accounting.sync.completed', {
                    tenantId,
                    syncId: syncRecord.id,
                    externalId: result.externalId,
                });
            }
            return updated;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error during sync';
            const updated = await this.prisma.accountingSync.update({
                where: { id: syncRecord.id },
                data: {
                    status: client_1.AccountingSyncStatus.FAILED,
                    error: errorMessage,
                },
            });
            this.eventEmitter.emit('accounting.sync.failed', {
                tenantId,
                syncId: syncRecord.id,
                error: errorMessage,
            });
            return updated;
        }
    }
};
exports.AccountingService = AccountingService;
exports.AccountingService = AccountingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        logger_service_1.LoggerService,
        event_emitter_1.EventEmitter2])
], AccountingService);
