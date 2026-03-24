'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  Users,
  Plus,
  Loader2,
  AlertCircle,
  X,
  Filter,
  Save,
} from 'lucide-react';

interface Segment {
  id: string;
  name: string;
  description: string;
  customerCount: number;
  conditions: Array<{ field: string; operator: string; value: string; logic?: 'AND' | 'OR' }>;
  createdAt: string;
}

const segmentSchema = z.object({
  name: z.string().min(1, 'Il nome è obbligatorio'),
  description: z.string().optional(),
});

type SegmentForm = z.infer<typeof segmentSchema>;

interface Condition {
  field: string;
  operator: string;
  value: string;
  logic: 'AND' | 'OR';
}

const FIELD_OPTIONS = [
  { value: 'lastVisitDaysAgo', label: 'Giorni dall\'ultima visita' },
  { value: 'totalSpent', label: 'Totale speso' },
  { value: 'visitCount', label: 'Numero visite' },
  { value: 'vehicleAge', label: 'Età veicolo (anni)' },
  { value: 'city', label: 'Città' },
];

const OPERATOR_OPTIONS = [
  { value: 'gt', label: 'Maggiore di' },
  { value: 'lt', label: 'Minore di' },
  { value: 'eq', label: 'Uguale a' },
  { value: 'gte', label: 'Maggiore o uguale' },
  { value: 'lte', label: 'Minore o uguale' },
  { value: 'contains', label: 'Contiene' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function SegmentsPage() {
  const [showForm, setShowForm] = useState(false);
  const [conditions, setConditions] = useState<Condition[]>([{ field: 'lastVisitDaysAgo', operator: 'gt', value: '', logic: 'AND' }]);
  const [saving, setSaving] = useState(false);

  const { data: segmentsData, error, isLoading, mutate } = useSWR<{ data?: Segment[] } | Segment[]>(
    '/api/dashboard/campaigns/segments',
    fetcher
  );

  const segments: Segment[] = (() => {
    if (!segmentsData) return [];
    const list = (segmentsData as { data?: Segment[] }).data || segmentsData;
    return Array.isArray(list) ? list : [];
  })();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SegmentForm>({
    resolver: zodResolver(segmentSchema),
  });

  const addCondition = () => {
    setConditions([...conditions, { field: 'lastVisitDaysAgo', operator: 'gt', value: '', logic: 'AND' }]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, key: keyof Condition, value: string) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [key]: value };
    setConditions(updated);
  };

  const onSubmit = async (data: SegmentForm) => {
    setSaving(true);
    try {
      const res = await fetch('/api/dashboard/campaigns/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          conditions,
        }),
      });
      if (!res.ok) throw new Error('Errore nella creazione del segmento');
      toast.success('Segmento creato con successo');
      reset();
      setConditions([{ field: 'lastVisitDaysAgo', operator: 'gt', value: '', logic: 'AND' }]);
      setShowForm(false);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nella creazione');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <header className='bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-b border-apple-border/20 dark:border-[#424242]/50'>
        <div className='px-8 py-5 flex items-center justify-between'>
          <div>
            <Breadcrumb
              items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Marketing', href: '/dashboard/marketing' },
                { label: 'Segmenti Clienti' },
              ]}
            />
            <h1 className='text-headline text-apple-dark dark:text-[#ececec]'>Segmenti Clienti</h1>
            <p className='text-apple-gray dark:text-[#636366] text-body mt-1'>
              Crea segmenti per targettizzare le campagne marketing
            </p>
          </div>
          <AppleButton icon={<Plus className='h-4 w-4' />} onClick={() => setShowForm(!showForm)}>
            Nuovo Segmento
          </AppleButton>
        </div>
      </header>

      <motion.div className='p-8 space-y-6' initial='hidden' animate='visible' variants={containerVariants}>
        {/* Create Form */}
        {showForm && (
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <div className='flex items-center justify-between'>
                  <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
                    Nuovo Segmento
                  </h2>
                  <button onClick={() => setShowForm(false)}>
                    <X className='h-5 w-5 text-apple-gray' />
                  </button>
                </div>
              </AppleCardHeader>
              <AppleCardContent>
                <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <label className='text-sm font-medium text-apple-dark dark:text-[#ececec] mb-2 block'>Nome</label>
                      <Input {...register('name')} placeholder='Es: Clienti inattivi > 6 mesi' />
                      {errors.name && <p className='text-xs text-red-500 mt-1'>{errors.name.message}</p>}
                    </div>
                    <div>
                      <label className='text-sm font-medium text-apple-dark dark:text-[#ececec] mb-2 block'>Descrizione</label>
                      <Input {...register('description')} placeholder='Descrizione opzionale' />
                    </div>
                  </div>

                  <div>
                    <label className='text-sm font-medium text-apple-dark dark:text-[#ececec] mb-3 block flex items-center gap-2'>
                      <Filter className='h-4 w-4' /> Condizioni
                    </label>
                    <div className='space-y-3'>
                      {conditions.map((cond, i) => (
                        <div key={i} className='flex items-center gap-2 flex-wrap'>
                          {i > 0 && (
                            <select
                              value={cond.logic}
                              onChange={e => updateCondition(i, 'logic', e.target.value)}
                              className='text-xs px-2 py-1 rounded-lg border border-apple-border dark:border-[#424242] bg-white dark:bg-[#2f2f2f] text-apple-dark dark:text-[#ececec]'
                            >
                              <option value='AND'>E</option>
                              <option value='OR'>O</option>
                            </select>
                          )}
                          <select
                            value={cond.field}
                            onChange={e => updateCondition(i, 'field', e.target.value)}
                            className='text-sm px-3 py-2 rounded-xl border border-apple-border dark:border-[#424242] bg-white dark:bg-[#2f2f2f] text-apple-dark dark:text-[#ececec]'
                          >
                            {FIELD_OPTIONS.map(f => (
                              <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                          </select>
                          <select
                            value={cond.operator}
                            onChange={e => updateCondition(i, 'operator', e.target.value)}
                            className='text-sm px-3 py-2 rounded-xl border border-apple-border dark:border-[#424242] bg-white dark:bg-[#2f2f2f] text-apple-dark dark:text-[#ececec]'
                          >
                            {OPERATOR_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          <Input
                            value={cond.value}
                            onChange={e => updateCondition(i, 'value', e.target.value)}
                            placeholder='Valore'
                            className='w-32'
                          />
                          {conditions.length > 1 && (
                            <button type='button' onClick={() => removeCondition(i)}>
                              <X className='h-4 w-4 text-apple-red' />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <AppleButton variant='ghost' size='sm' type='button' className='mt-2' onClick={addCondition}>
                      <Plus className='h-3 w-3 mr-1' /> Aggiungi condizione
                    </AppleButton>
                  </div>

                  <div className='flex justify-end'>
                    <AppleButton type='submit' icon={<Save className='h-4 w-4' />} loading={saving}>
                      Crea Segmento
                    </AppleButton>
                  </div>
                </form>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        )}

        {/* Segments List */}
        <motion.div variants={cardVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <div className='flex items-center gap-2'>
                <Users className='h-5 w-5 text-apple-blue' />
                <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>Segmenti</h2>
              </div>
            </AppleCardHeader>
            <AppleCardContent>
              {error ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <AlertCircle className='h-12 w-12 text-apple-red/40 mb-4' />
                  <p className='text-body text-apple-gray dark:text-[#636366]'>Impossibile caricare i segmenti</p>
                  <AppleButton variant='ghost' className='mt-4' onClick={() => mutate()}>Riprova</AppleButton>
                </div>
              ) : isLoading ? (
                <div className='flex items-center justify-center py-12'>
                  <Loader2 className='h-8 w-8 animate-spin text-apple-blue' />
                </div>
              ) : segments.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <div className='w-16 h-16 rounded-2xl bg-apple-blue/10 flex items-center justify-center mb-4'>
                    <Users className='h-8 w-8 text-apple-blue/60' />
                  </div>
                  <p className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec] mb-1'>Nessun segmento</p>
                  <p className='text-footnote text-apple-gray dark:text-[#636366] max-w-sm mb-6'>
                    Crea il primo segmento per organizzare i clienti e inviare campagne mirate.
                  </p>
                  <AppleButton icon={<Plus className='h-4 w-4' />} onClick={() => setShowForm(true)}>
                    Crea Segmento
                  </AppleButton>
                </div>
              ) : (
                <div className='space-y-3'>
                  {segments.map(seg => (
                    <div
                      key={seg.id}
                      className='flex items-center justify-between p-4 rounded-2xl bg-apple-light-gray/30 dark:bg-[#353535] hover:bg-white dark:hover:bg-[#3a3a3a] transition-colors'
                    >
                      <div className='flex items-center gap-4'>
                        <div className='w-10 h-10 rounded-xl bg-apple-blue/10 flex items-center justify-center'>
                          <Users className='h-5 w-5 text-apple-blue' />
                        </div>
                        <div>
                          <p className='text-body font-semibold text-apple-dark dark:text-[#ececec]'>{seg.name}</p>
                          <p className='text-footnote text-apple-gray dark:text-[#636366]'>
                            {seg.description || `${seg.conditions?.length || 0} condizioni`}
                          </p>
                        </div>
                      </div>
                      <div className='text-right'>
                        <p className='text-title-3 font-bold text-apple-dark dark:text-[#ececec]'>{seg.customerCount}</p>
                        <p className='text-[10px] text-apple-gray dark:text-[#636366]'>clienti</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
