'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { Shield, Plus } from 'lucide-react';
import { AppleButton } from '@/components/ui/apple-button';
import { PortalPageWrapper } from '@/components/portal';
import { WarrantyList, WarrantyStats } from '@/components/portal';
import { WarrantyInfo, Customer } from '@/lib/types/portal';

// ============================================
// MAIN COMPONENT
// ============================================

export default function PortalWarrantyPage() {
  const [customer] = useState<Customer | null>(null);

  const {
    data: rawData,
    error: swrError,
    isLoading,
    mutate,
  } = useSWR<{ data: WarrantyInfo[] }>('/api/portal/warranty', fetcher);

  const warranties = rawData?.data || [];
  const error = swrError
    ? swrError instanceof Error
      ? swrError.message
      : 'Errore nel caricamento delle garanzie'
    : null;

  const router = useRouter();

  const handleViewDetails = (id: string) => {
    router.push(`/portal/warranty/${id}`);
  };

  const handleFileClaim = (id: string) => {
    router.push(`/portal/warranty/${id}/claim`);
  };

  if (isLoading) {
    return (
      <PortalPageWrapper title='Garanzia' customer={customer || undefined}>
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
      <PortalPageWrapper title='Garanzia' customer={customer || undefined}>
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
      title='Garanzie e Polizze'
      subtitle='Gestisci le garanzie dei tuoi veicoli'
      customer={customer || undefined}
    >
      {/* Stats */}
      <div className='mb-6'>
        <WarrantyStats warranties={warranties} />
      </div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='mb-6 p-5 bg-gradient-to-r from-[var(--status-info)]/5 to-[var(--brand)]/5 dark:from-[var(--status-info)]/40/20 dark:to-[var(--brand)]/40/20 rounded-2xl border border-[var(--status-info)]/10 dark:border-[var(--status-info)]/50'
      >
        <div className='flex items-start gap-4'>
          <div className='w-12 h-12 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] flex items-center justify-center shadow-sm'>
            <Shield className='h-6 w-6 text-[var(--brand)]' />
          </div>
          <div className='flex-1'>
            <h3 className='font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1'>
              Copertura Garanzia
            </h3>
            <p className='text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
              Le garanzie coprono i difetti di fabbricazione e i guasti meccanici. Per i reclami,
              contattaci con il numero di polizza.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Warranties List */}
      <WarrantyList
        warranties={warranties}
        onViewDetails={handleViewDetails}
        onFileClaim={handleFileClaim}
      />
    </PortalPageWrapper>
  );
}
