'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  Car,
  QrCode,
  Wifi,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

const pairSchema = z.object({
  vehicleId: z.string().min(1, 'Seleziona un veicolo'),
  deviceId: z.string().min(1, 'Inserisci l\'ID del dispositivo'),
});

type PairForm = z.infer<typeof pairSchema>;

interface Vehicle {
  id: string;
  make: string;
  model: string;
  plate: string;
  year: number;
}

const STEPS = [
  { label: 'Veicolo', icon: Car },
  { label: 'Dispositivo', icon: QrCode },
  { label: 'Test', icon: Wifi },
  { label: 'Conferma', icon: Check },
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function OBDPairPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [testResult, setTestResult] = useState<'idle' | 'testing' | 'success' | 'fail'>('idle');
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<PairForm>({
    resolver: zodResolver(pairSchema),
  });

  const { data: vehiclesData, isLoading: vehiclesLoading } = useSWR<{ data?: Vehicle[] } | Vehicle[]>(
    '/api/dashboard/vehicles',
    fetcher
  );

  const vehicles: Vehicle[] = (() => {
    if (!vehiclesData) return [];
    const list = (vehiclesData as { data?: Vehicle[] }).data || vehiclesData;
    return Array.isArray(list) ? list : [];
  })();

  const formValues = watch();
  const selectedVehicle = vehicles.find(v => v.id === formValues.vehicleId);

  const handleTest = async () => {
    setTestResult('testing');
    try {
      const res = await fetch('/api/dashboard/obd/devices/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId: formValues.vehicleId, deviceId: formValues.deviceId, test: true }),
      });
      if (!res.ok) throw new Error('Test fallito');
      setTestResult('success');
    } catch {
      setTestResult('fail');
    }
  };

  const onSubmit = async (data: PairForm) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/dashboard/obd/devices/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId: data.vehicleId, deviceId: data.deviceId }),
      });
      if (!res.ok) throw new Error('Errore nell\'associazione');
      toast.success('Dispositivo associato con successo');
      router.push(`/dashboard/obd/${data.vehicleId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nell\'associazione');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <header>
        <div className='px-8 py-5'>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Diagnostica OBD', href: '/dashboard/obd' },
              { label: 'Associa Dispositivo' },
            ]}
          />
          <h1 className='text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Associa Dispositivo OBD</h1>
        </div>
      </header>

      <div className='p-8 max-w-2xl mx-auto'>
        {/* Step Indicator */}
        <div className='flex items-center justify-between mb-8'>
          {STEPS.map((s, i) => (
            <div key={s.label} className='flex items-center'>
              <div className={`flex items-center gap-2 ${i <= step ? 'text-[var(--brand)]' : 'text-[var(--text-tertiary)]/40'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-footnote font-bold ${
                  i < step ? 'bg-[var(--brand)] text-[var(--text-on-brand)]' : i === step ? 'bg-[var(--brand)]/10 text-[var(--brand)] border-2 border-[var(--brand)]' : 'bg-[var(--surface-secondary)] dark:bg-[var(--surface-hover)] text-[var(--text-tertiary)]'
                }`}>
                  {i < step ? <Check className='h-4 w-4' /> : i + 1}
                </div>
                <span className='text-footnote font-medium hidden sm:inline'>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 sm:w-16 h-0.5 mx-2 ${i < step ? 'bg-[var(--brand)]' : 'bg-[var(--surface-secondary)] dark:bg-[var(--surface-hover)]'}`} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Step 1: Vehicle */}
          {step === 0 && (
            <motion.div initial='hidden' animate='visible' variants={cardVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Seleziona Veicolo</h2>
                </AppleCardHeader>
                <AppleCardContent>
                  {vehiclesLoading ? (
                    <div className='flex items-center justify-center py-8'>
                      <Loader2 className='h-6 w-6 animate-spin text-[var(--brand)]' />
                    </div>
                  ) : vehicles.length === 0 ? (
                    <div className='text-center py-8'>
                      <Car className='h-8 w-8 text-[var(--text-tertiary)]/40 mx-auto mb-3' />
                      <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Nessun veicolo disponibile</p>
                    </div>
                  ) : (
                    <div className='space-y-2 max-h-96 overflow-y-auto'>
                      {vehicles.map(v => (
                        <button
                          key={v.id}
                          type='button'
                          onClick={() => setValue('vehicleId', v.id)}
                          className={`w-full p-4 rounded-2xl text-left transition-all border-2 ${
                            formValues.vehicleId === v.id
                              ? 'border-[var(--brand)] bg-[var(--brand)]/5'
                              : 'border-transparent bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-active)]'
                          }`}
                        >
                          <div className='flex items-center gap-3'>
                            <Car className='h-5 w-5 text-[var(--brand)]' />
                            <div>
                              <p className='text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                                {v.make} {v.model} ({v.year})
                              </p>
                              <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Targa: {v.plate}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {errors.vehicleId && <p className='text-footnote text-[var(--status-error)] mt-2'>{errors.vehicleId.message}</p>}
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          )}

          {/* Step 2: Device ID */}
          {step === 1 && (
            <motion.div initial='hidden' animate='visible' variants={cardVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>ID Dispositivo</h2>
                </AppleCardHeader>
                <AppleCardContent className='space-y-4'>
                  <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                    Inserisci l&apos;ID del dispositivo OBD-II o scansiona il codice QR sulla confezione.
                  </p>
                  <div>
                    <label className='text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-2 block'>ID Dispositivo</label>
                    <Input {...register('deviceId')} placeholder='Es: OBD-2024-XXXX' />
                    {errors.deviceId && <p className='text-footnote text-[var(--status-error)] mt-1'>{errors.deviceId.message}</p>}
                  </div>
                  <div className='p-4 bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] rounded-xl text-center'>
                    <QrCode className='h-16 w-16 text-[var(--text-tertiary)]/40 mx-auto mb-2' />
                    <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                      Scansione QR disponibile su dispositivi mobili
                    </p>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          )}

          {/* Step 3: Connection Test */}
          {step === 2 && (
            <motion.div initial='hidden' animate='visible' variants={cardVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Test Connessione</h2>
                </AppleCardHeader>
                <AppleCardContent className='text-center py-8 space-y-6'>
                  {testResult === 'idle' && (
                    <>
                      <Wifi className='h-16 w-16 text-[var(--text-tertiary)]/40 mx-auto' />
                      <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                        Verifica che il dispositivo {formValues.deviceId} sia acceso e nelle vicinanze.
                      </p>
                      <AppleButton type='button' onClick={handleTest}>Avvia Test</AppleButton>
                    </>
                  )}
                  {testResult === 'testing' && (
                    <>
                      <Loader2 className='h-16 w-16 text-[var(--brand)] mx-auto animate-spin' />
                      <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Test in corso...</p>
                    </>
                  )}
                  {testResult === 'success' && (
                    <>
                      <CheckCircle className='h-16 w-16 text-[var(--status-success)] mx-auto' />
                      <p className='text-body font-medium text-[var(--status-success)]'>Connessione riuscita</p>
                    </>
                  )}
                  {testResult === 'fail' && (
                    <>
                      <AlertCircle className='h-16 w-16 text-[var(--status-error)] mx-auto' />
                      <p className='text-body text-[var(--status-error)]'>Test fallito. Verifica il dispositivo.</p>
                      <AppleButton type='button' variant='secondary' onClick={handleTest}>Riprova</AppleButton>
                    </>
                  )}
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          )}

          {/* Step 4: Confirm */}
          {step === 3 && (
            <motion.div initial='hidden' animate='visible' variants={cardVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Conferma Associazione</h2>
                </AppleCardHeader>
                <AppleCardContent className='space-y-4'>
                  <div className='space-y-3'>
                    <div className='flex justify-between text-body py-2 border-b border-[var(--border-default)]/10 dark:border-[var(--border-default)]/30'>
                      <span className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Veicolo</span>
                      <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                        {selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.plate})` : '-'}
                      </span>
                    </div>
                    <div className='flex justify-between text-body py-2 border-b border-[var(--border-default)]/10 dark:border-[var(--border-default)]/30'>
                      <span className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Dispositivo</span>
                      <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>{formValues.deviceId}</span>
                    </div>
                    <div className='flex justify-between text-body py-2'>
                      <span className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Test connessione</span>
                      <span className={`font-medium ${testResult === 'success' ? 'text-[var(--status-success)]' : 'text-[var(--status-warning)]'}`}>
                        {testResult === 'success' ? 'Superato' : 'Non verificato'}
                      </span>
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          )}

          {/* Navigation */}
          <div className='flex items-center justify-between mt-6'>
            <AppleButton
              variant='ghost'
              type='button'
              icon={<ArrowLeft className='h-4 w-4' />}
              onClick={() => step > 0 ? setStep(step - 1) : router.push('/dashboard/obd')}
            >
              {step === 0 ? 'Annulla' : 'Indietro'}
            </AppleButton>
            {step < 3 ? (
              <AppleButton
                type='button'
                icon={<ArrowRight className='h-4 w-4' />}
                disabled={
                  (step === 0 && !formValues.vehicleId) ||
                  (step === 1 && !formValues.deviceId)
                }
                onClick={() => setStep(step + 1)}
              >
                Avanti
              </AppleButton>
            ) : (
              <AppleButton type='submit' icon={<Check className='h-4 w-4' />} loading={submitting}>
                Conferma Associazione
              </AppleButton>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
