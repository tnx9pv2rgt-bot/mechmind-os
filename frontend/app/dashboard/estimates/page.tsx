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
  CheckCircle,
  Search,
  Filter,
  Loader2,
  Eye,
  Send,
  AlertCircle,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/pagination';

interface Estimate {
  id: string;
  number: string;
  customerName: string;
  vehiclePlate: string;
  vehicleBrand: string;
  vehicleModel: string;
  total: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
  createdAt: string;
  expiresAt: string;
}

interface EstimateStats {
  total: number;
  pending: number;
  accepted: number;
  conversionRate: number;
}

type EstimateStatus = 'ALL' | 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  DRAFT: {
    color: 'text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]',
    bg: 'bg-[var(--surface-secondary)] dark:bg-[var(--surface-hover)]',
    label: 'Bozza',
  },
  SENT: {
    color: 'text-[var(--brand)]',
    bg: 'bg-[var(--brand)]/10',
    label: 'Inviato',
  },
  ACCEPTED: {
    color: 'text-[var(--status-success)]',
    bg: 'bg-[var(--status-success)]/10',
    label: 'Accettato',
  },
  REJECTED: {
    color: 'text-[var(--status-error)]',
    bg: 'bg-[var(--status-error)]/10',
    label: 'Rifiutato',
  },
  EXPIRED: {
    color: 'text-[var(--status-warning)]',
    bg: 'bg-[var(--status-warning)]/10',
    label: 'Scaduto',
  },
  CONVERTED: {
    color: 'text-[var(--brand)]',
    bg: 'bg-[var(--brand)]/10',
    label: 'Convertito',
  },
};

const statusOptions: { value: EstimateStatus; label: string }[] = [
  { value: 'ALL', label: 'Tutti gli stati' },
  { value: 'DRAFT', label: 'Bozza' },
  { value: 'SENT', label: 'Inviato' },
  { value: 'ACCEPTED', label: 'Accettato' },
  { value: 'REJECTED', label: 'Rifiutato' },
  { value: 'EXPIRED', label: 'Scaduto' },
  { value: 'CONVERTED', label: 'Convertito' },
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

export default function EstimatesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<EstimateStatus>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const {
    data: estimatesData,
    error: estimatesError,
    isLoading: estimatesLoading,
    mutate: mutateEstimates,
  } = useSWR<{ data?: Estimate[] } | Estimate[]>('/api/estimates', fetcher);
  const {
    data: statsData,
    error: statsError,
    isLoading: statsLoading,
    mutate: mutateStats,
  } = useSWR<{ data?: EstimateStats } | EstimateStats>('/api/estimates/stats', fetcher);

  const isLoading = estimatesLoading || statsLoading;

  const estimates: Estimate[] = (() => {
    if (!estimatesData) return [];
    const list = (estimatesData as { data?: Estimate[] }).data || estimatesData || [];
    return Array.isArray(list) ? list : [];
  })();

  const stats: EstimateStats = (() => {
    if (!statsData) return { total: 0, pending: 0, accepted: 0, conversionRate: 0 };
    const d = (statsData as { data?: EstimateStats }).data || statsData || {};
    return {
      total: (d as EstimateStats).total || 0,
      pending: (d as EstimateStats).pending || 0,
      accepted: (d as EstimateStats).accepted || 0,
      conversionRate: (d as EstimateStats).conversionRate || 0,
    };
  })();

  const handleSend = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/estimates/${id}/send`, { method: 'POST' });
      if (!res.ok) throw new Error('Errore invio');
      mutateEstimates();
      mutateStats();
      toast.success('Preventivo inviato con successo');
    } catch {
      toast.error('Errore durante l\'invio del preventivo');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredEstimates = estimates.filter(est => {
    const matchesSearch =
      !searchQuery ||
      est.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      est.customerName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || est.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statCards = [
    {
      label: 'Totale Preventivi',
      value: String(stats.total),
      icon: FileText,
      color: 'bg-[var(--brand)]',
    },
    {
      label: 'In Attesa',
      value: String(stats.pending),
      icon: Clock,
      color: 'bg-[var(--status-warning)]',
    },
    {
      label: 'Accettati',
      value: String(stats.accepted),
      icon: CheckCircle,
      color: 'bg-[var(--status-success)]',
    },
    {
      label: 'Tasso Conversione',
      value: `${stats.conversionRate}%`,
      icon: TrendingUp,
      color: 'bg-[var(--brand)]',
    },
  ];

  return (
    <div>
      {/* Header */}
      <header>
        <div className='px-8 py-5 flex items-center justify-between'>
          <div>
            <h1 className='text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Preventivi</h1>
            <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1'>
              Gestisci i preventivi per i tuoi clienti
            </p>
          </div>
          <AppleButton
            icon={<Plus className='h-4 w-4' />}
            onClick={() => router.push('/dashboard/estimates/new')}
          >
            Nuovo Preventivo
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
                    aria-label='Cerca preventivi'
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className='pl-10'
                  />
                </div>
                <div className='relative'>
                  <Filter className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)] pointer-events-none' />
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as EstimateStatus)}
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

        {/* Estimates List */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Elenco Preventivi
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              {estimatesError || statsError ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <AlertCircle className='h-12 w-12 text-[var(--status-error)]/40 mb-4' />
                  <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                    Impossibile caricare i preventivi
                  </p>
                  <AppleButton
                    variant='ghost'
                    className='mt-4'
                    onClick={() => {
                      mutateEstimates();
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
              ) : filteredEstimates.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <AlertCircle className='h-12 w-12 text-[var(--text-tertiary)]/40 mb-4' />
                  <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                    Nessun preventivo. Crea il primo preventivo.
                  </p>
                  <AppleButton
                    variant='ghost'
                    className='mt-4'
                    onClick={() => router.push('/dashboard/estimates/new')}
                  >
                    Crea il primo preventivo
                  </AppleButton>
                </div>
              ) : (
                <motion.div
                  className='space-y-3'
                  variants={containerVariants}
                  initial='hidden'
                  animate='visible'
                >
                  {filteredEstimates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((est, index) => {
                    const status = statusConfig[est.status] || statusConfig.DRAFT;
                    return (
                      <motion.div
                        key={est.id}
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
                              {est.number || `#${est.id.slice(0, 8)}`}
                            </p>
                            <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                              {est.customerName} &bull; {est.vehiclePlate}{' '}
                              {est.vehicleBrand && `${est.vehicleBrand} ${est.vehicleModel || ''}`}
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
                            {formatCurrency(est.total)}
                          </p>
                          <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] min-w-[80px] text-right'>
                            {new Date(est.createdAt).toLocaleDateString('it-IT')}
                          </p>
                          <div className='flex items-center gap-2'>
                            <AppleButton
                              variant='ghost'
                              size='sm'
                              icon={<Eye className='h-3.5 w-3.5' />}
                              onClick={() => router.push(`/dashboard/estimates/${est.id}`)}
                            >
                              Visualizza
                            </AppleButton>
                            {est.status === 'DRAFT' && (
                              <AppleButton
                                variant='secondary'
                                size='sm'
                                icon={<Send className='h-3.5 w-3.5' />}
                                loading={actionLoading === est.id}
                                onClick={() => handleSend(est.id)}
                              >
                                Invia
                              </AppleButton>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  <Pagination page={page} totalPages={Math.ceil(filteredEstimates.length / PAGE_SIZE)} onPageChange={setPage} />
                </motion.div>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
