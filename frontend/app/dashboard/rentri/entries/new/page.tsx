'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  ArrowLeft,
  Recycle,
  Loader2,
  Search,
  AlertTriangle,
  X,
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
// Design Tokens
// =============================================================================
const colors = {
  bg: '#1a1a1a',
  surface: '#2f2f2f',
  surfaceHover: '#383838',
  border: '#4e4e4e',
  borderSubtle: '#3a3a3a',
  textPrimary: '#ffffff',
  textSecondary: '#b4b4b4',
  textTertiary: '#888888',
  textMuted: '#666666',
  success: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
  info: '#60a5fa',
  glowStrong: 'rgba(255,255,255,0.06)',
};

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

  const inputStyle = {
    backgroundColor: colors.glowStrong,
    borderWidth: 1,
    borderStyle: 'solid' as const,
    borderColor: error ? colors.error : colors.borderSubtle,
    color: colors.textPrimary,
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="text-[13px] mb-1.5 block" style={{ color: colors.textTertiary }}>
        Codice CER *
      </label>
      {value ? (
        <div
          className="flex items-center gap-2 h-11 px-3 rounded-xl text-sm"
          style={inputStyle}
        >
          <span className="font-mono font-medium" style={{ color: colors.textPrimary }}>
            {value}
          </span>
          <button
            type="button"
            onClick={() => {
              onChange('');
              setSearchTerm('');
              setDebouncedTerm('');
            }}
            className="ml-auto p-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Rimuovi codice CER"
          >
            <X className="h-4 w-4" style={{ color: colors.textTertiary }} />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
              style={{ color: colors.textMuted }}
            />
            <input
              placeholder="Cerca codice CER o descrizione..."
              value={searchTerm}
              onChange={(e) => {
                handleSearch(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              className="w-full h-11 pl-10 pr-4 rounded-xl text-sm focus:outline-none focus:border-white/30 transition-colors"
              style={inputStyle}
            />
            {cerLoading && (
              <Loader2
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin"
                style={{ color: colors.textMuted }}
              />
            )}
          </div>

          {isOpen && results.length > 0 && (
            <div
              className="absolute z-50 w-full mt-1 rounded-xl border shadow-xl max-h-60 overflow-y-auto"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
              }}
            >
              {results.map((cer) => (
                <button
                  key={cer.code}
                  type="button"
                  className="w-full text-left px-4 py-3 transition-colors flex items-start gap-3"
                  style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}
                  onClick={() => {
                    onSelect(cer);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = colors.surfaceHover;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-mono font-medium" style={{ color: colors.textPrimary }}>
                        {cer.code}
                      </span>
                      {cer.hazardous && (
                        <span
                          className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                          style={{ backgroundColor: `${colors.warning}20`, color: colors.warning }}
                        >
                          <AlertTriangle className="h-3 w-3" />
                          Pericoloso
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] mt-0.5" style={{ color: colors.textTertiary }}>
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
        <p className="text-xs mt-1" style={{ color: colors.error }}>
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

  const inputStyle = {
    backgroundColor: colors.glowStrong,
    borderWidth: 1,
    borderStyle: 'solid' as const,
    borderColor: colors.borderSubtle,
    color: colors.textPrimary,
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 backdrop-blur-xl border-b"
        style={{
          backgroundColor: `${colors.bg}cc`,
          borderColor: colors.borderSubtle,
        }}
      >
        <div className="px-4 sm:px-8 py-5">
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Rifiuti (RENTRI)', href: '/dashboard/rentri' },
              { label: 'Registro', href: '/dashboard/rentri/entries' },
              { label: 'Nuova Registrazione' },
            ]}
          />
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => router.push('/dashboard/rentri/entries')}
              className="p-2.5 rounded-xl transition-colors hover:bg-white/5 border min-h-[44px] min-w-[44px] flex items-center justify-center"
              style={{ borderColor: colors.borderSubtle, color: colors.textSecondary }}
              aria-label="Torna al registro"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-[28px] font-light" style={{ color: colors.textPrimary }}>
                Nuova Registrazione Rifiuto
              </h1>
              <p className="text-[13px] mt-0.5" style={{ color: colors.textTertiary }}>
                Compila il modulo per registrare un nuovo carico o scarico
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-8 max-w-3xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Card: Tipo Registrazione */}
          <div
            className="rounded-2xl border p-6"
            style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
          >
            <div className="flex items-center gap-2 mb-5">
              <Recycle className="h-5 w-5" style={{ color: colors.success }} />
              <h2 className="text-[16px] font-medium" style={{ color: colors.textPrimary }}>
                Tipo Registrazione
              </h2>
            </div>

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
                      className="flex-1 h-14 rounded-xl text-sm font-medium transition-all border flex items-center justify-center gap-2"
                      style={{
                        backgroundColor:
                          field.value === t
                            ? t === 'CARICO'
                              ? `${colors.success}20`
                              : `${colors.error}20`
                            : 'transparent',
                        borderColor:
                          field.value === t
                            ? t === 'CARICO'
                              ? colors.success
                              : colors.error
                            : colors.borderSubtle,
                        color:
                          field.value === t
                            ? t === 'CARICO'
                              ? colors.success
                              : colors.error
                            : colors.textSecondary,
                      }}
                    >
                      {t === 'CARICO' ? 'Carico (ingresso)' : 'Scarico (uscita)'}
                    </button>
                  ))}
                </div>
              )}
            />
            {errors.type && (
              <p className="text-xs mt-2" style={{ color: colors.error }}>
                {errors.type.message}
              </p>
            )}
          </div>

          {/* Card: Dati Rifiuto */}
          <div
            className="rounded-2xl border p-6 space-y-5"
            style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
          >
            <h2 className="text-[16px] font-medium" style={{ color: colors.textPrimary }}>
              Dati Rifiuto
            </h2>

            {/* CER Code Search */}
            <CerCodeSearch
              value={watchCerCode || ''}
              onChange={(val) => setValue('cerCode', val)}
              onSelect={handleCerSelect}
              error={errors.cerCode?.message}
            />

            {/* Hazardous Warning */}
            {watchHazardous && (
              <div
                className="rounded-xl px-4 py-3 flex items-center gap-3"
                style={{ backgroundColor: `${colors.warning}15`, border: `1px solid ${colors.warning}40` }}
              >
                <AlertTriangle className="h-5 w-5 flex-shrink-0" style={{ color: colors.warning }} />
                <div>
                  <p className="text-[13px] font-medium" style={{ color: colors.warning }}>
                    Rifiuto Pericoloso
                  </p>
                  <p className="text-[12px]" style={{ color: colors.textTertiary }}>
                    Questo codice CER e classificato come rifiuto pericoloso. Rispettare le normative specifiche per lo stoccaggio e il trasporto.
                  </p>
                </div>
              </div>
            )}

            {/* Date */}
            <div>
              <label className="text-[13px] mb-1.5 block" style={{ color: colors.textTertiary }}>
                Data *
              </label>
              <input
                type="date"
                {...register('date')}
                className="w-full h-11 px-3 rounded-xl text-sm focus:outline-none focus:border-white/30 transition-colors"
                style={inputStyle}
              />
              {errors.date && (
                <p className="text-xs mt-1" style={{ color: colors.error }}>
                  {errors.date.message}
                </p>
              )}
            </div>

            {/* Quantity + Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[13px] mb-1.5 block" style={{ color: colors.textTertiary }}>
                  Quantita (kg) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...register('quantity')}
                  className="w-full h-11 px-3 rounded-xl text-sm focus:outline-none focus:border-white/30 transition-colors"
                  style={inputStyle}
                />
                {errors.quantity && (
                  <p className="text-xs mt-1" style={{ color: colors.error }}>
                    {errors.quantity.message}
                  </p>
                )}
              </div>
              <div>
                <label className="text-[13px] mb-1.5 block" style={{ color: colors.textTertiary }}>
                  Unita
                </label>
                <select
                  {...register('unit')}
                  className="w-full h-11 px-3 rounded-xl text-sm focus:outline-none focus:border-white/30 transition-colors appearance-none"
                  style={inputStyle}
                >
                  {UNITS.map((u) => (
                    <option key={u.value} value={u.value} style={{ backgroundColor: colors.surface }}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Physical State + Hazard Class */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[13px] mb-1.5 block" style={{ color: colors.textTertiary }}>
                  Stato fisico
                </label>
                <select
                  {...register('physicalState')}
                  className="w-full h-11 px-3 rounded-xl text-sm focus:outline-none focus:border-white/30 transition-colors appearance-none"
                  style={inputStyle}
                >
                  <option value="" style={{ backgroundColor: colors.surface }}>
                    Seleziona...
                  </option>
                  {PHYSICAL_STATES.map((ps) => (
                    <option key={ps.value} value={ps.value} style={{ backgroundColor: colors.surface }}>
                      {ps.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[13px] mb-1.5 block" style={{ color: colors.textTertiary }}>
                  Classe pericolo
                </label>
                <input
                  {...register('hazardClass')}
                  placeholder="Es. HP4, HP7"
                  className="w-full h-11 px-3 rounded-xl text-sm focus:outline-none focus:border-white/30 transition-colors"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Origin */}
            <div>
              <label className="text-[13px] mb-1.5 block" style={{ color: colors.textTertiary }}>
                {watchType === 'CARICO' ? 'Origine' : 'Destinazione'}
              </label>
              <input
                {...register('origin')}
                placeholder={watchType === 'CARICO' ? 'Produzione propria' : 'Impianto di destinazione'}
                className="w-full h-11 px-3 rounded-xl text-sm focus:outline-none focus:border-white/30 transition-colors"
                style={inputStyle}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-[13px] mb-1.5 block" style={{ color: colors.textTertiary }}>
                Note
              </label>
              <textarea
                {...register('notes')}
                placeholder="Note aggiuntive..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-white/30 transition-colors resize-none"
                style={inputStyle}
              />
            </div>

            {/* Work Order Link (optional) */}
            <div>
              <label className="text-[13px] mb-1.5 block" style={{ color: colors.textTertiary }}>
                Collegamento ordine di lavoro (opzionale)
              </label>
              <input
                {...register('workOrderId')}
                placeholder="ID ordine di lavoro..."
                className="w-full h-11 px-3 rounded-xl text-sm focus:outline-none focus:border-white/30 transition-colors"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push('/dashboard/rentri/entries')}
              className="flex-1 sm:flex-none px-6 py-3 rounded-full text-sm font-medium transition-colors border hover:bg-white/5 min-h-[44px]"
              style={{ borderColor: colors.border, color: colors.textSecondary }}
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-8 py-3 rounded-full text-sm font-medium transition-colors min-h-[44px] disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: colors.textPrimary, color: colors.bg }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                'Salva Registrazione'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
