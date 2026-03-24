'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AppleCard,
  AppleCardContent,
  AppleCardHeader,
} from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Pagination } from '@/components/ui/pagination';
import {
  Package,
  ArrowLeft,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  Save,
  X,
  TrendingUp,
  TrendingDown,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
};

interface PartDetail {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  manufacturer: string;
  partNumber: string;
  costPrice: number;
  retailPrice: number;
  minStockLevel: number;
  currentStock: number;
  location: string;
  supplierId: string;
  supplierName: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface StockMovement {
  id: string;
  type: 'IN' | 'OUT';
  quantity: number;
  reason: string;
  date: string;
  workOrderId: string | null;
}

interface LinkedWorkOrder {
  id: string;
  number: string;
  customerName: string;
  vehiclePlate: string;
  status: string;
  date: string;
  quantity: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

function getStockBadge(current: number, min: number): { label: string; cls: string } {
  if (current <= 0) return { label: 'Esaurito', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' };
  if (current <= min) return { label: 'Scorta Bassa', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' };
  return { label: 'In Stock', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' };
}

export default function PartDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [part, setPart] = useState<PartDetail | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [linkedWOs, setLinkedWOs] = useState<LinkedWorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dettagli' | 'movimenti' | 'odl'>('dettagli');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<PartDetail>>({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [movementsPage, setMovementsPage] = useState(1);
  const MOVEMENTS_PAGE_SIZE = 10;

  const fetchPart = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/parts/${id}`);
      if (!res.ok) throw new Error('Ricambio non trovato');
      const json = await res.json();
      const d = json.data ?? json;
      setPart({
        id: d.id || id,
        sku: d.sku || '',
        name: d.name || '',
        description: d.description || '',
        category: d.category || '',
        brand: d.brand || '',
        manufacturer: d.manufacturer || '',
        partNumber: d.partNumber || '',
        costPrice: d.costPrice || 0,
        retailPrice: d.retailPrice || 0,
        minStockLevel: d.minStockLevel || 0,
        currentStock: d.currentStock ?? 0,
        location: d.location || d.warehouseLocation || '',
        supplierId: d.supplierId || '',
        supplierName: d.supplier?.name || d.supplierName || '',
        notes: d.notes || '',
        createdAt: d.createdAt || '',
        updatedAt: d.updatedAt || '',
      });
      setMovements(Array.isArray(d.movements) ? d.movements : []);
      setLinkedWOs(Array.isArray(d.workOrders) ? d.workOrders : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPart();
  }, [fetchPart]);

  const handleEdit = () => {
    if (!part) return;
    setEditData({
      name: part.name,
      sku: part.sku,
      partNumber: part.partNumber,
      brand: part.brand,
      category: part.category,
      costPrice: part.costPrice,
      retailPrice: part.retailPrice,
      minStockLevel: part.minStockLevel,
      location: part.location,
      notes: part.notes,
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/parts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      if (!res.ok) throw new Error('Errore aggiornamento');
      setEditing(false);
      await fetchPart();
      toast.success('Ricambio aggiornato con successo');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/parts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Errore eliminazione');
      toast.success('Ricambio eliminato');
      router.push('/dashboard/parts');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore eliminazione ricambio');
    }
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[60vh]'>
        <Loader2 className='h-8 w-8 animate-spin text-apple-blue' />
      </div>
    );
  }

  if (error || !part) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] text-center p-8'>
        <AlertCircle className='h-12 w-12 text-red-400 mb-4' />
        <p className='text-body text-apple-gray dark:text-[#636366] mb-4'>
          {error || 'Ricambio non trovato'}
        </p>
        <AppleButton
          variant='secondary'
          icon={<ArrowLeft className='h-4 w-4' />}
          onClick={() => router.push('/dashboard/parts')}
        >
          Torna ai Ricambi
        </AppleButton>
      </div>
    );
  }

  const stockBadge = getStockBadge(part.currentStock, part.minStockLevel);

  const tabs = [
    { key: 'dettagli' as const, label: 'Dettagli' },
    { key: 'movimenti' as const, label: 'Movimenti' },
    { key: 'odl' as const, label: 'OdL Collegati' },
  ];

  return (
    <div>
      {/* Header */}
      <header className='bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-b border-apple-border/20 dark:border-[#424242]/50'>
        <div className='px-8 py-5'>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Ricambi', href: '/dashboard/parts' },
              { label: part.name },
            ]}
          />
          <div className='flex items-center justify-between mt-2'>
            <div className='flex items-center gap-3'>
              <div className='w-12 h-12 rounded-xl bg-apple-blue/10 flex items-center justify-center'>
                <Package className='h-6 w-6 text-apple-blue' />
              </div>
              <div>
                <h1 className='text-headline text-apple-dark dark:text-[#ececec]'>{part.name}</h1>
                <p className='text-footnote text-apple-gray dark:text-[#636366]'>
                  SKU: {part.sku} {part.partNumber && `| OE: ${part.partNumber}`} | {part.supplierName}
                </p>
              </div>
              <span className={`text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full ${stockBadge.cls}`}>
                {stockBadge.label}
              </span>
            </div>
            <div className='flex gap-2'>
              {!editing && (
                <>
                  <AppleButton variant='ghost' size='sm' icon={<Edit2 className='h-4 w-4' />} onClick={handleEdit}>
                    Modifica
                  </AppleButton>
                  <AppleButton
                    variant='ghost'
                    size='sm'
                    className='text-red-500 hover:text-red-600'
                    icon={<Trash2 className='h-4 w-4' />}
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    Elimina
                  </AppleButton>
                </>
              )}
              {editing && (
                <>
                  <AppleButton variant='ghost' size='sm' icon={<X className='h-4 w-4' />} onClick={() => setEditing(false)}>
                    Annulla
                  </AppleButton>
                  <AppleButton size='sm' icon={<Save className='h-4 w-4' />} loading={saving} onClick={handleSave}>
                    Salva
                  </AppleButton>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Stock Highlight */}
      <div className='px-8 pt-6'>
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
          {[
            { label: 'Stock Attuale', value: String(part.currentStock), color: part.currentStock <= part.minStockLevel ? 'text-red-500' : 'text-apple-green' },
            { label: 'Scorta Minima', value: String(part.minStockLevel), color: 'text-apple-gray' },
            { label: 'Prezzo Acquisto', value: formatCurrency(part.costPrice), color: 'text-apple-dark dark:text-[#ececec]' },
            { label: 'Prezzo Vendita', value: formatCurrency(part.retailPrice), color: 'text-apple-blue' },
          ].map(s => (
            <AppleCard key={s.label} hover={false}>
              <AppleCardContent className='text-center py-4'>
                <p className={`text-title-1 font-bold ${s.color}`}>{s.value}</p>
                <p className='text-footnote text-apple-gray dark:text-[#636366]'>{s.label}</p>
              </AppleCardContent>
            </AppleCard>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className='px-8 pt-6'>
        <div className='flex gap-1 bg-apple-light-gray/50 dark:bg-[#353535] rounded-xl p-1 w-fit'>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === t.key
                  ? 'bg-white dark:bg-[#2f2f2f] text-apple-dark dark:text-[#ececec] shadow-sm'
                  : 'text-apple-gray dark:text-[#636366] hover:text-apple-dark dark:hover:text-[#ececec]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <motion.div
        className='p-8 space-y-6'
        initial='hidden'
        animate='visible'
        variants={containerVariants}
        key={activeTab}
      >
        {/* Dettagli Tab */}
        {activeTab === 'dettagli' && (
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
                  Informazioni Ricambio
                </h2>
              </AppleCardHeader>
              <AppleCardContent>
                {editing ? (
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    {([
                      { key: 'name', label: 'Nome' },
                      { key: 'sku', label: 'SKU' },
                      { key: 'partNumber', label: 'Codice OE' },
                      { key: 'brand', label: 'Marca' },
                      { key: 'category', label: 'Categoria' },
                      { key: 'location', label: 'Posizione Magazzino' },
                    ] as const).map(f => (
                      <div key={f.key}>
                        <label className='text-sm font-medium text-apple-gray dark:text-[#636366] mb-1 block'>
                          {f.label}
                        </label>
                        <Input
                          value={(editData[f.key] as string) || ''}
                          onChange={e => setEditData(prev => ({ ...prev, [f.key]: e.target.value }))}
                        />
                      </div>
                    ))}
                    {([
                      { key: 'costPrice', label: 'Prezzo Acquisto' },
                      { key: 'retailPrice', label: 'Prezzo Vendita' },
                      { key: 'minStockLevel', label: 'Scorta Minima' },
                    ] as const).map(f => (
                      <div key={f.key}>
                        <label className='text-sm font-medium text-apple-gray dark:text-[#636366] mb-1 block'>
                          {f.label}
                        </label>
                        <Input
                          type='number'
                          value={(editData[f.key] as number) || 0}
                          onChange={e => setEditData(prev => ({ ...prev, [f.key]: Number(e.target.value) }))}
                          min={0}
                          step={f.key === 'minStockLevel' ? 1 : 0.01}
                        />
                      </div>
                    ))}
                    <div className='md:col-span-2'>
                      <label className='text-sm font-medium text-apple-gray dark:text-[#636366] mb-1 block'>
                        Note
                      </label>
                      <textarea
                        value={editData.notes || ''}
                        onChange={e => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                        className='w-full px-3 py-2 rounded-lg border border-apple-border/50 dark:border-[#424242] bg-white dark:bg-[#353535] text-sm resize-none'
                      />
                    </div>
                  </div>
                ) : (
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    {[
                      { label: 'Nome', value: part.name },
                      { label: 'SKU', value: part.sku },
                      { label: 'Codice OE', value: part.partNumber || '—' },
                      { label: 'Marca', value: part.brand || '—' },
                      { label: 'Categoria', value: part.category || '—' },
                      { label: 'Produttore', value: part.manufacturer || '—' },
                      { label: 'Fornitore', value: part.supplierName || '—' },
                      { label: 'Posizione Magazzino', value: part.location || '—' },
                      { label: 'Prezzo Acquisto', value: formatCurrency(part.costPrice) },
                      { label: 'Prezzo Vendita', value: formatCurrency(part.retailPrice) },
                      { label: 'Stock Attuale', value: String(part.currentStock) },
                      { label: 'Scorta Minima', value: String(part.minStockLevel) },
                    ].map(row => (
                      <div key={row.label} className='flex justify-between py-2 border-b border-apple-border/20 dark:border-[#424242]/50'>
                        <span className='text-sm text-apple-gray dark:text-[#636366]'>{row.label}</span>
                        <span className='text-sm font-medium text-apple-dark dark:text-[#ececec]'>{row.value}</span>
                      </div>
                    ))}
                    {part.notes && (
                      <div className='md:col-span-2 pt-2'>
                        <span className='text-sm text-apple-gray dark:text-[#636366]'>Note</span>
                        <p className='text-sm text-apple-dark dark:text-[#ececec] mt-1 whitespace-pre-wrap'>{part.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        )}

        {/* Movimenti Tab */}
        {activeTab === 'movimenti' && (
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
                  Storico Movimenti
                </h2>
              </AppleCardHeader>
              <AppleCardContent>
                {movements.length === 0 ? (
                  <div className='text-center py-12'>
                    <Package className='h-12 w-12 text-apple-gray/40 mx-auto mb-4' />
                    <p className='text-body text-apple-gray dark:text-[#636366]'>
                      Nessun movimento registrato
                    </p>
                  </div>
                ) : (
                  <>
                    <div className='space-y-3'>
                      {movements.slice((movementsPage - 1) * MOVEMENTS_PAGE_SIZE, movementsPage * MOVEMENTS_PAGE_SIZE).map(m => (
                        <div
                          key={m.id}
                          className='flex items-center justify-between p-3 rounded-xl bg-apple-light-gray/30 dark:bg-[#353535]'
                        >
                          <div className='flex items-center gap-3'>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              m.type === 'IN' ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40'
                            }`}>
                              {m.type === 'IN' ? (
                                <TrendingUp className='h-4 w-4 text-green-600 dark:text-green-400' />
                              ) : (
                                <TrendingDown className='h-4 w-4 text-red-600 dark:text-red-400' />
                              )}
                            </div>
                            <div>
                              <p className='text-sm font-medium text-apple-dark dark:text-[#ececec]'>
                                {m.type === 'IN' ? 'Carico' : 'Scarico'}: {m.reason}
                              </p>
                              <p className='text-xs text-apple-gray dark:text-[#636366]'>
                                {new Date(m.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          <span className={`text-sm font-bold ${m.type === 'IN' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {m.type === 'IN' ? '+' : '-'}{m.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className='mt-4'>
                      <Pagination
                        page={movementsPage}
                        totalPages={Math.ceil(movements.length / MOVEMENTS_PAGE_SIZE)}
                        onPageChange={setMovementsPage}
                      />
                    </div>
                  </>
                )}
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        )}

        {/* OdL Collegati Tab */}
        {activeTab === 'odl' && (
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
                  Ordini di Lavoro Collegati
                </h2>
              </AppleCardHeader>
              <AppleCardContent>
                {linkedWOs.length === 0 ? (
                  <div className='text-center py-12'>
                    <Wrench className='h-12 w-12 text-apple-gray/40 mx-auto mb-4' />
                    <p className='text-body text-apple-gray dark:text-[#636366]'>
                      Nessun ordine di lavoro collegato
                    </p>
                  </div>
                ) : (
                  <div className='space-y-3'>
                    {linkedWOs.map(wo => (
                      <div
                        key={wo.id}
                        className='flex items-center justify-between p-4 rounded-xl bg-apple-light-gray/30 dark:bg-[#353535] hover:bg-white dark:hover:bg-[#3a3a3a] cursor-pointer transition-all'
                        onClick={() => router.push(`/dashboard/work-orders/${wo.id}`)}
                        role='button'
                        tabIndex={0}
                        onKeyDown={e => { if (e.key === 'Enter') router.push(`/dashboard/work-orders/${wo.id}`); }}
                      >
                        <div className='flex items-center gap-3'>
                          <div className='w-10 h-10 rounded-lg bg-apple-blue/10 flex items-center justify-center'>
                            <Wrench className='h-5 w-5 text-apple-blue' />
                          </div>
                          <div>
                            <p className='text-sm font-semibold text-apple-dark dark:text-[#ececec]'>
                              {wo.number}
                            </p>
                            <p className='text-xs text-apple-gray dark:text-[#636366]'>
                              {wo.customerName} - {wo.vehiclePlate}
                            </p>
                          </div>
                        </div>
                        <div className='text-right'>
                          <p className='text-sm font-medium text-apple-dark dark:text-[#ececec]'>
                            Qta: {wo.quantity}
                          </p>
                          <p className='text-xs text-apple-gray dark:text-[#636366]'>
                            {new Date(wo.date).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        )}
      </motion.div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title='Elimina ricambio'
        description='Sei sicuro di voler eliminare questo ricambio? Questa azione non può essere annullata.'
        confirmLabel='Elimina'
        variant='danger'
        onConfirm={handleDelete}
      />
    </div>
  );
}
