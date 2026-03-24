import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EstimateStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/services/prisma.service';
import { LoggerService } from '../../common/services/logger.service';
import { validateTransition, TransitionMap } from '../../common/utils/state-machine';
import { CreateEstimateDto, UpdateEstimateDto, CreateEstimateLineDto } from '../dto/estimate.dto';

const ESTIMATE_TRANSITIONS: TransitionMap = {
  DRAFT: ['SENT'],
  SENT: ['ACCEPTED', 'REJECTED', 'EXPIRED'],
  ACCEPTED: ['CONVERTED'],
  REJECTED: [],
  EXPIRED: [],
  CONVERTED: [],
};

interface EstimateFilters {
  customerId?: string;
  status?: EstimateStatus;
  limit?: number;
  offset?: number;
}

@Injectable()
export class EstimateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  async create(
    tenantId: string,
    dto: CreateEstimateDto,
  ): Promise<ReturnType<PrismaService['estimate']['create']>> {
    const estimateNumber = await this.generateEstimateNumber(tenantId);

    const lines = dto.lines ?? [];
    const { subtotalCents, vatCents, totalCents } = this.calculateTotals(
      lines,
      dto.discountCents ?? 0,
    );

    const estimate = await this.prisma.estimate.create({
      data: {
        tenantId,
        estimateNumber,
        customerId: dto.customerId,
        vehicleId: dto.vehicleId ?? null,
        status: EstimateStatus.DRAFT,
        subtotalCents,
        vatCents,
        totalCents,
        discountCents: dto.discountCents ?? 0,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        notes: dto.notes ?? null,
        createdBy: dto.createdBy,
        lines: {
          create: lines.map((line, index) => ({
            type: line.type,
            description: line.description,
            quantity: line.quantity,
            unitPriceCents: line.unitPriceCents,
            totalCents: line.unitPriceCents * line.quantity,
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

  async findAll(
    tenantId: string,
    filters: EstimateFilters,
  ): Promise<{
    estimates: Awaited<ReturnType<PrismaService['estimate']['findMany']>>;
    total: number;
  }> {
    const where: Prisma.EstimateWhereInput = { tenantId };

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

  async findById(
    tenantId: string,
    id: string,
  ): Promise<ReturnType<PrismaService['estimate']['findFirst']>> {
    const estimate = await this.prisma.estimate.findFirst({
      where: { id, tenantId },
      include: { lines: { orderBy: { position: 'asc' } } },
    });

    if (!estimate) {
      throw new NotFoundException(`Estimate ${id} not found`);
    }

    return estimate;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateEstimateDto,
  ): Promise<ReturnType<PrismaService['estimate']['update']>> {
    const existing = await this.findById(tenantId, id);

    if (!existing) {
      throw new NotFoundException(`Estimate ${id} not found`);
    }

    if (existing.status !== EstimateStatus.DRAFT && existing.status !== EstimateStatus.SENT) {
      throw new BadRequestException(
        `Cannot update estimate in ${existing.status} status. Only DRAFT or SENT estimates can be updated.`,
      );
    }

    const estimate = await this.prisma.estimate.update({
      where: { id },
      data: {
        customerId: dto.customerId,
        vehicleId: dto.vehicleId,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        discountCents: dto.discountCents !== undefined ? dto.discountCents : undefined,
        notes: dto.notes,
      },
      include: { lines: { orderBy: { position: 'asc' } } },
    });

    // Recalculate totals if discount changed
    if (dto.discountCents !== undefined) {
      return this.recalculateTotals(tenantId, id);
    }

    return estimate;
  }

  async addLine(
    tenantId: string,
    estimateId: string,
    dto: CreateEstimateLineDto,
  ): Promise<ReturnType<PrismaService['estimate']['findFirst']>> {
    const estimate = await this.findById(tenantId, estimateId);

    if (!estimate) {
      throw new NotFoundException(`Estimate ${estimateId} not found`);
    }

    if (estimate.status !== EstimateStatus.DRAFT) {
      throw new BadRequestException('Can only add lines to DRAFT estimates');
    }

    await this.prisma.estimateLine.create({
      data: {
        estimateId,
        type: dto.type,
        description: dto.description,
        quantity: dto.quantity,
        unitPriceCents: dto.unitPriceCents,
        totalCents: dto.unitPriceCents * dto.quantity,
        vatRate: dto.vatRate,
        partId: dto.partId ?? null,
        position: dto.position ?? 0,
      },
    });

    return this.recalculateTotals(tenantId, estimateId);
  }

  async removeLine(
    tenantId: string,
    lineId: string,
  ): Promise<ReturnType<PrismaService['estimate']['findFirst']>> {
    const line = await this.prisma.estimateLine.findUnique({
      where: { id: lineId },
      include: { estimate: true },
    });

    if (!line || line.estimate.tenantId !== tenantId) {
      throw new NotFoundException(`Estimate line ${lineId} not found`);
    }

    if (line.estimate.status !== EstimateStatus.DRAFT) {
      throw new BadRequestException('Can only remove lines from DRAFT estimates');
    }

    await this.prisma.estimateLine.delete({ where: { id: lineId } });

    return this.recalculateTotals(tenantId, line.estimateId);
  }

  async send(
    tenantId: string,
    id: string,
  ): Promise<ReturnType<PrismaService['estimate']['update']>> {
    const estimate = await this.findById(tenantId, id);

    if (!estimate) {
      throw new NotFoundException(`Estimate ${id} not found`);
    }

    validateTransition(estimate.status, EstimateStatus.SENT, ESTIMATE_TRANSITIONS, 'estimate');

    const updated = await this.prisma.estimate.update({
      where: { id },
      data: {
        status: EstimateStatus.SENT,
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

  async accept(
    tenantId: string,
    id: string,
  ): Promise<ReturnType<PrismaService['estimate']['update']>> {
    const estimate = await this.findById(tenantId, id);

    if (!estimate) {
      throw new NotFoundException(`Estimate ${id} not found`);
    }

    validateTransition(estimate.status, EstimateStatus.ACCEPTED, ESTIMATE_TRANSITIONS, 'estimate');

    const updated = await this.prisma.estimate.update({
      where: { id },
      data: {
        status: EstimateStatus.ACCEPTED,
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

  async reject(
    tenantId: string,
    id: string,
  ): Promise<ReturnType<PrismaService['estimate']['update']>> {
    const estimate = await this.findById(tenantId, id);

    if (!estimate) {
      throw new NotFoundException(`Estimate ${id} not found`);
    }

    validateTransition(estimate.status, EstimateStatus.REJECTED, ESTIMATE_TRANSITIONS, 'estimate');

    const updated = await this.prisma.estimate.update({
      where: { id },
      data: {
        status: EstimateStatus.REJECTED,
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

  async convertToBooking(
    tenantId: string,
    id: string,
    bookingId: string,
  ): Promise<ReturnType<PrismaService['estimate']['update']>> {
    const estimate = await this.findById(tenantId, id);

    if (!estimate) {
      throw new NotFoundException(`Estimate ${id} not found`);
    }

    validateTransition(estimate.status, EstimateStatus.CONVERTED, ESTIMATE_TRANSITIONS, 'estimate');

    const updated = await this.prisma.estimate.update({
      where: { id },
      data: {
        status: EstimateStatus.CONVERTED,
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

    this.logger.log(
      `Estimate ${estimate.estimateNumber} converted to booking ${bookingId} for tenant ${tenantId}`,
    );
    return updated;
  }

  // ==================== CONVERSIONS ====================

  /**
   * Convert an accepted estimate to a work order
   */
  async convertToWorkOrder(estimateId: string, tenantId: string): Promise<unknown> {
    const estimate = await this.prisma.estimate.findFirst({
      where: { id: estimateId, tenantId },
      include: { lines: true },
    });

    if (!estimate) {
      throw new NotFoundException('Estimate not found');
    }

    validateTransition(estimate.status, EstimateStatus.CONVERTED, ESTIMATE_TRANSITIONS, 'estimate');

    // Check if already converted (has CONVERTED status)
    if (estimate.bookingId) {
      throw new ConflictException('Estimate has already been converted');
    }

    // Generate WO number
    const year = new Date().getFullYear();
    const prefix = `WO-${year}-`;
    const lastWo = await this.prisma.workOrder.findFirst({
      where: { tenantId, woNumber: { startsWith: prefix } },
      orderBy: { createdAt: 'desc' },
      select: { woNumber: true },
    });

    let seq = 1;
    if (lastWo) {
      const last = parseInt(lastWo.woNumber.replace(prefix, ''), 10);
      if (!Number.isNaN(last)) seq = last + 1;
    }
    const woNumber = `${prefix}${String(seq).padStart(4, '0')}`;

    // Build labor items from estimate lines
    const laborItems = estimate.lines.map(line => ({
      description: line.description,
      type: line.type,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents.toString(),
      totalCents: line.totalCents.toString(),
    }));

    // Create work order + update estimate in a transaction
    const result = await this.prisma.$transaction(async tx => {
      const wo = await tx.workOrder.create({
        data: {
          tenantId,
          woNumber,
          vehicleId: estimate.vehicleId!,
          customerId: estimate.customerId,
          estimateId: estimate.id,
          status: 'OPEN',
          laborItems: JSON.parse(JSON.stringify(laborItems)),
        },
      });

      await tx.estimate.update({
        where: { id: estimateId },
        data: { status: EstimateStatus.CONVERTED },
      });

      return wo;
    });

    this.eventEmitter.emit('estimate.convertedToWorkOrder', {
      estimateId,
      workOrderId: result.id,
      tenantId,
    });

    this.logger.log(
      `Estimate ${estimate.estimateNumber} converted to WO ${woNumber} for tenant ${tenantId}`,
    );

    return result;
  }

  // ==================== PRIVATE HELPERS ====================

  private async generateEstimateNumber(tenantId: string): Promise<string> {
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

  private calculateTotals(
    lines: CreateEstimateLineDto[],
    discountCents: number,
  ): { subtotalCents: number; vatCents: number; totalCents: number } {
    let subtotal = 0;
    let vat = 0;

    for (const line of lines) {
      const lineTotal = line.unitPriceCents * line.quantity;
      subtotal += lineTotal;
      // Calculate VAT: lineTotal * vatRate, rounded
      vat += Math.round(lineTotal * line.vatRate);
    }

    const total = subtotal + vat - discountCents;

    return {
      subtotalCents: subtotal,
      vatCents: vat,
      totalCents: total < 0 ? 0 : total,
    };
  }

  private async recalculateTotals(
    tenantId: string,
    estimateId: string,
  ): Promise<ReturnType<PrismaService['estimate']['update']>> {
    const lines = await this.prisma.estimateLine.findMany({
      where: { estimateId },
    });

    const estimate = await this.prisma.estimate.findFirst({
      where: { id: estimateId, tenantId },
      select: { discountCents: true },
    });

    let subtotal = 0;
    let vat = 0;

    for (const line of lines) {
      subtotal += Number(line.totalCents);
      vat += Math.round(Number(line.totalCents) * Number(line.vatRate));
    }

    const discount = Number(estimate?.discountCents ?? 0);
    const total = subtotal + vat - discount;

    return this.prisma.estimate.update({
      where: { id: estimateId },
      data: {
        subtotalCents: subtotal,
        vatCents: vat,
        totalCents: total < 0 ? 0 : total,
      },
      include: { lines: { orderBy: { position: 'asc' } } },
    });
  }
}
