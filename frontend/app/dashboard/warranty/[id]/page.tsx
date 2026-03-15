'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Shield,
  Calendar,
  Edit2,
  Trash2,
  Plus,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Euro,
  Gauge,
} from 'lucide-react';

import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { ClaimForm, ClaimCard, RemainingCoverage } from '@/components/warranty';

// Types defined locally to avoid importing Prisma client-side
enum WarrantyStatus {
  ACTIVE = 'ACTIVE',
  EXPIRING_SOON = 'EXPIRING_SOON',
  EXPIRED = 'EXPIRED',
  VOID = 'VOID',
  PENDING = 'PENDING',
  CLAIMED = 'CLAIMED',
}

enum WarrantyType {
  MANUFACTURER = 'MANUFACTURER',
  EXTENDED = 'EXTENDED',
  DEALER = 'DEALER',
  AS_IS = 'AS_IS',
}

enum ClaimStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
}

interface WarrantyWithClaims {
  id: string;
  tenantId: string;
  warrantyNumber: string;
  vehicleId: string;
  coverageType: string;
  startDate: string;
  expirationDate: string;
  status: WarrantyStatus;
  mileageLimit: number | null;
  maxClaimAmount: number | null;
  deductibleAmount: number | null;
  createdAt: string;
  updatedAt: string;
  claims: Array<{
    id: string;
    status: string;
    description: string;
    amount: number | null;
    approvedAmount?: number;
  }>;
  vehicle?: { id: string; vin: string; make: string; model: string; year: number };
}

interface FileClaimDTO {
  issueDescription: string;
  estimatedCost: number;
  evidence?: string[];
}

const statusConfig: Partial<Record<WarrantyStatus, { label: string; color: string }>> = {
  ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-800' },
  EXPIRING_SOON: { label: 'Expiring Soon', color: 'bg-amber-100 text-amber-800' },
  EXPIRED: { label: 'Expired', color: 'bg-red-100 text-red-800' },
  VOID: { label: 'Void', color: 'bg-gray-100 text-gray-800' },
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  CLAIMED: { label: 'Claimed', color: 'bg-blue-100 text-blue-800' },
};

const typeConfig: Record<WarrantyType, { label: string }> = {
  MANUFACTURER: { label: 'Manufacturer' },
  EXTENDED: { label: 'Extended' },
  DEALER: { label: 'Dealer' },
  AS_IS: { label: 'As-Is' },
};

function calculateProgress(startDate: Date | string, expirationDate: Date | string): number {
  const start = new Date(startDate).getTime();
  const end = new Date(expirationDate).getTime();
  const now = new Date().getTime();

  if (now >= end) return 100;
  if (now <= start) return 0;

  const total = end - start;
  const elapsed = now - start;
  return Math.round((elapsed / total) * 100);
}

function calculateDaysRemaining(expirationDate: Date | string): number {
  const now = new Date().getTime();
  const expiry = new Date(expirationDate).getTime();
  const diff = expiry - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function WarrantyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const warrantyId = params.id as string;

  const [warranty, setWarranty] = React.useState<WarrantyWithClaims | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmittingClaim, setIsSubmittingClaim] = React.useState(false);
  const [claimDialogOpen, setClaimDialogOpen] = React.useState(false);

  React.useEffect(() => {
    loadWarranty();
  }, [warrantyId]);

  const loadWarranty = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/warranties/${warrantyId}`);
      if (!res.ok) {
        toast({
          title: 'Warranty not found',
          description: 'The requested warranty could not be found',
          variant: 'error',
        });
        router.push('/dashboard/warranty');
        return;
      }
      const json = await res.json();
      setWarranty(json.data);
    } catch (error) {
      toast({
        title: 'Error loading warranty',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileClaim = async (data: FileClaimDTO) => {
    try {
      setIsSubmittingClaim(true);
      const claimRes = await fetch(`/api/warranties/${warrantyId}/claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!claimRes.ok) {
        const err = await claimRes.json();
        throw new Error(err.error || 'Failed to file claim');
      }
      toast({
        title: 'Claim filed',
        description: 'Your warranty claim has been submitted for review',
      });
      setClaimDialogOpen(false);
      loadWarranty();
    } catch (error) {
      toast({
        title: 'Error filing claim',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'error',
      });
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const handleDeleteWarranty = async () => {
    if (!confirm('Are you sure you want to delete this warranty? This action cannot be undone.')) {
      return;
    }

    try {
      const delRes = await fetch(`/api/warranties/${warrantyId}`, { method: 'DELETE' });
      if (!delRes.ok) {
        const err = await delRes.json();
        throw new Error(err.error || 'Failed to delete warranty');
      }
      toast({
        title: 'Warranty deleted',
        description: 'The warranty has been deleted successfully',
      });
      router.push('/dashboard/warranty');
    } catch (error) {
      toast({
        title: 'Error deleting warranty',
        description: error instanceof Error ? error.message : 'Unknown error',
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

  if (!warranty) {
    return null;
  }

  const status = statusConfig[warranty.status as WarrantyStatus] || {
    label: 'Unknown',
    color: 'bg-gray-100 text-gray-800',
  };
  const type = typeConfig[(warranty.coverageType as WarrantyType) || WarrantyType.MANUFACTURER];
  const progress = calculateProgress(warranty.startDate, warranty.expirationDate);
  const daysRemaining = calculateDaysRemaining(warranty.expirationDate);

  const totalClaimed = warranty.claims?.reduce((sum, c) => sum + (c.approvedAmount || 0), 0) || 0;
  const remainingCoverage = (warranty.maxClaimAmount || 0) - totalClaimed;

  const pendingClaims =
    warranty.claims?.filter(
      c => c.status === ClaimStatus.SUBMITTED || c.status === ClaimStatus.UNDER_REVIEW
    ) || [];
  const approvedClaims =
    warranty.claims?.filter(
      c => c.status === ClaimStatus.APPROVED || c.status === ClaimStatus.PAID
    ) || [];
  const rejectedClaims = warranty.claims?.filter(c => c.status === ClaimStatus.REJECTED) || [];

  const canFileClaim =
    warranty.status !== WarrantyStatus.EXPIRED && warranty.status !== WarrantyStatus.VOID;

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div className='flex items-center gap-4'>
          <Button variant='outline' size='icon' onClick={() => router.push('/dashboard/warranty')}>
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-[#ececec]'>
              {warranty.vehicle?.make} {warranty.vehicle?.model} Warranty
            </h1>
            <p className='text-sm text-gray-500 dark:text-[#636366]'>{type?.label || 'Warranty'}</p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm'>
            <Edit2 className='h-4 w-4 mr-2' />
            Edit
          </Button>
          <Button variant='destructive' size='sm' onClick={handleDeleteWarranty}>
            <Trash2 className='h-4 w-4 mr-2' />
            Delete
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Left Column */}
        <div className='lg:col-span-2 space-y-6'>
          {/* Status Card */}
          <Card>
            <CardHeader>
              <div className='flex items-start justify-between'>
                <div className='flex items-center gap-3'>
                  <div
                    className={cn(
                      'p-3 rounded-lg',
                      status.color.replace('text-', 'bg-').replace('800', '100')
                    )}
                  >
                    <Shield className={cn('h-6 w-6', status.color.split(' ')[1])} />
                  </div>
                  <div>
                    <CardTitle className='text-lg'>Warranty Status</CardTitle>
                    <Badge className={cn('mt-1', status.color)}>{status.label}</Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className='space-y-6'>
              {/* Progress */}
              <div className='space-y-2'>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-gray-600 dark:text-gray-400'>Coverage Period</span>
                  <span className='font-medium text-gray-900 dark:text-[#ececec]'>
                    {progress}% elapsed
                  </span>
                </div>
                <Progress value={progress} className='h-2' />
                <div className='flex items-center justify-between text-xs text-gray-500'>
                  <span>{formatDate(warranty.startDate)}</span>
                  <span>{formatDate(warranty.expirationDate)}</span>
                </div>
              </div>

              {/* Days Remaining */}
              {warranty.status !== WarrantyStatus.EXPIRED &&
                warranty.status !== WarrantyStatus.VOID && (
                  <div
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-lg',
                      daysRemaining <= 30
                        ? 'bg-red-50 dark:bg-red-900/20'
                        : daysRemaining <= 60
                          ? 'bg-amber-50 dark:bg-amber-900/20'
                          : 'bg-green-50 dark:bg-green-900/20'
                    )}
                  >
                    <Calendar
                      className={cn(
                        'h-5 w-5',
                        daysRemaining <= 30
                          ? 'text-red-600'
                          : daysRemaining <= 60
                            ? 'text-amber-600'
                            : 'text-green-600'
                      )}
                    />
                    <div>
                      <p
                        className={cn(
                          'font-medium',
                          daysRemaining <= 30
                            ? 'text-red-800 dark:text-red-300'
                            : daysRemaining <= 60
                              ? 'text-amber-800 dark:text-amber-300'
                              : 'text-green-800 dark:text-green-300'
                        )}
                      >
                        {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Expires today'}
                      </p>
                      <p className='text-sm text-gray-600 dark:text-gray-400'>
                        Expires on {formatDate(warranty.expirationDate)}
                      </p>
                    </div>
                  </div>
                )}

              {/* Details Grid */}
              <div className='grid grid-cols-2 gap-4'>
                <div className='bg-gray-50 dark:bg-[#353535] rounded-lg p-4'>
                  <div className='flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1'>
                    <Euro className='h-4 w-4' />
                    <span>Max Coverage</span>
                  </div>
                  <div className='text-xl font-bold text-gray-900 dark:text-[#ececec]'>
                    {formatCurrency(warranty.maxClaimAmount || 0)}
                  </div>
                </div>
                <div className='bg-gray-50 dark:bg-[#353535] rounded-lg p-4'>
                  <div className='flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1'>
                    <Euro className='h-4 w-4' />
                    <span>Deductible</span>
                  </div>
                  <div className='text-xl font-bold text-gray-900 dark:text-[#ececec]'>
                    {formatCurrency(warranty.deductibleAmount || 0)}
                  </div>
                </div>
                <div className='bg-gray-50 dark:bg-[#353535] rounded-lg p-4'>
                  <div className='flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1'>
                    <Gauge className='h-4 w-4' />
                    <span>Coverage</span>
                  </div>
                  <div className='text-xl font-bold text-gray-900 dark:text-[#ececec]'>
                    {warranty.mileageLimit
                      ? `${warranty.mileageLimit.toLocaleString()} km`
                      : 'Unlimited'}
                  </div>
                </div>
                <div className='bg-gray-50 dark:bg-[#353535] rounded-lg p-4'>
                  <div className='flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1'>
                    <FileText className='h-4 w-4' />
                    <span>Claims</span>
                  </div>
                  <div className='text-xl font-bold text-gray-900 dark:text-[#ececec]'>
                    {warranty.claims?.length || 0}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Claims Section */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between'>
              <CardTitle className='text-lg flex items-center gap-2'>
                <FileText className='h-5 w-5' />
                Claims History
              </CardTitle>
              {canFileClaim && (
                <Button size='sm' onClick={() => setClaimDialogOpen(true)}>
                  <Plus className='h-4 w-4 mr-2' />
                  File Claim
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Tabs defaultValue='all' className='space-y-4'>
                <TabsList>
                  <TabsTrigger value='all'>All ({warranty.claims?.length || 0})</TabsTrigger>
                  <TabsTrigger value='pending'>Pending ({pendingClaims.length})</TabsTrigger>
                  <TabsTrigger value='approved'>Approved ({approvedClaims.length})</TabsTrigger>
                  <TabsTrigger value='rejected'>Rejected ({rejectedClaims.length})</TabsTrigger>
                </TabsList>

                <TabsContent value='all' className='space-y-3'>
                  {warranty.claims?.length === 0 ? (
                    <div className='text-center py-8 text-gray-500'>
                      <FileText className='h-12 w-12 mx-auto mb-3 text-gray-300' />
                      <p>No claims filed yet</p>
                    </div>
                  ) : (
                    warranty.claims?.map(claim => (
                      <ClaimCard
                        key={claim.id}
                        claim={claim as never}
                        onClick={() => router.push(`/dashboard/warranty/claims/${claim.id}`)}
                      />
                    ))
                  )}
                </TabsContent>

                <TabsContent value='pending' className='space-y-3'>
                  {pendingClaims.length === 0 ? (
                    <div className='text-center py-8 text-gray-500'>
                      <CheckCircle2 className='h-12 w-12 mx-auto mb-3 text-gray-300' />
                      <p>No pending claims</p>
                    </div>
                  ) : (
                    pendingClaims.map(claim => (
                      <ClaimCard
                        key={claim.id}
                        claim={claim as never}
                        onClick={() => router.push(`/dashboard/warranty/claims/${claim.id}`)}
                      />
                    ))
                  )}
                </TabsContent>

                <TabsContent value='approved' className='space-y-3'>
                  {approvedClaims.length === 0 ? (
                    <div className='text-center py-8 text-gray-500'>
                      <CheckCircle2 className='h-12 w-12 mx-auto mb-3 text-gray-300' />
                      <p>No approved claims</p>
                    </div>
                  ) : (
                    approvedClaims.map(claim => (
                      <ClaimCard
                        key={claim.id}
                        claim={claim as never}
                        onClick={() => router.push(`/dashboard/warranty/claims/${claim.id}`)}
                      />
                    ))
                  )}
                </TabsContent>

                <TabsContent value='rejected' className='space-y-3'>
                  {rejectedClaims.length === 0 ? (
                    <div className='text-center py-8 text-gray-500'>
                      <XCircle className='h-12 w-12 mx-auto mb-3 text-gray-300' />
                      <p>No rejected claims</p>
                    </div>
                  ) : (
                    rejectedClaims.map(claim => (
                      <ClaimCard
                        key={claim.id}
                        claim={claim as never}
                        onClick={() => router.push(`/dashboard/warranty/claims/${claim.id}`)}
                      />
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className='space-y-6'>
          {/* Remaining Coverage */}
          <RemainingCoverage
            maxCoverage={warranty.maxClaimAmount || 0}
            usedCoverage={totalClaimed}
            coverageKm={warranty.mileageLimit}
            currentKm={0}
            startKm={0}
          />

          {/* Vehicle Info */}
          {warranty.vehicle && (
            <Card>
              <CardHeader>
                <CardTitle className='text-lg'>Vehicle Information</CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>Make</span>
                  <span className='font-medium'>{warranty.vehicle.make}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>Model</span>
                  <span className='font-medium'>{warranty.vehicle.model}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>Year</span>
                  <span className='font-medium'>{warranty.vehicle.year}</span>
                </div>
                <Separator />
                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>VIN</span>
                  <span className='font-medium font-mono text-sm'>{warranty.vehicle.vin}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* File Claim Dialog */}
      <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
        <DialogContent className='max-w-lg max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>File a Warranty Claim</DialogTitle>
            <DialogDescription>Submit a new claim for this warranty</DialogDescription>
          </DialogHeader>
          <ClaimForm
            warrantyId={warrantyId}
            maxClaimAmount={remainingCoverage}
            deductible={warranty.deductibleAmount || 0}
            onSubmit={handleFileClaim}
            onCancel={() => setClaimDialogOpen(false)}
            isLoading={isSubmittingClaim}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
