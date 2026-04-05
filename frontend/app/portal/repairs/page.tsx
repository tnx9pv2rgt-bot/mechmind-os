'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import {
  Wrench,
  Car,
  CheckCircle,
  AlertCircle,
  Package,
  Shield,
  Truck,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';

interface PortalRepair {
  id: string;
  woNumber: string;
  status: string;
  vehicleMake: string;
  vehicleModel: string;
  vehiclePlate: string;
  diagnosis: string | null;
  customerRequest: string | null;
  mileageIn: number | null;
  laborCost: number | null;
  partsCost: number | null;
  totalCost: number | null;
  actualStartTime: string | null;
  actualCompletionTime: string | null;
  estimatedCompletion: string | null;
  createdAt: string;
  updatedAt: string;
  items: Array<{ description: string; status: string }>;
}

interface BackendVehicle {
  make?: string;
  model?: string;
  licensePlate?: string;
}

interface BackendWorkOrder {
  id: string;
  woNumber: string;
  status: string;
  vehicle?: BackendVehicle;
  diagnosis?: string | null;
  customerRequest?: string | null;
  mileageIn?: number | null;
  laborCost?: number | string | null;
  partsCost?: number | string | null;
  totalCost?: number | string | null;
  actualStartTime?: string | null;
  actualCompletionTime?: string | null;
  estimatedCompletion?: string | null;
  createdAt: string;
  updatedAt?: string;
  items?: Array<{ description: string; status: string }>;
}

interface BackendRepairResponse {
  data?: BackendWorkOrder[];
}

// FSM states in order
const fsmSteps = [
  { key: 'CHECKED_IN', label: 'Accettato', icon: Car, short: 'Accettato' },
  { key: 'INSPECTION', label: 'In Diagnosi', icon: ClipboardCheck, short: 'Diagnosi' },
  { key: 'WAITING_PARTS', label: 'Attesa Ricambi', icon: Package, short: 'Ricambi' },
  { key: 'IN_PROGRESS', label: 'In Lavorazione', icon: Wrench, short: 'Lavorazione' },
  { key: 'QUALITY_CHECK', label: 'Controllo Qualita', icon: Shield, short: 'Qualita' },
  { key: 'READY', label: 'Pronto per Ritiro', icon: Truck, short: 'Pronto' },
];

function getStepIndex(status: string): number {
  const map: Record<string, number> = {
    OPEN: 0,
    PENDING: 0,
    CHECKED_IN: 0,
    INSPECTION: 1,
    WAITING_PARTS: 2,
    IN_PROGRESS: 3,
    QUALITY_CHECK: 4,
    READY: 5,
    COMPLETED: 6,
    DELIVERED: 6,
    INVOICED: 6,
  };
  return map[status] ?? 0;
}

const statusConfig: Record<string, { color: string; label: string }> = {
  OPEN: { color: 'bg-gray-500', label: 'Aperto' },
  PENDING: { color: 'bg-gray-500', label: 'In Attesa' },
  IN_PROGRESS: { color: 'bg-blue-500', label: 'In Lavorazione' },
  WAITING_PARTS: { color: 'bg-orange-500', label: 'Attesa Ricambi' },
  READY: { color: 'bg-green-500', label: 'Pronto' },
  COMPLETED: { color: 'bg-purple-500', label: 'Completato' },
  INVOICED: { color: 'bg-teal-500', label: 'Fatturato' },
};

function mapRepairs(json: BackendRepairResponse): PortalRepair[] {
  const data = json.data || [];
  return data.map((wo) => ({
    id: wo.id || '',
    woNumber: wo.woNumber || '',
    status: wo.status || 'OPEN',
    vehicleMake: wo.vehicle?.make || '',
    vehicleModel: wo.vehicle?.model || '',
    vehiclePlate: wo.vehicle?.licensePlate || '',
    diagnosis: wo.diagnosis || null,
    customerRequest: wo.customerRequest || null,
    mileageIn: wo.mileageIn || null,
    laborCost: Number(wo.laborCost || 0) || null,
    partsCost: Number(wo.partsCost || 0) || null,
    totalCost: Number(wo.totalCost || 0) || null,
    actualStartTime: wo.actualStartTime || null,
    actualCompletionTime: wo.actualCompletionTime || null,
    estimatedCompletion: wo.estimatedCompletion || null,
    createdAt: wo.createdAt || '',
    updatedAt: wo.updatedAt || '',
    items: wo.items || [],
  }));
}

function StatusStepper({ status }: { status: string }): React.ReactElement {
  const activeIndex = getStepIndex(status);
  const isCompleted = activeIndex >= fsmSteps.length;

  return (
    <div className='flex items-center gap-0.5 sm:gap-1 w-full overflow-x-auto py-2'>
      {fsmSteps.map((step, index) => {
        const isDone = index < activeIndex || isCompleted;
        const isCurrent = index === activeIndex && !isCompleted;
        const StepIcon = step.icon;

        return (
          <div key={step.key} className='flex items-center flex-1 min-w-0'>
            <div className='flex flex-col items-center min-w-0'>
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  isDone
                    ? 'bg-apple-green text-white'
                    : isCurrent
                      ? 'bg-apple-blue text-white ring-2 ring-apple-blue/30'
                      : 'bg-gray-200 dark:bg-[var(--border-default)] text-gray-400'
                }`}
              >
                {isDone ? (
                  <CheckCircle className='h-4 w-4' />
                ) : (
                  <StepIcon className={`h-3.5 w-3.5 ${isCurrent ? 'animate-pulse' : ''}`} />
                )}
              </div>
              <span
                className={`text-[9px] sm:text-[10px] mt-1 text-center leading-tight truncate max-w-[60px] ${
                  isDone
                    ? 'text-apple-green font-medium'
                    : isCurrent
                      ? 'text-apple-blue font-medium'
                      : 'text-apple-gray dark:text-[var(--text-secondary)]'
                }`}
              >
                {step.short}
              </span>
            </div>
            {index < fsmSteps.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-0.5 mt-[-16px] ${
                  index < activeIndex ? 'bg-apple-green' : 'bg-gray-200 dark:bg-[var(--border-default)]'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PortalRepairsPage(): React.ReactElement {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  const {
    data: rawData,
    error: repairsError,
    isLoading,
    mutate,
  } = useSWR<BackendRepairResponse>('/api/portal/repairs', fetcher);
  const repairs = rawData ? mapRepairs(rawData) : [];

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-bold text-apple-dark dark:text-[var(--text-primary)]'>
            Stato Riparazioni
          </h1>
        </div>
        <div className='flex items-center justify-center h-64'>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className='w-8 h-8 border-2 border-apple-blue border-t-transparent rounded-full'
          />
        </div>
      </div>
    );
  }

  if (repairsError) {
    return (
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-bold text-apple-dark dark:text-[var(--text-primary)]'>
            Stato Riparazioni
          </h1>
        </div>
        <div className='text-center py-16'>
          <AlertCircle className='h-12 w-12 text-apple-red/40 mx-auto mb-4' />
          <p className='text-apple-gray dark:text-[var(--text-secondary)] mb-4'>
            Impossibile caricare le riparazioni
          </p>
          <button onClick={() => mutate()} className='text-apple-blue hover:underline'>
            Riprova
          </button>
        </div>
      </div>
    );
  }

  const paginatedRepairs = repairs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeRepairs = paginatedRepairs.filter((r) =>
    ['OPEN', 'PENDING', 'CHECKED_IN', 'INSPECTION', 'IN_PROGRESS', 'WAITING_PARTS', 'QUALITY_CHECK', 'READY'].includes(r.status),
  );
  const completedRepairs = paginatedRepairs.filter((r) =>
    ['COMPLETED', 'INVOICED', 'DELIVERED'].includes(r.status),
  );

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold text-apple-dark dark:text-[var(--text-primary)]'>
          Stato Riparazioni
        </h1>
        <p className='text-apple-gray dark:text-[var(--text-secondary)] mt-1'>
          Segui lo stato delle riparazioni in tempo reale
        </p>
      </div>

      {/* Active Repairs */}
      {activeRepairs.length > 0 && (
        <div className='space-y-4'>
          <h2 className='text-lg font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
            Riparazioni Attive
          </h2>
          {activeRepairs.map((repair) => {
            const status = statusConfig[repair.status] || statusConfig.OPEN;
            const isExpanded = expandedId === repair.id;

            return (
              <motion.div
                key={repair.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AppleCard>
                  <AppleCardContent>
                    {/* Header */}
                    <div className='flex items-start justify-between mb-4'>
                      <div className='flex items-center gap-3'>
                        <div className='w-12 h-12 rounded-2xl bg-apple-blue/10 flex items-center justify-center'>
                          <Wrench className='h-6 w-6 text-apple-blue' />
                        </div>
                        <div>
                          <p className='font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                            {repair.woNumber}
                          </p>
                          <p className='text-sm text-apple-gray dark:text-[var(--text-secondary)]'>
                            <Car className='h-3 w-3 inline mr-1' />
                            {repair.vehicleMake} {repair.vehicleModel} — {repair.vehiclePlate}
                          </p>
                        </div>
                      </div>
                      <Badge className={`${status.color} text-white`}>{status.label}</Badge>
                    </div>

                    {/* Status Stepper */}
                    <div className='mb-4'>
                      <StatusStepper status={repair.status} />
                    </div>

                    {/* Estimated completion */}
                    {repair.estimatedCompletion && (
                      <div className='mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center gap-2'>
                        <Clock className='h-4 w-4 text-apple-blue' />
                        <p className='text-sm text-apple-blue'>
                          Stima completamento:{' '}
                          {new Date(repair.estimatedCompletion).toLocaleDateString('it-IT', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'long',
                          })}
                        </p>
                      </div>
                    )}

                    {/* Last update */}
                    {repair.updatedAt && (
                      <p className='text-xs text-apple-gray dark:text-[var(--text-secondary)] mb-3'>
                        Ultimo aggiornamento:{' '}
                        {new Date(repair.updatedAt).toLocaleString('it-IT', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}

                    {/* Expand toggle */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : repair.id)}
                      className='flex items-center gap-1 text-sm text-apple-blue hover:underline'
                    >
                      {isExpanded ? (
                        <>
                          Nascondi dettagli <ChevronUp className='h-4 w-4' />
                        </>
                      ) : (
                        <>
                          Vedi dettagli <ChevronDown className='h-4 w-4' />
                        </>
                      )}
                    </button>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className='overflow-hidden'
                        >
                          <div className='mt-4 pt-4 border-t border-apple-border/20 dark:border-[var(--border-default)] space-y-3'>
                            {repair.diagnosis && (
                              <div className='p-3 bg-apple-light-gray/30 dark:bg-[var(--surface-hover)] rounded-xl'>
                                <p className='text-xs text-apple-gray dark:text-[var(--text-secondary)] mb-1'>
                                  Diagnosi
                                </p>
                                <p className='text-sm text-apple-dark dark:text-[var(--text-primary)]'>
                                  {repair.diagnosis}
                                </p>
                              </div>
                            )}

                            {repair.customerRequest && (
                              <div className='p-3 bg-apple-light-gray/30 dark:bg-[var(--surface-hover)] rounded-xl'>
                                <p className='text-xs text-apple-gray dark:text-[var(--text-secondary)] mb-1'>
                                  Richiesta cliente
                                </p>
                                <p className='text-sm text-apple-dark dark:text-[var(--text-primary)]'>
                                  {repair.customerRequest}
                                </p>
                              </div>
                            )}

                            {repair.items && repair.items.length > 0 && (
                              <div className='space-y-2'>
                                <p className='text-xs text-apple-gray dark:text-[var(--text-secondary)]'>
                                  Lavori previsti
                                </p>
                                {repair.items.map((item, i) => (
                                  <div
                                    key={i}
                                    className='flex items-center justify-between p-2 bg-apple-light-gray/20 dark:bg-[var(--surface-hover)] rounded-lg'
                                  >
                                    <span className='text-sm text-apple-dark dark:text-[var(--text-primary)]'>
                                      {item.description}
                                    </span>
                                    <Badge className='text-[10px]'>{item.status}</Badge>
                                  </div>
                                ))}
                              </div>
                            )}

                            {repair.totalCost !== null && repair.totalCost > 0 && (
                              <div className='flex items-center justify-between pt-3 border-t border-apple-border/20 dark:border-[var(--border-default)]'>
                                <span className='text-sm text-apple-gray dark:text-[var(--text-secondary)]'>
                                  Costo Stimato
                                </span>
                                <span className='font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                                  {repair.totalCost.toLocaleString('it-IT', {
                                    style: 'currency',
                                    currency: 'EUR',
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </AppleCardContent>
                </AppleCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Completed */}
      {completedRepairs.length > 0 && (
        <div className='space-y-4'>
          <h2 className='text-lg font-semibold text-apple-dark dark:text-[var(--text-primary)]'>Completate</h2>
          {completedRepairs.map((repair) => {
            const status = statusConfig[repair.status] || statusConfig.COMPLETED;
            return (
              <AppleCard key={repair.id}>
                <AppleCardContent>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <CheckCircle className='h-5 w-5 text-apple-green' />
                      <div>
                        <p className='font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                          {repair.woNumber} — {repair.vehicleMake} {repair.vehicleModel}
                        </p>
                        <p className='text-sm text-apple-gray dark:text-[var(--text-secondary)]'>
                          {repair.vehiclePlate}
                          {repair.actualCompletionTime &&
                            ` — Completato il ${new Date(repair.actualCompletionTime).toLocaleDateString('it-IT')}`}
                        </p>
                      </div>
                    </div>
                    <div className='text-right'>
                      <Badge className={`${status.color} text-white text-xs`}>{status.label}</Badge>
                      {repair.totalCost !== null && repair.totalCost > 0 && (
                        <p className='text-sm font-semibold mt-1 text-apple-dark dark:text-[var(--text-primary)]'>
                          {repair.totalCost.toLocaleString('it-IT', {
                            style: 'currency',
                            currency: 'EUR',
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            );
          })}
        </div>
      )}

      {repairs.length === 0 && (
        <AppleCard>
          <AppleCardContent className='text-center py-12'>
            <Wrench className='h-12 w-12 text-apple-gray mx-auto mb-4' />
            <h3 className='text-lg font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2'>
              Nessuna riparazione in corso
            </h3>
            <p className='text-apple-gray dark:text-[var(--text-secondary)]'>
              Quando avrai riparazioni attive, potrai seguirne lo stato qui.
            </p>
          </AppleCardContent>
        </AppleCard>
      )}

      <Pagination
        page={page}
        totalPages={Math.ceil(repairs.length / PAGE_SIZE)}
        onPageChange={setPage}
      />
    </div>
  );
}
