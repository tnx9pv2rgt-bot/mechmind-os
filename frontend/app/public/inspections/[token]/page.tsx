'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Car,
  Gauge,
  Camera,
  Euro,
  ChevronLeft,
  ChevronRight,
  Printer,
  Wrench,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Severity = 'critical' | 'warning' | 'ok';

interface InspectionPhoto {
  url: string;
  caption?: string;
}

interface InspectionItem {
  id: string;
  category: string;
  description: string;
  severity: Severity;
  notes?: string;
  photos: InspectionPhoto[];
  estimatedCost?: number;
}

interface InspectionData {
  id: string;
  date: string;
  workshopName: string;
  technician: string;
  vehiclePlate: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear?: number;
  mileage?: number;
  items: InspectionItem[];
  totalEstimatedCost: number;
  status: string;
}

// ---------------------------------------------------------------------------
// Severity config
// ---------------------------------------------------------------------------
const severityConfig: Record<Severity, {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: typeof XCircle;
}> = {
  critical: {
    label: 'Critico',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
    border: 'border-red-200 dark:border-red-800/40',
    icon: XCircle,
  },
  warning: {
    label: 'Attenzione',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    border: 'border-amber-200 dark:border-amber-800/40',
    icon: AlertTriangle,
  },
  ok: {
    label: 'OK',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
    border: 'border-green-200 dark:border-green-800/40',
    icon: CheckCircle2,
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PublicInspectionPage() {
  const params = useParams();
  const token = params.token as string;

  const [inspection, setInspection] = useState<InspectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function fetchInspection(): Promise<void> {
      try {
        const res = await fetch(`/api/public/inspections/${token}`, { credentials: 'include' });
        if (!res.ok) {
          if (res.status === 404) {
            setError('Ispezione non trovata o link scaduto.');
          } else {
            setError('Errore nel caricamento dell\'ispezione.');
          }
          return;
        }
        const data = (await res.json()) as InspectionData;
        setInspection(data);
      } catch {
        setError('Impossibile connettersi al server. Riprova.');
      } finally {
        setLoading(false);
      }
    }
    fetchInspection();
  }, [token]);

  const handleApproveRecommended = useCallback(async (): Promise<void> => {
    if (!inspection || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/public/inspections/${token}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedItems: inspection.items
            .filter(i => i.severity === 'critical' || i.severity === 'warning')
            .map(i => i.id),
        }),
      });

      if (!res.ok) {
        toast.error('Errore nell\'approvazione. Riprova.');
        return;
      }

      setSubmitted(true);
      toast.success('Lavori approvati con successo!');
    } catch {
      toast.error('Errore di connessione. Riprova.');
    } finally {
      setSubmitting(false);
    }
  }, [inspection, submitting, token]);

  // Counts
  const counts = inspection
    ? {
        critical: inspection.items.filter(i => i.severity === 'critical').length,
        warning: inspection.items.filter(i => i.severity === 'warning').length,
        ok: inspection.items.filter(i => i.severity === 'ok').length,
      }
    : { critical: 0, warning: 0, ok: 0 };

  const recommendedCost = inspection
    ? inspection.items
        .filter(i => (i.severity === 'critical' || i.severity === 'warning') && i.estimatedCost)
        .reduce((sum, i) => sum + (i.estimatedCost || 0), 0)
    : 0;

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand)]" />
        <p className="text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">Caricamento ispezione...</p>
        <Toaster richColors position="top-center" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Error
  // ---------------------------------------------------------------------------
  if (error || !inspection) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] text-center text-lg font-medium">
          {error || 'Ispezione non trovata'}
        </p>
        <p className="text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] text-center text-sm">
          Contatta l&apos;officina se il problema persiste.
        </p>
        <Toaster richColors position="top-center" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Success
  // ---------------------------------------------------------------------------
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Grazie!</h1>
        <p className="text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] max-w-md">
          Hai approvato i lavori raccomandati. L&apos;officina ti contatter\u00e0 per fissare un appuntamento.
        </p>
        <Toaster richColors position="top-center" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6 print:space-y-4">
      <Toaster richColors position="top-center" />

      {/* Vehicle Info Header */}
      <div className="bg-white dark:bg-[var(--surface-elevated)] rounded-2xl border border-[var(--border-default)] dark:border-[var(--border-strong)] p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              Ispezione Veicolo Digitale
            </h1>
            <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] mt-0.5">
              {inspection.workshopName} &middot; {inspection.technician}
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="p-2.5 rounded-lg bg-[var(--surface-hover)] dark:bg-[var(--surface-active)] text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]
                       hover:bg-gray-200 dark:hover:bg-[var(--surface-active)] transition-colors print:hidden min-w-[44px] min-h-[44px]
                       flex items-center justify-center"
            aria-label="Stampa"
          >
            <Printer className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-[var(--surface-primary)]">
          <Car className="w-5 h-5 text-[var(--text-tertiary)] flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              {inspection.vehicleBrand} {inspection.vehicleModel}
              {inspection.vehicleYear ? ` (${inspection.vehicleYear})` : ''}
            </p>
            <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] mt-0.5">
              <span>Targa: {inspection.vehiclePlate}</span>
              {inspection.mileage && (
                <span className="flex items-center gap-1">
                  <Gauge className="w-3 h-3" />
                  {inspection.mileage.toLocaleString('it-IT')} km
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">
          Data:{' '}
          {new Date(inspection.date).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryBadge severity="critical" count={counts.critical} />
        <SummaryBadge severity="warning" count={counts.warning} />
        <SummaryBadge severity="ok" count={counts.ok} />
      </div>

      {/* Inspection Items */}
      <div className="space-y-3">
        {/* Critical items first, then warning, then ok */}
        {(['critical', 'warning', 'ok'] as Severity[]).map(severity => {
          const items = inspection.items.filter(i => i.severity === severity);
          if (items.length === 0) return null;

          return (
            <div key={severity} className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider px-1 mt-4 first:mt-0"
                  style={{ color: severity === 'critical' ? '#ef4444' : severity === 'warning' ? '#f59e0b' : '#22c55e' }}>
                {severityConfig[severity].label} ({items.length})
              </h2>
              {items.map(item => (
                <InspectionCard key={item.id} item={item} />
              ))}
            </div>
          );
        })}
      </div>

      {/* Approve recommended work */}
      {(counts.critical > 0 || counts.warning > 0) && (
        <div className="bg-white dark:bg-[var(--surface-elevated)] rounded-2xl border border-[var(--border-default)] dark:border-[var(--border-strong)] p-5 space-y-4 print:hidden">
          <div className="flex items-center gap-3">
            <Wrench className="w-5 h-5 text-[var(--brand)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                Lavori raccomandati
              </p>
              <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">
                {counts.critical + counts.warning} interventi &middot; Costo stimato:{' '}
                {formatCurrency(recommendedCost)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleApproveRecommended}
            disabled={submitting}
            className="w-full py-4 rounded-xl bg-[var(--brand)] text-white font-semibold text-base
                       hover:bg-[var(--brand)]/90 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors min-h-[52px] flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Invio in corso...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Approva lavori raccomandati
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function SummaryBadge({ severity, count }: { severity: Severity; count: number }) {
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <div className={`rounded-xl p-3 text-center ${config.bg} ${config.border} border`}>
      <Icon className={`w-5 h-5 mx-auto ${config.color}`} />
      <p className={`text-lg font-bold mt-1 ${config.color}`}>{count}</p>
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] font-medium">
        {config.label}
      </p>
    </div>
  );
}

function InspectionCard({ item }: { item: InspectionItem }) {
  const config = severityConfig[item.severity];
  const Icon = config.icon;
  const [photoIndex, setPhotoIndex] = useState(0);

  return (
    <div className={`bg-white dark:bg-[var(--surface-elevated)] rounded-xl border ${config.border} overflow-hidden`}>
      {/* Photo gallery */}
      {item.photos.length > 0 && (
        <div className="relative aspect-video bg-[var(--surface-hover)] dark:bg-[var(--surface-primary)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.photos[photoIndex].url}
            alt={item.photos[photoIndex].caption || item.description}
            className="w-full h-full object-cover"
          />
          {item.photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setPhotoIndex(prev => (prev > 0 ? prev - 1 : item.photos.length - 1))}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full
                           bg-black/50 text-white flex items-center justify-center
                           hover:bg-black/70 transition-colors"
                aria-label="Foto precedente"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setPhotoIndex(prev => (prev < item.photos.length - 1 ? prev + 1 : 0))}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full
                           bg-black/50 text-white flex items-center justify-center
                           hover:bg-black/70 transition-colors"
                aria-label="Foto successiva"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                {item.photos.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPhotoIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx === photoIndex ? 'bg-white' : 'bg-white/40'
                    }`}
                    aria-label={`Foto ${idx + 1}`}
                  />
                ))}
              </div>
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 text-white text-[10px] font-medium px-2 py-1 rounded-full">
                <Camera className="w-3 h-3" />
                {photoIndex + 1}/{item.photos.length}
              </div>
            </>
          )}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 text-xs font-bold uppercase px-2 py-0.5 rounded-md ${config.bg} ${config.color}`}>
                <Icon className="w-3 h-3" />
                {config.label}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]-light uppercase tracking-wider">
                {item.category}
              </span>
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mt-1.5">
              {item.description}
            </p>
            {item.notes && (
              <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] mt-1">{item.notes}</p>
            )}
          </div>
          {item.estimatedCost != null && item.estimatedCost > 0 && (
            <div className="flex-shrink-0 text-right">
              <p className="text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]-light">Stima</p>
              <p className="text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-0.5">
                <Euro className="w-3.5 h-3.5" />
                {formatCurrency(item.estimatedCost)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}
