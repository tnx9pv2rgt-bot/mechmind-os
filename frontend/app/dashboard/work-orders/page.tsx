'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import {
  ClipboardList,
  Plus,
  Wrench,
  CheckCircle,
  Search,
  Filter,
  Loader2,
  Eye,
  Play,
  FileText,
  AlertCircle,
  Activity,
} from 'lucide-react';

interface WorkOrder {
  id: string;
  woNumber: string;
  vehicleMake: string;
  vehicleModel: string;
  vehiclePlate: string;
  customerName: string;
  status: WorkOrderStatus;
  totalCost: number;
  createdAt: string;
}

type WorkOrderStatus =
  | 'OPEN'
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'WAITING_PARTS'
  | 'READY'
  | 'COMPLETED'
  | 'INVOICED';

type StatusFilterValue = 'ALL' | WorkOrderStatus;

const statusConfig: Record<WorkOrderStatus, { color: string; bg: string; label: string }> = {
  OPEN: {
    color: 'text-gray-700 dark:text-gray-300',
    bg: 'bg-gray-200 dark:bg-gray-700',
    label: 'Aperto',
  },
  PENDING: {
    color: 'text-yellow-700 dark:text-yellow-300',
    bg: 'bg-yellow-100 dark:bg-yellow-900/40',
    label: 'In Attesa',
  },
  IN_PROGRESS: {
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    label: 'In Lavorazione',
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
  COMPLETED: {
    color: 'text-purple-700 dark:text-purple-300',
    bg: 'bg-purple-100 dark:bg-purple-900/40',
    label: 'Completato',
  },
  INVOICED: {
    color: 'text-teal-700 dark:text-teal-300',
    bg: 'bg-teal-100 dark:bg-teal-900/40',
    label: 'Fatturato',
  },
};

const statusOptions: { value: StatusFilterValue; label: string }[] = [
  { value: 'ALL', label: 'Tutti gli stati' },
  { value: 'OPEN', label: 'Aperto' },
  { value: 'PENDING', label: 'In Attesa' },
  { value: 'IN_PROGRESS', label: 'In Lavorazione' },
  { value: 'WAITING_PARTS', label: 'Attesa Ricambi' },
  { value: 'READY', label: 'Pronto' },
  { value: 'COMPLETED', label: 'Completato' },
  { value: 'INVOICED', label: 'Fatturato' },
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

export default function WorkOrdersPage() {
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setIsLoading(true);
    fetch('/api/work-orders')
      .then(r => r.json())
      .then(res => {
        const list = res.data || res || [];
        setWorkOrders(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        setWorkOrders([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStart = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/work-orders/${id}/start`, { method: 'POST' });
      if (!res.ok) throw new Error('Errore avvio');
      fetchData();
    } catch {
      // silent
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/work-orders/${id}/complete`, { method: 'POST' });
      if (!res.ok) throw new Error('Errore completamento');
      fetchData();
    } catch {
      // silent
    } finally {
      setActionLoading(null);
    }
  };

  const handleInvoice = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/work-orders/${id}/invoice`, { method: 'POST' });
      if (!res.ok) throw new Error('Errore fatturazione');
      fetchData();
    } catch {
      // silent
    } finally {
      setActionLoading(null);
    }
  };

  const filteredWorkOrders = workOrders.filter(wo => {
    const matchesSearch =
      !searchQuery ||
      wo.woNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.vehiclePlate?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || wo.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Compute stats client-side
  const activeCount = workOrders.filter(
    wo =>
      wo.status === 'OPEN' ||
      wo.status === 'PENDING' ||
      wo.status === 'IN_PROGRESS' ||
      wo.status === 'WAITING_PARTS' ||
      wo.status === 'READY'
  ).length;
  const inProgressCount = workOrders.filter(wo => wo.status === 'IN_PROGRESS').length;
  const completedCount = workOrders.filter(
    wo => wo.status === 'COMPLETED' || wo.status === 'INVOICED'
  ).length;
  const totalCount = workOrders.length;

  const statCards = [
    {
      label: 'Attivi',
      value: String(activeCount),
      icon: Activity,
      color: 'bg-apple-blue',
    },
    {
      label: 'In Lavorazione',
      value: String(inProgressCount),
      icon: Wrench,
      color: 'bg-apple-orange',
    },
    {
      label: 'Completati',
      value: String(completedCount),
      icon: CheckCircle,
      color: 'bg-apple-green',
    },
    {
      label: 'Totale',
      value: String(totalCount),
      icon: ClipboardList,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div>
      {/* Header */}
      <header className='bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-b border-apple-border/20 dark:border-[#424242]/50'>
        <div className='px-8 py-5 flex items-center justify-between'>
          <div>
            <h1 className='text-headline text-apple-dark dark:text-[#ececec]'>Ordini di Lavoro</h1>
            <p className='text-apple-gray dark:text-[#636366] text-body mt-1'>
              Gestisci le lavorazioni della tua officina
            </p>
          </div>
          <AppleButton
            icon={<Plus className='h-4 w-4' />}
            onClick={() => router.push('/dashboard/work-orders/new')}
          >
            Nuovo Ordine
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
          className='grid grid-cols-1 sm:grid-cols-4 gap-bento'
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
                  <p className='text-title-1 font-bold text-apple-dark dark:text-[#ececec]'>
                    {isLoading ? '...' : stat.value}
                  </p>
                  <p className='text-footnote text-apple-gray dark:text-[#636366]'>{stat.label}</p>
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
                    placeholder='Cerca per numero ordine o targa veicolo...'
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className='pl-10'
                  />
                </div>
                <div className='relative'>
                  <Filter className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-apple-gray pointer-events-none' />
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as StatusFilterValue)}
                    className='h-10 pl-10 pr-4 rounded-md border border-gray-300 dark:border-[#424242] bg-white dark:bg-[#2f2f2f] text-sm text-gray-900 dark:text-[#ececec] focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none cursor-pointer'
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

        {/* Work Order List */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
                Elenco Ordini di Lavoro
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              {isLoading ? (
                <div className='flex items-center justify-center py-12'>
                  <Loader2 className='h-8 w-8 animate-spin text-apple-blue' />
                </div>
              ) : filteredWorkOrders.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <AlertCircle className='h-12 w-12 text-apple-gray/40 mb-4' />
                  <p className='text-body text-apple-gray dark:text-[#636366]'>
                    Nessun ordine di lavoro trovato
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
                <motion.div
                  className='space-y-3'
                  variants={containerVariants}
                  initial='hidden'
                  animate='visible'
                >
                  {filteredWorkOrders.map((wo, index) => {
                    const status = statusConfig[wo.status] || statusConfig.OPEN;
                    return (
                      <motion.div
                        key={wo.id}
                        className='flex items-center justify-between p-4 rounded-2xl bg-apple-light-gray/30 dark:bg-[#353535] hover:bg-white dark:hover:bg-[#3a3a3a] hover:shadow-apple transition-all duration-300'
                        variants={listItemVariants}
                        custom={index}
                        whileHover={{ scale: 1.005, x: 4 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className='flex items-center gap-4'>
                          <div className='w-12 h-12 rounded-xl bg-apple-blue/10 flex items-center justify-center'>
                            <ClipboardList className='h-6 w-6 text-apple-blue' />
                          </div>
                          <div>
                            <p className='text-body font-semibold text-apple-dark dark:text-[#ececec]'>
                              {wo.woNumber}
                            </p>
                            <p className='text-footnote text-apple-gray dark:text-[#636366]'>
                              {wo.vehicleMake} {wo.vehicleModel} &bull; {wo.vehiclePlate}
                            </p>
                          </div>
                        </div>
                        <div className='flex items-center gap-4'>
                          <span
                            className={`text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full ${status.bg} ${status.color}`}
                          >
                            {status.label}
                          </span>
                          <p className='text-body font-semibold text-apple-dark dark:text-[#ececec] min-w-[100px] text-right'>
                            {formatCurrency(wo.totalCost ?? 0)}
                          </p>
                          <div className='flex items-center gap-2'>
                            <AppleButton
                              variant='ghost'
                              size='sm'
                              icon={<Eye className='h-3.5 w-3.5' />}
                              onClick={() => router.push(`/dashboard/work-orders/${wo.id}`)}
                            >
                              Visualizza
                            </AppleButton>
                            {(wo.status === 'PENDING' || wo.status === 'OPEN') && (
                              <AppleButton
                                variant='secondary'
                                size='sm'
                                icon={<Play className='h-3.5 w-3.5' />}
                                loading={actionLoading === wo.id}
                                onClick={() => handleStart(wo.id)}
                              >
                                Avvia
                              </AppleButton>
                            )}
                            {wo.status === 'IN_PROGRESS' && (
                              <AppleButton
                                variant='secondary'
                                size='sm'
                                icon={<CheckCircle className='h-3.5 w-3.5' />}
                                loading={actionLoading === wo.id}
                                onClick={() => handleComplete(wo.id)}
                              >
                                Completa
                              </AppleButton>
                            )}
                            {(wo.status === 'COMPLETED' || wo.status === 'READY') && (
                              <AppleButton
                                variant='secondary'
                                size='sm'
                                icon={<FileText className='h-3.5 w-3.5' />}
                                loading={actionLoading === wo.id}
                                onClick={() => handleInvoice(wo.id)}
                              >
                                Fattura
                              </AppleButton>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
