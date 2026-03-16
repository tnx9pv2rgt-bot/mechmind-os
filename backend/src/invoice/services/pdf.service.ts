import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { Decimal } from '@prisma/client/runtime/library';

const TAX_REGIME_LABELS: Record<string, string> = {
  ORDINARIO: 'Regime Ordinario (art. 1, DPR 633/72)',
  SEMPLIFICATO: 'Regime Semplificato (art. 18, DPR 600/73)',
  FORFETTARIO: 'Regime Forfettario (art. 1, commi 54-89, L. 190/2014)',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CONTANTI: 'Contanti',
  CARTA: 'Carta di credito/debito',
  BONIFICO: 'Bonifico bancario',
  ASSEGNO: 'Assegno',
  BNPL: 'Pagamento rateale',
};

const PAYMENT_TERMS_LABELS: Record<string, string> = {
  IMMEDIATO: 'Pagamento immediato',
  TRENTA_GIORNI: '30 giorni data fattura',
  SESSANTA_GIORNI: '60 giorni data fattura',
  FINE_MESE: 'Fine mese',
};

interface InvoiceLineForPdf {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  discount: number;
  subtotal: number;
}

@Injectable()
export class PdfService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async generateInvoicePdf(invoiceId: string, tenantId: string): Promise<Buffer> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { invoiceItems: true, customer: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with id ${invoiceId} not found`);
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    const customer = invoice.customer;
    const customerName = customer.encryptedFirstName
      ? this.encryption.decrypt(customer.encryptedFirstName)
      : '';
    const customerSurname = customer.encryptedLastName
      ? this.encryption.decrypt(customer.encryptedLastName)
      : '';

    const tenantSettings = (tenant.settings ?? {}) as Record<string, string>;
    const lines = this.getInvoiceLines(invoice.invoiceItems, invoice.items);
    const vatSummary = this.buildVatSummary(lines);

    const html = this.buildInvoiceHtml({
      tenantName: tenantSettings.ragioneSociale ?? tenant.name,
      tenantPiva: tenantSettings.partitaIva ?? '',
      tenantCf: tenantSettings.codiceFiscale ?? '',
      tenantAddress: [
        tenantSettings.indirizzo,
        tenantSettings.cap,
        tenantSettings.comune,
        tenantSettings.provincia ? `(${tenantSettings.provincia})` : '',
      ]
        .filter(Boolean)
        .join(' '),
      customerName:
        customer.customerType === 'AZIENDA'
          ? customerName || customerSurname
          : `${customerName} ${customerSurname}`.trim(),
      customerCf: customer.codiceFiscale ?? '',
      customerPiva: customer.partitaIva ?? '',
      customerAddress: [
        customer.address,
        customer.postalCode,
        customer.city,
        customer.province ? `(${customer.province})` : '',
      ]
        .filter(Boolean)
        .join(' '),
      customerSdi: customer.sdiCode ?? '',
      customerPec: customer.pecEmail ?? '',
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.createdAt.toISOString().split('T')[0],
      documentType: invoice.documentType === 'NOTA_CREDITO' ? 'Nota di Credito' : 'Fattura',
      lines,
      vatSummary,
      subtotal: Number(invoice.subtotal),
      taxAmount: Number(invoice.taxAmount),
      total: Number(invoice.total),
      stampDuty: invoice.stampDuty,
      paymentMethod: PAYMENT_METHOD_LABELS[invoice.paymentMethod ?? ''] ?? '',
      paymentTerms: PAYMENT_TERMS_LABELS[invoice.paymentTerms] ?? '',
      notes: invoice.notes ?? '',
      taxRegime: TAX_REGIME_LABELS[invoice.taxRegime] ?? '',
      dueDate: invoice.dueDate ? invoice.dueDate.toISOString().split('T')[0] : '',
    });

    return Buffer.from(html, 'utf-8');
  }

  private getInvoiceLines(
    invoiceItems: Array<{
      description: string;
      quantity: Decimal;
      unitPrice: Decimal;
      vatRate: Decimal;
      discount: Decimal;
      subtotal: Decimal;
    }>,
    legacyItems: unknown,
  ): InvoiceLineForPdf[] {
    if (invoiceItems && invoiceItems.length > 0) {
      return invoiceItems.map(item => ({
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        vatRate: Number(item.vatRate),
        discount: Number(item.discount),
        subtotal: Number(item.subtotal),
      }));
    }

    if (legacyItems && Array.isArray(legacyItems)) {
      return (legacyItems as Array<Record<string, unknown>>).map(item => {
        const qty = Number(item.quantity ?? 1);
        const price = Number(item.unitPrice ?? 0);
        const disc = Number(item.discount ?? 0);
        const sub = qty * price * (1 - disc / 100);
        return {
          description: String(item.description ?? ''),
          quantity: qty,
          unitPrice: price,
          vatRate: Number(item.vatRate ?? 22),
          discount: disc,
          subtotal: sub,
        };
      });
    }

    return [];
  }

  private buildVatSummary(
    lines: InvoiceLineForPdf[],
  ): Array<{ rate: number; taxable: number; tax: number }> {
    const byRate = new Map<number, { taxable: number; tax: number }>();
    for (const line of lines) {
      const existing = byRate.get(line.vatRate) ?? { taxable: 0, tax: 0 };
      existing.taxable += line.subtotal;
      existing.tax += line.subtotal * (line.vatRate / 100);
      byRate.set(line.vatRate, existing);
    }
    return Array.from(byRate.entries()).map(([rate, { taxable, tax }]) => ({
      rate,
      taxable,
      tax,
    }));
  }

  private buildInvoiceHtml(data: {
    tenantName: string;
    tenantPiva: string;
    tenantCf: string;
    tenantAddress: string;
    customerName: string;
    customerCf: string;
    customerPiva: string;
    customerAddress: string;
    customerSdi: string;
    customerPec: string;
    invoiceNumber: string;
    invoiceDate: string;
    documentType: string;
    lines: InvoiceLineForPdf[];
    vatSummary: Array<{ rate: number; taxable: number; tax: number }>;
    subtotal: number;
    taxAmount: number;
    total: number;
    stampDuty: boolean;
    paymentMethod: string;
    paymentTerms: string;
    notes: string;
    taxRegime: string;
    dueDate: string;
  }): string {
    const esc = (s: string): string =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const fmt = (n: number): string => n.toFixed(2).replace('.', ',');

    const itemRows = data.lines
      .map(
        (line, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${esc(line.description)}</td>
          <td class="right">${fmt(line.quantity)}</td>
          <td class="right">&euro; ${fmt(line.unitPrice)}</td>
          <td class="right">${fmt(line.vatRate)}%</td>
          <td class="right">${line.discount > 0 ? fmt(line.discount) + '%' : '-'}</td>
          <td class="right">&euro; ${fmt(line.subtotal)}</td>
        </tr>`,
      )
      .join('');

    const vatRows = data.vatSummary
      .map(
        v => `
        <tr>
          <td>${fmt(v.rate)}%</td>
          <td class="right">&euro; ${fmt(v.taxable)}</td>
          <td class="right">&euro; ${fmt(v.tax)}</td>
        </tr>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>${esc(data.documentType)} ${esc(data.invoiceNumber)}</title>
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #333; margin: 40px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
  .header-left { font-size: 18px; font-weight: bold; }
  .header-right { text-align: right; }
  .doc-info { background: #f5f5f5; padding: 12px; border-radius: 4px; margin-bottom: 20px; }
  .doc-info h2 { margin: 0 0 8px; font-size: 16px; }
  .parties { display: flex; gap: 40px; margin-bottom: 20px; }
  .party { flex: 1; }
  .party h3 { font-size: 12px; text-transform: uppercase; color: #666; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #f5f5f5; text-align: left; padding: 6px 8px; border-bottom: 2px solid #ddd; font-size: 10px; text-transform: uppercase; }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; }
  .right { text-align: right; }
  .totals { margin-left: auto; width: 280px; }
  .totals td { padding: 4px 8px; }
  .totals .grand-total { font-size: 14px; font-weight: bold; border-top: 2px solid #333; }
  .payment { background: #f9f9f9; padding: 10px; border-radius: 4px; margin-bottom: 16px; }
  .notes { font-style: italic; color: #666; margin-bottom: 16px; }
  .footer { font-size: 9px; color: #999; border-top: 1px solid #ddd; padding-top: 8px; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div class="header-left">${esc(data.tenantName)}</div>
    <div class="header-right">
      P.IVA: ${esc(data.tenantPiva)}<br>
      C.F.: ${esc(data.tenantCf)}<br>
      ${esc(data.tenantAddress)}
    </div>
  </div>

  <div class="doc-info">
    <h2>${esc(data.documentType)} n. ${esc(data.invoiceNumber)}</h2>
    <span>Data: ${esc(data.invoiceDate)}</span>
    ${data.dueDate ? `<span style="margin-left:20px">Scadenza: ${esc(data.dueDate)}</span>` : ''}
  </div>

  <div class="parties">
    <div class="party">
      <h3>Cedente/Prestatore</h3>
      <strong>${esc(data.tenantName)}</strong><br>
      P.IVA: ${esc(data.tenantPiva)}<br>
      C.F.: ${esc(data.tenantCf)}<br>
      ${esc(data.tenantAddress)}
    </div>
    <div class="party">
      <h3>Cessionario/Committente</h3>
      <strong>${esc(data.customerName)}</strong><br>
      ${data.customerPiva ? `P.IVA: ${esc(data.customerPiva)}<br>` : ''}
      ${data.customerCf ? `C.F.: ${esc(data.customerCf)}<br>` : ''}
      ${esc(data.customerAddress)}<br>
      ${data.customerSdi ? `SDI: ${esc(data.customerSdi)}` : ''}
      ${data.customerPec ? ` PEC: ${esc(data.customerPec)}` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Descrizione</th>
        <th class="right">Qt&agrave;</th>
        <th class="right">Prezzo Unit.</th>
        <th class="right">IVA</th>
        <th class="right">Sconto</th>
        <th class="right">Imponibile</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <h4>Riepilogo IVA</h4>
  <table style="width:50%">
    <thead><tr><th>Aliquota</th><th class="right">Imponibile</th><th class="right">Imposta</th></tr></thead>
    <tbody>${vatRows}</tbody>
  </table>

  <table class="totals">
    <tr><td>Imponibile</td><td class="right">&euro; ${fmt(data.subtotal)}</td></tr>
    <tr><td>IVA</td><td class="right">&euro; ${fmt(data.taxAmount)}</td></tr>
    ${data.stampDuty ? `<tr><td>Bollo virtuale</td><td class="right">&euro; 2,00</td></tr>` : ''}
    <tr class="grand-total"><td>Totale</td><td class="right">&euro; ${fmt(data.total + (data.stampDuty ? 2 : 0))}</td></tr>
  </table>

  <div class="payment">
    ${data.paymentMethod ? `<strong>Pagamento:</strong> ${esc(data.paymentMethod)}<br>` : ''}
    ${data.paymentTerms ? `<strong>Termini:</strong> ${esc(data.paymentTerms)}<br>` : ''}
    ${data.dueDate ? `<strong>Scadenza:</strong> ${esc(data.dueDate)}` : ''}
  </div>

  ${data.notes ? `<div class="notes">${esc(data.notes)}</div>` : ''}

  <div class="footer">
    ${esc(data.taxRegime)}<br>
    Documento generato elettronicamente - ${esc(data.tenantName)}
  </div>
</body>
</html>`;
  }
}
