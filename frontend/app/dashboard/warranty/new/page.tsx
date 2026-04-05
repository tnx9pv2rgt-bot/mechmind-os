'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ArrowLeft, Shield, Loader2, Save } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const warrantySchema = z.object({
  vehicleId: z.string().min(1, 'Seleziona un veicolo'),
  type: z.string().min(1, 'Seleziona il tipo di garanzia'),
  provider: z.string().min(1, 'Inserisci il fornitore'),
  startDate: z.string().min(1, 'La data di inizio è obbligatoria'),
  expirationDate: z.string().min(1, 'La data di scadenza è obbligatoria'),
  maxCoverage: z.coerce.number().min(0, 'La copertura massima non può essere negativa'),
  deductible: z.coerce.number().min(0, 'La franchigia non può essere negativa'),
  coverageKm: z.coerce.number().min(0, 'I km non possono essere negativi').optional(),
  currentKm: z.coerce.number().min(0, 'I km attuali non possono essere negativi'),
  terms: z.string().optional(),
  description: z.string().optional(),
});

type WarrantyFormData = z.infer<typeof warrantySchema>;

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
}

const WARRANTY_TYPES = [
  { value: 'MANUFACTURER', label: 'Costruttore' },
  { value: 'EXTENDED', label: 'Estesa' },
  { value: 'DEALER', label: 'Concessionario' },
  { value: 'AFTERMARKET', label: 'Aftermarket' },
  { value: 'LABOR', label: 'Lavoro' },
];

export default function NewWarrantyPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: vehiclesData, isLoading: vehiclesLoading } = useSWR<{
    data?: Vehicle[];
  }>('/api/dashboard/vehicles', fetcher);

  const vehicles: Vehicle[] = (() => {
    if (!vehiclesData) return [];
    const list = vehiclesData.data || vehiclesData;
    return Array.isArray(list) ? list : [];
  })();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WarrantyFormData>({
    resolver: zodResolver(warrantySchema),
    defaultValues: {
      type: 'MANUFACTURER',
      maxCoverage: 0,
      deductible: 0,
      currentKm: 0,
    },
  });

  const onSubmit = async (data: WarrantyFormData) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/warranties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          startDate: new Date(data.startDate),
          expirationDate: new Date(data.expirationDate),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Errore nella creazione della garanzia');
      }
      toast.success('Garanzia creata con successo');
      router.push('/dashboard/warranty');
    } catch (error) {
      toast.error('Errore nella creazione', {
        description: error instanceof Error ? error.message : 'Errore sconosciuto',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectClass = 'w-full h-10 px-3 rounded-md border border-apple-border dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] text-body text-apple-dark dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue appearance-none cursor-pointer';

  return (
    <div>
      {/* Header */}
      <header className=''>
        <div className='px-8 py-5'>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Garanzie', href: '/dashboard/warranty' },
              { label: 'Nuova Garanzia' },
            ]}
          />
          <div className='flex items-center gap-3 mt-2'>
            <AppleButton
              variant='ghost'
              size='sm'
              onClick={() => router.push('/dashboard/warranty')}
              icon={<ArrowLeft className='h-4 w-4' />}
              aria-label='Torna alle garanzie'
              className='min-w-[44px]'
            />
            <div>
              <h1 className='text-headline text-apple-dark dark:text-[var(--text-primary)]'>Nuova Garanzia</h1>
              <p className='text-apple-gray dark:text-[var(--text-secondary)] text-body mt-1'>
                Crea una nuova garanzia per un veicolo
              </p>
            </div>
          </div>
        </div>
      </header>

      <motion.div
        className='p-8 max-w-3xl mx-auto space-y-6'
        initial='hidden'
        animate='visible'
        variants={containerVariants}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Dettagli Garanzia */}
          <motion.div variants={cardVariants} className='mb-6'>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)] flex items-center gap-2'>
                  <Shield className='h-5 w-5 text-apple-blue' />
                  Dettagli Garanzia
                </h2>
              </AppleCardHeader>
              <AppleCardContent className='space-y-5'>
                {/* Vehicle */}
                <div>
                  <label className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1 block'>Veicolo *</label>
                  {vehiclesLoading ? (
                    <div className='flex items-center gap-2 mt-1'>
                      <Loader2 className='h-4 w-4 animate-spin text-apple-blue' />
                      <span className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>Caricamento veicoli...</span>
                    </div>
                  ) : (
                    <select
                      {...register('vehicleId')}
                      className={selectClass}
                    >
                      <option value=''>Seleziona un veicolo...</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.licensePlate} - {v.make} {v.model} ({v.year})
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.vehicleId && (
                    <p className='text-footnote text-apple-red mt-1'>{errors.vehicleId.message}</p>
                  )}
                </div>

                {/* Type + Provider */}
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div>
                    <label className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1 block'>Tipo Garanzia *</label>
                    <select
                      {...register('type')}
                      className={selectClass}
                    >
                      {WARRANTY_TYPES.map(t => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    {errors.type && <p className='text-footnote text-apple-red mt-1'>{errors.type.message}</p>}
                  </div>
                  <div>
                    <label className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1 block'>Fornitore *</label>
                    <Input {...register('provider')} />
                    {errors.provider && (
                      <p className='text-footnote text-apple-red mt-1'>{errors.provider.message}</p>
                    )}
                  </div>
                </div>

                {/* Dates */}
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div>
                    <label className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1 block'>Data Inizio *</label>
                    <Input type='date' {...register('startDate')} />
                    {errors.startDate && (
                      <p className='text-footnote text-apple-red mt-1'>{errors.startDate.message}</p>
                    )}
                  </div>
                  <div>
                    <label className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1 block'>Data Fine *</label>
                    <Input type='date' {...register('expirationDate')} />
                    {errors.expirationDate && (
                      <p className='text-footnote text-apple-red mt-1'>{errors.expirationDate.message}</p>
                    )}
                  </div>
                </div>

                {/* Coverage */}
                <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                  <div>
                    <label className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1 block'>Copertura Massima (EUR) *</label>
                    <Input type='number' step='0.01' min={0} {...register('maxCoverage')} />
                    {errors.maxCoverage && (
                      <p className='text-footnote text-apple-red mt-1'>{errors.maxCoverage.message}</p>
                    )}
                  </div>
                  <div>
                    <label className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1 block'>Franchigia (EUR)</label>
                    <Input type='number' step='0.01' min={0} {...register('deductible')} />
                    {errors.deductible && (
                      <p className='text-footnote text-apple-red mt-1'>{errors.deductible.message}</p>
                    )}
                  </div>
                  <div>
                    <label className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1 block'>Km Copertura</label>
                    <Input type='number' min={0} {...register('coverageKm')} placeholder='Illimitata' />
                  </div>
                </div>

                {/* Current Km */}
                <div>
                  <label className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1 block'>Km Attuali *</label>
                  <Input type='number' min={0} {...register('currentKm')} />
                  {errors.currentKm && (
                    <p className='text-footnote text-apple-red mt-1'>{errors.currentKm.message}</p>
                  )}
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          {/* Terms */}
          <motion.div variants={cardVariants} className='mb-6'>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                  Termini e Condizioni
                </h2>
              </AppleCardHeader>
              <AppleCardContent>
                <textarea
                  {...register('terms')}
                  placeholder='Descrivi i termini della garanzia...'
                  rows={4}
                  className='w-full rounded-xl border border-apple-border dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray/60 dark:placeholder-[var(--text-tertiary)] px-4 py-3 outline-none text-body resize-none focus:ring-2 focus:ring-apple-blue'
                />
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          {/* Description */}
          <motion.div variants={cardVariants} className='mb-6'>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                  Descrizione Copertura
                </h2>
              </AppleCardHeader>
              <AppleCardContent>
                <textarea
                  {...register('description')}
                  placeholder='Descrivi cosa copre la garanzia...'
                  rows={3}
                  className='w-full rounded-xl border border-apple-border dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray/60 dark:placeholder-[var(--text-tertiary)] px-4 py-3 outline-none text-body resize-none focus:ring-2 focus:ring-apple-blue'
                />
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          {/* Actions */}
          <div className='flex items-center justify-end gap-3'>
            <AppleButton
              type='button'
              variant='ghost'
              onClick={() => router.push('/dashboard/warranty')}
            >
              Annulla
            </AppleButton>
            <AppleButton
              type='submit'
              loading={isSubmitting}
              icon={<Save className='h-4 w-4' />}
            >
              Crea Garanzia
            </AppleButton>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
