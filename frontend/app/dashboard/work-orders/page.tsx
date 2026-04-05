'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import {
  ClipboardList,
  Plus,
  Eye,
  Search,
  Filter,
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle,
  Wrench,
  TrendingUp,
  PlayCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/pagination';
import { formatCurrency, formatDate } from '@/lib/utils/format';

// =============================================================================
// Types & Config
// =============================================================================
interface WorkOrder {
  id: string;
  woNumber: string;
  status: string;
  priority?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  customerName?: string;
  technicianName?: string;
  totalCost: number;
  estimatedHours?: number;
  createdAt: string;
  updatedAt: string;
}

interface WorkOrdersResponse {
  data: WorkOrder[];
  total: number;
  page: number;
  limit: number;
}

type WorkOrderStatus = 'ALL' | 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'QC' | 'COMPLETED' | 'DELIVERED' | 'CANCELLED';

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  DRAFT: {
    color: 'text-gray-700 dark:text-gray-300',
    bg: 'bg-gray-200 dark:bg-gray-700',
    label: 'Bozza',
  },
  OPEN: {
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    label: 'Aperto',
  },
  IN_PROGRESS: {
    color: 'text-yellow-700 dark:text-yellow-300',
    bg: 'bg-yellow-100 dark:bg-yellow-900/40',
    label: 'In Lavorazione',
  },
  QC: {
    color: 'text-purple-700 dark:text-purple-300',
    bg: 'bg-purple-100 dark:bg-purple-900/40',
    label: 'Controllo Qualita',
  },
  COMPLETED: {
    color: 'text-green-700 dark:text-green-300',
    bg: 'bg-green-100 dark:bg-green-900/40',
    label: 'Completato',
  },
  DELIVERED: {
    color: 'text-cyan-700 dark:text-cyan-300',
    bg: 'bg-cyan-100 dark:bg-cyan-900/40',
    label: 'Consegnato',
  },
  CANCELLED: {
    color: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-100 dark:bg-red-900/40',
    label: 'Annullato',
  },
  PENDING: {
    color: 'text-yellow-700 dark:text-yellow-300',
    bg: 'bg-yellow-100 dark:bg-yellow-900/40',
    label: 'In Attesa',
  },
  WAITING_PARTS: {
    color: 'text-orange-700 dark:text-orange-300',
    bg: 'bg-orange-100 dark:bg-orange-900/40',
    label: 'Attesa Ricambi',
  },
  READY: {
    color: 'text-green-700 dark:text-green-300',
    bg: 'bg-green-100 dark:bg-green-900/40',
    label: 'Pronto',
  },
  INVOICED: {
    color: 'text-cyan-700 dark:text-cyan-300',
    bg: 'bg-cyan-100 dark:bg-cyan-900/40',
    label: 'Fatturato',
  },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  LOW: { label: 'Bassa', color: 'text-gray-700 dark:text-gray-300', bg: 'bg-gray-200 dark:bg-gray-700' },
  NORMAL: { label: 'Normale', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/40' },
  HIGH: { label: 'Alta', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-900/40' },
  URGENT: { label: 'Urgente', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/40' },
};

const statusOptions: { value: WorkOrderStatus; label: string }[] = [
  { value: 'ALL', label: 'Tutti gli stati' },
  { value: 'DRAFT', label: 'Bozza' },
  { value: 'OPEN', label: 'Aperto' },
  { value: 'IN_PROGRESS', label: 'In Lavorazione' },
  { value: 'QC', label: 'Controllo Qualita' },
  { value: 'COMPLETED', label: 'Completato' },
  { value: 'DELIVERED', label: 'Consegnato' },
  { value: 'CANCELLED', label: 'Annullato' },
];

const NEXT_STATUS: Record<string, string> = {
  DRAFT: 'OPEN',
  OPEN: 'IN_PROGRESS',
  IN_PROGRESS: 'QC',
  QC: 'COMPLETED',
  COMPLETED: 'DELIVERED',
};

// =============================================================================
// Animation Variants
// =============================================================================
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

export default function WorkOrdersPage(): React.ReactElement {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const buildUrl = useCallback((): string => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    return `/api/dashboard/work-orders?${params.toString()}`;
  }, [page, debouncedSearch, statusFilter]);

  const { data: rawData, error, isLoading, mutate } = useSWR<WorkOrdersResponse | WorkOrder[]>(
    buildUrl(),
    fetcher,
  );

  const workOrders: WorkOrder[] = (() => {
    if (!rawData) return [];
    if (Array.isArray(rawData)) return rawData;
    if ('data' in rawData && Array.isArray(rawData.data)) return rawData.data;
    return [];
  })();

  const total = (() => {
    if (!rawData) return 0;
    if (Array.isArray(rawData)) return rawData.length;
    if ('total' in rawData) return rawData.total;
    return workOrders.length;
  })();

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleChangeStatus = async (woId: string, newStatus: string): Promise<void> => {
    setActionLoading(woId);
    try {
      const res = await fetch(`/api/dashboard/work-orders/${woId}/transition`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || json.message || 'Transizione non consentita');
      }
      toast.success(`Stato aggiornato a "${statusConfig[newStatus]?.label || newStatus}"`);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante il cambio stato');
    } finally {
      setActionLoading(null);
    }
  };

  // KPI counts
  const openCount = workOrders.filter(w => w.status === 'OPEN').length;
  const inProgressCount = workOrders.filter(w => w.status === 'IN_PROGRESS').length;
  const completedCount = workOrders.filter(w => w.status === 'COMPLETED').length;

  const statCards = [
    {
      label: 'Totale OdL',
      value: String(total),
      icon: ClipboardList,
      color: 'bg-apple-blue',
    },
    {
      label: 'Aperti',
      value: String(openCount),
      icon: AlertCircle,
      color: 'bg-apple-orange',
    },
    {
      label: 'In Lavorazione',
      value: String(inProgressCount),
      icon: Clock,
      color: 'bg-apple-green',
    },
    {
      label: 'Completati',
      value: String(completedCount),
      icon: CheckCircle,
      color: 'bg-apple-purple',
    },
  ];

  return (
    <div>
      {/* Header */}
      <header className=''>
        <div className='px-8 py-5 flex items-center justify-between'>
          <div>
            <h1 className='text-headline text-apple-dark dark:text-[var(--text-primary)]'>Ordini di Lavoro</h1>
            <p className='text-apple-gray dark:text-[var(--text-secondary)] text-body mt-1'>
              Gestisci le lavorazioni della tua officina
            </p>
          </div>
          <AppleButton
            icon={<Plus className='h-4 w-4' />}
            onClick={() => router.push('/dashboard/work-orders/new')}
          >
            Nuovo OdL
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
                      <stat.icon className='h-5 w-5 text-white' />
                    </div>
                  </div>
                  <p className='text-title-1 font-bold text-apple-dark dark:text-[var(--text-primary)]'>
                    {isLoading ? '...' : stat.value}
                  </p>
                  <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>{stat.label}</p>
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
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-apple-gray' />
                  <Input
                    placeholder='Cerca per numero OdL, cliente, targa...'
                    aria-label='Cerca ordini di lavoro'
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className='pl-10'
                  />
                </div>
                <div className='relative'>
                  <Filter className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-apple-gray pointer-events-none' />
                  <select
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value as WorkOrderStatus); setPage(1); }}
                    className='h-10 pl-10 pr-4 rounded-md border border-apple-border/30 dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] text-body text-apple-dark dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue appearance-none cursor-pointer'
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

        {/* Work Orders List */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                Elenco Ordini di Lavoro
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              {error ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <AlertCircle className='h-12 w-12 text-apple-red/40 mb-4' />
                  <p className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>
                    Impossibile caricare gli ordini di lavoro
                  </p>
                  <AppleButton
                    variant='ghost'
                    className='mt-4'
                    onClick={() => mutate()}
                  >
                    Riprova
                  </AppleButton>
                </div>
              ) : isLoading ? (
                <div className='flex items-center justify-center py-12'>
                  <Loader2 className='h-8 w-8 animate-spin text-apple-blue' />
                </div>
              ) : workOrders.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <AlertCircle className='h-12 w-12 text-apple-gray/40 mb-4' />
                  <p className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>
                    Nessun ordine di lavoro. Crea il primo ordine.
                  </p>
                  <AppleButton
                    variant='ghost'
                    className='mt-4'
                    onClick={() => router.push('/dashboard/work-orders/new')}
                  >
                    Crea il primo ordine
                  </AppleButton>
                </div>
              ) : (
                <div className='overflow-x-auto'>
                  <table className='w-full'>
                    <thead>
                      <tr className='border-b border-apple-border/20 dark:border-[var(--border-default)]'>
                        <th className='text-left py-3 px-3 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]'>N. OdL</th>
                        <th className='text-left py-3 px-3 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]'>Cliente / Veicolo</th>
                        <th className='text-center py-3 px-3 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]'>Priorità</th>
                        <th className='text-center py-3 px-3 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]'>Stato</th>
                        <th className='text-right py-3 px-3 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]'>Importo</th>
                        <th className='text-right py-3 px-3 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]'>Data</th>
                        <th className='text-right py-3 px-3 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]'>Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workOrders.map((wo) => {
                        const status = statusConfig[wo.status] || statusConfig.DRAFT;
                        const priority = PRIORITY_CONFIG[wo.priority || 'NORMAL'] || PRIORITY_CONFIG.NORMAL;
                        const nextStatus = NEXT_STATUS[wo.status];
                        const nextLabel = nextStatus ? statusConfig[nextStatus]?.label : null;
                        return (
                          <tr
                            key={wo.id}
                            className='border-b border-apple-border/10 dark:border-[var(--border-default)]/50 hover:bg-apple-light-gray/30 dark:hover:bg-[var(--surface-hover)] transition-colors cursor-pointer'
                            onClick={() => router.push(`/dashboard/work-orders/${wo.id}`)}
                          >
                            <td className='py-3.5 px-3'>
                              <p className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                                {wo.woNumber || `#${wo.id.slice(0, 8)}`}
                              </p>
                            </td>
                            <td className='py-3.5 px-3'>
                              <p className='text-body text-apple-dark dark:text-[var(--text-primary)]'>
                                {wo.customerName || 'Cliente'}
                              </p>
                              <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                                {wo.vehiclePlate}{wo.vehicleMake ? ` · ${wo.vehicleMake} ${wo.vehicleModel || ''}` : ''}
                              </p>
                            </td>
                            <td className='py-3.5 px-3 text-center'>
                              <span className={`inline-flex text-footnote font-medium px-2.5 py-1 rounded-full ${priority.bg} ${priority.color}`}>
                                {priority.label}
                              </span>
                            </td>
                            <td className='py-3.5 px-3 text-center'>
                              <span className={`inline-flex text-footnote font-medium px-2.5 py-1 rounded-full ${status.bg} ${status.color}`}>
                                {status.label}
                              </span>
                            </td>
                            <td className='py-3.5 px-3 text-right'>
                              <p className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)] tabular-nums'>
                                {formatCurrency(wo.totalCost)}
                              </p>
                            </td>
                            <td className='py-3.5 px-3 text-right'>
                              <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)] tabular-nums'>
                                {new Date(wo.createdAt).toLocaleDateString('it-IT')}
                              </p>
                            </td>
                            <td className='py-3.5 px-3 text-right' onClick={(e) => e.stopPropagation()}>
                              <div className='flex items-center justify-end gap-2'>
                                <AppleButton
                                  variant='ghost'
                                  size='sm'
                                  icon={<Eye className='h-3.5 w-3.5' />}
                                  onClick={() => router.push(`/dashboard/work-orders/${wo.id}`)}
                                >
                                  Visualizza
                                </AppleButton>
                                {nextStatus && nextLabel && (
                                  <AppleButton
                                    variant='secondary'
                                    size='sm'
                                    icon={<PlayCircle className='h-3.5 w-3.5' />}
                                    loading={actionLoading === wo.id}
                                    onClick={() => handleChangeStatus(wo.id, nextStatus)}
                                  >
                                    {nextLabel}
                                  </AppleButton>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className='mt-4'>
                    <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                  </div>
                </div>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
