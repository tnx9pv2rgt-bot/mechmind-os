'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { AppleButton } from '@/components/ui/apple-button';
import { StatusTimeline, type TimelineStepConfig, type TimelineEvent } from '@/components/ui/status-timeline';
import {
  ArrowLeft,
  FileText,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Truck,
  MapPin,
  Package,
  Calendar,
  CheckCircle,
  Send,
  Stamp,
  X,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================
interface FirDetail {
  id: string;
  firNumber: string;
  date: string;
  cerCode: string;
  cerDescription: string;
  quantity: number;
  unit: string;
  physicalState?: string;
  hazardClass?: string;
  hazardous: boolean;
  status: 'DRAFT' | 'VIDIMATED' | 'IN_TRANSIT' | 'DELIVERED' | 'CONFIRMED' | 'CANCELLED';
  vivifirCode?: string;
  producerName: string;
  producerAddress?: string;
  producerFiscalCode?: string;
  transporterName: string;
  transporterAddress?: string;
  transporterAlboNumber?: string;
  transporterVehiclePlate?: string;
  destinationName: string;
  destinationAddress?: string;
  destinationAuthNumber?: string;
  notes?: string;
  statusHistory: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Status Config
// =============================================================================
function getStatusConfig(status: string): { label: string; colorClass: string; bgClass: string } {
  switch (status) {
    case 'DRAFT':
      return { label: 'Bozza', colorClass: 'text-[var(--text-tertiary)]', bgClass: 'bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)]' };
    case 'VIDIMATED':
      return { label: 'Vidimato', colorClass: 'text-[var(--status-info)]', bgClass: 'bg-[var(--status-info)]/20' };
    case 'IN_TRANSIT':
      return { label: 'In Transito', colorClass: 'text-[var(--status-warning)]', bgClass: 'bg-[var(--status-warning)]/50/20' };
    case 'DELIVERED':
      return { label: 'Consegnato', colorClass: 'text-[var(--status-success)]', bgClass: 'bg-[var(--status-success)]/20' };
    case 'CONFIRMED':
      return { label: 'Confermato', colorClass: 'text-[var(--status-success)]', bgClass: 'bg-[var(--status-success)]/50/20' };
    case 'CANCELLED':
      return { label: 'Annullato', colorClass: 'text-[var(--status-error)]', bgClass: 'bg-[var(--status-error)]/20' };
    default:
      return { label: status, colorClass: 'text-[var(--text-tertiary)]', bgClass: 'bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)]' };
  }
}

// Timeline steps for FIR workflow
const FIR_STEPS: TimelineStepConfig[] = [
  { key: 'DRAFT', label: 'Bozza', icon: FileText },
  { key: 'VIDIMATED', label: 'Vidimato (ViViFir)', icon: Stamp },
  { key: 'IN_TRANSIT', label: 'In Transito', icon: Truck },
  { key: 'DELIVERED', label: 'Consegnato', icon: MapPin },
  { key: 'CONFIRMED', label: 'Confermato (4a Copia)', icon: CheckCircle },
];

// =============================================================================
// Vidimate Dialog
// =============================================================================
function VidimateDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (code: string) => void;
  isSubmitting: boolean;
}) {
  const [vivifirCode, setVivifirCode] = useState('');

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--surface-primary)]/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Vidimazione ViViFir"
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <motion.div
          className="rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 border border-[var(--border-default)] bg-[var(--surface-elevated)]"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-title-2 font-light text-[var(--text-primary)]">
              Vidimazione ViViFir
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-xl transition-colors hover:bg-[var(--surface-secondary)]/5"
              aria-label="Chiudi"
            >
              <X className="h-5 w-5 text-[var(--text-tertiary)]" />
            </button>
          </div>

          <p className="text-footnote mb-4 text-[var(--text-tertiary)]">
            Inserisci il codice di vidimazione ottenuto dal portale ViViFir per validare il formulario.
          </p>

          <div className="mb-6">
            <label className="text-footnote mb-1.5 block text-[var(--text-tertiary)]">
              Codice ViViFir *
            </label>
            <input
              value={vivifirCode}
              onChange={(e) => setVivifirCode(e.target.value)}
              placeholder="Es. VVF-2026-XXXXX"
              className="w-full h-11 px-3 rounded-xl text-body font-mono focus:outline-none focus:border-[var(--border-default)]/30 transition-colors bg-[var(--surface-secondary)]/[0.06] dark:bg-[var(--surface-secondary)]/[0.06] border border-[var(--border-default)] text-[var(--text-primary)]"
            />
          </div>

          <div className="flex gap-3">
            <AppleButton
              variant="ghost"
              onClick={onClose}
              fullWidth
            >
              Annulla
            </AppleButton>
            <AppleButton
              variant="primary"
              onClick={() => onSubmit(vivifirCode)}
              disabled={!vivifirCode.trim()}
              loading={isSubmitting}
              fullWidth
            >
              Vidima
            </AppleButton>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// =============================================================================
// Info Row Component
// =============================================================================
function InfoRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2">
      <span className="text-footnote sm:w-48 flex-shrink-0 text-[var(--text-tertiary)]">
        {label}
      </span>
      <span className="text-body text-[var(--text-primary)]">
        {value || '—'}
      </span>
    </div>
  );
}

// =============================================================================
// Main Page
// =============================================================================
export default function FirDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [vidimateOpen, setVidimateOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const { data, isLoading, error, mutate } = useSWR<FirDetail | { data: FirDetail }>(
    `/api/rentri/fir/${id}`,
    fetcher,
  );

  const fir: FirDetail | null = (() => {
    if (!data) return null;
    if ('firNumber' in data) return data as FirDetail;
    if ('data' in data && data.data) return (data as { data: FirDetail }).data;
    return null;
  })();

  async function handleStatusUpdate(newStatus: string): Promise<void> {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/rentri/fir/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as { error?: { message?: string } })?.error?.message || 'Errore aggiornamento stato');
      }
      toast.success('Stato aggiornato con successo');
      mutate();
    } catch (err) {
      toast.error('Errore aggiornamento stato', {
        description: err instanceof Error ? err.message : 'Errore sconosciuto',
      });
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleVidimate(vivifirCode: string): Promise<void> {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/rentri/fir/${id}/vidimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ vivifirCode }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as { error?: { message?: string } })?.error?.message || 'Errore vidimazione');
      }
      toast.success('FIR vidimato con successo');
      setVidimateOpen(false);
      mutate();
    } catch (err) {
      toast.error('Errore vidimazione', {
        description: err instanceof Error ? err.message : 'Errore sconosciuto',
      });
    } finally {
      setIsUpdating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-tertiary)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
      </div>
    );
  }

  if (error || !fir) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--surface-tertiary)]">
        <AlertCircle className="h-12 w-12 mb-4 text-[var(--border-default)]" />
        <p className="text-[15px] mb-4 text-[var(--text-tertiary)]">
          Impossibile caricare il formulario
        </p>
        <AppleButton variant="ghost" onClick={() => router.push('/dashboard/rentri/fir')}>
          Torna alla lista
        </AppleButton>
      </div>
    );
  }

  const statusConfig = getStatusConfig(fir.status);

  // Build action button based on current status
  function renderActionButton(): React.ReactNode {
    if (!fir) return null;
    if (isUpdating) {
      return (
        <AppleButton variant="primary" loading disabled>
          Aggiornamento...
        </AppleButton>
      );
    }

    switch (fir.status) {
      case 'DRAFT':
        return (
          <AppleButton
            variant="primary"
            onClick={() => setVidimateOpen(true)}
            icon={<Stamp className="h-4 w-4" />}
            className="bg-[var(--status-info-subtle)]0 hover:bg-[var(--status-info)] text-[var(--text-on-brand)]"
          >
            Vidima (ViViFir)
          </AppleButton>
        );
      case 'VIDIMATED':
        return (
          <AppleButton
            variant="primary"
            onClick={() => handleStatusUpdate('IN_TRANSIT')}
            icon={<Send className="h-4 w-4" />}
            className="bg-[var(--status-warning)]/50 hover:bg-[var(--status-warning)] text-[var(--text-on-brand)]"
          >
            Avvia Trasporto
          </AppleButton>
        );
      case 'IN_TRANSIT':
        return (
          <AppleButton
            variant="primary"
            onClick={() => handleStatusUpdate('DELIVERED')}
            icon={<MapPin className="h-4 w-4" />}
            className="bg-[var(--status-success-subtle)]0 hover:bg-[var(--status-success)] text-[var(--text-on-brand)]"
          >
            Conferma Consegna
          </AppleButton>
        );
      case 'DELIVERED':
        return (
          <AppleButton
            variant="primary"
            onClick={() => handleStatusUpdate('CONFIRMED')}
            icon={<CheckCircle className="h-4 w-4" />}
            className="bg-[var(--status-success)]/50 hover:bg-[var(--status-success)] text-[var(--text-on-brand)]"
          >
            Conferma (4a Copia)
          </AppleButton>
        );
      default:
        return null;
    }
  }

  return (
    <div>
      {/* Header */}
      <header>
        <div className='px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <div className="flex items-center gap-4">
            <AppleButton
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/rentri/fir')}
              icon={<ArrowLeft className="h-4 w-4" />}
              aria-label="Torna ai formulari"
              className="min-w-[44px]"
            />
            <div>
              <Breadcrumb
                items={[
                  { label: 'Dashboard', href: '/dashboard' },
                  { label: 'Rifiuti (RENTRI)', href: '/dashboard/rentri' },
                  { label: 'FIR', href: '/dashboard/rentri/fir' },
                  { label: fir.firNumber },
                ]}
              />
              <div className="flex items-center gap-3">
                <h1 className='text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)] font-mono'>
                  {fir.firNumber}
                </h1>
                <span
                  className={`text-footnote font-bold px-2.5 py-1 rounded-full ${statusConfig.bgClass} ${statusConfig.colorClass}`}
                >
                  {statusConfig.label}
                </span>
                {fir.hazardous && (
                  <span className="text-footnote font-bold px-2.5 py-1 rounded-full flex items-center gap-1 bg-[var(--status-warning)]/20 text-[var(--status-warning)]">
                    <AlertTriangle className="h-3 w-3" />
                    Pericoloso
                  </span>
                )}
              </div>
              <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1'>
                Creato il {new Date(fir.createdAt).toLocaleDateString('it-IT', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            {renderActionButton()}
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
        {/* Status Timeline */}
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] p-6">
          <h2 className="text-title-2 font-medium mb-5 text-[var(--text-primary)]">
            Avanzamento
          </h2>
          <StatusTimeline
            currentStatus={fir.status}
            events={fir.statusHistory || []}
            steps={FIR_STEPS}
            variant="tracker"
            showActor
            showNotes
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Waste Details */}
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] p-6">
            <div className="flex items-center gap-2 mb-5">
              <Package className="h-5 w-5 text-[var(--status-info)]" />
              <h2 className="text-title-2 font-medium text-[var(--text-primary)]">
                Dati Rifiuto
              </h2>
            </div>
            <div className="divide-y divide-[var(--border-default)]">
              <InfoRow label="Codice CER" value={fir.cerCode} />
              <InfoRow label="Descrizione" value={fir.cerDescription} />
              <InfoRow label="Quantita" value={`${fir.quantity.toLocaleString('it-IT')} ${fir.unit || 'kg'}`} />
              <InfoRow label="Stato fisico" value={fir.physicalState} />
              <InfoRow label="Classe pericolo" value={fir.hazardClass} />
              {fir.vivifirCode && <InfoRow label="Codice ViViFir" value={fir.vivifirCode} />}
            </div>
          </div>

          {/* Producer */}
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] p-6">
            <div className="flex items-center gap-2 mb-5">
              <FileText className="h-5 w-5 text-[var(--status-success)]" />
              <h2 className="text-title-2 font-medium text-[var(--text-primary)]">
                Produttore
              </h2>
            </div>
            <div className="divide-y divide-[var(--border-default)]">
              <InfoRow label="Ragione sociale" value={fir.producerName} />
              <InfoRow label="Indirizzo" value={fir.producerAddress} />
              <InfoRow label="Codice fiscale" value={fir.producerFiscalCode} />
            </div>
          </div>

          {/* Transporter */}
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] p-6">
            <div className="flex items-center gap-2 mb-5">
              <Truck className="h-5 w-5 text-[var(--status-warning)]" />
              <h2 className="text-title-2 font-medium text-[var(--text-primary)]">
                Trasportatore
              </h2>
            </div>
            <div className="divide-y divide-[var(--border-default)]">
              <InfoRow label="Ragione sociale" value={fir.transporterName} />
              <InfoRow label="Indirizzo" value={fir.transporterAddress} />
              <InfoRow label="N. Albo" value={fir.transporterAlboNumber} />
              <InfoRow label="Targa veicolo" value={fir.transporterVehiclePlate} />
            </div>
          </div>

          {/* Destination */}
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] p-6">
            <div className="flex items-center gap-2 mb-5">
              <MapPin className="h-5 w-5 text-[var(--status-error)]" />
              <h2 className="text-title-2 font-medium text-[var(--text-primary)]">
                Destinazione
              </h2>
            </div>
            <div className="divide-y divide-[var(--border-default)]">
              <InfoRow label="Ragione sociale" value={fir.destinationName} />
              <InfoRow label="Indirizzo" value={fir.destinationAddress} />
              <InfoRow label="N. Autorizzazione" value={fir.destinationAuthNumber} />
            </div>
          </div>
        </div>

        {/* Notes */}
        {fir.notes && (
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] p-6">
            <h2 className="text-title-2 font-medium mb-3 text-[var(--text-primary)]">
              Note
            </h2>
            <p className="text-body whitespace-pre-wrap text-[var(--text-secondary)]">
              {fir.notes}
            </p>
          </div>
        )}
      </div>

      {/* Vidimate Dialog */}
      <VidimateDialog
        open={vidimateOpen}
        onClose={() => setVidimateOpen(false)}
        onSubmit={handleVidimate}
        isSubmitting={isUpdating}
      />
    </div>
  );
}
