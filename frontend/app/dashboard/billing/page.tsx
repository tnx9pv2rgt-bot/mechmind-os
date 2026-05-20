'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Download,
  Loader2,
  Receipt,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  Settings,
  FileDown,
  AlertTriangle,
} from 'lucide-react';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Badge } from '@/components/ui/badge';

interface PaymentMethod {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

interface Invoice {
  id: string;
  number: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  pdfUrl: string | null;
}

interface PaymentMethodResponse {
  data?: PaymentMethod;
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
}

interface InvoicesResponse {
  data?: Invoice[];
  invoices?: Invoice[];
}

const paymentFetcher = (url: string): Promise<PaymentMethod | null> =>
  fetch(url).then(async (res) => {
    if (!res.ok) return null;
    const json: PaymentMethodResponse = await res.json();
    return (json.data || json) as PaymentMethod;
  });

const invoicesFetcher = (url: string): Promise<Invoice[]> =>
  fetch(url).then(async (res) => {
    if (!res.ok) return [];
    const json: InvoicesResponse = await res.json();
    const list = json.data || json.invoices;
    return Array.isArray(list) ? list : [];
  });

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const statsCardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const listItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export default function BillingPage() {
  const {
    data: paymentMethod,
    isLoading: pmLoading,
  } = useSWR('/api/dashboard/billing/payment-method', paymentFetcher, {
    onError: () => toast.error('Errore caricamento metodo di pagamento'),
  });

  const {
    data: invoices,
    isLoading: invLoading,
    error: invError,
  } = useSWR('/api/dashboard/billing/invoices', invoicesFetcher, {
    onError: () => toast.error('Errore caricamento fatture'),
  });

  const [processing, setProcessing] = useState(false);

  const handleManagePayment = async () => {
    setProcessing(true);
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      if (!res.ok) throw new Error('Errore');
      const data: { url?: string } = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      toast.error('Errore apertura portale pagamenti');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { icon: typeof CheckCircle; bg: string; text: string; label: string }> = {
      paid: { icon: CheckCircle, bg: 'bg-[var(--status-success-subtle)] dark:bg-[var(--status-success)]/40/30', text: 'text-[var(--status-success)] dark:text-[var(--status-success)]', label: 'Pagata' },
      open: { icon: Clock, bg: 'bg-[var(--status-warning)]/20 dark:bg-[var(--status-warning)]/40/30', text: 'text-[var(--status-warning)] dark:text-[var(--status-warning)]', label: 'In Attesa' },
      uncollectible: { icon: XCircle, bg: 'bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)]', text: 'text-[var(--status-error)] dark:text-[var(--status-error)]', label: 'Fallita' },
      void: { icon: XCircle, bg: 'bg-[var(--surface-secondary)] dark:bg-[var(--surface-hover)]', text: 'text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]', label: 'Annullata' },
    };
    return configs[status] || configs.open;
  };

  const isLoading = pmLoading || invLoading;

  // Loading state
  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-[var(--brand)]' />
      </div>
    );
  }

  // Error state
  if (invError) {
    return (
      <div className='min-h-screen flex items-center justify-center p-8'>
        <AppleCard className='max-w-md w-full'>
          <AppleCardContent className='text-center py-12'>
            <AlertTriangle className='w-12 h-12 text-[var(--status-error)] mx-auto mb-4' />
            <h3 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-2'>
              Errore di caricamento
            </h3>
            <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
              Impossibile caricare lo storico fatture.
            </p>
          </AppleCardContent>
        </AppleCard>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <header>
        <div className='px-4 sm:px-8 py-5'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
            <div>
              <h1 className='text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Fatturazione</h1>
              <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1'>
                Gestisci pagamenti e storico fatture
              </p>
            </div>
            <AppleButton variant='secondary' onClick={handleManagePayment} disabled={processing} icon={<Settings className='w-4 h-4' />}>
              Gestisci Pagamenti
            </AppleButton>
          </div>
        </div>
      </header>

      <motion.div className='p-4 sm:p-8 max-w-5xl mx-auto space-y-6' initial='hidden' animate='visible' variants={containerVariants}>
        {/* Payment Method */}
        <motion.div variants={listItemVariants}>
          <AppleCard>
            <AppleCardHeader>
              <div className='flex items-center gap-3'>
                <CreditCard className='h-5 w-5 text-[var(--brand)]' />
                <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                  Metodo di Pagamento
                </h2>
              </div>
            </AppleCardHeader>
            <AppleCardContent>
              {paymentMethod ? (
                <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] rounded-xl'>
                  <div className='flex items-center gap-4'>
                    <div className='w-14 h-10 bg-gradient-to-r from-[var(--surface-active)] to-[var(--surface-primary)] rounded-lg flex items-center justify-center'>
                      <CreditCard className='w-6 h-6 text-[var(--text-on-brand)]' />
                    </div>
                    <div>
                      <p className='text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] capitalize'>
                        {paymentMethod.brand} &bull;&bull;&bull;&bull; {paymentMethod.last4}
                      </p>
                      <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                        Scade {paymentMethod.expMonth}/{paymentMethod.expYear}
                      </p>
                    </div>
                  </div>
                  <div className='flex items-center gap-3'>
                    <CheckCircle className='w-5 h-5 text-[var(--status-success)]' />
                    <AppleButton variant='secondary' size='sm' onClick={handleManagePayment} disabled={processing}>
                      Modifica
                    </AppleButton>
                  </div>
                </div>
              ) : (
                <div className='flex items-center gap-3 p-4 bg-[var(--status-warning)]/10 dark:bg-[var(--status-warning)]/20 rounded-xl'>
                  <AlertCircle className='w-5 h-5 text-[var(--status-warning)] flex-shrink-0' />
                  <div className='flex-1'>
                    <p className='text-body font-medium text-[var(--status-warning)] dark:text-[var(--status-warning)]'>
                      Nessun metodo di pagamento configurato
                    </p>
                    <p className='text-footnote text-[var(--status-warning)] dark:text-[var(--status-warning)]'>
                      Aggiungi un metodo di pagamento per attivare il tuo abbonamento.
                    </p>
                  </div>
                  <AppleButton variant='primary' size='sm' onClick={handleManagePayment} disabled={processing}>
                    Aggiungi
                  </AppleButton>
                </div>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Invoice History */}
        <motion.div variants={listItemVariants}>
          <AppleCard>
            <AppleCardHeader>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <Receipt className='h-5 w-5 text-[var(--brand)]' />
                  <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    Storico Fatture
                  </h2>
                </div>
                {invoices && invoices.length > 0 && (
                  <AppleButton variant='ghost' size='sm'>
                    <FileDown className='w-4 h-4 mr-2' />
                    Scarica tutte
                  </AppleButton>
                )}
              </div>
            </AppleCardHeader>
            <AppleCardContent>
              {invoices && invoices.length > 0 ? (
                <div className='overflow-x-auto'>
                  <table className='w-full'>
                    <thead>
                      <tr className='border-b border-[var(--border-default)]/30 dark:border-[var(--border-default)]'>
                        <th className='text-left py-3 px-4 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                          Data
                        </th>
                        <th className='text-left py-3 px-4 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                          Numero
                        </th>
                        <th className='text-left py-3 px-4 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                          Importo
                        </th>
                        <th className='text-left py-3 px-4 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                          Stato
                        </th>
                        <th className='text-right py-3 px-4 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                          PDF
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice, index) => {
                        const statusConfig = getStatusConfig(invoice.status);
                        const StatusIcon = statusConfig.icon;
                        return (
                          <motion.tr
                            key={invoice.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className='border-b border-[var(--border-default)]/20 dark:border-[var(--border-default)]/50 hover:bg-[var(--surface-secondary)]/30 dark:hover:bg-[var(--surface-hover)] transition-colors'
                          >
                            <td className='py-3 px-4 text-body text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                              {new Date(invoice.date).toLocaleDateString('it-IT')}
                            </td>
                            <td className='py-3 px-4 text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                              #{invoice.number}
                            </td>
                            <td className='py-3 px-4 text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                              &euro;{(invoice.amount / 100).toFixed(2).replace('.', ',')}
                            </td>
                            <td className='py-3 px-4'>
                              <Badge className={`${statusConfig.bg} ${statusConfig.text} border-0 gap-1`}>
                                <StatusIcon className='w-3 h-3' />
                                {statusConfig.label}
                              </Badge>
                            </td>
                            <td className='py-3 px-4 text-right'>
                              {invoice.pdfUrl ? (
                                <a
                                  href={invoice.pdfUrl}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                  className='inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)] transition-colors min-w-[44px] min-h-[44px]'
                                >
                                  <Download className='w-4 h-4 text-[var(--text-tertiary)]' />
                                </a>
                              ) : (
                                <span className='text-footnote text-[var(--text-tertiary)]'>-</span>
                              )}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className='text-center py-12'>
                  <Receipt className='w-12 h-12 text-[var(--text-tertiary)]/30 mx-auto mb-4' />
                  <h3 className='text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1'>
                    Nessuna fattura
                  </h3>
                  <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                    Le fatture appariranno qui dopo il primo pagamento.
                  </p>
                </div>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
