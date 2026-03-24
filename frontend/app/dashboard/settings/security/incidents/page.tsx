'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  Shield,
  AlertTriangle,
  Clock,
  Plus,
  ChevronRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
} from 'lucide-react';

// ─── Types ───

interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'DETECTED' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED' | 'REPORTED_ACN' | 'CLOSED';
  detectedAt: string;
  reportedAt: string | null;
  containedAt: string | null;
  resolvedAt: string | null;
  incidentType: string;
  affectedSystems: string[];
  affectedUsers: number | null;
  dataBreached: boolean;
  responseActions: string | null;
  rootCause: string | null;
  preventiveMeasures: string | null;
  createdAt: string;
}

interface Nis2Alert {
  incidentId: string;
  title: string;
  severity: string;
  detectedAt: string;
  hoursElapsed: number;
  earlyWarningOverdue: boolean;
  fullReportOverdue: boolean;
  status: string;
}

interface DashboardData {
  total: number;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  avgResolutionTimeHours: number | null;
  nis2Alerts: Nis2Alert[];
}

interface ComplianceData {
  mfaEnabledForAdmins: boolean;
  encryptionAtRest: boolean;
  auditLogging: boolean;
  incidentResponsePlanActive: boolean;
  openIncidents: number;
  avgResolutionTimeHours: number | null;
  nis2DeadlineAlerts: Nis2Alert[];
  complianceScore: number;
}

interface IncidentsResponse {
  data: SecurityIncident[];
  total: number;
  page: number;
  limit: number;
}

// ─── Helpers ───

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { data?: T } & T;
  return json.data ?? json;
}

const SEVERITY_COLORS: Record<string, string> = {
  LOW: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const SEVERITY_LABELS: Record<string, string> = {
  LOW: 'Bassa',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Critica',
};

const STATUS_LABELS: Record<string, string> = {
  DETECTED: 'Rilevato',
  INVESTIGATING: 'In indagine',
  CONTAINED: 'Contenuto',
  RESOLVED: 'Risolto',
  REPORTED_ACN: 'Segnalato ACN',
  CLOSED: 'Chiuso',
};

const STATUS_COLORS: Record<string, string> = {
  DETECTED: 'bg-red-500/20 text-red-400',
  INVESTIGATING: 'bg-yellow-500/20 text-yellow-400',
  CONTAINED: 'bg-blue-500/20 text-blue-400',
  RESOLVED: 'bg-green-500/20 text-green-400',
  REPORTED_ACN: 'bg-purple-500/20 text-purple-400',
  CLOSED: 'bg-gray-500/20 text-gray-400',
};

const NEXT_STATUS: Record<string, string> = {
  DETECTED: 'INVESTIGATING',
  INVESTIGATING: 'CONTAINED',
  CONTAINED: 'RESOLVED',
  RESOLVED: 'REPORTED_ACN',
  REPORTED_ACN: 'CLOSED',
};

const NEXT_STATUS_LABELS: Record<string, string> = {
  DETECTED: 'Avvia indagine',
  INVESTIGATING: 'Segna come contenuto',
  CONTAINED: 'Segna come risolto',
  RESOLVED: 'Segnala ad ACN',
  REPORTED_ACN: 'Chiudi incidente',
};

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  data_breach: 'Violazione dati',
  unauthorized_access: 'Accesso non autorizzato',
  malware: 'Malware',
  ddos: 'DDoS',
  phishing: 'Phishing',
  insider_threat: 'Minaccia interna',
  other: 'Altro',
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

// ─── Animations ───

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ─── Components ───

function ComplianceChecklist({ data }: { data: ComplianceData }): React.ReactElement {
  const checks = [
    { label: 'MFA attivata per tutti gli admin', ok: data.mfaEnabledForAdmins },
    { label: 'Crittografia a riposo (AES-256-CBC)', ok: data.encryptionAtRest },
    { label: 'Audit logging attivo', ok: data.auditLogging },
    { label: 'Piano risposta incidenti attivo', ok: data.incidentResponsePlanActive },
    { label: 'Nessuna scadenza NIS2 superata', ok: data.nis2DeadlineAlerts.length === 0 },
  ];

  return (
    <div className="space-y-3">
      {checks.map((c) => (
        <div key={c.label} className="flex items-center gap-3">
          {c.ok ? (
            <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 text-red-400 shrink-0" />
          )}
          <span className={c.ok ? 'text-gray-300' : 'text-red-300 font-medium'}>{c.label}</span>
        </div>
      ))}
    </div>
  );
}

function Nis2TimelineBadge({ incident }: { incident: SecurityIncident }): React.ReactElement {
  const elapsed = Date.now() - new Date(incident.detectedAt).getTime();
  const hours = Math.round(elapsed / (1000 * 60 * 60));
  const earlyOverdue = elapsed > 24 * 60 * 60 * 1000;
  const fullOverdue = elapsed > 72 * 60 * 60 * 1000;

  if (incident.status === 'REPORTED_ACN' || incident.status === 'CLOSED') {
    return <span className="text-xs text-green-400">Segnalato</span>;
  }

  if (fullOverdue) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">
        <AlertTriangle className="h-3 w-3" />
        {hours}h - Report 72h scaduto
      </span>
    );
  }

  if (earlyOverdue) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-400 bg-orange-500/20 px-2 py-0.5 rounded-full">
        <Clock className="h-3 w-3" />
        {hours}h - Allarme 24h scaduto
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
      <Clock className="h-3 w-3" />
      {hours}h trascorse
    </span>
  );
}

// ─── Create Incident Dialog ───

function CreateIncidentDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}): React.ReactElement | null {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    severity: 'MEDIUM' as string,
    incidentType: 'other' as string,
    detectedAt: new Date().toISOString().slice(0, 16),
    affectedSystems: '',
    affectedUsers: '',
    dataBreached: false,
  });

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!form.title || !form.description) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        title: form.title,
        description: form.description,
        severity: form.severity,
        incidentType: form.incidentType,
        detectedAt: new Date(form.detectedAt).toISOString(),
        affectedSystems: form.affectedSystems
          ? form.affectedSystems.split(',').map((s) => s.trim())
          : [],
        affectedUsers: form.affectedUsers ? parseInt(form.affectedUsers, 10) : undefined,
        dataBreached: form.dataBreached,
      };

      const res = await fetch('/api/security-incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }

      toast.success('Incidente di sicurezza creato');
      onCreated();
      onClose();
      setForm({
        title: '',
        description: '',
        severity: 'MEDIUM',
        incidentType: 'other',
        detectedAt: new Date().toISOString().slice(0, 16),
        affectedSystems: '',
        affectedUsers: '',
        dataBreached: false,
      });
    } catch (err) {
      toast.error(`Errore: ${err instanceof Error ? err.message : 'sconosciuto'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg rounded-2xl border border-[#4e4e4e] bg-[#1a1a1a] p-6 shadow-2xl"
      >
        <h2 className="text-lg font-semibold text-white mb-4">Nuovo incidente di sicurezza</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Titolo *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-[#4e4e4e] bg-[#0d0d0d] px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="es. Accesso non autorizzato al database"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Descrizione *</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-[#4e4e4e] bg-[#0d0d0d] px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descrizione dettagliata dell'incidente"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Gravita</label>
              <select
                value={form.severity}
                onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
                className="w-full rounded-lg border border-[#4e4e4e] bg-[#0d0d0d] px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="LOW">Bassa</option>
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
                <option value="CRITICAL">Critica</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Tipo</label>
              <select
                value={form.incidentType}
                onChange={(e) => setForm((f) => ({ ...f, incidentType: e.target.value }))}
                className="w-full rounded-lg border border-[#4e4e4e] bg-[#0d0d0d] px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="data_breach">Violazione dati</option>
                <option value="unauthorized_access">Accesso non autorizzato</option>
                <option value="malware">Malware</option>
                <option value="ddos">DDoS</option>
                <option value="phishing">Phishing</option>
                <option value="insider_threat">Minaccia interna</option>
                <option value="other">Altro</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Data/ora rilevamento</label>
            <input
              type="datetime-local"
              value={form.detectedAt}
              onChange={(e) => setForm((f) => ({ ...f, detectedAt: e.target.value }))}
              className="w-full rounded-lg border border-[#4e4e4e] bg-[#0d0d0d] px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Sistemi interessati (separati da virgola)
            </label>
            <input
              type="text"
              value={form.affectedSystems}
              onChange={(e) => setForm((f) => ({ ...f, affectedSystems: e.target.value }))}
              className="w-full rounded-lg border border-[#4e4e4e] bg-[#0d0d0d] px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="es. database, auth-service, api-gateway"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Utenti interessati</label>
              <input
                type="number"
                value={form.affectedUsers}
                onChange={(e) => setForm((f) => ({ ...f, affectedUsers: e.target.value }))}
                className="w-full rounded-lg border border-[#4e4e4e] bg-[#0d0d0d] px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
                min="0"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.dataBreached}
                  onChange={(e) => setForm((f) => ({ ...f, dataBreached: e.target.checked }))}
                  className="rounded border-[#4e4e4e] bg-[#0d0d0d] text-blue-500"
                />
                <span className="text-sm text-gray-300">Violazione dati personali</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Crea incidente
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Main Page ───

export default function SecurityIncidentsPage(): React.ReactElement {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [transitioningId, setTransitioningId] = useState<string | null>(null);

  // Fetch incidents
  const queryParams = new URLSearchParams();
  if (statusFilter) queryParams.set('status', statusFilter);
  if (severityFilter) queryParams.set('severity', severityFilter);
  const qs = queryParams.toString();

  const {
    data: incidentsResp,
    isLoading: incidentsLoading,
    mutate: mutateIncidents,
  } = useSWR<IncidentsResponse>(
    `/api/security-incidents${qs ? `?${qs}` : ''}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  // Fetch dashboard
  const { data: dashboard, isLoading: dashLoading } = useSWR<DashboardData>(
    '/api/security-incidents/dashboard',
    fetcher,
    { revalidateOnFocus: false },
  );

  // Fetch compliance
  const { data: compliance, isLoading: complianceLoading } = useSWR<ComplianceData>(
    '/api/security-incidents/compliance',
    fetcher,
    { revalidateOnFocus: false },
  );

  const incidents = incidentsResp?.data ?? [];

  // Status transition handler
  const handleTransition = useCallback(
    async (incidentId: string, currentStatus: string): Promise<void> => {
      const nextStatus = NEXT_STATUS[currentStatus];
      if (!nextStatus) return;

      setTransitioningId(incidentId);
      try {
        const res = await fetch(`/api/security-incidents/${incidentId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        });

        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
          throw new Error(err.error?.message || `HTTP ${res.status}`);
        }

        toast.success(`Stato aggiornato: ${STATUS_LABELS[nextStatus] ?? nextStatus}`);
        await mutateIncidents();
      } catch (err) {
        toast.error(`Errore: ${err instanceof Error ? err.message : 'sconosciuto'}`);
      } finally {
        setTransitioningId(null);
      }
    },
    [mutateIncidents],
  );

  const isLoading = incidentsLoading || dashLoading || complianceLoading;

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/settings/security"
            className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Impostazioni sicurezza
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-600/20 p-2.5">
                <Shield className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Incidenti di sicurezza</h1>
                <p className="text-sm text-gray-400">
                  Gestione incidenti NIS2 - Segnalazione 24h/72h ad ACN
                </p>
              </div>
            </div>
            <button
              onClick={() => setDialogOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium hover:bg-blue-500 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nuovo incidente
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          </div>
        ) : (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <motion.div variants={cardVariants} initial="initial" animate="animate">
                <div className="rounded-2xl border border-[#4e4e4e] bg-[#1a1a1a] p-4">
                  <p className="text-xs text-gray-400 mb-1">Totale incidenti</p>
                  <p className="text-2xl font-bold">{dashboard?.total ?? 0}</p>
                </div>
              </motion.div>
              <motion.div
                variants={cardVariants}
                initial="initial"
                animate="animate"
                transition={{ delay: 0.05 }}
              >
                <div className="rounded-2xl border border-[#4e4e4e] bg-[#1a1a1a] p-4">
                  <p className="text-xs text-gray-400 mb-1">Incidenti aperti</p>
                  <p className="text-2xl font-bold text-orange-400">
                    {compliance?.openIncidents ?? 0}
                  </p>
                </div>
              </motion.div>
              <motion.div
                variants={cardVariants}
                initial="initial"
                animate="animate"
                transition={{ delay: 0.1 }}
              >
                <div className="rounded-2xl border border-[#4e4e4e] bg-[#1a1a1a] p-4">
                  <p className="text-xs text-gray-400 mb-1">Tempo medio risoluzione</p>
                  <p className="text-2xl font-bold">
                    {dashboard?.avgResolutionTimeHours != null
                      ? `${dashboard.avgResolutionTimeHours}h`
                      : '-'}
                  </p>
                </div>
              </motion.div>
              <motion.div
                variants={cardVariants}
                initial="initial"
                animate="animate"
                transition={{ delay: 0.15 }}
              >
                <div className="rounded-2xl border border-[#4e4e4e] bg-[#1a1a1a] p-4">
                  <p className="text-xs text-gray-400 mb-1">Punteggio conformita NIS2</p>
                  <p
                    className={`text-2xl font-bold ${
                      (compliance?.complianceScore ?? 0) >= 75
                        ? 'text-green-400'
                        : (compliance?.complianceScore ?? 0) >= 50
                          ? 'text-yellow-400'
                          : 'text-red-400'
                    }`}
                  >
                    {compliance?.complianceScore ?? 0}/100
                  </p>
                </div>
              </motion.div>
            </div>

            {/* NIS2 Alerts */}
            {dashboard?.nis2Alerts && dashboard.nis2Alerts.length > 0 && (
              <motion.div
                variants={cardVariants}
                initial="initial"
                animate="animate"
                className="mb-8"
              >
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    <h3 className="font-semibold text-red-300">
                      Scadenze NIS2 in pericolo ({dashboard.nis2Alerts.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {dashboard.nis2Alerts
                      .filter((a) => a.earlyWarningOverdue || a.fullReportOverdue)
                      .map((alert) => (
                        <div
                          key={alert.incidentId}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-gray-300">{alert.title}</span>
                          <span
                            className={
                              alert.fullReportOverdue ? 'text-red-400 font-medium' : 'text-orange-400'
                            }
                          >
                            {alert.hoursElapsed}h trascorse -{' '}
                            {alert.fullReportOverdue
                              ? 'Report 72h scaduto!'
                              : 'Allarme 24h scaduto'}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Incident List (2 cols) */}
              <div className="lg:col-span-2">
                {/* Filters */}
                <div className="flex gap-3 mb-4">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-[#4e4e4e] bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tutti gli stati</option>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="rounded-lg border border-[#4e4e4e] bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tutte le gravita</option>
                    {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Incident Cards */}
                {incidents.length === 0 ? (
                  <div className="rounded-2xl border border-[#4e4e4e] bg-[#1a1a1a] p-12 text-center">
                    <Shield className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Nessun incidente registrato</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Gli incidenti di sicurezza appariranno qui
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {incidents.map((inc) => (
                      <motion.div
                        key={inc.id}
                        variants={cardVariants}
                        initial="initial"
                        animate="animate"
                        className="rounded-2xl border border-[#4e4e4e] bg-[#1a1a1a] p-4 hover:border-[#666] transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${SEVERITY_COLORS[inc.severity]}`}
                              >
                                {SEVERITY_LABELS[inc.severity]}
                              </span>
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[inc.status]}`}
                              >
                                {STATUS_LABELS[inc.status]}
                              </span>
                              {inc.dataBreached && (
                                <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-red-600/30 text-red-300">
                                  Dati violati
                                </span>
                              )}
                            </div>
                            <h3 className="font-medium text-white truncate">{inc.title}</h3>
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                              {inc.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#333]">
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{INCIDENT_TYPE_LABELS[inc.incidentType] ?? inc.incidentType}</span>
                            <span>Rilevato: {formatDate(inc.detectedAt)}</span>
                            <Nis2TimelineBadge incident={inc} />
                          </div>

                          {NEXT_STATUS[inc.status] && (
                            <button
                              onClick={() => handleTransition(inc.id, inc.status)}
                              disabled={transitioningId === inc.id}
                              className="flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
                            >
                              {transitioningId === inc.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                              {NEXT_STATUS_LABELS[inc.status]}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Compliance Sidebar */}
              <div className="space-y-6">
                {/* Compliance Checklist */}
                <motion.div variants={cardVariants} initial="initial" animate="animate">
                  <div className="rounded-2xl border border-[#4e4e4e] bg-[#1a1a1a] overflow-hidden">
                    <div className="border-b border-[#4e4e4e] px-5 py-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                        <h2 className="font-semibold">Checklist conformita NIS2</h2>
                      </div>
                    </div>
                    <div className="p-5">
                      {compliance ? (
                        <ComplianceChecklist data={compliance} />
                      ) : (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Severity Breakdown */}
                {dashboard && (
                  <motion.div
                    variants={cardVariants}
                    initial="initial"
                    animate="animate"
                    transition={{ delay: 0.1 }}
                  >
                    <div className="rounded-2xl border border-[#4e4e4e] bg-[#1a1a1a] overflow-hidden">
                      <div className="border-b border-[#4e4e4e] px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Activity className="h-5 w-5 text-orange-400" />
                          <h2 className="font-semibold">Distribuzione per gravita</h2>
                        </div>
                      </div>
                      <div className="p-5 space-y-3">
                        {Object.entries(dashboard.bySeverity).map(([sev, count]) => (
                          <div key={sev} className="flex items-center justify-between">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${SEVERITY_COLORS[sev]}`}
                            >
                              {SEVERITY_LABELS[sev]}
                            </span>
                            <span className="text-sm font-medium text-gray-300">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Info Box */}
                <motion.div
                  variants={cardVariants}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: 0.2 }}
                >
                  <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-medium text-blue-300 mb-1">
                          Scadenze NIS2
                        </h3>
                        <ul className="text-xs text-gray-400 space-y-1">
                          <li>
                            <strong className="text-orange-300">24 ore</strong> - Allarme
                            preliminare ad ACN
                          </li>
                          <li>
                            <strong className="text-red-300">72 ore</strong> - Report completo ad
                            ACN
                          </li>
                          <li>
                            <strong className="text-gray-300">1 mese</strong> - Report finale
                            con analisi causa radice
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create Dialog */}
      <CreateIncidentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={() => mutateIncidents()}
      />
    </div>
  );
}
