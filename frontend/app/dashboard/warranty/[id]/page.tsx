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
import { toast } from 'sonner';
import { z } from 'zod';
import { ClaimForm, ClaimCard, RemainingCoverage } from '@/components/warranty';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { WarrantyWithClaims, WarrantyClaim } from '@/lib/services/warrantyService';
import { WarrantyStatus, ClaimStatus, WarrantyType } from '@/lib/services/warrantyService';

const fileClaimSchema = z.object({
  issueDescription: z.string().min(1, 'La descrizione del problema è obbligatoria'),
  estimatedCost: z.number().min(0, 'Il costo stimato non può essere negativo'),
  evidence: z.array(z.string()).optional(),
});

interface FileClaimDTO {
  issueDescription: string;
  estimatedCost: number;
  evidence?: string[];
}

type ClaimWithApproved = WarrantyClaim & { approvedAmount?: number };

const statusConfig: Partial<Record<WarrantyStatus, { label: string; color: string }>> = {
  ACTIVE: { label: 'Attiva', color: 'bg-green-100 text-green-800' },
  EXPIRING_SOON: { label: 'In Scadenza', color: 'bg-amber-100 text-amber-800' },
  EXPIRED: { label: 'Scaduta', color: 'bg-red-100 text-red-800' },
  VOID: { label: 'Annullata', color: 'bg-gray-100 text-gray-800' },
  PENDING: { label: 'In Attesa', color: 'bg-yellow-100 text-yellow-800' },
  CLAIMED: { label: 'Reclamata', color: 'bg-blue-100 text-blue-800' },
};

const typeConfig: Record<WarrantyType, { label: string }> = {
  MANUFACTURER: { label: 'Costruttore' },
  EXTENDED: { label: 'Estesa' },
  DEALER: { label: 'Concessionario' },
  AS_IS: { label: "Così com'è" },
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
  const warrantyId = params.id as string;

  const [warranty, setWarranty] = React.useState<(WarrantyWithClaims & { claims: ClaimWithApproved[] }) | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmittingClaim, setIsSubmittingClaim] = React.useState(false);
  const [claimDialogOpen, setClaimDialogOpen] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  React.useEffect(() => {
    loadWarranty();
  }, [warrantyId]);

  const loadWarranty = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/warranties/${warrantyId}`);
      if (!res.ok) {
        toast.error('Garanzia non trovata');
        router.push('/dashboard/warranty');
        return;
      }
      const json = await res.json();
      setWarranty(json.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Errore nel caricamento della garanzia');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileClaim = async (data: FileClaimDTO) => {
    const result = fileClaimSchema.safeParse(data);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    try {
      setIsSubmittingClaim(true);
      const claimRes = await fetch(`/api/warranties/${warrantyId}/claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!claimRes.ok) {
        const err = await claimRes.json();
        throw new Error(err.error || "Errore nell'invio del reclamo");
      }
      toast.success('Reclamo inviato con successo');
      setClaimDialogOpen(false);
      loadWarranty();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore nell'invio del reclamo");
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const handleDeleteWarranty = async () => {
    try {
      const delRes = await fetch(`/api/warranties/${warrantyId}`, { method: 'DELETE' });
      if (!delRes.ok) {
        const err = await delRes.json();
        throw new Error(err.error || "Errore nell'eliminazione della garanzia");
      }
      toast.success('Garanzia eliminata con successo');
      router.push('/dashboard/warranty');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore nell'eliminazione");
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
    label: 'Sconosciuto',
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
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Garanzie', href: '/dashboard/warranty' },
          { label: warranty.warrantyNumber },
        ]}
      />
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div className='flex items-center gap-4'>
          <Button
            variant='outline'
            size='icon'
            onClick={() => router.push('/dashboard/warranty')}
            aria-label='Torna alle garanzie'
          >
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-[#ececec]'>
              Garanzia {warranty.vehicle?.make} {warranty.vehicle?.model}
            </h1>
            <p className='text-sm text-gray-500 dark:text-[#636366]'>{type?.label || 'Garanzia'}</p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm'>
            <Edit2 className='h-4 w-4 mr-2' />
            Modifica
          </Button>
          <Button variant='destructive' size='sm' onClick={() => setDeleteConfirmOpen(true)}>
            <Trash2 className='h-4 w-4 mr-2' />
            Elimina
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
                    <CardTitle className='text-lg'>Stato Garanzia</CardTitle>
                    <Badge className={cn('mt-1', status.color)}>{status.label}</Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className='space-y-6'>
              {/* Progress */}
              <div className='space-y-2'>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-gray-600 dark:text-gray-500'>Periodo di Copertura</span>
                  <span className='font-medium text-gray-900 dark:text-[#ececec]'>
                    {progress}% trascorso
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
                        {daysRemaining > 0 ? `${daysRemaining} giorni rimanenti` : 'Scade oggi'}
                      </p>
                      <p className='text-sm text-gray-600 dark:text-gray-500'>
                        Scade il {formatDate(warranty.expirationDate)}
                      </p>
                    </div>
                  </div>
                )}

              {/* Details Grid */}
              <div className='grid grid-cols-2 gap-4'>
                <div className='bg-gray-50 dark:bg-[#353535] rounded-lg p-4'>
                  <div className='flex items-center gap-2 text-sm text-gray-600 dark:text-gray-500 mb-1'>
                    <Euro className='h-4 w-4' />
                    <span>Copertura Max</span>
                  </div>
                  <div className='text-xl font-bold text-gray-900 dark:text-[#ececec]'>
                    {formatCurrency(warranty.maxClaimAmount || 0)}
                  </div>
                </div>
                <div className='bg-gray-50 dark:bg-[#353535] rounded-lg p-4'>
                  <div className='flex items-center gap-2 text-sm text-gray-600 dark:text-gray-500 mb-1'>
                    <Euro className='h-4 w-4' />
                    <span>Franchigia</span>
                  </div>
                  <div className='text-xl font-bold text-gray-900 dark:text-[#ececec]'>
                    {formatCurrency(warranty.deductibleAmount || 0)}
                  </div>
                </div>
                <div className='bg-gray-50 dark:bg-[#353535] rounded-lg p-4'>
                  <div className='flex items-center gap-2 text-sm text-gray-600 dark:text-gray-500 mb-1'>
                    <Gauge className='h-4 w-4' />
                    <span>Copertura Km</span>
                  </div>
                  <div className='text-xl font-bold text-gray-900 dark:text-[#ececec]'>
                    {warranty.mileageLimit
                      ? `${warranty.mileageLimit.toLocaleString()} km`
                      : 'Illimitata'}
                  </div>
                </div>
                <div className='bg-gray-50 dark:bg-[#353535] rounded-lg p-4'>
                  <div className='flex items-center gap-2 text-sm text-gray-600 dark:text-gray-500 mb-1'>
                    <FileText className='h-4 w-4' />
                    <span>Reclami</span>
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
                Storico Reclami
              </CardTitle>
              {canFileClaim && (
                <Button size='sm' onClick={() => setClaimDialogOpen(true)}>
                  <Plus className='h-4 w-4 mr-2' />
                  Invia Reclamo
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Tabs defaultValue='all' className='space-y-4'>
                <TabsList>
                  <TabsTrigger value='all'>Tutti ({warranty.claims?.length || 0})</TabsTrigger>
                  <TabsTrigger value='pending'>In Attesa ({pendingClaims.length})</TabsTrigger>
                  <TabsTrigger value='approved'>Approvati ({approvedClaims.length})</TabsTrigger>
                  <TabsTrigger value='rejected'>Rifiutati ({rejectedClaims.length})</TabsTrigger>
                </TabsList>

                <TabsContent value='all' className='space-y-3'>
                  {warranty.claims?.length === 0 ? (
                    <div className='text-center py-8 text-gray-500'>
                      <FileText className='h-12 w-12 mx-auto mb-3 text-gray-300' />
                      <p>Nessun reclamo inviato</p>
                    </div>
                  ) : (
                    warranty.claims?.map(claim => (
                      <ClaimCard
                        key={claim.id}
                        claim={claim}
                        onClick={() => router.push(`/dashboard/warranty/claims/${claim.id}`)}
                      />
                    ))
                  )}
                </TabsContent>

                <TabsContent value='pending' className='space-y-3'>
                  {pendingClaims.length === 0 ? (
                    <div className='text-center py-8 text-gray-500'>
                      <CheckCircle2 className='h-12 w-12 mx-auto mb-3 text-gray-300' />
                      <p>Nessun reclamo in attesa</p>
                    </div>
                  ) : (
                    pendingClaims.map(claim => (
                      <ClaimCard
                        key={claim.id}
                        claim={claim}
                        onClick={() => router.push(`/dashboard/warranty/claims/${claim.id}`)}
                      />
                    ))
                  )}
                </TabsContent>

                <TabsContent value='approved' className='space-y-3'>
                  {approvedClaims.length === 0 ? (
                    <div className='text-center py-8 text-gray-500'>
                      <CheckCircle2 className='h-12 w-12 mx-auto mb-3 text-gray-300' />
                      <p>Nessun reclamo approvato</p>
                    </div>
                  ) : (
                    approvedClaims.map(claim => (
                      <ClaimCard
                        key={claim.id}
                        claim={claim}
                        onClick={() => router.push(`/dashboard/warranty/claims/${claim.id}`)}
                      />
                    ))
                  )}
                </TabsContent>

                <TabsContent value='rejected' className='space-y-3'>
                  {rejectedClaims.length === 0 ? (
                    <div className='text-center py-8 text-gray-500'>
                      <XCircle className='h-12 w-12 mx-auto mb-3 text-gray-300' />
                      <p>Nessun reclamo rifiutato</p>
                    </div>
                  ) : (
                    rejectedClaims.map(claim => (
                      <ClaimCard
                        key={claim.id}
                        claim={claim}
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
                <CardTitle className='text-lg'>Informazioni Veicolo</CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-500'>Marca</span>
                  <span className='font-medium'>{warranty.vehicle.make}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-500'>Modello</span>
                  <span className='font-medium'>{warranty.vehicle.model}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-500'>Anno</span>
                  <span className='font-medium'>{warranty.vehicle.year}</span>
                </div>
                <Separator />
                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-500'>VIN</span>
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
            <DialogTitle>Invia un Reclamo</DialogTitle>
            <DialogDescription>Invia un nuovo reclamo per questa garanzia</DialogDescription>
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

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title='Elimina garanzia'
        description='Sei sicuro di voler eliminare questa garanzia? Questa azione non può essere annullata.'
        confirmLabel='Elimina'
        variant='danger'
        onConfirm={handleDeleteWarranty}
      />
    </div>
  );
}
