'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Car,
  User,
  Hash,
  Calendar,
  Gauge,
  Fuel,
  Search,
  Check,
  AlertCircle,
  Loader2,
  Zap,
  Droplets,
  Battery,
  Wind,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AppleButton } from '@/components/ui/apple-button';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  vehicleSchema,
  type VehicleFormValues,
  formatLicensePlate,
  fuelTypeLabels,
  fuelTypeIcons,
  mockVINLookup,
  type VINLookupResult,
} from '@/lib/validations/vehicle';

/** Local form values with English field names matching the form */
interface VehicleFormLocalValues {
  customerId: string;
  licensePlate: string;
  make: string;
  model: string;
  year?: number;
  vin: string;
  mileage?: number;
  fuelType?: string;
  engineSize?: number;
  powerKw?: number;
  color: string;
  lastServiceDate: string;
  nextServiceDate: string;
  registrationDate: string;
  insuranceExpiry: string;
  revisionExpiry: string;
  notes: string;
}

export interface VehicleFormProps {
  onSubmit: (data: VehicleFormLocalValues) => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<VehicleFormLocalValues>;
  customers?: Array<{ id: string; name: string }>;
}

type FormStatus = 'idle' | 'loading' | 'success' | 'error';
type VINStatus = 'idle' | 'loading' | 'success' | 'error' | 'not_found';

const slideUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1],
    },
  }),
};

const fuelIcons: Record<string, React.ReactNode> = {
  benzina: <Droplets className='h-4 w-4 text-[var(--status-warning)]' />,
  diesel: <Wind className='h-4 w-4 text-[var(--text-secondary)]' />,
  elettrico: <Battery className='h-4 w-4 text-[var(--status-success)]' />,
  ibrido: <Zap className='h-4 w-4 text-[var(--status-info)]' />,
  gpl: <FlameIcon />,
  metano: <Wind className='h-4 w-4 text-[var(--status-info)]' />,
};

function FlameIcon() {
  return (
    <svg
      className='h-4 w-4 text-[var(--status-warning)]'
      viewBox='0 0 24 24'
      fill='currentColor'
      aria-hidden='true'
    >
      <path d='M12 2C10.5 4 9 6.5 9 9c0 1.5.5 2.5 1.5 3.5C9.5 13 8.5 14 8 15.5c-.5 1.5-.5 3 0 4.5.5 1.5 1.5 2.5 3 3 1.5.5 3 0 4.5-1 1.5-1 2.5-2.5 3-4.5.5-2 0-4-1-6-.5-1-1.5-2-2.5-2.5C15 8 15 6 14 4c-.5-1-1.5-2-2-2z' />
    </svg>
  );
}

export function VehicleForm({ onSubmit, onCancel, initialData, customers = [] }: VehicleFormProps) {
  const [status, setStatus] = useState<FormStatus>('idle');
  const [vinStatus, setVinStatus] = useState<VINStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [vinResult, setVinResult] = useState<VINLookupResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const form = useForm({
    defaultValues: {
      customerId: initialData?.customerId || '',
      licensePlate: initialData?.licensePlate || '',
      make: initialData?.make || '',
      model: initialData?.model || '',
      year: initialData?.year || undefined,
      vin: initialData?.vin || '',
      mileage: initialData?.mileage || undefined,
      fuelType: initialData?.fuelType || undefined,
      engineSize: initialData?.engineSize || undefined,
      powerKw: initialData?.powerKw || undefined,
      color: initialData?.color || '',
      lastServiceDate: initialData?.lastServiceDate || '',
      nextServiceDate: initialData?.nextServiceDate || '',
      registrationDate: initialData?.registrationDate || '',
      insuranceExpiry: initialData?.insuranceExpiry || '',
      revisionExpiry: initialData?.revisionExpiry || '',
      notes: initialData?.notes || '',
    },
  });

  const handlePlateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: string) => void) => {
      const formatted = formatLicensePlate(e.target.value);
      onChange(formatted);
    },
    []
  );

  const lookupVIN = async () => {
    const vin = form.getValues('vin');
    if (!vin || vin.length !== 17) {
      setVinStatus('error');
      return;
    }

    setVinStatus('loading');
    try {
      const result = await mockVINLookup(vin);
      setVinResult(result);

      if (result.valid) {
        setVinStatus('success');
        if (result.make) form.setValue('make', result.make);
        if (result.model) form.setValue('model', result.model);
        if (result.year) form.setValue('year', result.year);
        if (result.fuelType) form.setValue('fuelType', result.fuelType);
        if (result.engineSize) form.setValue('engineSize', result.engineSize);
        if (result.powerKw) form.setValue('powerKw', result.powerKw);
      } else {
        setVinStatus('not_found');
      }
    } catch {
      setVinStatus('error');
    }
  };

  const handleSubmit = async (data: VehicleFormLocalValues) => {
    setStatus('loading');
    setErrorMessage('');

    try {
      await onSubmit(data);
      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        form.reset();
        setVinResult(null);
      }, 2000);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Errore durante il salvataggio');
    }
  };

  return (
    <AppleCard className='bg-[var(--surface-secondary)]/70 backdrop-blur-3xl rounded-3xl overflow-hidden'>
      <AppleCardHeader className='border-b border-[var(--border-default)]/50'>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--status-success)] to-[var(--status-success)] flex items-center justify-center'>
            <Car className='h-5 w-5 text-[var(--text-on-brand)]' />
          </div>
          <div>
            <h2 className='text-lg font-semibold text-[var(--text-primary)]'>
              {initialData ? 'Modifica Veicolo' : 'Nuovo Veicolo'}
            </h2>
            <p className='text-sm text-[var(--text-tertiary)]'>
              {initialData ? 'Aggiorna i dati del veicolo' : 'Inserisci i dati del nuovo veicolo'}
            </p>
          </div>
        </div>
      </AppleCardHeader>

      <AppleCardContent className='p-6'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-5'>
            {/* Proprietario */}
            <motion.div custom={0} variants={slideUpVariants} initial='hidden' animate='visible'>
              <FormField
                control={form.control}
                name='customerId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-sm font-medium text-[var(--text-secondary)]'>
                      Proprietario *
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger
                          aria-required='true'
                          aria-label='Seleziona proprietario'
                          className='h-14 rounded-2xl bg-[var(--surface-secondary)]/60 border-0 px-4 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--status-success)]/20 transition-all'
                        >
                          <div className='flex items-center gap-2'>
                            <User className='h-4 w-4 text-[var(--text-tertiary)]' />
                            <SelectValue placeholder='Seleziona proprietario' />
                          </div>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className='rounded-2xl border-0 shadow-xl'>
                        {customers.length === 0 ? (
                          <SelectItem value='__empty__' disabled>
                            Nessun cliente disponibile
                          </SelectItem>
                        ) : (
                          customers.map(customer => (
                            <SelectItem
                              key={customer.id}
                              value={customer.id}
                              className='rounded-xl cursor-pointer'
                            >
                              {customer.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <div className='min-h-[20px]'>
                      <FormMessage className='text-xs text-[var(--status-error)]' />
                    </div>
                  </FormItem>
                )}
              />
            </motion.div>

            {/* Targa */}
            <motion.div custom={1} variants={slideUpVariants} initial='hidden' animate='visible'>
              <FormField
                control={form.control}
                name='licensePlate'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-sm font-medium text-[var(--text-secondary)]'>Targa *</FormLabel>
                    <FormControl>
                      <div className='relative'>
                        <Hash className='absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]' />
                        <Input
                          {...field}
                          placeholder='AB123CD'
                          maxLength={7}
                          autoComplete='off'
                          aria-required='true'
                          onChange={e => handlePlateChange(e, field.onChange)}
                          className='h-14 rounded-2xl bg-[var(--surface-secondary)]/60 border-0 pl-11 pr-4 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--status-success)]/20 transition-all uppercase tracking-wider font-medium'
                        />
                      </div>
                    </FormControl>
                    <div className='min-h-[20px]'>
                      <FormMessage className='text-xs text-[var(--status-error)]' />
                    </div>
                    <p className='text-xs text-[var(--text-tertiary)] mt-1'>Formato: AB123CD</p>
                  </FormItem>
                )}
              />
            </motion.div>

            {/* Marca e Modello */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <motion.div custom={2} variants={slideUpVariants} initial='hidden' animate='visible'>
                <FormField
                  control={form.control}
                  name='make'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-sm font-medium text-[var(--text-secondary)]'>Marca *</FormLabel>
                      <FormControl>
                        <div className='relative'>
                          <Car className='absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]' />
                          <Input
                            {...field}
                            placeholder='Fiat'
                            autoComplete='off'
                            aria-required='true'
                            className='h-14 rounded-2xl bg-[var(--surface-secondary)]/60 border-0 pl-11 pr-4 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--status-success)]/20 transition-all'
                          />
                        </div>
                      </FormControl>
                      <div className='min-h-[20px]'>
                        <FormMessage className='text-xs text-[var(--status-error)]' />
                      </div>
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div custom={3} variants={slideUpVariants} initial='hidden' animate='visible'>
                <FormField
                  control={form.control}
                  name='model'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-sm font-medium text-[var(--text-secondary)]'>Modello *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder='Panda'
                          autoComplete='off'
                          aria-required='true'
                          className='h-14 rounded-2xl bg-[var(--surface-secondary)]/60 border-0 px-4 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--status-success)]/20 transition-all'
                        />
                      </FormControl>
                      <div className='min-h-[20px]'>
                        <FormMessage className='text-xs text-[var(--status-error)]' />
                      </div>
                    </FormItem>
                  )}
                />
              </motion.div>
            </div>

            {/* Anno e Colore */}
            <div className='grid grid-cols-2 gap-4'>
              <motion.div custom={4} variants={slideUpVariants} initial='hidden' animate='visible'>
                <FormField
                  control={form.control}
                  name='year'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-sm font-medium text-[var(--text-secondary)]'>Anno</FormLabel>
                      <FormControl>
                        <div className='relative'>
                          <Calendar className='absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]' />
                          <Input
                            {...field}
                            type='number'
                            placeholder='2020'
                            min={1990}
                            max={2027}
                            autoComplete='off'
                            onChange={e =>
                              field.onChange(e.target.value ? parseInt(e.target.value) : undefined)
                            }
                            className='h-14 rounded-2xl bg-[var(--surface-secondary)]/60 border-0 pl-11 pr-4 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--status-success)]/20 transition-all'
                          />
                        </div>
                      </FormControl>
                      <div className='min-h-[20px]'>
                        <FormMessage className='text-xs text-[var(--status-error)]' />
                      </div>
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div custom={5} variants={slideUpVariants} initial='hidden' animate='visible'>
                <FormField
                  control={form.control}
                  name='color'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-sm font-medium text-[var(--text-secondary)]'>Colore</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder='Bianco'
                          autoComplete='off'
                          className='h-14 rounded-2xl bg-[var(--surface-secondary)]/60 border-0 px-4 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--status-success)]/20 transition-all'
                        />
                      </FormControl>
                      <div className='min-h-[20px]'>
                        <FormMessage className='text-xs text-[var(--status-error)]' />
                      </div>
                    </FormItem>
                  )}
                />
              </motion.div>
            </div>

            {/* VIN con lookup */}
            <motion.div custom={6} variants={slideUpVariants} initial='hidden' animate='visible'>
              <FormField
                control={form.control}
                name='vin'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-sm font-medium text-[var(--text-secondary)]'>
                      VIN (Numero di Telaio)
                    </FormLabel>
                    <FormControl>
                      <div className='relative flex gap-2'>
                        <div className='relative flex-1'>
                          <Hash className='absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]' />
                          <Input
                            {...field}
                            placeholder='ZFA31200001234567'
                            maxLength={17}
                            autoComplete='off'
                            className='h-14 rounded-2xl bg-[var(--surface-secondary)]/60 border-0 pl-11 pr-4 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--status-success)]/20 transition-all uppercase tracking-wider font-mono'
                          />
                        </div>
                        <AppleButton
                          type='button'
                          variant='secondary'
                          onClick={lookupVIN}
                          aria-label='Cerca dati veicolo tramite VIN'
                          disabled={
                            vinStatus === 'loading' || !field.value || field.value.length !== 17
                          }
                          className='h-14 px-4 rounded-2xl whitespace-nowrap'
                        >
                          {vinStatus === 'loading' ? (
                            <Loader2 className='h-4 w-4 animate-spin' />
                          ) : (
                            <>
                              <Search className='h-4 w-4 mr-2' />
                              Cerca
                            </>
                          )}
                        </AppleButton>
                      </div>
                    </FormControl>
                    <div className='min-h-[20px]'>
                      <FormMessage className='text-xs text-[var(--status-error)]' />
                    </div>

                    {/* VIN Lookup Result */}
                    <AnimatePresence>
                      {vinStatus === 'success' && vinResult && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className='mt-2 p-3 rounded-xl bg-[var(--status-success)]/5 border border-[var(--status-success)]/10'
                        >
                          <div className='flex items-center gap-2 text-[var(--status-success)] text-sm font-medium'>
                            <Sparkles className='h-4 w-4' />
                            <span>Dati recuperati automaticamente</span>
                          </div>
                        </motion.div>
                      )}
                      {vinStatus === 'not_found' && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className='mt-2 p-3 rounded-xl bg-[var(--status-warning)]/5 border border-[var(--status-warning)]/10'
                        >
                          <div className='flex items-center gap-2 text-[var(--status-warning)] text-sm'>
                            <AlertCircle className='h-4 w-4' />
                            <span>VIN valido ma non trovato nel database</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </FormItem>
                )}
              />
            </motion.div>

            {/* Chilometraggio e Carburante */}
            <div className='grid grid-cols-2 gap-4'>
              <motion.div custom={7} variants={slideUpVariants} initial='hidden' animate='visible'>
                <FormField
                  control={form.control}
                  name='mileage'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-sm font-medium text-[var(--text-secondary)]'>
                        Chilometraggio
                      </FormLabel>
                      <FormControl>
                        <div className='relative'>
                          <Gauge className='absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]' />
                          <Input
                            {...field}
                            type='number'
                            placeholder='50000'
                            min={0}
                            autoComplete='off'
                            onChange={e =>
                              field.onChange(e.target.value ? parseInt(e.target.value) : undefined)
                            }
                            className='h-14 rounded-2xl bg-[var(--surface-secondary)]/60 border-0 pl-11 pr-4 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--status-success)]/20 transition-all'
                          />
                        </div>
                      </FormControl>
                      <div className='min-h-[20px]'>
                        <FormMessage className='text-xs text-[var(--status-error)]' />
                      </div>
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div custom={8} variants={slideUpVariants} initial='hidden' animate='visible'>
                <FormField
                  control={form.control}
                  name='fuelType'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-sm font-medium text-[var(--text-secondary)]'>
                        Carburante
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger
                            aria-label='Seleziona carburante'
                            className='h-14 rounded-2xl bg-[var(--surface-secondary)]/60 border-0 px-4 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--status-success)]/20 transition-all'
                          >
                            <div className='flex items-center gap-2'>
                              <Fuel className='h-4 w-4 text-[var(--text-tertiary)]' />
                              <SelectValue placeholder='Seleziona' />
                            </div>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className='rounded-2xl border-0 shadow-xl'>
                          {Object.entries(fuelTypeLabels).map(([value, label]) => (
                            <SelectItem
                              key={value}
                              value={value}
                              className='rounded-xl cursor-pointer'
                            >
                              <div className='flex items-center gap-2'>
                                {fuelIcons[value]}
                                <span>{label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className='min-h-[20px]'>
                        <FormMessage className='text-xs text-[var(--status-error)]' />
                      </div>
                    </FormItem>
                  )}
                />
              </motion.div>
            </div>

            {/* Campi Avanzati */}
            <motion.div custom={9} variants={slideUpVariants} initial='hidden' animate='visible'>
              <button
                type='button'
                onClick={() => setShowAdvanced(!showAdvanced)}
                aria-expanded={showAdvanced}
                aria-controls='advanced-fields'
                className='flex items-center justify-between w-full py-3 px-4 rounded-2xl bg-[var(--surface-secondary)]/40 hover:bg-[var(--surface-secondary)]/60 transition-colors'
              >
                <div className='flex items-center gap-2'>
                  <FileText className='h-4 w-4 text-[var(--text-tertiary)]' />
                  <span className='text-sm font-medium text-[var(--text-secondary)]'>Dati Tecnici Avanzati</span>
                </div>
                {showAdvanced ? (
                  <ChevronUp className='h-4 w-4 text-[var(--text-tertiary)]' />
                ) : (
                  <ChevronDown className='h-4 w-4 text-[var(--text-tertiary)]' />
                )}
              </button>
            </motion.div>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  id='advanced-fields'
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                  className='overflow-hidden'
                >
                  <div className='space-y-4 pt-2'>
                    <div className='grid grid-cols-2 gap-4'>
                      <FormField
                        control={form.control}
                        name='engineSize'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-sm text-[var(--text-secondary)]'>Cilindrata (L)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type='number'
                                step='0.1'
                                placeholder='1.2'
                                autoComplete='off'
                                onChange={e =>
                                  field.onChange(
                                    e.target.value ? parseFloat(e.target.value) : undefined
                                  )
                                }
                                className='h-12 rounded-2xl bg-[var(--surface-secondary)]/60 border-0 px-4 text-[var(--text-primary)]'
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name='powerKw'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-sm text-[var(--text-secondary)]'>Potenza (kW)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type='number'
                                placeholder='55'
                                autoComplete='off'
                                onChange={e =>
                                  field.onChange(
                                    e.target.value ? parseInt(e.target.value) : undefined
                                  )
                                }
                                className='h-12 rounded-2xl bg-[var(--surface-secondary)]/60 border-0 px-4 text-[var(--text-primary)]'
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className='grid grid-cols-2 gap-4'>
                      <FormField
                        control={form.control}
                        name='lastServiceDate'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-sm text-[var(--text-secondary)]'>Ultimo Service</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type='date'
                                autoComplete='off'
                                className='h-12 rounded-2xl bg-[var(--surface-secondary)]/60 border-0 px-4 text-[var(--text-primary)]'
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name='nextServiceDate'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-sm text-[var(--text-secondary)]'>
                              Prossimo Service
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type='date'
                                autoComplete='off'
                                className='h-12 rounded-2xl bg-[var(--surface-secondary)]/60 border-0 px-4 text-[var(--text-primary)]'
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className='grid grid-cols-2 gap-4'>
                      <FormField
                        control={form.control}
                        name='registrationDate'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-sm text-[var(--text-secondary)]'>
                              Data Immatricolazione
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type='date'
                                autoComplete='off'
                                className='h-12 rounded-2xl bg-[var(--surface-secondary)]/60 border-0 px-4 text-[var(--text-primary)]'
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name='insuranceExpiry'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-sm text-[var(--text-secondary)]'>
                              Scadenza Assicurazione
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type='date'
                                autoComplete='off'
                                className='h-12 rounded-2xl bg-[var(--surface-secondary)]/60 border-0 px-4 text-[var(--text-primary)]'
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Scadenza Revisione */}
                    <FormField
                      control={form.control}
                      name='revisionExpiry'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-sm text-[var(--text-secondary)]'>
                            Scadenza Revisione
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type='date'
                              autoComplete='off'
                              className='h-12 rounded-2xl bg-[var(--surface-secondary)]/60 border-0 px-4 text-[var(--text-primary)]'
                            />
                          </FormControl>
                          <p className='text-xs text-[var(--text-tertiary)]'>
                            Riceverai un alert 30 giorni prima della scadenza
                          </p>
                        </FormItem>
                      )}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Note */}
            <motion.div custom={10} variants={slideUpVariants} initial='hidden' animate='visible'>
              <FormField
                control={form.control}
                name='notes'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-sm font-medium text-[var(--text-secondary)]'>
                      Note (opzionale)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder='Note aggiuntive sul veicolo...'
                        rows={3}
                        autoComplete='off'
                        className='rounded-2xl bg-[var(--surface-secondary)]/60 border-0 px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--status-success)]/20 transition-all resize-none'
                      />
                    </FormControl>
                    <div className='min-h-[20px]'>
                      <FormMessage className='text-xs text-[var(--status-error)]' />
                    </div>
                  </FormItem>
                )}
              />
            </motion.div>

            {/* Error Message */}
            <AnimatePresence>
              {status === 'error' && (
                <motion.div
                  role='alert'
                  aria-live='assertive'
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className='flex items-center gap-2 p-4 rounded-2xl bg-[var(--status-error-subtle)] text-[var(--status-error)] text-sm'
                >
                  <AlertCircle className='h-4 w-4 flex-shrink-0' />
                  <span>{errorMessage || 'Si è verificato un errore. Riprova.'}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success Message */}
            <AnimatePresence>
              {status === 'success' && (
                <motion.div
                  role='status'
                  aria-live='polite'
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className='flex items-center gap-2 p-4 rounded-2xl bg-[var(--status-success-subtle)] text-[var(--status-success)] text-sm'
                >
                  <Check className='h-4 w-4 flex-shrink-0' />
                  <span>Veicolo salvato con successo!</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <motion.div
              custom={11}
              variants={slideUpVariants}
              initial='hidden'
              animate='visible'
              className='flex gap-3 pt-4'
            >
              {onCancel && (
                <AppleButton
                  type='button'
                  variant='secondary'
                  onClick={onCancel}
                  className='flex-1 h-12 rounded-2xl'
                >
                  Annulla
                </AppleButton>
              )}
              <AppleButton
                type='submit'
                disabled={status === 'loading' || status === 'success'}
                className='flex-1 h-12 rounded-2xl bg-gradient-to-r from-[var(--status-success)] to-[var(--status-success)] hover:from-[var(--status-success)] hover:to-[var(--status-success)] text-[var(--text-on-brand)] font-medium shadow-lg shadow-emerald-500/25'
              >
                {status === 'loading' ? (
                  <Loader2 className='h-5 w-5 animate-spin' />
                ) : status === 'success' ? (
                  <Check className='h-5 w-5' />
                ) : initialData ? (
                  'Salva Modifiche'
                ) : (
                  'Crea Veicolo'
                )}
              </AppleButton>
            </motion.div>
          </form>
        </Form>
      </AppleCardContent>
    </AppleCard>
  );
}
