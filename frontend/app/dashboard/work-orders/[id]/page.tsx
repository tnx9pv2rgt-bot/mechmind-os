'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AppleCard,
  AppleCardContent,
  AppleCardHeader,
  AppleCardFooter,
} from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Car,
  User,
  Wrench,
  Plus,
  Trash2,
  Play,
  CheckCircle2,
  FileText,
  AlertCircle,
  Package,
  Clock,
  Camera,
  Gauge,
  Euro,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
};

type WorkOrderStatus =
  | 'OPEN'
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'WAITING_PARTS'
  | 'READY'
  | 'COMPLETED'
  | 'INVOICED';

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

interface WorkOrderDetail {
  id: string;
  woNumber: string;
  status: WorkOrderStatus;
  vehicleId: string;
  vehicleMake: string;
  vehicleModel: string;
  vehiclePlate: string;
  vehicleYear: number | null;
  vehicleVin: string | null;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  diagnosis: string | null;
  customerRequest: string | null;
  mileageIn: number | null;
  mileageOut: number | null;
  totalCost: number;
  laborItems: LaborItem[];
  partItems: PartItem[];
  createdAt: string;
  updatedAt: string;
}

const statusConfig: Record<WorkOrderStatus, { label: string; color: string; bg: string }> = {
  OPEN: {
    label: 'Aperto',
    color: 'bg-gray-500',
    bg: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  PENDING: {
    label: 'In Attesa',
    color: 'bg-yellow-500',
    bg: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  },
  IN_PROGRESS: {
    label: 'In Lavorazione',
    color: 'bg-apple-blue',
    bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  WAITING_PARTS: {
    label: 'Attesa Ricambi',
    color: 'bg-apple-orange',
    bg: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  },
  READY: {
    label: 'Pronto',
    color: 'bg-apple-green',
    bg: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  },
  COMPLETED: {
    label: 'Completato',
    color: 'bg-purple-500',
    bg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  },
  INVOICED: {
    label: 'Fatturato',
    color: 'bg-teal-500',
    bg: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

let localIdCounter = 0;
function generateLocalId(): string {
  localIdCounter += 1;
  return `local-${Date.now()}-${localIdCounter}`;
}

export default function WorkOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workOrderId = params.id as string;

  const [wo, setWo] = useState<WorkOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Editable labor & parts
  const [laborItems, setLaborItems] = useState<LaborItem[]>([]);
  const [partItems, setPartItems] = useState<PartItem[]>([]);

  const fetchWorkOrder = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/work-orders/${workOrderId}`);
      if (!res.ok) throw new Error('Ordine di lavoro non trovato');
      const json = await res.json();
      const data = json.data ?? json;
      setWo(data);
      setLaborItems(data.laborItems ?? []);
      setPartItems(data.partItems ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setIsLoading(false);
    }
  }, [workOrderId]);

  useEffect(() => {
    fetchWorkOrder();
  }, [fetchWorkOrder]);

  // Labor helpers
  const addLaborItem = () => {
    setLaborItems(prev => [
      ...prev,
      { id: generateLocalId(), description: '', hours: 0, costPerHour: 0 },
    ]);
  };

  const updateLaborItem = (id: string, field: keyof LaborItem, value: string | number) => {
    setLaborItems(prev => prev.map(item => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const removeLaborItem = (id: string) => {
    setLaborItems(prev => prev.filter(item => item.id !== id));
  };

  // Part helpers
  const addPartItem = () => {
    setPartItems(prev => [...prev, { id: generateLocalId(), name: '', quantity: 0, unitCost: 0 }]);
  };

  const updatePartItem = (id: string, field: keyof PartItem, value: string | number) => {
    setPartItems(prev => prev.map(item => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const removePartItem = (id: string) => {
    setPartItems(prev => prev.filter(item => item.id !== id));
  };

  // Cost calculations
  const laborTotal = laborItems.reduce((sum, item) => sum + item.hours * item.costPerHour, 0);
  const partsTotal = partItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const grandTotal = laborTotal + partsTotal;

  // Status actions
  const performAction = async (endpoint: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/work-orders/${workOrderId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ laborItems, partItems }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || json.message || 'Errore operazione');
      }
      await fetchWorkOrder();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setActionLoading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[60vh]'>
        <Loader2 className='h-8 w-8 animate-spin text-apple-blue' />
      </div>
    );
  }

  // Error state
  if (error || !wo) {
    return (
      <div className='flex items-center justify-center min-h-[60vh]'>
        <div className='text-center'>
          <AlertCircle className='h-12 w-12 text-apple-gray dark:text-[#636366] mx-auto mb-4' />
          <h2 className='text-title-2 text-apple-dark dark:text-[#ececec] mb-2'>
            Ordine di lavoro non trovato
          </h2>
          <p className='text-apple-gray dark:text-[#636366] mb-4'>{error}</p>
          <Link href='/dashboard/work-orders'>
            <AppleButton variant='secondary'>Torna agli ordini di lavoro</AppleButton>
          </Link>
        </div>
      </div>
    );
  }

  const sc = statusConfig[wo.status] || statusConfig.OPEN;

  return (
    <div>
      {/* Header */}
      <header className='bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-b border-apple-border/20 dark:border-[#424242]/50'>
        <div className='px-8 py-5'>
          <Link
            href='/dashboard/work-orders'
            className='flex items-center gap-2 text-apple-gray dark:text-[#636366] hover:text-apple-dark transition-colors mb-3'
          >
            <ArrowLeft className='h-4 w-4' />
            <span className='text-sm'>Torna agli ordini di lavoro</span>
          </Link>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-headline text-apple-dark dark:text-[#ececec]'>{wo.woNumber}</h1>
              <p className='text-apple-gray dark:text-[#636366] text-body mt-0.5'>
                {wo.vehicleMake} {wo.vehicleModel} &middot; {wo.vehiclePlate}
              </p>
            </div>
            <span
              className={`text-[11px] font-semibold uppercase px-3 py-1.5 rounded-full ${sc.bg}`}
            >
              {sc.label}
            </span>
          </div>
        </div>
      </header>

      <div className='p-8'>
        <motion.div
          variants={containerVariants}
          initial='hidden'
          animate='visible'
          className='grid grid-cols-1 lg:grid-cols-12 gap-6'
        >
          {/* LEFT SIDEBAR */}
          <div className='lg:col-span-4 space-y-6'>
            {/* Vehicle Info */}
            <motion.div variants={cardVariants}>
              <AppleCard hover={false}>
                <AppleCardContent>
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec] mb-4 flex items-center gap-2'>
                    <Car className='h-5 w-5 text-apple-gray dark:text-[#636366]' />
                    Veicolo
                  </h2>
                  <div className='space-y-3'>
                    <p className='text-title-2 text-apple-dark dark:text-[#ececec]'>
                      {wo.vehicleMake} {wo.vehicleModel}
                    </p>
                    <div className='grid grid-cols-2 gap-3 pt-2 border-t border-apple-border/20 dark:border-[#424242]'>
                      <div>
                        <p className='text-caption text-apple-gray dark:text-[#636366] uppercase tracking-wider'>
                          Targa
                        </p>
                        <p className='text-body font-mono text-apple-dark dark:text-[#ececec]'>
                          {wo.vehiclePlate}
                        </p>
                      </div>
                      {wo.vehicleYear && (
                        <div>
                          <p className='text-caption text-apple-gray dark:text-[#636366] uppercase tracking-wider'>
                            Anno
                          </p>
                          <p className='text-body text-apple-dark dark:text-[#ececec]'>
                            {wo.vehicleYear}
                          </p>
                        </div>
                      )}
                    </div>
                    {wo.vehicleVin && (
                      <div className='pt-2 border-t border-apple-border/20 dark:border-[#424242]'>
                        <p className='text-caption text-apple-gray dark:text-[#636366] uppercase tracking-wider'>
                          VIN
                        </p>
                        <p className='text-body font-mono text-apple-dark dark:text-[#ececec] text-xs'>
                          {wo.vehicleVin}
                        </p>
                      </div>
                    )}
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Customer Info */}
            <motion.div variants={cardVariants}>
              <AppleCard hover={false}>
                <AppleCardContent>
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec] mb-4 flex items-center gap-2'>
                    <User className='h-5 w-5 text-apple-gray dark:text-[#636366]' />
                    Cliente
                  </h2>
                  <p className='text-title-2 text-apple-dark dark:text-[#ececec]'>
                    {wo.customerName}
                  </p>
                  {(wo.customerPhone || wo.customerEmail) && (
                    <div className='space-y-2 pt-3 mt-3 border-t border-apple-border/20 dark:border-[#424242]'>
                      {wo.customerPhone && (
                        <p className='text-body text-apple-gray dark:text-[#636366]'>
                          {wo.customerPhone}
                        </p>
                      )}
                      {wo.customerEmail && (
                        <p className='text-body text-apple-gray dark:text-[#636366]'>
                          {wo.customerEmail}
                        </p>
                      )}
                    </div>
                  )}
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Mileage */}
            <motion.div variants={cardVariants}>
              <AppleCard hover={false}>
                <AppleCardContent>
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec] mb-4 flex items-center gap-2'>
                    <Gauge className='h-5 w-5 text-apple-gray dark:text-[#636366]' />
                    Chilometraggio
                  </h2>
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <p className='text-caption text-apple-gray dark:text-[#636366] uppercase tracking-wider'>
                        Ingresso
                      </p>
                      <p className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
                        {wo.mileageIn ? `${wo.mileageIn.toLocaleString('it-IT')} km` : '--'}
                      </p>
                    </div>
                    <div>
                      <p className='text-caption text-apple-gray dark:text-[#636366] uppercase tracking-wider'>
                        Uscita
                      </p>
                      <p className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
                        {wo.mileageOut ? `${wo.mileageOut.toLocaleString('it-IT')} km` : '--'}
                      </p>
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Actions */}
            <motion.div variants={cardVariants}>
              <AppleCard hover={false}>
                <AppleCardContent>
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec] mb-4'>
                    Azioni
                  </h2>
                  <div className='space-y-3'>
                    {(wo.status === 'PENDING' || wo.status === 'OPEN') && (
                      <AppleButton
                        fullWidth
                        loading={actionLoading}
                        onClick={() => performAction('start')}
                        icon={<Play className='h-4 w-4' />}
                      >
                        Avvia Lavorazione
                      </AppleButton>
                    )}
                    {wo.status === 'IN_PROGRESS' && (
                      <AppleButton
                        fullWidth
                        loading={actionLoading}
                        onClick={() => performAction('complete')}
                        icon={<CheckCircle2 className='h-4 w-4' />}
                      >
                        Completa
                      </AppleButton>
                    )}
                    {(wo.status === 'COMPLETED' || wo.status === 'READY') && (
                      <AppleButton
                        fullWidth
                        loading={actionLoading}
                        onClick={() => performAction('invoice')}
                        icon={<FileText className='h-4 w-4' />}
                      >
                        Crea Fattura
                      </AppleButton>
                    )}
                    {actionError && (
                      <div className='flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30'>
                        <AlertCircle className='h-4 w-4 text-red-500 flex-shrink-0' />
                        <p className='text-xs text-red-700 dark:text-red-300'>{actionError}</p>
                      </div>
                    )}
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </div>

          {/* RIGHT / MAIN CONTENT */}
          <div className='lg:col-span-8 space-y-6'>
            {/* Diagnosis & Customer Request */}
            <motion.div variants={cardVariants}>
              <AppleCard hover={false}>
                <AppleCardContent>
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec] mb-4 flex items-center gap-2'>
                    <Wrench className='h-5 w-5 text-apple-gray dark:text-[#636366]' />
                    Diagnosi e Richiesta
                  </h2>
                  <div className='space-y-4'>
                    <div>
                      <p className='text-caption text-apple-gray dark:text-[#636366] uppercase tracking-wider mb-1'>
                        Diagnosi
                      </p>
                      <p className='text-body text-apple-dark dark:text-[#ececec] bg-apple-light-gray/50 dark:bg-[#2f2f2f] p-4 rounded-xl'>
                        {wo.diagnosis || 'Nessuna diagnosi inserita'}
                      </p>
                    </div>
                    <div>
                      <p className='text-caption text-apple-gray dark:text-[#636366] uppercase tracking-wider mb-1'>
                        Richiesta del cliente
                      </p>
                      <p className='text-body text-apple-dark dark:text-[#ececec] bg-apple-light-gray/50 dark:bg-[#2f2f2f] p-4 rounded-xl'>
                        {wo.customerRequest || 'Nessuna richiesta specificata'}
                      </p>
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Labor Items */}
            <motion.div variants={cardVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader className='flex items-center justify-between'>
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec] flex items-center gap-2'>
                    <Clock className='h-5 w-5 text-apple-gray dark:text-[#636366]' />
                    Manodopera
                  </h2>
                  <AppleButton
                    variant='ghost'
                    size='sm'
                    onClick={addLaborItem}
                    icon={<Plus className='h-4 w-4' />}
                  >
                    Aggiungi
                  </AppleButton>
                </AppleCardHeader>
                <AppleCardContent>
                  {laborItems.length === 0 ? (
                    <p className='text-center py-6 text-apple-gray dark:text-[#636366] text-sm'>
                      Nessuna voce di manodopera
                    </p>
                  ) : (
                    <div className='space-y-3'>
                      {laborItems.map(item => (
                        <div
                          key={item.id}
                          className='flex items-center gap-3 p-3 rounded-xl bg-apple-light-gray/30 dark:bg-[#2f2f2f]'
                        >
                          <Input
                            placeholder='Descrizione'
                            value={item.description}
                            onChange={e => updateLaborItem(item.id, 'description', e.target.value)}
                            className='flex-1 h-10 rounded-lg border border-apple-border/50 dark:border-[#424242] bg-white dark:bg-[#353535] text-sm'
                          />
                          <Input
                            type='number'
                            placeholder='Ore'
                            value={item.hours || ''}
                            onChange={e =>
                              updateLaborItem(item.id, 'hours', Number(e.target.value))
                            }
                            className='w-20 h-10 rounded-lg border border-apple-border/50 dark:border-[#424242] bg-white dark:bg-[#353535] text-sm text-center'
                          />
                          <Input
                            type='number'
                            placeholder='EUR/h'
                            value={item.costPerHour || ''}
                            onChange={e =>
                              updateLaborItem(item.id, 'costPerHour', Number(e.target.value))
                            }
                            className='w-24 h-10 rounded-lg border border-apple-border/50 dark:border-[#424242] bg-white dark:bg-[#353535] text-sm text-center'
                          />
                          <span className='text-sm font-medium text-apple-dark dark:text-[#ececec] w-24 text-right'>
                            {formatCurrency(item.hours * item.costPerHour)}
                          </span>
                          <button
                            onClick={() => removeLaborItem(item.id)}
                            className='p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-apple-gray hover:text-red-500 transition-colors'
                          >
                            <Trash2 className='h-4 w-4' />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </AppleCardContent>
                <AppleCardFooter>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm font-medium text-apple-gray dark:text-[#636366]'>
                      Totale Manodopera
                    </span>
                    <span className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec]'>
                      {formatCurrency(laborTotal)}
                    </span>
                  </div>
                </AppleCardFooter>
              </AppleCard>
            </motion.div>

            {/* Parts Items */}
            <motion.div variants={cardVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader className='flex items-center justify-between'>
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec] flex items-center gap-2'>
                    <Package className='h-5 w-5 text-apple-gray dark:text-[#636366]' />
                    Ricambi
                  </h2>
                  <AppleButton
                    variant='ghost'
                    size='sm'
                    onClick={addPartItem}
                    icon={<Plus className='h-4 w-4' />}
                  >
                    Aggiungi
                  </AppleButton>
                </AppleCardHeader>
                <AppleCardContent>
                  {partItems.length === 0 ? (
                    <p className='text-center py-6 text-apple-gray dark:text-[#636366] text-sm'>
                      Nessun ricambio inserito
                    </p>
                  ) : (
                    <div className='space-y-3'>
                      {partItems.map(item => (
                        <div
                          key={item.id}
                          className='flex items-center gap-3 p-3 rounded-xl bg-apple-light-gray/30 dark:bg-[#2f2f2f]'
                        >
                          <Input
                            placeholder='Nome ricambio'
                            value={item.name}
                            onChange={e => updatePartItem(item.id, 'name', e.target.value)}
                            className='flex-1 h-10 rounded-lg border border-apple-border/50 dark:border-[#424242] bg-white dark:bg-[#353535] text-sm'
                          />
                          <Input
                            type='number'
                            placeholder='Qty'
                            value={item.quantity || ''}
                            onChange={e =>
                              updatePartItem(item.id, 'quantity', Number(e.target.value))
                            }
                            className='w-20 h-10 rounded-lg border border-apple-border/50 dark:border-[#424242] bg-white dark:bg-[#353535] text-sm text-center'
                          />
                          <Input
                            type='number'
                            placeholder='EUR'
                            value={item.unitCost || ''}
                            onChange={e =>
                              updatePartItem(item.id, 'unitCost', Number(e.target.value))
                            }
                            className='w-24 h-10 rounded-lg border border-apple-border/50 dark:border-[#424242] bg-white dark:bg-[#353535] text-sm text-center'
                          />
                          <span className='text-sm font-medium text-apple-dark dark:text-[#ececec] w-24 text-right'>
                            {formatCurrency(item.quantity * item.unitCost)}
                          </span>
                          <button
                            onClick={() => removePartItem(item.id)}
                            className='p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-apple-gray hover:text-red-500 transition-colors'
                          >
                            <Trash2 className='h-4 w-4' />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </AppleCardContent>
                <AppleCardFooter>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm font-medium text-apple-gray dark:text-[#636366]'>
                      Totale Ricambi
                    </span>
                    <span className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec]'>
                      {formatCurrency(partsTotal)}
                    </span>
                  </div>
                </AppleCardFooter>
              </AppleCard>
            </motion.div>

            {/* Grand Total */}
            <motion.div variants={cardVariants}>
              <AppleCard hover={false}>
                <AppleCardContent>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-caption text-apple-gray dark:text-[#636366] uppercase tracking-wider'>
                        Riepilogo Costi
                      </p>
                      <div className='flex gap-6 mt-2'>
                        <div>
                          <p className='text-sm text-apple-gray dark:text-[#636366]'>Manodopera</p>
                          <p className='text-body font-medium text-apple-dark dark:text-[#ececec]'>
                            {formatCurrency(laborTotal)}
                          </p>
                        </div>
                        <div>
                          <p className='text-sm text-apple-gray dark:text-[#636366]'>Ricambi</p>
                          <p className='text-body font-medium text-apple-dark dark:text-[#ececec]'>
                            {formatCurrency(partsTotal)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className='text-right'>
                      <p className='text-caption text-apple-gray dark:text-[#636366] uppercase tracking-wider'>
                        Totale
                      </p>
                      <p className='text-headline font-bold text-apple-dark dark:text-[#ececec]'>
                        {formatCurrency(grandTotal)}
                      </p>
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
