import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Decrypt customer PII fields embedded in invoice relations.
   * Only decrypts if encrypted fields are present (e.g. encryptedFirstName).
   */
  private decryptCustomerInInvoice<T extends { customer?: Record<string, unknown> | null }>(
    invoice: T,
  ): T {
    if (!invoice.customer) return invoice;
    const c = invoice.customer as Record<string, unknown>;

    // Only apply decryption if encrypted fields exist on the customer object
    const hasEncryptedFields = 'encryptedFirstName' in c || 'encryptedEmail' in c;
    if (!hasEncryptedFields) return invoice;

    const safeDecrypt = (val: unknown): string | null => {
      if (!val || typeof val !== 'string') return null;
      try {
        return this.encryption.decrypt(val);
      } catch {
        return '[encrypted]';
      }
    };
    return {
      ...invoice,
      customer: {
        ...c,
        firstName: safeDecrypt(c.encryptedFirstName),
        lastName: safeDecrypt(c.encryptedLastName),
        email: safeDecrypt(c.encryptedEmail),
        phone: safeDecrypt(c.encryptedPhone),
      },
    };
  }

  async findAll(
    tenantId: string,
    filters?: InvoiceFilters,
    page = 1,
    limit = 20,
  ): Promise<{
    data: unknown[];
    meta: { total: number; page: number; limit: number; pages: number };
  }> {
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
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices.map(inv => this.decryptCustomerInInvoice(inv)),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { customer: true, invoiceItems: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with id ${id} not found`);
    }

    return this.decryptCustomerInInvoice(invoice);
  }

  async create(tenantId: string, dto: CreateInvoiceDto) {
    const { subtotal, taxRate, taxAmount, total, stampDuty, stampDutyAmount } = this.computeTotals(
      dto.items,
      dto.taxRate,
    );

    // Ritenuta d'acconto calculation
    let ritenutaAmount: number | undefined;
    if (dto.ritenutaRate && dto.ritenutaRate > 0) {
      ritenutaAmount = Math.round(subtotal * dto.ritenutaRate) / 100;
    }

    // totalDue = total - ritenuta (netto a pagare)
    const totalDue = ritenutaAmount != null ? total - ritenutaAmount : total;

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
          total: new Decimal(totalDue.toFixed(2)),
          stampDuty,
          stampDutyAmount:
            stampDutyAmount > 0 ? new Decimal(stampDutyAmount.toFixed(2)) : undefined,
          notes: dto.notes ?? null,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          bookingId: dto.bookingId ?? null,
          workOrderId: dto.workOrderId ?? null,
          operationDate: dto.operationDate ? new Date(dto.operationDate) : null,
          ritenutaType: dto.ritenutaType ?? null,
          ritenutaRate: dto.ritenutaRate != null ? new Decimal(dto.ritenutaRate.toFixed(2)) : null,
          ritenutaAmount: ritenutaAmount != null ? new Decimal(ritenutaAmount.toFixed(2)) : null,
          ritenutaCausale: dto.ritenutaCausale ?? null,
        },
        include: { customer: true },
      });

      this.logger.log(`Invoice ${invoiceNumber} created for tenant ${tenantId}`);
      return this.decryptCustomerInInvoice(invoice);
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

    await this.prisma.invoice.updateMany({
      where: { id, tenantId },
      data,
    });

    const updated = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { customer: true },
    });

    return updated ? this.decryptCustomerInInvoice(updated) : updated;
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.findOne(tenantId, id);

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT invoices can be deleted');
    }

    await this.prisma.invoice.updateMany({
      where: { id, tenantId },
      data: { deletedAt: new Date(), status: 'CANCELLED' },
    });
    this.logger.log(`Invoice ${existing.invoiceNumber} soft-deleted for tenant ${tenantId}`);
  }

  async send(tenantId: string, id: string) {
    const existing = await this.findOne(tenantId, id);

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT invoices can be sent');
    }

    await this.prisma.invoice.updateMany({
      where: { id, tenantId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { customer: true },
    });

    this.logger.log(`Invoice ${existing.invoiceNumber} sent for tenant ${tenantId}`);
    return invoice ? this.decryptCustomerInInvoice(invoice) : invoice;
  }

  async markPaid(tenantId: string, id: string) {
    const existing = await this.findOne(tenantId, id);

    if (existing.status === 'PAID') {
      throw new BadRequestException('Invoice is already paid');
    }
    if (existing.status === 'CANCELLED') {
      throw new BadRequestException('Cannot mark a cancelled invoice as paid');
    }

    await this.prisma.invoice.updateMany({
      where: { id, tenantId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { customer: true },
    });

    this.logger.log(`Invoice ${existing.invoiceNumber} marked as paid for tenant ${tenantId}`);
    return invoice ? this.decryptCustomerInInvoice(invoice) : invoice;
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
      include: { customer: true, invoiceItems: true },
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
        // Build items snapshot from normalized InvoiceItem relation
        const itemsSnapshot = invoice.invoiceItems.map(i => ({
          description: i.description,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          vatRate: Number(i.vatRate),
          total: Number(i.total),
        }));
        const creditNote = await tx.invoice.create({
          data: {
            tenantId,
            customerId: invoice.customerId,
            invoiceNumber: creditNoteNumber,
            items: itemsSnapshot.length > 0 ? itemsSnapshot : (invoice.items as object),
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
   * Mark all SENT invoices past their due date as OVERDUE.
   * Runs across all tenants (designed for cron usage).
   * Returns count of updated invoices.
   */
  async markOverdueInvoices(): Promise<number> {
    const now = new Date();

    const result = await this.prisma.invoice.updateMany({
      where: {
        status: 'SENT',
        dueDate: { lt: now },
      },
      data: {
        status: 'OVERDUE',
      },
    });

    if (result.count > 0) {
      this.logger.log(`Marked ${result.count} invoices as OVERDUE`);
    }

    return result.count;
  }

  /**
   * Export invoices in CSV format for Italian accountant compatibility.
   * Uses semicolon separator and UTF-8 BOM for Excel.
   */
  async exportCsv(tenantId: string, from: Date, to: Date): Promise<string> {
    // Internal: bounded by date range (export use case, not paginated API)
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      include: { customer: true },
      orderBy: { createdAt: 'asc' },
    });

    const statusMap: Record<string, string> = {
      DRAFT: 'Bozza',
      SENT: 'Inviata',
      PAID: 'Pagata',
      OVERDUE: 'Scaduta',
      CANCELLED: 'Annullata',
      REFUNDED: 'Rimborsata',
      PARTIALLY_REFUNDED: 'Parzialmente rimborsata',
    };

    const header =
      'Numero;Data;Cliente;CF/P.IVA;Imponibile;IVA;Totale;Stato;Data Pagamento;Metodo Pagamento';

    const rows = invoices.map(invoice => {
      const customer = invoice.customer;
      const firstName = customer?.encryptedFirstName
        ? this.encryption.decrypt(customer.encryptedFirstName)
        : '';
      const lastName = customer?.encryptedLastName
        ? this.encryption.decrypt(customer.encryptedLastName)
        : '';
      const clientName = `${firstName} ${lastName}`.trim();

      const fiscalId = customer?.partitaIva ?? customer?.codiceFiscale ?? '';

      const invoiceDate = invoice.createdAt ? invoice.createdAt.toISOString().split('T')[0] : '';
      const paidDate = invoice.paidAt ? invoice.paidAt.toISOString().split('T')[0] : '';

      const status = statusMap[invoice.status] ?? invoice.status;

      return [
        invoice.invoiceNumber,
        invoiceDate,
        clientName,
        fiscalId,
        Number(invoice.subtotal).toFixed(2),
        Number(invoice.taxAmount).toFixed(2),
        Number(invoice.total).toFixed(2),
        status,
        paidDate,
        invoice.paymentMethod ?? '',
      ].join(';');
    });

    const bom = '\uFEFF';
    return bom + [header, ...rows].join('\n');
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
