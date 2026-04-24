'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { motion } from 'framer-motion';
import {
  FileText,
  Plus,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  DollarSign,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Pagination } from '@/components/ui/pagination';
import { ClaimsList } from '@/components/warranty';
import type { WarrantyClaim } from '@/lib/services/warrantyService';

type ClaimWithVehicle = WarrantyClaim & { warranty?: { vehicle?: { make: string; model: string } } };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const statsCardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
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

export default function ClaimsPage() {
  const router = useRouter();
  const [page, setPage] = React.useState(1);
  const PAGE_SIZE = 20;

  const {
    data: claimsData,
    error: claimsError,
    isLoading,
    mutate,
  } = useSWR<{
    data?: ClaimWithVehicle[];
  }>('/api/warranties/claims', fetcher);

  const claims = claimsData?.data || [];

  React.useEffect(() => {
    if (claimsError) {
      toast.error('Errore nel caricamento dei reclami', {
        description: claimsError instanceof Error ? claimsError.message : 'Errore sconosciuto',
      });
    }
  }, [claimsError]);

  const handleReviewClaim = (claim: ClaimWithVehicle) => {
    router.push(`/dashboard/warranty/claims/${claim.id}?action=review`);
  };

  const handlePayClaim = async (claim: ClaimWithVehicle) => {
    try {
      const payRes = await fetch(`/api/warranties/claims/${claim.id}/pay`, { method: 'POST' });
      if (!payRes.ok) throw new Error('Errore nel pagamento');
      toast.success('Reclamo contrassegnato come pagato');
      mutate();
    } catch (error) {
      toast.error('Errore', {
        description: error instanceof Error ? error.message : 'Errore sconosciuto',
      });
    }
  };

  const statCards = [
    {
      label: 'Totale Reclami',
      value: String(claims.length),
      icon: FileText,
      color: 'bg-[var(--brand)]',
    },
    {
      label: 'Inviati',
      value: String(claims.filter(c => c.status === 'SUBMITTED').length),
      icon: Send,
      color: 'bg-[var(--brand)]',
    },
    {
      label: 'In Revisione',
      value: String(claims.filter(c => c.status === 'UNDER_REVIEW').length),
      icon: Clock,
      color: 'bg-[var(--status-warning)]',
    },
    {
      label: 'Approvati',
      value: String(claims.filter(c => c.status === 'APPROVED').length),
      icon: CheckCircle,
      color: 'bg-[var(--status-success)]',
    },
    {
      label: 'Pagati',
      value: String(claims.filter(c => c.status === 'PAID').length),
      icon: DollarSign,
      color: 'bg-[var(--brand)]',
    },
  ];

  return (
    <div>
      {/* Header */}
      <header className=''>
        <div className='px-8 py-5 flex items-center justify-between'>
          <div>
            <h1 className='text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Reclami Garanzia</h1>
            <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1'>
              Gestisci e revisiona tutti i reclami
            </p>
          </div>
          <AppleButton
            icon={<Plus className='h-4 w-4' />}
            onClick={() => router.push('/dashboard/warranty')}
          >
            Nuovo Reclamo
          </AppleButton>
        </div>
      </header>

      <motion.div
        className='p-8 space-y-6'
        initial='hidden'
        animate='visible'
        variants={containerVariants}
      >
        {/* Stats */}
        <motion.div
          className='grid grid-cols-2 lg:grid-cols-5 gap-bento'
          variants={containerVariants}
        >
          {statCards.map(stat => (
            <motion.div key={stat.label} variants={statsCardVariants}>
              <AppleCard hover={false}>
                <AppleCardContent>
                  <div className='flex items-center justify-between mb-3'>
                    <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                      <stat.icon className='h-5 w-5 text-[var(--text-on-brand)]' />
                    </div>
                  </div>
                  <p className='text-title-1 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    {isLoading ? '...' : stat.value}
                  </p>
                  <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>{stat.label}</p>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Claims List */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <div className='flex items-center gap-3'>
                <FileText className='h-5 w-5 text-[var(--brand)]' />
                <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                  Tutti i Reclami
                </h2>
              </div>
            </AppleCardHeader>
            <AppleCardContent>
              {claimsError ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <AlertCircle className='h-12 w-12 text-[var(--status-error)]/40 mb-4' />
                  <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                    Impossibile caricare i reclami
                  </p>
                  <AppleButton variant='ghost' className='mt-4' onClick={() => mutate()}>
                    Riprova
                  </AppleButton>
                </div>
              ) : isLoading ? (
                <div className='flex items-center justify-center py-12'>
                  <Loader2 className='h-8 w-8 animate-spin text-[var(--brand)]' />
                </div>
              ) : claims.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <AlertCircle className='h-12 w-12 text-[var(--text-tertiary)]/40 mb-4' />
                  <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                    Nessun reclamo. Crea il primo reclamo.
                  </p>
                  <AppleButton
                    variant='ghost'
                    className='mt-4'
                    onClick={() => router.push('/dashboard/warranty')}
                  >
                    Crea il primo reclamo
                  </AppleButton>
                </div>
              ) : (
                <>
                  <ClaimsList
                    claims={claims.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)}
                    showVehicle
                    onClaimClick={claim => router.push(`/dashboard/warranty/claims/${claim.id}`)}
                    onReviewClaim={handleReviewClaim}
                    onPayClaim={handlePayClaim}
                  />
                  <Pagination page={page} totalPages={Math.ceil(claims.length / PAGE_SIZE)} onPageChange={setPage} />
                </>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
