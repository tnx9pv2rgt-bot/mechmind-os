'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Plus,
  Zap,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Pencil,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { toast } from 'sonner';

interface WorkflowSummary {
  id: string;
  name: string;
  description: string;
  triggerType: string;
  actionsCount: number;
  enabled: boolean;
  lastRun?: string;
  runCount: number;
  status: 'active' | 'paused' | 'error';
}

const TRIGGER_LABELS: Record<string, string> = {
  work_order_status: 'Ordine di lavoro cambia stato',
  booking_created: 'Nuova prenotazione',
  invoice_overdue: 'Fattura scaduta',
  warranty_expiring: 'Garanzia in scadenza',
  vehicle_maintenance: 'Manutenzione veicolo',
  new_customer: 'Nuovo cliente',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
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

export default function WorkflowsPage(): React.ReactElement {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const res = await fetch('/api/workflows', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setWorkflows(data.data ?? []);
        }
      } catch {
        // Non-critical
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const toggleWorkflow = async (id: string, enabled: boolean): Promise<void> => {
    try {
      await fetch(`/api/workflows/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled: !enabled }),
      });
      setWorkflows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, enabled: !enabled } : w))
      );
      toast.success(enabled ? 'Workflow disattivato' : 'Workflow attivato');
    } catch {
      toast.error('Errore nell\'aggiornamento');
    }
  };

  return (
    <div>
      {/* Header */}
      <header className=''>
        <div className='px-8 py-5 flex items-center justify-between'>
          <div>
            <h1 className='text-headline text-apple-dark dark:text-[var(--text-primary)]'>Automazioni</h1>
            <p className='text-apple-gray dark:text-[var(--text-secondary)] text-body mt-1'>
              Crea workflow automatici per la tua officina
            </p>
          </div>
          <AppleButton
            icon={<Plus className='h-4 w-4' />}
            onClick={() => router.push('/dashboard/workflows/new')}
          >
            Nuovo Workflow
          </AppleButton>
        </div>
      </header>

      <motion.div
        className='p-8 space-y-6'
        initial='hidden'
        animate='visible'
        variants={containerVariants}
      >
        {/* Workflows List */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                Elenco Workflow
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              {isLoading ? (
                <div className='flex items-center justify-center py-12'>
                  <Loader2 className='h-8 w-8 animate-spin text-apple-blue' />
                </div>
              ) : workflows.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <AlertCircle className='h-12 w-12 text-apple-gray/40 mb-4' />
                  <p className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>
                    Nessun workflow. Crea il tuo primo workflow per automatizzare le operazioni.
                  </p>
                  <AppleButton
                    variant='ghost'
                    className='mt-4'
                    onClick={() => router.push('/dashboard/workflows/new')}
                  >
                    Crea Workflow
                  </AppleButton>
                </div>
              ) : (
                <motion.div
                  className='space-y-3'
                  variants={containerVariants}
                  initial='hidden'
                  animate='visible'
                >
                  {workflows.map((workflow, index) => (
                    <motion.div
                      key={workflow.id}
                      className='flex items-center justify-between p-4 rounded-2xl bg-apple-light-gray/30 dark:bg-[var(--surface-hover)] hover:bg-white dark:hover:bg-[var(--surface-active)] hover:shadow-apple transition-all duration-300'
                      variants={listItemVariants}
                      custom={index}
                      whileHover={{ scale: 1.005, x: 4 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className='flex items-center gap-4'>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          workflow.enabled
                            ? 'bg-apple-green/10'
                            : 'bg-apple-light-gray/50 dark:bg-[var(--surface-active)]'
                        }`}>
                          <Zap className={`h-6 w-6 ${
                            workflow.enabled
                              ? 'text-apple-green'
                              : 'text-apple-gray'
                          }`} />
                        </div>
                        <div>
                          <div className='flex items-center gap-2'>
                            <p className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                              {workflow.name}
                            </p>
                            {workflow.status === 'error' && (
                              <AlertCircle className='h-4 w-4 text-apple-red' />
                            )}
                          </div>
                          <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                            {TRIGGER_LABELS[workflow.triggerType] ?? workflow.triggerType} &rarr; {workflow.actionsCount} azioni
                          </p>
                        </div>
                      </div>

                      <div className='flex items-center gap-4'>
                        <div className='text-right hidden sm:block'>
                          <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                            <CheckCircle2 className='h-3 w-3 inline mr-1' />
                            {workflow.runCount} esecuzioni
                          </p>
                          {workflow.lastRun && (
                            <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                              <Clock className='h-3 w-3 inline mr-1' />
                              Ultimo: {new Date(workflow.lastRun).toLocaleDateString('it-IT')}
                            </p>
                          )}
                        </div>

                        <AppleButton
                          variant='ghost'
                          size='sm'
                          onClick={() => toggleWorkflow(workflow.id, workflow.enabled)}
                          aria-label={workflow.enabled ? 'Disattiva' : 'Attiva'}
                          icon={workflow.enabled
                            ? <ToggleRight className='h-5 w-5 text-apple-green' />
                            : <ToggleLeft className='h-5 w-5 text-apple-gray' />
                          }
                        />

                        <AppleButton
                          variant='ghost'
                          size='sm'
                          onClick={() => router.push(`/dashboard/workflows/${workflow.id}`)}
                          aria-label='Modifica'
                          icon={<Pencil className='h-4 w-4' />}
                        />
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
