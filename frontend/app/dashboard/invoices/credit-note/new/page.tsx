'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { motion } from 'framer-motion';
import {
  AppleCard,
  AppleCardContent,
  AppleCardHeader,
} from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  ReceiptText,
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';

interface OriginalItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  total: number;
}

interface OriginalInvoice {
  id: string;
  number: string;
  customerName: string;
  items: OriginalItem[];
  total: number;
}

const REASONS = [
  { value: 'RESO_MERCE', label: 'Reso merce' },
  { value: 'SCONTO_SUCCESSIVO', label: 'Sconto successivo' },
  { value: 'ERRORE_FATTURAZIONE', label: 'Errore fatturazione' },
  { value: 'ALTRO', label: 'Altro' },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
};

export default function CreditNotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get('invoiceId');

  const { data: rawData, isLoading, error: fetchError } = useSWR(
    invoiceId ? `/api/invoices/${invoiceId}` : null,
    fetcher,
  );

  const invoice: OriginalInvoice | null = (() => {
    if (!rawData) return null;
    return (rawData as { data?: OriginalInvoice }).data || (rawData as OriginalInvoice);
  })();

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState('RESO_MERCE');
  const [reasonDetail, setReasonDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Auto-select all items when invoice loads
  useEffect(() => {
    if (invoice?.items) {
      setSelectedItems(new Set(invoice.items.map(i => i.id)));
    }
  }, [invoice]);

  const toggleItem = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const creditAmount = useMemo(() => {
    if (!invoice) return 0;
    return invoice.items
      .filter(i => selectedItems.has(i.id))
      .reduce((sum, i) => sum + (i.total || i.quantity * i.unitPrice), 0);
  }, [invoice, selectedItems]);

  const handleSubmit = async () => {
    if (selectedItems.size === 0) {
      setError('Seleziona almeno una voce da accreditare');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/invoices/credit-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalInvoiceId: invoiceId,
          itemIds: Array.from(selectedItems),
          reason,
          reasonDetail: reasonDetail || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error?.message || 'Errore nella creazione della nota di credito');
      }

      const data = await res.json();
      const newId = data.data?.id || data.id;
      toast.success('Nota di credito emessa con successo');
      router.push(newId ? `/dashboard/invoices/${newId}` : '/dashboard/invoices');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore nella creazione';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[60vh]'>
        <Loader2 className='h-8 w-8 animate-spin text-apple-blue' />
      </div>
    );
  }

  if (fetchError || !invoice) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] text-center p-8'>
        <AlertCircle className='h-12 w-12 text-apple-red/40 mb-4' />
        <p className='text-body text-apple-gray dark:text-[var(--text-secondary)] mb-4'>
          {!invoiceId ? 'Nessuna fattura di riferimento specificata' : 'Fattura non trovata'}
        </p>
        <AppleButton
          variant='ghost'
          icon={<ArrowLeft className='w-4 h-4' />}
          onClick={() => router.push('/dashboard/invoices')}
        >
          Torna alle Fatture
        </AppleButton>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <header>
        <div className='px-8 py-5'>
          <Breadcrumb
            items={[
              { label: 'Fatture', href: '/dashboard/invoices' },
              { label: invoice.number, href: `/dashboard/invoices/${invoiceId}` },
              { label: 'Nota di Credito' },
            ]}
          />
          <div className='flex items-center justify-between mt-2'>
            <div>
              <h1 className='text-headline text-apple-dark dark:text-[var(--text-primary)]'>
                Nota di Credito
              </h1>
              <p className='text-body text-apple-gray dark:text-[var(--text-secondary)] mt-1'>
                Rif. Fattura {invoice.number} - {invoice.customerName}
              </p>
            </div>
            <div className='w-12 h-12 rounded-2xl bg-apple-red/10 flex items-center justify-center'>
              <ReceiptText className='w-6 h-6 text-apple-red' />
            </div>
          </div>
        </div>
      </header>

      <motion.div
        className='p-8 max-w-4xl mx-auto space-y-6'
        initial='hidden'
        animate='visible'
        variants={containerVariants}
      >
        {error && (
          <div className='flex items-center gap-3 p-4 rounded-2xl bg-apple-red/5 dark:bg-apple-red/10 border border-apple-red/20'>
            <AlertCircle className='h-5 w-5 text-apple-red flex-shrink-0' />
            <p className='text-body text-apple-red'>{error}</p>
          </div>
        )}

        {/* Items selection */}
        <motion.div variants={cardVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                Voci da Accreditare
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              <div className='space-y-3'>
                {invoice.items.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl transition-colors cursor-pointer ${
                      selectedItems.has(item.id)
                        ? 'bg-apple-blue/5 dark:bg-[var(--surface-active)] border border-apple-blue/20 dark:border-[var(--border-default)]'
                        : 'bg-apple-light-gray/30 dark:bg-[var(--surface-hover)] border border-transparent'
                    }`}
                    onClick={() => toggleItem(item.id)}
                  >
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={() => toggleItem(item.id)}
                    />
                    <div className='flex-1'>
                      <p className='text-body font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                        {item.description}
                      </p>
                      <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                        {item.quantity} x {formatCurrency(item.unitPrice)} — IVA{' '}
                        {item.vatRate ?? 22}%
                      </p>
                    </div>
                    <p className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                      {formatCurrency(item.total || item.quantity * item.unitPrice)}
                    </p>
                  </div>
                ))}
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Reason */}
        <motion.div variants={cardVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                Motivo
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              <div className='space-y-4'>
                <div>
                  <label className='mb-1.5 block text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                    Causale
                  </label>
                  <select
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className='h-10 w-full rounded-md border border-apple-border dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] px-3 text-body text-apple-dark dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue appearance-none cursor-pointer'
                  >
                    {REASONS.map(r => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='mb-1.5 block text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                    Dettaglio
                  </label>
                  <textarea
                    value={reasonDetail}
                    onChange={e => setReasonDetail(e.target.value)}
                    rows={3}
                    placeholder='Descrivi il motivo della nota di credito...'
                    className='w-full rounded-xl border border-apple-border dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] px-4 py-3 text-body text-apple-dark dark:text-[var(--text-primary)] placeholder:text-apple-gray dark:placeholder:text-[var(--text-secondary)] outline-none focus:ring-2 focus:ring-apple-blue resize-none'
                  />
                </div>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Summary */}
        <motion.div variants={cardVariants}>
          <AppleCard hover={false}>
            <AppleCardContent>
              <div className='flex justify-between items-center'>
                <div>
                  <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                    {selectedItems.size} voci selezionate su {invoice.items.length}
                  </p>
                </div>
                <div className='text-right'>
                  <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                    Importo Nota di Credito
                  </p>
                  <p className='text-title-1 font-bold text-apple-red'>
                    -{formatCurrency(creditAmount)}
                  </p>
                </div>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Actions */}
        <div className='flex items-center justify-between'>
          <AppleButton
            variant='ghost'
            icon={<ArrowLeft className='h-4 w-4' />}
            onClick={() => router.back()}
          >
            Annulla
          </AppleButton>
          <AppleButton
            onClick={handleSubmit}
            loading={submitting}
            disabled={submitting || selectedItems.size === 0}
            icon={<ReceiptText className='h-4 w-4' />}
          >
            Emetti Nota di Credito
          </AppleButton>
        </div>
      </motion.div>
    </div>
  );
}
