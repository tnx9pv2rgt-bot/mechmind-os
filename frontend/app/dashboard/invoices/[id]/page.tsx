'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AppleCard,
  AppleCardContent,
  AppleCardHeader,
  AppleCardFooter,
} from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import {
  ArrowLeft,
  FileText,
  Send,
  CreditCard,
  Trash2,
  Loader2,
  AlertCircle,
  Calendar,
  User,
} from 'lucide-react';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceDetail {
  id: string;
  number: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  createdAt: string;
  dueDate: string;
  customerName: string;
  customerEmail?: string;
  customerAddress?: string;
  customerVat?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string;
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  DRAFT: {
    color: 'text-gray-700 dark:text-gray-300',
    bg: 'bg-gray-200 dark:bg-gray-700',
    label: 'Bozza',
  },
  SENT: {
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    label: 'Inviata',
  },
  PAID: {
    color: 'text-green-700 dark:text-green-300',
    bg: 'bg-green-100 dark:bg-green-900/40',
    label: 'Pagata',
  },
  OVERDUE: {
    color: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-100 dark:bg-red-900/40',
    label: 'Scaduta',
  },
  CANCELLED: {
    color: 'text-gray-500 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800',
    label: 'Annullata',
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
}

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchInvoice = () => {
    setIsLoading(true);
    setError('');
    fetch(`/api/invoices/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Fattura non trovata');
        return r.json();
      })
      .then(res => {
        const data = res.data || res;
        setInvoice(data);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Errore nel caricamento');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (id) fetchInvoice();
  }, [id]);

  const handleSend = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/invoices/${id}/send`, { method: 'POST' });
      if (!res.ok) throw new Error('Errore invio fattura');
      fetchInvoice();
    } catch {
      // silent
    } finally {
      setActionLoading(false);
    }
  };

  const handlePay = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/invoices/${id}/pay`, { method: 'POST' });
      if (!res.ok) throw new Error('Errore registrazione pagamento');
      fetchInvoice();
    } catch {
      // silent
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questa fattura?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Errore eliminazione fattura');
      router.push('/dashboard/invoices');
    } catch {
      // silent
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[60vh]'>
        <Loader2 className='h-8 w-8 animate-spin text-apple-blue' />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] text-center p-8'>
        <AlertCircle className='h-12 w-12 text-red-400 mb-4' />
        <p className='text-body text-apple-gray dark:text-[#636366] mb-4'>
          {error || 'Fattura non trovata'}
        </p>
        <AppleButton
          variant='secondary'
          icon={<ArrowLeft className='h-4 w-4' />}
          onClick={() => router.push('/dashboard/invoices')}
        >
          Torna alle Fatture
        </AppleButton>
      </div>
    );
  }

  const status = statusConfig[invoice.status] || statusConfig.DRAFT;

  return (
    <div>
      {/* Header */}
      <header className='bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-b border-apple-border/20 dark:border-[#424242]/50'>
        <div className='px-8 py-5 flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <AppleButton
              variant='ghost'
              size='sm'
              icon={<ArrowLeft className='h-4 w-4' />}
              onClick={() => router.push('/dashboard/invoices')}
            >
              Indietro
            </AppleButton>
            <div>
              <div className='flex items-center gap-3'>
                <h1 className='text-headline text-apple-dark dark:text-[#ececec]'>
                  {invoice.number || `Fattura #${invoice.id.slice(0, 8)}`}
                </h1>
                <span
                  className={`text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full ${status.bg} ${status.color}`}
                >
                  {status.label}
                </span>
              </div>
              <p className='text-apple-gray dark:text-[#636366] text-body mt-1'>
                Emessa il {new Date(invoice.createdAt).toLocaleDateString('it-IT')}
              </p>
            </div>
          </div>
          <div className='flex gap-3'>
            {invoice.status === 'DRAFT' && (
              <>
                <AppleButton
                  icon={<Send className='h-4 w-4' />}
                  loading={actionLoading}
                  onClick={handleSend}
                >
                  Invia
                </AppleButton>
                <AppleButton
                  variant='ghost'
                  icon={<Trash2 className='h-4 w-4' />}
                  loading={actionLoading}
                  onClick={handleDelete}
                  className='text-red-500 hover:text-red-600'
                >
                  Elimina
                </AppleButton>
              </>
            )}
            {invoice.status === 'SENT' && (
              <AppleButton
                icon={<CreditCard className='h-4 w-4' />}
                loading={actionLoading}
                onClick={handlePay}
              >
                Segna Pagata
              </AppleButton>
            )}
          </div>
        </div>
      </header>

      <motion.div
        className='p-8 max-w-4xl mx-auto space-y-6'
        initial='hidden'
        animate='visible'
        variants={containerVariants}
      >
        {/* Invoice Header Info */}
        <motion.div className='grid grid-cols-1 md:grid-cols-2 gap-6' variants={containerVariants}>
          {/* Customer Info */}
          <motion.div variants={itemVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <div className='flex items-center gap-2'>
                  <User className='h-4 w-4 text-apple-gray' />
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec]'>
                    Cliente
                  </h2>
                </div>
              </AppleCardHeader>
              <AppleCardContent className='space-y-2'>
                <p className='text-body font-semibold text-apple-dark dark:text-[#ececec]'>
                  {invoice.customerName}
                </p>
                {invoice.customerEmail && (
                  <p className='text-footnote text-apple-gray dark:text-[#636366]'>
                    {invoice.customerEmail}
                  </p>
                )}
                {invoice.customerAddress && (
                  <p className='text-footnote text-apple-gray dark:text-[#636366]'>
                    {invoice.customerAddress}
                  </p>
                )}
                {invoice.customerVat && (
                  <p className='text-footnote text-apple-gray dark:text-[#636366]'>
                    P.IVA: {invoice.customerVat}
                  </p>
                )}
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          {/* Dates */}
          <motion.div variants={itemVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <div className='flex items-center gap-2'>
                  <Calendar className='h-4 w-4 text-apple-gray' />
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec]'>
                    Date
                  </h2>
                </div>
              </AppleCardHeader>
              <AppleCardContent className='space-y-3'>
                <div className='flex justify-between'>
                  <span className='text-sm text-apple-gray dark:text-[#636366]'>
                    Data Emissione
                  </span>
                  <span className='text-sm font-medium text-apple-dark dark:text-[#ececec]'>
                    {new Date(invoice.createdAt).toLocaleDateString('it-IT')}
                  </span>
                </div>
                {invoice.dueDate && (
                  <div className='flex justify-between'>
                    <span className='text-sm text-apple-gray dark:text-[#636366]'>
                      Data Scadenza
                    </span>
                    <span className='text-sm font-medium text-apple-dark dark:text-[#ececec]'>
                      {new Date(invoice.dueDate).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                )}
                <div className='flex justify-between'>
                  <span className='text-sm text-apple-gray dark:text-[#636366]'>Stato</span>
                  <span
                    className={`text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full ${status.bg} ${status.color}`}
                  >
                    {status.label}
                  </span>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        </motion.div>

        {/* Items Table */}
        <motion.div variants={itemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <div className='flex items-center gap-2'>
                <FileText className='h-4 w-4 text-apple-gray' />
                <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
                  Dettaglio Voci
                </h2>
              </div>
            </AppleCardHeader>
            <AppleCardContent>
              {/* Table Header */}
              <div className='grid grid-cols-12 gap-3 pb-3 border-b border-apple-border/30 dark:border-[#424242] mb-3'>
                <div className='col-span-6'>
                  <span className='text-xs font-medium uppercase text-apple-gray dark:text-[#636366]'>
                    Descrizione
                  </span>
                </div>
                <div className='col-span-2 text-right'>
                  <span className='text-xs font-medium uppercase text-apple-gray dark:text-[#636366]'>
                    Qta
                  </span>
                </div>
                <div className='col-span-2 text-right'>
                  <span className='text-xs font-medium uppercase text-apple-gray dark:text-[#636366]'>
                    Prezzo
                  </span>
                </div>
                <div className='col-span-2 text-right'>
                  <span className='text-xs font-medium uppercase text-apple-gray dark:text-[#636366]'>
                    Totale
                  </span>
                </div>
              </div>

              {/* Table Rows */}
              <div className='space-y-2'>
                {(invoice.items || []).map(item => (
                  <div
                    key={item.id}
                    className='grid grid-cols-12 gap-3 py-3 rounded-xl px-3 hover:bg-apple-light-gray/30 dark:hover:bg-[#353535] transition-colors'
                  >
                    <div className='col-span-6'>
                      <p className='text-sm text-apple-dark dark:text-[#ececec]'>
                        {item.description}
                      </p>
                    </div>
                    <div className='col-span-2 text-right'>
                      <p className='text-sm text-apple-dark dark:text-[#ececec]'>{item.quantity}</p>
                    </div>
                    <div className='col-span-2 text-right'>
                      <p className='text-sm text-apple-dark dark:text-[#ececec]'>
                        {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <div className='col-span-2 text-right'>
                      <p className='text-sm font-medium text-apple-dark dark:text-[#ececec]'>
                        {formatCurrency(item.total || item.quantity * item.unitPrice)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </AppleCardContent>

            {/* Totals */}
            <AppleCardFooter>
              <div className='flex justify-end'>
                <div className='w-full max-w-xs space-y-2'>
                  <div className='flex justify-between text-sm'>
                    <span className='text-apple-gray dark:text-[#636366]'>Subtotale</span>
                    <span className='font-medium text-apple-dark dark:text-[#ececec]'>
                      {formatCurrency(invoice.subtotal)}
                    </span>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <span className='text-apple-gray dark:text-[#636366]'>
                      IVA ({invoice.taxRate || 22}%)
                    </span>
                    <span className='font-medium text-apple-dark dark:text-[#ececec]'>
                      {formatCurrency(invoice.taxAmount)}
                    </span>
                  </div>
                  <div className='border-t border-apple-border/30 dark:border-[#424242] pt-2'>
                    <div className='flex justify-between'>
                      <span className='text-base font-semibold text-apple-dark dark:text-[#ececec]'>
                        Totale
                      </span>
                      <span className='text-base font-bold text-apple-dark dark:text-[#ececec]'>
                        {formatCurrency(invoice.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </AppleCardFooter>
          </AppleCard>
        </motion.div>

        {/* Notes */}
        {invoice.notes && (
          <motion.div variants={itemVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec]'>
                  Note
                </h2>
              </AppleCardHeader>
              <AppleCardContent>
                <p className='text-sm text-apple-gray dark:text-[#636366] whitespace-pre-wrap'>
                  {invoice.notes}
                </p>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
