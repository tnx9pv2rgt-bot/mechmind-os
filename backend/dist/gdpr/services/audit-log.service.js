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
exports.AuditLogService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/services/prisma.service");
const logger_service_1 = require("../../common/services/logger.service");
let AuditLogService = class AuditLogService {
    constructor(prisma, loggerService) {
        this.prisma = prisma;
        this.loggerService = loggerService;
    }
    async createEntry(data) {
        const entry = await this.prisma.withTenant(data.tenantId, async (prisma) => {
            return prisma.auditLog.create({
                data: {
                    tenantId: data.tenantId,
                    action: data.action,
                    tableName: data.tableName,
                    recordId: data.recordId,
                    oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
                    newValues: data.newValues ? JSON.stringify(data.newValues) : null,
                    performedBy: data.performedBy,
                    ipAddress: data.ipAddress,
                    userAgent: data.userAgent,
                    createdAt: new Date(),
                },
            });
        });
        this.loggerService.log(`Audit log created: ${data.action} on ${data.tableName}:${data.recordId}`, 'AuditLogService');
        return this.mapToEntry(entry);
    }
    async getEntries(query, pagination = { page: 1, limit: 50 }) {
        const where = {};
        if (query.tenantId) {
            where.tenantId = query.tenantId;
        }
        if (query.action) {
            where.action = query.action;
        }
        if (query.tableName) {
            where.tableName = query.tableName;
        }
        if (query.recordId) {
            where.recordId = query.recordId;
        }
        if (query.performedBy) {
            where.performedBy = query.performedBy;
        }
        if (query.startDate || query.endDate) {
            const createdAt = {};
            if (query.startDate) {
                createdAt.gte = query.startDate;
            }
            if (query.endDate) {
                createdAt.lte = query.endDate;
            }
            where.createdAt = createdAt;
        }
        const skip = (pagination.page - 1) * pagination.limit;
        const [entries, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: pagination.limit,
            }),
            this.prisma.auditLog.count({ where }),
        ]);
        const totalPages = Math.ceil(total / pagination.limit);
        return {
            entries: entries.map((e) => this.mapToEntry(e)),
            total,
            page: pagination.page,
            totalPages,
        };
    }
    async getRecordTrail(tableName, recordId, tenantId) {
        const entries = await this.prisma.withTenant(tenantId, async (prisma) => {
            return prisma.auditLog.findMany({
                where: {
                    tableName,
                    recordId,
                    tenantId,
                },
                orderBy: { createdAt: 'desc' },
            });
        });
        return entries.map((e) => this.mapToEntry(e));
    }
    async getGdprAuditTrail(customerId, tenantId) {
        const gdprActions = [
            'CUSTOMER_ANONYMIZED',
            'IDENTITY_VERIFICATION',
            'DELETION_SNAPSHOT_CREATED',
            'CALL_RECORDINGS_DELETED',
            'DATA_EXPORTED',
            'DSR_CREATED',
            'CONSENT_RECORDED',
            'CONSENT_REVOKED',
        ];
        const entries = await this.prisma.withTenant(tenantId, async (prisma) => {
            return prisma.auditLog.findMany({
                where: {
                    tenantId,
                    action: { in: gdprActions },
                    OR: [
                        { recordId: customerId },
                    ],
                },
                orderBy: { createdAt: 'desc' },
            });
        });
        return entries.map((e) => this.mapToEntry(e));
    }
    async getStats(tenantId) {
        const where = {};
        if (tenantId) {
            where.tenantId = tenantId;
        }
        const [total, byAction, byTable, recentActivity] = await Promise.all([
            this.prisma.auditLog.count({ where }),
            this.prisma.auditLog.groupBy({
                by: ['action'],
                where,
                _count: { action: true },
            }),
            this.prisma.auditLog.groupBy({
                by: ['tableName'],
                where,
                _count: { tableName: true },
            }),
            this.prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),
        ]);
        const entriesByAction = {};
        for (const item of byAction) {
            entriesByAction[item.action] = item._count.action;
        }
        const entriesByTable = {};
        for (const item of byTable) {
            entriesByTable[item.tableName] = item._count.tableName;
        }
        return {
            totalEntries: total,
            entriesByAction,
            entriesByTable,
            recentActivity: recentActivity.map((e) => this.mapToEntry(e)),
        };
    }
    async preserveAuditTrail(customerId, tenantId, requestId) {
        const count = await this.prisma.withTenant(tenantId, async (prisma) => {
            return prisma.auditLog.count({
                where: {
                    tenantId,
                    recordId: customerId,
                },
            });
        });
        await this.prisma.withTenant(tenantId, async (prisma) => {
            await prisma.auditLog.create({
                data: {
                    tenantId,
                    action: 'AUDIT_TRAIL_PRESERVED',
                    tableName: 'audit_log',
                    recordId: customerId,
                    newValues: {
                        preservedEntries: count,
                        dataSubjectRequestId: requestId,
                        retentionDays: 2555,
                        anonymizedAtValue: new Date().toISOString(),
                    },
                    createdAt: new Date(),
                },
            });
        });
        this.loggerService.log(`Audit trail preserved for customer ${customerId}: ${count} entries`, 'AuditLogService');
    }
    async archiveOldEntries(retentionDays, tenantId) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        const where = {
            createdAt: {
                lt: cutoffDate,
            },
        };
        if (tenantId) {
            where.tenantId = tenantId;
        }
        const count = await this.prisma.auditLog.count({ where });
        await this.prisma.auditLog.updateMany({
            where,
            data: {
                archived: true,
                archivedAt: new Date(),
            },
        });
        this.loggerService.log(`Archived ${count} audit log entries older than ${retentionDays} days`, 'AuditLogService');
        return {
            archivedCount: count,
            archivedUpTo: cutoffDate,
        };
    }
    async exportForCompliance(query) {
        const result = await this.getEntries(query, { page: 1, limit: 10000 });
        return {
            entries: result.entries,
            generatedAt: new Date(),
            retentionPeriod: '7 years',
        };
    }
    mapToEntry(record) {
        return {
            id: record.id,
            tenantId: record.tenantId,
            action: record.action,
            tableName: record.tableName,
            recordId: record.recordId,
            oldValues: record.oldValues ? JSON.parse(record.oldValues) : undefined,
            newValues: record.newValues ? JSON.parse(record.newValues) : undefined,
            performedBy: record.performedBy || undefined,
            ipAddress: record.ipAddress || undefined,
            userAgent: record.userAgent || undefined,
            createdAt: record.createdAt,
        };
    }
};
exports.AuditLogService = AuditLogService;
exports.AuditLogService = AuditLogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        logger_service_1.LoggerService])
], AuditLogService);
