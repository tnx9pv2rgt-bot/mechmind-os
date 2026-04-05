import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EstimateStatus, PublicTokenType, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/services/prisma.service';
import { LoggerService } from '../../common/services/logger.service';
import { PublicTokenService } from '../../public-token/public-token.service';
import { validateTransition, TransitionMap } from '../../common/utils/state-machine';
import { CreateEstimateDto, UpdateEstimateDto, CreateEstimateLineDto } from '../dto/estimate.dto';

type ApprovalChannel = 'SMS' | 'WHATSAPP' | 'EMAIL';

interface LineApprovalInput {
  lineId: string;
  approved: boolean;
  reason?: string;
}

const ESTIMATE_TRANSITIONS: TransitionMap = {
  DRAFT: ['SENT'],
  SENT: ['ACCEPTED', 'REJECTED', 'PARTIALLY_APPROVED', 'EXPIRED'],
  PARTIALLY_APPROVED: ['ACCEPTED', 'CONVERTED'],
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
    private readonly publicTokenService: PublicTokenService,
    private readonly config: ConfigService,
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

  // ==================== PUBLIC APPROVAL ====================

  /**
   * Send estimate for customer approval via public token link
   */
  async sendForApproval(
    tenantId: string,
    estimateId: string,
    channel: ApprovalChannel,
  ): Promise<{ approvalUrl: string }> {
    const estimate = await this.findById(tenantId, estimateId);

    if (!estimate) {
      throw new NotFoundException(`Estimate ${estimateId} not found`);
    }

    // Transition to SENT if still DRAFT
    if (estimate.status === EstimateStatus.DRAFT) {
      validateTransition(estimate.status, EstimateStatus.SENT, ESTIMATE_TRANSITIONS, 'estimate');
    }

    // Revoke any previous approval tokens for this estimate
    await this.publicTokenService.revokeTokensForEntity(tenantId, 'Estimate', estimateId);

    // Generate new public token (72h expiry)
    const publicToken = await this.publicTokenService.generateToken(
      tenantId,
      PublicTokenType.ESTIMATE_APPROVAL,
      estimateId,
      'Estimate',
      72,
      { channel },
    );

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'https://app.mechmind.io');
    const approvalUrl = `${frontendUrl}/public/estimates/${publicToken.token}`;

    // Update estimate with approval info
    await this.prisma.estimate.update({
      where: { id: estimateId },
      data: {
        status: EstimateStatus.SENT,
        sentAt: new Date(),
        approvalToken: publicToken.token,
        approvalSentAt: new Date(),
        approvalMethod: channel,
      },
    });

    this.eventEmitter.emit('estimate.sentForApproval', {
      estimateId,
      tenantId,
      customerId: estimate.customerId,
      channel,
      approvalUrl,
    });

    this.logger.log(
      `Estimate ${estimate.estimateNumber} sent for approval via ${channel} for tenant ${tenantId}`,
    );

    return { approvalUrl };
  }

  /**
   * Retrieve estimate by its public approval token (no auth required)
   */
  async getByApprovalToken(
    token: string,
  ): Promise<ReturnType<PrismaService['estimate']['findFirst']>> {
    const tokenRecord = await this.publicTokenService.validateToken(token);

    const estimate = await this.prisma.estimate.findFirst({
      where: { id: tokenRecord.entityId },
      include: { lines: { orderBy: { position: 'asc' } } },
    });

    if (!estimate) {
      throw new NotFoundException('Preventivo non trovato');
    }

    return estimate;
  }

  /**
   * Process line-by-line approval/rejection from customer via public token
   */
  async processApproval(
    token: string,
    approvals: LineApprovalInput[],
  ): Promise<ReturnType<PrismaService['estimate']['findFirst']>> {
    const tokenRecord = await this.publicTokenService.validateToken(token);
    const estimateId = tokenRecord.entityId;
    const tenantId = tokenRecord.tenantId;

    const estimate = await this.prisma.estimate.findFirst({
      where: { id: estimateId },
      include: { lines: { orderBy: { position: 'asc' } } },
    });

    if (!estimate) {
      throw new NotFoundException('Preventivo non trovato');
    }

    if (estimate.status !== EstimateStatus.SENT) {
      throw new BadRequestException(
        `Il preventivo non è in stato SENT. Stato attuale: ${estimate.status}`,
      );
    }

    const now = new Date();

    // Update each line's approval status
    for (const approval of approvals) {
      const lineExists = estimate.lines.some(l => l.id === approval.lineId);
      if (!lineExists) {
        throw new BadRequestException(`Riga preventivo ${approval.lineId} non trovata`);
      }

      await this.prisma.estimateLine.update({
        where: { id: approval.lineId },
        data: {
          customerApproved: approval.approved,
          approvedAt: approval.approved ? now : null,
          rejectedAt: approval.approved ? null : now,
          rejectedReason: approval.approved ? null : (approval.reason ?? null),
        },
      });
    }

    // Determine overall status based on line approvals
    const updatedLines = await this.prisma.estimateLine.findMany({
      where: { estimateId },
    });

    const allApproved = updatedLines.every(l => l.customerApproved === true);
    const allRejected = updatedLines.every(l => l.customerApproved === false);

    let newStatus: EstimateStatus;
    if (allApproved) {
      newStatus = EstimateStatus.ACCEPTED;
    } else if (allRejected) {
      newStatus = EstimateStatus.REJECTED;
    } else {
      newStatus = EstimateStatus.PARTIALLY_APPROVED;
    }

    const updated = await this.prisma.estimate.update({
      where: { id: estimateId },
      data: {
        status: newStatus,
        ...(newStatus === EstimateStatus.ACCEPTED && { acceptedAt: now }),
        ...(newStatus === EstimateStatus.REJECTED && { rejectedAt: now }),
      },
      include: { lines: { orderBy: { position: 'asc' } } },
    });

    // Consume token after successful approval
    await this.publicTokenService.consumeToken(token);

    // Emit appropriate event
    if (newStatus === EstimateStatus.ACCEPTED) {
      this.eventEmitter.emit('estimate.approved', {
        estimateId,
        tenantId,
        customerId: estimate.customerId,
      });
    } else if (newStatus === EstimateStatus.PARTIALLY_APPROVED) {
      this.eventEmitter.emit('estimate.partiallyApproved', {
        estimateId,
        tenantId,
        customerId: estimate.customerId,
        approvedLineIds: updatedLines.filter(l => l.customerApproved === true).map(l => l.id),
        rejectedLineIds: updatedLines.filter(l => l.customerApproved === false).map(l => l.id),
      });
    } else {
      this.eventEmitter.emit('estimate.rejected', {
        estimateId,
        tenantId,
        customerId: estimate.customerId,
      });
    }

    this.logger.log(
      `Estimate ${estimate.estimateNumber} approval processed: ${newStatus} for tenant ${tenantId}`,
    );

    return updated;
  }

  /**
   * Approve all lines of an estimate via public token
   */
  async approveAll(token: string): Promise<ReturnType<PrismaService['estimate']['findFirst']>> {
    const tokenRecord = await this.publicTokenService.validateToken(token);
    const estimateId = tokenRecord.entityId;
    const tenantId = tokenRecord.tenantId;

    const estimate = await this.prisma.estimate.findFirst({
      where: { id: estimateId },
      include: { lines: { orderBy: { position: 'asc' } } },
    });

    if (!estimate) {
      throw new NotFoundException('Preventivo non trovato');
    }

    if (estimate.status !== EstimateStatus.SENT) {
      throw new BadRequestException(
        `Il preventivo non è in stato SENT. Stato attuale: ${estimate.status}`,
      );
    }

    const now = new Date();

    // Approve all lines
    await this.prisma.estimateLine.updateMany({
      where: { estimateId },
      data: {
        customerApproved: true,
        approvedAt: now,
        rejectedAt: null,
        rejectedReason: null,
      },
    });

    // Update estimate status to ACCEPTED
    const updated = await this.prisma.estimate.update({
      where: { id: estimateId },
      data: {
        status: EstimateStatus.ACCEPTED,
        acceptedAt: now,
      },
      include: { lines: { orderBy: { position: 'asc' } } },
    });

    // Consume token
    await this.publicTokenService.consumeToken(token);

    this.eventEmitter.emit('estimate.approved', {
      estimateId,
      tenantId,
      customerId: estimate.customerId,
    });

    this.logger.log(
      `Estimate ${estimate.estimateNumber} fully approved via token for tenant ${tenantId}`,
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
