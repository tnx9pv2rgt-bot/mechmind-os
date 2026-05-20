'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';

interface PortalPayment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  paidAt: string | null;
  createdAt: string;
}

interface BackendPaymentResponse {
  success: boolean;
  data?: PortalPayment[];
}

const statusConfig: Record<string, { color: string; label: string }> = {
  SUCCESS: { color: 'bg-[var(--status-success)]', label: 'Completato' },
  PENDING: { color: 'bg-[var(--status-warning)]', label: 'In attesa' },
  FAILED: { color: 'bg-[var(--status-error)]', label: 'Fallito' },
  REFUNDED: { color: 'bg-[var(--text-placeholder)]', label: 'Rimborsato' },
};

const methodLabels: Record<string, string> = {
  CARD: 'Carta',
  BANK_TRANSFER: 'Bonifico',
  CASH: 'Contanti',
  STRIPE: 'Stripe',
  PAYPAL: 'PayPal',
};

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: currency || 'EUR' }).format(amount);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PortalPaymentsPage(): React.ReactElement {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const {
    data: rawData,
    error: paymentsError,
    isLoading,
    mutate,
  } = useSWR<BackendPaymentResponse>('/api/portal/payments', fetcher);
  const payments = rawData?.data || [];

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-bold text-[var(--text-on-brand)]'>Pagamenti</h1>
        </div>
        <div className='flex items-center justify-center h-64'>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className='w-8 h-8 border-2 border-[var(--border-default)] border-t-transparent rounded-full'
          />
        </div>
      </div>
    );
  }

  if (paymentsError) {
    return (
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-bold text-[var(--text-on-brand)]'>Pagamenti</h1>
        </div>
        <div className='text-center py-16'>
          <div className='h-12 w-12 rounded-full bg-[var(--status-error)]/10 flex items-center justify-center mx-auto mb-4'>
            <span className='text-[var(--status-error)]/40 text-xl font-bold'>!</span>
          </div>
          <p className='text-[var(--text-tertiary)] mb-4'>Impossibile caricare i pagamenti</p>
          <button onClick={() => mutate()} className='text-[var(--status-info)] hover:underline'>
            Riprova
          </button>
        </div>
      </div>
    );
  }

  const totalPaid = payments
    .filter((p) => p.status === 'SUCCESS')
    .reduce((sum, p) => sum + p.amount, 0);

  const paginatedPayments = payments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold text-[var(--text-on-brand)]'>Pagamenti</h1>
        <p className='text-[var(--text-tertiary)] mt-1'>Storico dei tuoi pagamenti</p>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        <div className='bg-[var(--surface-elevated)] border border-[var(--border-strong)] rounded-2xl'>
          <div className='p-5 flex items-center gap-4'>
            <div className='w-12 h-12 rounded-2xl bg-[var(--status-success)] flex items-center justify-center text-[var(--text-on-brand)] font-bold text-lg'>
              &euro;
            </div>
            <div>
              <p className='font-semibold text-[var(--text-on-brand)]'>
                {formatCurrency(totalPaid, 'EUR')}
              </p>
              <p className='text-sm text-[var(--text-tertiary)]'>Totale Pagato</p>
            </div>
          </div>
        </div>
        <div className='bg-[var(--surface-elevated)] border border-[var(--border-strong)] rounded-2xl'>
          <div className='p-5 flex items-center gap-4'>
            <div className='w-12 h-12 rounded-2xl bg-[var(--status-info)] flex items-center justify-center text-[var(--text-on-brand)] font-bold text-lg'>
              #
            </div>
            <div>
              <p className='font-semibold text-[var(--text-on-brand)]'>{payments.length}</p>
              <p className='text-sm text-[var(--text-tertiary)]'>Totale Transazioni</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payments List */}
      <div className='bg-[var(--surface-elevated)] border border-[var(--border-strong)] rounded-2xl'>
        <div className='px-5 pt-5 pb-3'>
          <h2 className='text-lg font-semibold text-[var(--text-on-brand)]'>Tutti i pagamenti</h2>
        </div>
        <div className='p-5'>
          {payments.length === 0 ? (
            <div className='text-center py-12'>
              <div className='h-12 w-12 rounded-full bg-[var(--surface-active)] flex items-center justify-center mx-auto mb-4'>
                <span className='text-[var(--text-tertiary)] text-xl font-bold'>PG</span>
              </div>
              <h3 className='text-lg font-medium text-[var(--text-on-brand)] mb-2'>Nessun pagamento registrato</h3>
              <p className='text-[var(--text-tertiary)]'>
                Quando effettuerai dei pagamenti, li troverai qui.
              </p>
            </div>
          ) : (
            <div className='space-y-3'>
              {paginatedPayments.map((payment) => {
                const status = statusConfig[payment.status] || statusConfig.PENDING;
                const methodLabel = methodLabels[payment.method] || payment.method;

                return (
                  <motion.div
                    key={payment.id}
                    className='flex items-center justify-between p-4 rounded-2xl bg-[var(--surface-elevated)] hover:bg-[var(--surface-active)] transition-all cursor-pointer min-h-[44px]'
                    whileHover={{ scale: 1.01 }}
                    onClick={() => router.push(`/portal/payments/${payment.id}/status`)}
                  >
                    <div className='flex items-center gap-4'>
                      <div className='w-10 h-10 rounded-xl bg-[var(--surface-secondary)]/10 flex items-center justify-center'>
                        <span className='text-xs font-bold text-[var(--status-success)]'>PG</span>
                      </div>
                      <div>
                        <p className='font-semibold text-[var(--text-on-brand)]'>
                          Fattura {payment.invoiceNumber}
                        </p>
                        <p className='text-sm text-[var(--text-tertiary)]'>
                          {payment.paidAt ? formatDate(payment.paidAt) : formatDate(payment.createdAt)}
                          {methodLabel && <span> — {methodLabel}</span>}
                        </p>
                      </div>
                    </div>
                    <div className='flex items-center gap-4'>
                      <Badge className={`${status.color} text-[var(--text-on-brand)] text-xs`}>{status.label}</Badge>
                      <p className='font-semibold text-[var(--text-on-brand)] min-w-[80px] text-right'>
                        {formatCurrency(payment.amount, payment.currency)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
          <Pagination
            page={page}
            totalPages={Math.ceil(payments.length / PAGE_SIZE)}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}
