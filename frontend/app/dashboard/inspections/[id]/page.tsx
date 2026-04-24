'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Car,
  Shield,
  CheckCircle,
  Clock,
  Camera,
  FileText,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Send,
  Printer,
  Wrench,
  User,
} from 'lucide-react';
import {
  AppleCard,
  AppleCardContent,
  AppleCardHeader,
} from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

interface InspectionItem {
  id: string;
  name: string;
  category: string;
  severity: 'OK' | 'BASSO' | 'MEDIO' | 'ALTO' | 'CRITICO';
  notes: string;
  photos: string[];
}

interface InspectionDetail {
  id: string;
  vehicle: string;
  plate: string;
  customer: string;
  type: string;
  status: string;
  date: string;
  score: number | null;
  inspector: string;
  mileage: number;
  items: InspectionItem[];
  notes: string;
  createdAt: string;
}

const severityConfig: Record<string, { color: string; bg: string; label: string; order: number }> = {
  CRITICO: { color: 'text-[var(--status-error)] dark:text-[var(--status-error)]', bg: 'bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)]', label: 'Critico', order: 0 },
  ALTO: { color: 'text-[var(--status-warning)] dark:text-[var(--status-warning)]', bg: 'bg-[var(--status-warning)]/10 dark:bg-[var(--status-warning-subtle)]', label: 'Alto', order: 1 },
  MEDIO: { color: 'text-[var(--status-warning)] dark:text-[var(--status-warning)]', bg: 'bg-[var(--status-warning)]/20 dark:bg-[var(--status-warning-subtle)]', label: 'Medio', order: 2 },
  BASSO: { color: 'text-[var(--status-info)] dark:text-[var(--status-info)]', bg: 'bg-[var(--status-info-subtle)] dark:bg-[var(--status-info-subtle)]', label: 'Basso', order: 3 },
  OK: { color: 'text-[var(--status-success)] dark:text-[var(--status-success)]', bg: 'bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)]', label: 'OK', order: 4 },
};

const categoryLabels: Record<string, string> = {
  brakes: 'Freni',
  engine: 'Motore',
  suspension: 'Sospensioni',
  body: 'Carrozzeria',
  tires: 'Pneumatici',
  lights: 'Luci',
  fluids: 'Fluidi',
  electronics: 'Elettronica',
};

const typeLabels: Record<string, string> = {
  PRE_PURCHASE: 'Pre-Acquisto',
  PERIODIC: 'Periodica',
  PRE_SALE: 'Pre-Vendita',
  WARRANTY: 'Garanzia',
  ACCIDENT: 'Incidente',
};

function getMaxSeverity(items: InspectionItem[]): string {
  if (items.length === 0) return 'OK';
  let maxOrder = 4;
  let maxSeverity = 'OK';
  for (const item of items) {
    const cfg = severityConfig[item.severity];
    if (cfg && cfg.order < maxOrder) {
      maxOrder = cfg.order;
      maxSeverity = item.severity;
    }
  }
  return maxSeverity;
}

type TabId = 'checklist' | 'foto' | 'report';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export default function InspectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('checklist');

  const fetchInspection = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/inspections/${id}`);
      if (!res.ok) throw new Error('Ispezione non trovata');
      const json = await res.json();
      const d = json.data || json;
      setInspection({
        id: d.id || id,
        vehicle: d.vehicleName || (d.vehicle?.make ? `${d.vehicle.make} ${d.vehicle.model}` : 'N/D'),
        plate: d.vehiclePlate || d.vehicle?.licensePlate || '',
        customer: d.customerName || (d.customer ? `${d.customer.firstName || ''} ${d.customer.lastName || ''}`.trim() : ''),
        type: d.type || d.inspectionType || '',
        status: d.status || 'pending',
        date: d.createdAt ? new Date(d.createdAt).toLocaleDateString('it-IT') : '',
        score: d.score || d.overallScore || null,
        inspector: d.inspectorName || d.mechanic?.firstName || 'N/D',
        mileage: d.mileage || 0,
        items: Array.isArray(d.items)
          ? d.items.map((item: Record<string, unknown>) => ({
              id: (item.id as string) || '',
              name: (item.name as string) || '',
              category: (item.category as string) || '',
              severity: (item.severity as string) || (item.status as string) || 'OK',
              notes: (item.notes as string) || '',
              photos: Array.isArray(item.photos) ? item.photos as string[] : [],
            }))
          : [],
        notes: d.notes || '',
        createdAt: d.createdAt || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInspection();
  }, [fetchInspection]);

  const handleGenerateEstimate = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/inspections/${id}/generate-estimate`, { method: 'POST' });
      if (!res.ok) throw new Error('Errore generazione preventivo');
      const json = await res.json();
      const estimateId = json.data?.id || json.id;
      toast.success('Preventivo generato con successo');
      if (estimateId) router.push(`/dashboard/estimates/${estimateId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore generazione preventivo');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendToClient = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/inspections/${id}/send`, { method: 'POST' });
      if (!res.ok) throw new Error('Errore invio');
      toast.success('Report inviato al cliente');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore invio');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/inspections/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Errore eliminazione');
      toast.success('Ispezione eliminata');
      router.push('/dashboard/inspections');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore eliminazione');
    }
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[60vh]'>
        <Loader2 className='h-8 w-8 animate-spin text-[var(--brand)]' />
      </div>
    );
  }

  if (error || !inspection) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] text-center p-8'>
        <AlertCircle className='h-12 w-12 text-[var(--status-error)]/40 mb-4' />
        <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-4'>
          {error || 'Ispezione non trovata'}
        </p>
        <AppleButton
          variant='ghost'
          onClick={() => router.push('/dashboard/inspections')}
        >
          Torna alle ispezioni
        </AppleButton>
      </div>
    );
  }

  const maxSev = getMaxSeverity(inspection.items);
  const maxSevCfg = severityConfig[maxSev] || severityConfig.OK;

  // Group items by category
  const grouped: Record<string, InspectionItem[]> = {};
  for (const item of inspection.items) {
    const cat = item.category || 'altro';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }

  // All photos
  const allPhotos = inspection.items.flatMap(i => i.photos);

  // Severity counts
  const severityCounts = { CRITICO: 0, ALTO: 0, MEDIO: 0, BASSO: 0, OK: 0 };
  for (const item of inspection.items) {
    if (item.severity in severityCounts) {
      severityCounts[item.severity as keyof typeof severityCounts]++;
    }
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'checklist', label: 'Checklist' },
    { id: 'foto', label: `Foto (${allPhotos.length})` },
    { id: 'report', label: 'Report' },
  ];

  return (
    <div>
      {/* Header */}
      <header>
        <div className='px-4 sm:px-8 py-5'>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Ispezioni', href: '/dashboard/inspections' },
              { label: `#${inspection.id.slice(0, 8)}` },
            ]}
          />
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2'>
            <div>
              <div className='flex items-center gap-3'>
                <h1 className='text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                  Ispezione #{inspection.id.slice(0, 8)}
                </h1>
                <span className={`text-footnote font-semibold px-2.5 py-1 rounded-full ${maxSevCfg.bg} ${maxSevCfg.color}`}>
                  {maxSevCfg.label}
                </span>
              </div>
              <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1'>
                {inspection.vehicle} | {inspection.plate} | {inspection.date}
                {inspection.inspector !== 'N/D' && ` | Tecnico: ${inspection.inspector}`}
              </p>
            </div>
            <div className='flex flex-wrap gap-2'>
              <AppleButton
                variant='secondary'
                size='sm'
                icon={<Wrench className='h-4 w-4' />}
                onClick={handleGenerateEstimate}
                loading={actionLoading}
              >
                Genera Preventivo
              </AppleButton>
              <AppleButton
                variant='ghost'
                size='sm'
                icon={<Printer className='h-4 w-4' />}
                onClick={() => window.print()}
              >
                Stampa Report
              </AppleButton>
              <AppleButton
                variant='ghost'
                size='sm'
                icon={<Send className='h-4 w-4' />}
                onClick={handleSendToClient}
                loading={actionLoading}
              >
                Invia al Cliente
              </AppleButton>
              <AppleButton
                variant='ghost'
                size='sm'
                className='text-[var(--status-error)] hover:text-[var(--status-error)]'
                onClick={() => setDeleteConfirmOpen(true)}
              >
                Elimina
              </AppleButton>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className='border-b border-[var(--border-default)]/20 dark:border-[var(--border-default)]/50 bg-[var(--surface-secondary)]/60 dark:bg-[var(--surface-primary)]/60 backdrop-blur-sm'>
        <div className='px-4 sm:px-8 flex gap-1 overflow-x-auto'>
          {tabs.map(tab => (
            <AppleButton
              key={tab.id}
              variant='ghost'
              size='sm'
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-none border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--brand)] text-[var(--brand)]'
                  : 'border-transparent text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </AppleButton>
          ))}
        </div>
      </div>

      <motion.div
        className='p-8 max-w-6xl mx-auto space-y-6'
        initial='hidden'
        animate='visible'
        variants={containerVariants}
      >
        {/* Vehicle Info Cards */}
        <motion.div className='grid grid-cols-2 sm:grid-cols-4 gap-4' variants={containerVariants}>
          {[
            { label: 'Veicolo', value: inspection.vehicle, icon: Car, color: 'bg-[var(--brand)]' },
            { label: 'Targa', value: inspection.plate, icon: Shield, color: 'bg-[var(--status-success)]' },
            { label: 'Tecnico', value: inspection.inspector, icon: User, color: 'bg-[var(--brand)]' },
            { label: 'Km', value: inspection.mileage > 0 ? `${inspection.mileage.toLocaleString()} km` : 'N/D', icon: Clock, color: 'bg-[var(--status-warning)]' },
          ].map(info => (
            <motion.div key={info.label} variants={cardVariants}>
              <AppleCard hover={false}>
                <AppleCardContent>
                  <div className='flex items-center gap-3'>
                    <div className={`w-10 h-10 rounded-xl ${info.color} flex items-center justify-center flex-shrink-0`}>
                      <info.icon className='h-5 w-5 text-[var(--text-on-brand)]' />
                    </div>
                    <div>
                      <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>{info.label}</p>
                      <p className='text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>{info.value}</p>
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Checklist Tab */}
        {activeTab === 'checklist' && (
          <>
            {Object.keys(grouped).length === 0 ? (
              <motion.div variants={cardVariants}>
                <AppleCard hover={false}>
                  <AppleCardContent>
                    <div className='flex flex-col items-center justify-center py-12 text-center'>
                      <FileText className='h-12 w-12 text-[var(--text-tertiary)]/40 mb-4' />
                      <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                        Nessun elemento registrato
                      </p>
                    </div>
                  </AppleCardContent>
                </AppleCard>
              </motion.div>
            ) : (
              Object.entries(grouped).map(([category, items]) => (
                <motion.div key={category} variants={cardVariants}>
                  <AppleCard hover={false}>
                    <AppleCardHeader>
                      <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                        {categoryLabels[category] || category}
                      </h2>
                    </AppleCardHeader>
                    <AppleCardContent>
                      <div className='space-y-3'>
                        {items.map(item => {
                          const sev = severityConfig[item.severity] || severityConfig.OK;
                          return (
                            <div
                              key={item.id}
                              className={`flex items-start gap-3 p-3 rounded-xl ${
                                item.severity === 'CRITICO' ? 'bg-[var(--status-error-subtle)] dark:bg-[var(--status-error)]/40/10 border border-[var(--status-error)]/30 dark:border-[var(--status-error)]/30' :
                                item.severity === 'ALTO' ? 'bg-[var(--status-warning)]/5 dark:bg-[var(--status-warning)]/40/10 border border-[var(--status-warning)]/20 dark:border-[var(--status-warning)]/30' :
                                'bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)]'
                              }`}
                            >
                              <div className='flex-1'>
                                <div className='flex items-center gap-2 mb-1'>
                                  <span className='text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                                    {item.name}
                                  </span>
                                  <span className={`text-footnote font-semibold px-2 py-0.5 rounded-full ${sev.bg} ${sev.color}`}>
                                    {sev.label}
                                  </span>
                                </div>
                                {item.notes && (
                                  <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>{item.notes}</p>
                                )}
                              </div>
                              {item.photos.length > 0 && (
                                <div className='flex gap-1'>
                                  {item.photos.slice(0, 3).map((photo, i) => (
                                    <div key={i} className='w-10 h-10 rounded-lg bg-[var(--surface-secondary)] dark:bg-[var(--surface-active)] overflow-hidden flex items-center justify-center'>
                                      <Camera className='w-4 h-4 text-[var(--text-tertiary)]' />
                                    </div>
                                  ))}
                                  {item.photos.length > 3 && (
                                    <div className='w-10 h-10 rounded-lg bg-[var(--surface-secondary)] dark:bg-[var(--surface-active)] flex items-center justify-center text-xs font-medium text-[var(--text-tertiary)]'>
                                      +{item.photos.length - 3}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </AppleCardContent>
                  </AppleCard>
                </motion.div>
              ))
            )}
          </>
        )}

        {/* Foto Tab */}
        {activeTab === 'foto' && (
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                  Foto
                </h2>
              </AppleCardHeader>
              <AppleCardContent>
                {allPhotos.length === 0 ? (
                  <div className='flex flex-col items-center justify-center py-12 text-center'>
                    <Camera className='h-12 w-12 text-[var(--text-tertiary)]/40 mb-4' />
                    <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                      Nessuna foto registrata
                    </p>
                  </div>
                ) : (
                  <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
                    {allPhotos.map((photo, i) => (
                      <div
                        key={i}
                        className='aspect-square rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--surface-hover)] overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity'
                      >
                        <Camera className='w-8 h-8 text-[var(--text-tertiary)]' />
                      </div>
                    ))}
                  </div>
                )}
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        )}

        {/* Report Tab */}
        {activeTab === 'report' && (
          <>
            {/* Severity Summary */}
            <motion.div variants={cardVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    Riepilogo per Gravita
                  </h2>
                </AppleCardHeader>
                <AppleCardContent>
                  <div className='grid grid-cols-5 gap-4'>
                    {(['CRITICO', 'ALTO', 'MEDIO', 'BASSO', 'OK'] as const).map(sev => {
                      const cfg = severityConfig[sev];
                      return (
                        <div key={sev} className='text-center'>
                          <div className={`w-12 h-12 rounded-xl ${cfg.bg} flex items-center justify-center mx-auto mb-2`}>
                            <span className={`text-headline font-bold ${cfg.color}`}>
                              {severityCounts[sev]}
                            </span>
                          </div>
                          <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>{cfg.label}</p>
                        </div>
                      );
                    })}
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Printable Summary */}
            <motion.div variants={cardVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <div className='flex items-center gap-2'>
                    <FileText className='h-4 w-4 text-[var(--text-tertiary)]' />
                    <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Riepilogo Ispezione
                    </h2>
                  </div>
                </AppleCardHeader>
                <AppleCardContent className='space-y-4'>
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='text-body'>
                      <span className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Veicolo:</span>{' '}
                      <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>{inspection.vehicle} ({inspection.plate})</span>
                    </div>
                    <div className='text-body'>
                      <span className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Data:</span>{' '}
                      <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>{inspection.date}</span>
                    </div>
                    <div className='text-body'>
                      <span className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Tecnico:</span>{' '}
                      <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>{inspection.inspector}</span>
                    </div>
                    <div className='text-body'>
                      <span className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Tipo:</span>{' '}
                      <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>{typeLabels[inspection.type] || inspection.type}</span>
                    </div>
                    <div className='text-body'>
                      <span className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Km:</span>{' '}
                      <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>{inspection.mileage > 0 ? inspection.mileage.toLocaleString() : 'N/D'}</span>
                    </div>
                    <div className='text-body'>
                      <span className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Elementi totali:</span>{' '}
                      <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>{inspection.items.length}</span>
                    </div>
                  </div>

                  {(severityCounts.CRITICO > 0 || severityCounts.ALTO > 0) && (
                    <div className='mt-4 p-3 rounded-xl bg-[var(--status-error-subtle)] dark:bg-[var(--status-error)]/40/10 border border-[var(--status-error)]/30 dark:border-[var(--status-error)]/30'>
                      <div className='flex items-center gap-2 mb-2'>
                        <AlertTriangle className='w-4 h-4 text-[var(--status-error)]' />
                        <span className='text-body font-semibold text-[var(--status-error)] dark:text-[var(--status-error)]'>
                          Elementi che richiedono intervento
                        </span>
                      </div>
                      <ul className='space-y-1'>
                        {inspection.items
                          .filter(i => i.severity === 'CRITICO' || i.severity === 'ALTO')
                          .map(item => (
                            <li key={item.id} className='text-footnote text-[var(--status-error)] dark:text-[var(--status-error)]'>
                              {item.name} ({severityConfig[item.severity]?.label})
                              {item.notes && ` — ${item.notes}`}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  {inspection.notes && (
                    <div className='mt-4'>
                      <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-1'>Note generali:</p>
                      <p className='text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] whitespace-pre-wrap'>{inspection.notes}</p>
                    </div>
                  )}
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </>
        )}
      </motion.div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title='Elimina ispezione'
        description='Sei sicuro di voler eliminare questa ispezione? Questa azione non può essere annullata.'
        confirmLabel='Elimina'
        variant='danger'
        onConfirm={handleDelete}
      />
    </div>
  );
}
