'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import {
  Cpu,
  Search,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Wrench,
  FileText,
  ChevronRight,
  Loader2,
  Car,
  Stethoscope,
  FlaskConical,
  History,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils/format';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Vehicle {
  id: string;
  licensePlate: string;
  make: string;
  model: string;
  year?: number;
}

interface DiagnosticResult {
  severity: 'low' | 'medium' | 'high' | 'critical';
  probableCause: string;
  confidence: number;
  description: string;
  repairs: RecommendedRepair[];
  additionalTests: string[];
}

interface RecommendedRepair {
  description: string;
  estimatedPartsCost: number;
  estimatedLaborHours: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface DiagnosticHistory {
  id: string;
  createdAt: string;
  type: 'dtc' | 'symptoms';
  input: string;
  severity: string;
  probableCause: string;
}

// ─── Severity / Priority Config ──────────────────────────────────────────────

const severityConfig: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: 'Bassa', color: 'text-[var(--status-success)] dark:text-[var(--status-success)]', bg: 'bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)]' },
  medium: { label: 'Media', color: 'text-[var(--status-warning)] dark:text-[var(--status-warning)]', bg: 'bg-[var(--status-warning)]/20 dark:bg-[var(--status-warning-subtle)]' },
  high: { label: 'Alta', color: 'text-[var(--status-warning)] dark:text-[var(--status-warning)]', bg: 'bg-[var(--status-warning)]/10 dark:bg-[var(--status-warning-subtle)]' },
  critical: { label: 'Critica', color: 'text-[var(--status-error)] dark:text-[var(--status-error)]', bg: 'bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)]' },
};

const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: 'Bassa', color: 'text-[var(--status-success)] dark:text-[var(--status-success)]', bg: 'bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)]' },
  medium: { label: 'Media', color: 'text-[var(--status-warning)] dark:text-[var(--status-warning)]', bg: 'bg-[var(--status-warning)]/20 dark:bg-[var(--status-warning-subtle)]' },
  high: { label: 'Alta', color: 'text-[var(--status-warning)] dark:text-[var(--status-warning)]', bg: 'bg-[var(--status-warning)]/10 dark:bg-[var(--status-warning-subtle)]' },
  urgent: { label: 'Urgente', color: 'text-[var(--status-error)] dark:text-[var(--status-error)]', bg: 'bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)]' },
};

// ─── Animations ──────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const listItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function AIDiagnosticPage(): React.ReactElement {
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [activeTab, setActiveTab] = useState<'dtc' | 'symptoms'>('dtc');
  const [dtcCodes, setDtcCodes] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [vehicleSearch, setVehicleSearch] = useState('');

  // Fetch vehicles for selector
  const { data: vehiclesData, error: vehiclesError } = useSWR<{
    data: Vehicle[];
  }>('/api/vehicles?limit=100', fetcher);

  // Fetch history for selected vehicle
  const { data: historyData, mutate: mutateHistory } = useSWR<{
    data: DiagnosticHistory[];
  }>(
    selectedVehicleId
      ? `/api/ai-diagnostic?vehicleId=${selectedVehicleId}`
      : null,
    fetcher,
  );

  const vehicles = vehiclesData?.data ?? [];
  const history = historyData?.data ?? [];
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  const filteredVehicles = vehicleSearch
    ? vehicles.filter(
        (v) =>
          v.licensePlate.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
          `${v.make} ${v.model}`.toLowerCase().includes(vehicleSearch.toLowerCase()),
      )
    : vehicles;

  const handleAnalyze = useCallback(async () => {
    if (!selectedVehicleId) {
      toast.error('Seleziona un veicolo prima di procedere');
      return;
    }

    const input = activeTab === 'dtc' ? dtcCodes.trim() : symptoms.trim();
    if (!input) {
      toast.error(
        activeTab === 'dtc'
          ? 'Inserisci almeno un codice DTC'
          : 'Descrivi i sintomi del veicolo',
      );
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const response = await fetch('/api/ai-diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          vehicleId: selectedVehicleId,
          type: activeTab,
          input,
        }),
      });

      if (!response.ok) {
        throw new Error(`Errore ${response.status}`);
      }

      const data = (await response.json()) as { data: DiagnosticResult };
      setResult(data.data);
      await mutateHistory();
      toast.success('Analisi completata');
    } catch {
      toast.error('Errore durante l\'analisi diagnostica');
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedVehicleId, activeTab, dtcCodes, symptoms, mutateHistory]);

  return (
    <div>
      {/* Header */}
      <header className="">
        <div className="px-8 py-5">
          <h1 className="text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]">Diagnostica AI</h1>
          <p className="text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1">
            Analisi intelligente dei problemi del veicolo tramite codici DTC o descrizione dei sintomi
          </p>
        </div>
      </header>

      <motion.div
        className="p-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Input */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vehicle Selector */}
            <motion.div variants={listItemVariants}>
              <AppleCard hover={false}>
                <AppleCardContent>
                  <label className="block text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-2">
                    <Car className="inline h-4 w-4 mr-1" />
                    Seleziona veicolo
                  </label>

                  {vehiclesError ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <AlertCircle className="h-12 w-12 text-[var(--status-error)]/40 mb-4" />
                      <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                        Errore nel caricamento veicoli
                      </p>
                      <AppleButton variant="ghost" className="mt-4" onClick={() => window.location.reload()}>
                        Riprova
                      </AppleButton>
                    </div>
                  ) : !vehiclesData ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" />
                    </div>
                  ) : vehicles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Car className="h-12 w-12 text-[var(--text-tertiary)]/40 mb-4" />
                      <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                        Nessun veicolo disponibile
                      </p>
                      <AppleButton variant="ghost" className="mt-4" onClick={() => window.location.href = '/dashboard/vehicles/new'}>
                        Aggiungi veicolo
                      </AppleButton>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                        <Input
                          placeholder="Cerca per targa o modello..."
                          value={vehicleSearch}
                          onChange={(e) => setVehicleSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <select
                        value={selectedVehicleId}
                        onChange={(e) => {
                          setSelectedVehicleId(e.target.value);
                          setResult(null);
                        }}
                        className="w-full h-10 px-4 rounded-md border border-[var(--border-default)] dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="">-- Seleziona veicolo --</option>
                        {filteredVehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.licensePlate} -- {v.make} {v.model}
                            {v.year ? ` (${v.year})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Tabs */}
            <motion.div variants={listItemVariants}>
              <AppleCard hover={false}>
                <div className="flex border-b border-[var(--border-default)]/20 dark:border-[var(--border-default)]/50">
                  <button
                    onClick={() => setActiveTab('dtc')}
                    className={`flex-1 px-4 py-3 text-body font-medium min-h-[44px] transition-colors ${
                      activeTab === 'dtc'
                        ? 'text-[var(--brand)] border-b-2 border-[var(--brand)] bg-[var(--brand)]/5'
                        : 'text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <FileText className="inline h-4 w-4 mr-1.5" />
                    Codici DTC
                  </button>
                  <button
                    onClick={() => setActiveTab('symptoms')}
                    className={`flex-1 px-4 py-3 text-body font-medium min-h-[44px] transition-colors ${
                      activeTab === 'symptoms'
                        ? 'text-[var(--brand)] border-b-2 border-[var(--brand)] bg-[var(--brand)]/5'
                        : 'text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Stethoscope className="inline h-4 w-4 mr-1.5" />
                    Sintomi
                  </button>
                </div>

                <AppleCardContent>
                  {activeTab === 'dtc' ? (
                    <div className="space-y-3">
                      <label className="block text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                        Codici DTC (separati da virgola)
                      </label>
                      <Input
                        value={dtcCodes}
                        onChange={(e) => setDtcCodes(e.target.value)}
                        placeholder="Es. P0300, P0171, P0420"
                      />
                      <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                        Inserisci i codici diagnostici rilevati dalla centralina (es. P0300, B1234, C0045, U0100)
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="block text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                        Descrizione dei sintomi
                      </label>
                      <textarea
                        value={symptoms}
                        onChange={(e) => setSymptoms(e.target.value)}
                        placeholder="Descrivi i sintomi riscontrati, es: 'Il motore vibra a freddo e si spegne al minimo dopo circa 2 minuti...'"
                        rows={5}
                        className="w-full rounded-md border border-[var(--border-default)] dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                      />
                    </div>
                  )}

                  <div className="mt-4">
                    <AppleButton
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || !selectedVehicleId}
                      loading={isAnalyzing}
                      icon={isAnalyzing ? undefined : <Cpu className="h-4 w-4" />}
                    >
                      {isAnalyzing ? 'Analisi in corso...' : 'Analizza'}
                    </AppleButton>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Results */}
            {isAnalyzing && (
              <motion.div variants={listItemVariants}>
                <AppleCard hover={false}>
                  <AppleCardContent>
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-[var(--brand)]" />
                    </div>
                  </AppleCardContent>
                </AppleCard>
              </motion.div>
            )}

            {result && !isAnalyzing && (
              <div className="space-y-6">
                {/* Diagnosis Card */}
                <motion.div variants={listItemVariants}>
                  <AppleCard hover={false}>
                    <AppleCardHeader>
                      <div className="flex items-center justify-between w-full">
                        <h2 className="text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                          Diagnosi
                        </h2>
                        <span
                          className={`text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full ${
                            severityConfig[result.severity]?.bg ?? 'bg-[var(--border-default)] dark:bg-[var(--border-default)]'
                          } ${severityConfig[result.severity]?.color ?? 'text-[var(--text-tertiary)]'}`}
                        >
                          <ShieldAlert className="h-3 w-3 inline mr-1" />
                          {severityConfig[result.severity]?.label ?? result.severity}
                        </span>
                      </div>
                    </AppleCardHeader>
                    <AppleCardContent>
                      <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-4">
                        {result.description}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="rounded-2xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)] p-4">
                          <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-1">
                            Causa probabile
                          </p>
                          <p className="text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                            {result.probableCause}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)] p-4">
                          <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-1">
                            Confidenza
                          </p>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 rounded-full bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[var(--brand)] transition-all duration-500"
                                style={{ width: `${result.confidence}%` }}
                              />
                            </div>
                            <span className="text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                              {result.confidence}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </AppleCardContent>
                  </AppleCard>
                </motion.div>

                {/* Recommended Repairs */}
                {result.repairs.length > 0 && (
                  <motion.div variants={listItemVariants}>
                    <AppleCard hover={false}>
                      <AppleCardHeader>
                        <h2 className="text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                          <Wrench className="inline h-5 w-5 mr-2" />
                          Riparazioni consigliate
                        </h2>
                      </AppleCardHeader>
                      <AppleCardContent>
                        <div className="space-y-3">
                          {result.repairs.map((repair, i) => (
                            <div
                              key={i}
                              className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)]"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                                    {repair.description}
                                  </p>
                                  <span
                                    className={`text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full ${
                                      priorityConfig[repair.priority]?.bg ?? 'bg-[var(--border-default)] dark:bg-[var(--border-default)]'
                                    } ${priorityConfig[repair.priority]?.color ?? 'text-[var(--text-tertiary)]'}`}
                                  >
                                    {priorityConfig[repair.priority]?.label ?? repair.priority}
                                  </span>
                                </div>
                                <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                                  Ricambi: {formatCurrency(repair.estimatedPartsCost)} | Manodopera: {repair.estimatedLaborHours}h
                                </p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)] hidden sm:block" />
                            </div>
                          ))}
                        </div>
                      </AppleCardContent>
                    </AppleCard>
                  </motion.div>
                )}

                {/* Additional Tests */}
                {result.additionalTests.length > 0 && (
                  <motion.div variants={listItemVariants}>
                    <AppleCard hover={false}>
                      <AppleCardHeader>
                        <h2 className="text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                          <FlaskConical className="inline h-5 w-5 mr-2" />
                          Test aggiuntivi suggeriti
                        </h2>
                      </AppleCardHeader>
                      <AppleCardContent>
                        <ul className="space-y-2">
                          {result.additionalTests.map((test, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]"
                            >
                              <CheckCircle className="h-4 w-4 text-[var(--brand)] mt-0.5 shrink-0" />
                              {test}
                            </li>
                          ))}
                        </ul>
                      </AppleCardContent>
                    </AppleCard>
                  </motion.div>
                )}

                {/* Create Estimate Button */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href={`/dashboard/estimates/new?vehicleId=${selectedVehicleId}&fromDiagnostic=true`}>
                    <AppleButton
                      icon={<FileText className="h-4 w-4" />}
                      iconPosition="left"
                    >
                      Crea Preventivo
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </AppleButton>
                  </Link>
                </div>

                {/* Disclaimer */}
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-[var(--status-warning)]/5 dark:bg-[var(--status-warning)]/40/30 border border-[var(--status-warning)]/30 dark:border-[var(--status-warning)]">
                  <AlertTriangle className="h-5 w-5 text-[var(--status-warning)] shrink-0 mt-0.5" />
                  <p className="text-body text-[var(--status-warning)] dark:text-[var(--status-warning)]">
                    Suggerimento AI -- conferma richiesta dal tecnico. Questa analisi
                    e basata su modelli statistici e non sostituisce la diagnosi
                    professionale.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: History */}
          <div className="space-y-6">
            <motion.div variants={listItemVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <h2 className="text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                    <History className="inline h-5 w-5 mr-2" />
                    Storico diagnosi
                  </h2>
                </AppleCardHeader>
                <AppleCardContent>
                  {!selectedVehicleId ? (
                    <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-center py-8">
                      Seleziona un veicolo per visualizzare lo storico
                    </p>
                  ) : history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <History className="h-12 w-12 text-[var(--text-tertiary)]/40 mb-4" />
                      <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                        Nessuna diagnosi precedente
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {history.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-2xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)]"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                              {formatDate(item.createdAt)}
                            </span>
                            <span
                              className={`text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full ${
                                severityConfig[item.severity]?.bg ?? 'bg-[var(--border-default)] dark:bg-[var(--border-default)]'
                              } ${severityConfig[item.severity]?.color ?? 'text-[var(--text-tertiary)]'}`}
                            >
                              {severityConfig[item.severity]?.label ?? item.severity}
                            </span>
                          </div>
                          <p className="text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                            {item.probableCause}
                          </p>
                          <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-1 truncate">
                            {item.type === 'dtc' ? `DTC: ${item.input}` : item.input}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Selected Vehicle Info */}
            {selectedVehicle && (
              <motion.div variants={listItemVariants}>
                <AppleCard hover={false}>
                  <AppleCardContent>
                    <h3 className="text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-3">
                      Veicolo selezionato
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] flex items-center justify-center">
                        <Car className="h-5 w-5 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]" />
                      </div>
                      <div>
                        <p className="text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                          {selectedVehicle.make} {selectedVehicle.model}
                        </p>
                        <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                          {selectedVehicle.licensePlate}
                          {selectedVehicle.year ? ` | ${selectedVehicle.year}` : ''}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/vehicles/${selectedVehicle.id}`}
                      className="mt-3 flex items-center text-body text-[var(--brand)] hover:underline"
                    >
                      Dettagli veicolo
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Link>
                  </AppleCardContent>
                </AppleCard>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
