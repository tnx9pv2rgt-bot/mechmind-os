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
exports.GdprRequestService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/services/prisma.service");
const logger_service_1 = require("../../common/services/logger.service");
let GdprRequestService = class GdprRequestService {
    constructor(prisma, loggerService) {
        this.prisma = prisma;
        this.loggerService = loggerService;
        this.SLA_DAYS = 30;
    }
    async createRequest(dto) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: dto.tenantId },
        });
        if (!tenant) {
            throw new common_1.NotFoundException(`Tenant ${dto.tenantId} not found`);
        }
        const year = new Date().getFullYear();
        const sequence = await this.getNextTicketSequence(dto.tenantId, year);
        const ticketNumber = `GDPR-${year}-${sequence.toString().padStart(4, '0')}`;
        const receivedAt = new Date();
        const deadlineAt = new Date(receivedAt.getTime() + this.SLA_DAYS * 24 * 60 * 60 * 1000);
        const request = await this.prisma.withTenant(dto.tenantId, async (prisma) => {
            return prisma.dataSubjectRequest.create({
                data: {
                    tenantId: dto.tenantId,
                    ticketNumber,
                    requestType: dto.requestType,
                    requesterEmail: dto.requesterEmail,
                    requesterPhone: dto.requesterPhone,
                    customerId: dto.customerId,
                    status: 'RECEIVED',
                    receivedAt,
                    deadlineAt,
                    priority: dto.priority || 'NORMAL',
                    source: dto.source || 'EMAIL',
                    notes: dto.notes,
                    metadata: dto.metadata ? JSON.stringify(dto.metadata) : undefined,
                },
            });
        });
        this.loggerService.log(`Created data subject request ${ticketNumber} of type ${dto.requestType}`, 'GdprRequestService');
        await this.prisma.withTenant(dto.tenantId, async (prisma) => {
            await prisma.auditLog.create({
                data: {
                    tenantId: dto.tenantId,
                    action: 'DSR_CREATED',
                    tableName: 'data_subject_requests',
                    recordId: request.id,
                    newValues: {
                        ticketNumber,
                        requestType: dto.requestType,
                        requesterEmail: dto.requesterEmail,
                    },
                    createdAt: receivedAt,
                },
            });
        });
        return this.mapToResponse(request);
    }
    async getRequest(requestId, tenantId) {
        const request = await this.prisma.withTenant(tenantId, async (prisma) => {
            return prisma.dataSubjectRequest.findFirst({
                where: { id: requestId, tenantId },
            });
        });
        if (!request) {
            throw new common_1.NotFoundException(`Request ${requestId} not found`);
        }
        return this.mapToResponse(request);
    }
    async getRequestByTicket(ticketNumber, tenantId) {
        const request = await this.prisma.withTenant(tenantId, async (prisma) => {
            return prisma.dataSubjectRequest.findFirst({
                where: { ticketNumber, tenantId },
            });
        });
        if (!request) {
            throw new common_1.NotFoundException(`Request ${ticketNumber} not found`);
        }
        return this.mapToResponse(request);
    }
    async listRequests(tenantId, filters) {
        const where = { tenantId };
        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.type) {
            where.requestType = filters.type;
        }
        if (filters?.pending) {
            where.status = {
                notIn: ['COMPLETED', 'REJECTED', 'CANCELLED'],
            };
        }
        const requests = await this.prisma.withTenant(tenantId, async (prisma) => {
            return prisma.dataSubjectRequest.findMany({
                where,
                orderBy: { receivedAt: 'desc' },
            });
        });
        return requests.map((r) => this.mapToResponse(r));
    }
    async updateStatus(requestId, tenantId, status, notes) {
        const request = await this.getRequest(requestId, tenantId);
        if (request.status === 'COMPLETED' || request.status === 'REJECTED') {
            throw new common_1.BadRequestException('Cannot modify completed or rejected requests');
        }
        const updateData = { status };
        if (status === 'COMPLETED') {
            updateData.completedAt = new Date();
            updateData.slaMet = new Date() <= request.deadlineAt;
        }
        if (notes) {
            updateData.notes = request.notes
                ? `${request.notes}\n${new Date().toISOString()}: ${notes}`
                : notes;
        }
        const updated = await this.prisma.withTenant(tenantId, async (prisma) => {
            return prisma.dataSubjectRequest.update({
                where: { id: requestId },
                data: updateData,
            });
        });
        this.loggerService.log(`Request ${request.ticketNumber} status updated to ${status}`, 'GdprRequestService');
        return this.mapToResponse(updated);
    }
    async verifyIdentity(requestId, tenantId, verificationData) {
        const request = await this.getRequest(requestId, tenantId);
        if (request.status !== 'RECEIVED' && request.status !== 'VERIFICATION_PENDING') {
            throw new common_1.BadRequestException('Request is not pending verification');
        }
        const verifiedAt = new Date();
        await this.prisma.withTenant(tenantId, async (prisma) => {
            await prisma.dataSubjectRequest.update({
                where: { id: requestId },
                data: {
                    status: 'VERIFIED',
                    verifiedAt,
                    verificationMethod: verificationData.method,
                    verificationDocuments: verificationData.documents,
                    identityVerified: true,
                    notes: `Identity verified by ${verificationData.verifiedBy || 'system'} using ${verificationData.method}`,
                },
            });
        });
        this.loggerService.log(`Identity verified for request ${request.ticketNumber}`, 'GdprRequestService');
        return {
            success: true,
            method: verificationData.method,
            verifiedAt,
            documents: verificationData.documents,
        };
    }
    async assignRequest(requestId, tenantId, userId) {
        const updated = await this.prisma.withTenant(tenantId, async (prisma) => {
            return prisma.dataSubjectRequest.update({
                where: { id: requestId },
                data: {
                    assignedTo: userId,
                    status: 'IN_PROGRESS',
                },
            });
        });
        this.loggerService.log(`Request ${updated.ticketNumber} assigned to user ${userId}`, 'GdprRequestService');
        return this.mapToResponse(updated);
    }
    async rejectRequest(requestId, tenantId, reason, legalBasis) {
        const request = await this.getRequest(requestId, tenantId);
        if (request.status === 'COMPLETED') {
            throw new common_1.BadRequestException('Cannot reject completed request');
        }
        const updated = await this.prisma.withTenant(tenantId, async (prisma) => {
            return prisma.dataSubjectRequest.update({
                where: { id: requestId },
                data: {
                    status: 'REJECTED',
                    completedAt: new Date(),
                    rejectionReason: reason,
                    rejectionBasis: legalBasis,
                    notes: `Rejected: ${reason}`,
                },
            });
        });
        this.loggerService.log(`Request ${request.ticketNumber} rejected: ${reason}`, 'GdprRequestService');
        return this.mapToResponse(updated);
    }
    async getPendingRequests(tenantId) {
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const where = {
            status: {
                notIn: ['COMPLETED', 'REJECTED', 'CANCELLED'],
            },
        };
        if (tenantId) {
            where.tenantId = tenantId;
        }
        const requests = await this.prisma.dataSubjectRequest.findMany({
            where,
            orderBy: { deadlineAt: 'asc' },
        });
        const overdue = [];
        const urgent = [];
        const normal = [];
        for (const request of requests) {
            const response = this.mapToResponse(request);
            if (request.deadlineAt < now) {
                overdue.push(response);
            }
            else if (request.deadlineAt <= sevenDaysFromNow) {
                urgent.push(response);
            }
            else {
                normal.push(response);
            }
        }
        return { overdue, urgent, normal };
    }
    async getStatistics(tenantId) {
        const where = {};
        if (tenantId) {
            where.tenantId = tenantId;
        }
        const [total, byType, byStatus, overdue, slaStats] = await Promise.all([
            this.prisma.dataSubjectRequest.count({ where }),
            this.prisma.dataSubjectRequest.groupBy({
                by: ['requestType'],
                where,
                _count: { requestType: true },
            }),
            this.prisma.dataSubjectRequest.groupBy({
                by: ['status'],
                where,
                _count: { status: true },
            }),
            this.prisma.dataSubjectRequest.count({
                where: {
                    ...where,
                    status: { notIn: ['COMPLETED', 'REJECTED', 'CANCELLED'] },
                    deadlineAt: { lt: new Date() },
                },
            }),
            this.prisma.dataSubjectRequest.aggregate({
                where: {
                    ...where,
                    status: 'COMPLETED',
                },
                _count: { slaMet: true },
            }),
        ]);
        const byTypeMap = {};
        for (const item of byType) {
            byTypeMap[item.requestType] = item._count.requestType;
        }
        const byStatusMap = {};
        for (const item of byStatus) {
            byStatusMap[item.status] = item._count.status;
        }
        return {
            totalRequests: total,
            byType: byTypeMap,
            byStatus: byStatusMap,
            overdueCount: overdue,
            slaComplianceRate: slaStats._count.slaMet / (slaStats._count.slaMet + overdue) || 0,
            averageCompletionTime: 0,
        };
    }
    async getNextTicketSequence(tenantId, year) {
        const count = await this.prisma.dataSubjectRequest.count({
            where: {
                tenantId,
                ticketNumber: {
                    startsWith: `GDPR-${year}-`,
                },
            },
        });
        return count + 1;
    }
    mapToResponse(request) {
        return {
            id: request.id,
            ticketNumber: request.ticketNumber,
            requestType: request.requestType,
            status: request.status,
            requesterEmail: request.requesterEmail || undefined,
            requesterPhone: request.requesterPhone || undefined,
            customerId: request.customerId || undefined,
            receivedAt: request.receivedAt,
            deadlineAt: request.deadlineAt,
            verifiedAt: request.verifiedAt || undefined,
            completedAt: request.completedAt || undefined,
            slaMet: request.slaMet || undefined,
            assignedTo: request.assignedTo || undefined,
        };
    }
};
exports.GdprRequestService = GdprRequestService;
exports.GdprRequestService = GdprRequestService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        logger_service_1.LoggerService])
], GdprRequestService);
