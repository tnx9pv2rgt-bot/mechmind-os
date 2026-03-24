'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { Breadcrumb } from '@/components/ui/breadcrumb';
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
// Design Tokens
// =============================================================================
const colors = {
  bg: '#1a1a1a',
  surface: '#2f2f2f',
  surfaceHover: '#383838',
  border: '#4e4e4e',
  borderSubtle: '#3a3a3a',
  textPrimary: '#ffffff',
  textSecondary: '#b4b4b4',
  textTertiary: '#888888',
  textMuted: '#666666',
  success: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
  info: '#60a5fa',
  emerald: '#10b981',
  amber: '#f59e0b',
  glowStrong: 'rgba(255,255,255,0.06)',
};

// =============================================================================
// Status Config
// =============================================================================
function getStatusConfig(status: string): { label: string; color: string; bg: string } {
  switch (status) {
    case 'DRAFT':
      return { label: 'Bozza', color: colors.textTertiary, bg: `${colors.textTertiary}20` };
    case 'VIDIMATED':
      return { label: 'Vidimato', color: colors.info, bg: `${colors.info}20` };
    case 'IN_TRANSIT':
      return { label: 'In Transito', color: colors.amber, bg: `${colors.amber}20` };
    case 'DELIVERED':
      return { label: 'Consegnato', color: colors.success, bg: `${colors.success}20` };
    case 'CONFIRMED':
      return { label: 'Confermato', color: colors.emerald, bg: `${colors.emerald}20` };
    case 'CANCELLED':
      return { label: 'Annullato', color: colors.error, bg: `${colors.error}20` };
    default:
      return { label: status, color: colors.textMuted, bg: `${colors.textMuted}20` };
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

  const inputStyle = {
    backgroundColor: colors.glowStrong,
    borderWidth: 1,
    borderStyle: 'solid' as const,
    borderColor: colors.borderSubtle,
    color: colors.textPrimary,
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
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
          className="rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 border"
          style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[20px] font-light" style={{ color: colors.textPrimary }}>
              Vidimazione ViViFir
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-xl transition-colors hover:bg-white/5"
              aria-label="Chiudi"
            >
              <X className="h-5 w-5" style={{ color: colors.textTertiary }} />
            </button>
          </div>

          <p className="text-[13px] mb-4" style={{ color: colors.textTertiary }}>
            Inserisci il codice di vidimazione ottenuto dal portale ViViFir per validare il formulario.
          </p>

          <div className="mb-6">
            <label className="text-[13px] mb-1.5 block" style={{ color: colors.textTertiary }}>
              Codice ViViFir *
            </label>
            <input
              value={vivifirCode}
              onChange={(e) => setVivifirCode(e.target.value)}
              placeholder="Es. VVF-2026-XXXXX"
              className="w-full h-11 px-3 rounded-xl text-sm font-mono focus:outline-none focus:border-white/30 transition-colors"
              style={inputStyle}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-full text-sm font-medium transition-colors border hover:bg-white/5"
              style={{ borderColor: colors.border, color: colors.textSecondary }}
            >
              Annulla
            </button>
            <button
              onClick={() => onSubmit(vivifirCode)}
              disabled={!vivifirCode.trim() || isSubmitting}
              className="flex-1 py-3 rounded-full text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: colors.textPrimary, color: colors.bg }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Vidimazione...
                </>
              ) : (
                'Vidima'
              )}
            </button>
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
      <span className="text-[13px] sm:w-48 flex-shrink-0" style={{ color: colors.textTertiary }}>
        {label}
      </span>
      <span className="text-[14px]" style={{ color: colors.textPrimary }}>
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bg }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.textMuted }} />
      </div>
    );
  }

  if (error || !fir) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: colors.bg }}>
        <AlertCircle className="h-12 w-12 mb-4" style={{ color: colors.borderSubtle }} />
        <p className="text-[15px] mb-4" style={{ color: colors.textTertiary }}>
          Impossibile caricare il formulario
        </p>
        <button
          onClick={() => router.push('/dashboard/rentri/fir')}
          className="px-4 py-2 rounded-full text-sm border transition-colors hover:bg-white/5"
          style={{ borderColor: colors.border, color: colors.textSecondary }}
        >
          Torna alla lista
        </button>
      </div>
    );
  }

  const statusConfig = getStatusConfig(fir.status);

  // Build action button based on current status
  function renderActionButton(): React.ReactNode {
    if (!fir) return null;
    if (isUpdating) {
      return (
        <button
          disabled
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full min-h-[44px] opacity-50"
          style={{ backgroundColor: colors.textPrimary, color: colors.bg }}
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Aggiornamento...
        </button>
      );
    }

    switch (fir.status) {
      case 'DRAFT':
        return (
          <button
            onClick={() => setVidimateOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full transition-colors min-h-[44px]"
            style={{ backgroundColor: colors.info, color: colors.bg }}
          >
            <Stamp className="h-4 w-4" />
            Vidima (ViViFir)
          </button>
        );
      case 'VIDIMATED':
        return (
          <button
            onClick={() => handleStatusUpdate('IN_TRANSIT')}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full transition-colors min-h-[44px]"
            style={{ backgroundColor: colors.amber, color: colors.bg }}
          >
            <Send className="h-4 w-4" />
            Avvia Trasporto
          </button>
        );
      case 'IN_TRANSIT':
        return (
          <button
            onClick={() => handleStatusUpdate('DELIVERED')}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full transition-colors min-h-[44px]"
            style={{ backgroundColor: colors.success, color: colors.bg }}
          >
            <MapPin className="h-4 w-4" />
            Conferma Consegna
          </button>
        );
      case 'DELIVERED':
        return (
          <button
            onClick={() => handleStatusUpdate('CONFIRMED')}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full transition-colors min-h-[44px]"
            style={{ backgroundColor: colors.emerald, color: colors.bg }}
          >
            <CheckCircle className="h-4 w-4" />
            Conferma (4a Copia)
          </button>
        );
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 backdrop-blur-xl border-b"
        style={{
          backgroundColor: `${colors.bg}cc`,
          borderColor: colors.borderSubtle,
        }}
      >
        <div className="px-4 sm:px-8 py-5">
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Rifiuti (RENTRI)', href: '/dashboard/rentri' },
              { label: 'FIR', href: '/dashboard/rentri/fir' },
              { label: fir.firNumber },
            ]}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard/rentri/fir')}
                className="p-2.5 rounded-xl transition-colors hover:bg-white/5 border min-h-[44px] min-w-[44px] flex items-center justify-center"
                style={{ borderColor: colors.borderSubtle, color: colors.textSecondary }}
                aria-label="Torna ai formulari"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-[28px] font-light font-mono" style={{ color: colors.textPrimary }}>
                    {fir.firNumber}
                  </h1>
                  <span
                    className="text-[11px] font-bold uppercase px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
                  >
                    {statusConfig.label}
                  </span>
                  {fir.hazardous && (
                    <span
                      className="text-[11px] font-bold uppercase px-2.5 py-1 rounded-full flex items-center gap-1"
                      style={{ backgroundColor: `${colors.warning}20`, color: colors.warning }}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      Pericoloso
                    </span>
                  )}
                </div>
                <p className="text-[13px] mt-0.5" style={{ color: colors.textTertiary }}>
                  Creato il {new Date(fir.createdAt).toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
            {renderActionButton()}
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
        {/* Status Timeline */}
        <div
          className="rounded-2xl border p-6"
          style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
        >
          <h2 className="text-[16px] font-medium mb-5" style={{ color: colors.textPrimary }}>
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
          <div
            className="rounded-2xl border p-6"
            style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
          >
            <div className="flex items-center gap-2 mb-5">
              <Package className="h-5 w-5" style={{ color: colors.info }} />
              <h2 className="text-[16px] font-medium" style={{ color: colors.textPrimary }}>
                Dati Rifiuto
              </h2>
            </div>
            <div
              className="divide-y"
              style={{ borderColor: colors.borderSubtle }}
            >
              <InfoRow label="Codice CER" value={fir.cerCode} />
              <InfoRow label="Descrizione" value={fir.cerDescription} />
              <InfoRow label="Quantita" value={`${fir.quantity.toLocaleString('it-IT')} ${fir.unit || 'kg'}`} />
              <InfoRow label="Stato fisico" value={fir.physicalState} />
              <InfoRow label="Classe pericolo" value={fir.hazardClass} />
              {fir.vivifirCode && <InfoRow label="Codice ViViFir" value={fir.vivifirCode} />}
            </div>
          </div>

          {/* Producer */}
          <div
            className="rounded-2xl border p-6"
            style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
          >
            <div className="flex items-center gap-2 mb-5">
              <FileText className="h-5 w-5" style={{ color: colors.success }} />
              <h2 className="text-[16px] font-medium" style={{ color: colors.textPrimary }}>
                Produttore
              </h2>
            </div>
            <div
              className="divide-y"
              style={{ borderColor: colors.borderSubtle }}
            >
              <InfoRow label="Ragione sociale" value={fir.producerName} />
              <InfoRow label="Indirizzo" value={fir.producerAddress} />
              <InfoRow label="Codice fiscale" value={fir.producerFiscalCode} />
            </div>
          </div>

          {/* Transporter */}
          <div
            className="rounded-2xl border p-6"
            style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
          >
            <div className="flex items-center gap-2 mb-5">
              <Truck className="h-5 w-5" style={{ color: colors.amber }} />
              <h2 className="text-[16px] font-medium" style={{ color: colors.textPrimary }}>
                Trasportatore
              </h2>
            </div>
            <div
              className="divide-y"
              style={{ borderColor: colors.borderSubtle }}
            >
              <InfoRow label="Ragione sociale" value={fir.transporterName} />
              <InfoRow label="Indirizzo" value={fir.transporterAddress} />
              <InfoRow label="N. Albo" value={fir.transporterAlboNumber} />
              <InfoRow label="Targa veicolo" value={fir.transporterVehiclePlate} />
            </div>
          </div>

          {/* Destination */}
          <div
            className="rounded-2xl border p-6"
            style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
          >
            <div className="flex items-center gap-2 mb-5">
              <MapPin className="h-5 w-5" style={{ color: colors.error }} />
              <h2 className="text-[16px] font-medium" style={{ color: colors.textPrimary }}>
                Destinazione
              </h2>
            </div>
            <div
              className="divide-y"
              style={{ borderColor: colors.borderSubtle }}
            >
              <InfoRow label="Ragione sociale" value={fir.destinationName} />
              <InfoRow label="Indirizzo" value={fir.destinationAddress} />
              <InfoRow label="N. Autorizzazione" value={fir.destinationAuthNumber} />
            </div>
          </div>
        </div>

        {/* Notes */}
        {fir.notes && (
          <div
            className="rounded-2xl border p-6"
            style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
          >
            <h2 className="text-[16px] font-medium mb-3" style={{ color: colors.textPrimary }}>
              Note
            </h2>
            <p className="text-[14px] whitespace-pre-wrap" style={{ color: colors.textSecondary }}>
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
