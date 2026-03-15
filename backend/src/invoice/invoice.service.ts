import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { CreateInvoiceDto, InvoiceItemDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { Decimal } from '@prisma/client/runtime/library';

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
    const { subtotal, taxRate, taxAmount, total } = this.computeTotals(dto.items, dto.taxRate);

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
    if (dto.status) data.status = dto.status;

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

  private computeTotals(
    items: InvoiceItemDto[],
    taxRateOverride?: number,
  ): { subtotal: number; taxRate: number; taxAmount: number; total: number } {
    const subtotal = items.reduce((sum, item) => sum + item.qty * item.price, 0);
    const taxRate = taxRateOverride ?? 22;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    return { subtotal, taxRate, taxAmount, total };
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
