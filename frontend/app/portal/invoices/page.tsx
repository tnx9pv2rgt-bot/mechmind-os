'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import {
  FileText,
  Download,
  Euro,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
} from 'lucide-react';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';

interface PortalInvoice {
  id: string;
  invoiceNumber: string;
  total: number;
  status: string;
  createdAt: string;
  dueDate: string | null;
  paidAt: string | null;
  items: Array<{ description: string; qty: number; price: number }>;
}

interface BackendInvoice {
  id: string;
  invoiceNumber: string;
  total: number | string;
  status: string;
  createdAt: string;
  dueDate: string | null;
  paidAt: string | null;
  items?: Array<{ description: string; qty: number; price: number }>;
}

interface BackendInvoiceResponse {
  data?: BackendInvoice[];
}

const statusConfig: Record<string, { color: string; label: string }> = {
  DRAFT: { color: 'bg-gray-500', label: 'Bozza' },
  SENT: { color: 'bg-blue-500', label: 'Da pagare' },
  PAID: { color: 'bg-green-500', label: 'Pagata' },
  OVERDUE: { color: 'bg-red-500', label: 'Scaduta' },
  CANCELLED: { color: 'bg-gray-400', label: 'Annullata' },
};

function mapInvoices(json: BackendInvoiceResponse): PortalInvoice[] {
  const data = json.data || [];
  return data.map((inv) => ({
    id: inv.id || '',
    invoiceNumber: inv.invoiceNumber || '',
    total: Number(inv.total || 0),
    status: inv.status || 'DRAFT',
    createdAt: inv.createdAt || '',
    dueDate: inv.dueDate || null,
    paidAt: inv.paidAt || null,
    items: inv.items || [],
  }));
}

export default function PortalInvoicesPage(): React.ReactElement {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'all' | 'unpaid' | 'paid'>('all');
  const PAGE_SIZE = 20;

  const {
    data: rawData,
    error: invoicesError,
    isLoading,
    mutate,
  } = useSWR<BackendInvoiceResponse>('/api/portal/invoices', fetcher);
  const invoices = rawData ? mapInvoices(rawData) : [];

  const filteredInvoices = useMemo(() => {
    switch (activeTab) {
      case 'unpaid':
        return invoices.filter((i) => i.status === 'SENT' || i.status === 'OVERDUE');
      case 'paid':
        return invoices.filter((i) => i.status === 'PAID');
      default:
        return invoices;
    }
  }, [activeTab, invoices]);

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-bold text-apple-dark dark:text-[var(--text-primary)]'>Le Mie Fatture</h1>
        </div>
        <div className='flex items-center justify-center h-64'>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className='w-8 h-8 border-2 border-apple-blue border-t-transparent rounded-full'
          />
        </div>
      </div>
    );
  }

  if (invoicesError) {
    return (
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-bold text-apple-dark dark:text-[var(--text-primary)]'>Le Mie Fatture</h1>
        </div>
        <div className='text-center py-16'>
          <AlertCircle className='h-12 w-12 text-apple-red/40 mx-auto mb-4' />
          <p className='text-apple-gray dark:text-[var(--text-secondary)] mb-4'>Impossibile caricare le fatture</p>
          <button onClick={() => mutate()} className='text-apple-blue hover:underline'>
            Riprova
          </button>
        </div>
      </div>
    );
  }

  const totalPaid = invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.total, 0);
  const unpaidInvoices = invoices.filter((i) => i.status === 'SENT' || i.status === 'OVERDUE');
  const pendingTotal = unpaidInvoices.reduce((s, i) => s + i.total, 0);
  const pendingCount = unpaidInvoices.length;

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold text-apple-dark dark:text-[var(--text-primary)]'>Le Mie Fatture</h1>
        <p className='text-apple-gray dark:text-[var(--text-secondary)] mt-1'>
          Visualizza e paga le tue fatture
        </p>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <AppleCard>
          <AppleCardContent className='flex items-center gap-4'>
            <div className='w-12 h-12 rounded-2xl bg-apple-green flex items-center justify-center'>
              <Euro className='h-6 w-6 text-white' />
            </div>
            <div>
              <p className='text-title-1 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                {totalPaid.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
              </p>
              <p className='text-sm text-apple-gray dark:text-[var(--text-secondary)]'>Totale Pagato</p>
            </div>
          </AppleCardContent>
        </AppleCard>
        <AppleCard>
          <AppleCardContent className='flex items-center gap-4'>
            <div className='w-12 h-12 rounded-2xl bg-apple-orange flex items-center justify-center'>
              <Clock className='h-6 w-6 text-white' />
            </div>
            <div>
              <p className='text-title-1 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                {pendingCount}
              </p>
              <p className='text-sm text-apple-gray dark:text-[var(--text-secondary)]'>
                Da pagare ({pendingTotal.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })})
              </p>
            </div>
          </AppleCardContent>
        </AppleCard>
        <AppleCard>
          <AppleCardContent className='flex items-center gap-4'>
            <div className='w-12 h-12 rounded-2xl bg-apple-blue flex items-center justify-center'>
              <FileText className='h-6 w-6 text-white' />
            </div>
            <div>
              <p className='text-title-1 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                {invoices.length}
              </p>
              <p className='text-sm text-apple-gray dark:text-[var(--text-secondary)]'>Totale Fatture</p>
            </div>
          </AppleCardContent>
        </AppleCard>
      </div>

      {/* Tabs */}
      <div className='flex items-center gap-2 p-1 bg-white dark:bg-[var(--surface-elevated)] rounded-xl shadow-apple w-fit'>
        {([
          { key: 'unpaid', label: 'Da Pagare' },
          { key: 'paid', label: 'Pagate' },
          { key: 'all', label: 'Tutte' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setPage(1);
            }}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${
                activeTab === tab.key
                  ? 'bg-apple-blue text-white shadow-sm'
                  : 'text-apple-gray dark:text-[var(--text-secondary)] hover:text-apple-dark dark:hover:text-[var(--text-primary)]'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Invoice List */}
      <AppleCard>
        <AppleCardHeader>
          <h2 className='text-lg font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
            {activeTab === 'unpaid' ? 'Fatture da pagare' : activeTab === 'paid' ? 'Fatture pagate' : 'Tutte le fatture'}
          </h2>
        </AppleCardHeader>
        <AppleCardContent>
          {filteredInvoices.length === 0 ? (
            <div className='text-center py-12'>
              <FileText className='h-12 w-12 text-apple-gray mx-auto mb-4' />
              <p className='text-apple-gray dark:text-[var(--text-secondary)]'>
                {activeTab === 'unpaid' ? 'Nessuna fattura da pagare' : 'Nessuna fattura disponibile'}
              </p>
            </div>
          ) : (
            <div className='space-y-3'>
              {filteredInvoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((invoice) => {
                const status = statusConfig[invoice.status] || statusConfig.DRAFT;
                const isOverdue = invoice.status === 'OVERDUE';
                const isUnpaid = invoice.status === 'SENT' || invoice.status === 'OVERDUE';

                return (
                  <motion.div
                    key={invoice.id}
                    className={`flex items-center justify-between p-4 rounded-2xl transition-all cursor-pointer ${
                      isOverdue
                        ? 'bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20'
                        : 'bg-apple-light-gray/30 dark:bg-[var(--surface-hover)] hover:bg-white dark:hover:bg-[var(--surface-active)]'
                    }`}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => router.push(`/portal/invoices/${invoice.id}`)}
                  >
                    <div className='flex items-center gap-4'>
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isOverdue ? 'bg-red-100 dark:bg-red-900/30' : 'bg-apple-blue/10'
                        }`}
                      >
                        <FileText className={`h-5 w-5 ${isOverdue ? 'text-apple-red' : 'text-apple-blue'}`} />
                      </div>
                      <div>
                        <p className='font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                          {invoice.invoiceNumber}
                        </p>
                        <p className='text-sm text-apple-gray dark:text-[var(--text-secondary)]'>
                          {invoice.createdAt
                            ? new Date(invoice.createdAt).toLocaleDateString('it-IT')
                            : ''}
                          {invoice.dueDate && isUnpaid && (
                            <span className={isOverdue ? ' text-apple-red' : ''}>
                              {' '}
                              — Scad. {new Date(invoice.dueDate).toLocaleDateString('it-IT')}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className='flex items-center gap-4'>
                      <Badge className={`${status.color} text-white text-xs`}>{status.label}</Badge>
                      <p className='font-semibold text-apple-dark dark:text-[var(--text-primary)] min-w-[80px] text-right'>
                        {invoice.total.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                      </p>
                      {isUnpaid ? (
                        <AppleButton
                          size='sm'
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/portal/invoices/${invoice.id}`);
                          }}
                          icon={<CreditCard className='h-3 w-3' />}
                        >
                          Paga
                        </AppleButton>
                      ) : (
                        <AppleButton
                          variant='ghost'
                          size='sm'
                          aria-label='Scarica fattura'
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/api/portal/invoices/${invoice.id}/pdf`, '_blank');
                            toast.success('Download avviato');
                          }}
                        >
                          <Download className='h-4 w-4' />
                        </AppleButton>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
          <Pagination
            page={page}
            totalPages={Math.ceil(filteredInvoices.length / PAGE_SIZE)}
            onPageChange={setPage}
          />
        </AppleCardContent>
      </AppleCard>
    </div>
  );
}
