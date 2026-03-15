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
var WorkOrderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkOrderService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/services/prisma.service");
let WorkOrderService = WorkOrderService_1 = class WorkOrderService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(WorkOrderService_1.name);
    }
    async generateWoNumber(tenantId) {
        const year = new Date().getFullYear();
        const prefix = `WO-${year}-`;
        const lastWo = await this.prisma.workOrder.findFirst({
            where: {
                tenantId,
                woNumber: { startsWith: prefix },
            },
            orderBy: { createdAt: 'desc' },
            select: { woNumber: true },
        });
        let sequence = 1;
        if (lastWo) {
            const lastSequence = parseInt(lastWo.woNumber.replace(prefix, ''), 10);
            if (!isNaN(lastSequence)) {
                sequence = lastSequence + 1;
            }
        }
        return `${prefix}${sequence.toString().padStart(4, '0')}`;
    }
    async findAll(tenantId, filters) {
        try {
            const where = { tenantId };
            if (filters?.status) {
                where.status = filters.status;
            }
            if (filters?.vehicleId) {
                where.vehicleId = filters.vehicleId;
            }
            if (filters?.customerId) {
                where.customerId = filters.customerId;
            }
            const [workOrders, total] = await Promise.all([
                this.prisma.workOrder.findMany({
                    where,
                    include: {
                        vehicle: {
                            select: {
                                id: true,
                                licensePlate: true,
                                make: true,
                                model: true,
                                year: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                }),
                this.prisma.workOrder.count({ where }),
            ]);
            return { workOrders, total };
        }
        catch (error) {
            this.logger.error(`Failed to list work orders: ${error}`);
            throw new common_1.InternalServerErrorException('Failed to list work orders');
        }
    }
    async findOne(tenantId, id) {
        try {
            const workOrder = await this.prisma.workOrder.findFirst({
                where: { id, tenantId },
                include: {
                    vehicle: {
                        select: {
                            id: true,
                            licensePlate: true,
                            make: true,
                            model: true,
                            year: true,
                            vin: true,
                        },
                    },
                    technicians: true,
                    services: true,
                    parts: true,
                },
            });
            if (!workOrder) {
                throw new common_1.NotFoundException(`Work order ${id} not found`);
            }
            return workOrder;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to find work order ${id}: ${error}`);
            throw new common_1.InternalServerErrorException('Failed to find work order');
        }
    }
    async create(tenantId, dto) {
        try {
            const woNumber = await this.generateWoNumber(tenantId);
            const workOrder = await this.prisma.workOrder.create({
                data: {
                    tenantId,
                    woNumber,
                    vehicleId: dto.vehicleId,
                    customerId: dto.customerId,
                    technicianId: dto.technicianId,
                    bookingId: dto.bookingId,
                    diagnosis: dto.diagnosis,
                    customerRequest: dto.customerRequest,
                    mileageIn: dto.mileageIn,
                    status: 'PENDING',
                },
                include: {
                    vehicle: {
                        select: {
                            id: true,
                            licensePlate: true,
                            make: true,
                            model: true,
                        },
                    },
                },
            });
            this.logger.log(`Work order ${woNumber} created for tenant ${tenantId}`);
            return workOrder;
        }
        catch (error) {
            this.logger.error(`Failed to create work order: ${error}`);
            throw new common_1.InternalServerErrorException('Failed to create work order');
        }
    }
    async update(tenantId, id, dto) {
        try {
            const existing = await this.prisma.workOrder.findFirst({
                where: { id, tenantId },
            });
            if (!existing) {
                throw new common_1.NotFoundException(`Work order ${id} not found`);
            }
            const workOrder = await this.prisma.workOrder.update({
                where: { id },
                data: {
                    vehicleId: dto.vehicleId,
                    customerId: dto.customerId,
                    technicianId: dto.technicianId,
                    bookingId: dto.bookingId,
                    diagnosis: dto.diagnosis,
                    customerRequest: dto.customerRequest,
                    mileageIn: dto.mileageIn,
                    mileageOut: dto.mileageOut,
                    laborItems: dto.laborItems ? JSON.parse(JSON.stringify(dto.laborItems)) : undefined,
                    partsUsed: dto.partsUsed ? JSON.parse(JSON.stringify(dto.partsUsed)) : undefined,
                    laborHours: dto.laborHours,
                    laborCost: dto.laborCost,
                    partsCost: dto.partsCost,
                    totalCost: dto.totalCost,
                    photos: dto.photos ? JSON.parse(JSON.stringify(dto.photos)) : undefined,
                    customerSignature: dto.customerSignature,
                    assignedBayId: dto.assignedBayId,
                    estimatedCompletion: dto.estimatedCompletion,
                },
                include: {
                    vehicle: {
                        select: {
                            id: true,
                            licensePlate: true,
                            make: true,
                            model: true,
                        },
                    },
                },
            });
            return workOrder;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to update work order ${id}: ${error}`);
            throw new common_1.InternalServerErrorException('Failed to update work order');
        }
    }
    async start(tenantId, id) {
        try {
            const existing = await this.prisma.workOrder.findFirst({
                where: { id, tenantId },
            });
            if (!existing) {
                throw new common_1.NotFoundException(`Work order ${id} not found`);
            }
            if (existing.status !== 'PENDING' &&
                existing.status !== 'CHECKED_IN' &&
                existing.status !== 'OPEN') {
                throw new common_1.BadRequestException(`Cannot start work order with status ${existing.status}`);
            }
            const workOrder = await this.prisma.workOrder.update({
                where: { id },
                data: {
                    status: 'IN_PROGRESS',
                    actualStartTime: new Date(),
                },
            });
            this.logger.log(`Work order ${id} started for tenant ${tenantId}`);
            return workOrder;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException || error instanceof common_1.BadRequestException) {
                throw error;
            }
            this.logger.error(`Failed to start work order ${id}: ${error}`);
            throw new common_1.InternalServerErrorException('Failed to start work order');
        }
    }
    async complete(tenantId, id) {
        try {
            const existing = await this.prisma.workOrder.findFirst({
                where: { id, tenantId },
            });
            if (!existing) {
                throw new common_1.NotFoundException(`Work order ${id} not found`);
            }
            if (existing.status !== 'IN_PROGRESS' && existing.status !== 'QUALITY_CHECK') {
                throw new common_1.BadRequestException(`Cannot complete work order with status ${existing.status}`);
            }
            const workOrder = await this.prisma.workOrder.update({
                where: { id },
                data: {
                    status: 'COMPLETED',
                    actualCompletionTime: new Date(),
                },
            });
            this.logger.log(`Work order ${id} completed for tenant ${tenantId}`);
            return workOrder;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException || error instanceof common_1.BadRequestException) {
                throw error;
            }
            this.logger.error(`Failed to complete work order ${id}: ${error}`);
            throw new common_1.InternalServerErrorException('Failed to complete work order');
        }
    }
    async createInvoiceFromWo(tenantId, id) {
        try {
            const workOrder = await this.prisma.workOrder.findFirst({
                where: { id, tenantId },
            });
            if (!workOrder) {
                throw new common_1.NotFoundException(`Work order ${id} not found`);
            }
            if (workOrder.status === 'INVOICED') {
                throw new common_1.BadRequestException('Work order is already invoiced');
            }
            if (workOrder.status !== 'COMPLETED' && workOrder.status !== 'READY') {
                throw new common_1.BadRequestException(`Cannot invoice work order with status ${workOrder.status}. Must be COMPLETED or READY.`);
            }
            const items = [];
            if (workOrder.laborItems && Array.isArray(workOrder.laborItems)) {
                for (const item of workOrder.laborItems) {
                    items.push({
                        type: 'LABOR',
                        description: item.description || 'Labor',
                        quantity: item.hours || 1,
                        unitPrice: item.rate || 0,
                        total: item.total || 0,
                    });
                }
            }
            if (workOrder.partsUsed && Array.isArray(workOrder.partsUsed)) {
                for (const part of workOrder.partsUsed) {
                    items.push({
                        type: 'PART',
                        description: part.name || 'Part',
                        quantity: part.quantity || 1,
                        unitPrice: part.unitPrice || 0,
                        total: part.total || 0,
                    });
                }
            }
            const subtotal = workOrder.totalCost ? Number(workOrder.totalCost) : 0;
            const taxRate = 22;
            const taxAmount = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
            const total = parseFloat((subtotal + taxAmount).toFixed(2));
            const year = new Date().getFullYear();
            const invoicePrefix = `INV-${year}-`;
            const lastInvoice = await this.prisma.invoice.findFirst({
                where: {
                    tenantId,
                    invoiceNumber: { startsWith: invoicePrefix },
                },
                orderBy: { createdAt: 'desc' },
                select: { invoiceNumber: true },
            });
            let invoiceSequence = 1;
            if (lastInvoice) {
                const lastSeq = parseInt(lastInvoice.invoiceNumber.replace(invoicePrefix, ''), 10);
                if (!isNaN(lastSeq)) {
                    invoiceSequence = lastSeq + 1;
                }
            }
            const invoiceNumber = `${invoicePrefix}${invoiceSequence.toString().padStart(4, '0')}`;
            const result = await this.prisma.$transaction(async (tx) => {
                const invoice = await tx.invoice.create({
                    data: {
                        tenantId,
                        customerId: workOrder.customerId,
                        workOrderId: workOrder.id,
                        invoiceNumber,
                        status: 'DRAFT',
                        items: items.length > 0 ? JSON.parse(JSON.stringify(items)) : [],
                        subtotal,
                        taxRate,
                        taxAmount,
                        total,
                    },
                });
                const updatedWo = await tx.workOrder.update({
                    where: { id },
                    data: {
                        status: 'INVOICED',
                        invoiceId: invoice.id,
                    },
                });
                return { invoice, workOrder: updatedWo };
            });
            this.logger.log(`Invoice ${invoiceNumber} created from work order ${id} for tenant ${tenantId}`);
            return result;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException || error instanceof common_1.BadRequestException) {
                throw error;
            }
            this.logger.error(`Failed to create invoice from work order ${id}: ${error}`);
            throw new common_1.InternalServerErrorException('Failed to create invoice from work order');
        }
    }
};
exports.WorkOrderService = WorkOrderService;
exports.WorkOrderService = WorkOrderService = WorkOrderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WorkOrderService);
