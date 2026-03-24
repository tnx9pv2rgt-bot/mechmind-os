'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import Link from 'next/link';
import { useState } from 'react';
import {
  Car,
  User,
  Wrench,
  ClipboardList,
  Activity,
  Pencil,
  Gauge,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ErrorState } from '@/components/patterns/error-state';
import { DetailSkeleton } from '@/components/patterns/loading-skeleton';
import { EmptyState } from '@/components/patterns/empty-state';
import { formatPlate, formatNumber, formatDate, formatCurrency } from '@/lib/utils/format';

interface VehicleDetail {
  id: string;
  licensePlate: string;
  make: string;
  model: string;
  year?: number;
  vin?: string;
  color?: string;
  fuelType?: string;
  mileage?: number;
  status: string;
  customerId?: string;
  customer?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  maintenanceItems?: MaintenanceItem[];
  workOrders?: WorkOrderSummary[];
  inspections?: InspectionSummary[];
  obdData?: OBDData;
  createdAt: string;
  updatedAt: string;
}

interface MaintenanceItem {
  id: string;
  description: string;
  status: string;
  scheduledDate?: string;
  completedDate?: string;
  cost?: number;
}

interface WorkOrderSummary {
  id: string;
  woNumber: string;
  status: string;
  totalCost: number;
  createdAt: string;
  diagnosis?: string;
}

interface InspectionSummary {
  id: string;
  inspectionNumber: string;
  status: string;
  createdAt: string;
  overallCondition?: string;
}

interface OBDData {
  connected: boolean;
  lastReading?: string;
  dtcCodes?: string[];
  engineRpm?: number;
  coolantTemp?: number;
  batteryVoltage?: number;
}

const TABS = [
  { key: 'dettagli', label: 'Dettagli', icon: Car },
  { key: 'manutenzione', label: 'Manutenzione', icon: Wrench },
  { key: 'storico-odl', label: 'Storico OdL', icon: ClipboardList },
  { key: 'ispezioni', label: 'Ispezioni', icon: FileText },
  { key: 'obd', label: 'OBD', icon: Activity },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const WO_STATUS_MAP: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Bozza', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  OPEN: { label: 'Aperto', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  IN_PROGRESS: { label: 'In Lavorazione', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  QC: { label: 'Controllo Qualità', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  COMPLETED: { label: 'Completato', className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  DELIVERED: { label: 'Consegnato', className: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
  CANCELLED: { label: 'Annullato', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

export default function VehicleDetailPage(): React.ReactElement {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const vehicleId = params.id as string;
  const activeTab = (searchParams.get('tab') as TabKey) || 'dettagli';

  const { data: rawData, error, isLoading, mutate } = useSWR<VehicleDetail | { data: VehicleDetail }>(
    `/api/dashboard/vehicles/${vehicleId}`,
    fetcher,
  );

  const vehicle: VehicleDetail | null = (() => {
    if (!rawData) return null;
    if ('data' in rawData && rawData.data && typeof rawData.data === 'object' && 'id' in rawData.data) {
      return rawData.data as VehicleDetail;
    }
    return rawData as VehicleDetail;
  })();

  const setTab = (tab: TabKey): void => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('tab', tab);
    router.push(`/dashboard/vehicles/${vehicleId}?${newParams.toString()}`);
  };

  const ownerName = vehicle?.customer
    ? [vehicle.customer.firstName, vehicle.customer.lastName].filter(Boolean).join(' ') || 'Cliente'
    : null;

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
        <div className="p-4 sm:p-8">
          <DetailSkeleton />
        </div>
      </div>
    );
  }

  // Error
  if (error || !vehicle) {
    return (
      <div className="min-h-screen">
        <header className="bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
          <div className="px-4 sm:px-8 py-5">
            <Breadcrumb items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Veicoli', href: '/dashboard/vehicles' },
              { label: 'Errore' },
            ]} />
          </div>
        </header>
        <ErrorState
          variant="not-found"
          title="Veicolo non trovato"
          description="Il veicolo richiesto non esiste o è stato rimosso."
          onRetry={() => mutate()}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="px-4 sm:px-8 py-5">
          <Breadcrumb items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Veicoli', href: '/dashboard/vehicles' },
            { label: formatPlate(vehicle.licensePlate) },
          ]} />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <Car className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span className="inline-block px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono font-bold text-gray-900 dark:text-white text-sm tracking-wider">
                    {formatPlate(vehicle.licensePlate)}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  {vehicle.make} {vehicle.model} {vehicle.year ? `(${vehicle.year})` : ''}
                  {ownerName && (
                    <>
                      {' — '}
                      <Link href={`/dashboard/customers/${vehicle.customer?.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                        {ownerName}
                      </Link>
                    </>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/dashboard/vehicles/${vehicleId}?tab=dettagli&edit=true`)}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors min-h-[44px]"
            >
              <Pencil className="h-4 w-4" />
              Modifica
            </button>
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
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Tab Content */}
      <div className="p-4 sm:p-8">
        {activeTab === 'dettagli' && <DetailsTab vehicle={vehicle} />}
        {activeTab === 'manutenzione' && <MaintenanceTab items={vehicle.maintenanceItems || []} />}
        {activeTab === 'storico-odl' && <WorkOrdersTab workOrders={vehicle.workOrders || []} />}
        {activeTab === 'ispezioni' && <InspectionsTab inspections={vehicle.inspections || []} vehicleId={vehicleId} />}
        {activeTab === 'obd' && <OBDTab data={vehicle.obdData} />}
      </div>
    </div>
  );
}

/* ─── Details Tab ─── */
function DetailsTab({ vehicle }: { vehicle: VehicleDetail }): React.ReactElement {
  const fields: { label: string; value: string; icon: React.ReactElement }[] = [
    { label: 'Targa', value: formatPlate(vehicle.licensePlate), icon: <Car className="h-4 w-4" /> },
    { label: 'VIN', value: vehicle.vin || '—', icon: <FileText className="h-4 w-4" /> },
    { label: 'Marca', value: vehicle.make || '—', icon: <Car className="h-4 w-4" /> },
    { label: 'Modello', value: vehicle.model || '—', icon: <Car className="h-4 w-4" /> },
    { label: 'Anno', value: vehicle.year ? String(vehicle.year) : '—', icon: <Calendar className="h-4 w-4" /> },
    { label: 'Colore', value: vehicle.color || '—', icon: <Car className="h-4 w-4" /> },
    { label: 'Carburante', value: vehicle.fuelType || '—', icon: <Car className="h-4 w-4" /> },
    { label: 'Chilometraggio', value: vehicle.mileage ? `${formatNumber(vehicle.mileage)} km` : '—', icon: <Gauge className="h-4 w-4" /> },
  ];

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Informazioni Veicolo</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {fields.map((f) => (
          <div key={f.label}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-gray-400 dark:text-gray-500">{f.icon}</span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{f.label}</span>
            </div>
            <p className={`text-sm font-medium ${f.label === 'Targa' ? 'font-mono font-bold text-gray-900 dark:text-white' : 'text-gray-900 dark:text-white'}`}>
              {f.value}
            </p>
          </div>
        ))}
      </div>

      {/* Owner info */}
      {vehicle.customer && (
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            Proprietario
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Nome</p>
              <Link href={`/dashboard/customers/${vehicle.customer.id}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
                {[vehicle.customer.firstName, vehicle.customer.lastName].filter(Boolean).join(' ') || '—'}
              </Link>
            </div>
            {vehicle.customer.email && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Email</p>
                <p className="text-sm text-gray-900 dark:text-white">{vehicle.customer.email}</p>
              </div>
            )}
            {vehicle.customer.phone && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Telefono</p>
                <p className="text-sm text-gray-900 dark:text-white">{vehicle.customer.phone}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Maintenance Tab ─── */
function MaintenanceTab({ items }: { items: MaintenanceItem[] }): React.ReactElement {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Wrench}
        title="Nessuna manutenzione"
        description="Non ci sono interventi di manutenzione pianificati o completati per questo veicolo."
        variant="first-time"
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
        >
          <div className="flex items-center gap-3">
            {item.status === 'completed' ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <Clock className="h-5 w-5 text-yellow-500" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{item.description}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {item.scheduledDate ? `Pianificato: ${formatDate(item.scheduledDate)}` : ''}
                {item.completedDate ? ` | Completato: ${formatDate(item.completedDate)}` : ''}
              </p>
            </div>
          </div>
          {item.cost != null && (
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {formatCurrency(item.cost)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Work Orders Tab ─── */
function WorkOrdersTab({ workOrders }: { workOrders: WorkOrderSummary[] }): React.ReactElement {
  if (workOrders.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Nessun ordine di lavoro"
        description="Non ci sono ordini di lavoro associati a questo veicolo."
        variant="first-time"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400"># OdL</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">Stato</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">Diagnosi</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Totale</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">Data</th>
          </tr>
        </thead>
        <tbody>
          {workOrders.map((wo) => {
            const status = WO_STATUS_MAP[wo.status] || { label: wo.status, className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' };
            return (
              <tr key={wo.id} className="border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/work-orders/${wo.id}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                    {wo.woNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                    {status.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell max-w-[200px] truncate">
                  {wo.diagnosis || '—'}
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                  {formatCurrency(wo.totalCost)}
                </td>
                <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                  {formatDate(wo.createdAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Inspections Tab ─── */
function InspectionsTab({ inspections, vehicleId }: { inspections: InspectionSummary[]; vehicleId: string }): React.ReactElement {
  if (inspections.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Nessuna ispezione"
        description="Non ci sono ispezioni associate a questo veicolo."
        cta={{ label: 'Nuova Ispezione', href: `/dashboard/inspections?vehicle=${vehicleId}` }}
        variant="first-time"
      />
    );
  }

  return (
    <div className="space-y-3">
      {inspections.map((insp) => (
        <Link
          key={insp.id}
          href={`/dashboard/inspections/${insp.id}`}
          className="block p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{insp.inspectionNumber}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatDate(insp.createdAt)}
                {insp.overallCondition && ` — Condizione: ${insp.overallCondition}`}
              </p>
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              insp.status === 'COMPLETED'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
            }`}>
              {insp.status === 'COMPLETED' ? 'Completata' : 'In corso'}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ─── OBD Tab ─── */
function OBDTab({ data }: { data?: OBDData | null }): React.ReactElement {
  if (!data || !data.connected) {
    return (
      <EmptyState
        icon={Activity}
        title="Nessun dispositivo OBD collegato"
        description="Collega un dispositivo OBD-II per visualizzare i dati diagnostici in tempo reale."
        variant="first-time"
      />
    );
  }

  const readings: { label: string; value: string; unit: string }[] = [];
  if (data.engineRpm != null) readings.push({ label: 'Giri motore', value: String(data.engineRpm), unit: 'RPM' });
  if (data.coolantTemp != null) readings.push({ label: 'Temperatura liquido', value: String(data.coolantTemp), unit: '°C' });
  if (data.batteryVoltage != null) readings.push({ label: 'Batteria', value: data.batteryVoltage.toFixed(1), unit: 'V' });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium text-green-600 dark:text-green-400">Dispositivo connesso</span>
          {data.lastReading && (
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
              Ultimo aggiornamento: {formatDate(data.lastReading)}
            </span>
          )}
        </div>

        {readings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {readings.map((r) => (
              <div key={r.label} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{r.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {r.value} <span className="text-sm font-normal text-gray-500">{r.unit}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {data.dtcCodes && data.dtcCodes.length > 0 && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-6">
          <h3 className="text-base font-semibold text-red-700 dark:text-red-300 mb-3">Codici errore (DTC)</h3>
          <div className="flex flex-wrap gap-2">
            {data.dtcCodes.map((code) => (
              <span key={code} className="px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg font-mono text-sm">
                {code}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
