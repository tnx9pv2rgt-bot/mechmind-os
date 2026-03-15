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
exports.EstimateService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../common/services/prisma.service");
const logger_service_1 = require("../../common/services/logger.service");
let EstimateService = class EstimateService {
    constructor(prisma, eventEmitter, logger) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
        this.logger = logger;
    }
    async create(tenantId, dto) {
        const estimateNumber = await this.generateEstimateNumber(tenantId);
        const lines = dto.lines ?? [];
        const { subtotalCents, vatCents, totalCents } = this.calculateTotals(lines, dto.discountCents ?? 0);
        const estimate = await this.prisma.estimate.create({
            data: {
                tenantId,
                estimateNumber,
                customerId: dto.customerId,
                vehicleId: dto.vehicleId ?? null,
                status: client_1.EstimateStatus.DRAFT,
                subtotalCents,
                vatCents,
                totalCents,
                discountCents: BigInt(dto.discountCents ?? 0),
                validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
                notes: dto.notes ?? null,
                createdBy: dto.createdBy,
                lines: {
                    create: lines.map((line, index) => ({
                        type: line.type,
                        description: line.description,
                        quantity: line.quantity,
                        unitPriceCents: BigInt(line.unitPriceCents),
                        totalCents: BigInt(line.unitPriceCents * line.quantity),
                        vatRate: line.vatRate,
                        partId: line.partId ?? null,
                        position: line.position ?? index,
                    })),
                },
            },
            include: { lines: { orderBy: { position: 'asc' } } },
        });
        this.eventEmitter.emit('estimate.created', {
            estimateId: estimate.id,
            tenantId,
            customerId: dto.customerId,
        });
        this.logger.log(`Estimate ${estimateNumber} created for tenant ${tenantId}`);
        return estimate;
    }
    async findAll(tenantId, filters) {
        const where = { tenantId };
        if (filters.customerId) {
            where.customerId = filters.customerId;
        }
        if (filters.status) {
            where.status = filters.status;
        }
        const limit = filters.limit ?? 50;
        const offset = filters.offset ?? 0;
        const [estimates, total] = await this.prisma.$transaction([
            this.prisma.estimate.findMany({
                where,
                include: { lines: { orderBy: { position: 'asc' } } },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            this.prisma.estimate.count({ where }),
        ]);
        return { estimates, total };
    }
    async findById(tenantId, id) {
        const estimate = await this.prisma.estimate.findFirst({
            where: { id, tenantId },
            include: { lines: { orderBy: { position: 'asc' } } },
        });
        if (!estimate) {
            throw new common_1.NotFoundException(`Estimate ${id} not found`);
        }
        return estimate;
    }
    async update(tenantId, id, dto) {
        const existing = await this.findById(tenantId, id);
        if (!existing) {
            throw new common_1.NotFoundException(`Estimate ${id} not found`);
        }
        if (existing.status !== client_1.EstimateStatus.DRAFT && existing.status !== client_1.EstimateStatus.SENT) {
            throw new common_1.BadRequestException(`Cannot update estimate in ${existing.status} status`);
        }
        const estimate = await this.prisma.estimate.update({
            where: { id },
            data: {
                customerId: dto.customerId,
                vehicleId: dto.vehicleId,
                validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
                discountCents: dto.discountCents !== undefined ? BigInt(dto.discountCents) : undefined,
                notes: dto.notes,
            },
            include: { lines: { orderBy: { position: 'asc' } } },
        });
        if (dto.discountCents !== undefined) {
            return this.recalculateTotals(tenantId, id);
        }
        return estimate;
    }
    async addLine(tenantId, estimateId, dto) {
        const estimate = await this.findById(tenantId, estimateId);
        if (!estimate) {
            throw new common_1.NotFoundException(`Estimate ${estimateId} not found`);
        }
        if (estimate.status !== client_1.EstimateStatus.DRAFT) {
            throw new common_1.BadRequestException('Can only add lines to DRAFT estimates');
        }
        await this.prisma.estimateLine.create({
            data: {
                estimateId,
                type: dto.type,
                description: dto.description,
                quantity: dto.quantity,
                unitPriceCents: BigInt(dto.unitPriceCents),
                totalCents: BigInt(dto.unitPriceCents * dto.quantity),
                vatRate: dto.vatRate,
                partId: dto.partId ?? null,
                position: dto.position ?? 0,
            },
        });
        return this.recalculateTotals(tenantId, estimateId);
    }
    async removeLine(tenantId, lineId) {
        const line = await this.prisma.estimateLine.findUnique({
            where: { id: lineId },
            include: { estimate: true },
        });
        if (!line || line.estimate.tenantId !== tenantId) {
            throw new common_1.NotFoundException(`Estimate line ${lineId} not found`);
        }
        if (line.estimate.status !== client_1.EstimateStatus.DRAFT) {
            throw new common_1.BadRequestException('Can only remove lines from DRAFT estimates');
        }
        await this.prisma.estimateLine.delete({ where: { id: lineId } });
        return this.recalculateTotals(tenantId, line.estimateId);
    }
    async send(tenantId, id) {
        const estimate = await this.findById(tenantId, id);
        if (!estimate) {
            throw new common_1.NotFoundException(`Estimate ${id} not found`);
        }
        if (estimate.status !== client_1.EstimateStatus.DRAFT) {
            throw new common_1.BadRequestException('Can only send DRAFT estimates');
        }
        const updated = await this.prisma.estimate.update({
            where: { id },
            data: {
                status: client_1.EstimateStatus.SENT,
                sentAt: new Date(),
            },
            include: { lines: { orderBy: { position: 'asc' } } },
        });
        this.eventEmitter.emit('estimate.sent', {
            estimateId: id,
            tenantId,
            customerId: estimate.customerId,
        });
        this.logger.log(`Estimate ${estimate.estimateNumber} sent for tenant ${tenantId}`);
        return updated;
    }
    async accept(tenantId, id) {
        const estimate = await this.findById(tenantId, id);
        if (!estimate) {
            throw new common_1.NotFoundException(`Estimate ${id} not found`);
        }
        if (estimate.status !== client_1.EstimateStatus.SENT) {
            throw new common_1.BadRequestException('Can only accept SENT estimates');
        }
        const updated = await this.prisma.estimate.update({
            where: { id },
            data: {
                status: client_1.EstimateStatus.ACCEPTED,
                acceptedAt: new Date(),
            },
            include: { lines: { orderBy: { position: 'asc' } } },
        });
        this.eventEmitter.emit('estimate.accepted', {
            estimateId: id,
            tenantId,
            customerId: estimate.customerId,
        });
        this.logger.log(`Estimate ${estimate.estimateNumber} accepted for tenant ${tenantId}`);
        return updated;
    }
    async reject(tenantId, id) {
        const estimate = await this.findById(tenantId, id);
        if (!estimate) {
            throw new common_1.NotFoundException(`Estimate ${id} not found`);
        }
        if (estimate.status !== client_1.EstimateStatus.SENT) {
            throw new common_1.BadRequestException('Can only reject SENT estimates');
        }
        const updated = await this.prisma.estimate.update({
            where: { id },
            data: {
                status: client_1.EstimateStatus.REJECTED,
                rejectedAt: new Date(),
            },
            include: { lines: { orderBy: { position: 'asc' } } },
        });
        this.eventEmitter.emit('estimate.rejected', {
            estimateId: id,
            tenantId,
            customerId: estimate.customerId,
        });
        this.logger.log(`Estimate ${estimate.estimateNumber} rejected for tenant ${tenantId}`);
        return updated;
    }
    async convertToBooking(tenantId, id, bookingId) {
        const estimate = await this.findById(tenantId, id);
        if (!estimate) {
            throw new common_1.NotFoundException(`Estimate ${id} not found`);
        }
        if (estimate.status !== client_1.EstimateStatus.ACCEPTED) {
            throw new common_1.BadRequestException('Can only convert ACCEPTED estimates to bookings');
        }
        const updated = await this.prisma.estimate.update({
            where: { id },
            data: {
                status: client_1.EstimateStatus.CONVERTED,
                bookingId,
            },
            include: { lines: { orderBy: { position: 'asc' } } },
        });
        this.eventEmitter.emit('estimate.converted', {
            estimateId: id,
            tenantId,
            bookingId,
            customerId: estimate.customerId,
        });
        this.logger.log(`Estimate ${estimate.estimateNumber} converted to booking ${bookingId} for tenant ${tenantId}`);
        return updated;
    }
    async generateEstimateNumber(tenantId) {
        const year = new Date().getFullYear();
        const prefix = `EST-${year}-`;
        const lastEstimate = await this.prisma.estimate.findFirst({
            where: {
                tenantId,
                estimateNumber: { startsWith: prefix },
            },
            orderBy: { estimateNumber: 'desc' },
            select: { estimateNumber: true },
        });
        let nextSeq = 1;
        if (lastEstimate) {
            const lastSeq = parseInt(lastEstimate.estimateNumber.replace(prefix, ''), 10);
            if (!Number.isNaN(lastSeq)) {
                nextSeq = lastSeq + 1;
            }
        }
        return `${prefix}${String(nextSeq).padStart(4, '0')}`;
    }
    calculateTotals(lines, discountCents) {
        let subtotal = BigInt(0);
        let vat = BigInt(0);
        for (const line of lines) {
            const lineTotal = BigInt(line.unitPriceCents * line.quantity);
            subtotal += lineTotal;
            vat += BigInt(Math.round(Number(lineTotal) * line.vatRate));
        }
        const discount = BigInt(discountCents);
        const total = subtotal + vat - discount;
        return {
            subtotalCents: subtotal,
            vatCents: vat,
            totalCents: total < BigInt(0) ? BigInt(0) : total,
        };
    }
    async recalculateTotals(tenantId, estimateId) {
        const lines = await this.prisma.estimateLine.findMany({
            where: { estimateId },
        });
        const estimate = await this.prisma.estimate.findFirst({
            where: { id: estimateId, tenantId },
            select: { discountCents: true },
        });
        let subtotal = BigInt(0);
        let vat = BigInt(0);
        for (const line of lines) {
            subtotal += line.totalCents;
            vat += BigInt(Math.round(Number(line.totalCents) * Number(line.vatRate)));
        }
        const discount = estimate?.discountCents ?? BigInt(0);
        const total = subtotal + vat - discount;
        return this.prisma.estimate.update({
            where: { id: estimateId },
            data: {
                subtotalCents: subtotal,
                vatCents: vat,
                totalCents: total < BigInt(0) ? BigInt(0) : total,
            },
            include: { lines: { orderBy: { position: 'asc' } } },
        });
    }
};
exports.EstimateService = EstimateService;
exports.EstimateService = EstimateService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2,
        logger_service_1.LoggerService])
], EstimateService);
