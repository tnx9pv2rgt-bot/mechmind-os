import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { CreateInvoiceDto, CreateInvoiceItemDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { validateTransition, TransitionMap } from '../common/utils/state-machine';

const INVOICE_TRANSITIONS: TransitionMap = {
  DRAFT: ['SENT', 'CANCELLED'],
  SENT: ['PAID', 'OVERDUE', 'CANCELLED'],
  OVERDUE: ['PAID', 'CANCELLED'],
  PAID: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
  PARTIALLY_REFUNDED: [],
};

interface InvoiceFilters {
  status?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filters?: InvoiceFilters) {
    const where: Record<string, unknown> = { tenantId };

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        (where.createdAt as Record<string, unknown>).gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        (where.createdAt as Record<string, unknown>).lte = new Date(filters.dateTo);
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

  async findOne(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { customer: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with id ${id} not found`);
    }

    return invoice;
  }

  async create(tenantId: string, dto: CreateInvoiceDto) {
    const { subtotal, taxRate, taxAmount, total, stampDuty, stampDutyAmount } = this.computeTotals(
      dto.items,
      dto.taxRate,
    );

    return this.prisma.$transaction(async tx => {
      const invoiceNumber = await this.generateInvoiceNumber(tenantId, tx);

      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          customerId: dto.customerId,
          invoiceNumber,
          items: JSON.parse(JSON.stringify(dto.items)),
          subtotal: new Decimal(subtotal.toFixed(2)),
          taxRate: new Decimal(taxRate.toFixed(2)),
          taxAmount: new Decimal(taxAmount.toFixed(2)),
          total: new Decimal(total.toFixed(2)),
          stampDuty,
          stampDutyAmount:
            stampDutyAmount > 0 ? new Decimal(stampDutyAmount.toFixed(2)) : undefined,
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

  async update(tenantId: string, id: string, dto: UpdateInvoiceDto) {
    const existing = await this.findOne(tenantId, id);

    if (existing.status !== 'DRAFT' && !dto.status) {
      throw new BadRequestException('Only DRAFT invoices can be fully edited');
    }

    const data: Record<string, unknown> = {};

    if (dto.items) {
      const { subtotal, taxRate, taxAmount, total } = this.computeTotals(
        dto.items,
        dto.taxRate ?? Number(existing.taxRate),
      );
      data.items = JSON.parse(JSON.stringify(dto.items));
      data.subtotal = new Decimal(subtotal.toFixed(2));
      data.taxRate = new Decimal(taxRate.toFixed(2));
      data.taxAmount = new Decimal(taxAmount.toFixed(2));
      data.total = new Decimal(total.toFixed(2));
    }

    if (dto.customerId) data.customerId = dto.customerId;
    if (dto.notes !== undefined) data.notes = dto.notes ?? null;
    if (dto.dueDate !== undefined) data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.bookingId !== undefined) data.bookingId = dto.bookingId ?? null;
    if (dto.workOrderId !== undefined) data.workOrderId = dto.workOrderId ?? null;
    if (dto.status) {
      validateTransition(existing.status, dto.status, INVOICE_TRANSITIONS, 'invoice');
      data.status = dto.status;
    }

    return this.prisma.invoice.update({
      where: { id },
      data,
      include: { customer: true },
    });
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.findOne(tenantId, id);

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT invoices can be deleted');
    }

    await this.prisma.invoice.delete({ where: { id } });
    this.logger.log(`Invoice ${existing.invoiceNumber} deleted for tenant ${tenantId}`);
  }

  async send(tenantId: string, id: string) {
    const existing = await this.findOne(tenantId, id);

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT invoices can be sent');
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

  async markPaid(tenantId: string, id: string) {
    const existing = await this.findOne(tenantId, id);

    if (existing.status === 'PAID') {
      throw new BadRequestException('Invoice is already paid');
    }
    if (existing.status === 'CANCELLED') {
      throw new BadRequestException('Cannot mark a cancelled invoice as paid');
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

  async getStats(tenantId: string) {
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

    const byStatus: Record<string, number> = {};
    for (const entry of statusCounts) {
      byStatus[entry.status] = entry._count.id;
    }

    return {
      byStatus,
      monthlyRevenue: {
        total: monthlyRevenue._sum.total ?? new Decimal(0),
        count: monthlyRevenue._count.id,
      },
    };
  }

  /**
   * Refund an invoice (full or partial).
   * Full refund → creates a credit note (TD04) and marks REFUNDED.
   * Partial refund → marks PARTIALLY_REFUNDED.
   */
  async refundInvoice(
    tenantId: string,
    invoiceId: string,
    amount?: number,
  ): Promise<{ refundedAmount: number; creditNoteId?: string }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { customer: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with id ${invoiceId} not found`);
    }

    if (invoice.status !== 'PAID') {
      throw new BadRequestException('Only PAID invoices can be refunded');
    }

    const invoiceTotal = Number(invoice.total);
    const refundAmount = amount ?? invoiceTotal;

    if (refundAmount <= 0 || refundAmount > invoiceTotal) {
      throw new BadRequestException(`Refund amount must be between 0.01 and ${invoiceTotal}`);
    }

    const isFullRefund = refundAmount >= invoiceTotal;

    return this.prisma.$transaction(async tx => {
      // Update original invoice status
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        },
      });

      let creditNoteId: string | undefined;

      // Full refund → create credit note (TD04)
      if (isFullRefund) {
        const creditNoteNumber = await this.generateInvoiceNumber(tenantId, tx);
        const creditNote = await tx.invoice.create({
          data: {
            tenantId,
            customerId: invoice.customerId,
            invoiceNumber: creditNoteNumber,
            items: invoice.items as object,
            subtotal: invoice.subtotal,
            taxRate: invoice.taxRate,
            taxAmount: invoice.taxAmount,
            total: new Decimal((-refundAmount).toFixed(2)),
            documentType: 'NOTA_CREDITO',
            creditNoteOfId: invoiceId,
            status: 'SENT',
            sentAt: new Date(),
            notes: `Nota di credito per fattura ${invoice.invoiceNumber}`,
          },
        });
        creditNoteId = creditNote.id;
      }

      this.logger.log(
        `Invoice ${invoice.invoiceNumber} ${isFullRefund ? 'fully' : 'partially'} refunded: €${refundAmount.toFixed(2)}`,
      );

      return { refundedAmount: refundAmount, creditNoteId };
    });
  }

  /**
   * Compute totals with Italian-law-compliant per-line IVA rounding.
   * Also applies automatic stamp duty (bollo virtuale €2) when applicable.
   */
  computeTotals(
    items: CreateInvoiceItemDto[],
    taxRateOverride?: number,
  ): {
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    stampDuty: boolean;
    stampDutyAmount: number;
  } {
    let subtotal = 0;
    let totalVat = 0;

    for (const item of items) {
      const discountMultiplier = 1 - (item.discount ?? 0) / 100;
      const lineSubtotal = item.quantity * item.unitPrice * discountMultiplier;
      // Italian law: round IVA per line to 2 decimal places
      const lineVat = Math.round(((lineSubtotal * item.vatRate) / 100) * 100) / 100;
      subtotal += lineSubtotal;
      totalVat += lineVat;
    }

    const taxRate = taxRateOverride ?? (items.length > 0 ? items[0].vatRate : 22);
    const taxAmount = totalVat;

    // Automatic stamp duty (bollo virtuale €2)
    // Applies when invoice has VAT-exempt items (vatRate = 0) and taxable amount > €77.47
    const hasExemptItems = items.some(item => item.vatRate === 0);
    const stampDuty = hasExemptItems && subtotal > 77.47;
    const stampDutyAmount = stampDuty ? 2.0 : 0;

    const total = subtotal + taxAmount + stampDutyAmount;

    return { subtotal, taxRate, taxAmount, total, stampDuty, stampDutyAmount };
  }

  private async generateInvoiceNumber(
    tenantId: string,
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
  ): Promise<string> {
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
}
