'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { ClaimsList } from '@/components/warranty';
import type { WarrantyClaim } from '@/lib/services/warrantyService';

type ClaimWithVehicle = WarrantyClaim & { warranty?: { vehicle?: { make: string; model: string } } };

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
    // Navigate to claim detail page for review
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

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-96'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600' />
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-[#ececec]'>Reclami Garanzia</h1>
          <p className='text-sm text-gray-500 dark:text-[#636366] mt-1'>
            Gestisci e revisiona tutti i reclami
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/warranty')}>
          <Plus className='h-4 w-4 mr-2' />
          Nuovo Reclamo
        </Button>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-2 lg:grid-cols-5 gap-4'>
        {[
          {
            label: 'Totale Reclami',
            count: claims.length,
            color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
          },
          {
            label: 'Inviati',
            count: claims.filter(c => c.status === 'SUBMITTED').length,
            color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
          },
          {
            label: 'In Revisione',
            count: claims.filter(c => c.status === 'UNDER_REVIEW').length,
            color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
          },
          {
            label: 'Approvati',
            count: claims.filter(c => c.status === 'APPROVED').length,
            color: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
          },
          {
            label: 'Pagati',
            count: claims.filter(c => c.status === 'PAID').length,
            color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
          },
        ].map(stat => (
          <Card key={stat.label}>
            <CardHeader className='pb-2'>
              <CardTitle className='text-xs font-medium text-gray-600 dark:text-[#636366]'>
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn('text-2xl font-bold', stat.color.split(' ')[1])}>{stat.count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Claims List */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <FileText className='h-5 w-5' />
            Tutti i Reclami
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ClaimsList
            claims={claims.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)}
            showVehicle
            onClaimClick={claim => router.push(`/dashboard/warranty/claims/${claim.id}`)}
            onReviewClaim={handleReviewClaim}
            onPayClaim={handlePayClaim}
          />
          <Pagination page={page} totalPages={Math.ceil(claims.length / PAGE_SIZE)} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  );
}

// Need to import cn
import { cn } from '@/lib/utils';
