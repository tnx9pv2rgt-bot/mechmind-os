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

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
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
      paid: { icon: CheckCircle, bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', label: 'Pagata' },
      open: { icon: Clock, bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', label: 'In Attesa' },
      uncollectible: { icon: XCircle, bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300', label: 'Fallita' },
      void: { icon: XCircle, bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-300', label: 'Annullata' },
    };
    return configs[status] || configs.open;
  };

  const isLoading = pmLoading || invLoading;

  // Loading state
  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-apple-blue' />
      </div>
    );
  }

  // Error state
  if (invError) {
    return (
      <div className='min-h-screen flex items-center justify-center p-8'>
        <AppleCard className='max-w-md w-full'>
          <AppleCardContent className='text-center py-12'>
            <AlertTriangle className='w-12 h-12 text-red-400 mx-auto mb-4' />
            <h3 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec] mb-2'>
              Errore di caricamento
            </h3>
            <p className='text-body text-apple-gray dark:text-[#636366]'>
              Impossibile caricare lo storico fatture.
            </p>
          </AppleCardContent>
        </AppleCard>
      </div>
    );
  }

  return (
    <div className='min-h-screen'>
      {/* Header */}
      <header className='bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-b border-apple-border/20 dark:border-[#424242]/50'>
        <div className='px-4 sm:px-8 py-5'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
            <div>
              <h1 className='text-headline text-apple-dark dark:text-[#ececec]'>Fatturazione</h1>
              <p className='text-apple-gray dark:text-[#636366] text-body mt-1'>
                Gestisci pagamenti e storico fatture
              </p>
            </div>
            <AppleButton variant='secondary' onClick={handleManagePayment} disabled={processing}>
              <Settings className='w-4 h-4 mr-2' />
              Gestisci Pagamenti
            </AppleButton>
          </div>
        </div>
      </header>

      <div className='p-4 sm:p-8 max-w-5xl mx-auto space-y-6'>
        {/* Payment Method */}
        <motion.div initial='initial' animate='animate' variants={fadeIn}>
          <AppleCard>
            <AppleCardHeader>
              <div className='flex items-center gap-3'>
                <CreditCard className='h-5 w-5 text-apple-blue' />
                <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
                  Metodo di Pagamento
                </h2>
              </div>
            </AppleCardHeader>
            <AppleCardContent>
              {paymentMethod ? (
                <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-apple-light-gray/50 dark:bg-[#353535] rounded-xl'>
                  <div className='flex items-center gap-4'>
                    <div className='w-14 h-10 bg-gradient-to-r from-gray-700 to-gray-900 rounded-lg flex items-center justify-center'>
                      <CreditCard className='w-6 h-6 text-white' />
                    </div>
                    <div>
                      <p className='text-body font-medium text-apple-dark dark:text-[#ececec] capitalize'>
                        {paymentMethod.brand} &bull;&bull;&bull;&bull; {paymentMethod.last4}
                      </p>
                      <p className='text-footnote text-apple-gray dark:text-[#636366]'>
                        Scade {paymentMethod.expMonth}/{paymentMethod.expYear}
                      </p>
                    </div>
                  </div>
                  <div className='flex items-center gap-3'>
                    <CheckCircle className='w-5 h-5 text-green-500' />
                    <AppleButton variant='secondary' size='sm' onClick={handleManagePayment} disabled={processing}>
                      Modifica
                    </AppleButton>
                  </div>
                </div>
              ) : (
                <div className='flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl'>
                  <AlertCircle className='w-5 h-5 text-yellow-600 flex-shrink-0' />
                  <div className='flex-1'>
                    <p className='text-body font-medium text-yellow-800 dark:text-yellow-300'>
                      Nessun metodo di pagamento configurato
                    </p>
                    <p className='text-footnote text-yellow-600 dark:text-yellow-400'>
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <AppleCard>
            <AppleCardHeader>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <Receipt className='h-5 w-5 text-apple-blue' />
                  <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
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
                      <tr className='border-b border-apple-border/30 dark:border-[#424242]'>
                        <th className='text-left py-3 px-4 text-footnote font-medium text-apple-gray dark:text-[#636366] uppercase tracking-wider'>
                          Data
                        </th>
                        <th className='text-left py-3 px-4 text-footnote font-medium text-apple-gray dark:text-[#636366] uppercase tracking-wider'>
                          Numero
                        </th>
                        <th className='text-left py-3 px-4 text-footnote font-medium text-apple-gray dark:text-[#636366] uppercase tracking-wider'>
                          Importo
                        </th>
                        <th className='text-left py-3 px-4 text-footnote font-medium text-apple-gray dark:text-[#636366] uppercase tracking-wider'>
                          Stato
                        </th>
                        <th className='text-right py-3 px-4 text-footnote font-medium text-apple-gray dark:text-[#636366] uppercase tracking-wider'>
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
                            className='border-b border-apple-border/20 dark:border-[#424242]/50 hover:bg-apple-light-gray/30 dark:hover:bg-[#353535] transition-colors'
                          >
                            <td className='py-3 px-4 text-body text-apple-dark dark:text-[#ececec]'>
                              {new Date(invoice.date).toLocaleDateString('it-IT')}
                            </td>
                            <td className='py-3 px-4 text-body font-medium text-apple-dark dark:text-[#ececec]'>
                              #{invoice.number}
                            </td>
                            <td className='py-3 px-4 text-body font-semibold text-apple-dark dark:text-[#ececec]'>
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
                                  className='inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-apple-light-gray dark:hover:bg-[#353535] transition-colors min-w-[44px] min-h-[44px]'
                                >
                                  <Download className='w-4 h-4 text-apple-gray' />
                                </a>
                              ) : (
                                <span className='text-footnote text-apple-gray'>-</span>
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
                  <Receipt className='w-12 h-12 text-apple-gray/30 mx-auto mb-4' />
                  <h3 className='text-body font-medium text-apple-dark dark:text-[#ececec] mb-1'>
                    Nessuna fattura
                  </h3>
                  <p className='text-footnote text-apple-gray dark:text-[#636366]'>
                    Le fatture appariranno qui dopo il primo pagamento.
                  </p>
                </div>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </div>
    </div>
  );
}
