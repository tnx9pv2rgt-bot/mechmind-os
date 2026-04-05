'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Circle,
  Loader2,
  AlertCircle,
  Car,
  ClipboardCheck,
  FileText,
  Wrench,
  Package,
  Shield,
  Truck,
  Clock,
} from 'lucide-react';

interface TrackingData {
  id: string;
  woNumber: string;
  status: string;
  vehicleMake: string;
  vehicleModel: string;
  vehiclePlate: string;
  customerName: string;
  technicianName: string | null;
  bayName: string | null;
  estimatedCompletion: string | null;
  inspectionId: string | null;
  estimateId: string | null;
  checkInPhotos: string[];
  createdAt: string;
  updatedAt: string;
  statusHistory: { status: string; timestamp: string }[];
}

const steps = [
  { key: 'CHECKED_IN', label: 'Veicolo accettato', icon: Car },
  { key: 'INSPECTION', label: 'Ispezione completata', icon: ClipboardCheck },
  { key: 'ESTIMATE_SENT', label: 'Preventivo inviato', icon: FileText },
  { key: 'ESTIMATE_APPROVED', label: 'Preventivo approvato', icon: CheckCircle },
  { key: 'IN_PROGRESS', label: 'In lavorazione', icon: Wrench },
  { key: 'WAITING_PARTS', label: 'In attesa ricambi', icon: Package },
  { key: 'QUALITY_CHECK', label: 'Controllo qualità', icon: Shield },
  { key: 'READY', label: 'Pronto per il ritiro', icon: Truck },
  { key: 'DELIVERED', label: 'Ritirato', icon: CheckCircle },
];

function getActiveStepIndex(status: string): number {
  const map: Record<string, number> = {
    PENDING: 0,
    OPEN: 0,
    CHECKED_IN: 0,
    IN_PROGRESS: 4,
    WAITING_PARTS: 5,
    QUALITY_CHECK: 6,
    COMPLETED: 7,
    READY: 7,
    DELIVERED: 8,
    INVOICED: 8,
  };
  return map[status] ?? 0;
}

export default function PortalTrackingPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || searchParams.get('id') || '';

  const [data, setData] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) {
      setError('Link non valido');
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/portal/tracking/${token}`);
      if (!res.ok) throw new Error('Ordine non trovato');
      const json = await res.json();
      setData(json.data ?? json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-gray-50 dark:bg-[var(--surface-tertiary)]'>
        <Loader2 className='h-8 w-8 animate-spin text-blue-500' />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-[var(--surface-tertiary)] p-8 text-center'>
        <AlertCircle className='h-12 w-12 text-gray-400 dark:text-[var(--text-secondary)] mb-4' />
        <p className='text-gray-600 dark:text-[var(--text-tertiary)]'>{error || 'Ordine non trovato'}</p>
      </div>
    );
  }

  const activeStep = getActiveStepIndex(data.status);

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-[var(--surface-tertiary)]'>
      {/* Header */}
      <header className='bg-white dark:bg-[var(--surface-secondary)] border-b border-gray-200 dark:border-[var(--border-default)]'>
        <div className='max-w-2xl mx-auto px-6 py-6'>
          <div className='flex items-center gap-4'>
            <div className='w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center'>
              <Car className='h-6 w-6 text-blue-500' />
            </div>
            <div>
              <h1 className='text-lg font-bold text-gray-900 dark:text-[var(--text-primary)]'>
                {data.vehicleMake} {data.vehicleModel}
              </h1>
              <p className='text-sm text-gray-500 dark:text-[var(--text-secondary)]'>
                Targa {data.vehiclePlate} — Ordine {data.woNumber}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className='max-w-2xl mx-auto px-6 py-8'>
        {/* Timeline */}
        <div className='bg-white dark:bg-[var(--surface-elevated)] rounded-2xl p-6 shadow-sm'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-[var(--text-primary)] mb-6'>
            Stato del veicolo
          </h2>

          <div className='relative'>
            {steps.map((step, index) => {
              const isCompleted = index < activeStep;
              const isCurrent = index === activeStep;
              const isFuture = index > activeStep;
              const StepIcon = step.icon;

              // Find timestamp
              const historyEntry = (data.statusHistory || []).find(h => h.status === step.key);

              // Special messages
              let extraMessage = '';
              if (isCurrent && data.status === 'WAITING_PARTS') {
                extraMessage = 'In attesa ricambi';
              }
              if (isCurrent && data.status === 'QUALITY_CHECK') {
                extraMessage = 'Controllo qualità in corso';
              }
              if (isCurrent && data.technicianName) {
                extraMessage = `Tecnico: ${data.technicianName}`;
                if (data.bayName) extraMessage += ` — Bay: ${data.bayName}`;
              }

              return (
                <motion.div
                  key={step.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className='flex gap-4 relative'
                >
                  {/* Line */}
                  {index < steps.length - 1 && (
                    <div
                      className={`absolute left-5 top-10 w-0.5 h-full ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-[var(--border-default)]'
                      }`}
                    />
                  )}

                  {/* Icon */}
                  <div
                    className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isCurrent
                          ? 'bg-blue-500 text-white animate-pulse'
                          : 'bg-gray-200 dark:bg-[var(--border-default)] text-gray-400 dark:text-[var(--text-secondary)]'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className='h-5 w-5' />
                    ) : (
                      <StepIcon className='h-5 w-5' />
                    )}
                  </div>

                  {/* Content */}
                  <div className='pb-8 flex-1'>
                    <p
                      className={`font-medium ${
                        isFuture
                          ? 'text-gray-400 dark:text-[var(--text-secondary)]'
                          : 'text-gray-900 dark:text-[var(--text-primary)]'
                      }`}
                    >
                      {step.label}
                    </p>
                    {historyEntry && (
                      <p className='text-xs text-gray-500 dark:text-[var(--text-secondary)] mt-0.5'>
                        {new Date(historyEntry.timestamp).toLocaleDateString('it-IT', {
                          day: '2-digit',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                    {isCurrent && extraMessage && (
                      <p className='text-sm text-blue-600 dark:text-blue-400 mt-1'>
                        {extraMessage}
                      </p>
                    )}
                    {/* Links */}
                    {isCompleted && step.key === 'INSPECTION' && data.inspectionId && (
                      <a
                        href={`/portal/inspections/${data.inspectionId}`}
                        className='text-sm text-blue-500 hover:underline mt-1 inline-block'
                      >
                        Vedi report
                      </a>
                    )}
                    {isCompleted && step.key === 'ESTIMATE_SENT' && data.estimateId && (
                      <a
                        href={`/portal/estimates/${data.estimateId}`}
                        className='text-sm text-blue-500 hover:underline mt-1 inline-block'
                      >
                        Vedi preventivo
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Estimated completion */}
          {data.estimatedCompletion && activeStep < 7 && (
            <div className='mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center gap-3'>
              <Clock className='h-5 w-5 text-blue-500' />
              <div>
                <p className='text-sm font-medium text-blue-700 dark:text-blue-300'>
                  Stima completamento
                </p>
                <p className='text-sm text-blue-600 dark:text-blue-400'>
                  {new Date(data.estimatedCompletion).toLocaleDateString('it-IT', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Check-in photos */}
        {(data.checkInPhotos || []).length > 0 && (
          <div className='mt-6 bg-white dark:bg-[var(--surface-elevated)] rounded-2xl p-6 shadow-sm'>
            <h3 className='font-semibold text-gray-900 dark:text-[var(--text-primary)] mb-4'>Foto check-in</h3>
            <div className='grid grid-cols-2 gap-2'>
              {data.checkInPhotos.slice(0, 4).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Foto check-in ${i + 1}`}
                  className='w-full h-32 object-cover rounded-xl'
                />
              ))}
            </div>
          </div>
        )}

        {/* Auto-refresh notice */}
        <p className='text-center text-xs text-gray-400 dark:text-[var(--text-secondary)] mt-6'>
          Questa pagina si aggiorna automaticamente ogni 30 secondi
        </p>
      </main>
    </div>
  );
}
