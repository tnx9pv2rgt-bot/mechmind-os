'use client';

import * as React from 'react';
import {
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  DollarSign,
  FileText,
  Upload,
  QrCode,
  ExternalLink,
  Plus,
  Calendar,
  Bell,
  Settings,
  ChevronRight,
  Wallet,
  Activity,
} from 'lucide-react';

import { cn, formatCurrency, formatDate } from '@/lib/utils';
import {
  Warranty,
  WarrantyClaim,
  WarrantyWithClaims,
  ClaimStatus,
  WarrantyType,
  FileClaimDTO,
  getWarranty,
  getWarrantyClaims,
  getExpiringWarranties,
  createWarrantyClaim,
  updateWarrantyAlerts,
} from '@/lib/services/warrantyService';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';

// =============================================================================
// Types & Interfaces
// =============================================================================

interface WarrantyDashboardProps {
  warrantyId: string;
  inspectionId: string;
}

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate countdown time from expiration date
 */
function calculateCountdown(expirationDate: string): CountdownTime {
  const now = new Date().getTime();
  const expiry = new Date(expirationDate).getTime();
  const distance = expiry - now;

  if (distance < 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
    hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((distance % (1000 * 60)) / 1000),
  };
}

/**
 * Calculate progress percentage for warranty duration
 */
function calculateProgress(startDate: string, expirationDate: string): number {
  const start = new Date(startDate).getTime();
  const end = new Date(expirationDate).getTime();
  const now = new Date().getTime();

  if (now >= end) return 100;
  if (now <= start) return 0;

  const total = end - start;
  const elapsed = now - start;
  return Math.round((elapsed / total) * 100);
}

/**
 * Determine warranty status based on days remaining
 */
function getWarrantyStatus(
  daysRemaining: number,
  warrantyStatus: string
): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  color: string;
} {
  if (warrantyStatus === 'VOID') {
    return { label: 'Annullata', variant: 'destructive', color: 'text-[var(--status-error)] bg-[var(--status-error-subtle)]' };
  }
  if (daysRemaining <= 0) {
    return { label: 'Scaduta', variant: 'destructive', color: 'text-[var(--status-error)] bg-[var(--status-error-subtle)]' };
  }
  if (daysRemaining <= 30) {
    return {
      label: 'In Scadenza',
      variant: 'outline',
      color: 'text-[var(--status-warning)] bg-[var(--status-warning)]/5 border-[var(--status-warning)]/20',
    };
  }
  return { label: 'Attiva', variant: 'default', color: 'text-[var(--status-success)] bg-[var(--status-success-subtle)]' };
}

/**
 * Get claim status styling
 */
function getClaimStatusConfig(status: ClaimStatus): {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
} {
  const configs: Record<
    string,
    { label: string; icon: React.ReactNode; color: string; bgColor: string }
  > = {
    SUBMITTED: {
      label: 'Submitted',
      icon: <FileText className='h-4 w-4' />,
      color: 'text-[var(--status-info)]',
      bgColor: 'bg-[var(--status-info-subtle)] border-[var(--status-info)]/30',
    },
    UNDER_REVIEW: {
      label: 'Under Review',
      icon: <Clock className='h-4 w-4' />,
      color: 'text-[var(--status-warning)]',
      bgColor: 'bg-[var(--status-warning)]/5 border-[var(--status-warning)]/30',
    },
    APPROVED: {
      label: 'Approved',
      icon: <CheckCircle2 className='h-4 w-4' />,
      color: 'text-[var(--status-success)]',
      bgColor: 'bg-[var(--status-success-subtle)] border-[var(--status-success)]/30',
    },
    REJECTED: {
      label: 'Rejected',
      icon: <XCircle className='h-4 w-4' />,
      color: 'text-[var(--status-error)]',
      bgColor: 'bg-[var(--status-error-subtle)] border-[var(--status-error)]/30',
    },
    PAID: {
      label: 'Paid',
      icon: <DollarSign className='h-4 w-4' />,
      color: 'text-[var(--status-info)]',
      bgColor: 'bg-[var(--status-info-subtle)] border-[var(--status-info)]/30',
    },
  };
  return configs[status] || configs.SUBMITTED;
}

/**
 * Get warranty type display info
 */
function getWarrantyTypeInfo(type: string): { label: string; description: string; color: string } {
  const types: Record<string, { label: string; description: string; color: string }> = {
    MANUFACTURER: {
      label: 'Manufacturer',
      description: 'Original equipment manufacturer warranty',
      color: 'bg-[var(--brand)]/10 text-[var(--brand)]',
    },
    EXTENDED: {
      label: 'Extended',
      description: 'Extended coverage beyond manufacturer warranty',
      color: 'bg-[var(--status-info-subtle)] text-[var(--status-info)]',
    },
    DEALER: {
      label: 'Dealer',
      description: 'Dealer-provided warranty coverage',
      color: 'bg-[var(--status-success)]/10 text-[var(--status-success)]',
    },
    AS_IS: {
      label: 'As-Is',
      description: 'No warranty - vehicle sold as-is',
      color: 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]',
    },
  };
  return types[type] || types.AS_IS;
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Countdown Timer Component
 */
function CountdownTimer({ expirationDate }: { expirationDate: string }) {
  const [timeLeft, setTimeLeft] = React.useState<CountdownTime>(() =>
    calculateCountdown(expirationDate)
  );

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateCountdown(expirationDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [expirationDate]);

  const isExpired =
    timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  if (isExpired) {
    return (
      <div className='text-center'>
        <div className='text-4xl font-bold text-[var(--status-error)]'>Scaduta</div>
        <p className='text-sm text-[var(--text-tertiary)] mt-1'>La copertura della garanzia &egrave; terminata</p>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-4 gap-2 text-center'>
      <div className='bg-[var(--surface-secondary)] rounded-lg p-3'>
        <div className='text-2xl font-bold text-[var(--text-primary)]'>{timeLeft.days}</div>
        <div className='text-xs text-[var(--text-tertiary)] uppercase tracking-wide'>Days</div>
      </div>
      <div className='bg-[var(--surface-secondary)] rounded-lg p-3'>
        <div className='text-2xl font-bold text-[var(--text-primary)]'>
          {String(timeLeft.hours).padStart(2, '0')}
        </div>
        <div className='text-xs text-[var(--text-tertiary)] uppercase tracking-wide'>Hours</div>
      </div>
      <div className='bg-[var(--surface-secondary)] rounded-lg p-3'>
        <div className='text-2xl font-bold text-[var(--text-primary)]'>
          {String(timeLeft.minutes).padStart(2, '0')}
        </div>
        <div className='text-xs text-[var(--text-tertiary)] uppercase tracking-wide'>Mins</div>
      </div>
      <div className='bg-[var(--surface-secondary)] rounded-lg p-3'>
        <div className='text-2xl font-bold text-[var(--text-primary)]'>
          {String(timeLeft.seconds).padStart(2, '0')}
        </div>
        <div className='text-xs text-[var(--text-tertiary)] uppercase tracking-wide'>Secs</div>
      </div>
    </div>
  );
}

/**
 * New Claim Form Component
 */
function NewClaimForm({
  warrantyId,
  onSubmit,
  onCancel,
}: {
  warrantyId: string;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState<FileClaimDTO>({
    issueDescription: '',
    estimatedCost: 0,
    evidence: [],
  });
  const [uploadedFiles, setUploadedFiles] = React.useState<string[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Simulate file upload - in production, this would upload to a storage service
    const newFiles = Array.from(files).map(file => URL.createObjectURL(file));
    setUploadedFiles(prev => [...prev, ...newFiles]);
    setFormData(prev => ({
      ...prev,
      evidence: [...(prev.evidence || []), ...newFiles],
    }));

    toast({
      title: 'File caricati',
      description: `${files.length} file pronti per l'invio`,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createWarrantyClaim(warrantyId, formData);
      toast({
        title: 'Reclamo inviato',
        description: 'Il tuo reclamo in garanzia è stato inviato per la revisione',
      });
      onSubmit();
    } catch (error) {
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : "Errore nell'invio del reclamo",
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div className='space-y-2'>
        <label htmlFor='claimAmount' className='text-sm font-medium text-[var(--text-primary)]'>
          Importo Reclamo
        </label>
        <div className='relative'>
          <DollarSign className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]' />
          <Input
            id='claimAmount'
            type='number'
            min='0'
            step='0.01'
            placeholder='0.00'
            className='pl-10'
            value={formData.estimatedCost || ''}
            onChange={e =>
              setFormData(prev => ({ ...prev, estimatedCost: parseFloat(e.target.value) || 0 }))
            }
            required
          />
        </div>
      </div>

      <div className='space-y-2'>
        <label htmlFor='issueDescription' className='text-sm font-medium text-[var(--text-primary)]'>
          Descrizione Problema
        </label>
        <Textarea
          id='issueDescription'
          placeholder='Descrivi il problema nel dettaglio...'
          rows={4}
          value={formData.issueDescription}
          onChange={e => setFormData(prev => ({ ...prev, issueDescription: e.target.value }))}
          required
        />
      </div>

      <div className='space-y-2'>
        <label htmlFor='photo-upload' className='text-sm font-medium text-[var(--text-primary)]'>
          Foto Evidenza
        </label>
        <div className='border-2 border-dashed border-[var(--border-default)] rounded-lg p-6 text-center hover:border-[var(--border-default)] transition-colors'>
          <Upload className='mx-auto h-8 w-8 text-[var(--text-tertiary)] mb-2' />
          <p className='text-sm text-[var(--text-secondary)] mb-2'>Carica foto del problema</p>
          <Input
            type='file'
            accept='image/*'
            multiple
            className='hidden'
            id='photo-upload'
            onChange={handleFileUpload}
          />
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => document.getElementById('photo-upload')?.click()}
          >
            Seleziona File
          </Button>
        </div>
        {uploadedFiles.length > 0 && (
          <p className='text-sm text-[var(--status-success)]'>{uploadedFiles.length} file selezionati</p>
        )}
      </div>

      <DialogFooter className='gap-2'>
        <Button type='button' variant='outline' onClick={onCancel}>
          Annulla
        </Button>
        <Button type='submit' loading={isSubmitting}>
          Invia Reclamo
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * Claim Detail Dialog Component
 */
function ClaimDetailDialog({
  claim,
  open,
  onOpenChange,
}: {
  claim: WarrantyClaim | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!claim) return null;

  const statusConfig = getClaimStatusConfig(claim.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <FileText className='h-5 w-5' />
            Dettagli Reclamo
          </DialogTitle>
          <DialogDescription>Inviato il {formatDate(claim.submittedDate)}</DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='flex items-center justify-between p-3 bg-[var(--surface-secondary)] rounded-lg'>
            <span className='text-sm font-medium text-[var(--text-secondary)]'>Stato</span>
            <Badge
              variant='outline'
              className={cn('flex items-center gap-1', statusConfig.bgColor, statusConfig.color)}
            >
              {statusConfig.icon}
              {statusConfig.label}
            </Badge>
          </div>

          <div className='flex items-center justify-between p-3 bg-[var(--surface-secondary)] rounded-lg'>
            <span className='text-sm font-medium text-[var(--text-secondary)]'>Importo</span>
            <span className='text-lg font-semibold text-[var(--text-primary)]'>
              {formatCurrency(claim.amount)}
            </span>
          </div>

          <div className='space-y-2'>
            <span className='text-sm font-medium text-[var(--text-secondary)]'>Descrizione</span>
            <p className='text-sm text-[var(--text-primary)] bg-[var(--surface-secondary)] p-3 rounded-lg'>{claim.description}</p>
          </div>

          {claim.documents.length > 0 && (
            <div className='space-y-2'>
              <span className='text-sm font-medium text-[var(--text-secondary)]'>Foto Evidenza</span>
              <div className='grid grid-cols-3 gap-2'>
                {claim.documents.map((url, index) => (
                  <div
                    key={index}
                    className='aspect-square rounded-lg bg-[var(--surface-secondary)] flex items-center justify-center overflow-hidden'
                  >
                    <img
                      src={url}
                      alt={`Evidenza ${index + 1}`}
                      className='w-full h-full object-cover'
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {claim.reviewedDate && (
            <div className='text-sm text-[var(--text-tertiary)]'>
              Revisionato il {formatDate(claim.reviewedDate)}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Blockchain Verification Card Component
 */
function BlockchainVerificationCard({
  inspectionId,
  warrantyId,
}: {
  inspectionId: string;
  warrantyId: string;
}) {
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isVerified, setIsVerified] = React.useState(false);
  const { toast } = useToast();

  // Mock contract address - in production, this would come from the blockchain service
  const contractAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

  const handleVerify = async () => {
    setIsVerifying(true);
    // Simulate blockchain verification
    setTimeout(() => {
      setIsVerified(true);
      setIsVerifying(false);
      toast({
        title: 'Verifica Completata',
        description: 'Garanzia verificata su blockchain',
      });
    }, 2000);
  };

  const handleOpenExplorer = () => {
    window.open(`https://polygonscan.com/address/${contractAddress}`, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-lg'>
          <Shield className='h-5 w-5 text-[var(--status-info)]' />
          Verifica Blockchain
        </CardTitle>
        <CardDescription>Verifica l'autenticità della garanzia su blockchain</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* QR Code Placeholder */}
        <div className='flex justify-center'>
          <div className='w-32 h-32 bg-[var(--surface-secondary)] border-2 border-[var(--border-default)] rounded-lg flex items-center justify-center'>
            <QrCode className='h-20 w-20 text-[var(--text-primary)]' />
          </div>
        </div>

        {/* Contract Address */}
        <div className='space-y-1'>
          <label htmlFor='contractAddress' className='text-xs font-medium text-[var(--text-tertiary)] uppercase'>
            Indirizzo Contratto
          </label>
          <div className='flex items-center gap-2 p-2 bg-[var(--surface-secondary)] rounded-lg'>
            <code id='contractAddress' className='text-xs text-[var(--text-secondary)] flex-1 truncate'>
              {contractAddress}
            </code>
            <Button
              variant='ghost'
              size='icon-sm'
              className='h-6 w-6'
              onClick={() => {
                navigator.clipboard.writeText(contractAddress);
                toast({ title: 'Indirizzo copiato' });
              }}
            >
              <FileText className='h-3 w-3' />
            </Button>
          </div>
        </div>

        {/* Verification Status */}
        {isVerified && (
          <div className='flex items-center gap-2 p-3 bg-[var(--status-success-subtle)] text-[var(--status-success)] rounded-lg'>
            <CheckCircle2 className='h-5 w-5' />
            <span className='text-sm font-medium'>Verificato su Blockchain</span>
          </div>
        )}
      </CardContent>
      <CardFooter className='flex gap-2'>
        <Button variant='outline' className='flex-1' onClick={handleOpenExplorer}>
          <ExternalLink className='h-4 w-4 mr-2' />
          Visualizza su Explorer
        </Button>
        <Button
          className='flex-1'
          onClick={handleVerify}
          loading={isVerifying}
          variant={isVerified ? 'success' : 'default'}
        >
          {isVerified ? (
            <>
              <CheckCircle2 className='h-4 w-4 mr-2' />
              Verificato
            </>
          ) : (
            <>
              <Shield className='h-4 w-4 mr-2' />
              Verifica
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function WarrantyDashboard({ warrantyId, inspectionId }: WarrantyDashboardProps) {
  const { toast } = useToast();
  const [warranty, setWarranty] = React.useState<WarrantyWithClaims | null>(null);
  const [claims, setClaims] = React.useState<WarrantyClaim[]>([]);
  const [expiringWarranties, setExpiringWarranties] = React.useState<WarrantyWithClaims[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedClaim, setSelectedClaim] = React.useState<WarrantyClaim | null>(null);
  const [isClaimDialogOpen, setIsClaimDialogOpen] = React.useState(false);
  const [isNewClaimModalOpen, setIsNewClaimModalOpen] = React.useState(false);
  const [alertSettings, setAlertSettings] = React.useState({
    email: true,
    sms: false,
    daysBefore: 30,
  });

  // Load warranty data
  React.useEffect(() => {
    async function loadData() {
      try {
        const [warrantyData, claimsData, expiringData] = await Promise.all([
          getWarranty(warrantyId),
          getWarrantyClaims(warrantyId),
          getExpiringWarranties(90),
        ]);
        setWarranty(warrantyData);
        setClaims(claimsData);
        setExpiringWarranties(expiringData);
        const wd = warrantyData as unknown as Record<string, unknown>;
        setAlertSettings({
          email: (wd.alertEmailEnabled as boolean) ?? true,
          sms: (wd.alertSmsEnabled as boolean) ?? false,
          daysBefore: (wd.alertDaysBeforeExpiry as number) ?? 30,
        });
      } catch (error) {
        toast({
          title: 'Errore nel caricamento dati garanzia',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [warrantyId, toast]);

  // Handle alert settings update
  const handleUpdateAlerts = async () => {
    try {
      await updateWarrantyAlerts(warrantyId, alertSettings);
      toast({
        title: 'Impostazioni aggiornate',
        description: 'Preferenze avvisi salvate con successo',
      });
    } catch (error) {
      toast({
        title: 'Errore aggiornamento impostazioni',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className='w-full h-96 flex items-center justify-center'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--status-info)]' />
      </div>
    );
  }

  if (!warranty) {
    return (
      <Card className='w-full'>
        <CardContent className='flex flex-col items-center justify-center py-12'>
          <AlertTriangle className='h-12 w-12 text-[var(--status-warning)] mb-4' />
          <h3 className='text-lg font-semibold text-[var(--text-primary)]'>Garanzia Non Trovata</h3>
          <p className='text-sm text-[var(--text-tertiary)] mt-1'>La garanzia richiesta non è stata trovata</p>
        </CardContent>
      </Card>
    );
  }

  const w = warranty as unknown as Record<string, unknown>;
  const daysRemaining = calculateCountdown(String(warranty.expirationDate)).days;
  const status = getWarrantyStatus(daysRemaining, String(warranty.status));
  const progress = calculateProgress(String(warranty.startDate), String(warranty.expirationDate));
  const warrantyType = getWarrantyTypeInfo(String(w.coverageType ?? ''));
  const maxCoverage = (w.maxClaimAmount as number) ?? 0;
  const totalClaimsAmount = (w.totalClaimsAmount as number) ?? 0;
  const remainingCoverage = maxCoverage - totalClaimsAmount;

  return (
    <div className='w-full max-w-7xl mx-auto space-y-6'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold text-[var(--text-primary)]'>Pannello Garanzie</h1>
          <p className='text-sm text-[var(--text-tertiary)] mt-1'>Gestisci coperture e reclami in garanzia</p>
        </div>
        <Dialog open={isNewClaimModalOpen} onOpenChange={setIsNewClaimModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className='h-4 w-4 mr-2' />
              Nuovo Reclamo
            </Button>
          </DialogTrigger>
          <DialogContent className='max-w-lg'>
            <DialogHeader>
              <DialogTitle>Invia Nuovo Reclamo</DialogTitle>
              <DialogDescription>
                Presenta un nuovo reclamo in garanzia per questo veicolo
              </DialogDescription>
            </DialogHeader>
            <NewClaimForm
              warrantyId={warrantyId}
              onSubmit={() => {
                setIsNewClaimModalOpen(false);
                // Refresh claims
                getWarrantyClaims(warrantyId).then(setClaims);
              }}
              onCancel={() => setIsNewClaimModalOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Left Column - Warranty Status */}
        <div className='lg:col-span-2 space-y-6'>
          {/* Warranty Status Card */}
          <Card className='border-l-4 border-l-blue-500'>
            <CardHeader>
              <div className='flex items-start justify-between'>
                <div>
                  <CardTitle className='text-xl flex items-center gap-2'>
                    <Shield className='h-6 w-6 text-[var(--status-info)]' />
                    Copertura Garanzia
                  </CardTitle>
                  <CardDescription className='mt-1'>
                    {formatDate(String(warranty.startDate))} -{' '}
                    {formatDate(String(warranty.expirationDate))}
                  </CardDescription>
                </div>
                <Badge variant={status.variant} className={cn('px-3 py-1', status.color)}>
                  {status.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className='space-y-6'>
              {/* Countdown Timer */}
              <div className='bg-gradient-to-br from-[var(--status-info)]/5 to-[var(--brand)]/5 rounded-xl p-6'>
                <h3 className='text-sm font-medium text-[var(--text-secondary)] text-center mb-4'>
                  Tempo Rimanente
                </h3>
                <CountdownTimer expirationDate={String(warranty.expirationDate)} />
              </div>

              {/* Progress Bar */}
              <div className='space-y-2'>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-[var(--text-secondary)]'>Periodo Copertura</span>
                  <span className='font-medium text-[var(--text-primary)]'>{progress}% trascorso</span>
                </div>
                <Progress value={progress} className='h-2' />
                <div className='flex items-center justify-between text-xs text-[var(--text-tertiary)]'>
                  <span>{formatDate(String(warranty.startDate))}</span>
                  <span>{formatDate(String(warranty.expirationDate))}</span>
                </div>
              </div>

              {/* Coverage Info */}
              <div className='grid grid-cols-2 gap-4'>
                <div className='bg-[var(--surface-secondary)] rounded-lg p-4'>
                  <div className='flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-1'>
                    <Wallet className='h-4 w-4' />
                    <span>Copertura Residua</span>
                  </div>
                  <div className='text-2xl font-bold text-[var(--text-primary)]'>
                    {formatCurrency(remainingCoverage)}
                  </div>
                  <div className='text-xs text-[var(--text-tertiary)]'>
                    di {formatCurrency(maxCoverage)} totale
                  </div>
                </div>
                <div className='bg-[var(--surface-secondary)] rounded-lg p-4'>
                  <div className='flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-1'>
                    <Activity className='h-4 w-4' />
                    <span>Tipo Garanzia</span>
                  </div>
                  <div
                    className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium mt-1',
                      warrantyType.color
                    )}
                  >
                    {warrantyType.label}
                  </div>
                  <div className='text-xs text-[var(--text-tertiary)] mt-1'>{warrantyType.description}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Claim History */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-lg'>
                <FileText className='h-5 w-5' />
                Storico Reclami
              </CardTitle>
              <CardDescription>
                {claims.length === 0
                  ? 'Nessun reclamo presentato'
                  : `${claims.length} reclamo/i presentati`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {claims.length === 0 ? (
                <div className='text-center py-8'>
                  <CheckCircle2 className='h-12 w-12 text-[var(--status-success)] mx-auto mb-3' />
                  <p className='text-sm text-[var(--text-tertiary)]'>
                    Nessun reclamo presentato per questa garanzia
                  </p>
                </div>
              ) : (
                <div className='space-y-3'>
                  {claims.map(claim => {
                    const statusConfig = getClaimStatusConfig(claim.status);
                    return (
                      <button
                        key={claim.id}
                        onClick={() => {
                          setSelectedClaim(claim);
                          setIsClaimDialogOpen(true);
                        }}
                        className='w-full text-left p-4 bg-[var(--surface-secondary)] hover:bg-[var(--surface-secondary)] rounded-lg transition-colors group'
                      >
                        <div className='flex items-start justify-between'>
                          <div className='flex-1'>
                            <div className='flex items-center gap-2 mb-1'>
                              <span className='font-medium text-[var(--text-primary)]'>
                                {formatCurrency(claim.amount)}
                              </span>
                              <Badge
                                variant='outline'
                                className={cn(
                                  'flex items-center gap-1 text-xs',
                                  statusConfig.bgColor,
                                  statusConfig.color
                                )}
                              >
                                {statusConfig.icon}
                                {statusConfig.label}
                              </Badge>
                            </div>
                            <p className='text-sm text-[var(--text-secondary)] line-clamp-2'>
                              {claim.description}
                            </p>
                            <p className='text-xs text-[var(--text-tertiary)] mt-1'>
                              {formatDate(claim.submittedDate)}
                            </p>
                          </div>
                          <ChevronRight className='h-5 w-5 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors' />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className='space-y-6'>
          {/* Blockchain Verification */}
          <BlockchainVerificationCard inspectionId={inspectionId} warrantyId={warrantyId} />

          {/* Upcoming Expirations */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-lg'>
                <Calendar className='h-5 w-5 text-[var(--status-warning)]' />
                Scadenze in Arrivo
              </CardTitle>
              <CardDescription>Garanzie in scadenza</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue='30' className='w-full'>
                <TabsList className='w-full grid grid-cols-3'>
                  <TabsTrigger value='30'>30d</TabsTrigger>
                  <TabsTrigger value='60'>60d</TabsTrigger>
                  <TabsTrigger value='90'>90d</TabsTrigger>
                </TabsList>
                {['30', '60', '90'].map(days => (
                  <TabsContent key={days} value={days} className='mt-4'>
                    <div className='space-y-2 max-h-48 overflow-y-auto'>
                      {expiringWarranties
                        .filter(ew => {
                          const daysLeft = calculateCountdown(String(ew.expirationDate)).days;
                          return daysLeft <= parseInt(days) && daysLeft > parseInt(days) - 30;
                        })
                        .map(ew => (
                          <div
                            key={ew.id}
                            className='flex items-center justify-between p-2 bg-[var(--surface-secondary)] rounded-lg text-sm'
                          >
                            <span className='text-[var(--text-secondary)] truncate flex-1'>
                              {ew.id.slice(0, 8)}...
                            </span>
                            <Badge variant='outline' className='text-xs ml-2'>
                              {calculateCountdown(String(ew.expirationDate)).days}d
                            </Badge>
                          </div>
                        ))}
                      {expiringWarranties.filter(ew => {
                        const daysLeft = calculateCountdown(String(ew.expirationDate)).days;
                        return daysLeft <= parseInt(days) && daysLeft > parseInt(days) - 30;
                      }).length === 0 && (
                        <p className='text-sm text-[var(--text-tertiary)] text-center py-4'>
                          Nessuna garanzia in scadenza in questo periodo
                        </p>
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* Alert Settings */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-lg'>
                <Bell className='h-5 w-5 text-[var(--brand)]' />
                Impostazioni Avvisi
              </CardTitle>
              <CardDescription>Configura promemoria scadenze</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Settings className='h-4 w-4 text-[var(--text-tertiary)]' />
                  <span className='text-sm text-[var(--text-secondary)]'>Avvisi Email</span>
                </div>
                <Switch
                  checked={alertSettings.email}
                  onCheckedChange={checked =>
                    setAlertSettings(prev => ({ ...prev, email: checked }))
                  }
                />
              </div>
              <Separator />
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Settings className='h-4 w-4 text-[var(--text-tertiary)]' />
                  <span className='text-sm text-[var(--text-secondary)]'>Avvisi SMS</span>
                </div>
                <Switch
                  checked={alertSettings.sms}
                  onCheckedChange={checked => setAlertSettings(prev => ({ ...prev, sms: checked }))}
                />
              </div>
              <Separator />
              <div className='space-y-2'>
                <label htmlFor='daysBeforeExpiry' className='text-sm text-[var(--text-secondary)]'>
                  Giorni Prima della Scadenza
                </label>
                <Input
                  id='daysBeforeExpiry'
                  type='number'
                  min='1'
                  max='365'
                  value={alertSettings.daysBefore}
                  onChange={e =>
                    setAlertSettings(prev => ({
                      ...prev,
                      daysBefore: parseInt(e.target.value) || 30,
                    }))
                  }
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button variant='outline' className='w-full' onClick={handleUpdateAlerts}>
                Salva Impostazioni
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Claim Detail Dialog */}
      <ClaimDetailDialog
        claim={selectedClaim}
        open={isClaimDialogOpen}
        onOpenChange={setIsClaimDialogOpen}
      />
    </div>
  );
}

export default WarrantyDashboard;
