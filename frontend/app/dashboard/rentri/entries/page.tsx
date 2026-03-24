'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
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
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Pagination } from '@/components/ui/pagination';

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// =============================================================================
// Skeleton
// =============================================================================
function RowSkeleton() {
  return (
    <div
      className="flex items-center gap-4 p-5 animate-pulse"
      style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}
    >
      <div className="w-10 h-10 rounded-xl" style={{ backgroundColor: colors.surfaceHover }} />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-48 rounded" style={{ backgroundColor: colors.surfaceHover }} />
        <div className="h-3 w-32 rounded" style={{ backgroundColor: colors.surfaceHover }} />
      </div>
      <div className="h-6 w-16 rounded" style={{ backgroundColor: colors.surfaceHover }} />
    </div>
  );
}

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
              { label: 'Registro' },
            ]}
          />
          <div className="flex items-center justify-between mt-2">
            <div>
              <h1 className="text-[28px] font-light" style={{ color: colors.textPrimary }}>
                Registro Carico/Scarico
              </h1>
              <p className="text-[13px] mt-0.5" style={{ color: colors.textTertiary }}>
                Registro cronologico carico e scarico rifiuti
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard/rentri/entries/new')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full transition-colors min-h-[44px]"
              style={{ backgroundColor: colors.textPrimary, color: colors.bg }}
            >
              <Plus className="h-4 w-4" />
              Nuova Registrazione
            </button>
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
        <motion.div
          className="rounded-2xl border p-4 space-y-4"
          style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
          variants={itemVariants}
        >
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                style={{ color: colors.textMuted }}
              />
              <input
                placeholder="Cerca per codice CER, descrizione..."
                aria-label="Cerca registrazioni"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl text-sm focus:outline-none focus:border-white/30 transition-colors"
                style={inputStyle}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="h-11 px-4 rounded-xl text-sm font-medium transition-colors border flex items-center gap-2"
              style={{
                borderColor: hasActiveFilters ? colors.info : colors.borderSubtle,
                color: hasActiveFilters ? colors.info : colors.textSecondary,
                backgroundColor: hasActiveFilters ? `${colors.info}10` : 'transparent',
              }}
            >
              <Filter className="h-4 w-4" />
              Filtri
              {hasActiveFilters && (
                <span
                  className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ backgroundColor: colors.info, color: colors.bg }}
                >
                  !
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <motion.div
              className="flex flex-col sm:flex-row gap-3 pt-2"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              {/* Type Filter */}
              <div className="flex gap-2">
                {(['', 'CARICO', 'SCARICO'] as const).map((t) => (
                  <button
                    key={t}
                    className="h-10 px-4 rounded-full text-[13px] font-medium transition-all border"
                    style={{
                      backgroundColor: typeFilter === t ? colors.textPrimary : 'transparent',
                      color: typeFilter === t ? colors.bg : colors.textSecondary,
                      borderColor: typeFilter === t ? colors.textPrimary : colors.borderSubtle,
                    }}
                    onClick={() => {
                      setTypeFilter(t);
                      setPage(1);
                    }}
                  >
                    {t === '' ? 'Tutti' : t === 'CARICO' ? 'Carico' : 'Scarico'}
                  </button>
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
                  className="h-10 px-3 rounded-xl text-sm focus:outline-none"
                  style={inputStyle}
                  aria-label="Data da"
                />
                <span className="text-[13px]" style={{ color: colors.textMuted }}>
                  —
                </span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="h-10 px-3 rounded-xl text-sm focus:outline-none"
                  style={inputStyle}
                  aria-label="Data a"
                />
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="h-10 px-4 rounded-full text-[13px] font-medium transition-colors flex items-center gap-1 hover:bg-white/5"
                  style={{ color: colors.textTertiary }}
                >
                  <X className="h-3.5 w-3.5" />
                  Rimuovi filtri
                </button>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Entries Table */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-light" style={{ color: colors.textPrimary }}>
              Registrazioni
              {!isLoading && (
                <span className="ml-2" style={{ color: colors.textMuted }}>
                  ({totalEntries})
                </span>
              )}
            </h2>
          </div>

          {error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="h-12 w-12 mb-4" style={{ color: colors.borderSubtle }} />
              <p className="text-[15px] mb-4" style={{ color: colors.textTertiary }}>
                Impossibile caricare le registrazioni
              </p>
              <button
                onClick={() => mutate()}
                className="px-4 py-2 rounded-full text-sm border transition-colors hover:bg-white/5"
                style={{ borderColor: colors.border, color: colors.textSecondary }}
              >
                Riprova
              </button>
            </div>
          ) : isLoading ? (
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <RowSkeleton key={i} />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Recycle className="h-12 w-12 mb-4" style={{ color: colors.borderSubtle }} />
              <p className="text-[15px] mb-1" style={{ color: colors.textPrimary }}>
                {debouncedSearch
                  ? `Nessun risultato per "${debouncedSearch}"`
                  : 'Nessuna registrazione trovata'}
              </p>
              <p className="text-[13px]" style={{ color: colors.textTertiary }}>
                {debouncedSearch
                  ? 'Prova a modificare la ricerca'
                  : 'Aggiungi la prima registrazione per iniziare'}
              </p>
            </div>
          ) : (
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
            >
              {/* Table Header (desktop) */}
              <div
                className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 text-[12px] uppercase font-semibold tracking-wider"
                style={{ color: colors.textMuted, borderBottom: `1px solid ${colors.borderSubtle}` }}
              >
                <div className="col-span-1">N.</div>
                <div className="col-span-2">Data</div>
                <div className="col-span-1">Tipo</div>
                <div className="col-span-2">CER</div>
                <div className="col-span-3">Descrizione</div>
                <div className="col-span-1">Quantita</div>
                <div className="col-span-1">Orig./Dest.</div>
                <div className="col-span-1" />
              </div>

              <motion.div variants={containerVariants} initial="hidden" animate="visible">
                {entries.map((entry, idx) => (
                  <motion.div
                    key={entry.id}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 px-5 py-4 cursor-pointer transition-colors items-center group"
                    style={{
                      borderBottom: idx < entries.length - 1 ? `1px solid ${colors.borderSubtle}` : 'none',
                    }}
                    variants={itemVariants}
                    onClick={() => router.push(`/dashboard/rentri/entries/${entry.id}`)}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = colors.surfaceHover;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') router.push(`/dashboard/rentri/entries/${entry.id}`);
                    }}
                  >
                    <div className="lg:col-span-1 text-[13px] font-mono" style={{ color: colors.textTertiary }}>
                      <span className="lg:hidden text-[11px] uppercase mr-2" style={{ color: colors.textMuted }}>
                        N.
                      </span>
                      {entry.entryNumber}
                    </div>
                    <div className="lg:col-span-2 text-[13px]" style={{ color: colors.textSecondary }}>
                      {new Date(entry.date).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="lg:col-span-1">
                      <span
                        className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: entry.type === 'CARICO' ? `${colors.success}20` : `${colors.error}20`,
                          color: entry.type === 'CARICO' ? colors.success : colors.error,
                        }}
                      >
                        {entry.type}
                      </span>
                    </div>
                    <div className="lg:col-span-2 flex items-center gap-1">
                      <span className="text-[13px] font-mono" style={{ color: colors.textPrimary }}>
                        {entry.cerCode}
                      </span>
                      {entry.hazardous && (
                        <AlertTriangle className="h-3.5 w-3.5" style={{ color: colors.warning }} />
                      )}
                    </div>
                    <div
                      className="lg:col-span-3 text-[13px] truncate"
                      style={{ color: colors.textSecondary }}
                      title={entry.cerDescription}
                    >
                      {entry.cerDescription}
                    </div>
                    <div
                      className="lg:col-span-1 text-[13px] font-medium"
                      style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}
                    >
                      {entry.quantity.toLocaleString('it-IT')} {entry.unit || 'kg'}
                    </div>
                    <div
                      className="lg:col-span-1 text-[12px] truncate"
                      style={{ color: colors.textTertiary }}
                      title={entry.type === 'CARICO' ? entry.origin : entry.destination}
                    >
                      {entry.type === 'CARICO' ? (entry.origin || '—') : (entry.destination || '—')}
                    </div>
                    <div className="lg:col-span-1 flex justify-end">
                      <ChevronRight
                        className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: colors.textMuted }}
                      />
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Pagination */}
              <div className="px-5 py-3" style={{ borderTop: `1px solid ${colors.borderSubtle}` }}>
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
