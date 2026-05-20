'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import {
  Search,
  Plus,
  ChevronRight,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Recycle,
  Filter,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Pagination } from '@/components/ui/pagination';
import { AppleButton } from '@/components/ui/apple-button';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';

// =============================================================================
// Types
// =============================================================================
interface WasteEntry {
  id: string;
  entryNumber: number;
  date: string;
  type: 'CARICO' | 'SCARICO';
  cerCode: string;
  cerDescription: string;
  quantity: number;
  unit: string;
  hazardous: boolean;
  origin?: string;
  destination?: string;
  physicalState?: string;
  hazardClass?: string;
  notes?: string;
}

interface EntriesResponse {
  data: WasteEntry[];
  total: number;
  page: number;
  limit: number;
}

// =============================================================================
// Animation Variants
// =============================================================================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const listItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

// =============================================================================
// Main Page
// =============================================================================
export default function RentriEntriesPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'CARICO' | 'SCARICO' | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const PAGE_SIZE = 20;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Build query params
  const queryParams = new URLSearchParams();
  queryParams.set('page', page.toString());
  queryParams.set('limit', PAGE_SIZE.toString());
  if (debouncedSearch) queryParams.set('search', debouncedSearch);
  if (typeFilter) queryParams.set('type', typeFilter);
  if (dateFrom) queryParams.set('dateFrom', dateFrom);
  if (dateTo) queryParams.set('dateTo', dateTo);

  const { data, isLoading, error, mutate } = useSWR<EntriesResponse>(
    `/api/rentri/entries?${queryParams.toString()}`,
    fetcher,
  );

  const entries: WasteEntry[] = (() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.data)) return data.data;
    return [];
  })();
  const totalEntries = data?.total || entries.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));

  const hasActiveFilters = typeFilter !== '' || dateFrom !== '' || dateTo !== '';

  function clearFilters(): void {
    setTypeFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  return (
    <div>
      {/* Header */}
      <header>
        <div className='px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <div>
            <Breadcrumb
              items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Rifiuti (RENTRI)', href: '/dashboard/rentri' },
                { label: 'Registro' },
              ]}
            />
            <h1 className='text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
              Registro Carico/Scarico
            </h1>
            <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1'>
              Registro cronologico carico e scarico rifiuti
            </p>
          </div>
          <div className='flex items-center gap-3'>
            <AppleButton
              variant="primary"
              onClick={() => router.push('/dashboard/rentri/entries/new')}
              icon={<Plus className="h-4 w-4" />}
            >
              Nuova Registrazione
            </AppleButton>
          </div>
        </div>
      </header>

      <motion.div
        className="p-4 sm:p-8 space-y-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Search & Filters */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardContent>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                  <Input
                    placeholder="Cerca per codice CER, descrizione..."
                    aria-label="Cerca registrazioni"
                    value={searchInput}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <AppleButton
                  variant={hasActiveFilters ? 'secondary' : 'ghost'}
                  icon={<Filter className="h-4 w-4" />}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  Filtri
                  {hasActiveFilters && (
                    <span className="w-5 h-5 rounded-full text-footnote font-bold flex items-center justify-center bg-[var(--brand)] text-[var(--text-on-brand)] ml-1">
                      !
                    </span>
                  )}
                </AppleButton>
              </div>

              {showFilters && (
                <motion.div
                  className="flex flex-col sm:flex-row gap-3 pt-4"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  {/* Type Filter */}
                  <div className="flex gap-2">
                    {(['', 'CARICO', 'SCARICO'] as const).map((t) => (
                      <AppleButton
                        key={t || 'all'}
                        variant={typeFilter === t ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => {
                          setTypeFilter(t);
                          setPage(1);
                        }}
                      >
                        {t === '' ? 'Tutti' : t === 'CARICO' ? 'Carico' : 'Scarico'}
                      </AppleButton>
                    ))}
                  </div>

                  {/* Date Range */}
                  <div className="flex gap-2 items-center">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => {
                        setDateFrom(e.target.value);
                        setPage(1);
                      }}
                      className="h-10 px-3 rounded-xl text-body focus:outline-none focus:ring-2 focus:ring-apple-blue bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] border border-[var(--border-default)] dark:border-[var(--border-default)] text-[var(--text-primary)] dark:text-[var(--text-primary)]"
                      aria-label="Data da"
                    />
                    <span className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                      —
                    </span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => {
                        setDateTo(e.target.value);
                        setPage(1);
                      }}
                      className="h-10 px-3 rounded-xl text-body focus:outline-none focus:ring-2 focus:ring-apple-blue bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] border border-[var(--border-default)] dark:border-[var(--border-default)] text-[var(--text-primary)] dark:text-[var(--text-primary)]"
                      aria-label="Data a"
                    />
                  </div>

                  {hasActiveFilters && (
                    <AppleButton
                      variant="ghost"
                      size="sm"
                      icon={<X className="h-3.5 w-3.5" />}
                      onClick={clearFilters}
                    >
                      Rimuovi filtri
                    </AppleButton>
                  )}
                </motion.div>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Entries Table */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Registrazioni
                {!isLoading && (
                  <span className="ml-2 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                    ({totalEntries})
                  </span>
                )}
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              {error ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-[var(--status-error)]/40 mb-4" />
                  <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                    Impossibile caricare le registrazioni
                  </p>
                  <AppleButton variant="ghost" className="mt-4" onClick={() => mutate()}>
                    Riprova
                  </AppleButton>
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[var(--brand)]" />
                </div>
              ) : entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Recycle className="h-12 w-12 text-[var(--text-tertiary)]/40 mb-4" />
                  <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                    {debouncedSearch
                      ? `Nessun risultato per "${debouncedSearch}"`
                      : 'Nessuna registrazione trovata'}
                  </p>
                  <AppleButton
                    variant="ghost"
                    className="mt-4"
                    onClick={() => router.push('/dashboard/rentri/entries/new')}
                  >
                    Aggiungi la prima registrazione
                  </AppleButton>
                </div>
              ) : (
                <motion.div
                  className="space-y-3"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {/* Table Header (desktop) */}
                  <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                    <div className="col-span-1">N.</div>
                    <div className="col-span-2">Data</div>
                    <div className="col-span-1">Tipo</div>
                    <div className="col-span-2">CER</div>
                    <div className="col-span-3">Descrizione</div>
                    <div className="col-span-1">Quantita</div>
                    <div className="col-span-1">Orig./Dest.</div>
                    <div className="col-span-1" />
                  </div>

                  {entries.map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 p-4 rounded-2xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-active)] hover:shadow-apple transition-all duration-300 items-center cursor-pointer group"
                      variants={listItemVariants}
                      custom={index}
                      whileHover={{ scale: 1.005, x: 4 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => router.push(`/dashboard/rentri/entries/${entry.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') router.push(`/dashboard/rentri/entries/${entry.id}`);
                      }}
                    >
                      <div className="lg:col-span-1 text-footnote font-mono text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                        <span className="lg:hidden text-footnote mr-2 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                          N.
                        </span>
                        {entry.entryNumber}
                      </div>
                      <div className="lg:col-span-2 text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                        {new Date(entry.date).toLocaleDateString('it-IT', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="lg:col-span-1">
                        <span
                          className={`text-footnote font-semibold px-2.5 py-1 rounded-full ${
                            entry.type === 'CARICO'
                              ? 'bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)] text-[var(--status-success)] dark:text-[var(--status-success)]'
                              : 'bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)] text-[var(--status-error)] dark:text-[var(--status-error)]'
                          }`}
                        >
                          {entry.type}
                        </span>
                      </div>
                      <div className="lg:col-span-2 flex items-center gap-1">
                        <span className="text-body font-mono text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                          {entry.cerCode}
                        </span>
                        {entry.hazardous && (
                          <AlertTriangle className="h-3.5 w-3.5 text-[var(--status-warning)]" />
                        )}
                      </div>
                      <div
                        className="lg:col-span-3 text-footnote truncate text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]"
                        title={entry.cerDescription}
                      >
                        {entry.cerDescription}
                      </div>
                      <div className="lg:col-span-1 text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] tabular-nums">
                        {entry.quantity.toLocaleString('it-IT')} {entry.unit || 'kg'}
                      </div>
                      <div
                        className="lg:col-span-1 text-footnote truncate text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]"
                        title={entry.type === 'CARICO' ? entry.origin : entry.destination}
                      >
                        {entry.type === 'CARICO' ? (entry.origin || '—') : (entry.destination || '—')}
                      </div>
                      <div className="lg:col-span-1 flex justify-end">
                        <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]" />
                      </div>
                    </motion.div>
                  ))}

                  {/* Pagination */}
                  <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                </motion.div>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
