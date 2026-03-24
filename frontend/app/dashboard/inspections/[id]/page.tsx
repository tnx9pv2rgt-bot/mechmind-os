'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Car,
  Shield,
  CheckCircle,
  Clock,
  Camera,
  FileText,
  Download,
  Share2,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Send,
  Printer,
  Wrench,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  CRITICO: { color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/40', label: 'Critico', order: 0 },
  ALTO: { color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-900/40', label: 'Alto', order: 1 },
  MEDIO: { color: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-100 dark:bg-yellow-900/40', label: 'Medio', order: 2 },
  BASSO: { color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/40', label: 'Basso', order: 3 },
  OK: { color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/40', label: 'OK', order: 4 },
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

export default function InspectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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
        <Loader2 className='w-8 h-8 animate-spin text-gray-400' />
      </div>
    );
  }

  if (error || !inspection) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] gap-4'>
        <AlertCircle className='h-12 w-12 text-red-400' />
        <p className='text-gray-500 dark:text-[#636366]'>{error || 'Ispezione non trovata'}</p>
        <Link href='/dashboard/inspections'>
          <Button variant='outline'>Torna alle ispezioni</Button>
        </Link>
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

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#212121] dark:to-[#2f2f2f]'>
      {/* Header */}
      <header className='bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-b border-apple-border/20 dark:border-[#424242]/50'>
        <div className='px-4 sm:px-8 py-5'>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Ispezioni', href: '/dashboard/inspections' },
              { label: `#${inspection.id.slice(0, 8)}` },
            ]}
          />
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2'>
            <div className='flex items-center gap-4'>
              <Link href='/dashboard/inspections'>
                <Button variant='ghost' size='icon' className='rounded-full' aria-label='Torna alle ispezioni'>
                  <ChevronLeft className='w-5 h-5' />
                </Button>
              </Link>
              <div>
                <div className='flex items-center gap-3'>
                  <h1 className='text-2xl font-bold text-gray-900 dark:text-[#ececec]'>
                    Ispezione #{inspection.id.slice(0, 8)}
                  </h1>
                  <span className={`text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full ${maxSevCfg.bg} ${maxSevCfg.color}`}>
                    {maxSevCfg.label}
                  </span>
                </div>
                <p className='text-gray-500 dark:text-[#636366] text-sm'>
                  {inspection.vehicle} | {inspection.plate} | {inspection.date}
                  {inspection.inspector !== 'N/D' && ` | Tecnico: ${inspection.inspector}`}
                </p>
              </div>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button
                variant='outline'
                className='rounded-full'
                onClick={handleGenerateEstimate}
                disabled={actionLoading}
              >
                <Wrench className='w-4 h-4 mr-2' />
                Genera Preventivo
              </Button>
              <Button variant='outline' className='rounded-full' onClick={() => window.print()}>
                <Printer className='w-4 h-4 mr-2' />
                Stampa Report
              </Button>
              <Button variant='outline' className='rounded-full' onClick={handleSendToClient} disabled={actionLoading}>
                <Send className='w-4 h-4 mr-2' />
                Invia al Cliente
              </Button>
              <Button
                variant='outline'
                className='rounded-full text-red-500 hover:text-red-600 hover:border-red-300'
                onClick={() => setDeleteConfirmOpen(true)}
              >
                Elimina
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className='p-4 sm:p-8 max-w-6xl mx-auto space-y-6'>
        {/* Vehicle Info */}
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
          {[
            { label: 'Veicolo', value: `${inspection.vehicle}`, icon: Car },
            { label: 'Targa', value: inspection.plate, icon: Shield },
            { label: 'Tecnico', value: inspection.inspector, icon: User },
            { label: 'Km', value: inspection.mileage > 0 ? `${inspection.mileage.toLocaleString()} km` : 'N/D', icon: Clock },
          ].map(info => (
            <Card key={info.label} className='bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl border-0 shadow-sm'>
              <CardContent className='p-4 flex items-center gap-3'>
                <info.icon className='w-5 h-5 text-gray-400 flex-shrink-0' />
                <div>
                  <p className='text-xs text-gray-500 dark:text-[#636366]'>{info.label}</p>
                  <p className='text-sm font-medium text-gray-900 dark:text-[#ececec]'>{info.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue='checklist' className='w-full'>
          <TabsList className='grid w-full grid-cols-3 bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl'>
            <TabsTrigger value='checklist'>Checklist</TabsTrigger>
            <TabsTrigger value='foto'>Foto ({allPhotos.length})</TabsTrigger>
            <TabsTrigger value='report'>Report</TabsTrigger>
          </TabsList>

          {/* Checklist Tab */}
          <TabsContent value='checklist' className='mt-6 space-y-6'>
            {Object.keys(grouped).length === 0 ? (
              <Card className='bg-white/80 dark:bg-[#2f2f2f]/80 border-0 shadow-sm'>
                <CardContent className='p-8 text-center'>
                  <FileText className='w-12 h-12 text-gray-400 mx-auto mb-4' />
                  <p className='text-gray-500 dark:text-[#636366]'>Nessun elemento registrato</p>
                </CardContent>
              </Card>
            ) : (
              Object.entries(grouped).map(([category, items]) => (
                <Card key={category} className='bg-white/80 dark:bg-[#2f2f2f]/80 border-0 shadow-sm'>
                  <CardHeader>
                    <CardTitle className='text-lg'>
                      {categoryLabels[category] || category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-3'>
                      {items.map(item => {
                        const sev = severityConfig[item.severity] || severityConfig.OK;
                        return (
                          <div
                            key={item.id}
                            className={`flex items-start gap-3 p-3 rounded-xl ${
                              item.severity === 'CRITICO' ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30' :
                              item.severity === 'ALTO' ? 'bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30' :
                              'bg-gray-50 dark:bg-[#353535]'
                            }`}
                          >
                            <div className='flex-1'>
                              <div className='flex items-center gap-2 mb-1'>
                                <span className='text-sm font-medium text-gray-900 dark:text-[#ececec]'>
                                  {item.name}
                                </span>
                                <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${sev.bg} ${sev.color}`}>
                                  {sev.label}
                                </span>
                              </div>
                              {item.notes && (
                                <p className='text-xs text-gray-500 dark:text-[#636366]'>{item.notes}</p>
                              )}
                            </div>
                            {item.photos.length > 0 && (
                              <div className='flex gap-1'>
                                {item.photos.slice(0, 3).map((photo, i) => (
                                  <div key={i} className='w-10 h-10 rounded-lg bg-gray-200 dark:bg-[#424242] overflow-hidden flex items-center justify-center'>
                                    <Camera className='w-4 h-4 text-gray-400' />
                                  </div>
                                ))}
                                {item.photos.length > 3 && (
                                  <div className='w-10 h-10 rounded-lg bg-gray-200 dark:bg-[#424242] flex items-center justify-center text-xs font-medium text-gray-500'>
                                    +{item.photos.length - 3}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Foto Tab */}
          <TabsContent value='foto' className='mt-6'>
            <Card className='bg-white/80 dark:bg-[#2f2f2f]/80 border-0 shadow-sm'>
              <CardContent className='p-6'>
                {allPhotos.length === 0 ? (
                  <div className='text-center py-12'>
                    <Camera className='w-12 h-12 text-gray-400 mx-auto mb-4' />
                    <p className='text-gray-500 dark:text-[#636366]'>Nessuna foto registrata</p>
                  </div>
                ) : (
                  <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
                    {allPhotos.map((photo, i) => (
                      <div
                        key={i}
                        className='aspect-square rounded-xl bg-gray-100 dark:bg-[#353535] overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity'
                      >
                        <Camera className='w-8 h-8 text-gray-400' />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Report Tab */}
          <TabsContent value='report' className='mt-6 space-y-6'>
            {/* Severity Summary */}
            <Card className='bg-white/80 dark:bg-[#2f2f2f]/80 border-0 shadow-sm'>
              <CardHeader>
                <CardTitle>Riepilogo per Gravità</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='grid grid-cols-5 gap-4'>
                  {(['CRITICO', 'ALTO', 'MEDIO', 'BASSO', 'OK'] as const).map(sev => {
                    const cfg = severityConfig[sev];
                    return (
                      <div key={sev} className='text-center'>
                        <div className={`w-12 h-12 rounded-xl ${cfg.bg} flex items-center justify-center mx-auto mb-2`}>
                          <span className={`text-lg font-bold ${cfg.color}`}>
                            {severityCounts[sev]}
                          </span>
                        </div>
                        <p className='text-xs text-gray-500 dark:text-[#636366]'>{cfg.label}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Printable Summary */}
            <Card className='bg-white/80 dark:bg-[#2f2f2f]/80 border-0 shadow-sm'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <FileText className='w-5 h-5' />
                  Riepilogo Ispezione
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid grid-cols-2 gap-4 text-sm'>
                  <div>
                    <span className='text-gray-500 dark:text-[#636366]'>Veicolo:</span>{' '}
                    <span className='font-medium'>{inspection.vehicle} ({inspection.plate})</span>
                  </div>
                  <div>
                    <span className='text-gray-500 dark:text-[#636366]'>Data:</span>{' '}
                    <span className='font-medium'>{inspection.date}</span>
                  </div>
                  <div>
                    <span className='text-gray-500 dark:text-[#636366]'>Tecnico:</span>{' '}
                    <span className='font-medium'>{inspection.inspector}</span>
                  </div>
                  <div>
                    <span className='text-gray-500 dark:text-[#636366]'>Tipo:</span>{' '}
                    <span className='font-medium'>{typeLabels[inspection.type] || inspection.type}</span>
                  </div>
                  <div>
                    <span className='text-gray-500 dark:text-[#636366]'>Km:</span>{' '}
                    <span className='font-medium'>{inspection.mileage > 0 ? inspection.mileage.toLocaleString() : 'N/D'}</span>
                  </div>
                  <div>
                    <span className='text-gray-500 dark:text-[#636366]'>Elementi totali:</span>{' '}
                    <span className='font-medium'>{inspection.items.length}</span>
                  </div>
                </div>

                {(severityCounts.CRITICO > 0 || severityCounts.ALTO > 0) && (
                  <div className='mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30'>
                    <div className='flex items-center gap-2 mb-2'>
                      <AlertTriangle className='w-4 h-4 text-red-500' />
                      <span className='text-sm font-semibold text-red-700 dark:text-red-300'>
                        Elementi che richiedono intervento
                      </span>
                    </div>
                    <ul className='space-y-1'>
                      {inspection.items
                        .filter(i => i.severity === 'CRITICO' || i.severity === 'ALTO')
                        .map(item => (
                          <li key={item.id} className='text-sm text-red-600 dark:text-red-400'>
                            {item.name} ({severityConfig[item.severity]?.label})
                            {item.notes && ` — ${item.notes}`}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {inspection.notes && (
                  <div className='mt-4'>
                    <p className='text-sm text-gray-500 dark:text-[#636366] mb-1'>Note generali:</p>
                    <p className='text-sm text-gray-900 dark:text-[#ececec] whitespace-pre-wrap'>{inspection.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

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
