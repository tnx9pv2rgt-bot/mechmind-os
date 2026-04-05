'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Car,
  Camera,
  Wind,
  Settings,
  CircleDot,
  Cpu,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AppleCard,
  AppleCardContent,
  AppleCardHeader,
} from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/ui/breadcrumb';

const inspectionSchema = z.object({
  type: z.enum(['PRE_PURCHASE', 'PERIODIC', 'PRE_SALE', 'WARRANTY', 'ACCIDENT'], {
    required_error: 'Tipo ispezione obbligatorio',
  }),
  plate: z.string().min(1, 'Targa obbligatoria'),
  vehicle: z.string().min(1, 'Veicolo obbligatorio'),
  customer: z.string().min(1, 'Cliente obbligatorio'),
});

const totalSteps = 7;

const steps = [
  { num: 1, label: 'Veicolo', icon: Car },
  { num: 2, label: 'Esterno', icon: Camera },
  { num: 3, label: 'Interno', icon: CircleDot },
  { num: 4, label: 'Sensoriale', icon: Wind },
  { num: 5, label: 'Motore', icon: Settings },
  { num: 6, label: 'Gomme', icon: CircleDot },
  { num: 7, label: 'Elettronica', icon: Cpu },
];

type InspectionFormData = z.infer<typeof inspectionSchema>;

export default function NewInspectionPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InspectionFormData>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: {
      plate: '',
      vehicle: '',
      customer: '',
      type: 'PRE_PURCHASE',
    },
  });

  const formData = watch();

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else router.push('/dashboard/inspections');
  };

  const onSubmit = async (data: InspectionFormData) => {
    setSubmitError(null);
    try {
      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: 'default',
          vehicleId: data.plate,
          customerId: data.customer,
          mechanicId: 'current-user',
          notes: `Tipo: ${data.type}, Veicolo: ${data.vehicle}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.details || 'Errore creazione ispezione');
      const newId = json.data?.id || json.id || 'new';
      toast.success('Ispezione creata con successo');
      router.push(`/dashboard/inspections/${newId}`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Errore durante il salvataggio';
      setSubmitError(errMsg);
      toast.error(errMsg);
    }
  };

  const handleSubmit = () => {
    rhfHandleSubmit(onSubmit)();
  };

  const progress = (step / totalSteps) * 100;

  return (
    <div>
      {/* Header */}
      <header>
        <div className='px-8 py-5'>
          <Breadcrumb items={[{ label: 'Ispezioni', href: '/dashboard/inspections' }, { label: 'Nuova Ispezione' }]} />
          <div className='flex items-center justify-between mt-2'>
            <div>
              <h1 className='text-headline text-apple-dark dark:text-[var(--text-primary)]'>
                Nuova Ispezione
              </h1>
              <p className='text-body text-apple-gray dark:text-[var(--text-secondary)] mt-1'>
                Wizard 7 step - AI + Blockchain
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <span className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>Step</span>
              <span className='text-title-2 font-bold text-apple-dark dark:text-[var(--text-primary)]'>{step}</span>
              <span className='text-apple-gray dark:text-[var(--text-secondary)]'>/</span>
              <span className='text-apple-gray dark:text-[var(--text-secondary)]'>{totalSteps}</span>
            </div>
          </div>
        </div>
      </header>

      <div className='p-8 max-w-4xl mx-auto space-y-6'>
        {/* Progress Bar */}
        <AppleCard hover={false}>
          <AppleCardContent>
            <div className='h-2 bg-apple-light-gray dark:bg-[var(--surface-hover)] rounded-full overflow-hidden'>
              <motion.div
                className='h-full bg-apple-blue'
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Step Indicators */}
            <div className='flex items-center justify-between mt-4'>
              {steps.map(s => (
                <button
                  key={s.num}
                  onClick={() => s.num < step && setStep(s.num)}
                  className={`flex items-center gap-2 transition-all ${
                    s.num === step
                      ? 'text-apple-dark dark:text-[var(--text-primary)] cursor-default'
                      : s.num < step
                        ? 'text-apple-blue hover:opacity-70 cursor-pointer hover:scale-105'
                        : 'text-apple-gray dark:text-[var(--text-secondary)] cursor-not-allowed'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      s.num === step
                        ? 'bg-apple-blue text-white'
                        : s.num < step
                          ? 'bg-apple-green text-white'
                          : 'bg-apple-light-gray dark:bg-[var(--surface-hover)] text-apple-gray dark:text-[var(--text-secondary)]'
                    }`}
                  >
                    {s.num < step ? <CheckCircle className='h-4 w-4' /> : s.num}
                  </div>
                  <span className='hidden sm:inline text-footnote font-medium'>{s.label}</span>
                </button>
              ))}
            </div>
          </AppleCardContent>
        </AppleCard>

        {/* Content */}
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Step 1: Vehicle */}
          {step === 1 && (
            <AppleCard hover={false}>
              <AppleCardHeader>
                <div className='flex items-center gap-3'>
                  <div className='w-12 h-12 rounded-2xl bg-apple-blue/10 flex items-center justify-center'>
                    <Car className='w-6 h-6 text-apple-blue' />
                  </div>
                  <div>
                    <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                      Dati Veicolo
                    </h2>
                    <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                      Inserisci i dati del veicolo da ispezionare
                    </p>
                  </div>
                </div>
              </AppleCardHeader>
              <AppleCardContent>
                <div className='space-y-4'>
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <label
                        htmlFor='plate'
                        className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]'
                      >
                        Targa
                      </label>
                      <Input
                        id='plate'
                        placeholder='AB123CD'
                        {...register('plate')}
                      />
                      {errors.plate && <p className='text-footnote text-apple-red mt-1'>{errors.plate.message}</p>}
                    </div>
                    <div className='space-y-2'>
                      <label
                        htmlFor='vehicle'
                        className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]'
                      >
                        Veicolo
                      </label>
                      <Input
                        id='vehicle'
                        placeholder='BMW X5'
                        {...register('vehicle')}
                      />
                      {errors.vehicle && (
                        <p className='text-footnote text-apple-red mt-1'>{errors.vehicle.message}</p>
                      )}
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <label htmlFor='customer' className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                      Cliente
                    </label>
                    <Input
                      id='customer'
                      placeholder='Nome cliente'
                      {...register('customer')}
                    />
                    {errors.customer && (
                      <p className='text-footnote text-apple-red mt-1'>{errors.customer.message}</p>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <label className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]'>Tipo Ispezione</label>
                    <div className='flex flex-wrap gap-2'>
                      {['PRE_PURCHASE', 'PERIODIC', 'PRE_SALE', 'WARRANTY', 'ACCIDENT'].map(
                        type => (
                          <Badge
                            key={type}
                            variant={formData.type === type ? 'default' : 'outline'}
                            className={`cursor-pointer px-4 py-2 text-sm rounded-full ${
                              formData.type === type
                                ? 'bg-apple-blue text-white border-apple-blue'
                                : 'text-apple-gray dark:text-[var(--text-secondary)] bg-transparent border-apple-border/20 dark:border-[var(--border-default)] hover:bg-apple-light-gray/50 dark:hover:bg-[var(--surface-hover)]'
                            }`}
                            role='button'
                            tabIndex={0}
                            onClick={() => setValue('type', type as InspectionFormData['type'])}
                            onKeyDown={(e: React.KeyboardEvent) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setValue('type', type as InspectionFormData['type']);
                              }
                            }}
                          >
                            {type === 'PRE_PURCHASE' && 'Pre-Acquisto'}
                            {type === 'PERIODIC' && 'Periodica'}
                            {type === 'PRE_SALE' && 'Pre-Vendita'}
                            {type === 'WARRANTY' && 'Garanzia'}
                            {type === 'ACCIDENT' && 'Incidente'}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </AppleCardContent>
            </AppleCard>
          )}

          {/* Steps 2-7: Placeholder */}
          {step > 1 && (
            <AppleCard hover={false}>
              <AppleCardContent>
                <div className='text-center py-12'>
                  <div className='w-16 h-16 rounded-2xl bg-apple-blue/10 flex items-center justify-center mx-auto mb-4'>
                    {(() => {
                      const Icon = steps[step - 1].icon;
                      return <Icon className='w-8 h-8 text-apple-blue' />;
                    })()}
                  </div>
                  <h3 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)] mb-2'>
                    {steps[step - 1].label}
                  </h3>
                  <p className='text-body text-apple-gray dark:text-[var(--text-secondary)] max-w-md mx-auto'>
                    Questa sezione include {steps[step - 1].label.toLowerCase()} inspection con AI
                    detection, foto e annotazioni.
                  </p>

                  <div className='flex justify-center gap-2 mt-6'>
                    {step === 2 && (
                      <>
                        <Badge variant='outline'>Foto AI</Badge>
                        <Badge variant='outline'>Video 360</Badge>
                      </>
                    )}
                    {step === 4 && (
                      <>
                        <Badge variant='outline'>Umidita</Badge>
                        <Badge variant='outline'>Odori</Badge>
                        <Badge variant='outline'>Muffa</Badge>
                      </>
                    )}
                    {step === 7 && (
                      <>
                        <Badge variant='outline'>OBD-II</Badge>
                        <Badge variant='outline'>Elettronica</Badge>
                      </>
                    )}
                  </div>
                </div>
              </AppleCardContent>
            </AppleCard>
          )}
        </motion.div>

        {/* Footer Navigation */}
        <div className='flex items-center justify-between pt-2'>
          <AppleButton
            variant='ghost'
            onClick={handleBack}
            disabled={isSubmitting}
            icon={<ChevronLeft className='w-4 h-4' />}
          >
            Indietro
          </AppleButton>

          {step < totalSteps ? (
            <AppleButton
              onClick={handleNext}
              disabled={isSubmitting}
              icon={<ChevronRight className='w-4 h-4' />}
              iconPosition='right'
            >
              Avanti
            </AppleButton>
          ) : (
            <AppleButton
              onClick={handleSubmit}
              disabled={isSubmitting}
              loading={isSubmitting}
              icon={!isSubmitting ? <CheckCircle className='w-4 h-4' /> : undefined}
            >
              {isSubmitting ? 'Salvataggio...' : 'Completa Ispezione'}
            </AppleButton>
          )}
        </div>
      </div>
    </div>
  );
}
