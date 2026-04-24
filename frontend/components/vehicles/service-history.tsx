'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { useState } from 'react';
import { Wrench, ChevronDown, ChevronUp, FileText, Loader2, AlertCircle } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';

interface HistoryEntry {
  id: string;
  source: string;
  eventType: string;
  eventDate: string;
  description: string;
  mileage: number | null;
  shopName: string | null;
  costCents: number | null;
}

function EventTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; className: string }> = {
    SERVICE: { label: 'Tagliando', className: 'bg-[var(--status-info-subtle)] text-[var(--status-info)] dark:bg-[var(--status-info-subtle)] dark:text-[var(--status-info)]' },
    REPAIR: { label: 'Riparazione', className: 'bg-[var(--status-warning-subtle)] text-[var(--status-warning)] dark:bg-[var(--status-warning)]/20 dark:text-[var(--status-warning)]' },
    INSPECTION: { label: 'Controllo', className: 'bg-[var(--status-success-subtle)] text-[var(--status-success)] dark:bg-[var(--status-success-subtle)] dark:text-[var(--status-success)]' },
    RECALL: { label: 'Richiamo', className: 'bg-[var(--status-error-subtle)] text-[var(--status-error)] dark:bg-[var(--status-error-subtle)] dark:text-[var(--status-error)]' },
    ACCIDENT: { label: 'Incidente', className: 'bg-[var(--status-warning)]/10 text-[var(--status-warning)] dark:bg-[var(--status-warning)]/40/20 dark:text-[var(--status-warning)]' },
    OTHER: { label: 'Altro', className: 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] dark:bg-[var(--surface-primary)] dark:text-[var(--text-primary)]' },
  };

  const config = map[type] ?? map.OTHER;
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', config.className)}>
      {config.label}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const labels: Record<string, string> = {
    LOCAL: 'Interno',
    MOTORNET: 'Motornet',
    CARFAX: 'Carfax',
    MANUAL: 'Manuale',
  };
  return (
    <span className="text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] px-2 py-0.5 rounded">
      {labels[source] ?? source}
    </span>
  );
}

function HistoryCard({ entry, isLast }: { entry: HistoryEntry; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const costEur = entry.costCents != null ? entry.costCents / 100 : null;

  return (
    <div className="relative">
      {!isLast && (
        <div className="absolute left-5 top-12 bottom-0 w-px bg-apple-border/30 dark:bg-[var(--border-default)]" />
      )}
      <div className="flex gap-4">
        <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/10">
          <Wrench className="h-5 w-5 text-[var(--brand)]" />
        </div>
        <div className="flex-1 pb-6">
          <AppleCard hover={false}>
            <AppleCardContent>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <EventTypeBadge type={entry.eventType} />
                    <SourceBadge source={entry.source} />
                    <span className="text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                      {formatDate(entry.eventDate)}
                    </span>
                  </div>
                  <p className="text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mt-1">
                    {entry.description}
                  </p>
                  <div className="flex flex-wrap gap-4 mt-2 text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                    {entry.shopName && <span>📍 {entry.shopName}</span>}
                    {entry.mileage != null && <span>🔢 {entry.mileage.toLocaleString('it-IT')} km</span>}
                  </div>
                </div>
                {costEur != null && (
                  <span className="text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] whitespace-nowrap">
                    {costEur.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                  </span>
                )}
              </div>

              {entry.mileage != null && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="mt-2 flex items-center gap-1 text-xs font-medium text-[var(--brand)] hover:text-[var(--brand)]/80 transition-colors"
                >
                  {expanded ? <><ChevronUp className="h-3 w-3" /> Meno</> : <><ChevronDown className="h-3 w-3" /> Dettagli</>}
                </button>
              )}

              {expanded && (
                <div className="mt-3 pt-3 border-t border-[var(--border-default)]/20 dark:border-[var(--border-default)] text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] space-y-1">
                  <p>Chilometraggio: <span className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">{entry.mileage?.toLocaleString('it-IT')} km</span></p>
                  {entry.shopName && <p>Officina: <span className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">{entry.shopName}</span></p>}
                </div>
              )}
            </AppleCardContent>
          </AppleCard>
        </div>
      </div>
    </div>
  );
}

interface ServiceHistoryProps {
  vehicleId: string;
}

export function ServiceHistory({ vehicleId }: ServiceHistoryProps) {
  const { data, error, isLoading, mutate } = useSWR<HistoryEntry[]>(
    `/api/vehicle-history/${vehicleId}`,
    fetcher,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-10 w-10 text-[var(--status-error)]/40 mb-3" />
        <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Impossibile caricare lo storico</p>
        <AppleButton variant="ghost" className="mt-3" onClick={() => mutate()}>Riprova</AppleButton>
      </div>
    );
  }

  const entries = Array.isArray(data) ? data : [];

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="h-12 w-12 text-[var(--text-tertiary)]/40 mb-4" />
        <p className="text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Nessuno storico</p>
        <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-1">
          Gli interventi completati appariranno qui automaticamente.
        </p>
      </div>
    );
  }

  const totalEur = entries.reduce((sum, e) => sum + (e.costCents ?? 0), 0) / 100;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <AppleCard hover={false}>
          <AppleCardContent>
            <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Interventi</p>
            <p className="text-title-1 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] mt-1">{entries.length}</p>
          </AppleCardContent>
        </AppleCard>
        <AppleCard hover={false}>
          <AppleCardContent>
            <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Spesa Totale</p>
            <p className="text-title-1 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] mt-1">
              {totalEur.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
            </p>
          </AppleCardContent>
        </AppleCard>
        <AppleCard hover={false}>
          <AppleCardContent>
            <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Media/Intervento</p>
            <p className="text-title-1 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] mt-1">
              {(entries.length > 0 ? totalEur / entries.length : 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
            </p>
          </AppleCardContent>
        </AppleCard>
      </div>

      {/* Timeline */}
      <div>
        {entries.map((entry, index) => (
          <HistoryCard key={entry.id} entry={entry} isLast={index === entries.length - 1} />
        ))}
      </div>
    </div>
  );
}
