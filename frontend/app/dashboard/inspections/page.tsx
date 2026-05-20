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
  ClipboardCheck,
  Plus,
  Search,
  Filter,
  Loader2,
  Eye,
  Trash2,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface InspectionItem {
  id: string;
  plate: string;
  vehicle: string;
  customer: string;
  technician: string;
  type: string;
  status: string;
  date: string;
  itemCount: number;
  maxSeverity: string;
}

const severityConfig: Record<string, { color: string; bg: string; label: string }> = {
  CRITICO: {
    color: 'text-[var(--status-error)] dark:text-[var(--status-error)]',
    bg: 'bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)]',
    label: 'Critico',
  },
  ALTO: {
    color: 'text-[var(--status-warning)] dark:text-[var(--status-warning)]',
    bg: 'bg-[var(--status-warning)]/10 dark:bg-[var(--status-warning-subtle)]',
    label: 'Alto',
  },
  MEDIO: {
    color: 'text-[var(--status-warning)] dark:text-[var(--status-warning)]',
    bg: 'bg-[var(--status-warning)]/20 dark:bg-[var(--status-warning-subtle)]',
    label: 'Medio',
  },
  BASSO: {
    color: 'text-[var(--status-info)] dark:text-[var(--status-info)]',
    bg: 'bg-[var(--status-info-subtle)] dark:bg-[var(--status-info-subtle)]',
    label: 'Basso',
  },
  OK: {
    color: 'text-[var(--status-success)] dark:text-[var(--status-success)]',
    bg: 'bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)]',
    label: 'OK',
  },
};

type SeverityFilter = 'ALL' | 'CRITICO' | 'ALTO' | 'MEDIO' | 'BASSO' | 'OK';

const severityFilterOptions: { value: SeverityFilter; label: string }[] = [
  { value: 'ALL', label: 'Tutte le gravità' },
  { value: 'CRITICO', label: 'Critico' },
  { value: 'ALTO', label: 'Alto' },
  { value: 'MEDIO', label: 'Medio' },
  { value: 'BASSO', label: 'Basso' },
  { value: 'OK', label: 'OK' },
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

export default function InspectionsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const {
    data: rawData,
    error: inspectionsError,
    isLoading,
    mutate,
  } = useSWR<Record<string, unknown>>('/api/inspections', fetcher);

  const inspections: InspectionItem[] = (() => {
    const data = rawData?.data || rawData || [];
    return Array.isArray(data)
      ? data.map((i: Record<string, unknown>) => ({
          id: (i.id as string) || '',
          plate: (i.vehiclePlate as string) || (i.plate as string) || '',
          vehicle: (i.vehicleName as string) || (i.vehicle as string) || '',
          customer: (i.customerName as string) || (i.customer as string) || '',
          technician: (i.inspectorName as string) || (i.mechanicName as string) || (i.technician as string) || '',
          type: (i.type as string) || (i.inspectionType as string) || '',
          status: (i.status as string) || 'pending',
          date: i.createdAt ? new Date(i.createdAt as string).toLocaleDateString('it-IT') : '',
          itemCount: (i.itemCount as number) || (Array.isArray(i.items) ? (i.items as unknown[]).length : 0),
          maxSeverity: (i.maxSeverity as string) || (i.severity as string) || 'OK',
        }))
      : [];
  })();

  const filteredInspections = inspections.filter(inspection => {
    const matchesSearch =
      !searchQuery ||
      inspection.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspection.vehicle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspection.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspection.technician.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspection.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'ALL' || inspection.maxSeverity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/inspections/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Errore eliminazione');
      mutate();
      toast.success('Ispezione eliminata');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore eliminazione');
    } finally {
      setDeleteId(null);
    }
  };

  const statCounts = {
    total: inspections.length,
    critico: inspections.filter(i => i.maxSeverity === 'CRITICO').length,
    alto: inspections.filter(i => i.maxSeverity === 'ALTO').length,
    ok: inspections.filter(i => i.maxSeverity === 'OK').length,
  };

  const statCards = [
    {
      label: 'Totale Ispezioni',
      value: String(statCounts.total),
      icon: ClipboardCheck,
      color: 'bg-[var(--brand)]',
    },
    {
      label: 'Critiche',
      value: String(statCounts.critico),
      icon: ShieldAlert,
      color: 'bg-[var(--status-warning)]',
    },
    {
      label: 'Gravità Alta',
      value: String(statCounts.alto),
      icon: AlertTriangle,
      color: 'bg-[var(--status-success)]',
    },
    {
      label: 'Tutto OK',
      value: String(statCounts.ok),
      icon: ShieldCheck,
      color: 'bg-[var(--brand)]',
    },
  ];

  return (
    <div>
      {/* Header */}
      <header>
        <div className='px-8 py-5 flex items-center justify-between'>
          <div>
            <h1 className='text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Ispezioni</h1>
            <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1'>
              Gestione ispezioni veicoli
            </p>
          </div>
          <AppleButton
            icon={<Plus className='h-4 w-4' />}
            onClick={() => router.push('/dashboard/inspections/new')}
          >
            Nuova Ispezione
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
                    placeholder='Cerca per targa, veicolo, cliente o tecnico...'
                    aria-label='Cerca ispezioni'
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                    className='pl-10'
                  />
                </div>
                <div className='relative'>
                  <Filter className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)] pointer-events-none' />
                  <select
                    value={severityFilter}
                    onChange={e => { setSeverityFilter(e.target.value as SeverityFilter); setPage(1); }}
                    className='h-10 pl-10 pr-4 rounded-md border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue appearance-none cursor-pointer'
                  >
                    {severityFilterOptions.map(opt => (
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

        {/* Inspections List */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Elenco Ispezioni
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              {inspectionsError ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <AlertCircle className='h-12 w-12 text-[var(--status-error)]/40 mb-4' />
                  <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                    Impossibile caricare le ispezioni
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
                  <Loader2 className='h-8 w-8 animate-spin text-[var(--brand)]' />
                </div>
              ) : filteredInspections.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <AlertCircle className='h-12 w-12 text-[var(--text-tertiary)]/40 mb-4' />
                  <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                    Nessuna ispezione trovata. Crea la prima ispezione.
                  </p>
                  <AppleButton
                    variant='ghost'
                    className='mt-4'
                    onClick={() => router.push('/dashboard/inspections/new')}
                  >
                    Crea la prima ispezione
                  </AppleButton>
                </div>
              ) : (
                <motion.div
                  className='space-y-3'
                  variants={containerVariants}
                  initial='hidden'
                  animate='visible'
                >
                  {filteredInspections.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((inspection, index) => {
                    const sev = severityConfig[inspection.maxSeverity] || severityConfig.OK;
                    return (
                      <motion.div
                        key={inspection.id}
                        className='flex items-center justify-between p-4 rounded-2xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-active)] hover:shadow-apple transition-all duration-300'
                        variants={listItemVariants}
                        custom={index}
                        whileHover={{ scale: 1.005, x: 4 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className='flex items-center gap-4'>
                          <div className='w-12 h-12 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center'>
                            <ClipboardCheck className='h-6 w-6 text-[var(--brand)]' />
                          </div>
                          <div>
                            <p className='text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                              {inspection.vehicle || inspection.plate}
                            </p>
                            <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                              #{inspection.id.slice(0, 8)} &bull; {inspection.plate} &bull; {inspection.customer}
                              {inspection.technician && ` &bull; ${inspection.technician}`}
                            </p>
                          </div>
                        </div>
                        <div className='flex items-center gap-4'>
                          <span
                            className={`text-footnote font-semibold px-2.5 py-1 rounded-full ${sev.bg} ${sev.color}`}
                          >
                            {sev.label}
                          </span>
                          <p className='text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] min-w-[80px] text-right'>
                            {inspection.itemCount} elementi
                          </p>
                          <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] min-w-[80px] text-right'>
                            {inspection.date}
                          </p>
                          <div className='flex items-center gap-2'>
                            <AppleButton
                              variant='ghost'
                              size='sm'
                              icon={<Eye className='h-3.5 w-3.5' />}
                              onClick={() => router.push(`/dashboard/inspections/${inspection.id}`)}
                            >
                              Visualizza
                            </AppleButton>
                            <AppleButton
                              variant='ghost'
                              size='sm'
                              icon={<Trash2 className='h-3.5 w-3.5' />}
                              onClick={() => setDeleteId(inspection.id)}
                            >
                              Elimina
                            </AppleButton>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  <Pagination page={page} totalPages={Math.ceil(filteredInspections.length / PAGE_SIZE)} onPageChange={setPage} />
                </motion.div>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </motion.div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={open => { if (!open) setDeleteId(null); }}
        title="Elimina ispezione"
        description="Sei sicuro di voler eliminare questa ispezione? Questa azione non può essere annullata."
        confirmLabel="Elimina"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}
