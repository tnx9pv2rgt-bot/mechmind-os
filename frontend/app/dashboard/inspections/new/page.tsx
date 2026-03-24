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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    <div className='fixed inset-0 bg-[#1a1a1a] flex items-center justify-center p-4 overflow-hidden'>
      <div className='relative w-[min(900px,95vw)] h-[min(900px,95vh)]'>
        <motion.div
          className='relative z-10 w-full h-full bg-[#2f2f2f] rounded-[40px] shadow-[0_0_60px_rgba(0,0,0,0.5)] border border-[#4e4e4e] overflow-hidden flex flex-col'
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className='px-10 pt-8 pb-4'>
            <Breadcrumb items={[{ label: 'Ispezioni', href: '/dashboard/inspections' }, { label: 'Nuova Ispezione' }]} />
            <div className='flex items-center justify-between mb-6'>
              <div>
                <h1 className='text-3xl font-semibold text-white tracking-tight'>
                  Nuova Ispezione
                </h1>
                <p className='text-[#888] mt-1'>
                  Wizard 7 step - AI + Blockchain
                </p>
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-sm text-[#888]'>Step</span>
                <span className='text-2xl font-bold text-white'>{step}</span>
                <span className='text-[#888]'>/</span>
                <span className='text-[#888]'>{totalSteps}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className='h-2 bg-[#4e4e4e] rounded-full overflow-hidden'>
              <motion.div
                className='h-full bg-white'
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Step Indicators */}
            <div className='flex items-center justify-between mt-4'>
              {steps.map(s => (
                <div
                  key={s.num}
                  className={`flex items-center gap-2 transition-all ${
                    s.num === step
                      ? 'text-white cursor-default'
                      : s.num < step
                        ? 'text-white hover:opacity-70 cursor-pointer hover:scale-105'
                        : 'text-[#888] cursor-not-allowed'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      s.num <= step
                        ? 'bg-white text-[#1a1a1a]'
                        : 'bg-[#4e4e4e] text-[#888]'
                    }`}
                  >
                    {s.num < step ? '✓' : s.num}
                  </div>
                  <span className='hidden sm:inline text-sm font-medium'>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className='flex-1 px-10 pb-24 overflow-y-auto'>
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className='space-y-6'
            >
              {/* Step 1: Vehicle */}
              {step === 1 && (
                <div className='space-y-6'>
                  <div className='flex items-center gap-3 mb-6'>
                    <div className='w-12 h-12 rounded-2xl bg-[#4e4e4e] flex items-center justify-center'>
                      <Car className='w-6 h-6 text-white' />
                    </div>
                    <div>
                      <h2 className='text-xl font-semibold text-white'>
                        Dati Veicolo
                      </h2>
                      <p className='text-[#888] text-sm'>
                        Inserisci i dati del veicolo da ispezionare
                      </p>
                    </div>
                  </div>

                  <div className='grid grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <Label
                        htmlFor='plate'
                        className='text-sm font-medium text-white'
                      >
                        Targa
                      </Label>
                      <Input
                        id='plate'
                        placeholder='AB123CD'
                        className='h-[52px] rounded-full border border-[#4e4e4e] bg-[#1a1a1a] text-white placeholder-[#888] outline-none px-4'
                        {...register('plate')}
                      />
                      {errors.plate && <p className='text-xs text-red-500 mt-1'>{errors.plate.message}</p>}
                    </div>
                    <div className='space-y-2'>
                      <Label
                        htmlFor='vehicle'
                        className='text-sm font-medium text-white'
                      >
                        Veicolo
                      </Label>
                      <Input
                        id='vehicle'
                        placeholder='BMW X5'
                        className='h-[52px] rounded-full border border-[#4e4e4e] bg-[#1a1a1a] text-white placeholder-[#888] outline-none px-4'
                        {...register('vehicle')}
                      />
                      {errors.vehicle && (
                        <p className='text-xs text-red-500 mt-1'>{errors.vehicle.message}</p>
                      )}
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='customer' className='text-sm font-medium text-white'>
                      Cliente
                    </Label>
                    <Input
                      id='customer'
                      placeholder='Nome cliente'
                      className='h-[52px] rounded-full border border-[#4e4e4e] bg-[#1a1a1a] text-white placeholder-[#888] outline-none px-4'
                      {...register('customer')}
                    />
                    {errors.customer && (
                      <p className='text-xs text-red-500 mt-1'>{errors.customer.message}</p>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <Label className='text-sm font-medium text-white'>Tipo Ispezione</Label>
                    <div className='flex flex-wrap gap-2'>
                      {['PRE_PURCHASE', 'PERIODIC', 'PRE_SALE', 'WARRANTY', 'ACCIDENT'].map(
                        type => (
                          <Badge
                            key={type}
                            variant={formData.type === type ? 'default' : 'outline'}
                            className={`cursor-pointer px-4 py-2 text-sm rounded-full ${
                              formData.type === type
                                ? 'border-[#ececec] bg-[#383838] text-white'
                                : 'text-[#888] bg-transparent border-[#4e4e4e] hover:bg-white/5'
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
              )}

              {/* Steps 2-7: Placeholder */}
              {step > 1 && (
                <div className='text-center py-12'>
                  <div className='w-16 h-16 rounded-2xl bg-[#4e4e4e] flex items-center justify-center mx-auto mb-4'>
                    {(() => {
                      const Icon = steps[step - 1].icon;
                      return <Icon className='w-8 h-8 text-gray-400' />;
                    })()}
                  </div>
                  <h3 className='text-xl font-semibold text-white mb-2'>
                    {steps[step - 1].label}
                  </h3>
                  <p className='text-[#888] max-w-md mx-auto'>
                    Questa sezione include {steps[step - 1].label.toLowerCase()} inspection con AI
                    detection, foto e annotazioni.
                  </p>

                  <div className='flex justify-center gap-2 mt-6'>
                    {step === 2 && (
                      <>
                        <Badge variant='outline'>📸 Foto AI</Badge>
                        <Badge variant='outline'>🎥 Video 360°</Badge>
                      </>
                    )}
                    {step === 4 && (
                      <>
                        <Badge variant='outline'>💧 Umidità</Badge>
                        <Badge variant='outline'>👃 Odori</Badge>
                        <Badge variant='outline'>🦠 Muffa</Badge>
                      </>
                    )}
                    {step === 7 && (
                      <>
                        <Badge variant='outline'>🔌 OBD-II</Badge>
                        <Badge variant='outline'>⚡ Elettronica</Badge>
                      </>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Footer */}
          <div className='absolute bottom-0 left-0 right-0 px-10 py-6 bg-[#2f2f2f] border-t border-[#4e4e4e]'>
            <div className='flex items-center justify-between'>
              <Button
                onClick={handleBack}
                disabled={isSubmitting}
                className='rounded-full px-6 h-[52px] border border-[#4e4e4e] bg-transparent text-white hover:bg-white/5 transition-all'
              >
                <ChevronLeft className='w-5 h-5 mr-2' />
                Indietro
              </Button>

              {step < totalSteps ? (
                <Button
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className='rounded-full px-8 h-[52px] bg-white text-[#0d0d0d] hover:bg-[#e5e5e5] transition-all'
                >
                  Avanti
                  <ChevronRight className='w-5 h-5 ml-2' />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className='rounded-full px-8 h-[52px] bg-white text-[#0d0d0d] hover:bg-[#e5e5e5] transition-all'
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className='w-5 h-5 mr-2 animate-spin' />
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <CheckCircle className='w-5 h-5 mr-2' />
                      Completa Ispezione
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
