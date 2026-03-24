'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Shield, Loader2 } from 'lucide-react';

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

  return (
    <div className='container mx-auto max-w-3xl space-y-6 p-6 bg-[#1a1a1a] min-h-screen'>
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Garanzie', href: '/dashboard/warranty' },
          { label: 'Nuova Garanzia' },
        ]}
      />

      {/* Header */}
      <div className='flex items-center gap-4'>
        <Button
          variant='outline'
          size='icon'
          onClick={() => router.push('/dashboard/warranty')}
          aria-label='Torna alle garanzie'
          className='border-[#4e4e4e] bg-transparent text-white hover:bg-white/5'
        >
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div>
          <h1 className='text-2xl font-bold text-white'>Nuova Garanzia</h1>
          <p className='text-sm text-[#888]'>
            Crea una nuova garanzia per un veicolo
          </p>
        </div>
      </div>

      <Card className='bg-[#2f2f2f] border border-[#4e4e4e] rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.5)]'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-white'>
            <Shield className='h-5 w-5' />
            Dettagli Garanzia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
            {/* Vehicle */}
            <div>
              <Label htmlFor='vehicleId' className='text-white'>Veicolo *</Label>
              {vehiclesLoading ? (
                <div className='flex items-center gap-2 mt-1'>
                  <Loader2 className='h-4 w-4 animate-spin text-white' />
                  <span className='text-sm text-[#888]'>Caricamento veicoli...</span>
                </div>
              ) : (
                <select
                  id='vehicleId'
                  {...register('vehicleId')}
                  className='w-full mt-1 h-[52px] px-3 rounded-full border border-[#4e4e4e] bg-[#2f2f2f] text-white text-sm outline-none'
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
                <p className='text-xs text-red-500 mt-1'>{errors.vehicleId.message}</p>
              )}
            </div>

            {/* Type + Provider */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div>
                <Label htmlFor='type' className='text-white'>Tipo Garanzia *</Label>
                <select
                  id='type'
                  {...register('type')}
                  className='w-full mt-1 h-[52px] px-3 rounded-full border border-[#4e4e4e] bg-[#2f2f2f] text-white text-sm outline-none'
                >
                  {WARRANTY_TYPES.map(t => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {errors.type && <p className='text-xs text-red-500 mt-1'>{errors.type.message}</p>}
              </div>
              <div>
                <Label htmlFor='provider' className='text-white'>Fornitore *</Label>
                <Input id='provider' {...register('provider')} className='mt-1 h-[52px] rounded-full border-[#4e4e4e] bg-[#2f2f2f] text-white placeholder-[#888] outline-none' />
                {errors.provider && (
                  <p className='text-xs text-red-500 mt-1'>{errors.provider.message}</p>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div>
                <Label htmlFor='startDate' className='text-white'>Data Inizio *</Label>
                <Input id='startDate' type='date' {...register('startDate')} className='mt-1 h-[52px] rounded-full border-[#4e4e4e] bg-[#2f2f2f] text-white outline-none' />
                {errors.startDate && (
                  <p className='text-xs text-red-500 mt-1'>{errors.startDate.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor='expirationDate' className='text-white'>Data Fine *</Label>
                <Input
                  id='expirationDate'
                  type='date'
                  {...register('expirationDate')}
                  className='mt-1 h-[52px] rounded-full border-[#4e4e4e] bg-[#2f2f2f] text-white outline-none'
                />
                {errors.expirationDate && (
                  <p className='text-xs text-red-500 mt-1'>{errors.expirationDate.message}</p>
                )}
              </div>
            </div>

            {/* Coverage */}
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
              <div>
                <Label htmlFor='maxCoverage' className='text-white'>Copertura Massima (€) *</Label>
                <Input
                  id='maxCoverage'
                  type='number'
                  step='0.01'
                  min={0}
                  {...register('maxCoverage')}
                  className='mt-1 h-[52px] rounded-full border-[#4e4e4e] bg-[#2f2f2f] text-white outline-none'
                />
                {errors.maxCoverage && (
                  <p className='text-xs text-red-500 mt-1'>{errors.maxCoverage.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor='deductible' className='text-white'>Franchigia (€)</Label>
                <Input
                  id='deductible'
                  type='number'
                  step='0.01'
                  min={0}
                  {...register('deductible')}
                  className='mt-1 h-[52px] rounded-full border-[#4e4e4e] bg-[#2f2f2f] text-white outline-none'
                />
                {errors.deductible && (
                  <p className='text-xs text-red-500 mt-1'>{errors.deductible.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor='coverageKm' className='text-white'>Km Copertura</Label>
                <Input
                  id='coverageKm'
                  type='number'
                  min={0}
                  {...register('coverageKm')}
                  className='mt-1 h-[52px] rounded-full border-[#4e4e4e] bg-[#2f2f2f] text-white placeholder-[#888] outline-none'
                  placeholder='Illimitata'
                />
              </div>
            </div>

            {/* Current Km */}
            <div>
              <Label htmlFor='currentKm' className='text-white'>Km Attuali *</Label>
              <Input
                id='currentKm'
                type='number'
                min={0}
                {...register('currentKm')}
                className='mt-1 h-[52px] rounded-full border-[#4e4e4e] bg-[#2f2f2f] text-white outline-none'
              />
              {errors.currentKm && (
                <p className='text-xs text-red-500 mt-1'>{errors.currentKm.message}</p>
              )}
            </div>

            {/* Terms */}
            <div>
              <Label htmlFor='terms' className='text-white'>Termini e Condizioni</Label>
              <Textarea
                id='terms'
                {...register('terms')}
                placeholder='Descrivi i termini della garanzia...'
                rows={4}
                className='mt-1 rounded-2xl border-[#4e4e4e] bg-[#2f2f2f] text-white placeholder-[#888] px-5 py-3 outline-none'
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor='description' className='text-white'>Descrizione Copertura</Label>
              <Textarea
                id='description'
                {...register('description')}
                placeholder='Descrivi cosa copre la garanzia...'
                rows={3}
                className='mt-1 rounded-2xl border-[#4e4e4e] bg-[#2f2f2f] text-white placeholder-[#888] px-5 py-3 outline-none'
              />
            </div>

            {/* Actions */}
            <div className='flex items-center justify-end gap-3 pt-4 border-t border-[#4e4e4e]'>
              <Button
                type='button'
                variant='outline'
                onClick={() => router.push('/dashboard/warranty')}
                className='rounded-full h-[52px] border-[#4e4e4e] bg-transparent text-white hover:bg-white/5'
              >
                Annulla
              </Button>
              <Button type='submit' disabled={isSubmitting} className='rounded-full h-[52px] bg-white text-[#0d0d0d] hover:bg-[#e5e5e5]'>
                {isSubmitting ? (
                  <>
                    <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                    Salvataggio...
                  </>
                ) : (
                  'Crea Garanzia'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
