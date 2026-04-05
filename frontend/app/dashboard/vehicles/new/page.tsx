'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  AppleCard,
  AppleCardContent,
  AppleCardHeader,
} from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Car, Loader2, Search, User } from 'lucide-react';

/* --- Schema --- */
function validateItalianPlate(plate: string): boolean {
  if (!plate) return false;
  const cleaned = plate.toUpperCase().replace(/\s/g, '');
  const currentFormat = /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/;
  const oldFormat = /^([A-Z]{2}[0-9]{6}|[0-9]{6}[A-Z]{2}|[A-Z]{2}[0-9]{4}[A-Z]{2})$/;
  return currentFormat.test(cleaned) || oldFormat.test(cleaned);
}

const schema = z.object({
  targa: z.string().min(1, 'La targa è obbligatoria').refine(validateItalianPlate, 'Formato targa non valido (es. AB123CD)'),
  marca: z.string().min(1, 'La marca è obbligatoria'),
  modello: z.string().min(1, 'Il modello è obbligatorio'),
  anno: z.coerce.number().min(1900, 'Anno non valido').max(2030, 'Anno non valido'),
  vin: z.string().optional(),
  colore: z.string().optional(),
  carburante: z.string().min(1, 'Seleziona un tipo di carburante'),
  km: z.coerce.number().min(0, 'I km non possono essere negativi').optional(),
  customerId: z.string().min(1, 'Seleziona un proprietario'),
});

type FormValues = z.infer<typeof schema>;

const FUEL_OPTIONS = ['Benzina', 'Diesel', 'GPL', 'Metano', 'Ibrido', 'Elettrico'] as const;

interface CustomerOption {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
};

export default function NewVehiclePage(): React.ReactElement {
  const router = useRouter();
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerOption[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      targa: '',
      marca: '',
      modello: '',
      anno: new Date().getFullYear(),
      vin: '',
      colore: '',
      carburante: '',
      km: 0,
      customerId: '',
    },
  });

  // Customer search with debounce
  const searchCustomers = useCallback(async (query: string): Promise<void> => {
    if (query.length < 2) {
      setCustomerResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Errore ricerca');
      const json = await res.json();
      const data = json.data ?? json ?? [];
      setCustomerResults(Array.isArray(data) ? data : []);
    } catch {
      setCustomerResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchCustomers(customerSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, searchCustomers]);

  const selectCustomer = (c: CustomerOption): void => {
    setSelectedCustomer(c);
    setValue('customerId', c.id, { shouldValidate: true });
    setCustomerSearch([c.firstName, c.lastName].filter(Boolean).join(' '));
    setShowDropdown(false);
  };

  const onSubmit = async (data: FormValues): Promise<void> => {
    try {
      const res = await fetch('/api/dashboard/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licensePlate: data.targa.toUpperCase().replace(/\s/g, ''),
          make: data.marca,
          model: data.modello,
          year: data.anno,
          vin: data.vin || undefined,
          color: data.colore || undefined,
          fuelType: data.carburante,
          mileage: data.km || undefined,
          customerId: data.customerId,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || json.message || 'Errore creazione veicolo');
      }
      const json = await res.json();
      const newId = json.data?.id || json.id;
      toast.success('Veicolo creato con successo', {
        description: `${data.marca} ${data.modello} (${data.targa}) registrato`,
      });
      if (newId) {
        router.push(`/dashboard/vehicles/${newId}`);
      } else {
        router.push('/dashboard/vehicles');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante la creazione');
    }
  };

  return (
    <div>
      {/* Header */}
      <header>
        <div className='px-8 py-5'>
          <Breadcrumb items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Veicoli', href: '/dashboard/vehicles' },
            { label: 'Nuovo Veicolo' },
          ]} />
          <div className='flex items-center justify-between mt-2'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-xl bg-apple-blue/10 flex items-center justify-center'>
                <Car className='h-5 w-5 text-apple-blue' />
              </div>
              <h1 className='text-headline text-apple-dark dark:text-[var(--text-primary)]'>Nuovo Veicolo</h1>
            </div>
            <AppleButton
              variant='ghost'
              icon={<ArrowLeft className='h-4 w-4' />}
              onClick={() => router.push('/dashboard/vehicles')}
            >
              Torna ai Veicoli
            </AppleButton>
          </div>
        </div>
      </header>

      <motion.div
        className='p-8 max-w-3xl mx-auto'
        initial='hidden'
        animate='visible'
        variants={containerVariants}
      >
        <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
          {/* Vehicle Info */}
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>Dati Veicolo</h2>
              </AppleCardHeader>
              <AppleCardContent>
                <div className='space-y-4'>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <div>
                      <label htmlFor='targa' className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]'>Targa *</label>
                      <Input id='targa' {...register('targa')} placeholder='AB123CD' />
                      {errors.targa && <p className='text-footnote text-apple-red mt-1'>{errors.targa.message}</p>}
                    </div>
                    <div>
                      <label htmlFor='vin' className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]'>VIN</label>
                      <Input id='vin' {...register('vin')} placeholder='17 caratteri' />
                      {errors.vin && <p className='text-footnote text-apple-red mt-1'>{errors.vin.message}</p>}
                    </div>
                  </div>

                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <div>
                      <label htmlFor='marca' className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]'>Marca *</label>
                      <Input id='marca' {...register('marca')} placeholder='es. Fiat' />
                      {errors.marca && <p className='text-footnote text-apple-red mt-1'>{errors.marca.message}</p>}
                    </div>
                    <div>
                      <label htmlFor='modello' className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]'>Modello *</label>
                      <Input id='modello' {...register('modello')} placeholder='es. Panda' />
                      {errors.modello && <p className='text-footnote text-apple-red mt-1'>{errors.modello.message}</p>}
                    </div>
                  </div>

                  <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                    <div>
                      <label htmlFor='anno' className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]'>Anno *</label>
                      <Input id='anno' type='number' {...register('anno')} />
                      {errors.anno && <p className='text-footnote text-apple-red mt-1'>{errors.anno.message}</p>}
                    </div>
                    <div>
                      <label htmlFor='colore' className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]'>Colore</label>
                      <Input id='colore' {...register('colore')} placeholder='es. Bianco' />
                    </div>
                    <div>
                      <label htmlFor='carburante' className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]'>Carburante *</label>
                      <select id='carburante' {...register('carburante')} className='h-10 w-full rounded-md border border-apple-border/50 dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] px-3 text-body text-apple-dark dark:text-[var(--text-primary)] focus:outline-none appearance-none cursor-pointer'>
                        <option value=''>Seleziona...</option>
                        {FUEL_OPTIONS.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                      {errors.carburante && <p className='text-footnote text-apple-red mt-1'>{errors.carburante.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label htmlFor='km' className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]'>Chilometraggio</label>
                    <Input id='km' type='number' {...register('km')} placeholder='es. 85000' />
                    {errors.km && <p className='text-footnote text-apple-red mt-1'>{errors.km.message}</p>}
                  </div>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          {/* Customer */}
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)] flex items-center gap-2'>
                  <User className='h-4 w-4 text-apple-gray' />
                  Proprietario *
                </h2>
              </AppleCardHeader>
              <AppleCardContent>
                <div className='relative'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-apple-gray' />
                  <input
                    type='text'
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowDropdown(true);
                      if (selectedCustomer) {
                        setSelectedCustomer(null);
                        setValue('customerId', '', { shouldValidate: true });
                      }
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder='Cerca per nome o email...'
                    className='w-full h-10 rounded-md border border-apple-border/50 dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] text-body text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-secondary)] pl-10 pr-4 focus:outline-none'
                    autoComplete='off'
                  />
                  {searchLoading && (
                    <Loader2 className='absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-apple-gray' />
                  )}

                  {/* Dropdown */}
                  {showDropdown && customerResults.length > 0 && !selectedCustomer && (
                    <div className='absolute z-50 w-full mt-1 bg-white dark:bg-[var(--surface-elevated)] border border-apple-border/20 dark:border-[var(--border-default)] rounded-2xl shadow-apple max-h-48 overflow-y-auto'>
                      {customerResults.map((c) => (
                        <button
                          key={c.id}
                          type='button'
                          onClick={() => selectCustomer(c)}
                          className='w-full text-left px-4 py-3 hover:bg-apple-light-gray/50 dark:hover:bg-[var(--surface-hover)] transition-colors min-h-[44px]'
                        >
                          <p className='text-body font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                            {[c.firstName, c.lastName].filter(Boolean).join(' ') || 'Cliente senza nome'}
                          </p>
                          {c.email && <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>{c.email}</p>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedCustomer && (
                  <p className='text-footnote text-apple-green mt-2'>
                    Proprietario selezionato: {[selectedCustomer.firstName, selectedCustomer.lastName].filter(Boolean).join(' ')}
                  </p>
                )}
                {errors.customerId && <p className='text-footnote text-apple-red mt-1'>{errors.customerId.message}</p>}
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          {/* Actions */}
          <div className='flex items-center justify-between pt-2'>
            <AppleButton
              type='button'
              variant='ghost'
              icon={<ArrowLeft className='h-4 w-4' />}
              onClick={() => router.push('/dashboard/vehicles')}
            >
              Annulla
            </AppleButton>
            <AppleButton
              type='submit'
              disabled={isSubmitting}
              loading={isSubmitting}
              icon={!isSubmitting ? <Car className='h-4 w-4' /> : undefined}
            >
              {isSubmitting ? 'Salvataggio...' : 'Salva Veicolo'}
            </AppleButton>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
