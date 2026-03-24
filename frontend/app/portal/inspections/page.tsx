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
            className='w-8 h-8 border-2 border-apple-blue border-t-transparent rounded-full'
          />
        </div>
      </PortalPageWrapper>
    );
  }

  if (error) {
    return (
      <PortalPageWrapper title='Ispezioni' customer={customer || undefined}>
        <div className='text-center py-16'>
          <p className='text-apple-red mb-4'>{error}</p>
          <button
            onClick={() => mutate()}
            className='text-apple-blue hover:underline'
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
        <div className='p-4 bg-white dark:bg-[#2f2f2f] rounded-2xl shadow-apple'>
          <div className='flex items-center gap-3'>
            <div className='w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center'>
              <FileText className='h-6 w-6 text-apple-blue' />
            </div>
            <div>
              <p className='text-2xl font-bold text-apple-dark dark:text-[#ececec]'>
                {inspections.length}
              </p>
              <p className='text-sm text-apple-gray dark:text-[#636366]'>Ispezioni totali</p>
            </div>
          </div>
        </div>
        <div className='p-4 bg-white dark:bg-[#2f2f2f] rounded-2xl shadow-apple'>
          <div className='flex items-center gap-3'>
            <div className='w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center'>
              <TrendingUp className='h-6 w-6 text-apple-green' />
            </div>
            <div>
              <p className='text-2xl font-bold text-apple-dark dark:text-[#ececec]'>
                {averageScore.toFixed(1)}
              </p>
              <p className='text-sm text-apple-gray dark:text-[#636366]'>Punteggio medio</p>
            </div>
          </div>
        </div>
        <div className='p-4 bg-white dark:bg-[#2f2f2f] rounded-2xl shadow-apple'>
          <div className='flex items-center gap-3'>
            <div className='w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center'>
              <Filter className='h-6 w-6 text-apple-purple' />
            </div>
            <div>
              <p className='text-2xl font-bold text-apple-dark dark:text-[#ececec]'>
                {inspections.filter(i => i.status === 'approved').length}
              </p>
              <p className='text-sm text-apple-gray dark:text-[#636366]'>Approvate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className='flex items-center gap-3 mb-6'>
        <div className='flex items-center gap-2 p-1 bg-white dark:bg-[#2f2f2f] rounded-xl shadow-apple'>
          {(['all', 'completed', 'approved'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${
                  filter === f
                    ? 'bg-apple-blue text-white shadow-sm'
                    : 'text-apple-gray dark:text-[#636366] hover:text-apple-dark dark:hover:text-[#ececec]'
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
