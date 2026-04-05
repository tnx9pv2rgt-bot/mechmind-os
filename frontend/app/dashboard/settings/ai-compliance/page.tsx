'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  ShieldCheck,
  PenLine,
} from 'lucide-react';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface AiDecision {
  id: string;
  featureName: string;
  modelUsed: string;
  inputSummary: string;
  outputSummary: string;
  confidence: string | number | null;
  humanReviewed: boolean;
  humanOverridden: boolean;
  humanDecision: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  entityType: string | null;
  entityId: string | null;
  userId: string | null;
  processingTimeMs: number | null;
  createdAt: string;
}

interface DecisionsResponse {
  data?: AiDecision[];
  total?: number;
}

interface DashboardResponse {
  data?: {
    totalDecisions: number;
    overrideRate: number;
    avgConfidence: number;
    pendingReview: number;
    byFeature: Record<string, number>;
  };
  totalDecisions?: number;
  overrideRate?: number;
  avgConfidence?: number;
  pendingReview?: number;
  byFeature?: Record<string, number>;
}

const FEATURE_OPTIONS = [
  { value: 'damage_analysis', label: 'Analisi danni' },
  { value: 'diagnosis_suggestion', label: 'Suggerimento diagnosi' },
  { value: 'price_estimate', label: 'Stima prezzo' },
  { value: 'parts_recommendation', label: 'Raccomandazione ricambi' },
];

const FEATURE_LABELS: Record<string, string> = {
  damage_analysis: 'Analisi danni',
  diagnosis_suggestion: 'Suggerimento diagnosi',
  price_estimate: 'Stima prezzo',
  parts_recommendation: 'Raccomandazione ricambi',
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Errore caricamento');
  return res.json() as Promise<T>;
};

export default function AiCompliancePage() {
  const [page, setPage] = useState(1);
  const [filterFeature, setFilterFeature] = useState('all');
  const [filterReviewed, setFilterReviewed] = useState('all');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [selectedDecision, setSelectedDecision] = useState<AiDecision | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<AiDecision | null>(null);
  const [overrideText, setOverrideText] = useState('');
  const [isOverride, setIsOverride] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '20');
    if (filterFeature !== 'all') params.set('featureName', filterFeature);
    if (filterReviewed !== 'all') params.set('humanReviewed', filterReviewed);
    if (filterFrom) params.set('dateFrom', filterFrom);
    if (filterTo) params.set('dateTo', filterTo);
    return `/api/ai-compliance/decisions?${params.toString()}`;
  }, [page, filterFeature, filterReviewed, filterFrom, filterTo]);

  const { data: decisionsData, isLoading, error, mutate } = useSWR<DecisionsResponse>(
    buildUrl(),
    fetcher,
    { onError: () => toast.error('Errore caricamento decisioni IA') },
  );

  const { data: dashboardRaw } = useSWR<DashboardResponse>(
    '/api/ai-compliance/dashboard',
    fetcher,
    { onError: () => toast.error('Errore caricamento statistiche IA') },
  );

  const decisions = decisionsData?.data ?? [];
  const total = decisionsData?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const dashboard = dashboardRaw?.data ?? dashboardRaw ?? {
    totalDecisions: 0,
    overrideRate: 0,
    avgConfidence: 0,
    pendingReview: 0,
    byFeature: {},
  };

  const getConfidence = (val: string | number | null): number | null => {
    if (val == null) return null;
    return Number(val);
  };

  const formatConfidence = (val: string | number | null): string => {
    const n = getConfidence(val);
    if (n == null) return '-';
    return `${Math.round(n * 100)}%`;
  };

  const handleReview = async () => {
    if (!reviewTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/ai-compliance/decisions/${reviewTarget.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          humanOverridden: isOverride,
          humanDecision: isOverride ? overrideText : undefined,
        }),
      });
      if (!res.ok) throw new Error('Errore durante la revisione');
      toast.success(isOverride ? 'Decisione sovrascritta' : 'Decisione confermata');
      setReviewDialogOpen(false);
      setReviewTarget(null);
      setOverrideText('');
      setIsOverride(false);
      await mutate();
    } catch {
      toast.error('Errore durante la revisione della decisione IA');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading
  if (isLoading && decisions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-apple-blue" />
      </div>
    );
  }

  // Error
  if (error && decisions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <AppleCard className="max-w-md w-full">
          <AppleCardContent className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)] mb-2">
              Errore di caricamento
            </h3>
            <p className="text-body text-apple-gray dark:text-[var(--text-secondary)]">
              Impossibile caricare il registro delle decisioni IA.
            </p>
          </AppleCardContent>
        </AppleCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header>
        <div className="px-4 sm:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                <h1 className="text-headline text-apple-dark dark:text-[var(--text-primary)]">
                  Conformità IA — EU AI Act
                </h1>
              </div>
              <p className="text-apple-gray dark:text-[var(--text-secondary)] text-body mt-1">
                Registro trasparenza, revisione umana e audit delle decisioni assistite da IA
              </p>
            </div>
            <Badge className="bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200 border-violet-200 dark:border-violet-700 self-start">
              Reg. UE 2024/1689
            </Badge>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
            <AppleCard>
              <AppleCardContent className="py-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/40">
                    <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)]">
                      Decisioni IA Totali
                    </p>
                    <p className="text-title-1 font-bold text-apple-dark dark:text-[var(--text-primary)]">
                      {dashboard.totalDecisions ?? 0}
                    </p>
                  </div>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <AppleCard>
              <AppleCardContent className="py-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40">
                    <PenLine className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)]">
                      Tasso Sovrascrittura
                    </p>
                    <p className="text-title-1 font-bold text-apple-dark dark:text-[var(--text-primary)]">
                      {Math.round((dashboard.overrideRate ?? 0) * 100)}%
                    </p>
                  </div>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <AppleCard>
              <AppleCardContent className="py-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/40">
                    <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)]">
                      Confidenza Media
                    </p>
                    <p className="text-title-1 font-bold text-apple-dark dark:text-[var(--text-primary)]">
                      {Math.round((dashboard.avgConfidence ?? 0) * 100)}%
                    </p>
                  </div>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <AppleCard>
              <AppleCardContent className="py-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/40">
                    <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)]">
                      In Attesa Revisione
                    </p>
                    <p className="text-title-1 font-bold text-apple-dark dark:text-[var(--text-primary)]">
                      {dashboard.pendingReview ?? 0}
                    </p>
                  </div>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        </div>

        {/* Filters */}
        <AppleCard>
          <AppleCardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Select value={filterFeature} onValueChange={(v) => { setFilterFeature(v); setPage(1); }}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Funzionalità" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le funzionalità</SelectItem>
                  {FEATURE_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterReviewed} onValueChange={(v) => { setFilterReviewed(v); setPage(1); }}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Stato revisione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="true">Revisionato</SelectItem>
                  <SelectItem value="false">In attesa</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={filterFrom}
                onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }}
                className="h-11 rounded-xl"
                aria-label="Data inizio"
              />
              <Input
                type="date"
                value={filterTo}
                onChange={(e) => { setFilterTo(e.target.value); setPage(1); }}
                className="h-11 rounded-xl"
                aria-label="Data fine"
              />
            </div>
          </AppleCardContent>
        </AppleCard>

        {/* Decisions Table */}
        <AppleCard>
          <AppleCardHeader>
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              <h2 className="text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]">
                Registro Decisioni IA ({total})
              </h2>
            </div>
          </AppleCardHeader>
          <AppleCardContent>
            {decisions.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-apple-border/30 dark:border-[var(--border-default)]">
                        <th className="text-left py-3 px-4 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]">Data</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]">Funzionalità</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]">Modello</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]">Confidenza</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]">Revisione Umana</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]">Stato</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]">Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {decisions.map((dec, index) => (
                        <motion.tr
                          key={dec.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.02 }}
                          className="border-b border-apple-border/20 dark:border-[var(--border-default)]/50 hover:bg-apple-light-gray/30 dark:hover:bg-[var(--surface-hover)] transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3 text-apple-gray flex-shrink-0" />
                              <span className="text-body text-apple-dark dark:text-[var(--text-primary)] whitespace-nowrap">
                                {new Date(dec.createdAt).toLocaleString('it-IT')}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className="bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300 border-0">
                              {FEATURE_LABELS[dec.featureName] ?? dec.featureName}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-body text-apple-dark dark:text-[var(--text-primary)] font-mono text-sm">
                              {dec.modelUsed}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-body text-apple-dark dark:text-[var(--text-primary)]">
                              {formatConfidence(dec.confidence)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {dec.humanReviewed ? (
                              dec.humanOverridden ? (
                                <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-0">
                                  Sovrascritta
                                </Badge>
                              ) : (
                                <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-0">
                                  Confermata
                                </Badge>
                              )
                            ) : (
                              <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-0">
                                In attesa
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {dec.humanReviewed ? (
                              <CheckCircle2 className="w-4 h-4 text-apple-green" />
                            ) : (
                              <XCircle className="w-4 h-4 text-orange-400" />
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <AppleButton
                                variant="ghost"
                                size="sm"
                                className="min-w-[44px] min-h-[44px]"
                                onClick={() => setSelectedDecision(dec)}
                              >
                                <Eye className="w-4 h-4" />
                              </AppleButton>
                              {!dec.humanReviewed && (
                                <AppleButton
                                  variant="ghost"
                                  size="sm"
                                  className="min-w-[44px] min-h-[44px] text-violet-600 dark:text-violet-400"
                                  onClick={() => {
                                    setReviewTarget(dec);
                                    setReviewDialogOpen(true);
                                  }}
                                >
                                  <PenLine className="w-4 h-4" />
                                </AppleButton>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-apple-border/20 dark:border-[var(--border-default)]/50">
                    <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)]">
                      Pagina {page} di {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <AppleButton
                        variant="ghost"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="min-w-[44px] min-h-[44px]"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </AppleButton>
                      <AppleButton
                        variant="ghost"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="min-w-[44px] min-h-[44px]"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </AppleButton>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Sparkles className="w-12 h-12 text-apple-gray/30 mx-auto mb-4" />
                <h3 className="text-body font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1">
                  Nessuna decisione IA registrata
                </h3>
                <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)]">
                  Le decisioni assistite da IA verranno registrate qui automaticamente.
                </p>
              </div>
            )}
          </AppleCardContent>
        </AppleCard>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedDecision} onOpenChange={() => setSelectedDecision(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dettagli Decisione IA</DialogTitle>
          </DialogHeader>
          {selectedDecision && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)]">Data</p>
                  <p className="text-body text-apple-dark dark:text-[var(--text-primary)]">
                    {new Date(selectedDecision.createdAt).toLocaleString('it-IT')}
                  </p>
                </div>
                <div>
                  <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)]">Funzionalità</p>
                  <p className="text-body text-apple-dark dark:text-[var(--text-primary)]">
                    {FEATURE_LABELS[selectedDecision.featureName] ?? selectedDecision.featureName}
                  </p>
                </div>
                <div>
                  <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)]">Modello</p>
                  <p className="text-body text-apple-dark dark:text-[var(--text-primary)] font-mono text-sm">{selectedDecision.modelUsed}</p>
                </div>
                <div>
                  <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)]">Confidenza</p>
                  <p className="text-body text-apple-dark dark:text-[var(--text-primary)]">{formatConfidence(selectedDecision.confidence)}</p>
                </div>
                {selectedDecision.entityType && (
                  <div>
                    <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)]">Entità</p>
                    <p className="text-body text-apple-dark dark:text-[var(--text-primary)]">
                      {selectedDecision.entityType} ({selectedDecision.entityId})
                    </p>
                  </div>
                )}
                {selectedDecision.processingTimeMs != null && (
                  <div>
                    <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)]">Tempo elaborazione</p>
                    <p className="text-body text-apple-dark dark:text-[var(--text-primary)]">{selectedDecision.processingTimeMs} ms</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)] mb-2">Input (sanitizzato)</p>
                <pre className="p-4 bg-apple-light-gray/50 dark:bg-[var(--surface-hover)] rounded-xl text-sm overflow-auto max-h-32 text-apple-dark dark:text-[var(--text-primary)]">
                  {selectedDecision.inputSummary}
                </pre>
              </div>
              <div>
                <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)] mb-2">Output IA</p>
                <pre className="p-4 bg-apple-light-gray/50 dark:bg-[var(--surface-hover)] rounded-xl text-sm overflow-auto max-h-32 text-apple-dark dark:text-[var(--text-primary)]">
                  {selectedDecision.outputSummary}
                </pre>
              </div>
              {selectedDecision.humanReviewed && (
                <div className="border-t border-apple-border/20 dark:border-[var(--border-default)]/50 pt-4">
                  <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)] mb-2">Revisione Umana</p>
                  <div className="flex items-center gap-2 mb-2">
                    {selectedDecision.humanOverridden ? (
                      <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-0">Sovrascritta</Badge>
                    ) : (
                      <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-0">Confermata</Badge>
                    )}
                    {selectedDecision.reviewedAt && (
                      <span className="text-footnote text-apple-gray dark:text-[var(--text-secondary)]">
                        il {new Date(selectedDecision.reviewedAt).toLocaleString('it-IT')}
                      </span>
                    )}
                  </div>
                  {selectedDecision.humanDecision && (
                    <pre className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-sm overflow-auto max-h-32 text-apple-dark dark:text-[var(--text-primary)]">
                      {selectedDecision.humanDecision}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setReviewDialogOpen(false);
          setReviewTarget(null);
          setOverrideText('');
          setIsOverride(false);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Revisione Decisione IA</DialogTitle>
          </DialogHeader>
          {reviewTarget && (
            <div className="space-y-4 py-4">
              <p className="text-body text-apple-gray dark:text-[var(--text-secondary)]">
                Rivedi la decisione &ldquo;{FEATURE_LABELS[reviewTarget.featureName] ?? reviewTarget.featureName}&rdquo;
                con confidenza {formatConfidence(reviewTarget.confidence)}.
              </p>
              <div>
                <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)] mb-2">Output IA</p>
                <pre className="p-3 bg-apple-light-gray/50 dark:bg-[var(--surface-hover)] rounded-xl text-sm overflow-auto max-h-24 text-apple-dark dark:text-[var(--text-primary)]">
                  {reviewTarget.outputSummary}
                </pre>
              </div>

              <div className="flex gap-3">
                <AppleButton
                  variant={!isOverride ? 'primary' : 'secondary'}
                  onClick={() => setIsOverride(false)}
                  className="flex-1 min-h-[44px]"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Conferma
                </AppleButton>
                <AppleButton
                  variant={isOverride ? 'primary' : 'secondary'}
                  onClick={() => setIsOverride(true)}
                  className="flex-1 min-h-[44px]"
                >
                  <PenLine className="w-4 h-4 mr-2" />
                  Sovrascrivi
                </AppleButton>
              </div>

              {isOverride && (
                <div>
                  <label htmlFor="override-text" className="text-footnote text-apple-gray dark:text-[var(--text-secondary)] block mb-2">
                    La tua decisione
                  </label>
                  <textarea
                    id="override-text"
                    value={overrideText}
                    onChange={(e) => setOverrideText(e.target.value)}
                    placeholder="Descrivi la tua decisione alternativa..."
                    className="w-full rounded-xl border border-apple-border/30 dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-hover)] p-3 text-sm text-apple-dark dark:text-[var(--text-primary)] min-h-[80px] resize-y"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <AppleButton variant="secondary" onClick={() => setReviewDialogOpen(false)} className="min-h-[44px]">
              Annulla
            </AppleButton>
            <AppleButton
              variant="primary"
              onClick={handleReview}
              disabled={submitting || (isOverride && !overrideText.trim())}
              className="min-h-[44px]"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isOverride ? 'Salva sovrascrittura' : 'Conferma decisione'}
            </AppleButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
