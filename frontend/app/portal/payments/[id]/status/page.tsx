'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  FileText,
  RotateCw,
  Home,
  Download,
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';

interface PaymentData {
  id: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'PROCESSING' | 'CANCELLED';
  amount: number;
  currency: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  method: string | null;
  receiptUrl: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

function formatCurrency(value: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const statusConfig: Record<
  string,
  {
    icon: typeof CheckCircle;
    title: string;
    description: string;
    color: string;
    bg: string;
    iconColor: string;
  }
> = {
  SUCCESS: {
    icon: CheckCircle,
    title: 'Pagamento confermato',
    description: 'Il pagamento è stato elaborato con successo.',
    color: 'text-green-700 dark:text-green-300',
    bg: 'bg-green-50 dark:bg-green-900/20',
    iconColor: 'text-green-500',
  },
  FAILED: {
    icon: XCircle,
    title: 'Pagamento non riuscito',
    description: 'Il pagamento non è andato a buon fine. Verifica i dati e riprova.',
    color: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-50 dark:bg-red-900/20',
    iconColor: 'text-red-500',
  },
  PENDING: {
    icon: Clock,
    title: 'Pagamento in elaborazione',
    description: 'Il pagamento è in fase di elaborazione. Riceverai una conferma a breve.',
    color: 'text-yellow-700 dark:text-yellow-300',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    iconColor: 'text-yellow-500',
  },
  PROCESSING: {
    icon: Clock,
    title: 'Pagamento in elaborazione',
    description: 'Il pagamento è in fase di elaborazione. Riceverai una conferma a breve.',
    color: 'text-yellow-700 dark:text-yellow-300',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    iconColor: 'text-yellow-500',
  },
  CANCELLED: {
    icon: XCircle,
    title: 'Pagamento annullato',
    description: 'Il pagamento è stato annullato.',
    color: 'text-gray-700 dark:text-gray-300',
    bg: 'bg-gray-100 dark:bg-[var(--surface-hover)]',
    iconColor: 'text-gray-500',
  },
};

export default function PaymentStatusPage(): React.ReactElement {
  const params = useParams();
  const searchParams = useSearchParams();
  const paymentId = params.id as string;
  const fromStripe = searchParams.get('session_id');

  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayment = useCallback(async () => {
    try {
      const url = fromStripe
        ? `/api/portal/payments/${paymentId}?session_id=${fromStripe}`
        : `/api/portal/payments/${paymentId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Pagamento non trovato');
      const json = await res.json();
      setPayment(json.data ?? json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento');
    } finally {
      setIsLoading(false);
    }
  }, [paymentId, fromStripe]);

  useEffect(() => {
    fetchPayment();
  }, [fetchPayment]);

  // Auto-refresh for pending payments
  useEffect(() => {
    if (!payment || (payment.status !== 'PENDING' && payment.status !== 'PROCESSING')) return;
    const interval = setInterval(fetchPayment, 5000);
    return () => clearInterval(interval);
  }, [payment, fetchPayment]);

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[60vh]'>
        <Loader2 className='h-8 w-8 animate-spin text-blue-500' />
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className='space-y-6'>
        <Breadcrumb
          items={[
            { label: 'Fatture', href: '/portal/invoices' },
            { label: 'Stato Pagamento' },
          ]}
        />
        <div className='flex flex-col items-center justify-center py-16 text-center'>
          <AlertCircle className='h-12 w-12 text-gray-400 dark:text-[var(--text-secondary)] mb-4' />
          <h2 className='text-lg font-semibold text-gray-900 dark:text-[var(--text-primary)] mb-2'>
            Pagamento non trovato
          </h2>
          <p className='text-gray-600 dark:text-[var(--text-tertiary)] mb-6'>
            {error || 'Non è stato possibile recuperare le informazioni sul pagamento.'}
          </p>
          <Link
            href='/portal/invoices'
            className='inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors'
          >
            <Home className='h-4 w-4' />
            Torna alle fatture
          </Link>
        </div>
      </div>
    );
  }

  const config = statusConfig[payment.status] || statusConfig.PENDING;
  const StatusIcon = config.icon;
  const isSuccess = payment.status === 'SUCCESS';
  const isFailed = payment.status === 'FAILED' || payment.status === 'CANCELLED';
  const isPending = payment.status === 'PENDING' || payment.status === 'PROCESSING';

  return (
    <div className='space-y-6'>
      <Breadcrumb
        items={[
          { label: 'Fatture', href: '/portal/invoices' },
          ...(payment.invoiceId
            ? [{ label: payment.invoiceNumber || 'Fattura', href: `/portal/invoices/${payment.invoiceId}` }]
            : []),
          { label: 'Stato Pagamento' },
        ]}
      />

      {/* Status Card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={`rounded-2xl p-8 text-center ${config.bg}`}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        >
          <StatusIcon className={`h-16 w-16 mx-auto mb-4 ${config.iconColor}`} />
        </motion.div>

        <h1 className={`text-2xl font-bold mb-2 ${config.color}`}>{config.title}</h1>
        <p className={`text-sm ${config.color} opacity-80`}>{config.description}</p>

        {isPending && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className='inline-block mt-4'
          >
            <Loader2 className={`h-5 w-5 ${config.iconColor}`} />
          </motion.div>
        )}
      </motion.div>

      {/* Payment Details */}
      <div className='bg-white dark:bg-[var(--surface-elevated)] rounded-2xl p-6 shadow-sm space-y-4'>
        <h2 className='text-lg font-semibold text-gray-900 dark:text-[var(--text-primary)]'>
          Dettagli pagamento
        </h2>

        <div className='divide-y divide-gray-100 dark:divide-[var(--border-default)]'>
          {/* Amount */}
          <div className='flex justify-between items-center py-3'>
            <span className='text-sm text-gray-500 dark:text-[var(--text-secondary)]'>Importo</span>
            <span className='text-lg font-bold text-gray-900 dark:text-[var(--text-primary)]'>
              {formatCurrency(payment.amount, payment.currency)}
            </span>
          </div>

          {/* Invoice Reference */}
          {payment.invoiceNumber && (
            <div className='flex justify-between items-center py-3'>
              <span className='text-sm text-gray-500 dark:text-[var(--text-secondary)]'>Fattura</span>
              <span className='text-sm font-medium text-gray-900 dark:text-[var(--text-primary)]'>
                {payment.invoiceNumber}
              </span>
            </div>
          )}

          {/* Payment Method */}
          {payment.method && (
            <div className='flex justify-between items-center py-3'>
              <span className='text-sm text-gray-500 dark:text-[var(--text-secondary)]'>Metodo</span>
              <span className='text-sm font-medium text-gray-900 dark:text-[var(--text-primary)]'>
                {payment.method}
              </span>
            </div>
          )}

          {/* Date */}
          <div className='flex justify-between items-center py-3'>
            <span className='text-sm text-gray-500 dark:text-[var(--text-secondary)]'>Data</span>
            <span className='text-sm text-gray-900 dark:text-[var(--text-primary)]'>
              {formatDate(payment.createdAt)}
            </span>
          </div>

          {/* Failure Reason */}
          {isFailed && payment.failureReason && (
            <div className='py-3'>
              <span className='text-sm text-gray-500 dark:text-[var(--text-secondary)] block mb-1'>
                Motivo del fallimento
              </span>
              <p className='text-sm text-red-600 dark:text-red-400'>{payment.failureReason}</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className='flex flex-col sm:flex-row gap-3'>
        {/* Success: Receipt + Back */}
        {isSuccess && payment.receiptUrl && (
          <a
            href={payment.receiptUrl}
            target='_blank'
            rel='noopener noreferrer'
            className='flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-2xl transition-colors min-h-[44px]'
          >
            <Download className='h-5 w-5' />
            Scarica ricevuta
          </a>
        )}

        {/* Failed: Retry */}
        {isFailed && payment.invoiceId && (
          <Link
            href={`/portal/invoices/${payment.invoiceId}`}
            className='flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-2xl transition-colors min-h-[44px]'
          >
            <RotateCw className='h-5 w-5' />
            Riprova il pagamento
          </Link>
        )}

        {/* Pending: auto-refresh note */}
        {isPending && (
          <div className='flex-1 text-center py-4 px-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl'>
            <p className='text-sm text-yellow-700 dark:text-yellow-300'>
              Questa pagina si aggiorna automaticamente. Non chiuderla.
            </p>
          </div>
        )}

        {/* Invoice link */}
        {payment.invoiceId && (
          <Link
            href={`/portal/invoices/${payment.invoiceId}`}
            className='flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 bg-gray-200 hover:bg-gray-300 dark:bg-[var(--border-default)] dark:hover:bg-[var(--surface-active)] text-gray-700 dark:text-[var(--text-secondary)] font-semibold rounded-2xl transition-colors min-h-[44px]'
          >
            <FileText className='h-5 w-5' />
            Vedi fattura
          </Link>
        )}

        {/* Back to invoices */}
        <Link
          href='/portal/invoices'
          className='flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 border border-gray-200 dark:border-[var(--border-default)] text-gray-700 dark:text-[var(--text-secondary)] font-medium rounded-2xl transition-colors hover:bg-gray-50 dark:hover:bg-[var(--surface-elevated)] min-h-[44px]'
        >
          <Home className='h-5 w-5' />
          Torna alle fatture
        </Link>
      </div>

      {/* Pending auto-refresh indicator */}
      {isPending && (
        <p className='text-center text-xs text-gray-400 dark:text-[var(--text-secondary)]'>
          Aggiornamento automatico ogni 5 secondi
        </p>
      )}
    </div>
  );
}
