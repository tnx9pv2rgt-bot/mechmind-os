'use client';

import React from 'react';
import { TenantPrintInfo } from './printable-document';

interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  total: number;
}

interface InvoicePrintData {
  number: string;
  issueDate: string;
  dueDate?: string;
  customerName: string;
  customerAddress?: string;
  customerVat?: string;
  customerFiscalCode?: string;
  customerSdi?: string;
  customerPec?: string;
  items: InvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  bolloAmount?: number;
  total: number;
  paymentMethod?: string;
  iban?: string;
  notes?: string;
  fiscalNotes?: string;
}

interface InvoicePrintProps {
  invoice: InvoicePrintData;
  tenant: TenantPrintInfo;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Contanti',
  BANK_TRANSFER: 'Bonifico Bancario',
  CARD: 'Carta di Credito/Debito',
  CHECK: 'Assegno',
  RIBA: 'RiBa',
  SCALAPAY: 'Scalapay',
};

export function InvoicePrint({ invoice, tenant }: InvoicePrintProps) {
  // Compute IVA breakdown
  const ivaBreakdown: Record<number, { base: number; tax: number }> = {};
  for (const item of invoice.items) {
    const rate = item.vatRate ?? 22;
    if (!ivaBreakdown[rate]) ivaBreakdown[rate] = { base: 0, tax: 0 };
    const lineTotal = item.quantity * item.unitPrice;
    ivaBreakdown[rate].base += lineTotal;
    ivaBreakdown[rate].tax += lineTotal * (rate / 100);
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .invoice-print-container,
          .invoice-print-container * {
            visibility: visible;
          }
          .invoice-print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            min-height: 297mm;
            padding: 15mm 20mm;
            font-size: 10pt;
            line-height: 1.4;
            color: #000;
            background: #fff;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>

      <div className="invoice-print-container bg-[var(--surface-secondary)] text-[var(--text-primary)] print:block hidden">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-[var(--border-strong)] pb-4 mb-6">
          <div>
            {tenant.logoUrl && (
              <img src={tenant.logoUrl} alt="Logo" className="mb-2" style={{ maxHeight: '50px' }} />
            )}
            <h2 className="text-lg font-bold">{tenant.ragioneSociale}</h2>
            {tenant.address && (
              <p className="text-xs text-[var(--text-secondary)]">
                {tenant.address}
                {tenant.postalCode && `, ${tenant.postalCode}`}
                {tenant.city && ` ${tenant.city}`}
                {tenant.province && ` (${tenant.province})`}
              </p>
            )}
            {tenant.partitaIva && (
              <p className="text-xs text-[var(--text-secondary)]">P.IVA: {tenant.partitaIva}</p>
            )}
            {tenant.codiceFiscale && (
              <p className="text-xs text-[var(--text-secondary)]">C.F.: {tenant.codiceFiscale}</p>
            )}
            {tenant.sdiCode && (
              <p className="text-xs text-[var(--text-secondary)]">SDI: {tenant.sdiCode}</p>
            )}
            {tenant.pecEmail && (
              <p className="text-xs text-[var(--text-secondary)]">PEC: {tenant.pecEmail}</p>
            )}
            {tenant.phone && (
              <p className="text-xs text-[var(--text-secondary)]">Tel: {tenant.phone}</p>
            )}
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold mb-1">FATTURA</h1>
            <p className="text-sm">N. {invoice.number}</p>
            <p className="text-sm">Data: {formatDate(invoice.issueDate)}</p>
            {invoice.dueDate && (
              <p className="text-sm">Scadenza: {formatDate(invoice.dueDate)}</p>
            )}
          </div>
        </div>

        {/* Customer */}
        <div className="mb-6 p-3 border border-[var(--border-default)] rounded">
          <p className="text-xs font-semibold text-[var(--text-tertiary)] mb-1 uppercase">Destinatario</p>
          <p className="font-bold">{invoice.customerName}</p>
          {invoice.customerAddress && (
            <p className="text-sm">{invoice.customerAddress}</p>
          )}
          {invoice.customerVat && (
            <p className="text-sm">P.IVA: {invoice.customerVat}</p>
          )}
          {invoice.customerFiscalCode && (
            <p className="text-sm">C.F.: {invoice.customerFiscalCode}</p>
          )}
          {invoice.customerSdi && (
            <p className="text-sm">SDI: {invoice.customerSdi}</p>
          )}
          {invoice.customerPec && (
            <p className="text-sm">PEC: {invoice.customerPec}</p>
          )}
        </div>

        {/* Line Items Table */}
        <table className="w-full border-collapse mb-6">
          <thead>
            <tr className="bg-[var(--surface-secondary)]">
              <th className="border border-[var(--border-default)] px-3 py-2 text-left text-xs font-semibold uppercase">
                Descrizione
              </th>
              <th className="border border-[var(--border-default)] px-3 py-2 text-right text-xs font-semibold uppercase w-16">
                Qta
              </th>
              <th className="border border-[var(--border-default)] px-3 py-2 text-right text-xs font-semibold uppercase w-24">
                Prezzo Unit.
              </th>
              <th className="border border-[var(--border-default)] px-3 py-2 text-right text-xs font-semibold uppercase w-16">
                IVA %
              </th>
              <th className="border border-[var(--border-default)] px-3 py-2 text-right text-xs font-semibold uppercase w-24">
                Totale
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map(item => (
              <tr key={item.id} className="break-inside-avoid">
                <td className="border border-[var(--border-default)] px-3 py-2 text-sm">
                  {item.description}
                </td>
                <td className="border border-[var(--border-default)] px-3 py-2 text-sm text-right">
                  {item.quantity}
                </td>
                <td className="border border-[var(--border-default)] px-3 py-2 text-sm text-right">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="border border-[var(--border-default)] px-3 py-2 text-sm text-right">
                  {item.vatRate ?? 22}%
                </td>
                <td className="border border-[var(--border-default)] px-3 py-2 text-sm text-right font-medium">
                  {formatCurrency(item.total || item.quantity * item.unitPrice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-72">
            <div className="flex justify-between py-1 text-sm">
              <span>Imponibile:</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {Object.entries(ivaBreakdown).map(([rate, data]) => (
              <div key={rate} className="flex justify-between py-1 text-sm">
                <span>IVA {rate}% (su {formatCurrency(data.base)}):</span>
                <span>{formatCurrency(data.tax)}</span>
              </div>
            ))}
            {invoice.bolloAmount && invoice.bolloAmount > 0 && (
              <div className="flex justify-between py-1 text-sm">
                <span>Bollo:</span>
                <span>{formatCurrency(invoice.bolloAmount)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-t-2 border-[var(--border-strong)] mt-2 font-bold text-base">
              <span>TOTALE:</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        {(invoice.paymentMethod || invoice.iban) && (
          <div className="mb-6 p-3 border border-[var(--border-default)] rounded">
            <p className="text-xs font-semibold text-[var(--text-tertiary)] mb-1 uppercase">
              Modalita di Pagamento
            </p>
            {invoice.paymentMethod && (
              <p className="text-sm">
                {paymentMethodLabels[invoice.paymentMethod] || invoice.paymentMethod}
              </p>
            )}
            {invoice.iban && (
              <p className="text-sm">IBAN: {invoice.iban}</p>
            )}
            {invoice.dueDate && (
              <p className="text-sm">Scadenza pagamento: {formatDate(invoice.dueDate)}</p>
            )}
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-[var(--text-tertiary)] mb-1 uppercase">Note</p>
            <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 px-[20mm] pb-[10mm]">
          <div className="border-t border-[var(--border-default)] pt-3 text-center">
            {invoice.fiscalNotes && (
              <p className="text-[8pt] text-[var(--text-secondary)] mb-1">{invoice.fiscalNotes}</p>
            )}
            <p className="text-[7pt] text-[var(--text-tertiary)]">
              {tenant.ragioneSociale}
              {tenant.partitaIva && ` - P.IVA ${tenant.partitaIva}`}
              {tenant.codiceFiscale && ` - C.F. ${tenant.codiceFiscale}`}
              {tenant.address && ` - ${tenant.address}, ${tenant.city}`}
              {tenant.sdiCode && ` - SDI: ${tenant.sdiCode}`}
              {tenant.pecEmail && ` - PEC: ${tenant.pecEmail}`}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
