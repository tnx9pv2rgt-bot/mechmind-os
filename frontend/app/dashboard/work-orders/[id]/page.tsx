'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  ClipboardList,
  User,
  Car,
  Wrench,
  Plus,
  Trash2,
  Package,
  Clock,
  Camera,
  History,
  Play,
  Pause,
  Square,
  ChevronRight,
  Check,
  FileText,
  Loader2,
  AlertCircle,
  Pencil,
  LogIn,
  LogOut,
  Download,
  X,
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { ErrorState } from '@/components/patterns/error-state';
import { DetailSkeleton } from '@/components/patterns/loading-skeleton';
import { EmptyState } from '@/components/patterns/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate, formatDateTime, formatPlate } from '@/lib/utils/format';

/* --- Types --- */
interface LaborItem {
  id: string;
  description: string;
  hours: number;
  costPerHour: number;
}

interface PartItem {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
}

interface TimeEntry {
  id: string;
  start: string;
  end?: string;
  duration?: number;
  technicianName?: string;
}

interface AuditEntry {
  id: string;
  action: string;
  fromStatus?: string;
  toStatus?: string;
  createdAt: string;
  userName?: string;
}

interface WorkOrderDetail {
  id: string;
  woNumber: string;
  status: string;
  priority?: string;
  vehicleId?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  vehicleYear?: number;
  vehicleVin?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  technicianId?: string;
  technicianName?: string;
  diagnosis?: string;
  customerRequest?: string;
  notes?: string;
  estimatedHours?: number;
  actualHours?: number;
  mileageIn?: number;
  mileageOut?: number;
  totalCost: number;
  laborItems: LaborItem[];
  partItems: PartItem[];
  photos?: string[];
  timeEntries?: TimeEntry[];
  auditLog?: AuditEntry[];
  createdAt: string;
  updatedAt: string;
}

/* --- Status Config --- */
const STATUS_PIPELINE = ['DRAFT', 'OPEN', 'IN_PROGRESS', 'QC', 'COMPLETED', 'DELIVERED'] as const;

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT: { label: 'Bozza', bg: 'bg-[var(--border-default)] dark:bg-[var(--border-default)]', color: 'text-[var(--text-primary)] dark:text-[var(--text-primary)]' },
  OPEN: { label: 'Aperto', bg: 'bg-[var(--status-info-subtle)] dark:bg-[var(--status-info-subtle)]', color: 'text-[var(--status-info)] dark:text-[var(--status-info)]' },
  IN_PROGRESS: { label: 'In Lavorazione', bg: 'bg-[var(--status-warning)]/20 dark:bg-[var(--status-warning-subtle)]', color: 'text-[var(--status-warning)] dark:text-[var(--status-warning)]' },
  QC: { label: 'Controllo Qualita', bg: 'bg-[var(--brand)]/10 dark:bg-[var(--brand-subtle)]', color: 'text-[var(--brand)] dark:text-[var(--brand)]' },
  COMPLETED: { label: 'Completato', bg: 'bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)]', color: 'text-[var(--status-success)] dark:text-[var(--status-success)]' },
  DELIVERED: { label: 'Consegnato', bg: 'bg-[var(--status-success)]/10 dark:bg-[var(--status-success)]/30/40', color: 'text-[var(--status-success)] dark:text-[var(--status-success)]' },
  CANCELLED: { label: 'Annullato', bg: 'bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)]', color: 'text-[var(--status-error)] dark:text-[var(--status-error)]' },
  PENDING: { label: 'In Attesa', bg: 'bg-[var(--status-warning)]/20 dark:bg-[var(--status-warning-subtle)]', color: 'text-[var(--status-warning)] dark:text-[var(--status-warning)]' },
  WAITING_PARTS: { label: 'Attesa Ricambi', bg: 'bg-[var(--status-warning)]/10 dark:bg-[var(--status-warning-subtle)]', color: 'text-[var(--status-warning)] dark:text-[var(--status-warning)]' },
  READY: { label: 'Pronto', bg: 'bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)]', color: 'text-[var(--status-success)] dark:text-[var(--status-success)]' },
  INVOICED: { label: 'Fatturato', bg: 'bg-[var(--status-success)]/10 dark:bg-[var(--status-success)]/30/40', color: 'text-[var(--status-success)] dark:text-[var(--status-success)]' },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  LOW: { label: 'Bassa', className: 'text-[var(--text-tertiary)]' },
  NORMAL: { label: 'Normale', className: 'text-[var(--brand)]' },
  HIGH: { label: 'Alta', className: 'text-[var(--status-warning)]' },
  URGENT: { label: 'Urgente', className: 'text-[var(--status-error)] font-bold' },
};

const FUEL_LEVEL_OPTIONS = [
  { value: 'EMPTY', label: 'Vuoto' },
  { value: 'LOW', label: 'Basso (1/4)' },
  { value: 'QUARTER', label: 'Un quarto' },
  { value: 'HALF', label: 'Metà' },
  { value: 'THREE_QUARTERS', label: 'Tre quarti' },
  { value: 'FULL', label: 'Pieno' },
];

const TABS = [
  { key: 'dettagli', label: 'Dettagli', icon: ClipboardList },
  { key: 'lavorazioni', label: 'Lavorazioni', icon: Wrench },
  { key: 'ricambi', label: 'Ricambi', icon: Package },
  { key: 'timer', label: 'Timer', icon: Clock },
  { key: 'foto', label: 'Foto', icon: Camera },
  { key: 'storico', label: 'Storico', icon: History },
] as const;

type TabKey = (typeof TABS)[number]['key'];

let localIdCounter = 0;
function generateLocalId(): string {
  localIdCounter += 1;
  return `local-${Date.now()}-${localIdCounter}`;
}

export default function WorkOrderDetailPage(): React.ReactElement {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const workOrderId = params.id as string;
  const activeTab = (searchParams.get('tab') as TabKey) || 'dettagli';

  const { data: rawData, error, isLoading, mutate } = useSWR<WorkOrderDetail | { data: WorkOrderDetail }>(
    `/api/dashboard/work-orders/${workOrderId}`,
    fetcher,
  );

  const wo: WorkOrderDetail | null = (() => {
    if (!rawData) return null;
    if ('data' in rawData && rawData.data && typeof rawData.data === 'object' && 'id' in rawData.data) {
      return rawData.data as WorkOrderDetail;
    }
    return rawData as WorkOrderDetail;
  })();

  const [transitioning, setTransitioning] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState(false);
  const [checkInForm, setCheckInForm] = useState({ mileageIn: '', fuelLevel: '', damageNotes: '', itemsLeftInCar: '' });
  const [checkOutForm, setCheckOutForm] = useState({ mileageOut: '', fuelLevel: '', notes: '' });
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkOutLoading, setCheckOutLoading] = useState(false);

  const setTab = (tab: TabKey): void => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('tab', tab);
    router.push(`/dashboard/work-orders/${workOrderId}?${p.toString()}`);
  };

  const getStatus = (s: string) => STATUS_CONFIG[s] || STATUS_CONFIG.DRAFT;

  /* --- Transition --- */
  const NEXT_STATUS: Record<string, string> = {
    DRAFT: 'OPEN',
    OPEN: 'IN_PROGRESS',
    IN_PROGRESS: 'QC',
    QC: 'COMPLETED',
    COMPLETED: 'DELIVERED',
    PENDING: 'IN_PROGRESS',
    WAITING_PARTS: 'IN_PROGRESS',
    READY: 'COMPLETED',
  };

  const handleTransition = async (targetStatus?: string): Promise<void> => {
    const nextStatus = targetStatus || (wo ? NEXT_STATUS[wo.status] : null);
    if (!nextStatus || transitioning) return;
    setTransitioning(true);
    try {
      const res = await fetch(`/api/dashboard/work-orders/${workOrderId}/transition`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || json.message || 'Transizione non consentita');
      }
      toast.success(`Stato aggiornato a "${getStatus(nextStatus).label}"`);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante il cambio stato');
    } finally {
      setTransitioning(false);
    }
  };

  const handleGenerateInvoice = async (): Promise<void> => {
    try {
      const res = await fetch(`/api/dashboard/work-orders/${workOrderId}/invoice`, { method: 'POST' });
      if (!res.ok) throw new Error('Errore generazione fattura');
      toast.success('Fattura generata con successo');
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore generazione fattura');
    }
  };

  const handleCheckIn = async (): Promise<void> => {
    if (!checkInForm.mileageIn) { toast.error('Chilometraggio obbligatorio'); return; }
    if (!wo) return;
    setCheckInLoading(true);
    try {
      const body: Record<string, unknown> = {
        vehicleId: wo.vehicleId,
        customerId: wo.customerId,
        mileageIn: parseInt(checkInForm.mileageIn, 10),
      };
      if (checkInForm.fuelLevel) body.fuelLevel = checkInForm.fuelLevel;
      if (checkInForm.damageNotes) body.damageNotes = checkInForm.damageNotes;
      if (checkInForm.itemsLeftInCar) body.itemsLeftInCar = checkInForm.itemsLeftInCar;

      const res = await fetch(`/api/dashboard/work-orders/${workOrderId}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string }; message?: string };
        throw new Error(json.error?.message || json.message || 'Errore check-in');
      }
      toast.success('Check-in effettuato');
      setShowCheckIn(false);
      setCheckInForm({ mileageIn: '', fuelLevel: '', damageNotes: '', itemsLeftInCar: '' });
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante il check-in');
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleCheckOut = async (): Promise<void> => {
    if (!checkOutForm.mileageOut) { toast.error('Chilometraggio obbligatorio'); return; }
    if (!checkOutForm.fuelLevel) { toast.error('Livello carburante obbligatorio'); return; }
    setCheckOutLoading(true);
    try {
      const body: Record<string, unknown> = {
        mileageOut: parseInt(checkOutForm.mileageOut, 10),
        fuelLevel: checkOutForm.fuelLevel,
      };
      if (checkOutForm.notes) body.notes = checkOutForm.notes;

      const res = await fetch(`/api/dashboard/work-orders/${workOrderId}/check-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string }; message?: string };
        throw new Error(json.error?.message || json.message || 'Errore check-out');
      }
      toast.success('Check-out effettuato');
      setShowCheckOut(false);
      setCheckOutForm({ mileageOut: '', fuelLevel: '', notes: '' });
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante il check-out');
    } finally {
      setCheckOutLoading(false);
    }
  };

  const handleDownloadPdf = (): void => {
    window.open(`/api/dashboard/work-orders/${workOrderId}/pdf`, '_blank');
  };

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <header>
          <div className="px-4 sm:px-8 py-5">
            <div className="h-4 w-48 bg-[var(--border-default)] dark:bg-[var(--border-default)] rounded animate-pulse mb-4" />
            <div className="h-8 w-64 bg-[var(--border-default)] dark:bg-[var(--border-default)] rounded animate-pulse" />
          </div>
        </header>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--brand)]" />
        </div>
      </div>
    );
  }

  // Error
  if (error || !wo) {
    return (
      <div className="min-h-screen">
        <header>
          <div className="px-4 sm:px-8 py-5">
            <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'OdL', href: '/dashboard/work-orders' }, { label: 'Errore' }]} />
          </div>
        </header>
        <ErrorState variant="not-found" title="Ordine di lavoro non trovato" onRetry={() => mutate()} />
      </div>
    );
  }

  const sc = getStatus(wo.status);
  const nextStatus = NEXT_STATUS[wo.status];
  const nextLabel = nextStatus ? getStatus(nextStatus).label : null;
  const priority = PRIORITY_CONFIG[wo.priority || 'NORMAL'] || PRIORITY_CONFIG.NORMAL;
  const currentStepIndex = STATUS_PIPELINE.indexOf(wo.status as typeof STATUS_PIPELINE[number]);

  // Cost calculations
  const laborTotal = (wo.laborItems || []).reduce((s, i) => s + i.hours * i.costPerHour, 0);
  const partsTotal = (wo.partItems || []).reduce((s, i) => s + i.quantity * i.unitCost, 0);
  const grandTotal = laborTotal + partsTotal;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header>
        <div className="px-4 sm:px-8 py-5">
          <Breadcrumb items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'OdL', href: '/dashboard/work-orders' },
            { label: `#${wo.woNumber || wo.id.slice(0, 8)}` },
          ]} />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                  OdL #{wo.woNumber || wo.id.slice(0, 8)}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase ${sc.bg} ${sc.color}`}>
                  {sc.label}
                </span>
                <span className={`text-footnote font-medium ${priority.className}`}>
                  {priority.label}
                </span>
              </div>
              <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-1">
                {wo.vehicleMake} {wo.vehicleModel} {wo.vehiclePlate ? `- ${formatPlate(wo.vehiclePlate)}` : ''}
                {wo.customerName ? ` | ${wo.customerName}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {nextStatus && nextLabel && (
                <AppleButton
                  onClick={() => handleTransition()}
                  disabled={transitioning}
                  loading={transitioning}
                  icon={<ChevronRight className="h-4 w-4" />}
                >
                  Avanza a {nextLabel}
                </AppleButton>
              )}
              {!wo.mileageIn && !['DELIVERED', 'CANCELLED'].includes(wo.status) && (
                <AppleButton
                  variant="secondary"
                  onClick={() => setShowCheckIn(true)}
                  icon={<LogIn className="h-4 w-4" />}
                >
                  Check-in
                </AppleButton>
              )}
              {wo.mileageIn && !wo.mileageOut && ['COMPLETED', 'READY', 'QC'].includes(wo.status) && (
                <AppleButton
                  variant="secondary"
                  onClick={() => setShowCheckOut(true)}
                  icon={<LogOut className="h-4 w-4" />}
                >
                  Check-out
                </AppleButton>
              )}
              {(wo.status === 'COMPLETED' || wo.status === 'READY') && (
                <AppleButton
                  variant="secondary"
                  onClick={handleGenerateInvoice}
                  icon={<FileText className="h-4 w-4" />}
                >
                  Genera Fattura
                </AppleButton>
              )}
              <AppleButton
                variant="ghost"
                onClick={handleDownloadPdf}
                icon={<Download className="h-4 w-4" />}
              >
                PDF
              </AppleButton>
            </div>
          </div>

          {/* State Machine Stepper */}
          <div className="mt-6 hidden sm:flex items-center gap-1 overflow-x-auto">
            {STATUS_PIPELINE.map((step, i) => {
              const stepConfig = getStatus(step);
              const isCompleted = currentStepIndex > i;
              const isCurrent = wo.status === step;
              return (
                <div key={step} className="flex items-center">
                  {i > 0 && (
                    <div className={`w-6 h-0.5 ${isCompleted ? 'bg-[var(--status-success)]' : 'bg-apple-border/20 dark:bg-[var(--border-default)]'}`} />
                  )}
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                      isCurrent
                        ? `${stepConfig.bg} ${stepConfig.color} ring-2 ring-offset-1 ring-apple-blue dark:ring-offset-[var(--surface-primary)]`
                        : isCompleted
                          ? 'bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)] text-[var(--status-success)] dark:text-[var(--status-success)]'
                          : 'bg-[var(--surface-secondary)] dark:bg-[var(--surface-hover)] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-3 w-3" />
                    ) : isCurrent ? (
                      <div className="h-2 w-2 rounded-full bg-current animate-pulse" />
                    ) : null}
                    {stepConfig.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 overflow-x-auto -mb-px">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap min-h-[44px] ${
                    isActive
                      ? 'border-[var(--brand)] text-[var(--brand)] bg-[var(--brand)]/5'
                      : 'border-transparent text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main */}
          <div className="lg:col-span-8">
            {activeTab === 'dettagli' && <DetailsTab wo={wo} />}
            {activeTab === 'lavorazioni' && <LaborTab items={wo.laborItems || []} woId={workOrderId} onMutate={mutate} />}
            {activeTab === 'ricambi' && <PartsTab items={wo.partItems || []} woId={workOrderId} onMutate={mutate} />}
            {activeTab === 'timer' && <TimerTab entries={wo.timeEntries || []} woId={workOrderId} onMutate={mutate} />}
            {activeTab === 'foto' && <PhotosTab photos={wo.photos || []} />}
            {activeTab === 'storico' && <AuditTab entries={wo.auditLog || []} />}
          </div>

          {/* Sidebar - Cost Summary */}
          <div className="lg:col-span-4">
            <div className="sticky top-4 space-y-4">
              <AppleCard hover={false}>
                <AppleCardContent>
                  <h3 className="text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-4">Riepilogo Costi</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-body">
                      <span className="text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Manodopera</span>
                      <span className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">{formatCurrency(laborTotal)}</span>
                    </div>
                    <div className="flex justify-between text-body">
                      <span className="text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Ricambi</span>
                      <span className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">{formatCurrency(partsTotal)}</span>
                    </div>
                    <div className="border-t border-[var(--border-default)]/20 dark:border-[var(--border-default)] pt-3 flex justify-between">
                      <span className="text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Totale</span>
                      <span className="text-title-2 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{formatCurrency(grandTotal)}</span>
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>

              {/* Quick Info */}
              {wo.customerName && (
                <AppleCard hover={false}>
                  <AppleCardContent>
                    <h3 className="text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-3 flex items-center gap-2">
                      <User className="h-4 w-4 text-[var(--text-tertiary)]" />
                      Cliente
                    </h3>
                    <p className="text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] font-medium">{wo.customerName}</p>
                    {wo.customerPhone && <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-1">{wo.customerPhone}</p>}
                    {wo.customerEmail && <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">{wo.customerEmail}</p>}
                  </AppleCardContent>
                </AppleCard>
              )}

              {wo.vehiclePlate && (
                <AppleCard hover={false}>
                  <AppleCardContent>
                    <h3 className="text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-3 flex items-center gap-2">
                      <Car className="h-4 w-4 text-[var(--text-tertiary)]" />
                      Veicolo
                    </h3>
                    <p className="font-mono font-bold text-body text-[var(--text-primary)] dark:text-[var(--text-primary)]">{formatPlate(wo.vehiclePlate)}</p>
                    <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-1">
                      {wo.vehicleMake} {wo.vehicleModel} {wo.vehicleYear ? `(${wo.vehicleYear})` : ''}
                    </p>
                    {wo.mileageIn && (
                      <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-1">
                        Km ingresso: {wo.mileageIn.toLocaleString('it-IT')}
                      </p>
                    )}
                  </AppleCardContent>
                </AppleCard>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Check-in Modal */}
      {showCheckIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--surface-primary)]/50 backdrop-blur-sm">
          <div className="bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-default)]/20 dark:border-[var(--border-default)]">
              <h2 className="text-title-3 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
                <LogIn className="h-5 w-5 text-[var(--brand)]" />
                Check-in Veicolo
              </h2>
              <button
                onClick={() => setShowCheckIn(false)}
                className="p-1.5 rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">
                  Chilometraggio ingresso *
                </label>
                <Input
                  type="number"
                  placeholder="es. 125000"
                  value={checkInForm.mileageIn}
                  onChange={(e) => setCheckInForm((f) => ({ ...f, mileageIn: e.target.value }))}
                  min={0}
                />
              </div>
              <div>
                <label className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">
                  Livello carburante
                </label>
                <select
                  value={checkInForm.fuelLevel}
                  onChange={(e) => setCheckInForm((f) => ({ ...f, fuelLevel: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue"
                >
                  <option value="">— Seleziona —</option>
                  {FUEL_LEVEL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">
                  Danni preesistenti
                </label>
                <textarea
                  placeholder="es. Graffio paraurti anteriore destro"
                  value={checkInForm.damageNotes}
                  onChange={(e) => setCheckInForm((f) => ({ ...f, damageNotes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue resize-none"
                />
              </div>
              <div>
                <label className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">
                  Oggetti nel veicolo
                </label>
                <Input
                  placeholder="es. Seggiolino bambino, ombrello"
                  value={checkInForm.itemsLeftInCar}
                  onChange={(e) => setCheckInForm((f) => ({ ...f, itemsLeftInCar: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-[var(--border-default)]/20 dark:border-[var(--border-default)]">
              <AppleButton variant="secondary" onClick={() => setShowCheckIn(false)}>
                Annulla
              </AppleButton>
              <AppleButton
                onClick={handleCheckIn}
                loading={checkInLoading}
                icon={<LogIn className="h-4 w-4" />}
              >
                Conferma Check-in
              </AppleButton>
            </div>
          </div>
        </div>
      )}

      {/* Check-out Modal */}
      {showCheckOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--surface-primary)]/50 backdrop-blur-sm">
          <div className="bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-default)]/20 dark:border-[var(--border-default)]">
              <h2 className="text-title-3 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
                <LogOut className="h-5 w-5 text-[var(--status-success)]" />
                Check-out Veicolo
              </h2>
              <button
                onClick={() => setShowCheckOut(false)}
                className="p-1.5 rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">
                  Chilometraggio uscita *
                </label>
                <Input
                  type="number"
                  placeholder={wo.mileageIn ? String(wo.mileageIn) : 'es. 125050'}
                  value={checkOutForm.mileageOut}
                  onChange={(e) => setCheckOutForm((f) => ({ ...f, mileageOut: e.target.value }))}
                  min={wo.mileageIn || 0}
                />
              </div>
              <div>
                <label className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">
                  Livello carburante *
                </label>
                <select
                  value={checkOutForm.fuelLevel}
                  onChange={(e) => setCheckOutForm((f) => ({ ...f, fuelLevel: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue"
                >
                  <option value="">— Seleziona —</option>
                  {FUEL_LEVEL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">
                  Note riconsegna
                </label>
                <textarea
                  placeholder="es. Veicolo lavato e sanificato"
                  value={checkOutForm.notes}
                  onChange={(e) => setCheckOutForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-[var(--border-default)]/20 dark:border-[var(--border-default)]">
              <AppleButton variant="secondary" onClick={() => setShowCheckOut(false)}>
                Annulla
              </AppleButton>
              <AppleButton
                onClick={handleCheckOut}
                loading={checkOutLoading}
                icon={<LogOut className="h-4 w-4" />}
              >
                Conferma Check-out
              </AppleButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* --- Details Tab --- */
function DetailsTab({ wo }: { wo: WorkOrderDetail }): React.ReactElement {
  return (
    <div className="space-y-6">
      {/* Diagnosis & Request */}
      <AppleCard hover={false}>
        <AppleCardContent>
          <h3 className="text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-[var(--text-tertiary)]" />
            Diagnosi e Richiesta
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] uppercase tracking-wider mb-1">Diagnosi</p>
              <p className="text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)] p-3 rounded-xl">
                {wo.diagnosis || 'Nessuna diagnosi inserita'}
              </p>
            </div>
            <div>
              <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] uppercase tracking-wider mb-1">Richiesta del cliente</p>
              <p className="text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)] p-3 rounded-xl">
                {wo.customerRequest || 'Nessuna richiesta specificata'}
              </p>
            </div>
            {wo.notes && (
              <div>
                <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] uppercase tracking-wider mb-1">Note</p>
                <p className="text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)] p-3 rounded-xl">
                  {wo.notes}
                </p>
              </div>
            )}
          </div>
        </AppleCardContent>
      </AppleCard>

      {/* Assignment */}
      <AppleCard hover={false}>
        <AppleCardContent>
          <h3 className="text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-4">Assegnazione</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] uppercase tracking-wider mb-1">Tecnico</p>
              <p className="text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">{wo.technicianName || 'Non assegnato'}</p>
            </div>
            <div>
              <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] uppercase tracking-wider mb-1">Ore stimate</p>
              <p className="text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">{wo.estimatedHours != null ? `${wo.estimatedHours} h` : '—'}</p>
            </div>
            <div>
              <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] uppercase tracking-wider mb-1">Ore effettive</p>
              <p className="text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">{wo.actualHours != null ? `${wo.actualHours} h` : '—'}</p>
            </div>
          </div>
        </AppleCardContent>
      </AppleCard>
    </div>
  );
}

/* --- Labor Tab --- */
function LaborTab({ items, woId, onMutate }: { items: LaborItem[]; woId: string; onMutate: () => void }): React.ReactElement {
  const [laborItems, setLaborItems] = useState<LaborItem[]>(items);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setLaborItems(items); }, [items]);

  const addItem = (): void => {
    setLaborItems((prev) => [...prev, { id: generateLocalId(), description: '', hours: 0, costPerHour: 0 }]);
  };

  const updateItem = (id: string, field: keyof LaborItem, value: string | number): void => {
    setLaborItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const removeItem = (id: string): void => {
    setLaborItems((prev) => prev.filter((i) => i.id !== id));
  };

  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard/work-orders/${woId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ laborItems }),
      });
      if (!res.ok) throw new Error('Errore salvataggio');
      toast.success('Lavorazioni salvate');
      onMutate();
    } catch {
      toast.error('Errore durante il salvataggio delle lavorazioni');
    } finally {
      setSaving(false);
    }
  };

  const total = laborItems.reduce((s, i) => s + i.hours * i.costPerHour, 0);

  return (
    <AppleCard hover={false}>
      <AppleCardContent>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
            <Clock className="h-4 w-4 text-[var(--text-tertiary)]" />
            Lavorazioni
          </h3>
          <AppleButton
            variant="ghost"
            size="sm"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={addItem}
          >
            Aggiungi lavorazione
          </AppleButton>
        </div>

        {laborItems.length === 0 ? (
          <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-center py-8">Nessuna voce di manodopera</p>
        ) : (
          <div className="space-y-3">
            {laborItems.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 rounded-xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)]">
                <Input
                  placeholder="Descrizione"
                  value={item.description}
                  onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  className="flex-1 h-9 text-sm"
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Ore"
                    value={item.hours || ''}
                    onChange={(e) => updateItem(item.id, 'hours', Number(e.target.value))}
                    className="w-20 h-9 text-sm text-center"
                  />
                  <span className="text-footnote text-[var(--text-tertiary)]">x</span>
                  <Input
                    type="number"
                    placeholder="EUR/h"
                    value={item.costPerHour || ''}
                    onChange={(e) => updateItem(item.id, 'costPerHour', Number(e.target.value))}
                    className="w-24 h-9 text-sm text-center"
                  />
                  <span className="text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] w-20 text-right">
                    {formatCurrency(item.hours * item.costPerHour)}
                  </span>
                  <AppleButton
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    className="text-[var(--text-tertiary)] hover:text-[var(--status-error)]"
                    aria-label="Rimuovi"
                  >
                    <Trash2 className="h-4 w-4" />
                  </AppleButton>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-[var(--border-default)]/20 dark:border-[var(--border-default)] flex items-center justify-between">
          <span className="text-body font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Totale Manodopera: {formatCurrency(total)}</span>
          <AppleButton
            onClick={save}
            loading={saving}
            size="sm"
          >
            Salva
          </AppleButton>
        </div>
      </AppleCardContent>
    </AppleCard>
  );
}

/* --- Parts Tab --- */
function PartsTab({ items, woId, onMutate }: { items: PartItem[]; woId: string; onMutate: () => void }): React.ReactElement {
  const [partItems, setPartItems] = useState<PartItem[]>(items);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setPartItems(items); }, [items]);

  const addItem = (): void => {
    setPartItems((prev) => [...prev, { id: generateLocalId(), name: '', quantity: 1, unitCost: 0 }]);
  };

  const updateItem = (id: string, field: keyof PartItem, value: string | number): void => {
    setPartItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const removeItem = (id: string): void => {
    setPartItems((prev) => prev.filter((i) => i.id !== id));
  };

  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard/work-orders/${woId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partItems }),
      });
      if (!res.ok) throw new Error('Errore salvataggio');
      toast.success('Ricambi salvati');
      onMutate();
    } catch {
      toast.error('Errore durante il salvataggio dei ricambi');
    } finally {
      setSaving(false);
    }
  };

  const total = partItems.reduce((s, i) => s + i.quantity * i.unitCost, 0);

  return (
    <AppleCard hover={false}>
      <AppleCardContent>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
            <Package className="h-4 w-4 text-[var(--text-tertiary)]" />
            Ricambi
          </h3>
          <AppleButton
            variant="ghost"
            size="sm"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={addItem}
          >
            Aggiungi ricambio
          </AppleButton>
        </div>

        {partItems.length === 0 ? (
          <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-center py-8">Nessun ricambio inserito</p>
        ) : (
          <div className="space-y-3">
            {partItems.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 rounded-xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)]">
                <Input
                  placeholder="Nome ricambio"
                  value={item.name}
                  onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                  className="flex-1 h-9 text-sm"
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Qta"
                    value={item.quantity || ''}
                    onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                    className="w-20 h-9 text-sm text-center"
                  />
                  <span className="text-footnote text-[var(--text-tertiary)]">x</span>
                  <Input
                    type="number"
                    placeholder="EUR"
                    value={item.unitCost || ''}
                    onChange={(e) => updateItem(item.id, 'unitCost', Number(e.target.value))}
                    className="w-24 h-9 text-sm text-center"
                  />
                  <span className="text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] w-20 text-right">
                    {formatCurrency(item.quantity * item.unitCost)}
                  </span>
                  <AppleButton
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    className="text-[var(--text-tertiary)] hover:text-[var(--status-error)]"
                    aria-label="Rimuovi"
                  >
                    <Trash2 className="h-4 w-4" />
                  </AppleButton>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-[var(--border-default)]/20 dark:border-[var(--border-default)] flex items-center justify-between">
          <span className="text-body font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Totale Ricambi: {formatCurrency(total)}</span>
          <AppleButton
            onClick={save}
            loading={saving}
            size="sm"
          >
            Salva
          </AppleButton>
        </div>
      </AppleCardContent>
    </AppleCard>
  );
}

/* --- Timer Tab --- */
function TimerTab({ entries, woId, onMutate }: { entries: TimeEntry[]; woId: string; onMutate: () => void }): React.ReactElement {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [timerAction, setTimerAction] = useState<'start' | 'pause' | 'stop' | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check if there's an active entry (no end time)
  const activeEntry = entries.find((e) => !e.end);

  useEffect(() => {
    if (activeEntry) {
      setIsRunning(true);
      const startMs = new Date(activeEntry.start).getTime();
      const tick = (): void => {
        setElapsed(Math.floor((Date.now() - startMs) / 1000));
      };
      tick();
      intervalRef.current = setInterval(tick, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeEntry]);

  const formatTimer = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleTimerAction = async (action: 'start' | 'stop'): Promise<void> => {
    setTimerAction(action);
    try {
      const res = await fetch(`/api/dashboard/work-orders/${woId}/timer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error('Errore timer');
      toast.success(action === 'start' ? 'Timer avviato' : 'Timer fermato');
      if (action === 'stop') {
        setIsRunning(false);
        setElapsed(0);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
      onMutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore timer');
    } finally {
      setTimerAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Timer Display */}
      <AppleCard hover={false}>
        <AppleCardContent>
          <div className="text-center py-4">
            <p className="text-6xl font-mono font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-6">
              {formatTimer(elapsed)}
            </p>
            <div className="flex items-center justify-center gap-3">
              {!isRunning ? (
                <AppleButton
                  onClick={() => handleTimerAction('start')}
                  disabled={timerAction !== null}
                  loading={timerAction === 'start'}
                  icon={<Play className="h-4 w-4" />}
                >
                  Avvia
                </AppleButton>
              ) : (
                <AppleButton
                  variant="secondary"
                  onClick={() => handleTimerAction('stop')}
                  disabled={timerAction !== null}
                  loading={timerAction === 'stop'}
                  icon={<Square className="h-4 w-4" />}
                  className="!bg-[var(--status-error)] !text-[var(--text-on-brand)] hover:!bg-[var(--status-error)]"
                >
                  Ferma
                </AppleButton>
              )}
            </div>
          </div>
        </AppleCardContent>
      </AppleCard>

      {/* Time Entries History */}
      {entries.length > 0 && (
        <AppleCard hover={false}>
          <AppleCardContent>
            <h3 className="text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-4">Registro Tempi</h3>
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-2 border-b border-[var(--border-default)]/10 dark:border-[var(--border-default)]/50 last:border-b-0">
                  <div>
                    <p className="text-body text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                      {formatDateTime(entry.start)}
                      {entry.end ? ` → ${formatDateTime(entry.end)}` : ' (in corso)'}
                    </p>
                    {entry.technicianName && (
                      <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">{entry.technicianName}</p>
                    )}
                  </div>
                  {entry.duration != null && (
                    <span className="text-body font-mono font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                      {formatTimer(entry.duration * 60)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </AppleCardContent>
        </AppleCard>
      )}
    </div>
  );
}

/* --- Photos Tab --- */
function PhotosTab({ photos }: { photos: string[] }): React.ReactElement {
  if (photos.length === 0) {
    return (
      <EmptyState
        icon={Camera}
        title="Nessuna foto"
        description="Non ci sono foto allegate a questo ordine di lavoro."
        variant="first-time"
      />
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {photos.map((url, i) => (
        <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-[var(--border-default)]/20 dark:border-[var(--border-default)] bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)]">
          <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
        </div>
      ))}
    </div>
  );
}

/* --- Audit Tab --- */
function AuditTab({ entries }: { entries: AuditEntry[] }): React.ReactElement {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Nessuna attivita registrata"
        description="Lo storico delle attivita apparira qui quando vengono effettuati cambiamenti."
        variant="first-time"
      />
    );
  }

  return (
    <AppleCard hover={false}>
      <AppleCardContent>
        <h3 className="text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <History className="h-4 w-4 text-[var(--text-tertiary)]" />
          Storico Attivita
        </h3>
        <div className="relative pl-6">
          <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-apple-border/20 dark:bg-[var(--border-default)]" />
          <div className="space-y-4">
            {entries.map((entry) => (
              <div key={entry.id} className="relative">
                <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-[var(--brand)] border-2 border-[var(--border-default)] dark:border-[var(--surface-elevated)]" />
                <div>
                  <p className="text-body text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                    {entry.action}
                    {entry.fromStatus && entry.toStatus && (
                      <span className="text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                        {' '}({STATUS_CONFIG[entry.fromStatus]?.label || entry.fromStatus} → {STATUS_CONFIG[entry.toStatus]?.label || entry.toStatus})
                      </span>
                    )}
                  </p>
                  <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-0.5">
                    {formatDateTime(entry.createdAt)}
                    {entry.userName && ` — ${entry.userName}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppleCardContent>
    </AppleCard>
  );
}
