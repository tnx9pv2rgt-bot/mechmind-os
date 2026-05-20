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
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

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

const SEVERITY_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  LOW: { label: 'Bassa', bg: 'bg-[var(--status-info-subtle)] dark:bg-[var(--status-info-subtle)]', color: 'text-[var(--status-info)] dark:text-[var(--status-info)]' },
  MEDIUM: { label: 'Media', bg: 'bg-[var(--status-warning)]/20 dark:bg-[var(--status-warning-subtle)]', color: 'text-[var(--status-warning)] dark:text-[var(--status-warning)]' },
  HIGH: { label: 'Alta', bg: 'bg-[var(--status-warning)]/10 dark:bg-[var(--status-warning-subtle)]', color: 'text-[var(--status-warning)] dark:text-[var(--status-warning)]' },
  CRITICAL: { label: 'Critica', bg: 'bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)]', color: 'text-[var(--status-error)] dark:text-[var(--status-error)]' },
};

const STATUS_LABELS: Record<string, string> = {
  DETECTED: 'Rilevato',
  INVESTIGATING: 'In indagine',
  CONTAINED: 'Contenuto',
  RESOLVED: 'Risolto',
  REPORTED_ACN: 'Segnalato ACN',
  CLOSED: 'Chiuso',
};

const STATUS_CONFIG: Record<string, { bg: string; color: string }> = {
  DETECTED: { bg: 'bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)]', color: 'text-[var(--status-error)] dark:text-[var(--status-error)]' },
  INVESTIGATING: { bg: 'bg-[var(--status-warning)]/20 dark:bg-[var(--status-warning-subtle)]', color: 'text-[var(--status-warning)] dark:text-[var(--status-warning)]' },
  CONTAINED: { bg: 'bg-[var(--status-info-subtle)] dark:bg-[var(--status-info-subtle)]', color: 'text-[var(--status-info)] dark:text-[var(--status-info)]' },
  RESOLVED: { bg: 'bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)]', color: 'text-[var(--status-success)] dark:text-[var(--status-success)]' },
  REPORTED_ACN: { bg: 'bg-[var(--brand)]/10 dark:bg-[var(--brand-subtle)]', color: 'text-[var(--brand)] dark:text-[var(--brand)]' },
  CLOSED: { bg: 'bg-[var(--surface-secondary)] dark:bg-[var(--surface-hover)]', color: 'text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]' },
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

const SEVERITY_LABELS: Record<string, string> = {
  LOW: 'Bassa',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Critica',
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

const statsCardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

// ─── Components ───

function Nis2TimelineBadge({ incident }: { incident: SecurityIncident }): React.ReactElement {
  const elapsed = Date.now() - new Date(incident.detectedAt).getTime();
  const hours = Math.round(elapsed / (1000 * 60 * 60));
  const earlyOverdue = elapsed > 24 * 60 * 60 * 1000;
  const fullOverdue = elapsed > 72 * 60 * 60 * 1000;

  if (incident.status === 'REPORTED_ACN' || incident.status === 'CLOSED') {
    return <span className='text-footnote font-semibold px-2.5 py-1 rounded-full bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)] text-[var(--status-success)] dark:text-[var(--status-success)]'>Segnalato</span>;
  }

  if (fullOverdue) {
    return (
      <span className='inline-flex items-center gap-1 text-footnote font-semibold px-2.5 py-1 rounded-full bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)] text-[var(--status-error)] dark:text-[var(--status-error)]'>
        <AlertTriangle className='h-3 w-3' />
        {hours}h - Report 72h scaduto
      </span>
    );
  }

  if (earlyOverdue) {
    return (
      <span className='inline-flex items-center gap-1 text-footnote font-semibold px-2.5 py-1 rounded-full bg-[var(--status-warning)]/10 dark:bg-[var(--status-warning-subtle)] text-[var(--status-warning)] dark:text-[var(--status-warning)]'>
        <Clock className='h-3 w-3' />
        {hours}h - Allarme 24h scaduto
      </span>
    );
  }

  return (
    <span className='inline-flex items-center gap-1 text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
      <Clock className='h-3 w-3' />
      {hours}h trascorse
    </span>
  );
}

function ComplianceChecklist({ data }: { data: ComplianceData }): React.ReactElement {
  const checks = [
    { label: 'MFA attivata per tutti gli admin', ok: data.mfaEnabledForAdmins },
    { label: 'Crittografia a riposo (AES-256-CBC)', ok: data.encryptionAtRest },
    { label: 'Audit logging attivo', ok: data.auditLogging },
    { label: 'Piano risposta incidenti attivo', ok: data.incidentResponsePlanActive },
    { label: 'Nessuna scadenza NIS2 superata', ok: data.nis2DeadlineAlerts.length === 0 },
  ];

  return (
    <div className='space-y-3'>
      {checks.map((c) => (
        <div key={c.label} className='flex items-center gap-3'>
          {c.ok ? (
            <CheckCircle2 className='h-5 w-5 text-[var(--status-success)] shrink-0' />
          ) : (
            <XCircle className='h-5 w-5 text-[var(--status-error)] shrink-0' />
          )}
          <span className={`text-body ${c.ok ? 'text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]' : 'text-[var(--status-error)] font-medium'}`}>
            {c.label}
          </span>
        </div>
      ))}
    </div>
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
}): React.ReactElement {
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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>Nuovo incidente di sicurezza</DialogTitle>
          <DialogDescription>
            Registra un nuovo incidente di sicurezza per la conformita NIS2.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='space-y-4 py-4'>
          <div className='space-y-2'>
            <label htmlFor='inc-title' className='text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
              Titolo *
            </label>
            <Input
              id='inc-title'
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder='es. Accesso non autorizzato al database'
              className='h-11 rounded-xl'
            />
          </div>
          <div className='space-y-2'>
            <label htmlFor='inc-desc' className='text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
              Descrizione *
            </label>
            <textarea
              id='inc-desc'
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className='w-full rounded-xl border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] px-3 py-2 text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue'
              placeholder='Descrizione dettagliata dell&apos;incidente'
            />
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <label htmlFor='inc-severity' className='text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Gravita
              </label>
              <select
                id='inc-severity'
                value={form.severity}
                onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
                className='w-full h-11 rounded-xl border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] px-3 text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue appearance-none cursor-pointer'
              >
                <option value='LOW'>Bassa</option>
                <option value='MEDIUM'>Media</option>
                <option value='HIGH'>Alta</option>
                <option value='CRITICAL'>Critica</option>
              </select>
            </div>
            <div className='space-y-2'>
              <label htmlFor='inc-type' className='text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Tipo
              </label>
              <select
                id='inc-type'
                value={form.incidentType}
                onChange={(e) => setForm((f) => ({ ...f, incidentType: e.target.value }))}
                className='w-full h-11 rounded-xl border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] px-3 text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue appearance-none cursor-pointer'
              >
                <option value='data_breach'>Violazione dati</option>
                <option value='unauthorized_access'>Accesso non autorizzato</option>
                <option value='malware'>Malware</option>
                <option value='ddos'>DDoS</option>
                <option value='phishing'>Phishing</option>
                <option value='insider_threat'>Minaccia interna</option>
                <option value='other'>Altro</option>
              </select>
            </div>
          </div>
          <div className='space-y-2'>
            <label htmlFor='inc-date' className='text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
              Data/ora rilevamento
            </label>
            <Input
              id='inc-date'
              type='datetime-local'
              value={form.detectedAt}
              onChange={(e) => setForm((f) => ({ ...f, detectedAt: e.target.value }))}
              className='h-11 rounded-xl'
            />
          </div>
          <div className='space-y-2'>
            <label htmlFor='inc-systems' className='text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
              Sistemi interessati (separati da virgola)
            </label>
            <Input
              id='inc-systems'
              value={form.affectedSystems}
              onChange={(e) => setForm((f) => ({ ...f, affectedSystems: e.target.value }))}
              placeholder='es. database, auth-service, api-gateway'
              className='h-11 rounded-xl'
            />
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <label htmlFor='inc-users' className='text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Utenti interessati
              </label>
              <Input
                id='inc-users'
                type='number'
                value={form.affectedUsers}
                onChange={(e) => setForm((f) => ({ ...f, affectedUsers: e.target.value }))}
                placeholder='0'
                min='0'
                className='h-11 rounded-xl'
              />
            </div>
            <div className='flex items-end pb-2'>
              <label className='flex items-center gap-2 cursor-pointer min-h-[44px]'>
                <input
                  type='checkbox'
                  checked={form.dataBreached}
                  onChange={(e) => setForm((f) => ({ ...f, dataBreached: e.target.checked }))}
                  className='w-4 h-4 rounded border-[var(--border-default)] text-[var(--brand)] focus:ring-apple-blue'
                />
                <span className='text-body text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Violazione dati personali</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <AppleButton variant='secondary' type='button' onClick={onClose}>
              Annulla
            </AppleButton>
            <AppleButton type='submit' disabled={submitting}>
              {submitting && <Loader2 className='w-4 h-4 animate-spin mr-2' />}
              Crea incidente
            </AppleButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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

  // Loading
  if (isLoading && incidents.length === 0) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-[var(--brand)]' />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <header>
        <div className='px-4 sm:px-8 py-5'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
            <div className='flex items-center gap-3'>
              <Link
                href='/dashboard/settings/security'
                className='inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-secondary)]/50 dark:hover:bg-[var(--surface-hover)]'
                aria-label='Torna a sicurezza'
              >
                <ArrowLeft className='h-5 w-5' />
              </Link>
              <div>
                <h1 className='text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                  Incidenti di sicurezza
                </h1>
                <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1'>
                  Gestione incidenti NIS2 - Segnalazione 24h/72h ad ACN
                </p>
              </div>
            </div>
            <AppleButton
              icon={<Plus className='h-4 w-4' />}
              onClick={() => setDialogOpen(true)}
            >
              Nuovo incidente
            </AppleButton>
          </div>
        </div>
      </header>

      <motion.div
        className='p-4 sm:p-8 max-w-7xl mx-auto space-y-6'
        initial='hidden'
        animate='visible'
        variants={containerVariants}
      >
        {/* Stats Row */}
        <motion.div
          className='grid grid-cols-2 lg:grid-cols-4 gap-bento'
          variants={containerVariants}
        >
          {[
            {
              label: 'Totale incidenti',
              value: String(dashboard?.total ?? 0),
              icon: Shield,
              color: 'bg-[var(--brand)]',
            },
            {
              label: 'Incidenti aperti',
              value: String(compliance?.openIncidents ?? 0),
              icon: AlertTriangle,
              color: 'bg-[var(--status-warning)]',
            },
            {
              label: 'Tempo medio risoluzione',
              value: dashboard?.avgResolutionTimeHours != null ? `${dashboard.avgResolutionTimeHours}h` : '-',
              icon: Clock,
              color: 'bg-[var(--brand)]',
            },
            {
              label: 'Conformita NIS2',
              value: `${compliance?.complianceScore ?? 0}/100`,
              icon: CheckCircle2,
              color: (compliance?.complianceScore ?? 0) >= 75 ? 'bg-[var(--status-success)]' : (compliance?.complianceScore ?? 0) >= 50 ? 'bg-[var(--status-warning)]' : 'bg-[var(--status-error)]',
            },
          ].map(stat => (
            <motion.div key={stat.label} variants={statsCardVariants}>
              <AppleCard hover={false}>
                <AppleCardContent>
                  <div className='flex items-center justify-between mb-3'>
                    <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                      <stat.icon className='h-5 w-5 text-[var(--text-on-brand)]' />
                    </div>
                  </div>
                  <p className='text-title-1 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    {stat.value}
                  </p>
                  <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>{stat.label}</p>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          ))}
        </motion.div>

        {/* NIS2 Alerts */}
        {dashboard?.nis2Alerts && dashboard.nis2Alerts.length > 0 && (
          <motion.div variants={listItemVariants}>
            <AppleCard hover={false} className='border-[var(--status-error)]/30'>
              <AppleCardContent>
                <div className='flex items-center gap-2 mb-3'>
                  <AlertTriangle className='h-5 w-5 text-[var(--status-error)]' />
                  <h3 className='text-title-3 font-semibold text-[var(--status-error)]'>
                    Scadenze NIS2 in pericolo ({dashboard.nis2Alerts.length})
                  </h3>
                </div>
                <div className='space-y-2'>
                  {dashboard.nis2Alerts
                    .filter((a) => a.earlyWarningOverdue || a.fullReportOverdue)
                    .map((alert) => (
                      <div
                        key={alert.incidentId}
                        className='flex items-center justify-between p-3 rounded-xl bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)]'
                      >
                        <span className='text-body text-[var(--text-primary)] dark:text-[var(--text-primary)]'>{alert.title}</span>
                        <span className={`text-footnote font-medium ${alert.fullReportOverdue ? 'text-[var(--status-error)]' : 'text-[var(--status-warning)]'}`}>
                          {alert.hoursElapsed}h trascorse - {alert.fullReportOverdue ? 'Report 72h scaduto!' : 'Allarme 24h scaduto'}
                        </span>
                      </div>
                    ))}
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        )}

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Incident List (2 cols) */}
          <div className='lg:col-span-2 space-y-4'>
            {/* Filters */}
            <motion.div variants={listItemVariants}>
              <AppleCard hover={false}>
                <AppleCardContent>
                  <div className='flex gap-3'>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className='h-10 px-3 rounded-xl border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue appearance-none cursor-pointer text-body'
                    >
                      <option value=''>Tutti gli stati</option>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <select
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value)}
                      className='h-10 px-3 rounded-xl border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue appearance-none cursor-pointer text-body'
                    >
                      <option value=''>Tutte le gravita</option>
                      {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Incident Cards */}
            <motion.div variants={listItemVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <div className='flex items-center gap-3'>
                    <Shield className='h-5 w-5 text-[var(--brand)]' />
                    <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Incidenti ({incidents.length})
                    </h2>
                  </div>
                </AppleCardHeader>
                <AppleCardContent>
                  {incidents.length === 0 ? (
                    <div className='flex flex-col items-center justify-center py-12 text-center'>
                      <AlertCircle className='h-12 w-12 text-[var(--text-tertiary)]/40 mb-4' />
                      <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                        Nessun incidente registrato
                      </p>
                      <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-1'>
                        Gli incidenti di sicurezza appariranno qui
                      </p>
                    </div>
                  ) : (
                    <motion.div
                      className='space-y-3'
                      variants={containerVariants}
                      initial='hidden'
                      animate='visible'
                    >
                      {incidents.map((inc, index) => {
                        const sevCfg = SEVERITY_CONFIG[inc.severity] || SEVERITY_CONFIG.MEDIUM;
                        const stsCfg = STATUS_CONFIG[inc.status] || STATUS_CONFIG.DETECTED;
                        return (
                          <motion.div
                            key={inc.id}
                            className='p-4 rounded-2xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-active)] hover:shadow-apple transition-all duration-300'
                            variants={listItemVariants}
                            custom={index}
                            whileHover={{ scale: 1.005, x: 4 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className='flex items-start justify-between mb-2'>
                              <div className='flex-1 min-w-0'>
                                <div className='flex items-center gap-2 mb-1 flex-wrap'>
                                  <span className={`text-footnote font-semibold px-2.5 py-1 rounded-full ${sevCfg.bg} ${sevCfg.color}`}>
                                    {sevCfg.label}
                                  </span>
                                  <span className={`text-footnote font-semibold px-2.5 py-1 rounded-full ${stsCfg.bg} ${stsCfg.color}`}>
                                    {STATUS_LABELS[inc.status]}
                                  </span>
                                  {inc.dataBreached && (
                                    <span className='text-footnote font-semibold px-2.5 py-1 rounded-full bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)] text-[var(--status-error)] dark:text-[var(--status-error)]'>
                                      Dati violati
                                    </span>
                                  )}
                                </div>
                                <p className='text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] truncate'>
                                  {inc.title}
                                </p>
                                <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-1 line-clamp-2'>
                                  {inc.description}
                                </p>
                              </div>
                            </div>

                            <div className='flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-default)]/20 dark:border-[var(--border-default)]/50'>
                              <div className='flex items-center gap-4 flex-wrap'>
                                <span className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                                  {INCIDENT_TYPE_LABELS[inc.incidentType] ?? inc.incidentType}
                                </span>
                                <span className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                                  Rilevato: {formatDate(inc.detectedAt)}
                                </span>
                                <Nis2TimelineBadge incident={inc} />
                              </div>

                              {NEXT_STATUS[inc.status] && (
                                <AppleButton
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => handleTransition(inc.id, inc.status)}
                                  disabled={transitioningId === inc.id}
                                >
                                  {transitioningId === inc.id ? (
                                    <Loader2 className='h-3 w-3 animate-spin mr-1' />
                                  ) : (
                                    <ChevronRight className='h-3 w-3 mr-1' />
                                  )}
                                  {NEXT_STATUS_LABELS[inc.status]}
                                </AppleButton>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </div>

          {/* Compliance Sidebar */}
          <div className='space-y-6'>
            {/* Compliance Checklist */}
            <motion.div variants={listItemVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <div className='flex items-center gap-3'>
                    <CheckCircle2 className='h-5 w-5 text-[var(--status-success)]' />
                    <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Checklist conformita NIS2
                    </h2>
                  </div>
                </AppleCardHeader>
                <AppleCardContent>
                  {compliance ? (
                    <ComplianceChecklist data={compliance} />
                  ) : (
                    <div className='flex justify-center py-4'>
                      <Loader2 className='h-5 w-5 animate-spin text-[var(--brand)]' />
                    </div>
                  )}
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Severity Breakdown */}
            {dashboard && (
              <motion.div variants={listItemVariants}>
                <AppleCard hover={false}>
                  <AppleCardHeader>
                    <div className='flex items-center gap-3'>
                      <Activity className='h-5 w-5 text-[var(--status-warning)]' />
                      <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                        Distribuzione per gravita
                      </h2>
                    </div>
                  </AppleCardHeader>
                  <AppleCardContent>
                    <div className='space-y-3'>
                      {Object.entries(dashboard.bySeverity).map(([sev, count]) => {
                        const sevCfg = SEVERITY_CONFIG[sev] || SEVERITY_CONFIG.MEDIUM;
                        return (
                          <div key={sev} className='flex items-center justify-between'>
                            <span className={`text-footnote font-semibold px-2.5 py-1 rounded-full ${sevCfg.bg} ${sevCfg.color}`}>
                              {SEVERITY_LABELS[sev]}
                            </span>
                            <span className='text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </AppleCardContent>
                </AppleCard>
              </motion.div>
            )}

            {/* Info Box */}
            <motion.div variants={listItemVariants}>
              <AppleCard hover={false} className='border-[var(--brand)]/20'>
                <AppleCardContent>
                  <div className='flex items-start gap-3'>
                    <AlertCircle className='h-5 w-5 text-[var(--brand)] shrink-0 mt-0.5' />
                    <div>
                      <h3 className='text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-2'>
                        Scadenze NIS2
                      </h3>
                      <ul className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] space-y-1'>
                        <li>
                          <strong className='text-[var(--status-warning)]'>24 ore</strong> - Allarme preliminare ad ACN
                        </li>
                        <li>
                          <strong className='text-[var(--status-error)]'>72 ore</strong> - Report completo ad ACN
                        </li>
                        <li>
                          <strong className='text-[var(--text-primary)] dark:text-[var(--text-primary)]'>1 mese</strong> - Report finale con analisi causa radice
                        </li>
                      </ul>
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Create Dialog */}
      <CreateIncidentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={() => mutateIncidents()}
      />
    </div>
  );
}
