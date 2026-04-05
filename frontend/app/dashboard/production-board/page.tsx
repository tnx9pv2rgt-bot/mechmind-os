'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { motion, AnimatePresence } from 'framer-motion';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  Euro,
  Car,
  User,
  Timer,
  Loader2,
  Play,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface JobCard {
  id: string;
  vehiclePlate: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  customerName: string;
  serviceDescription: string;
  technician?: string;
  startedAt?: string;
  estimatedMinutes?: number;
  status: 'queued' | 'in_progress' | 'paused' | 'completed' | 'overdue';
}

interface Bay {
  id: string;
  name: string;
  status: 'available' | 'occupied' | 'maintenance';
  jobs: JobCard[];
}

interface ProductionBoardData {
  bays: Bay[];
  unassignedJobs: JobCard[];
  kpis: {
    completed: number;
    inProgress: number;
    queued: number;
    revenueToday: number;
  };
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------
const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  queued: {
    label: 'In attesa',
    color: 'text-apple-dark dark:text-[var(--text-primary)]',
    bg: 'bg-apple-light-gray dark:bg-[var(--surface-active)]',
  },
  in_progress: {
    label: 'In corso',
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-100 dark:bg-blue-900/40',
  },
  paused: {
    label: 'In pausa',
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-100 dark:bg-amber-900/40',
  },
  completed: {
    label: 'Completato',
    color: 'text-apple-green dark:text-apple-green',
    bg: 'bg-green-100 dark:bg-green-900/40',
  },
  overdue: {
    label: 'In ritardo',
    color: 'text-apple-red dark:text-apple-red',
    bg: 'bg-red-100 dark:bg-red-900/40',
  },
};

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ProductionBoardPage() {
  const { data, error, isLoading, mutate } = useSWR<ProductionBoardData>(
    '/api/production-board',
    fetcher,
    { refreshInterval: 10_000, revalidateOnFocus: true }
  );

  const [draggedJob, setDraggedJob] = useState<string | null>(null);

  const handleAssign = useCallback(
    async (jobId: string, bayId: string): Promise<void> => {
      try {
        const res = await fetch('/api/production-board', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ jobId, bayId }),
        });

        if (!res.ok) {
          toast.error('Errore nell\'assegnazione del lavoro.');
          return;
        }

        toast.success('Lavoro assegnato alla postazione.');
        mutate();
      } catch {
        toast.error('Errore di connessione.');
      }
    },
    [mutate]
  );

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div>
        <header className="">
          <div className="px-8 py-5">
            <h1 className="text-headline text-apple-dark dark:text-[var(--text-primary)]">Production Board</h1>
            <p className="text-apple-gray dark:text-[var(--text-secondary)] text-body mt-1">Gestione postazioni in tempo reale</p>
          </div>
        </header>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-apple-blue" />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Error
  // ---------------------------------------------------------------------------
  if (error) {
    return (
      <div>
        <header className="">
          <div className="px-8 py-5">
            <h1 className="text-headline text-apple-dark dark:text-[var(--text-primary)]">Production Board</h1>
            <p className="text-apple-gray dark:text-[var(--text-secondary)] text-body mt-1">Gestione postazioni in tempo reale</p>
          </div>
        </header>
        <div className="p-8">
          <AppleCard hover={false}>
            <AppleCardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-apple-red/40 mb-4" />
                <p className="text-body text-apple-gray dark:text-[var(--text-secondary)]">
                  Errore nel caricamento
                </p>
                <AppleButton
                  variant="ghost"
                  className="mt-4"
                  icon={<RefreshCw className="h-4 w-4" />}
                  onClick={() => mutate()}
                >
                  Riprova
                </AppleButton>
              </div>
            </AppleCardContent>
          </AppleCard>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Empty
  // ---------------------------------------------------------------------------
  if (!data) {
    return (
      <div>
        <header className="">
          <div className="px-8 py-5">
            <h1 className="text-headline text-apple-dark dark:text-[var(--text-primary)]">Production Board</h1>
            <p className="text-apple-gray dark:text-[var(--text-secondary)] text-body mt-1">Gestione postazioni in tempo reale</p>
          </div>
        </header>
        <div className="p-8">
          <AppleCard hover={false}>
            <AppleCardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Wrench className="h-12 w-12 text-apple-gray/40 mb-4" />
                <p className="text-body text-apple-gray dark:text-[var(--text-secondary)]">
                  Nessun dato disponibile
                </p>
              </div>
            </AppleCardContent>
          </AppleCard>
        </div>
      </div>
    );
  }

  const { bays, unassignedJobs, kpis } = data;

  const statCards = [
    { label: 'Completati oggi', value: kpis.completed.toString(), icon: CheckCircle2, color: 'bg-apple-green' },
    { label: 'In corso', value: kpis.inProgress.toString(), icon: Play, color: 'bg-apple-blue' },
    { label: 'In attesa', value: kpis.queued.toString(), icon: Clock, color: 'bg-apple-orange' },
    { label: 'Revenue oggi', value: formatCurrency(kpis.revenueToday), icon: Euro, color: 'bg-apple-green' },
  ];

  // ---------------------------------------------------------------------------
  // Main
  // ---------------------------------------------------------------------------
  return (
    <div>
      {/* Header */}
      <header className="">
        <div className="px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-headline text-apple-dark dark:text-[var(--text-primary)]">Production Board</h1>
            <p className="text-apple-gray dark:text-[var(--text-secondary)] text-body mt-1">
              Gestione postazioni in tempo reale
            </p>
          </div>
          <AppleButton
            variant="ghost"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={() => mutate()}
          >
            Aggiorna
          </AppleButton>
        </div>
      </header>

      <motion.div
        className="p-8 space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* KPI Bar */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-bento"
          variants={containerVariants}
        >
          {statCards.map(stat => (
            <motion.div key={stat.label} variants={itemVariants}>
              <AppleCard hover={false}>
                <AppleCardContent>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                      <stat.icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <p className="text-title-1 font-bold text-apple-dark dark:text-[var(--text-primary)]">
                    {stat.value}
                  </p>
                  <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)]">{stat.label}</p>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Unassigned Jobs Queue */}
        {unassignedJobs.length > 0 && (
          <motion.div variants={listItemVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <h2 className="text-title-2 font-semibold text-apple-orange flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Lavori non assegnati ({unassignedJobs.length})
                </h2>
              </AppleCardHeader>
              <AppleCardContent>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
                  {unassignedJobs.map(job => (
                    <div
                      key={job.id}
                      draggable
                      onDragStart={() => setDraggedJob(job.id)}
                      onDragEnd={() => setDraggedJob(null)}
                      className="flex-shrink-0 w-64 snap-start"
                    >
                      <JobCardComponent job={job} compact />
                    </div>
                  ))}
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        )}

        {/* Kanban Columns = Bays */}
        <motion.div
          variants={listItemVariants}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4"
        >
          {bays.map(bay => (
            <BayColumn
              key={bay.id}
              bay={bay}
              draggedJob={draggedJob}
              onDrop={(jobId) => handleAssign(jobId, bay.id)}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function BayColumn({
  bay,
  draggedJob,
  onDrop,
}: {
  bay: Bay;
  draggedJob: string | null;
  onDrop: (jobId: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  const bayStatusColor =
    bay.status === 'available'
      ? 'bg-apple-green'
      : bay.status === 'occupied'
        ? 'bg-apple-blue'
        : 'bg-apple-gray';

  return (
    <div
      onDragOver={e => {
        e.preventDefault();
        if (draggedJob) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        e.preventDefault();
        setDragOver(false);
        if (draggedJob) onDrop(draggedJob);
      }}
    >
      <AppleCard
        hover={false}
        className={`min-h-[200px] transition-colors ${
          dragOver ? 'ring-2 ring-apple-blue' : ''
        }`}
      >
        {/* Bay Header */}
        <div className="px-4 py-3 border-b border-apple-border/20 dark:border-[var(--border-default)]/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${bayStatusColor}`} />
            <h3 className="text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]">{bay.name}</h3>
          </div>
          <span className="text-footnote text-apple-gray dark:text-[var(--text-secondary)]">
            {bay.jobs.length} {bay.jobs.length === 1 ? 'lavoro' : 'lavori'}
          </span>
        </div>

        {/* Jobs in bay */}
        <div className="p-3 space-y-2">
          {bay.jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-apple-gray dark:text-[var(--text-secondary)]">
              <Wrench className="w-6 h-6 mb-2 opacity-50" />
              <p className="text-footnote">Postazione libera</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {bay.jobs.map(job => (
                <motion.div
                  key={job.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <JobCardComponent job={job} />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </AppleCard>
    </div>
  );
}

function JobCardComponent({ job, compact = false }: { job: JobCard; compact?: boolean }) {
  const [elapsed, setElapsed] = useState('');
  const config = statusConfig[job.status] || statusConfig.queued;

  // Auto-updating elapsed time
  useEffect(() => {
    if (!job.startedAt) return;

    function updateElapsed(): void {
      if (!job.startedAt) return;
      const start = new Date(job.startedAt).getTime();
      const now = Date.now();
      const diffMin = Math.floor((now - start) / 60_000);
      const hours = Math.floor(diffMin / 60);
      const mins = diffMin % 60;
      setElapsed(hours > 0 ? `${hours}h ${mins}m` : `${mins}m`);
    }

    updateElapsed();
    const interval = setInterval(updateElapsed, 30_000);
    return () => clearInterval(interval);
  }, [job.startedAt]);

  // Time status color
  const isOverdue =
    job.estimatedMinutes &&
    job.startedAt &&
    Date.now() - new Date(job.startedAt).getTime() > job.estimatedMinutes * 60_000;
  const isBehind =
    !isOverdue &&
    job.estimatedMinutes &&
    job.startedAt &&
    Date.now() - new Date(job.startedAt).getTime() > job.estimatedMinutes * 60_000 * 0.8;

  const timeColor = isOverdue
    ? 'text-apple-red'
    : isBehind
      ? 'text-apple-orange'
      : 'text-apple-green';

  return (
    <div
      className="rounded-2xl border border-apple-border/20 dark:border-[var(--border-default)]/50 p-3 bg-white dark:bg-[var(--surface-primary)]
                  hover:bg-apple-light-gray/30 dark:hover:bg-[var(--surface-hover)] transition-all duration-300 cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Car className="w-3.5 h-3.5 text-apple-gray flex-shrink-0" />
            <span className="text-body font-bold text-apple-dark dark:text-[var(--text-primary)] truncate">
              {job.vehiclePlate}
            </span>
            <span className={`text-footnote font-semibold px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
              {config.label}
            </span>
          </div>
          <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)] mt-1 truncate">
            {job.serviceDescription}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2 text-footnote text-apple-gray dark:text-[var(--text-secondary)]">
        <div className="flex items-center gap-1 truncate">
          <User className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">
            {job.customerName.length > 15
              ? job.customerName.substring(0, 15) + '...'
              : job.customerName}
          </span>
        </div>
        {elapsed && (
          <div className={`flex items-center gap-1 flex-shrink-0 ${timeColor}`}>
            <Timer className="w-3 h-3" />
            <span className="font-medium">{elapsed}</span>
          </div>
        )}
      </div>

      {job.technician && (
        <div className="flex items-center gap-1 mt-1.5 text-footnote text-apple-gray dark:text-[var(--text-secondary)]">
          <Wrench className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{job.technician}</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}
