'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Plus,
  Euro,
  Clock,
  Send,
  CheckCircle,
  Search,
  Filter,
  Loader2,
  Eye,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/pagination';

interface Invoice {
  id: string;
  number: string;
  customerName: string;
  createdAt: string;
  dueDate: string;
  total: number;
  subtotal: number;
  taxAmount: number;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
}

interface InvoiceStats {
  monthlyRevenue: number;
  pendingCount: number;
  sentCount: number;
  paidCount: number;
}

type InvoiceStatus = 'ALL' | 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  DRAFT: {
    color: 'text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]',
    bg: 'bg-[var(--surface-secondary)] dark:bg-[var(--surface-hover)]',
    label: 'Bozza',
  },
  SENT: {
    color: 'text-[var(--brand)]',
    bg: 'bg-[var(--brand)]/10',
    label: 'Inviata',
  },
  PAID: {
    color: 'text-[var(--status-success)]',
    bg: 'bg-[var(--status-success)]/10',
    label: 'Pagata',
  },
  OVERDUE: {
    color: 'text-[var(--status-error)]',
    bg: 'bg-[var(--status-error)]/10',
    label: 'Scaduta',
  },
  CANCELLED: {
    color: 'text-[var(--status-warning)]',
    bg: 'bg-[var(--status-warning)]/10',
    label: 'Annullata',
  },
};

const statusOptions: { value: InvoiceStatus; label: string }[] = [
  { value: 'ALL', label: 'Tutti gli stati' },
  { value: 'DRAFT', label: 'Bozza' },
  { value: 'SENT', label: 'Inviata' },
  { value: 'PAID', label: 'Pagata' },
  { value: 'OVERDUE', label: 'Scaduta' },
  { value: 'CANCELLED', label: 'Annullata' },
];

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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
}

export default function InvoicesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const {
    data: invoicesData,
    error: invoicesError,
    isLoading: invoicesLoading,
    mutate: mutateInvoices,
  } = useSWR<{ data?: Invoice[] } | Invoice[]>('/api/invoices', fetcher);
  const {
    data: statsData,
    error: statsError,
    isLoading: statsLoading,
    mutate: mutateStats,
  } = useSWR<{ data?: InvoiceStats } | InvoiceStats>('/api/invoices/stats', fetcher);

  const isLoading = invoicesLoading || statsLoading;

  const invoices: Invoice[] = (() => {
    if (!invoicesData) return [];
    const list = (invoicesData as { data?: Invoice[] }).data || invoicesData || [];
    return Array.isArray(list) ? list : [];
  })();

  const stats: InvoiceStats = (() => {
    if (!statsData) return { monthlyRevenue: 0, pendingCount: 0, sentCount: 0, paidCount: 0 };
    const d = (statsData as { data?: InvoiceStats }).data || statsData || {};
    return {
      monthlyRevenue: (d as InvoiceStats).monthlyRevenue || 0,
      pendingCount: (d as InvoiceStats).pendingCount || 0,
      sentCount: (d as InvoiceStats).sentCount || 0,
      paidCount: (d as InvoiceStats).paidCount || 0,
    };
  })();

  const handleSend = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/invoices/${id}/send`, { method: 'POST' });
      if (!res.ok) throw new Error('Errore invio');
      mutateInvoices();
      mutateStats();
      toast.success('Fattura inviata con successo');
    } catch {
      toast.error('Errore durante l\'invio della fattura');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePay = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/invoices/${id}/pay`, { method: 'POST' });
      if (!res.ok) throw new Error('Errore pagamento');
      mutateInvoices();
      mutateStats();
      toast.success('Pagamento registrato con successo');
    } catch {
      toast.error('Errore durante la registrazione del pagamento');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch =
      !searchQuery ||
      inv.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statCards = [
    {
      label: 'Fatturato Mese',
      value: formatCurrency(stats.monthlyRevenue),
      icon: Euro,
      color: 'bg-[var(--status-success)]',
    },
    {
      label: 'In Attesa',
      value: String(stats.pendingCount),
      icon: Clock,
      color: 'bg-[var(--status-warning)]',
    },
    {
      label: 'Inviate',
      value: String(stats.sentCount),
      icon: Send,
      color: 'bg-[var(--brand)]',
    },
    {
      label: 'Pagate',
      value: String(stats.paidCount),
      icon: CheckCircle,
      color: 'bg-[var(--brand)]',
    },
  ];

  return (
    <div>
      {/* Header */}
      <header>
        <div className='px-8 py-5 flex items-center justify-between'>
          <div>
            <h1 className='text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Fatture</h1>
            <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1'>
              Gestisci fatture e documenti fiscali
            </p>
          </div>
          <AppleButton
            icon={<Plus className='h-4 w-4' />}
            onClick={() => router.push('/dashboard/invoices/new')}
          >
            Nuova Fattura
          </AppleButton>
        </div>
      </header>

      <motion.div
        className='p-8 space-y-6'
        initial='hidden'
        animate='visible'
        variants={containerVariants}
      >
        {/* Stats */}
        <motion.div
          className='grid grid-cols-2 lg:grid-cols-4 gap-bento'
          variants={containerVariants}
        >
          {statCards.map(stat => (
            <motion.div key={stat.label} variants={statsCardVariants}>
              <AppleCard hover={false}>
                <AppleCardContent>
                  <div className='flex items-center justify-between mb-3'>
                    <div
                      className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}
                    >
                      <stat.icon className='h-5 w-5 text-[var(--text-on-brand)]' />
                    </div>
                  </div>
                  <p className='text-title-1 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    {isLoading ? '...' : stat.value}
                  </p>
                  <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>{stat.label}</p>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardContent>
              <div className='flex flex-col sm:flex-row gap-4'>
                <div className='relative flex-1'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]' />
                  <Input
                    placeholder='Cerca per numero o cliente...'
                    aria-label='Cerca fatture'
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className='pl-10'
                  />
                </div>
                <div className='relative'>
                  <Filter className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)] pointer-events-none' />
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as InvoiceStatus)}
                    className='h-10 pl-10 pr-4 rounded-md border border-[var(--border-default)] dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue appearance-none cursor-pointer'
                  >
                    {statusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Invoice List */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Elenco Fatture
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              {invoicesError || statsError ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <AlertCircle className='h-12 w-12 text-[var(--status-error)]/40 mb-4' />
                  <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                    Impossibile caricare le fatture
                  </p>
                  <AppleButton
                    variant='ghost'
                    className='mt-4'
                    onClick={() => {
                      mutateInvoices();
                      mutateStats();
                    }}
                  >
                    Riprova
                  </AppleButton>
                </div>
              ) : isLoading ? (
                <div className='flex items-center justify-center py-12'>
                  <Loader2 className='h-8 w-8 animate-spin text-[var(--brand)]' />
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <AlertCircle className='h-12 w-12 text-[var(--text-tertiary)]/40 mb-4' />
                  <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                    Nessuna fattura trovata. Crea la prima fattura.
                  </p>
                  <AppleButton
                    variant='ghost'
                    className='mt-4'
                    onClick={() => router.push('/dashboard/invoices/new')}
                  >
                    Crea la prima fattura
                  </AppleButton>
                </div>
              ) : (
                <motion.div
                  className='space-y-3'
                  variants={containerVariants}
                  initial='hidden'
                  animate='visible'
                >
                  {filteredInvoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((inv, index) => {
                    const status = statusConfig[inv.status] || statusConfig.DRAFT;
                    return (
                      <motion.div
                        key={inv.id}
                        className='flex items-center justify-between p-4 rounded-2xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-active)] hover:shadow-apple transition-all duration-300'
                        variants={listItemVariants}
                        custom={index}
                        whileHover={{ scale: 1.005, x: 4 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className='flex items-center gap-4'>
                          <div className='w-12 h-12 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center'>
                            <FileText className='h-6 w-6 text-[var(--brand)]' />
                          </div>
                          <div>
                            <p className='text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                              {inv.number || `#${inv.id.slice(0, 8)}`}
                            </p>
                            <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                              {inv.customerName} &bull; Scadenza: {new Date(inv.dueDate).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                        </div>
                        <div className='flex items-center gap-4'>
                          <span
                            className={`text-footnote font-semibold px-2.5 py-1 rounded-full ${status.bg} ${status.color}`}
                          >
                            {status.label}
                          </span>
                          <p className='text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] min-w-[100px] text-right'>
                            {formatCurrency(inv.total)}
                          </p>
                          <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] min-w-[80px] text-right'>
                            {new Date(inv.createdAt).toLocaleDateString('it-IT')}
                          </p>
                          <div className='flex items-center gap-2'>
                            <AppleButton
                              variant='ghost'
                              size='sm'
                              icon={<Eye className='h-3.5 w-3.5' />}
                              onClick={() => router.push(`/dashboard/invoices/${inv.id}`)}
                            >
                              Visualizza
                            </AppleButton>
                            {inv.status === 'DRAFT' && (
                              <AppleButton
                                variant='secondary'
                                size='sm'
                                icon={<Send className='h-3.5 w-3.5' />}
                                loading={actionLoading === inv.id}
                                onClick={() => handleSend(inv.id)}
                              >
                                Invia
                              </AppleButton>
                            )}
                            {inv.status === 'SENT' && (
                              <AppleButton
                                variant='secondary'
                                size='sm'
                                icon={<CreditCard className='h-3.5 w-3.5' />}
                                loading={actionLoading === inv.id}
                                onClick={() => handlePay(inv.id)}
                              >
                                Segna Pagata
                              </AppleButton>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  <Pagination page={page} totalPages={Math.ceil(filteredInvoices.length / PAGE_SIZE)} onPageChange={setPage} />
                </motion.div>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
