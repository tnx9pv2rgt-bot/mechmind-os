'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ClaimsList } from '@/components/warranty';

interface WarrantyClaim {
  id: string;
  status: string;
  description: string;
  amount: number | null;
  submittedDate: string;
  warranty?: { vehicle?: { make: string; model: string } };
}

export default function ClaimsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [claims, setClaims] = React.useState<
    (WarrantyClaim & { warranty?: { vehicle?: { make: string; model: string } } })[]
  >([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/warranties/claims');
      const json = await res.json();
      setClaims(json.data || []);
    } catch (error) {
      toast({
        title: 'Errore nel caricamento dei reclami',
        description: error instanceof Error ? error.message : 'Errore sconosciuto',
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewClaim = (claim: WarrantyClaim) => {
    // Navigate to claim detail page for review
    router.push(`/dashboard/warranty/claims/${claim.id}?action=review`);
  };

  const handlePayClaim = async (claim: WarrantyClaim) => {
    try {
      const payRes = await fetch(`/api/warranties/claims/${claim.id}/pay`, { method: 'POST' });
      if (!payRes.ok) throw new Error('Errore nel pagamento');
      toast({
        title: 'Reclamo pagato',
        description: 'Il reclamo è stato contrassegnato come pagato',
      });
      loadClaims();
    } catch (error) {
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Errore sconosciuto',
        variant: 'error',
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
            claims={claims as never}
            showVehicle
            onClaimClick={claim => router.push(`/dashboard/warranty/claims/${claim.id}`)}
            onReviewClaim={handleReviewClaim as never}
            onPayClaim={handlePayClaim as never}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// Need to import cn
import { cn } from '@/lib/utils';
