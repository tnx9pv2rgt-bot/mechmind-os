'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import {
  FileText,
  Download,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Loader2,
  SplitSquareHorizontal,
} from 'lucide-react';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface PortalInvoice {
  id: string;
  number: string;
  status: string;
  createdAt: string;
  dueDate: string | null;
  shopName: string;
  customerName: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  paymentUrl: string | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Bozza', color: 'bg-[var(--surface-secondary)]0' },
  SENT: { label: 'Da pagare', color: 'bg-[var(--status-warning)]' },
  PAID: { label: 'Pagata', color: 'bg-[var(--status-success)]' },
  OVERDUE: { label: 'Scaduta', color: 'bg-[var(--status-error)]' },
  CANCELLED: { label: 'Annullata', color: 'bg-[var(--surface-hover)]' },
};

function mapInvoice(json: Record<string, unknown>): PortalInvoice {
  const d = (json as { data?: Record<string, unknown> }).data || json;
  return {
    id: (d.id as string) || '',
    number: (d.number as string) || (d.invoiceNumber as string) || '',
    status: (d.status as string) || 'DRAFT',
    createdAt: (d.createdAt as string) || '',
    dueDate: (d.dueDate as string) || null,
    shopName: (d.shopName as string) || '',
    customerName: (d.customerName as string) || '',
    items: (d.items as InvoiceItem[]) || [],
    subtotal: Number(d.subtotal || 0),
    taxRate: Number(d.taxRate || 22),
    taxAmount: Number(d.taxAmount || 0),
    total: Number(d.total || 0),
    notes: (d.notes as string) || null,
    paymentUrl: (d.paymentUrl as string) || null,
  };
}

export default function PortalInvoiceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [bnplLoading, setBnplLoading] = useState(false);
  const [bnplError, setBnplError] = useState<string | null>(null);

  const {
    data: rawData,
    error: fetchError,
    isLoading,
    mutate,
  } = useSWR<Record<string, unknown>>(`/api/portal/invoices/${id}`, fetcher);

  const invoice = rawData ? mapInvoice(rawData) : null;

  const handleBnpl = useCallback(async () => {
    setBnplLoading(true);
    setBnplError(null);
    try {
      const res = await fetch(`/api/portal/invoices/${id}/bnpl`, { method: 'POST' });
      if (!res.ok) throw new Error('Impossibile avviare il pagamento rateale');
      const data = await res.json();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch (err) {
      setBnplError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setBnplLoading(false);
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className='w-8 h-8 border-2 border-[var(--brand)] border-t-transparent rounded-full'
        />
      </div>
    );
  }

  if (fetchError || !invoice) {
    return (
      <div className='text-center py-16'>
        <AlertCircle className='h-12 w-12 text-[var(--status-error)]/40 mx-auto mb-4' />
        <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-4'>
          {fetchError ? 'Impossibile caricare la fattura' : 'Fattura non trovata'}
        </p>
        <button
          onClick={() => mutate()}
          className='text-[var(--brand)] hover:underline'
        >
          Riprova
        </button>
      </div>
    );
  }

  const st = statusLabels[invoice.status] || statusLabels.DRAFT;
  const isPaid = invoice.status === 'PAID';

  return (
    <div className='space-y-6'>
      <Breadcrumb
        items={[
          { label: 'Fatture', href: '/portal/invoices' },
          { label: invoice.number ? `Fattura ${invoice.number}` : 'Dettaglio Fattura' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className='text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
          Fattura {invoice.number}
        </h1>
        <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-1'>
          {invoice.shopName || 'Dettaglio fattura'}
        </p>
      </div>

      {/* Status & Dates */}
      <AppleCard>
        <AppleCardContent>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center'>
                <FileText className='h-5 w-5 text-[var(--brand)]' />
              </div>
              <div>
                <p className='font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                  {invoice.number}
                </p>
                <p className='text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                  Emessa il{' '}
                  {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('it-IT') : ''}
                </p>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <Badge className={`${st.color} text-[var(--text-on-brand)] text-xs`}>{st.label}</Badge>
            </div>
          </div>
          {invoice.dueDate && (
            <p className='text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-3'>
              Scadenza: {new Date(invoice.dueDate).toLocaleDateString('it-IT')}
            </p>
          )}
          {isPaid && (
            <div className='flex items-center gap-2 mt-4 p-3 rounded-xl bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)]'>
              <CheckCircle className='h-5 w-5 text-[var(--status-success)]' />
              <span className='text-sm font-medium text-[var(--status-success)] dark:text-[var(--status-success)]'>
                Questa fattura è stata pagata
              </span>
            </div>
          )}
        </AppleCardContent>
      </AppleCard>

      {/* Items */}
      <AppleCard>
        <AppleCardHeader>
          <h2 className='text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
            Dettaglio Voci
          </h2>
        </AppleCardHeader>
        <AppleCardContent>
          {(invoice.items || []).length === 0 ? (
            <div className='text-center py-8'>
              <FileText className='h-12 w-12 text-[var(--text-tertiary)] mx-auto mb-4' />
              <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Nessuna voce</p>
            </div>
          ) : (
            <div className='space-y-3'>
              {invoice.items.map(item => (
                <div
                  key={item.id}
                  className='flex items-center justify-between p-3 rounded-xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)]'
                >
                  <div>
                    <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      {item.description}
                    </p>
                    <p className='text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                      {item.quantity} x {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <p className='font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    {formatCurrency(item.total || item.quantity * item.unitPrice)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div className='mt-6 pt-4 border-t border-[var(--border-default)]/30 dark:border-[var(--border-default)] space-y-2'>
            <div className='flex justify-between text-sm'>
              <span className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Subtotale</span>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                {formatCurrency(invoice.subtotal)}
              </span>
            </div>
            <div className='flex justify-between text-sm'>
              <span className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>IVA ({invoice.taxRate}%)</span>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                {formatCurrency(invoice.taxAmount)}
              </span>
            </div>
            <div className='flex justify-between pt-2 border-t border-[var(--border-default)]/30 dark:border-[var(--border-default)]'>
              <span className='text-base font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Totale
              </span>
              <span className='text-xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                {formatCurrency(invoice.total)}
              </span>
            </div>
          </div>
        </AppleCardContent>
      </AppleCard>

      {/* Notes */}
      {invoice.notes && (
        <AppleCard>
          <AppleCardHeader>
            <h2 className='text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Note</h2>
          </AppleCardHeader>
          <AppleCardContent>
            <p className='text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] whitespace-pre-wrap'>
              {invoice.notes}
            </p>
          </AppleCardContent>
        </AppleCard>
      )}

      {/* Payment Actions */}
      <div className='flex flex-col sm:flex-row gap-3'>
        {!isPaid && (
          <>
            <div className='flex-1'>
              {invoice.paymentUrl ? (
                <AppleButton
                  fullWidth
                  className='py-4 text-base'
                  onClick={() => window.open(invoice.paymentUrl!, '_blank')}
                >
                  <CreditCard className='h-5 w-5 mr-2' />
                  Paga ora
                </AppleButton>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className='block'>
                        <AppleButton fullWidth className='py-4 text-base' disabled>
                          <CreditCard className='h-5 w-5 mr-2' />
                          Paga ora
                        </AppleButton>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Link di pagamento non disponibile</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className='flex-1'>
              <AppleButton
                fullWidth
                variant='secondary'
                className='py-4 text-base bg-[var(--brand)]/50 hover:bg-[var(--brand)] text-[var(--text-on-brand)] border-0'
                onClick={handleBnpl}
                loading={bnplLoading}
              >
                <SplitSquareHorizontal className='h-5 w-5 mr-2' />
                Paga in 3 rate
              </AppleButton>
            </div>
          </>
        )}
        <div className='flex-1'>
          <AppleButton
            fullWidth
            variant='ghost'
            className='py-4 text-base'
            onClick={() => window.open(`/api/portal/invoices/${id}/pdf`, '_blank')}
          >
            <Download className='h-5 w-5 mr-2' />
            Scarica PDF
          </AppleButton>
        </div>
      </div>

      {bnplError && (
        <div className='flex items-center gap-2 p-3 rounded-xl bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)] border border-[var(--status-error)]/30 dark:border-[var(--status-error)]/30'>
          <AlertCircle className='h-4 w-4 text-[var(--status-error)] flex-shrink-0' />
          <p className='text-xs text-[var(--status-error)] dark:text-[var(--status-error)]'>{bnplError}</p>
        </div>
      )}
    </div>
  );
}
