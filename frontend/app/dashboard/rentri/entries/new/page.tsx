'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  ArrowLeft,
  Recycle,
  Loader2,
  Search,
  AlertTriangle,
  X,
  Save,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================
interface CerCode {
  code: string;
  description: string;
  hazardous: boolean;
  physicalState?: string;
  hazardClass?: string;
}

// =============================================================================
// Validation
// =============================================================================
const entrySchema = z.object({
  type: z.enum(['CARICO', 'SCARICO'], { required_error: 'Seleziona il tipo di registrazione' }),
  cerCode: z.string().min(1, 'Seleziona un codice CER'),
  cerDescription: z.string().optional(),
  date: z.string().min(1, 'La data e obbligatoria'),
  quantity: z.coerce.number().positive('La quantita deve essere maggiore di zero'),
  unit: z.string().optional(),
  physicalState: z.string().optional(),
  hazardClass: z.string().optional(),
  hazardous: z.boolean().optional(),
  origin: z.string().optional(),
  notes: z.string().optional(),
  workOrderId: z.string().optional(),
});

type EntryFormData = z.infer<typeof entrySchema>;

// =============================================================================
// Constants
// =============================================================================
const PHYSICAL_STATES = [
  { value: 'SOLIDO', label: 'Solido' },
  { value: 'LIQUIDO', label: 'Liquido' },
  { value: 'FANGOSO', label: 'Fangoso' },
  { value: 'POLVERULENTO', label: 'Polverulento' },
];

const UNITS = [
  { value: 'kg', label: 'Chilogrammi (kg)' },
  { value: 'litri', label: 'Litri' },
  { value: 'pezzi', label: 'Pezzi' },
  { value: 'fusti', label: 'Fusti' },
  { value: 'mc', label: 'Metri cubi (mc)' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const inputClass = 'w-full h-10 px-3 rounded-md border border-[var(--border-default)] dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue';
const selectClass = `${inputClass} appearance-none cursor-pointer`;

// =============================================================================
// CER Search Dropdown Component
// =============================================================================
function CerCodeSearch({
  value,
  onChange,
  onSelect,
  error,
}: {
  value: string;
  onChange: (val: string) => void;
  onSelect: (cer: CerCode) => void;
  error?: string;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((val: string) => {
    setSearchTerm(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedTerm(val), 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: cerResults, isLoading: cerLoading } = useSWR<CerCode[] | { data: CerCode[] }>(
    debouncedTerm.length >= 2 ? `/api/rentri/cer-codes/search?q=${encodeURIComponent(debouncedTerm)}` : null,
    fetcher,
  );

  const results: CerCode[] = (() => {
    if (!cerResults) return [];
    if (Array.isArray(cerResults)) return cerResults;
    if (Array.isArray((cerResults as { data: CerCode[] }).data)) return (cerResults as { data: CerCode[] }).data;
    return [];
  })();

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1 block">
        Codice CER *
      </label>
      {value ? (
        <div className={`flex items-center gap-2 h-10 px-3 rounded-md text-body border ${error ? 'border-[var(--status-error)]/40' : 'border-[var(--border-default)] dark:border-[var(--border-default)]'} bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-[var(--text-primary)] dark:text-[var(--text-primary)]`}>
          <span className="font-mono font-medium">
            {value}
          </span>
          <button
            type="button"
            onClick={() => {
              onChange('');
              setSearchTerm('');
              setDebouncedTerm('');
            }}
            className="ml-auto p-1 rounded-lg hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-secondary)]/10 transition-colors"
            aria-label="Rimuovi codice CER"
          >
            <X className="h-4 w-4 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]"
            />
            <input
              placeholder="Cerca codice CER o descrizione..."
              value={searchTerm}
              onChange={(e) => {
                handleSearch(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              className={`${inputClass} pl-10 ${error ? 'border-[var(--status-error)]/40' : ''}`}
            />
            {cerLoading && (
              <Loader2
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[var(--brand)]"
              />
            )}
          </div>

          {isOpen && results.length > 0 && (
            <div className="absolute z-50 w-full mt-1 rounded-xl border border-[var(--border-default)] dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] shadow-apple dark:shadow-xl max-h-60 overflow-y-auto">
              {results.map((cer) => (
                <button
                  key={cer.code}
                  type="button"
                  className="w-full text-left px-4 py-3 transition-colors flex items-start gap-3 border-b border-[var(--border-default)]/30 dark:border-[var(--border-default)] hover:bg-[var(--surface-secondary)]/50 dark:hover:bg-[var(--surface-active)]"
                  onClick={() => {
                    onSelect(cer);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-footnote font-mono font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                        {cer.code}
                      </span>
                      {cer.hazardous && (
                        <span className="text-footnote font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 bg-[var(--status-warning)]/20 dark:bg-[var(--status-warning)]/20 text-[var(--status-warning)] dark:text-[var(--status-warning)]">
                          <AlertTriangle className="h-3 w-3" />
                          Pericoloso
                        </span>
                      )}
                    </div>
                    <p className="text-footnote mt-0.5 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                      {cer.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {error && (
        <p className="text-footnote mt-1 text-[var(--status-error)]">
          {error}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// Main Page
// =============================================================================
export default function NewRentriEntryPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      type: 'CARICO',
      date: new Date().toISOString().split('T')[0],
      unit: 'kg',
      origin: 'Produzione propria',
      hazardous: false,
    },
  });

  const watchType = watch('type');
  const watchHazardous = watch('hazardous');
  const watchCerCode = watch('cerCode');

  function handleCerSelect(cer: CerCode): void {
    setValue('cerCode', cer.code);
    setValue('cerDescription', cer.description);
    setValue('hazardous', cer.hazardous);
    if (cer.physicalState) {
      setValue('physicalState', cer.physicalState);
    }
    if (cer.hazardClass) {
      setValue('hazardClass', cer.hazardClass);
    }
  }

  const onSubmit = async (data: EntryFormData) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/rentri/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(
          (err as { error?: { message?: string } })?.error?.message || 'Errore nella creazione della registrazione',
        );
      }
      toast.success('Registrazione creata con successo');
      router.push('/dashboard/rentri/entries');
    } catch (error) {
      toast.error('Errore nella creazione', {
        description: error instanceof Error ? error.message : 'Errore sconosciuto',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <header className=''>
        <div className='px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <div className="flex items-center gap-4">
            <AppleButton
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/rentri/entries')}
              icon={<ArrowLeft className="h-4 w-4" />}
              aria-label="Torna al registro"
              className="min-w-[44px]"
            />
            <div>
              <Breadcrumb
                items={[
                  { label: 'Dashboard', href: '/dashboard' },
                  { label: 'Rifiuti (RENTRI)', href: '/dashboard/rentri' },
                  { label: 'Registro', href: '/dashboard/rentri/entries' },
                  { label: 'Nuova Registrazione' },
                ]}
              />
              <h1 className='text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Nuova Registrazione Rifiuto
              </h1>
              <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1'>
                Compila il modulo per registrare un nuovo carico o scarico
              </p>
            </div>
          </div>
        </div>
      </header>

      <motion.div
        className="p-4 sm:p-8 max-w-3xl mx-auto space-y-6"
        initial='hidden'
        animate='visible'
        variants={containerVariants}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Card: Tipo Registrazione */}
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <h2 className="text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
                  <Recycle className="h-5 w-5 text-[var(--status-success)]" />
                  Tipo Registrazione
                </h2>
              </AppleCardHeader>
              <AppleCardContent>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <div className="flex gap-3">
                      {(['CARICO', 'SCARICO'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => field.onChange(t)}
                          className={`flex-1 h-14 rounded-xl text-body font-medium transition-all border flex items-center justify-center gap-2 ${
                            field.value === t
                              ? t === 'CARICO'
                                ? 'bg-[var(--status-success-subtle)] dark:bg-[var(--status-success)]/20 border-[var(--status-success)] dark:border-[var(--status-success)]/40 text-[var(--status-success)] dark:text-[var(--status-success)]'
                                : 'bg-[var(--status-error-subtle)] dark:bg-[var(--status-error)]/20 border-[var(--status-error)] dark:border-[var(--status-error)] text-[var(--status-error)] dark:text-[var(--status-error)]'
                              : 'bg-[var(--surface-secondary)] dark:bg-transparent border-[var(--border-default)] dark:border-[var(--border-default)] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'
                          }`}
                        >
                          {t === 'CARICO' ? 'Carico (ingresso)' : 'Scarico (uscita)'}
                        </button>
                      ))}
                    </div>
                  )}
                />
                {errors.type && (
                  <p className="text-footnote mt-2 text-[var(--status-error)]">
                    {errors.type.message}
                  </p>
                )}
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          {/* Card: Dati Rifiuto */}
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <h2 className="text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                  Dati Rifiuto
                </h2>
              </AppleCardHeader>
              <AppleCardContent className="space-y-5">
                {/* CER Code Search */}
                <CerCodeSearch
                  value={watchCerCode || ''}
                  onChange={(val) => setValue('cerCode', val)}
                  onSelect={handleCerSelect}
                  error={errors.cerCode?.message}
                />

                {/* Hazardous Warning */}
                {watchHazardous && (
                  <div className="rounded-xl px-4 py-3 flex items-center gap-3 bg-[var(--status-warning)]/10 dark:bg-[var(--status-warning)]/10 border border-[var(--status-warning)]/30 dark:border-[var(--status-warning)]/40/25">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0 text-[var(--status-warning)] dark:text-[var(--status-warning)]" />
                    <div>
                      <p className="text-footnote font-medium text-[var(--status-warning)] dark:text-[var(--status-warning)]">
                        Rifiuto Pericoloso
                      </p>
                      <p className="text-footnote text-[var(--status-warning)] dark:text-[var(--text-tertiary)]">
                        Questo codice CER e classificato come rifiuto pericoloso. Rispettare le normative specifiche per lo stoccaggio e il trasporto.
                      </p>
                    </div>
                  </div>
                )}

                {/* Date */}
                <div>
                  <label className="text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1 block">
                    Data *
                  </label>
                  <input
                    type="date"
                    {...register('date')}
                    className={inputClass}
                  />
                  {errors.date && (
                    <p className="text-footnote mt-1 text-[var(--status-error)]">
                      {errors.date.message}
                    </p>
                  )}
                </div>

                {/* Quantity + Unit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1 block">
                      Quantita (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...register('quantity')}
                      className={inputClass}
                    />
                    {errors.quantity && (
                      <p className="text-footnote mt-1 text-[var(--status-error)]">
                        {errors.quantity.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1 block">
                      Unita
                    </label>
                    <select
                      {...register('unit')}
                      className={selectClass}
                    >
                      {UNITS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Physical State + Hazard Class */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1 block">
                      Stato fisico
                    </label>
                    <select
                      {...register('physicalState')}
                      className={selectClass}
                    >
                      <option value="">
                        Seleziona...
                      </option>
                      {PHYSICAL_STATES.map((ps) => (
                        <option key={ps.value} value={ps.value}>
                          {ps.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1 block">
                      Classe pericolo
                    </label>
                    <input
                      {...register('hazardClass')}
                      placeholder="Es. HP4, HP7"
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Origin */}
                <div>
                  <label className="text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1 block">
                    {watchType === 'CARICO' ? 'Origine' : 'Destinazione'}
                  </label>
                  <input
                    {...register('origin')}
                    placeholder={watchType === 'CARICO' ? 'Produzione propria' : 'Impianto di destinazione'}
                    className={inputClass}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1 block">
                    Note
                  </label>
                  <textarea
                    {...register('notes')}
                    placeholder="Note aggiuntive..."
                    rows={3}
                    className='w-full rounded-xl border border-[var(--border-default)] dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-[var(--text-primary)] dark:text-[var(--text-primary)] placeholder-apple-gray/60 dark:placeholder-[var(--text-tertiary)] px-4 py-3 outline-none text-body resize-none focus:ring-2 focus:ring-apple-blue'
                  />
                </div>

                {/* Work Order Link (optional) */}
                <div>
                  <label className="text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1 block">
                    Collegamento ordine di lavoro (opzionale)
                  </label>
                  <input
                    {...register('workOrderId')}
                    placeholder="ID ordine di lavoro..."
                    className={inputClass}
                  />
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          {/* Submit */}
          <div className="flex gap-3">
            <AppleButton
              type="button"
              variant="ghost"
              onClick={() => router.push('/dashboard/rentri/entries')}
            >
              Annulla
            </AppleButton>
            <AppleButton
              type="submit"
              variant="primary"
              loading={isSubmitting}
              icon={<Save className="h-4 w-4" />}
            >
              Salva Registrazione
            </AppleButton>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
