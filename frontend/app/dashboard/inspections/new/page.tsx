'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

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

export default function NewInspectionPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    plate: '',
    vehicle: '',
    customer: '',
    type: 'PRE_PURCHASE',
  });

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else router.push('/dashboard/inspections');
  };

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    const result = inspectionSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const [key, msgs] of Object.entries(result.error.flatten().fieldErrors)) {
        if (msgs && msgs.length > 0) fieldErrors[key] = msgs[0];
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: 'default',
          vehicleId: formData.plate,
          customerId: formData.customer,
          mechanicId: 'current-user',
          notes: `Tipo: ${formData.type}, Veicolo: ${formData.vehicle}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.details || 'Errore creazione ispezione');
      const newId = json.data?.id || json.id || 'new';
      router.push(`/dashboard/inspections/${newId}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Errore durante il salvataggio');
      setIsSubmitting(false);
    }
  };

  const progress = (step / totalSteps) * 100;

  return (
    <div className='fixed inset-0 bg-white dark:bg-[#212121] flex items-center justify-center p-4 overflow-hidden'>
      <div className='relative w-[min(900px,95vw)] h-[min(900px,95vh)]'>
        <motion.div
          className='relative z-10 w-full h-full bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple rounded-[40px] shadow-2xl border border-apple-border/20 dark:border-[#424242]/50 overflow-hidden flex flex-col'
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className='px-10 pt-8 pb-4'>
            <div className='flex items-center justify-between mb-6'>
              <div>
                <h1 className='text-3xl font-semibold text-gray-900 dark:text-[#ececec] tracking-tight'>
                  Nuova Ispezione
                </h1>
                <p className='text-gray-500 dark:text-[#636366] mt-1'>
                  Wizard 7 step - AI + Blockchain
                </p>
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-sm text-gray-500 dark:text-gray-400'>Step</span>
                <span className='text-2xl font-bold text-black dark:text-[#ececec]'>{step}</span>
                <span className='text-gray-500 dark:text-gray-400'>/</span>
                <span className='text-gray-500 dark:text-gray-400'>{totalSteps}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className='h-2 bg-gray-200 dark:bg-[#424242] rounded-full overflow-hidden'>
              <motion.div
                className='h-full bg-black dark:bg-[#ececec]'
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
                      ? 'text-black dark:text-[#ececec] cursor-default'
                      : s.num < step
                        ? 'text-black dark:text-[#ececec] hover:opacity-70 cursor-pointer hover:scale-105'
                        : 'text-gray-400 dark:text-[#6e6e6e] cursor-not-allowed'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      s.num <= step
                        ? 'bg-black dark:bg-[#ececec] text-white dark:text-[#212121]'
                        : 'bg-gray-200 dark:bg-[#424242] text-gray-500 dark:text-[#636366]'
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
                    <div className='w-12 h-12 rounded-2xl bg-gray-800 flex items-center justify-center'>
                      <Car className='w-6 h-6 text-white' />
                    </div>
                    <div>
                      <h2 className='text-xl font-semibold text-gray-900 dark:text-[#ececec]'>
                        Dati Veicolo
                      </h2>
                      <p className='text-gray-500 dark:text-[#636366] text-sm'>
                        Inserisci i dati del veicolo da ispezionare
                      </p>
                    </div>
                  </div>

                  <div className='grid grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <Label
                        htmlFor='plate'
                        className='text-sm font-medium text-gray-700 dark:text-[#636366]'
                      >
                        Targa
                      </Label>
                      <Input
                        id='plate'
                        placeholder='AB123CD'
                        className='h-14 rounded-xl border-gray-200 focus:border-blue-500'
                        value={formData.plate}
                        onChange={e => setFormData({ ...formData, plate: e.target.value })}
                      />
                      {errors.plate && <p className='text-xs text-red-500 mt-1'>{errors.plate}</p>}
                    </div>
                    <div className='space-y-2'>
                      <Label
                        htmlFor='vehicle'
                        className='text-sm font-medium text-gray-700 dark:text-[#636366]'
                      >
                        Veicolo
                      </Label>
                      <Input
                        id='vehicle'
                        placeholder='BMW X5'
                        className='h-14 rounded-xl border-gray-200 focus:border-blue-500'
                        value={formData.vehicle}
                        onChange={e => setFormData({ ...formData, vehicle: e.target.value })}
                      />
                      {errors.vehicle && (
                        <p className='text-xs text-red-500 mt-1'>{errors.vehicle}</p>
                      )}
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='customer' className='text-sm font-medium text-gray-700'>
                      Cliente
                    </Label>
                    <Input
                      id='customer'
                      placeholder='Nome cliente'
                      className='h-14 rounded-xl border-gray-200 focus:border-blue-500'
                      value={formData.customer}
                      onChange={e => setFormData({ ...formData, customer: e.target.value })}
                    />
                    {errors.customer && (
                      <p className='text-xs text-red-500 mt-1'>{errors.customer}</p>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <Label className='text-sm font-medium text-gray-700'>Tipo Ispezione</Label>
                    <div className='flex flex-wrap gap-2'>
                      {['PRE_PURCHASE', 'PERIODIC', 'PRE_SALE', 'WARRANTY', 'ACCIDENT'].map(
                        type => (
                          <Badge
                            key={type}
                            variant={formData.type === type ? 'default' : 'outline'}
                            className={`cursor-pointer px-4 py-2 text-sm ${
                              formData.type === type
                                ? 'bg-apple-green text-white hover:bg-green-600 border-apple-green'
                                : 'text-white bg-black dark:bg-[#353535] border-transparent hover:border-apple-green'
                            }`}
                            role='button'
                            tabIndex={0}
                            onClick={() => setFormData({ ...formData, type })}
                            onKeyDown={(e: React.KeyboardEvent) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setFormData({ ...formData, type });
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
                  <div className='w-16 h-16 rounded-2xl bg-gray-100 dark:bg-[#353535] flex items-center justify-center mx-auto mb-4'>
                    {(() => {
                      const Icon = steps[step - 1].icon;
                      return <Icon className='w-8 h-8 text-gray-400' />;
                    })()}
                  </div>
                  <h3 className='text-xl font-semibold text-gray-900 dark:text-[#ececec] mb-2'>
                    {steps[step - 1].label}
                  </h3>
                  <p className='text-gray-500 dark:text-[#636366] max-w-md mx-auto'>
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
          <div className='absolute bottom-0 left-0 right-0 px-10 py-6 bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-t border-apple-border/20 dark:border-[#424242]/50'>
            <div className='flex items-center justify-between'>
              <Button
                onClick={handleBack}
                disabled={isSubmitting}
                className='rounded-full px-6 h-12 border-2 border-black dark:border-[#424242] bg-white dark:bg-[#2f2f2f] text-black dark:text-[#ececec] hover:bg-gray-100 dark:hover:bg-[#424242] transition-all'
              >
                <ChevronLeft className='w-5 h-5 mr-2' />
                Indietro
              </Button>

              {step < totalSteps ? (
                <Button
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className='rounded-full px-8 h-12 border-2 border-black dark:border-[#424242] bg-white dark:bg-[#2f2f2f] text-black dark:text-[#ececec] hover:bg-gray-100 dark:hover:bg-[#424242] shadow-lg hover:shadow-xl transition-all'
                >
                  Avanti
                  <ChevronRight className='w-5 h-5 ml-2' />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className='rounded-full px-8 h-12 bg-apple-green hover:bg-green-600 text-white shadow-lg hover:shadow-xl transition-all border-0'
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
