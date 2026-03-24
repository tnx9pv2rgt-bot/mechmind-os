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
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ErrorState } from '@/components/patterns/error-state';
import { DetailSkeleton } from '@/components/patterns/loading-skeleton';
import { EmptyState } from '@/components/patterns/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate, formatDateTime, formatPlate } from '@/lib/utils/format';

/* ─── Types ─── */
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

/* ─── Status Config ─── */
const STATUS_PIPELINE = ['DRAFT', 'OPEN', 'IN_PROGRESS', 'QC', 'COMPLETED', 'DELIVERED'] as const;

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT: { label: 'Bozza', bg: 'bg-gray-100 dark:bg-gray-800', color: 'text-gray-700 dark:text-gray-300' },
  OPEN: { label: 'Aperto', bg: 'bg-blue-100 dark:bg-blue-900/40', color: 'text-blue-700 dark:text-blue-300' },
  IN_PROGRESS: { label: 'In Lavorazione', bg: 'bg-yellow-100 dark:bg-yellow-900/40', color: 'text-yellow-700 dark:text-yellow-300' },
  QC: { label: 'Controllo Qualità', bg: 'bg-purple-100 dark:bg-purple-900/40', color: 'text-purple-700 dark:text-purple-300' },
  COMPLETED: { label: 'Completato', bg: 'bg-green-100 dark:bg-green-900/40', color: 'text-green-700 dark:text-green-300' },
  DELIVERED: { label: 'Consegnato', bg: 'bg-teal-100 dark:bg-teal-900/40', color: 'text-teal-700 dark:text-teal-300' },
  CANCELLED: { label: 'Annullato', bg: 'bg-red-100 dark:bg-red-900/40', color: 'text-red-700 dark:text-red-300' },
  // Fallback old statuses
  PENDING: { label: 'In Attesa', bg: 'bg-yellow-100 dark:bg-yellow-900/40', color: 'text-yellow-700 dark:text-yellow-300' },
  WAITING_PARTS: { label: 'Attesa Ricambi', bg: 'bg-orange-100 dark:bg-orange-900/40', color: 'text-orange-700 dark:text-orange-300' },
  READY: { label: 'Pronto', bg: 'bg-green-100 dark:bg-green-900/40', color: 'text-green-700 dark:text-green-300' },
  INVOICED: { label: 'Fatturato', bg: 'bg-teal-100 dark:bg-teal-900/40', color: 'text-teal-700 dark:text-teal-300' },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  LOW: { label: 'Bassa', className: 'text-gray-500' },
  NORMAL: { label: 'Normale', className: 'text-blue-500' },
  HIGH: { label: 'Alta', className: 'text-orange-500' },
  URGENT: { label: 'Urgente', className: 'text-red-600 font-bold' },
};

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

  const setTab = (tab: TabKey): void => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('tab', tab);
    router.push(`/dashboard/work-orders/${workOrderId}?${p.toString()}`);
  };

  const getStatus = (s: string) => STATUS_CONFIG[s] || STATUS_CONFIG.DRAFT;

  /* ─── Transition ─── */
  const NEXT_STATUS: Record<string, string> = {
    DRAFT: 'OPEN',
    OPEN: 'IN_PROGRESS',
    IN_PROGRESS: 'QC',
    QC: 'COMPLETED',
    COMPLETED: 'DELIVERED',
    // Fallback old statuses
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
      const res = await fetch(`/api/work-orders/${workOrderId}/invoice`, { method: 'POST' });
      if (!res.ok) throw new Error('Errore generazione fattura');
      toast.success('Fattura generata con successo');
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore generazione fattura');
    }
  };

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <header className="bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
          <div className="px-4 sm:px-8 py-5">
            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
            <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </header>
        <div className="p-4 sm:p-8"><DetailSkeleton /></div>
      </div>
    );
  }

  // Error
  if (error || !wo) {
    return (
      <div className="min-h-screen">
        <header className="bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
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
      <header className="bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="px-4 sm:px-8 py-5">
          <Breadcrumb items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'OdL', href: '/dashboard/work-orders' },
            { label: `#${wo.woNumber || wo.id.slice(0, 8)}` },
          ]} />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  OdL #{wo.woNumber || wo.id.slice(0, 8)}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>
                  {sc.label}
                </span>
                <span className={`text-xs font-medium ${priority.className}`}>
                  {priority.label}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {wo.vehicleMake} {wo.vehicleModel} {wo.vehiclePlate ? `- ${formatPlate(wo.vehiclePlate)}` : ''}
                {wo.customerName ? ` | ${wo.customerName}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {nextStatus && nextLabel && (
                <button
                  onClick={() => handleTransition()}
                  disabled={transitioning}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 min-h-[44px]"
                >
                  {transitioning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                  Avanza a {nextLabel}
                </button>
              )}
              {(wo.status === 'COMPLETED' || wo.status === 'READY') && (
                <button
                  onClick={handleGenerateInvoice}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors min-h-[44px]"
                >
                  <FileText className="h-4 w-4" />
                  Genera Fattura
                </button>
              )}
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
                    <div className={`w-6 h-0.5 ${isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                  )}
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      isCurrent
                        ? `${stepConfig.bg} ${stepConfig.color} ring-2 ring-offset-1 ring-blue-500 dark:ring-offset-gray-950`
                        : isCompleted
                          ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
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
                      ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Riepilogo Costi</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Manodopera</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(laborTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Ricambi</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(partsTotal)}</span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-800 pt-3 flex justify-between">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Totale</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Quick Info */}
              {wo.customerName && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    Cliente
                  </h3>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">{wo.customerName}</p>
                  {wo.customerPhone && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{wo.customerPhone}</p>}
                  {wo.customerEmail && <p className="text-xs text-gray-500 dark:text-gray-400">{wo.customerEmail}</p>}
                </div>
              )}

              {wo.vehiclePlate && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Car className="h-4 w-4 text-gray-400" />
                    Veicolo
                  </h3>
                  <p className="font-mono font-bold text-sm text-gray-900 dark:text-white">{formatPlate(wo.vehiclePlate)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {wo.vehicleMake} {wo.vehicleModel} {wo.vehicleYear ? `(${wo.vehicleYear})` : ''}
                  </p>
                  {wo.mileageIn && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Km ingresso: {wo.mileageIn.toLocaleString('it-IT')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Details Tab ─── */
function DetailsTab({ wo }: { wo: WorkOrderDetail }): React.ReactElement {
  return (
    <div className="space-y-6">
      {/* Diagnosis & Request */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Wrench className="h-4 w-4 text-gray-400" />
          Diagnosi e Richiesta
        </h3>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Diagnosi</p>
            <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
              {wo.diagnosis || 'Nessuna diagnosi inserita'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Richiesta del cliente</p>
            <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
              {wo.customerRequest || 'Nessuna richiesta specificata'}
            </p>
          </div>
          {wo.notes && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Note</p>
              <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                {wo.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Assignment */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Assegnazione</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Tecnico</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{wo.technicianName || 'Non assegnato'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Ore stimate</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{wo.estimatedHours != null ? `${wo.estimatedHours} h` : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Ore effettive</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{wo.actualHours != null ? `${wo.actualHours} h` : '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Labor Tab ─── */
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
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          Lavorazioni
        </h3>
        <button
          onClick={addItem}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors min-h-[32px]"
        >
          <Plus className="h-3.5 w-3.5" />
          Aggiungi lavorazione
        </button>
      </div>

      {laborItems.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Nessuna voce di manodopera</p>
      ) : (
        <div className="space-y-3">
          {laborItems.map((item) => (
            <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
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
                <span className="text-xs text-gray-400">x</span>
                <Input
                  type="number"
                  placeholder="EUR/h"
                  value={item.costPerHour || ''}
                  onChange={(e) => updateItem(item.id, 'costPerHour', Number(e.target.value))}
                  className="w-24 h-9 text-sm text-center"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white w-20 text-right">
                  {formatCurrency(item.hours * item.costPerHour)}
                </span>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="Rimuovi"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Totale Manodopera: {formatCurrency(total)}</span>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 min-h-[36px]"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salva
        </button>
      </div>
    </div>
  );
}

/* ─── Parts Tab ─── */
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
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Package className="h-4 w-4 text-gray-400" />
          Ricambi
        </h3>
        <button
          onClick={addItem}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors min-h-[32px]"
        >
          <Plus className="h-3.5 w-3.5" />
          Aggiungi ricambio
        </button>
      </div>

      {partItems.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Nessun ricambio inserito</p>
      ) : (
        <div className="space-y-3">
          {partItems.map((item) => (
            <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
              <Input
                placeholder="Nome ricambio"
                value={item.name}
                onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                className="flex-1 h-9 text-sm"
              />
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Qtà"
                  value={item.quantity || ''}
                  onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                  className="w-20 h-9 text-sm text-center"
                />
                <span className="text-xs text-gray-400">x</span>
                <Input
                  type="number"
                  placeholder="EUR"
                  value={item.unitCost || ''}
                  onChange={(e) => updateItem(item.id, 'unitCost', Number(e.target.value))}
                  className="w-24 h-9 text-sm text-center"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white w-20 text-right">
                  {formatCurrency(item.quantity * item.unitCost)}
                </span>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="Rimuovi"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Totale Ricambi: {formatCurrency(total)}</span>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 min-h-[36px]"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salva
        </button>
      </div>
    </div>
  );
}

/* ─── Timer Tab ─── */
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
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-8 text-center">
        <p className="text-6xl font-mono font-bold text-gray-900 dark:text-white mb-6">
          {formatTimer(elapsed)}
        </p>
        <div className="flex items-center justify-center gap-3">
          {!isRunning ? (
            <button
              onClick={() => handleTimerAction('start')}
              disabled={timerAction !== null}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {timerAction === 'start' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Avvia
            </button>
          ) : (
            <button
              onClick={() => handleTimerAction('stop')}
              disabled={timerAction !== null}
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {timerAction === 'stop' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
              Ferma
            </button>
          )}
        </div>
      </div>

      {/* Time Entries History */}
      {entries.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Registro Tempi</h3>
          <div className="space-y-2">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                <div>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatDateTime(entry.start)}
                    {entry.end ? ` → ${formatDateTime(entry.end)}` : ' (in corso)'}
                  </p>
                  {entry.technicianName && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{entry.technicianName}</p>
                  )}
                </div>
                {entry.duration != null && (
                  <span className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                    {formatTimer(entry.duration * 60)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Photos Tab ─── */
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
        <div key={i} className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900">
          <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
        </div>
      ))}
    </div>
  );
}

/* ─── Audit Tab ─── */
function AuditTab({ entries }: { entries: AuditEntry[] }): React.ReactElement {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Nessuna attività registrata"
        description="Lo storico delle attività apparirà qui quando vengono effettuati cambiamenti."
        variant="first-time"
      />
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <History className="h-4 w-4 text-gray-400" />
        Storico Attività
      </h3>
      <div className="relative pl-6">
        <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-800" />
        <div className="space-y-4">
          {entries.map((entry) => (
            <div key={entry.id} className="relative">
              <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white dark:border-gray-950" />
              <div>
                <p className="text-sm text-gray-900 dark:text-white">
                  {entry.action}
                  {entry.fromStatus && entry.toStatus && (
                    <span className="text-gray-500 dark:text-gray-400">
                      {' '}({STATUS_CONFIG[entry.fromStatus]?.label || entry.fromStatus} → {STATUS_CONFIG[entry.toStatus]?.label || entry.toStatus})
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {formatDateTime(entry.createdAt)}
                  {entry.userName && ` — ${entry.userName}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
