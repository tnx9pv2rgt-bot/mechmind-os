'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { FileText, Filter, TrendingUp } from 'lucide-react';
import { PortalPageWrapper } from '@/components/portal';
import { InspectionList } from '@/components/portal';
import { CustomerInspection, Customer } from '@/lib/types/portal';

// ============================================
// MAIN COMPONENT
// ============================================

export default function PortalInspectionsPage() {
  const [filter, setFilter] = useState<'all' | 'completed' | 'approved'>('all');
  const [customer] = useState<Customer | null>(null);

  const {
    data: rawData,
    error: swrError,
    isLoading,
    mutate,
  } = useSWR<{ data: CustomerInspection[] }>('/api/portal/inspections', fetcher);

  const inspections = rawData?.data || [];
  const error = swrError
    ? swrError instanceof Error
      ? swrError.message
      : 'Errore nel caricamento delle ispezioni'
    : null;

  const filteredInspections = useMemo(() => {
    if (filter === 'all') return inspections;
    return inspections.filter(i => i.status === filter);
  }, [filter, inspections]);

  const averageScore =
    inspections.length > 0
      ? inspections.reduce((sum, i) => sum + i.score, 0) / inspections.length
      : 0;

  const router = useRouter();

  const handleDownloadPDF = (id: string) => {
    window.open(`/api/portal/inspections/${id}/pdf`, '_blank');
  };

  const handleViewPhotos = (id: string) => {
    router.push(`/portal/inspections/${id}#photos`);
  };

  const handleShare = (id: string) => {
    const url = `${window.location.origin}/portal/inspections/${id}`;
    navigator.clipboard.writeText(url);
  };

  const handleViewDetails = (id: string) => {
    router.push(`/portal/inspections/${id}`);
  };

  if (isLoading) {
    return (
      <PortalPageWrapper title='Ispezioni' customer={customer || undefined}>
        <div className='flex items-center justify-center h-64'>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className='w-8 h-8 border-2 border-[var(--brand)] border-t-transparent rounded-full'
          />
        </div>
      </PortalPageWrapper>
    );
  }

  if (error) {
    return (
      <PortalPageWrapper title='Ispezioni' customer={customer || undefined}>
        <div className='text-center py-16'>
          <p className='text-[var(--status-error)] mb-4'>{error}</p>
          <button
            onClick={() => mutate()}
            className='text-[var(--brand)] hover:underline'
          >
            Riprova
          </button>
        </div>
      </PortalPageWrapper>
    );
  }

  return (
    <PortalPageWrapper
      title='Report di Ispezione'
      subtitle='Visualizza e scarica i report delle ispezioni effettuate'
      customer={customer || undefined}
    >
      {/* Stats */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6'>
        <div className='p-4 bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] rounded-2xl shadow-apple'>
          <div className='flex items-center gap-3'>
            <div className='w-12 h-12 rounded-xl bg-[var(--status-info-subtle)] dark:bg-[var(--status-info-subtle)] flex items-center justify-center'>
              <FileText className='h-6 w-6 text-[var(--brand)]' />
            </div>
            <div>
              <p className='text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                {inspections.length}
              </p>
              <p className='text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Ispezioni totali</p>
            </div>
          </div>
        </div>
        <div className='p-4 bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] rounded-2xl shadow-apple'>
          <div className='flex items-center gap-3'>
            <div className='w-12 h-12 rounded-xl bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)] flex items-center justify-center'>
              <TrendingUp className='h-6 w-6 text-[var(--status-success)]' />
            </div>
            <div>
              <p className='text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                {averageScore.toFixed(1)}
              </p>
              <p className='text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Punteggio medio</p>
            </div>
          </div>
        </div>
        <div className='p-4 bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] rounded-2xl shadow-apple'>
          <div className='flex items-center gap-3'>
            <div className='w-12 h-12 rounded-xl bg-[var(--brand)]/5 dark:bg-[var(--brand)]/40/20 flex items-center justify-center'>
              <Filter className='h-6 w-6 text-[var(--brand)]' />
            </div>
            <div>
              <p className='text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                {inspections.filter(i => i.status === 'approved').length}
              </p>
              <p className='text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Approvate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className='flex items-center gap-3 mb-6'>
        <div className='flex items-center gap-2 p-1 bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] rounded-xl shadow-apple'>
          {(['all', 'completed', 'approved'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${
                  filter === f
                    ? 'bg-[var(--brand)] text-[var(--text-on-brand)] shadow-sm'
                    : 'text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)]'
                }
              `}
            >
              {f === 'all' && 'Tutte'}
              {f === 'completed' && 'Completate'}
              {f === 'approved' && 'Approvate'}
            </button>
          ))}
        </div>
      </div>

      {/* Inspections List */}
      <InspectionList
        inspections={filteredInspections}
        onDownloadPDF={handleDownloadPDF}
        onViewPhotos={handleViewPhotos}
        onShare={handleShare}
        onViewDetails={handleViewDetails}
      />
    </PortalPageWrapper>
  );
}
