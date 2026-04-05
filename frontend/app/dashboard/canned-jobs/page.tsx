'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { Pagination } from '@/components/ui/pagination';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import {
  Wrench,
  Plus,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  Edit,
  Trash2,
  Copy,
  X,
  Layers,
  Euro,
  Clock,
} from 'lucide-react';

interface CannedJobLine {
  id?: string;
  type: 'LABOR' | 'PART';
  description: string;
  quantity: number;
  unitPrice: number;
  laborHours: number;
}

interface CannedJob {
  id: string;
  name: string;
  description: string;
  category: string;
  lines: CannedJobLine[];
  totalPrice: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const cardVariants = {
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

const emptyLine: CannedJobLine = {
  type: 'LABOR',
  description: '',
  quantity: 1,
  unitPrice: 0,
  laborHours: 0,
};

const cannedJobLineSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['LABOR', 'PART']),
  description: z.string().min(1, 'Descrizione obbligatoria'),
  quantity: z.coerce.number().min(0, 'Quantità non valida'),
  unitPrice: z.coerce.number().min(0, 'Prezzo non valido'),
  laborHours: z.coerce.number().min(0, 'Ore non valide'),
});

const cannedJobSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Il nome del template è obbligatorio'),
  description: z.string().optional().default(''),
  category: z.string().min(1, 'La categoria è obbligatoria'),
  lines: z.array(cannedJobLineSchema).min(1, 'Aggiungi almeno una riga'),
});

type CannedJobFormData = z.infer<typeof cannedJobSchema>;

const categories = [
  'Tutte le categorie',
  'Manutenzione ordinaria',
  'Manutenzione straordinaria',
  'Carrozzeria',
  'Elettronica',
  'Pneumatici',
  'Climatizzazione',
  'Altro',
];

export default function CannedJobsPage() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Tutte le categorie');
  const [showModal, setShowModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    register: registerJob,
    handleSubmit: rhfHandleSubmit,
    reset: resetJobForm,
    watch: watchJob,
    control: jobControl,
    formState: { errors: jobErrors },
  } = useForm<CannedJobFormData>({
    resolver: zodResolver(cannedJobSchema),
    defaultValues: {
      name: '',
      description: '',
      category: 'Manutenzione ordinaria',
      lines: [{ ...emptyLine }],
    },
  });

  const { fields: lineFields, append: appendLine, remove: removeLine } = useFieldArray({
    control: jobControl,
    name: 'lines',
  });

  const editingJob = watchJob();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const {
    data: jobsData,
    error: jobsError,
    isLoading,
    mutate: mutateJobs,
  } = useSWR<{ data?: CannedJob[] } | CannedJob[]>('/api/canned-jobs', fetcher);

  // Auto-open create modal if ?action=create
  const actionParam = searchParams.get('action');
  useEffect(() => {
    if (actionParam === 'create') {
      resetJobForm({
        name: '',
        description: '',
        category: 'Manutenzione ordinaria',
        lines: [{ ...emptyLine }],
      });
      setShowModal(true);
    }
  }, [actionParam, resetJobForm]);

  const jobs: CannedJob[] = (() => {
    if (!jobsData) return [];
    const list = (jobsData as { data?: CannedJob[] }).data || jobsData || [];
    return Array.isArray(list) ? list : [];
  })();

  const filteredJobs = jobs.filter(job => {
    const matchesSearch =
      !searchQuery ||
      job.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === 'Tutte le categorie' || job.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const paginatedJobs = filteredJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const groupedJobs = paginatedJobs.reduce<Record<string, CannedJob[]>>((acc, job) => {
    const cat = job.category || 'Altro';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(job);
    return acc;
  }, {});

  const openCreateModal = () => {
    resetJobForm({
      name: '',
      description: '',
      category: 'Manutenzione ordinaria',
      lines: [{ ...emptyLine }],
    });
    setShowModal(true);
  };

  const openEditModal = (job: CannedJob) => {
    resetJobForm({
      id: job.id,
      name: job.name,
      description: job.description,
      category: job.category,
      lines: job.lines.length > 0 ? job.lines : [{ ...emptyLine }],
    });
    setShowModal(true);
  };

  const addLine = () => {
    appendLine({ ...emptyLine });
  };

  const handleSave = async (data: CannedJobFormData) => {
    setSaving(true);
    try {
      const method = data.id ? 'PUT' : 'POST';
      const url = data.id ? `/api/canned-jobs/${data.id}` : '/api/canned-jobs';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Errore salvataggio');
      mutateJobs();
      setShowModal(false);
      toast.success(data.id ? 'Template aggiornato' : 'Template creato con successo');
    } catch (error) {
      toast.error('Errore nel salvataggio', {
        description: error instanceof Error ? error.message : 'Errore sconosciuto',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/canned-jobs/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Errore eliminazione');
      mutateJobs();
      toast.success('Template eliminato');
    } catch (error) {
      toast.error('Errore nell\'eliminazione', {
        description: error instanceof Error ? error.message : 'Errore sconosciuto',
      });
    }
  };

  const handleApply = (jobId: string) => {
    setSelectedJobId(jobId);
    setShowApplyModal(true);
  };

  const modalTotalPrice = editingJob.lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0
  );

  return (
    <div>
      {/* Header */}
      <header className=''>
        <div className='px-8 py-5 flex items-center justify-between'>
          <div>
            <h1 className='text-headline text-apple-dark dark:text-[var(--text-primary)]'>Template Lavoro</h1>
            <p className='text-apple-gray dark:text-[var(--text-secondary)] text-body mt-1'>
              Modelli predefiniti per velocizzare preventivi e ordini di lavoro
            </p>
          </div>
          <AppleButton icon={<Plus className='h-4 w-4' />} onClick={openCreateModal}>
            Nuovo Template
          </AppleButton>
        </div>
      </header>

      <motion.div
        className='p-8 space-y-6'
        initial='hidden'
        animate='visible'
        variants={containerVariants}
      >
        {/* Filters */}
        <motion.div variants={cardVariants}>
          <AppleCard hover={false}>
            <AppleCardContent>
              <div className='flex flex-col sm:flex-row gap-4'>
                <div className='relative flex-1'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-apple-gray' />
                  <Input
                    placeholder='Cerca template per nome o descrizione...'
                    aria-label='Cerca template'
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className='pl-10'
                  />
                </div>
                <div className='relative'>
                  <Filter className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-apple-gray pointer-events-none' />
                  <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className='h-10 pl-10 pr-4 rounded-md border border-apple-border dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] text-body text-apple-dark dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue appearance-none cursor-pointer'
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Jobs List */}
        {jobsError ? (
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <AppleCardContent>
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <AlertCircle className='h-12 w-12 text-apple-red/40 mb-4' />
                  <p className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>
                    Impossibile caricare i template di lavoro
                  </p>
                  <AppleButton variant='ghost' className='mt-4' onClick={() => mutateJobs()}>
                    Riprova
                  </AppleButton>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        ) : isLoading ? (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='h-8 w-8 animate-spin text-apple-blue' />
          </div>
        ) : filteredJobs.length === 0 ? (
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <AppleCardContent>
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <AlertCircle className='h-12 w-12 text-apple-gray/40 mb-4' />
                  <p className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>
                    Nessun template. Crea il primo template per velocizzare i preventivi.
                  </p>
                  <AppleButton variant='ghost' className='mt-4' onClick={openCreateModal}>
                    Crea il primo template
                  </AppleButton>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        ) : (
          Object.entries(groupedJobs).map(([category, categoryJobs]) => (
            <motion.div key={category} variants={cardVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <div className='flex items-center gap-2'>
                    <Layers className='h-5 w-5 text-apple-blue' />
                    <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                      {category}
                    </h2>
                    <span className='text-footnote text-apple-gray dark:text-[var(--text-secondary)] ml-2'>
                      ({categoryJobs.length})
                    </span>
                  </div>
                </AppleCardHeader>
                <AppleCardContent>
                  <motion.div
                    className='space-y-3'
                    variants={containerVariants}
                    initial='hidden'
                    animate='visible'
                  >
                    {categoryJobs.map((job, index) => (
                      <motion.div
                        key={job.id}
                        className='flex items-center justify-between p-4 rounded-2xl bg-apple-light-gray/30 dark:bg-[var(--surface-hover)] hover:bg-white dark:hover:bg-[var(--surface-active)] hover:shadow-apple transition-all duration-300'
                        variants={listItemVariants}
                        custom={index}
                        whileHover={{ scale: 1.005, x: 4 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className='flex items-center gap-4'>
                          <div className='w-12 h-12 rounded-xl bg-apple-orange/10 flex items-center justify-center'>
                            <Wrench className='h-6 w-6 text-apple-orange' />
                          </div>
                          <div>
                            <p className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                              {job.name}
                            </p>
                            <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                              {job.description}
                            </p>
                            <div className='flex items-center gap-3 mt-1'>
                              <span className='text-footnote text-apple-gray dark:text-[var(--text-secondary)] flex items-center gap-1'>
                                <Layers className='h-3 w-3' /> {job.lines?.length || 0} righe
                              </span>
                              <span className='text-footnote text-apple-gray dark:text-[var(--text-secondary)] flex items-center gap-1'>
                                <Euro className='h-3 w-3' /> {formatCurrency(job.totalPrice)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className='flex items-center gap-2'>
                          <AppleButton
                            variant='ghost'
                            size='sm'
                            icon={<Copy className='h-3.5 w-3.5' />}
                            onClick={() => handleApply(job.id)}
                          >
                            Applica
                          </AppleButton>
                          <AppleButton
                            variant='ghost'
                            size='sm'
                            icon={<Edit className='h-3.5 w-3.5' />}
                            onClick={() => openEditModal(job)}
                          >
                            Modifica
                          </AppleButton>
                          <AppleButton
                            variant='ghost'
                            size='sm'
                            icon={<Trash2 className='h-3.5 w-3.5 text-apple-red' />}
                            onClick={() => setDeleteTarget(job.id)}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          ))
        )}
        <Pagination page={page} totalPages={Math.ceil(filteredJobs.length / PAGE_SIZE)} onPageChange={setPage} />
      </motion.div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className='w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[var(--surface-elevated)] rounded-2xl shadow-2xl p-6 m-4'
          >
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                {editingJob.id ? 'Modifica Template' : 'Nuovo Template'}
              </h2>
              <AppleButton variant='ghost' size='sm' onClick={() => setShowModal(false)} aria-label='Chiudi'>
                <X className='h-5 w-5 text-apple-gray' />
              </AppleButton>
            </div>

            <form onSubmit={rhfHandleSubmit(handleSave)} className='space-y-4'>
              <div>
                <label
                  htmlFor='job-name'
                  className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1 block'
                >
                  Nome *
                </label>
                <Input
                  id='job-name'
                  {...registerJob('name')}
                  placeholder='Es. Tagliando 30.000 km'
                />
                {jobErrors.name && <p className='text-footnote text-apple-red mt-1'>{jobErrors.name.message}</p>}
              </div>
              <div>
                <label
                  htmlFor='job-description'
                  className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1 block'
                >
                  Descrizione
                </label>
                <Input
                  id='job-description'
                  {...registerJob('description')}
                  placeholder='Descrizione del template'
                />
              </div>
              <div>
                <label
                  htmlFor='job-category'
                  className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1 block'
                >
                  Categoria
                </label>
                <select
                  id='job-category'
                  {...registerJob('category')}
                  className='w-full h-10 px-3 rounded-md border border-apple-border dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-hover)] text-body text-apple-dark dark:text-[var(--text-primary)]'
                >
                  {categories.slice(1).map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {jobErrors.category && <p className='text-footnote text-apple-red mt-1'>{jobErrors.category.message}</p>}
              </div>

              {/* Lines */}
              <div>
                <div className='flex items-center justify-between mb-3'>
                  <label className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                    Righe
                  </label>
                  <AppleButton
                    variant='ghost'
                    size='sm'
                    type='button'
                    icon={<Plus className='h-3.5 w-3.5' />}
                    onClick={addLine}
                  >
                    Aggiungi riga
                  </AppleButton>
                </div>
                {jobErrors.lines?.message && <p className='text-footnote text-apple-red mb-2'>{jobErrors.lines.message}</p>}
                <div className='space-y-3'>
                  {lineFields.map((field, i) => (
                    <div
                      key={field.id}
                      className='p-3 rounded-xl bg-apple-light-gray/30 dark:bg-[var(--surface-hover)] space-y-2'
                    >
                      <div className='flex items-center gap-2'>
                        <select
                          {...registerJob(`lines.${i}.type`)}
                          aria-label={`Tipo riga ${i + 1}`}
                          className='h-9 px-2 rounded-md border border-apple-border dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] text-footnote text-apple-dark dark:text-[var(--text-primary)]'
                        >
                          <option value='LABOR'>Manodopera</option>
                          <option value='PART'>Ricambio</option>
                        </select>
                        <div className='flex-1'>
                          <Input
                            placeholder='Descrizione'
                            {...registerJob(`lines.${i}.description`)}
                            className='flex-1 h-9 text-body'
                          />
                          {jobErrors.lines?.[i]?.description && (
                            <p className='text-footnote text-apple-red mt-0.5'>{jobErrors.lines[i].description?.message}</p>
                          )}
                        </div>
                        {lineFields.length > 1 && (
                          <AppleButton
                            variant='ghost'
                            size='sm'
                            type='button'
                            onClick={() => removeLine(i)}
                            aria-label={`Rimuovi riga ${i + 1}`}
                          >
                            <X className='h-4 w-4 text-apple-red' />
                          </AppleButton>
                        )}
                      </div>
                      <div className='flex items-center gap-2'>
                        <div className='flex-1'>
                          <label
                            htmlFor={`qty-${i}`}
                            className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'
                          >
                            Quantit&agrave;
                          </label>
                          <Input
                            id={`qty-${i}`}
                            type='number'
                            {...registerJob(`lines.${i}.quantity`, { valueAsNumber: true })}
                            className='h-9 text-body'
                          />
                          {jobErrors.lines?.[i]?.quantity && (
                            <p className='text-footnote text-apple-red mt-0.5'>{jobErrors.lines[i].quantity?.message}</p>
                          )}
                        </div>
                        <div className='flex-1'>
                          <label
                            htmlFor={`price-${i}`}
                            className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'
                          >
                            Prezzo unit.
                          </label>
                          <Input
                            id={`price-${i}`}
                            type='number'
                            step='0.01'
                            {...registerJob(`lines.${i}.unitPrice`, { valueAsNumber: true })}
                            className='h-9 text-body'
                          />
                          {jobErrors.lines?.[i]?.unitPrice && (
                            <p className='text-footnote text-apple-red mt-0.5'>{jobErrors.lines[i].unitPrice?.message}</p>
                          )}
                        </div>
                        {watchJob(`lines.${i}.type`) === 'LABOR' && (
                          <div className='flex-1'>
                            <label
                              htmlFor={`hours-${i}`}
                              className='text-footnote text-apple-gray dark:text-[var(--text-secondary)] flex items-center gap-1'
                            >
                              <Clock className='h-3 w-3' /> Ore
                            </label>
                            <Input
                              id={`hours-${i}`}
                              type='number'
                              step='0.25'
                              {...registerJob(`lines.${i}.laborHours`, { valueAsNumber: true })}
                              className='h-9 text-body'
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className='flex items-center justify-between pt-4 border-t border-apple-border dark:border-[var(--border-default)]'>
                <p className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                  Totale: {formatCurrency(modalTotalPrice)}
                </p>
                <div className='flex items-center gap-3'>
                  <AppleButton variant='secondary' type='button' onClick={() => setShowModal(false)}>
                    Annulla
                  </AppleButton>
                  <AppleButton loading={saving} type='submit'>
                    {editingJob.id ? 'Salva Modifiche' : 'Crea Template'}
                  </AppleButton>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Apply Modal */}
      {showApplyModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className='w-full max-w-md bg-white dark:bg-[var(--surface-elevated)] rounded-2xl shadow-2xl p-6 m-4'
          >
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                Applica Template
              </h2>
              <AppleButton variant='ghost' size='sm' onClick={() => setShowApplyModal(false)} aria-label='Chiudi'>
                <X className='h-5 w-5 text-apple-gray' />
              </AppleButton>
            </div>
            <p className='text-body text-apple-gray dark:text-[var(--text-secondary)] mb-6'>
              Seleziona dove applicare il template:
            </p>
            <div className='space-y-3'>
              <AppleButton
                variant='secondary'
                className='w-full justify-start'
                onClick={() => setShowApplyModal(false)}
              >
                Applica a un Preventivo
              </AppleButton>
              <AppleButton
                variant='secondary'
                className='w-full justify-start'
                onClick={() => setShowApplyModal(false)}
              >
                Applica a un Ordine di Lavoro
              </AppleButton>
            </div>
            <div className='mt-4'>
              <AppleButton
                variant='ghost'
                className='w-full'
                onClick={() => setShowApplyModal(false)}
              >
                Annulla
              </AppleButton>
            </div>
          </motion.div>
        </div>
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => { if (!open) setDeleteTarget(null); }}
        title="Elimina Template"
        description="Sei sicuro di voler eliminare questo template? L'azione non è reversibile."
        confirmLabel="Elimina"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) {
            handleDelete(deleteTarget);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
