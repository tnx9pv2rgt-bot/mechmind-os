'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import {
  Plus,
  ChevronRight,
  AlertCircle,
  FileText,
  Loader2,
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Pagination } from '@/components/ui/pagination';

// =============================================================================
// Types
// =============================================================================
interface FirRecord {
  id: string;
  firNumber: string;
  date: string;
  cerCode: string;
  cerDescription: string;
  quantity: number;
  unit: string;
  transporterName: string;
  destinationName: string;
  status: 'DRAFT' | 'VIDIMATED' | 'IN_TRANSIT' | 'DELIVERED' | 'CONFIRMED' | 'CANCELLED';
  hazardous: boolean;
}

interface FirResponse {
  data: FirRecord[];
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
  emerald: '#10b981',
  amber: '#f59e0b',
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
// Status Config
// =============================================================================
function getStatusConfig(status: string): { label: string; color: string; bg: string } {
  switch (status) {
    case 'DRAFT':
      return { label: 'Bozza', color: colors.textTertiary, bg: `${colors.textTertiary}20` };
    case 'VIDIMATED':
      return { label: 'Vidimato', color: colors.info, bg: `${colors.info}20` };
    case 'IN_TRANSIT':
      return { label: 'In Transito', color: colors.amber, bg: `${colors.amber}20` };
    case 'DELIVERED':
      return { label: 'Consegnato', color: colors.success, bg: `${colors.success}20` };
    case 'CONFIRMED':
      return { label: 'Confermato', color: colors.emerald, bg: `${colors.emerald}20` };
    case 'CANCELLED':
      return { label: 'Annullato', color: colors.error, bg: `${colors.error}20` };
    default:
      return { label: status, color: colors.textMuted, bg: `${colors.textMuted}20` };
  }
}

// =============================================================================
// Skeleton
// =============================================================================
function RowSkeleton() {
  return (
    <div
      className="flex items-center gap-4 p-5 animate-pulse"
      style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}
    >
      <div className="flex-1 space-y-2">
        <div className="h-4 w-36 rounded" style={{ backgroundColor: colors.surfaceHover }} />
        <div className="h-3 w-48 rounded" style={{ backgroundColor: colors.surfaceHover }} />
      </div>
      <div className="h-6 w-20 rounded-full" style={{ backgroundColor: colors.surfaceHover }} />
    </div>
  );
}

// =============================================================================
// Main Page
// =============================================================================
export default function FirListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const queryParams = new URLSearchParams();
  queryParams.set('page', page.toString());
  queryParams.set('limit', PAGE_SIZE.toString());

  const { data, isLoading, error, mutate } = useSWR<FirResponse>(
    `/api/rentri/fir?${queryParams.toString()}`,
    fetcher,
  );

  const records: FirRecord[] = (() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.data)) return data.data;
    return [];
  })();
  const totalRecords = data?.total || records.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));

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
              { label: 'FIR' },
            ]}
          />
          <div className="flex items-center justify-between mt-2">
            <div>
              <h1 className="text-[28px] font-light" style={{ color: colors.textPrimary }}>
                Formulari (FIR)
              </h1>
              <p className="text-[13px] mt-0.5" style={{ color: colors.textTertiary }}>
                Formulari di identificazione rifiuti per il trasporto
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard/rentri/fir/new')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full transition-colors min-h-[44px]"
              style={{ backgroundColor: colors.textPrimary, color: colors.bg }}
            >
              <Plus className="h-4 w-4" />
              Nuovo FIR
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
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-light" style={{ color: colors.textPrimary }}>
              Formulari
              {!isLoading && (
                <span className="ml-2" style={{ color: colors.textMuted }}>
                  ({totalRecords})
                </span>
              )}
            </h2>
          </div>

          {error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="h-12 w-12 mb-4" style={{ color: colors.borderSubtle }} />
              <p className="text-[15px] mb-4" style={{ color: colors.textTertiary }}>
                Impossibile caricare i formulari
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
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileText className="h-12 w-12 mb-4" style={{ color: colors.borderSubtle }} />
              <p className="text-[15px] mb-1" style={{ color: colors.textPrimary }}>
                Nessun formulario trovato
              </p>
              <p className="text-[13px]" style={{ color: colors.textTertiary }}>
                Crea il primo FIR per iniziare a gestire i trasporti
              </p>
            </div>
          ) : (
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
            >
              {/* Table Header */}
              <div
                className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 text-[12px] uppercase font-semibold tracking-wider"
                style={{ color: colors.textMuted, borderBottom: `1px solid ${colors.borderSubtle}` }}
              >
                <div className="col-span-2">N. FIR</div>
                <div className="col-span-1">Data</div>
                <div className="col-span-1">CER</div>
                <div className="col-span-1">Quantita</div>
                <div className="col-span-2">Trasportatore</div>
                <div className="col-span-2">Destinazione</div>
                <div className="col-span-2">Stato</div>
                <div className="col-span-1" />
              </div>

              <motion.div variants={containerVariants} initial="hidden" animate="visible">
                {records.map((fir, idx) => {
                  const statusConfig = getStatusConfig(fir.status);
                  return (
                    <motion.div
                      key={fir.id}
                      className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 px-5 py-4 cursor-pointer transition-colors items-center group"
                      style={{
                        borderBottom: idx < records.length - 1 ? `1px solid ${colors.borderSubtle}` : 'none',
                      }}
                      variants={itemVariants}
                      onClick={() => router.push(`/dashboard/rentri/fir/${fir.id}`)}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = colors.surfaceHover;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') router.push(`/dashboard/rentri/fir/${fir.id}`);
                      }}
                    >
                      <div className="lg:col-span-2 text-[13px] font-mono font-medium" style={{ color: colors.textPrimary }}>
                        {fir.firNumber}
                      </div>
                      <div className="lg:col-span-1 text-[13px]" style={{ color: colors.textSecondary }}>
                        {new Date(fir.date).toLocaleDateString('it-IT')}
                      </div>
                      <div className="lg:col-span-1 text-[13px] font-mono" style={{ color: colors.textPrimary }}>
                        {fir.cerCode}
                      </div>
                      <div
                        className="lg:col-span-1 text-[13px]"
                        style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}
                      >
                        {fir.quantity.toLocaleString('it-IT')} {fir.unit || 'kg'}
                      </div>
                      <div className="lg:col-span-2 text-[13px] truncate" style={{ color: colors.textSecondary }}>
                        {fir.transporterName || '—'}
                      </div>
                      <div className="lg:col-span-2 text-[13px] truncate" style={{ color: colors.textSecondary }}>
                        {fir.destinationName || '—'}
                      </div>
                      <div className="lg:col-span-2">
                        <span
                          className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full"
                          style={{
                            backgroundColor: statusConfig.bg,
                            color: statusConfig.color,
                          }}
                        >
                          {statusConfig.label}
                        </span>
                      </div>
                      <div className="lg:col-span-1 flex justify-end">
                        <ChevronRight
                          className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: colors.textMuted }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
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
