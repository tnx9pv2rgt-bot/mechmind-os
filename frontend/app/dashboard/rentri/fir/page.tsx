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
import { AppleButton } from '@/components/ui/apple-button';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';

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
// Status Config
// =============================================================================
function getStatusConfig(status: string): { label: string; color: string; bg: string } {
  switch (status) {
    case 'DRAFT':
      return { label: 'Bozza', color: 'text-apple-dark dark:text-[var(--text-secondary)]', bg: 'bg-apple-light-gray dark:bg-[var(--surface-hover)]' };
    case 'VIDIMATED':
      return { label: 'Vidimato', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/40' };
    case 'IN_TRANSIT':
      return { label: 'In Transito', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-900/40' };
    case 'DELIVERED':
      return { label: 'Consegnato', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/40' };
    case 'CONFIRMED':
      return { label: 'Confermato', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/40' };
    case 'CANCELLED':
      return { label: 'Annullato', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/40' };
    default:
      return { label: status, color: 'text-apple-dark dark:text-[var(--text-secondary)]', bg: 'bg-apple-light-gray dark:bg-[var(--surface-hover)]' };
  }
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
    <div>
      {/* Header */}
      <header>
        <div className='px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <div>
            <Breadcrumb
              items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Rifiuti (RENTRI)', href: '/dashboard/rentri' },
                { label: 'FIR' },
              ]}
            />
            <h1 className='text-headline text-apple-dark dark:text-[var(--text-primary)]'>
              Formulari (FIR)
            </h1>
            <p className='text-apple-gray dark:text-[var(--text-secondary)] text-body mt-1'>
              Formulari di identificazione rifiuti per il trasporto
            </p>
          </div>
          <div className='flex items-center gap-3'>
            <AppleButton
              variant="primary"
              onClick={() => router.push('/dashboard/rentri/fir/new')}
              icon={<Plus className="h-4 w-4" />}
            >
              Nuovo FIR
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
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                Formulari
                {!isLoading && (
                  <span className="ml-2 text-apple-gray dark:text-[var(--text-secondary)]">
                    ({totalRecords})
                  </span>
                )}
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              {error ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-apple-red/40 mb-4" />
                  <p className="text-body text-apple-gray dark:text-[var(--text-secondary)]">
                    Impossibile caricare i formulari
                  </p>
                  <AppleButton variant="ghost" className="mt-4" onClick={() => mutate()}>
                    Riprova
                  </AppleButton>
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-apple-blue" />
                </div>
              ) : records.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-apple-gray/40 mb-4" />
                  <p className="text-body text-apple-gray dark:text-[var(--text-secondary)]">
                    Nessun formulario trovato
                  </p>
                  <AppleButton
                    variant="ghost"
                    className="mt-4"
                    onClick={() => router.push('/dashboard/rentri/fir/new')}
                  >
                    Crea il primo FIR
                  </AppleButton>
                </div>
              ) : (
                <motion.div
                  className="space-y-3"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {/* Table Header */}
                  <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]">
                    <div className="col-span-2">N. FIR</div>
                    <div className="col-span-1">Data</div>
                    <div className="col-span-1">CER</div>
                    <div className="col-span-1">Quantita</div>
                    <div className="col-span-2">Trasportatore</div>
                    <div className="col-span-2">Destinazione</div>
                    <div className="col-span-2">Stato</div>
                    <div className="col-span-1" />
                  </div>

                  {records.map((fir, index) => {
                    const statusCfg = getStatusConfig(fir.status);
                    return (
                      <motion.div
                        key={fir.id}
                        className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 p-4 rounded-2xl bg-apple-light-gray/30 dark:bg-[var(--surface-hover)] hover:bg-white dark:hover:bg-[var(--surface-active)] hover:shadow-apple transition-all duration-300 items-center cursor-pointer group"
                        variants={listItemVariants}
                        custom={index}
                        whileHover={{ scale: 1.005, x: 4 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => router.push(`/dashboard/rentri/fir/${fir.id}`)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') router.push(`/dashboard/rentri/fir/${fir.id}`);
                        }}
                      >
                        <div className="lg:col-span-2 text-body font-mono font-semibold text-apple-dark dark:text-[var(--text-primary)]">
                          {fir.firNumber}
                        </div>
                        <div className="lg:col-span-1 text-footnote text-apple-gray dark:text-[var(--text-secondary)]">
                          {new Date(fir.date).toLocaleDateString('it-IT')}
                        </div>
                        <div className="lg:col-span-1 text-body font-mono text-apple-dark dark:text-[var(--text-primary)]">
                          {fir.cerCode}
                        </div>
                        <div className="lg:col-span-1 text-body text-apple-dark dark:text-[var(--text-primary)] tabular-nums">
                          {fir.quantity.toLocaleString('it-IT')} {fir.unit || 'kg'}
                        </div>
                        <div className="lg:col-span-2 text-footnote truncate text-apple-gray dark:text-[var(--text-secondary)]">
                          {fir.transporterName || '—'}
                        </div>
                        <div className="lg:col-span-2 text-footnote truncate text-apple-gray dark:text-[var(--text-secondary)]">
                          {fir.destinationName || '—'}
                        </div>
                        <div className="lg:col-span-2">
                          <span
                            className={`text-footnote font-semibold px-2.5 py-1 rounded-full ${statusCfg.bg} ${statusCfg.color}`}
                          >
                            {statusCfg.label}
                          </span>
                        </div>
                        <div className="lg:col-span-1 flex justify-end">
                          <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-apple-gray dark:text-[var(--text-secondary)]" />
                        </div>
                      </motion.div>
                    );
                  })}

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
