'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';

interface EstimateLine {
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  tier: string;
}

interface PortalEstimate {
  id: string;
  estimateNumber: string;
  status: string;
  totalCents: number;
  subtotalCents: number;
  vatCents: number;
  discountCents: number;
  validUntil: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  notes: string | null;
  createdAt: string;
  lines: EstimateLine[];
}

interface BackendEstimateResponse {
  success: boolean;
  data?: PortalEstimate[];
}

const statusConfig: Record<string, { color: string; label: string }> = {
  DRAFT: { color: 'bg-[var(--text-placeholder)]', label: 'Bozza' },
  SENT: { color: 'bg-[#60a5fa]', label: 'Inviato' },
  PARTIALLY_APPROVED: { color: 'bg-[#fbbf24]', label: 'Parzialmente approvato' },
  ACCEPTED: { color: 'bg-[#34d399]', label: 'Accettato' },
  REJECTED: { color: 'bg-[#f87171]', label: 'Rifiutato' },
  EXPIRED: { color: 'bg-[var(--text-placeholder)]', label: 'Scaduto' },
  CONVERTED: { color: 'bg-[#34d399]', label: 'Convertito' },
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PortalEstimatesPage(): React.ReactElement {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const {
    data: rawData,
    error: estimatesError,
    isLoading,
    mutate,
  } = useSWR<BackendEstimateResponse>('/api/portal/estimates', fetcher);
  const estimates = rawData?.data || [];

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-bold text-white'>Preventivi</h1>
        </div>
        <div className='flex items-center justify-center h-64'>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className='w-8 h-8 border-2 border-white border-t-transparent rounded-full'
          />
        </div>
      </div>
    );
  }

  if (estimatesError) {
    return (
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-bold text-white'>Preventivi</h1>
        </div>
        <div className='text-center py-16'>
          <div className='h-12 w-12 rounded-full bg-[#f87171]/10 flex items-center justify-center mx-auto mb-4'>
            <span className='text-[#f87171]/40 text-xl font-bold'>!</span>
          </div>
          <p className='text-[var(--text-tertiary)] mb-4'>Impossibile caricare i preventivi</p>
          <button onClick={() => mutate()} className='text-[#60a5fa] hover:underline'>
            Riprova
          </button>
        </div>
      </div>
    );
  }

  const paginatedEstimates = estimates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold text-white'>Preventivi</h1>
        <p className='text-[var(--text-tertiary)] mt-1'>Visualizza i tuoi preventivi</p>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <div className='bg-[var(--surface-elevated)] border border-[var(--border-strong)] rounded-2xl'>
          <div className='p-5 flex items-center gap-4'>
            <div className='w-12 h-12 rounded-2xl bg-[#60a5fa] flex items-center justify-center text-white font-bold text-lg'>
              PR
            </div>
            <div>
              <p className='font-semibold text-white'>{estimates.length}</p>
              <p className='text-sm text-[var(--text-tertiary)]'>Totale Preventivi</p>
            </div>
          </div>
        </div>
        <div className='bg-[var(--surface-elevated)] border border-[var(--border-strong)] rounded-2xl'>
          <div className='p-5 flex items-center gap-4'>
            <div className='w-12 h-12 rounded-2xl bg-[#34d399] flex items-center justify-center text-white font-bold text-lg'>
              OK
            </div>
            <div>
              <p className='font-semibold text-white'>
                {estimates.filter((e) => e.status === 'ACCEPTED' || e.status === 'CONVERTED').length}
              </p>
              <p className='text-sm text-[var(--text-tertiary)]'>Accettati</p>
            </div>
          </div>
        </div>
        <div className='bg-[var(--surface-elevated)] border border-[var(--border-strong)] rounded-2xl'>
          <div className='p-5 flex items-center gap-4'>
            <div className='w-12 h-12 rounded-2xl bg-[#fbbf24] flex items-center justify-center text-white font-bold text-lg'>
              AT
            </div>
            <div>
              <p className='font-semibold text-white'>
                {estimates.filter((e) => e.status === 'SENT').length}
              </p>
              <p className='text-sm text-[var(--text-tertiary)]'>In Attesa</p>
            </div>
          </div>
        </div>
      </div>

      {/* Estimates List */}
      <div className='bg-[var(--surface-elevated)] border border-[var(--border-strong)] rounded-2xl'>
        <div className='px-5 pt-5 pb-3'>
          <h2 className='text-lg font-semibold text-white'>Tutti i preventivi</h2>
        </div>
        <div className='p-5'>
          {estimates.length === 0 ? (
            <div className='text-center py-12'>
              <div className='h-12 w-12 rounded-full bg-[var(--surface-active)] flex items-center justify-center mx-auto mb-4'>
                <span className='text-[var(--text-tertiary)] text-xl font-bold'>PR</span>
              </div>
              <h3 className='text-lg font-medium text-white mb-2'>Nessun preventivo disponibile</h3>
              <p className='text-[var(--text-tertiary)]'>
                Quando riceverai dei preventivi, li troverai qui.
              </p>
            </div>
          ) : (
            <div className='space-y-3'>
              {paginatedEstimates.map((estimate) => {
                const status = statusConfig[estimate.status] || statusConfig.DRAFT;

                return (
                  <motion.div
                    key={estimate.id}
                    className='flex items-center justify-between p-4 rounded-2xl bg-[var(--surface-elevated)] hover:bg-[var(--surface-active)] transition-all cursor-pointer min-h-[44px]'
                    whileHover={{ scale: 1.01 }}
                    onClick={() => router.push(`/portal/estimates/${estimate.id}`)}
                  >
                    <div className='flex items-center gap-4'>
                      <div className='w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center'>
                        <span className='text-xs font-bold text-[#60a5fa]'>PR</span>
                      </div>
                      <div>
                        <p className='font-semibold text-white'>{estimate.estimateNumber}</p>
                        <p className='text-sm text-[var(--text-tertiary)]'>
                          {estimate.createdAt ? formatDate(estimate.createdAt) : ''}
                          {estimate.validUntil && (
                            <span>
                              {' '}
                              — Valido fino al {formatDate(estimate.validUntil)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className='flex items-center gap-4'>
                      <Badge className={`${status.color} text-white text-xs`}>{status.label}</Badge>
                      <p className='font-semibold text-white min-w-[80px] text-right'>
                        {formatCurrency(estimate.totalCents)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
          <Pagination
            page={page}
            totalPages={Math.ceil(estimates.length / PAGE_SIZE)}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}
