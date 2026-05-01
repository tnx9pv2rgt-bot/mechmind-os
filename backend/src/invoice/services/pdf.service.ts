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
  naturaIva?: string | null;
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

    // Determine if operationDate differs from createdAt
    const operationDateStr = invoice.operationDate
      ? invoice.operationDate.toISOString().split('T')[0]
      : undefined;
    const createdDateStr = invoice.createdAt.toISOString().split('T')[0];
    const showOperationDate = operationDateStr && operationDateStr !== createdDateStr;

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
      invoiceDate: createdDateStr,
      operationDate: showOperationDate ? operationDateStr : undefined,
      documentType: invoice.documentType === 'NOTA_CREDITO' ? 'Nota di Credito' : 'Fattura',
      lines,
      vatSummary,
      subtotal: Number(invoice.subtotal),
      taxAmount: Number(invoice.taxAmount),
      total: Number(invoice.total),
      stampDuty: invoice.stampDuty,
      ritenutaRate: invoice.ritenutaRate ? Number(invoice.ritenutaRate) : undefined,
      ritenutaAmount: invoice.ritenutaAmount ? Number(invoice.ritenutaAmount) : undefined,
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
      naturaIva?: string | null;
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
        naturaIva: item.naturaIva,
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

  async generateEstimatePdf(estimateId: string, tenantId: string): Promise<Buffer> {
    const estimate = await this.prisma.estimate.findFirst({
      where: { id: estimateId, tenantId },
      include: { lines: { orderBy: { position: 'asc' } } },
    });

    if (!estimate) {
      throw new NotFoundException(`Estimate ${estimateId} not found`);
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    const customer = await this.prisma.customer.findFirst({
      where: { id: estimate.customerId, tenantId },
    });

    const vehicle = estimate.vehicleId
      ? await this.prisma.vehicle.findUnique({ where: { id: estimate.vehicleId } })
      : null;

    const settings = (tenant.settings ?? {}) as Record<string, string>;
    const customerName = customer?.encryptedFirstName
      ? this.encryption.decrypt(customer.encryptedFirstName)
      : '';
    const customerSurname = customer?.encryptedLastName
      ? this.encryption.decrypt(customer.encryptedLastName)
      : '';

    const esc = (s: string): string =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const fmt = (n: number): string => n.toFixed(2).replace('.', ',');

    const lineRows = estimate.lines
      .map(
        (
          line: {
            description: string;
            type: string;
            quantity: number;
            unitPriceCents: Decimal;
            vatRate: Decimal;
            totalCents: Decimal;
          },
          i: number,
        ) => `<tr>
          <td>${i + 1}</td>
          <td>${esc(line.description)}</td>
          <td>${line.type}</td>
          <td class="right">${line.quantity}</td>
          <td class="right">&euro; ${fmt(Number(line.unitPriceCents) / 100)}</td>
          <td class="right">${fmt(Number(line.vatRate) * 100)}%</td>
          <td class="right">&euro; ${fmt(Number(line.totalCents) / 100)}</td>
        </tr>`,
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><title>Preventivo ${esc(estimate.estimateNumber)}</title>
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #333; margin: 40px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
  .header-left { font-size: 18px; font-weight: bold; }
  .doc-info { background: #f5f5f5; padding: 12px; border-radius: 4px; margin-bottom: 20px; }
  .doc-info h2 { margin: 0 0 8px; font-size: 16px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #f5f5f5; text-align: left; padding: 6px 8px; border-bottom: 2px solid #ddd; font-size: 10px; text-transform: uppercase; }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; }
  .right { text-align: right; }
  .totals { margin-left: auto; width: 280px; }
  .totals .grand-total { font-size: 14px; font-weight: bold; border-top: 2px solid #333; }
  .signature { margin-top: 40px; border-top: 1px solid #333; width: 250px; padding-top: 8px; }
  .footer { font-size: 9px; color: #999; border-top: 1px solid #ddd; padding-top: 8px; text-align: center; margin-top: 40px; }
</style></head>
<body>
  <div class="header">
    <div class="header-left">${esc(settings.ragioneSociale ?? tenant.name)}</div>
    <div style="text-align:right">
      P.IVA: ${esc(settings.partitaIva ?? '')}<br>
      ${esc([settings.indirizzo, settings.cap, settings.comune].filter(Boolean).join(' '))}
    </div>
  </div>
  <div class="doc-info">
    <h2>PREVENTIVO n. ${esc(estimate.estimateNumber)}</h2>
    <span>Data: ${estimate.createdAt.toISOString().split('T')[0]}</span>
    ${estimate.validUntil ? `<span style="margin-left:20px">Valido fino al: ${estimate.validUntil.toISOString().split('T')[0]}</span>` : ''}
  </div>
  <div style="margin-bottom:20px">
    <strong>Cliente:</strong> ${esc(`${customerName} ${customerSurname}`.trim())}<br>
    ${customer?.partitaIva ? `P.IVA: ${esc(customer.partitaIva)}<br>` : ''}
    ${vehicle ? `<strong>Veicolo:</strong> ${esc(vehicle.make)} ${esc(vehicle.model)} — ${esc(vehicle.licensePlate)}<br>` : ''}
  </div>
  <table>
    <thead><tr><th>#</th><th>Descrizione</th><th>Tipo</th><th class="right">Qt&agrave;</th><th class="right">Prezzo</th><th class="right">IVA</th><th class="right">Totale</th></tr></thead>
    <tbody>${lineRows}</tbody>
  </table>
  <table class="totals">
    <tr><td>Imponibile</td><td class="right">&euro; ${fmt(Number(estimate.subtotalCents) / 100)}</td></tr>
    <tr><td>IVA</td><td class="right">&euro; ${fmt(Number(estimate.vatCents) / 100)}</td></tr>
    ${Number(estimate.discountCents) > 0 ? `<tr><td>Sconto</td><td class="right">- &euro; ${fmt(Number(estimate.discountCents) / 100)}</td></tr>` : ''}
    <tr class="grand-total"><td>Totale</td><td class="right">&euro; ${fmt(Number(estimate.totalCents) / 100)}</td></tr>
  </table>
  ${estimate.notes ? `<p><em>${esc(estimate.notes)}</em></p>` : ''}
  <div class="signature">Firma per accettazione</div>
  <div class="footer">Documento generato elettronicamente - ${esc(settings.ragioneSociale ?? tenant.name)}</div>
</body></html>`;

    return Buffer.from(html, 'utf-8');
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  async generateWorkOrderPdf(workOrderId: string, tenantId: string): Promise<Buffer> {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, tenantId },
      include: { vehicle: true },
    });

    if (!wo) {
      throw new NotFoundException(`Work order ${workOrderId} not found`);
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    const settings = (tenant.settings ?? {}) as Record<string, string>;
    const esc = (s: string): string =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const fmt = (n: number): string => n.toFixed(2).replace('.', ',');

    const laborRows =
      (wo.laborItems as Array<Record<string, unknown>> | null)
        ?.map(
          (item, i) => `<tr>
          <td>${i + 1}</td>
          <td>${esc(String(item.description ?? ''))}</td>
          <td class="right">${Number(item.hours ?? 0)}</td>
          <td class="right">&euro; ${fmt(Number(item.rate ?? 0))}</td>
          <td class="right">&euro; ${fmt(Number(item.total ?? 0))}</td>
        </tr>`,
        )
        ?.join('') ?? '';

    const partsRows =
      (wo.partsUsed as Array<Record<string, unknown>> | null)
        ?.map(
          (item, i) => `<tr>
          <td>${i + 1}</td>
          <td>${esc(String(item.name ?? ''))}</td>
          <td class="right">${Number(item.quantity ?? 0)}</td>
          <td class="right">&euro; ${fmt(Number(item.unitPrice ?? 0))}</td>
          <td class="right">&euro; ${fmt(Number(item.total ?? 0))}</td>
        </tr>`,
        )
        ?.join('') ?? '';

    const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><title>Ordine di Lavoro ${esc(wo.woNumber)}</title>
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #333; margin: 40px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
  .header-left { font-size: 18px; font-weight: bold; }
  .doc-info { background: #f5f5f5; padding: 12px; border-radius: 4px; margin-bottom: 20px; }
  .doc-info h2 { margin: 0 0 8px; font-size: 16px; }
  .vehicle-info { background: #fafafa; padding: 10px; border: 1px solid #eee; border-radius: 4px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #f5f5f5; text-align: left; padding: 6px 8px; border-bottom: 2px solid #ddd; font-size: 10px; text-transform: uppercase; }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; }
  .right { text-align: right; }
  .totals { margin-left: auto; width: 280px; }
  .totals .grand-total { font-size: 14px; font-weight: bold; border-top: 2px solid #333; }
  .signature { margin-top: 40px; border-top: 1px solid #333; width: 250px; padding-top: 8px; }
  .footer { font-size: 9px; color: #999; border-top: 1px solid #ddd; padding-top: 8px; text-align: center; margin-top: 40px; }
</style></head>
<body>
  <div class="header">
    <div class="header-left">${esc(settings.ragioneSociale ?? tenant.name)}</div>
    <div style="text-align:right">
      P.IVA: ${esc(settings.partitaIva ?? '')}<br>
      ${esc([settings.indirizzo, settings.cap, settings.comune].filter(Boolean).join(' '))}
    </div>
  </div>
  <div class="doc-info">
    <h2>ORDINE DI LAVORO n. ${esc(wo.woNumber)}</h2>
    <span>Data: ${wo.createdAt.toISOString().split('T')[0]}</span>
    <span style="margin-left:20px">Stato: ${esc(wo.status)}</span>
  </div>
  ${
    wo.vehicle
      ? `<div class="vehicle-info">
    <strong>Veicolo:</strong> ${esc(wo.vehicle.make)} ${esc(wo.vehicle.model)} (${esc(String(wo.vehicle.year ?? ''))})<br>
    <strong>Targa:</strong> ${esc(wo.vehicle.licensePlate)}<br>
    ${wo.vehicle.vin ? `<strong>VIN:</strong> ${esc(wo.vehicle.vin)}<br>` : ''}
    ${wo.mileageIn ? `<strong>Km ingresso:</strong> ${wo.mileageIn.toLocaleString()}` : ''}
    ${wo.mileageOut ? ` — <strong>Km uscita:</strong> ${wo.mileageOut.toLocaleString()}` : ''}
  </div>`
      : ''
  }
  ${wo.diagnosis ? `<p><strong>Diagnosi:</strong> ${esc(wo.diagnosis)}</p>` : ''}
  ${wo.customerRequest ? `<p><strong>Richiesta cliente:</strong> ${esc(wo.customerRequest)}</p>` : ''}
  ${
    laborRows
      ? `<h3>Manodopera</h3>
  <table><thead><tr><th>#</th><th>Descrizione</th><th class="right">Ore</th><th class="right">Tariffa</th><th class="right">Totale</th></tr></thead>
  <tbody>${laborRows}</tbody></table>`
      : ''
  }
  ${
    partsRows
      ? `<h3>Ricambi</h3>
  <table><thead><tr><th>#</th><th>Ricambio</th><th class="right">Qt&agrave;</th><th class="right">Prezzo</th><th class="right">Totale</th></tr></thead>
  <tbody>${partsRows}</tbody></table>`
      : ''
  }
  <table class="totals">
    ${wo.laborCost ? `<tr><td>Manodopera</td><td class="right">&euro; ${fmt(Number(wo.laborCost))}</td></tr>` : ''}
    ${wo.partsCost ? `<tr><td>Ricambi</td><td class="right">&euro; ${fmt(Number(wo.partsCost))}</td></tr>` : ''}
    ${wo.totalCost ? `<tr class="grand-total"><td>Totale</td><td class="right">&euro; ${fmt(Number(wo.totalCost))}</td></tr>` : ''}
  </table>
  <div class="signature">Firma cliente</div>
  <div class="footer">Documento generato elettronicamente - ${esc(settings.ragioneSociale ?? tenant.name)}</div>
</body></html>`;

    return Buffer.from(html, 'utf-8');
  }

  private buildVatSummary(
    lines: InvoiceLineForPdf[],
  ): Array<{ rate: number; taxable: number; tax: number; naturaIva?: string }> {
    const byKey = new Map<
      string,
      { rate: number; taxable: number; tax: number; naturaIva?: string }
    >();
    for (const line of lines) {
      const natura = line.vatRate === 0 ? (line.naturaIva ?? 'N4') : undefined;
      const key = natura ? `0_${natura}` : String(line.vatRate);
      const existing = byKey.get(key) ?? {
        rate: line.vatRate,
        taxable: 0,
        tax: 0,
        naturaIva: natura ?? undefined,
      };
      existing.taxable += line.subtotal;
      existing.tax += line.subtotal * (line.vatRate / 100);
      byKey.set(key, existing);
    }
    return Array.from(byKey.values());
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
    operationDate?: string;
    documentType: string;
    lines: InvoiceLineForPdf[];
    vatSummary: Array<{ rate: number; taxable: number; tax: number; naturaIva?: string }>;
    subtotal: number;
    taxAmount: number;
    total: number;
    stampDuty: boolean;
    ritenutaRate?: number;
    ritenutaAmount?: number;
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
          <td>${fmt(v.rate)}%${v.naturaIva ? ` (${esc(v.naturaIva)})` : ''}</td>
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
    ${data.operationDate ? `<span style="margin-left:20px">Data Operazione: ${esc(data.operationDate)}</span>` : ''}
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
    ${data.ritenutaAmount != null && data.ritenutaRate != null ? `<tr><td>Ritenuta d'acconto (${fmt(data.ritenutaRate)}%)</td><td class="right">- &euro; ${fmt(data.ritenutaAmount)}</td></tr>` : ''}
    ${data.stampDuty ? `<tr><td>Bollo virtuale</td><td class="right">&euro; 2,00</td></tr>` : ''}
    <tr class="grand-total"><td>Totale dovuto</td><td class="right">&euro; ${fmt(data.total + (data.stampDuty ? 2 : 0))}</td></tr>
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
