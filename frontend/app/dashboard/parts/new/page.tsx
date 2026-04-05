'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  Package,
  Save,
  AlertCircle,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
};

const partSchema = z.object({
  name: z.string().min(1, 'Il nome è obbligatorio'),
  sku: z.string().min(1, 'Lo SKU è obbligatorio'),
  partNumber: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  supplierId: z.string().optional(),
  costPrice: z.number().min(0, 'Il prezzo non può essere negativo').default(0),
  retailPrice: z.number().min(0, 'Il prezzo non può essere negativo').default(0),
  currentStock: z.number().int().min(0, 'La quantità non può essere negativa').default(0),
  minStockLevel: z.number().int().min(0, 'La scorta minima non può essere negativa').default(0),
  location: z.string().optional(),
  notes: z.string().optional(),
});

type PartFormValues = z.infer<typeof partSchema>;

interface SupplierOption {
  id: string;
  name: string;
}

export default function NewPartPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PartFormValues>({
    resolver: zodResolver(partSchema),
    defaultValues: {
      name: '',
      sku: '',
      partNumber: '',
      category: '',
      brand: '',
      supplierId: '',
      costPrice: 0,
      retailPrice: 0,
      currentStock: 0,
      minStockLevel: 0,
      location: '',
      notes: '',
    },
  });

  useEffect(() => {
    fetch('/api/parts/suppliers')
      .then(res => res.json())
      .then(json => {
        const list = json.data || json || [];
        setSuppliers(Array.isArray(list) ? list : []);
      })
      .catch(() => setSuppliers([]));
  }, []);

  const onSubmit = async (data: PartFormValues) => {
    setSubmitError(null);
    try {
      const res = await fetch('/api/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || 'Errore creazione ricambio');
      }
      const json = await res.json();
      const created = json.data || json;
      toast.success('Ricambio creato con successo');
      router.push(`/dashboard/parts/${created.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
      setSubmitError(msg);
      toast.error(msg);
    }
  };

  return (
    <div>
      {/* Header */}
      <header>
        <div className='px-8 py-5'>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Ricambi', href: '/dashboard/parts' },
              { label: 'Nuovo Ricambio' },
            ]}
          />
          <div className='flex items-center gap-3 mt-2'>
            <AppleButton
              variant='ghost'
              size='sm'
              onClick={() => router.push('/dashboard/parts')}
              icon={<ArrowLeft className='h-4 w-4' />}
              aria-label='Torna ai ricambi'
              className='min-w-[44px]'
            />
            <div>
              <h1 className='text-headline text-apple-dark dark:text-[var(--text-primary)]'>Nuovo Ricambio</h1>
              <p className='text-apple-gray dark:text-[var(--text-secondary)] text-body mt-1'>
                Aggiungi un nuovo ricambio al magazzino
              </p>
            </div>
          </div>
        </div>
      </header>

      <motion.div
        className='p-8 max-w-4xl mx-auto space-y-6'
        initial='hidden'
        animate='visible'
        variants={containerVariants}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Info base */}
          <motion.div variants={cardVariants} className='mb-6'>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                  Informazioni Base
                </h2>
              </AppleCardHeader>
              <AppleCardContent>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1 block'>
                      Nome *
                    </label>
                    <Input placeholder='Es. Pastiglie freno anteriori' {...register('name')} />
                    {errors.name && <p className='text-footnote text-apple-red mt-1'>{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1 block'>
                      SKU *
                    </label>
                    <Input placeholder='Es. BRK-PAD-001' {...register('sku')} className='font-mono' />
                    {errors.sku && <p className='text-footnote text-apple-red mt-1'>{errors.sku.message}</p>}
                  </div>
                  <div>
                    <label className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1 block'>
                      Codice OE
                    </label>
                    <Input placeholder='Es. 34116860016' {...register('partNumber')} className='font-mono' />
                  </div>
                  <div>
                    <label className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1 block'>
                      Marca
                    </label>
                    <Input placeholder='Es. Brembo' {...register('brand')} />
                  </div>
                  <div>
                    <label className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1 block'>
                      Categoria
                    </label>
                    <Input placeholder='Es. Freni' {...register('category')} />
                  </div>
                  <div>
                    <label className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1 block'>
                      Fornitore
                    </label>
                    <select
                      {...register('supplierId')}
                      className='w-full h-10 px-3 rounded-md border border-apple-border/30 dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] text-body text-apple-dark dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue appearance-none cursor-pointer'
                    >
                      <option value=''>Seleziona fornitore...</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          {/* Prezzi e Stock */}
          <motion.div variants={cardVariants} className='mb-6'>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                  Prezzi e Magazzino
                </h2>
              </AppleCardHeader>
              <AppleCardContent>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1 block'>
                      Prezzo Acquisto
                    </label>
                    <Input type='number' step='0.01' min='0' {...register('costPrice', { valueAsNumber: true })} />
                    {errors.costPrice && <p className='text-footnote text-apple-red mt-1'>{errors.costPrice.message}</p>}
                  </div>
                  <div>
                    <label className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1 block'>
                      Prezzo Vendita
                    </label>
                    <Input type='number' step='0.01' min='0' {...register('retailPrice', { valueAsNumber: true })} />
                    {errors.retailPrice && <p className='text-footnote text-apple-red mt-1'>{errors.retailPrice.message}</p>}
                  </div>
                  <div>
                    <label className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1 block'>
                      Quantità Iniziale
                    </label>
                    <Input type='number' min='0' step='1' {...register('currentStock', { valueAsNumber: true })} />
                    {errors.currentStock && <p className='text-footnote text-apple-red mt-1'>{errors.currentStock.message}</p>}
                  </div>
                  <div>
                    <label className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1 block'>
                      Scorta Minima
                    </label>
                    <Input type='number' min='0' step='1' {...register('minStockLevel', { valueAsNumber: true })} />
                    {errors.minStockLevel && <p className='text-footnote text-apple-red mt-1'>{errors.minStockLevel.message}</p>}
                  </div>
                  <div>
                    <label className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1 block'>
                      Posizione Magazzino
                    </label>
                    <Input placeholder='Es. Scaffale A-3' {...register('location')} />
                  </div>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          {/* Note */}
          <motion.div variants={cardVariants} className='mb-6'>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                  Note
                </h2>
              </AppleCardHeader>
              <AppleCardContent>
                <textarea
                  {...register('notes')}
                  rows={3}
                  placeholder='Note aggiuntive sul ricambio...'
                  className='w-full rounded-xl border border-apple-border/30 dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray/60 dark:placeholder-[var(--text-tertiary)] px-4 py-3 outline-none text-body resize-none focus:ring-2 focus:ring-apple-blue'
                />
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          {/* Error */}
          {submitError && (
            <div className='flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30 mb-6'>
              <AlertCircle className='h-4 w-4 text-red-500 flex-shrink-0' />
              <p className='text-footnote text-apple-red dark:text-red-300'>{submitError}</p>
            </div>
          )}

          {/* Actions */}
          <div className='flex justify-end gap-3'>
            <AppleButton
              type='button'
              variant='ghost'
              onClick={() => router.push('/dashboard/parts')}
            >
              Annulla
            </AppleButton>
            <AppleButton
              type='submit'
              loading={isSubmitting}
              icon={<Save className='h-4 w-4' />}
            >
              Salva Ricambio
            </AppleButton>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
