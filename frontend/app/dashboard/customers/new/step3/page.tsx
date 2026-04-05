'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Car,
  Plus,
  Trash2,
  Loader2,
  Fuel,
  Settings,
  Gauge,
  Zap,
  Palette,
  Calendar,
  Scale,
  Armchair,
  Ruler,
  FileText,
  Tag,
  Wind,
  Info,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { FormLayout } from '@/components/customers/FormLayout';
import { useFormSession } from '@/hooks/useFormSession';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const vehicleSchema = z.object({
  // Dati principali - TUTTO FACOLTATIVO
  plate: z.string().optional().or(z.literal('')),
  make: z.string().optional().or(z.literal('')),
  model: z.string().optional().or(z.literal('')),
  variant: z.string().optional().or(z.literal('')),
  year: z.number().optional().or(z.nan()),
  km: z.number().optional().or(z.nan()),
  vin: z.string().optional().or(z.literal('')),

  // Tipologia - FACOLTATIVO
  vehicleType: z.enum(['auto', 'moto', 'furgone', 'camion', 'rimorchio', 'altro']).optional(),

  // Carburante e motorizzazione - FACOLTATIVO
  fuel: z
    .enum(['benzina', 'diesel', 'gpl', 'metano', 'elettrico', 'ibrido', 'hybrid_plug_in'])
    .optional(),
  displacement: z.number().optional().or(z.nan()),
  powerKw: z.number().optional().or(z.nan()),
  powerCv: z.number().optional().or(z.nan()),

  // Emissioni - FACOLTATIVO
  euroClass: z.string().optional().or(z.literal('')),
  co2: z.number().optional().or(z.nan()),

  // Omologazione - FACOLTATIVO
  natscode: z.string().optional().or(z.literal('')),
  ncte: z.string().optional().or(z.literal('')),

  // Aspetto - FACOLTATIVO
  color: z.string().optional().or(z.literal('')),
  doors: z.number().optional().or(z.nan()),
  seats: z.number().optional().or(z.nan()),

  // Date - FACOLTATIVO
  registrationDate: z.string().optional().or(z.literal('')),
  inspectionExpiry: z.string().optional().or(z.literal('')),

  // Pneumatici - FACOLTATIVO
  tiresFront: z.string().optional().or(z.literal('')),
  tiresRear: z.string().optional().or(z.literal('')),

  // Masse - FACOLTATIVO
  massOwn: z.number().optional().or(z.nan()),
  massMax: z.number().optional().or(z.nan()),
  massTrailer: z.number().optional().or(z.nan()),

  // Dimensioni - FACOLTATIVO
  length: z.number().optional().or(z.nan()),
  width: z.number().optional().or(z.nan()),
  height: z.number().optional().or(z.nan()),

  // Note - FACOLTATIVO
  notes: z.string().optional().or(z.literal('')),
});

const schema = z.object({
  vehicles: z.array(vehicleSchema),
});

type FormData = z.infer<typeof schema>;

const fuelTypes = [
  { value: 'benzina', label: 'Benzina' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'gpl', label: 'GPL' },
  { value: 'metano', label: 'Metano' },
  { value: 'elettrico', label: 'Elettrico' },
  { value: 'ibrido', label: 'Ibrido' },
  { value: 'hybrid_plug_in', label: 'Hybrid Plug-in' },
];

const vehicleTypes = [
  { value: 'auto', label: 'Automobile' },
  { value: 'moto', label: 'Motociclo' },
  { value: 'furgone', label: 'Furgone' },
  { value: 'camion', label: 'Camion' },
  { value: 'rimorchio', label: 'Rimorchio' },
  { value: 'altro', label: 'Altro' },
];

const euroClasses = [
  { value: 'Euro 1', label: 'Euro 1' },
  { value: 'Euro 2', label: 'Euro 2' },
  { value: 'Euro 3', label: 'Euro 3' },
  { value: 'Euro 4', label: 'Euro 4' },
  { value: 'Euro 5', label: 'Euro 5' },
  { value: 'Euro 6', label: 'Euro 6' },
  { value: 'Euro 6d', label: 'Euro 6d' },
  { value: 'Non classificato', label: 'Non classificato' },
];

export default function Step3Page() {
  const router = useRouter();
  const { formData: savedData, saveStep, isLoaded } = useFormSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    defaultValues: {
      vehicles: [
        {
          plate: '',
          make: '',
          model: '',
          vehicleType: undefined,
          year: undefined,
          km: undefined,
          fuel: undefined,
          displacement: undefined,
          powerKw: undefined,
          powerCv: undefined,
          euroClass: '',
          co2: undefined,
          natscode: '',
          ncte: '',
          color: '',
          doors: undefined,
          seats: undefined,
          registrationDate: '',
          inspectionExpiry: '',
          tiresFront: '',
          tiresRear: '',
          massOwn: undefined,
          massMax: undefined,
          massTrailer: undefined,
          length: undefined,
          width: undefined,
          height: undefined,
          notes: '',
        },
      ],
    },
  });


  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'vehicles',
  });

  // Ripristina i veicoli salvati quando si torna indietro
  useEffect(() => {
    if (isLoaded && savedData?.vehicles && savedData.vehicles.length > 0) {
      replace(savedData.vehicles);
    }
  }, [isLoaded, savedData, replace]);

  const handleBack = () => {
    router.push('/dashboard/customers/new/step2');
  };

  // Wrapper sicuro per la navigazione Avanti
  const handleNext = () => {
    setIsSubmitting(true);

    try {
      const data = watch();
      saveStep(3, data);
      toast.success('Veicoli salvati');

      const nextUrl = '/dashboard/customers/new/step4';
      if (typeof window !== 'undefined') {
        window.location.href = nextUrl;
      }
    } catch {
      toast.error('Errore nel salvataggio dei veicoli');
      window.location.href = '/dashboard/customers/new/step4';
    }
  };

  const addVehicle = () => {
    append({
      plate: '',
      make: '',
      model: '',
      vehicleType: undefined,
      year: undefined,
      km: undefined,
      fuel: undefined,
    });
  };

  if (!isLoaded) {
    return (
      <div className='fixed inset-0 bg-apple-light-gray dark:bg-[var(--surface-tertiary)] flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-apple-blue' />
      </div>
    );
  }

  return (
    <FormLayout
      step={3}
      title='Veicoli'
      subtitle='Dati completi del libretto di circolazione'
      onBack={handleBack}
      onNext={handleNext}
      isSubmitting={isSubmitting}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='space-y-6'
      >
        {/* Section Header with Icon */}
        <div className='flex items-center gap-3 mb-6'>
          <div className='w-12 h-12 rounded-2xl bg-apple-blue/10 dark:bg-[var(--surface-hover)] flex items-center justify-center'>
            <Car className='w-6 h-6 text-apple-blue' />
          </div>
          <div>
            <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
              Parco Veicoli
            </h2>
            <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
              Inserisci tutti i dati del libretto
            </p>
          </div>
        </div>

        <AnimatePresence>
          {fields.map((field, index) => (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className='bg-white dark:bg-[var(--surface-elevated)] rounded-2xl p-6 border border-apple-border/20 dark:border-[var(--border-default)] shadow-[var(--shadow-card)] space-y-6'
            >
              {/* Header Veicolo */}
              <div className='flex items-center justify-between mb-4'>
                <div className='flex items-center gap-3'>
                  <span className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                    Veicolo {index + 1}
                  </span>
                </div>
                {fields.length > 1 && (
                  <AppleButton
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => remove(index)}
                    aria-label={`Rimuovi veicolo ${index + 1}`}
                    icon={<Trash2 className='w-4 h-4' />}
                    className='text-apple-red'
                  >
                    Rimuovi
                  </AppleButton>
                )}
              </div>

              {/* === SEZIONE 1: DATI PRINCIPALI === */}
              <div className='space-y-4'>
                <div className='flex items-center gap-2 mb-2'>
                  <div className='w-8 h-8 rounded-xl bg-apple-blue/10 dark:bg-[var(--surface-hover)] flex items-center justify-center'>
                    <Tag className='w-4 h-4 text-apple-blue' />
                  </div>
                  <h3 className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                    Dati Principali
                  </h3>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  {/* Targa */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.plate`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      Targa
                    </Label>
                    <Input
                      id={`vehicles.${index}.plate`}
                      {...register(`vehicles.${index}.plate`)}
                      autoComplete='off'
                      className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none uppercase'
                      placeholder='AB123CD'
                      maxLength={10}
                    />
                  </div>

                  {/* Tipologia */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.vehicleType`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      Tipologia
                    </Label>
                    <Select
                      value={watch(`vehicles.${index}.vehicleType`) || 'none'}
                      onValueChange={v =>
                        setValue(
                          `vehicles.${index}.vehicleType`,
                          v === 'none'
                            ? undefined
                            : (v as FormData['vehicles'][number]['vehicleType'])
                        )
                      }
                    >
                      <SelectTrigger
                        id={`vehicles.${index}.vehicleType`}
                        className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)]'
                      >
                        <SelectValue placeholder='Seleziona...' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='none'>- Nessuna selezione -</SelectItem>
                        {vehicleTypes.map(t => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Marca */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.make`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      Marca
                    </Label>
                    <Input
                      id={`vehicles.${index}.make`}
                      {...register(`vehicles.${index}.make`)}
                      autoComplete='off'
                      className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                      placeholder='Fiat'
                    />
                  </div>

                  {/* Modello */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.model`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      Modello
                    </Label>
                    <Input
                      id={`vehicles.${index}.model`}
                      {...register(`vehicles.${index}.model`)}
                      autoComplete='off'
                      className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                      placeholder='Panda'
                    />
                  </div>

                  {/* Versione/Variante */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.variant`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      Versione
                    </Label>
                    <Input
                      id={`vehicles.${index}.variant`}
                      {...register(`vehicles.${index}.variant`)}
                      autoComplete='off'
                      className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                      placeholder='1.0 Lounge'
                    />
                  </div>

                  {/* VIN */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.vin`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      VIN / Telaio
                    </Label>
                    <Input
                      id={`vehicles.${index}.vin`}
                      {...register(`vehicles.${index}.vin`)}
                      autoComplete='off'
                      className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none uppercase'
                      placeholder='ZFA31200000012345'
                      maxLength={17}
                    />
                  </div>
                </div>
              </div>

              {/* === SEZIONE 2: MOTORIZZAZIONE === */}
              <div className='space-y-4 pt-4 border-t border-apple-border/20 dark:border-[var(--border-default)]'>
                <div className='flex items-center gap-2 mb-2'>
                  <div className='w-8 h-8 rounded-xl bg-apple-blue/10 dark:bg-[var(--surface-hover)] flex items-center justify-center'>
                    <Settings className='w-4 h-4 text-apple-blue' />
                  </div>
                  <h3 className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                    Motorizzazione
                  </h3>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  {/* Carburante */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.fuel`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      Carburante
                    </Label>
                    <Select
                      value={watch(`vehicles.${index}.fuel`) || 'none'}
                      onValueChange={v =>
                        setValue(
                          `vehicles.${index}.fuel`,
                          v === 'none' ? undefined : (v as FormData['vehicles'][number]['fuel'])
                        )
                      }
                    >
                      <SelectTrigger
                        id={`vehicles.${index}.fuel`}
                        className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)]'
                      >
                        <SelectValue placeholder='Seleziona...' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='none'>- Nessuna selezione -</SelectItem>
                        {fuelTypes.map(f => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Cilindrata */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.displacement`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      Cilindrata (cc)
                    </Label>
                    <Input
                      id={`vehicles.${index}.displacement`}
                      type='number'
                      {...register(`vehicles.${index}.displacement`, { valueAsNumber: true })}
                      autoComplete='off'
                      className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                      placeholder='999'
                    />
                  </div>

                  {/* Potenza kW */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.powerKw`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      Potenza (kW)
                    </Label>
                    <Input
                      id={`vehicles.${index}.powerKw`}
                      type='number'
                      step='0.1'
                      {...register(`vehicles.${index}.powerKw`, {
                        valueAsNumber: true,
                        onChange: e => {
                          const kw = parseFloat(e.target.value);
                          if (!isNaN(kw) && kw > 0) {
                            const cv = Math.round((kw / 0.735) * 10) / 10;
                            setValue(`vehicles.${index}.powerCv`, cv);
                          }
                        },
                      })}
                      autoComplete='off'
                      className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                      placeholder='51'
                    />
                  </div>

                  {/* Potenza CV */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.powerCv`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      Potenza (CV)
                    </Label>
                    <Input
                      id={`vehicles.${index}.powerCv`}
                      type='number'
                      step='0.1'
                      {...register(`vehicles.${index}.powerCv`, {
                        valueAsNumber: true,
                        onChange: e => {
                          const cv = parseFloat(e.target.value);
                          if (!isNaN(cv) && cv > 0) {
                            const kw = Math.round(cv * 0.735 * 10) / 10;
                            setValue(`vehicles.${index}.powerKw`, kw);
                          }
                        },
                      })}
                      autoComplete='off'
                      className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                      placeholder='69'
                    />
                  </div>
                </div>
              </div>

              {/* === SEZIONE 3: EMISSIONI === */}
              <div className='space-y-4 pt-4 border-t border-apple-border/20 dark:border-[var(--border-default)]'>
                <div className='flex items-center gap-2 mb-2'>
                  <div className='w-8 h-8 rounded-xl bg-apple-blue/10 dark:bg-[var(--surface-hover)] flex items-center justify-center'>
                    <Wind className='w-4 h-4 text-apple-blue' />
                  </div>
                  <h3 className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>Emissioni</h3>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  {/* Classe Euro */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.euroClass`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      Classe Euro
                    </Label>
                    <Select
                      value={watch(`vehicles.${index}.euroClass`) || 'none'}
                      onValueChange={v =>
                        setValue(`vehicles.${index}.euroClass`, v === 'none' ? '' : v)
                      }
                    >
                      <SelectTrigger
                        id={`vehicles.${index}.euroClass`}
                        className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)]'
                      >
                        <SelectValue placeholder='Seleziona...' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='none'>- Nessuna selezione -</SelectItem>
                        {euroClasses.map(e => (
                          <SelectItem key={e.value} value={e.value}>
                            {e.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* CO2 */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.co2`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      CO₂ (g/km)
                    </Label>
                    <Input
                      id={`vehicles.${index}.co2`}
                      type='number'
                      {...register(`vehicles.${index}.co2`, { valueAsNumber: true })}
                      autoComplete='off'
                      className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                      placeholder='105'
                    />
                  </div>
                </div>
              </div>

              {/* === SEZIONE 4: OMOLOGAZIONE === */}
              <div className='space-y-4 pt-4 border-t border-apple-border/20 dark:border-[var(--border-default)]'>
                <div className='flex items-center gap-2 mb-2'>
                  <div className='w-8 h-8 rounded-xl bg-apple-blue/10 dark:bg-[var(--surface-hover)] flex items-center justify-center'>
                    <FileText className='w-4 h-4 text-apple-blue' />
                  </div>
                  <h3 className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>Omologazione</h3>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  {/* NATS */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.natscode`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      Codice NATS
                    </Label>
                    <Input
                      id={`vehicles.${index}.natscode`}
                      {...register(`vehicles.${index}.natscode`)}
                      autoComplete='off'
                      className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none uppercase'
                      placeholder='e1*2001/116*0035*01'
                    />
                  </div>

                  {/* NCTE */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.ncte`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      NCTE
                    </Label>
                    <Input
                      id={`vehicles.${index}.ncte`}
                      {...register(`vehicles.${index}.ncte`)}
                      autoComplete='off'
                      className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none uppercase'
                      placeholder='N1234AB'
                    />
                  </div>
                </div>
              </div>

              {/* === SEZIONE 5: DATI AMMINISTRATIVI === */}
              <div className='space-y-4 pt-4 border-t border-apple-border/20 dark:border-[var(--border-default)]'>
                <div className='flex items-center gap-2 mb-2'>
                  <div className='w-8 h-8 rounded-xl bg-apple-blue/10 dark:bg-[var(--surface-hover)] flex items-center justify-center'>
                    <Calendar className='w-4 h-4 text-apple-blue' />
                  </div>
                  <h3 className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                    Dati Amministrativi
                  </h3>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  {/* Data immatricolazione */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.registrationDate`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      Data Immatricolazione
                    </Label>
                    <Input
                      id={`vehicles.${index}.registrationDate`}
                      type='date'
                      {...register(`vehicles.${index}.registrationDate`)}
                      autoComplete='off'
                      className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                    />
                  </div>

                  {/* Anno */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.year`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      Anno
                    </Label>
                    <Input
                      id={`vehicles.${index}.year`}
                      type='number'
                      {...register(`vehicles.${index}.year`, { valueAsNumber: true })}
                      autoComplete='off'
                      className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                      placeholder='2020'
                    />
                  </div>

                  {/* KM */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.km`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      KM attuali
                    </Label>
                    <Input
                      id={`vehicles.${index}.km`}
                      type='number'
                      {...register(`vehicles.${index}.km`, { valueAsNumber: true })}
                      autoComplete='off'
                      className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                      placeholder='50000'
                    />
                  </div>

                  {/* Scadenza revisione */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.inspectionExpiry`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      Scadenza Revisione
                    </Label>
                    <Input
                      id={`vehicles.${index}.inspectionExpiry`}
                      type='date'
                      {...register(`vehicles.${index}.inspectionExpiry`)}
                      autoComplete='off'
                      className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                    />
                  </div>
                </div>
              </div>

              {/* === SEZIONE 6: ASPETTO === */}
              <div className='space-y-4 pt-4 border-t border-apple-border/20 dark:border-[var(--border-default)]'>
                <div className='flex items-center gap-2 mb-2'>
                  <div className='w-8 h-8 rounded-xl bg-apple-blue/10 dark:bg-[var(--surface-hover)] flex items-center justify-center'>
                    <Palette className='w-4 h-4 text-apple-blue' />
                  </div>
                  <h3 className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>Aspetto</h3>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                  {/* Colore */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.color`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      Colore
                    </Label>
                    <Input
                      id={`vehicles.${index}.color`}
                      {...register(`vehicles.${index}.color`)}
                      autoComplete='off'
                      className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                      placeholder='Bianco'
                    />
                  </div>

                  {/* Porte */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.doors`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      Porte
                    </Label>
                    <Input
                      id={`vehicles.${index}.doors`}
                      type='number'
                      {...register(`vehicles.${index}.doors`, { valueAsNumber: true })}
                      autoComplete='off'
                      className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                      placeholder='5'
                      min={1}
                      max={9}
                    />
                  </div>

                  {/* Posti */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.seats`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      Posti
                    </Label>
                    <Input
                      id={`vehicles.${index}.seats`}
                      type='number'
                      {...register(`vehicles.${index}.seats`, { valueAsNumber: true })}
                      autoComplete='off'
                      className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                      placeholder='5'
                      min={1}
                      max={50}
                    />
                  </div>
                </div>
              </div>

              {/* === SEZIONE 7: PNEUMATICI === */}
              <div className='space-y-4 pt-4 border-t border-apple-border/20 dark:border-[var(--border-default)]'>
                <div className='flex items-center gap-2 mb-2'>
                  <div className='w-8 h-8 rounded-xl bg-apple-blue/10 dark:bg-[var(--surface-hover)] flex items-center justify-center'>
                    <Gauge className='w-4 h-4 text-apple-blue' />
                  </div>
                  <h3 className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>Pneumatici</h3>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  {/* Anteriori */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.tiresFront`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      Anteriori
                    </Label>
                    <Input
                      id={`vehicles.${index}.tiresFront`}
                      {...register(`vehicles.${index}.tiresFront`)}
                      autoComplete='off'
                      className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                      placeholder='195/55 R16'
                    />
                  </div>

                  {/* Posteriori */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.tiresRear`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      Posteriori
                    </Label>
                    <Input
                      id={`vehicles.${index}.tiresRear`}
                      {...register(`vehicles.${index}.tiresRear`)}
                      autoComplete='off'
                      className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                      placeholder='195/55 R16'
                    />
                  </div>
                </div>
              </div>

              {/* === SEZIONE 8: MASSE === */}
              <div className='space-y-4 pt-4 border-t border-apple-border/20 dark:border-[var(--border-default)]'>
                <div className='flex items-center gap-2 mb-2'>
                  <div className='w-8 h-8 rounded-xl bg-apple-blue/10 dark:bg-[var(--surface-hover)] flex items-center justify-center'>
                    <Scale className='w-4 h-4 text-apple-blue' />
                  </div>
                  <h3 className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>Masse (kg)</h3>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                  {/* Massa a vuoto */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.massOwn`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      Massa a Vuoto
                    </Label>
                    <Input
                      id={`vehicles.${index}.massOwn`}
                      type='number'
                      {...register(`vehicles.${index}.massOwn`, { valueAsNumber: true })}
                      autoComplete='off'
                      className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                      placeholder='1050'
                    />
                  </div>

                  {/* Massa max */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.massMax`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      Massa Complessiva
                    </Label>
                    <Input
                      id={`vehicles.${index}.massMax`}
                      type='number'
                      {...register(`vehicles.${index}.massMax`, { valueAsNumber: true })}
                      autoComplete='off'
                      className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                      placeholder='1600'
                    />
                  </div>

                  {/* Massa rimorchiabile */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.massTrailer`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      Rimorchiabile
                    </Label>
                    <Input
                      id={`vehicles.${index}.massTrailer`}
                      type='number'
                      {...register(`vehicles.${index}.massTrailer`, { valueAsNumber: true })}
                      autoComplete='off'
                      className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                      placeholder='800'
                    />
                  </div>
                </div>
              </div>

              {/* === SEZIONE 9: DIMENSIONI === */}
              <div className='space-y-4 pt-4 border-t border-apple-border/20 dark:border-[var(--border-default)]'>
                <div className='flex items-center gap-2 mb-2'>
                  <div className='w-8 h-8 rounded-xl bg-apple-blue/10 dark:bg-[var(--surface-hover)] flex items-center justify-center'>
                    <Ruler className='w-4 h-4 text-apple-blue' />
                  </div>
                  <h3 className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                    Dimensioni (mm)
                  </h3>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                  {/* Lunghezza */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.length`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      Lunghezza
                    </Label>
                    <Input
                      id={`vehicles.${index}.length`}
                      type='number'
                      {...register(`vehicles.${index}.length`, { valueAsNumber: true })}
                      autoComplete='off'
                      className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                      placeholder='3685'
                    />
                  </div>

                  {/* Larghezza */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.width`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      Larghezza
                    </Label>
                    <Input
                      id={`vehicles.${index}.width`}
                      type='number'
                      {...register(`vehicles.${index}.width`, { valueAsNumber: true })}
                      autoComplete='off'
                      className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                      placeholder='1645'
                    />
                  </div>

                  {/* Altezza */}
                  <div>
                    <Label
                      htmlFor={`vehicles.${index}.height`}
                      className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                    >
                      Altezza
                    </Label>
                    <Input
                      id={`vehicles.${index}.height`}
                      type='number'
                      {...register(`vehicles.${index}.height`, { valueAsNumber: true })}
                      autoComplete='off'
                      className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                      placeholder='1550'
                    />
                  </div>
                </div>
              </div>

              {/* === SEZIONE 10: NOTE === */}
              <div className='space-y-4 pt-4 border-t border-apple-border/20 dark:border-[var(--border-default)]'>
                <div className='flex items-center gap-2 mb-2'>
                  <div className='w-8 h-8 rounded-xl bg-apple-blue/10 dark:bg-[var(--surface-hover)] flex items-center justify-center'>
                    <Info className='w-4 h-4 text-apple-blue' />
                  </div>
                  <h3 className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>Note</h3>
                </div>

                <div>
                  <Label
                    htmlFor={`vehicles.${index}.notes`}
                    className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                  >
                    Note aggiuntive
                  </Label>
                  <textarea
                    id={`vehicles.${index}.notes`}
                    {...register(`vehicles.${index}.notes`)}
                    autoComplete='off'
                    className='w-full h-24 px-5 py-3 rounded-2xl border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none resize-none'
                    placeholder='Inserisci eventuali note, accessori, modifiche...'
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Aggiungi veicolo */}
        <AppleButton
          type='button'
          variant='secondary'
          onClick={addVehicle}
          fullWidth
          icon={<Plus className='w-5 h-5' />}
        >
          Aggiungi altro veicolo
        </AppleButton>

        {errors.vehicles && (
          <div className='min-h-[20px]'>
            <p
              role='alert'
              aria-live='assertive'
              className='text-red-400 text-sm text-center'
            >
              {errors.vehicles.message}
            </p>
          </div>
        )}
      </motion.div>
    </FormLayout>
  );
}
