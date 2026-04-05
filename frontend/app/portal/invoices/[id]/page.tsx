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
  DRAFT: { label: 'Bozza', color: 'bg-gray-500' },
  SENT: { label: 'Da pagare', color: 'bg-apple-orange' },
  PAID: { label: 'Pagata', color: 'bg-green-500' },
  OVERDUE: { label: 'Scaduta', color: 'bg-red-500' },
  CANCELLED: { label: 'Annullata', color: 'bg-gray-400' },
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
          className='w-8 h-8 border-2 border-apple-blue border-t-transparent rounded-full'
        />
      </div>
    );
  }

  if (fetchError || !invoice) {
    return (
      <div className='text-center py-16'>
        <AlertCircle className='h-12 w-12 text-apple-red/40 mx-auto mb-4' />
        <p className='text-apple-gray dark:text-[var(--text-secondary)] mb-4'>
          {fetchError ? 'Impossibile caricare la fattura' : 'Fattura non trovata'}
        </p>
        <button
          onClick={() => mutate()}
          className='text-apple-blue hover:underline'
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
        <h1 className='text-2xl font-bold text-apple-dark dark:text-[var(--text-primary)]'>
          Fattura {invoice.number}
        </h1>
        <p className='text-apple-gray dark:text-[var(--text-secondary)] mt-1'>
          {invoice.shopName || 'Dettaglio fattura'}
        </p>
      </div>

      {/* Status & Dates */}
      <AppleCard>
        <AppleCardContent>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-xl bg-apple-blue/10 flex items-center justify-center'>
                <FileText className='h-5 w-5 text-apple-blue' />
              </div>
              <div>
                <p className='font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                  {invoice.number}
                </p>
                <p className='text-sm text-apple-gray dark:text-[var(--text-secondary)]'>
                  Emessa il{' '}
                  {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('it-IT') : ''}
                </p>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <Badge className={`${st.color} text-white text-xs`}>{st.label}</Badge>
            </div>
          </div>
          {invoice.dueDate && (
            <p className='text-sm text-apple-gray dark:text-[var(--text-secondary)] mt-3'>
              Scadenza: {new Date(invoice.dueDate).toLocaleDateString('it-IT')}
            </p>
          )}
          {isPaid && (
            <div className='flex items-center gap-2 mt-4 p-3 rounded-xl bg-green-50 dark:bg-green-900/20'>
              <CheckCircle className='h-5 w-5 text-green-500' />
              <span className='text-sm font-medium text-green-700 dark:text-green-300'>
                Questa fattura è stata pagata
              </span>
            </div>
          )}
        </AppleCardContent>
      </AppleCard>

      {/* Items */}
      <AppleCard>
        <AppleCardHeader>
          <h2 className='text-lg font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
            Dettaglio Voci
          </h2>
        </AppleCardHeader>
        <AppleCardContent>
          {(invoice.items || []).length === 0 ? (
            <div className='text-center py-8'>
              <FileText className='h-12 w-12 text-apple-gray mx-auto mb-4' />
              <p className='text-apple-gray dark:text-[var(--text-secondary)]'>Nessuna voce</p>
            </div>
          ) : (
            <div className='space-y-3'>
              {invoice.items.map(item => (
                <div
                  key={item.id}
                  className='flex items-center justify-between p-3 rounded-xl bg-apple-light-gray/30 dark:bg-[var(--surface-hover)]'
                >
                  <div>
                    <p className='font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                      {item.description}
                    </p>
                    <p className='text-sm text-apple-gray dark:text-[var(--text-secondary)]'>
                      {item.quantity} x {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <p className='font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                    {formatCurrency(item.total || item.quantity * item.unitPrice)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div className='mt-6 pt-4 border-t border-apple-border/30 dark:border-[var(--border-default)] space-y-2'>
            <div className='flex justify-between text-sm'>
              <span className='text-apple-gray dark:text-[var(--text-secondary)]'>Subtotale</span>
              <span className='font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                {formatCurrency(invoice.subtotal)}
              </span>
            </div>
            <div className='flex justify-between text-sm'>
              <span className='text-apple-gray dark:text-[var(--text-secondary)]'>IVA ({invoice.taxRate}%)</span>
              <span className='font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                {formatCurrency(invoice.taxAmount)}
              </span>
            </div>
            <div className='flex justify-between pt-2 border-t border-apple-border/30 dark:border-[var(--border-default)]'>
              <span className='text-base font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                Totale
              </span>
              <span className='text-xl font-bold text-apple-dark dark:text-[var(--text-primary)]'>
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
            <h2 className='text-lg font-semibold text-apple-dark dark:text-[var(--text-primary)]'>Note</h2>
          </AppleCardHeader>
          <AppleCardContent>
            <p className='text-sm text-apple-gray dark:text-[var(--text-secondary)] whitespace-pre-wrap'>
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
                className='py-4 text-base bg-purple-500 hover:bg-purple-600 text-white border-0'
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
        <div className='flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30'>
          <AlertCircle className='h-4 w-4 text-red-500 flex-shrink-0' />
          <p className='text-xs text-red-700 dark:text-red-300'>{bnplError}</p>
        </div>
      )}
    </div>
  );
}
