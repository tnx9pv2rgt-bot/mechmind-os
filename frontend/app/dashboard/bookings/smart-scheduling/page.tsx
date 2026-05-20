'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import {
  Sparkles,
  Calendar,
  Clock,
  Wrench,
  Users,
  Loader2,
  CheckCircle,
  BarChart3,
  ArrowRight,
  Zap,
  TrendingUp,
  Timer,
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { ErrorState } from '@/components/patterns/error-state';
import { formatDate, formatDateTime } from '@/lib/utils/format';

// --- Types ---

interface SuggestedSlot {
  id: string;
  dateTime: string;
  bayName: string;
  technicianName: string;
  aiScore: number;
  reasoning: string;
}

interface OptimizationResult {
  timeSavedMinutes: number;
  currentUtilization: number;
  optimizedUtilization: number;
  changes: OptimizationChange[];
}

interface OptimizationChange {
  bookingId: string;
  serviceName: string;
  currentSlot: string;
  suggestedSlot: string;
}

interface CapacityDay {
  date: string;
  utilization: number;
}

// --- Component ---

export default function SmartSchedulingPage(): React.ReactElement {
  // Form state
  const [serviceType, setServiceType] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('60');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [preferredDate, setPreferredDate] = useState('');

  // Results state
  const [suggestedSlots, setSuggestedSlots] = useState<SuggestedSlot[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);

  // Optimizer state
  const [optimizeDate, setOptimizeDate] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);

  // Capacity forecast
  const { data: capacityData, error: capacityError } = useSWR<{
    data: CapacityDay[];
  }>('/api/ai-scheduling?action=capacity-forecast', fetcher);

  const capacity = capacityData?.data ?? [];

  const serviceTypes = [
    'Tagliando',
    'Cambio olio',
    'Freni',
    'Pneumatici',
    'Diagnosi',
    'Carrozzeria',
    'Revisione',
    'Climatizzatore',
    'Elettronica',
    'Altro',
  ];

  const handleSuggestSlots = useCallback(async () => {
    if (!serviceType) {
      toast.error('Seleziona un tipo di servizio');
      return;
    }
    if (!preferredDate) {
      toast.error('Seleziona una data preferita');
      return;
    }

    setIsSuggesting(true);
    setSuggestedSlots([]);

    try {
      const response = await fetch('/api/ai-scheduling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'suggest-slots',
          serviceType,
          estimatedDuration: parseInt(estimatedDuration, 10),
          requiredSkills: requiredSkills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          preferredDate,
        }),
      });

      if (!response.ok) throw new Error(`Errore ${response.status}`);
      const data = (await response.json()) as { data: SuggestedSlot[] };
      setSuggestedSlots(data.data ?? []);
      if ((data.data ?? []).length === 0) {
        toast.info('Nessuno slot disponibile trovato per i criteri selezionati');
      } else {
        toast.success(`${data.data.length} slot suggeriti`);
      }
    } catch {
      toast.error('Errore nel calcolo degli slot ottimali');
    } finally {
      setIsSuggesting(false);
    }
  }, [serviceType, estimatedDuration, requiredSkills, preferredDate]);

  const handleBookSlot = useCallback(
    async (slot: SuggestedSlot) => {
      setBookingSlotId(slot.id);
      try {
        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            dateTime: slot.dateTime,
            bayName: slot.bayName,
            technicianName: slot.technicianName,
            serviceType,
            estimatedDuration: parseInt(estimatedDuration, 10),
          }),
        });

        if (!response.ok) throw new Error(`Errore ${response.status}`);
        toast.success('Prenotazione creata con successo');
      } catch {
        toast.error('Errore nella creazione della prenotazione');
      } finally {
        setBookingSlotId(null);
      }
    },
    [serviceType, estimatedDuration],
  );

  const handleOptimizeDay = useCallback(async () => {
    if (!optimizeDate) {
      toast.error('Seleziona una data da ottimizzare');
      return;
    }

    setIsOptimizing(true);
    setOptimization(null);

    try {
      const response = await fetch('/api/ai-scheduling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'optimize-day',
          date: optimizeDate,
        }),
      });

      if (!response.ok) throw new Error(`Errore ${response.status}`);
      const data = (await response.json()) as { data: OptimizationResult };
      setOptimization(data.data);
      toast.success('Ottimizzazione completata');
    } catch {
      toast.error('Errore nell\'ottimizzazione della giornata');
    } finally {
      setIsOptimizing(false);
    }
  }, [optimizeDate]);

  const inputClassName = 'w-full rounded-xl border border-[var(--border-default)]/20 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] px-3 py-2.5 text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue min-h-[44px]';

  return (
    <div>
      {/* Header */}
      <header className="">
        <div className="px-8 py-5">
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Prenotazioni', href: '/dashboard/bookings' },
              { label: 'Schedulazione Smart' },
            ]}
          />
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-[var(--brand)]" />
            </div>
            <div>
              <h1 className="text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                Schedulazione Smart AI
              </h1>
              <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-1">
                Ottimizza la pianificazione dell&apos;officina con suggerimenti intelligenti basati su AI.
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-8 space-y-6">
        {/* Slot Suggestion Form */}
        <AppleCard hover={false}>
          <AppleCardHeader>
            <h2 className="text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[var(--brand)]" />
              Trova slot ottimali
            </h2>
          </AppleCardHeader>
          <AppleCardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-1.5">
                  Tipo di servizio
                </label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className={inputClassName}
                >
                  <option value="">— Seleziona —</option>
                  {serviceTypes.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-1.5">
                  Durata stimata (min)
                </label>
                <input
                  type="number"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  min="15"
                  step="15"
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="block text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-1.5">
                  Competenze richieste
                </label>
                <input
                  type="text"
                  value={requiredSkills}
                  onChange={(e) => setRequiredSkills(e.target.value)}
                  placeholder="Es. elettronica, freni"
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="block text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-1.5">
                  Data preferita
                </label>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className={inputClassName}
                />
              </div>
            </div>

            <AppleButton
              onClick={handleSuggestSlots}
              disabled={isSuggesting}
              loading={isSuggesting}
              icon={<Sparkles className="h-4 w-4" />}
            >
              {isSuggesting ? 'Calcolo in corso...' : 'Suggerisci slot ottimali'}
            </AppleButton>
          </AppleCardContent>
        </AppleCard>

        {/* Suggested Slots */}
        {isSuggesting && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--brand)]" />
          </div>
        )}

        {suggestedSlots.length > 0 && !isSuggesting && (
          <div>
            <h2 className="text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-4">
              Slot suggeriti
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {suggestedSlots.slice(0, 3).map((slot, i) => (
                <AppleCard
                  key={slot.id}
                  hover={false}
                  className={i === 0 ? 'ring-2 ring-apple-blue' : ''}
                >
                  <AppleCardContent>
                    <div className="relative">
                      {i === 0 && (
                        <span className="absolute -top-8 left-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-footnote font-semibold bg-[var(--brand)] text-[var(--text-on-brand)]">
                          <Zap className="h-3 w-3" />
                          Migliore
                        </span>
                      )}

                      <div className="space-y-4 pt-1">
                        <div>
                          <div className="flex items-center gap-2 text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-1">
                            <Calendar className="h-4 w-4" />
                            {formatDateTime(slot.dateTime)}
                          </div>
                          <div className="flex items-center gap-2 text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-1">
                            <Wrench className="h-4 w-4" />
                            {slot.bayName}
                          </div>
                          <div className="flex items-center gap-2 text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                            <Users className="h-4 w-4" />
                            {slot.technicianName}
                          </div>
                        </div>

                        {/* AI Score */}
                        <div>
                          <div className="flex items-center justify-between text-footnote mb-1">
                            <span className="text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                              Punteggio AI
                            </span>
                            <span className="font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                              {slot.aiScore}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-[var(--surface-secondary)] dark:bg-[var(--surface-hover)] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                slot.aiScore >= 80
                                  ? 'bg-[var(--status-success)]'
                                  : slot.aiScore >= 60
                                    ? 'bg-[var(--status-warning)]'
                                    : 'bg-[var(--status-error)]'
                              }`}
                              style={{ width: `${slot.aiScore}%` }}
                            />
                          </div>
                        </div>

                        <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] italic">
                          {slot.reasoning}
                        </p>

                        <AppleButton
                          onClick={() => handleBookSlot(slot)}
                          disabled={bookingSlotId === slot.id}
                          loading={bookingSlotId === slot.id}
                          fullWidth
                          variant={i === 0 ? 'primary' : 'secondary'}
                          icon={<CheckCircle className="h-4 w-4" />}
                        >
                          Prenota
                        </AppleButton>
                      </div>
                    </div>
                  </AppleCardContent>
                </AppleCard>
              ))}
            </div>
          </div>
        )}

        {/* Day Optimizer */}
        <AppleCard hover={false}>
          <AppleCardHeader>
            <h2 className="text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
              <Zap className="h-5 w-5 text-[var(--status-warning)]" />
              Ottimizzazione giornata
            </h2>
          </AppleCardHeader>
          <AppleCardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <label className="block text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-1.5">
                  Data da ottimizzare
                </label>
                <input
                  type="date"
                  value={optimizeDate}
                  onChange={(e) => setOptimizeDate(e.target.value)}
                  className={inputClassName}
                />
              </div>
              <div className="flex items-end">
                <AppleButton
                  onClick={handleOptimizeDay}
                  disabled={isOptimizing}
                  loading={isOptimizing}
                  variant="secondary"
                  icon={<Zap className="h-4 w-4" />}
                >
                  {isOptimizing ? 'Ottimizzazione...' : 'Ottimizza giornata'}
                </AppleButton>
              </div>
            </div>

            {isOptimizing && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--brand)]" />
              </div>
            )}

            {optimization && !isOptimizing && (
              <div className="space-y-4">
                {/* Before / After Comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)]/30 border border-[var(--status-error)]/30 dark:border-[var(--status-error)] p-4 text-center">
                    <p className="text-footnote text-[var(--status-error)] mb-1">
                      Utilizzo attuale
                    </p>
                    <p className="text-title-1 font-bold text-[var(--status-error)]">
                      {optimization.currentUtilization}%
                    </p>
                  </div>
                  <div className="flex items-center justify-center">
                    <ArrowRight className="h-6 w-6 text-[var(--text-tertiary)]" />
                  </div>
                  <div className="rounded-xl bg-[var(--status-success-subtle)] dark:bg-[var(--status-success)]/40/30 border border-[var(--status-success)]/30 dark:border-[var(--status-success)] p-4 text-center">
                    <p className="text-footnote text-[var(--status-success)] mb-1">
                      Utilizzo ottimizzato
                    </p>
                    <p className="text-title-1 font-bold text-[var(--status-success)]">
                      {optimization.optimizedUtilization}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--brand)]/5 dark:bg-[var(--status-info)]/40/30 border border-[var(--brand)]/20 dark:border-[var(--status-info)]">
                  <Timer className="h-5 w-5 text-[var(--brand)]" />
                  <p className="text-body font-medium text-[var(--brand)]">
                    Tempo risparmiato: {optimization.timeSavedMinutes} minuti
                  </p>
                </div>

                {optimization.changes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-body font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                      Modifiche suggerite:
                    </p>
                    {optimization.changes.map((change, i) => (
                      <div
                        key={i}
                        className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)] text-body"
                      >
                        <span className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                          {change.serviceName}
                        </span>
                        <span className="text-[var(--text-tertiary)] hidden sm:inline">
                          |
                        </span>
                        <span className="text-[var(--status-error)] line-through text-footnote">
                          {change.currentSlot}
                        </span>
                        <ArrowRight className="h-3 w-3 text-[var(--text-tertiary)] hidden sm:inline" />
                        <span className="text-[var(--status-success)] text-footnote">
                          {change.suggestedSlot}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </AppleCardContent>
        </AppleCard>

        {/* Capacity Forecast */}
        <AppleCard hover={false}>
          <AppleCardHeader>
            <h2 className="text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[var(--status-success)]" />
              Previsione capacita — prossime 2 settimane
            </h2>
          </AppleCardHeader>
          <AppleCardContent>
            {capacityError ? (
              <ErrorState
                variant="server-error"
                onRetry={() => window.location.reload()}
                className="py-8"
              />
            ) : !capacityData ? (
              <div className="flex items-end gap-2 h-40">
                {Array.from({ length: 14 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 animate-pulse rounded-t bg-[var(--surface-secondary)] dark:bg-[var(--surface-hover)]"
                    style={{ height: `${30 + Math.random() * 70}%` }}
                  />
                ))}
              </div>
            ) : capacity.length === 0 ? (
              <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-center py-8">
                Nessun dato di capacita disponibile
              </p>
            ) : (
              <div className="flex items-end gap-2 h-48">
                {capacity.map((day) => {
                  const barColor =
                    day.utilization >= 90
                      ? 'bg-[var(--status-error)]'
                      : day.utilization >= 70
                        ? 'bg-[var(--status-warning)]'
                        : 'bg-[var(--status-success)]';

                  const dateLabel = new Date(day.date).toLocaleDateString(
                    'it-IT',
                    { weekday: 'short', day: 'numeric' },
                  );

                  return (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <span className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                        {day.utilization}%
                      </span>
                      <div className="w-full flex-1 flex items-end">
                        <div
                          className={`w-full rounded-t ${barColor} transition-all duration-300`}
                          style={{ height: `${day.utilization}%` }}
                          title={`${dateLabel}: ${day.utilization}%`}
                        />
                      </div>
                      <span className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                        {dateLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-4 mt-4 text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-sm bg-[var(--status-success)]" />
                &lt;70%
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-sm bg-[var(--status-warning)]" />
                70-90%
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-sm bg-[var(--status-error)]" />
                &gt;90%
              </div>
            </div>
          </AppleCardContent>
        </AppleCard>
      </div>
    </div>
  );
}
