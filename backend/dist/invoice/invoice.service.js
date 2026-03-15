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
var InvoiceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/services/prisma.service");
const library_1 = require("@prisma/client/runtime/library");
let InvoiceService = InvoiceService_1 = class InvoiceService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(InvoiceService_1.name);
    }
    async findAll(tenantId, filters) {
        const where = { tenantId };
        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.customerId) {
            where.customerId = filters.customerId;
        }
        if (filters?.dateFrom || filters?.dateTo) {
            where.createdAt = {};
            if (filters.dateFrom) {
                where.createdAt.gte = new Date(filters.dateFrom);
            }
            if (filters.dateTo) {
                where.createdAt.lte = new Date(filters.dateTo);
            }
        }
        const [invoices, total] = await Promise.all([
            this.prisma.invoice.findMany({
                where,
                include: { customer: true },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.invoice.count({ where }),
        ]);
        return { invoices, total };
    }
    async findOne(tenantId, id) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id, tenantId },
            include: { customer: true },
        });
        if (!invoice) {
            throw new common_1.NotFoundException(`Invoice with id ${id} not found`);
        }
        return invoice;
    }
    async create(tenantId, dto) {
        const { subtotal, taxRate, taxAmount, total } = this.computeTotals(dto.items, dto.taxRate);
        return this.prisma.$transaction(async (tx) => {
            const invoiceNumber = await this.generateInvoiceNumber(tenantId, tx);
            const invoice = await tx.invoice.create({
                data: {
                    tenantId,
                    customerId: dto.customerId,
                    invoiceNumber,
                    items: JSON.parse(JSON.stringify(dto.items)),
                    subtotal: new library_1.Decimal(subtotal.toFixed(2)),
                    taxRate: new library_1.Decimal(taxRate.toFixed(2)),
                    taxAmount: new library_1.Decimal(taxAmount.toFixed(2)),
                    total: new library_1.Decimal(total.toFixed(2)),
                    notes: dto.notes ?? null,
                    dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                    bookingId: dto.bookingId ?? null,
                    workOrderId: dto.workOrderId ?? null,
                },
                include: { customer: true },
            });
            this.logger.log(`Invoice ${invoiceNumber} created for tenant ${tenantId}`);
            return invoice;
        });
    }
    async update(tenantId, id, dto) {
        const existing = await this.findOne(tenantId, id);
        if (existing.status !== 'DRAFT' && !dto.status) {
            throw new common_1.BadRequestException('Only DRAFT invoices can be fully edited');
        }
        const data = {};
        if (dto.items) {
            const { subtotal, taxRate, taxAmount, total } = this.computeTotals(dto.items, dto.taxRate ?? Number(existing.taxRate));
            data.items = JSON.parse(JSON.stringify(dto.items));
            data.subtotal = new library_1.Decimal(subtotal.toFixed(2));
            data.taxRate = new library_1.Decimal(taxRate.toFixed(2));
            data.taxAmount = new library_1.Decimal(taxAmount.toFixed(2));
            data.total = new library_1.Decimal(total.toFixed(2));
        }
        if (dto.customerId)
            data.customerId = dto.customerId;
        if (dto.notes !== undefined)
            data.notes = dto.notes ?? null;
        if (dto.dueDate !== undefined)
            data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
        if (dto.bookingId !== undefined)
            data.bookingId = dto.bookingId ?? null;
        if (dto.workOrderId !== undefined)
            data.workOrderId = dto.workOrderId ?? null;
        if (dto.status)
            data.status = dto.status;
        return this.prisma.invoice.update({
            where: { id },
            data,
            include: { customer: true },
        });
    }
    async remove(tenantId, id) {
        const existing = await this.findOne(tenantId, id);
        if (existing.status !== 'DRAFT') {
            throw new common_1.BadRequestException('Only DRAFT invoices can be deleted');
        }
        await this.prisma.invoice.delete({ where: { id } });
        this.logger.log(`Invoice ${existing.invoiceNumber} deleted for tenant ${tenantId}`);
    }
    async send(tenantId, id) {
        const existing = await this.findOne(tenantId, id);
        if (existing.status !== 'DRAFT') {
            throw new common_1.BadRequestException('Only DRAFT invoices can be sent');
        }
        const invoice = await this.prisma.invoice.update({
            where: { id },
            data: {
                status: 'SENT',
                sentAt: new Date(),
            },
            include: { customer: true },
        });
        this.logger.log(`Invoice ${existing.invoiceNumber} sent for tenant ${tenantId}`);
        return invoice;
    }
    async markPaid(tenantId, id) {
        const existing = await this.findOne(tenantId, id);
        if (existing.status === 'PAID') {
            throw new common_1.BadRequestException('Invoice is already paid');
        }
        if (existing.status === 'CANCELLED') {
            throw new common_1.BadRequestException('Cannot mark a cancelled invoice as paid');
        }
        const invoice = await this.prisma.invoice.update({
            where: { id },
            data: {
                status: 'PAID',
                paidAt: new Date(),
            },
            include: { customer: true },
        });
        this.logger.log(`Invoice ${existing.invoiceNumber} marked as paid for tenant ${tenantId}`);
        return invoice;
    }
    async getStats(tenantId) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const [statusCounts, monthlyRevenue] = await Promise.all([
            this.prisma.invoice.groupBy({
                by: ['status'],
                where: { tenantId },
                _count: { id: true },
            }),
            this.prisma.invoice.aggregate({
                where: {
                    tenantId,
                    status: 'PAID',
                    paidAt: { gte: startOfMonth },
                },
                _sum: { total: true },
                _count: { id: true },
            }),
        ]);
        const byStatus = {};
        for (const entry of statusCounts) {
            byStatus[entry.status] = entry._count.id;
        }
        return {
            byStatus,
            monthlyRevenue: {
                total: monthlyRevenue._sum.total ?? new library_1.Decimal(0),
                count: monthlyRevenue._count.id,
            },
        };
    }
    computeTotals(items, taxRateOverride) {
        const subtotal = items.reduce((sum, item) => sum + item.qty * item.price, 0);
        const taxRate = taxRateOverride ?? 22;
        const taxAmount = subtotal * (taxRate / 100);
        const total = subtotal + taxAmount;
        return { subtotal, taxRate, taxAmount, total };
    }
    async generateInvoiceNumber(tenantId, tx) {
        const year = new Date().getFullYear();
        const prefix = `INV-${year}-`;
        const lastInvoice = await tx.invoice.findFirst({
            where: {
                tenantId,
                invoiceNumber: { startsWith: prefix },
            },
            orderBy: { invoiceNumber: 'desc' },
            select: { invoiceNumber: true },
        });
        let sequence = 1;
        if (lastInvoice) {
            const lastSequence = parseInt(lastInvoice.invoiceNumber.replace(prefix, ''), 10);
            if (!isNaN(lastSequence)) {
                sequence = lastSequence + 1;
            }
        }
        return `${prefix}${sequence.toString().padStart(4, '0')}`;
    }
};
exports.InvoiceService = InvoiceService;
exports.InvoiceService = InvoiceService = InvoiceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InvoiceService);
