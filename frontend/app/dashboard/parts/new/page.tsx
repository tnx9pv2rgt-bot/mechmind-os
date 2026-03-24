'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  Package,
  Save,
  AlertCircle,
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

  const inputClass = 'h-[52px] rounded-full border border-[#4e4e4e] bg-[#2f2f2f] text-white placeholder-[#888] outline-none px-4 text-sm w-full';
  const selectClass = 'w-full h-[52px] px-4 rounded-full border border-[#4e4e4e] bg-[#2f2f2f] text-sm text-white outline-none appearance-none cursor-pointer';

  return (
    <div className="bg-[#1a1a1a] min-h-screen">
      {/* Header */}
      <header className="bg-[#2f2f2f] border-b border-[#4e4e4e]">
        <div className='px-8 py-5'>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Ricambi', href: '/dashboard/parts' },
              { label: 'Nuovo Ricambio' },
            ]}
          />
          <div className='flex items-center gap-3 mt-2'>
            <div className='w-10 h-10 rounded-xl bg-[#383838] flex items-center justify-center'>
              <Package className='h-5 w-5 text-white' />
            </div>
            <h1 className='text-2xl font-bold text-white'>Nuovo Ricambio</h1>
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
            <div className="rounded-2xl border border-[#4e4e4e] bg-[#2f2f2f] shadow-[0_0_60px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="px-6 py-5 border-b border-[#4e4e4e]">
                <h2 className='text-base font-semibold text-white'>
                  Informazioni Base
                </h2>
              </div>
              <div className="p-6">
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='text-sm font-medium text-white mb-1 block'>
                      Nome *
                    </label>
                    <Input placeholder='Es. Pastiglie freno anteriori' {...register('name')} className={inputClass} />
                    {errors.name && <p className='text-xs text-red-500 mt-1'>{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className='text-sm font-medium text-white mb-1 block'>
                      SKU *
                    </label>
                    <Input placeholder='Es. BRK-PAD-001' {...register('sku')} className={`${inputClass} font-mono`} />
                    {errors.sku && <p className='text-xs text-red-500 mt-1'>{errors.sku.message}</p>}
                  </div>
                  <div>
                    <label className='text-sm font-medium text-white mb-1 block'>
                      Codice OE
                    </label>
                    <Input placeholder='Es. 34116860016' {...register('partNumber')} className={`${inputClass} font-mono`} />
                  </div>
                  <div>
                    <label className='text-sm font-medium text-white mb-1 block'>
                      Marca
                    </label>
                    <Input placeholder='Es. Brembo' {...register('brand')} className={inputClass} />
                  </div>
                  <div>
                    <label className='text-sm font-medium text-white mb-1 block'>
                      Categoria
                    </label>
                    <Input placeholder='Es. Freni' {...register('category')} className={inputClass} />
                  </div>
                  <div>
                    <label className='text-sm font-medium text-white mb-1 block'>
                      Fornitore
                    </label>
                    <select
                      {...register('supplierId')}
                      className={selectClass}
                    >
                      <option value=''>Seleziona fornitore...</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Prezzi e Stock */}
          <motion.div variants={cardVariants} className='mb-6'>
            <div className="rounded-2xl border border-[#4e4e4e] bg-[#2f2f2f] shadow-[0_0_60px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="px-6 py-5 border-b border-[#4e4e4e]">
                <h2 className='text-base font-semibold text-white'>
                  Prezzi e Magazzino
                </h2>
              </div>
              <div className="p-6">
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='text-sm font-medium text-white mb-1 block'>
                      Prezzo Acquisto
                    </label>
                    <Input type='number' step='0.01' min='0' {...register('costPrice', { valueAsNumber: true })} className={inputClass} />
                    {errors.costPrice && <p className='text-xs text-red-500 mt-1'>{errors.costPrice.message}</p>}
                  </div>
                  <div>
                    <label className='text-sm font-medium text-white mb-1 block'>
                      Prezzo Vendita
                    </label>
                    <Input type='number' step='0.01' min='0' {...register('retailPrice', { valueAsNumber: true })} className={inputClass} />
                    {errors.retailPrice && <p className='text-xs text-red-500 mt-1'>{errors.retailPrice.message}</p>}
                  </div>
                  <div>
                    <label className='text-sm font-medium text-white mb-1 block'>
                      Quantità Iniziale
                    </label>
                    <Input type='number' min='0' step='1' {...register('currentStock', { valueAsNumber: true })} className={inputClass} />
                    {errors.currentStock && <p className='text-xs text-red-500 mt-1'>{errors.currentStock.message}</p>}
                  </div>
                  <div>
                    <label className='text-sm font-medium text-white mb-1 block'>
                      Scorta Minima
                    </label>
                    <Input type='number' min='0' step='1' {...register('minStockLevel', { valueAsNumber: true })} className={inputClass} />
                    {errors.minStockLevel && <p className='text-xs text-red-500 mt-1'>{errors.minStockLevel.message}</p>}
                  </div>
                  <div>
                    <label className='text-sm font-medium text-white mb-1 block'>
                      Posizione Magazzino
                    </label>
                    <Input placeholder='Es. Scaffale A-3' {...register('location')} className={inputClass} />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Note */}
          <motion.div variants={cardVariants} className='mb-6'>
            <div className="rounded-2xl border border-[#4e4e4e] bg-[#2f2f2f] shadow-[0_0_60px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="px-6 py-5 border-b border-[#4e4e4e]">
                <h2 className='text-base font-semibold text-white'>
                  Note
                </h2>
              </div>
              <div className="p-6">
                <textarea
                  {...register('notes')}
                  rows={3}
                  placeholder='Note aggiuntive sul ricambio...'
                  className='w-full rounded-2xl border border-[#4e4e4e] bg-[#2f2f2f] text-white placeholder-[#888] px-5 py-3 outline-none text-sm resize-none'
                />
              </div>
            </div>
          </motion.div>

          {/* Error */}
          {submitError && (
            <div className='flex items-center gap-2 p-3 rounded-2xl bg-red-900/20 border border-red-700/30 mb-6'>
              <AlertCircle className='h-4 w-4 text-red-500 flex-shrink-0' />
              <p className='text-xs text-red-300'>{submitError}</p>
            </div>
          )}

          {/* Actions */}
          <div className='flex justify-end'>
            <button
              type='submit'
              disabled={isSubmitting}
              className='inline-flex items-center justify-center gap-2 rounded-full h-[52px] px-6 bg-white text-[#0d0d0d] hover:bg-[#e5e5e5] font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isSubmitting ? (
                <svg className='animate-spin h-4 w-4' viewBox='0 0 24 24'>
                  <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' fill='none' />
                  <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' />
                </svg>
              ) : (
                <Save className='h-4 w-4' />
              )}
              Salva Ricambio
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
