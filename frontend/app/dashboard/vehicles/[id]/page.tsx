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
  Loader2,
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { ErrorState } from '@/components/patterns/error-state';
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
  DRAFT: { label: 'Bozza', className: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
  OPEN: { label: 'Aperto', className: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
  IN_PROGRESS: { label: 'In Lavorazione', className: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' },
  QC: { label: 'Controllo Qualita', className: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' },
  COMPLETED: { label: 'Completato', className: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
  DELIVERED: { label: 'Consegnato', className: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300' },
  CANCELLED: { label: 'Annullato', className: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' },
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
        <header className="">
          <div className="px-4 sm:px-8 py-5">
            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
            <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </header>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-apple-blue" />
        </div>
      </div>
    );
  }

  // Error
  if (error || !vehicle) {
    return (
      <div className="min-h-screen">
        <header className="">
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
      <header className="">
        <div className="px-4 sm:px-8 py-5">
          <Breadcrumb items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Veicoli', href: '/dashboard/vehicles' },
            { label: formatPlate(vehicle.licensePlate) },
          ]} />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-apple-blue/10 flex items-center justify-center flex-shrink-0">
                <Car className="h-6 w-6 text-apple-blue" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span className="inline-block px-3 py-1.5 bg-apple-light-gray dark:bg-[var(--surface-hover)] rounded-lg font-mono font-bold text-apple-dark dark:text-[var(--text-primary)] text-sm tracking-wider">
                    {formatPlate(vehicle.licensePlate)}
                  </span>
                </div>
                <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)] mt-1">
                  {vehicle.make} {vehicle.model} {vehicle.year ? `(${vehicle.year})` : ''}
                  {ownerName && (
                    <>
                      {' — '}
                      <Link href={`/dashboard/customers/${vehicle.customer?.id}`} className="text-apple-blue hover:underline">
                        {ownerName}
                      </Link>
                    </>
                  )}
                </p>
              </div>
            </div>
            <AppleButton
              variant="secondary"
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => router.push(`/dashboard/vehicles/${vehicleId}?tab=dettagli&edit=true`)}
            >
              Modifica
            </AppleButton>
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
                      ? 'border-apple-blue text-apple-blue bg-apple-blue/5'
                      : 'border-transparent text-apple-gray dark:text-[var(--text-secondary)] hover:text-apple-dark dark:hover:text-[var(--text-primary)]'
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

/* --- Details Tab --- */
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
    <AppleCard hover={false}>
      <AppleCardHeader>
        <h2 className="text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]">Informazioni Veicolo</h2>
      </AppleCardHeader>
      <AppleCardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {fields.map((f) => (
            <div key={f.label}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-apple-gray dark:text-[var(--text-secondary)]">{f.icon}</span>
                <span className="text-footnote font-medium text-apple-gray dark:text-[var(--text-secondary)] uppercase tracking-wider">{f.label}</span>
              </div>
              <p className={`text-body font-medium ${f.label === 'Targa' ? 'font-mono font-bold text-apple-dark dark:text-[var(--text-primary)]' : 'text-apple-dark dark:text-[var(--text-primary)]'}`}>
                {f.value}
              </p>
            </div>
          ))}
        </div>

        {/* Owner info */}
        {vehicle.customer && (
          <div className="mt-8 pt-6 border-t border-apple-border/20 dark:border-[var(--border-default)]">
            <h3 className="text-body font-semibold text-apple-dark dark:text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-apple-gray" />
              Proprietario
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)] uppercase tracking-wider mb-1">Nome</p>
                <Link href={`/dashboard/customers/${vehicle.customer.id}`} className="text-body text-apple-blue hover:underline font-medium">
                  {[vehicle.customer.firstName, vehicle.customer.lastName].filter(Boolean).join(' ') || '—'}
                </Link>
              </div>
              {vehicle.customer.email && (
                <div>
                  <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)] uppercase tracking-wider mb-1">Email</p>
                  <p className="text-body text-apple-dark dark:text-[var(--text-primary)]">{vehicle.customer.email}</p>
                </div>
              )}
              {vehicle.customer.phone && (
                <div>
                  <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)] uppercase tracking-wider mb-1">Telefono</p>
                  <p className="text-body text-apple-dark dark:text-[var(--text-primary)]">{vehicle.customer.phone}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </AppleCardContent>
    </AppleCard>
  );
}

/* --- Maintenance Tab --- */
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
        <AppleCard key={item.id} hover={false}>
          <AppleCardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {item.status === 'completed' ? (
                  <CheckCircle className="h-5 w-5 text-apple-green" />
                ) : (
                  <Clock className="h-5 w-5 text-apple-orange" />
                )}
                <div>
                  <p className="text-body font-medium text-apple-dark dark:text-[var(--text-primary)]">{item.description}</p>
                  <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)]">
                    {item.scheduledDate ? `Pianificato: ${formatDate(item.scheduledDate)}` : ''}
                    {item.completedDate ? ` | Completato: ${formatDate(item.completedDate)}` : ''}
                  </p>
                </div>
              </div>
              {item.cost != null && (
                <span className="text-body font-medium text-apple-dark dark:text-[var(--text-primary)]">
                  {formatCurrency(item.cost)}
                </span>
              )}
            </div>
          </AppleCardContent>
        </AppleCard>
      ))}
    </div>
  );
}

/* --- Work Orders Tab --- */
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
    <AppleCard hover={false}>
      <AppleCardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-apple-border/20 dark:border-[var(--border-default)]">
                <th className="text-left px-4 py-3 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]"># OdL</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)] hidden sm:table-cell">Stato</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)] hidden md:table-cell">Diagnosi</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]">Totale</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)] hidden sm:table-cell">Data</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.map((wo) => {
                const status = WO_STATUS_MAP[wo.status] || { label: wo.status, className: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300' };
                return (
                  <tr key={wo.id} className="border-b border-apple-border/10 dark:border-[var(--border-default)]/50 last:border-b-0 hover:bg-apple-light-gray/30 dark:hover:bg-[var(--surface-hover)] transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/work-orders/${wo.id}`} className="text-body text-apple-blue hover:underline font-medium">
                        {wo.woNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-body text-apple-gray dark:text-[var(--text-secondary)] hidden md:table-cell max-w-[200px] truncate">
                      {wo.diagnosis || '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-body font-medium text-apple-dark dark:text-[var(--text-primary)]">
                      {formatCurrency(wo.totalCost)}
                    </td>
                    <td className="px-4 py-3 text-right text-footnote text-apple-gray dark:text-[var(--text-secondary)] hidden sm:table-cell">
                      {formatDate(wo.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AppleCardContent>
    </AppleCard>
  );
}

/* --- Inspections Tab --- */
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
          className="block"
        >
          <AppleCard>
            <AppleCardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body font-medium text-apple-dark dark:text-[var(--text-primary)]">{insp.inspectionNumber}</p>
                  <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)] mt-1">
                    {formatDate(insp.createdAt)}
                    {insp.overallCondition && ` — Condizione: ${insp.overallCondition}`}
                  </p>
                </div>
                <span className={`text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full ${
                  insp.status === 'COMPLETED'
                    ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                    : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
                }`}>
                  {insp.status === 'COMPLETED' ? 'Completata' : 'In corso'}
                </span>
              </div>
            </AppleCardContent>
          </AppleCard>
        </Link>
      ))}
    </div>
  );
}

/* --- OBD Tab --- */
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
      <AppleCard hover={false}>
        <AppleCardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-2.5 w-2.5 rounded-full bg-apple-green animate-pulse" />
            <span className="text-body font-medium text-apple-green">Dispositivo connesso</span>
            {data.lastReading && (
              <span className="text-footnote text-apple-gray dark:text-[var(--text-secondary)] ml-2">
                Ultimo aggiornamento: {formatDate(data.lastReading)}
              </span>
            )}
          </div>

          {readings.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {readings.map((r) => (
                <div key={r.label} className="p-4 rounded-xl bg-apple-light-gray/30 dark:bg-[var(--surface-hover)]">
                  <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)] uppercase tracking-wider">{r.label}</p>
                  <p className="text-title-1 font-bold text-apple-dark dark:text-[var(--text-primary)] mt-1">
                    {r.value} <span className="text-body font-normal text-apple-gray">{r.unit}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </AppleCardContent>
      </AppleCard>

      {data.dtcCodes && data.dtcCodes.length > 0 && (
        <AppleCard hover={false}>
          <AppleCardContent>
            <h3 className="text-body font-semibold text-apple-red mb-3">Codici errore (DTC)</h3>
            <div className="flex flex-wrap gap-2">
              {data.dtcCodes.map((code) => (
                <span key={code} className="px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg font-mono text-body">
                  {code}
                </span>
              ))}
            </div>
          </AppleCardContent>
        </AppleCard>
      )}
    </div>
  );
}
