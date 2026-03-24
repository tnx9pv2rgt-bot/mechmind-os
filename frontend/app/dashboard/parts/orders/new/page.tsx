'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  Truck,
  Search,
  Trash2,
  Send,
  AlertCircle,
  Package,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
};

interface SupplierOption {
  id: string;
  name: string;
}

interface PartOption {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  costPrice: number;
}

interface OrderLine {
  localId: string;
  partId: string;
  partName: string;
  partSku: string;
  currentStock: number;
  quantity: number;
  unitPrice: number;
}

let lineCounter = 0;
function newLineId(): string {
  lineCounter += 1;
  return `ol-${Date.now()}-${lineCounter}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

export default function NewSupplierOrderPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [partSearch, setPartSearch] = useState('');
  const [partResults, setPartResults] = useState<PartOption[]>([]);
  const [showPartDropdown, setShowPartDropdown] = useState(false);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/parts/suppliers')
      .then(res => res.json())
      .then(json => {
        const list = json.data || json || [];
        setSuppliers(Array.isArray(list) ? list : []);
      })
      .catch(() => setSuppliers([]));
  }, []);

  const searchParts = useCallback(async (query: string) => {
    setPartSearch(query);
    if (query.length < 2) {
      setPartResults([]);
      return;
    }
    try {
      const qs = new URLSearchParams({ search: query });
      if (selectedSupplierId) qs.set('supplierId', selectedSupplierId);
      const res = await fetch(`/api/parts?${qs.toString()}`);
      const json = await res.json();
      const list = json.data || json || [];
      setPartResults(
        (Array.isArray(list) ? list : []).slice(0, 10).map((p: Record<string, unknown>) => ({
          id: p.id as string,
          name: p.name as string,
          sku: (p.sku as string) || '',
          currentStock: (p.currentStock as number) || 0,
          costPrice: (p.costPrice as number) || 0,
        })),
      );
      setShowPartDropdown(true);
    } catch {
      setPartResults([]);
    }
  }, [selectedSupplierId]);

  const addPart = (part: PartOption) => {
    if (lines.some(l => l.partId === part.id)) {
      toast.error('Ricambio già aggiunto');
      return;
    }
    setLines(prev => [
      ...prev,
      {
        localId: newLineId(),
        partId: part.id,
        partName: part.name,
        partSku: part.sku,
        currentStock: part.currentStock,
        quantity: 1,
        unitPrice: part.costPrice,
      },
    ]);
    setPartSearch('');
    setShowPartDropdown(false);
  };

  const updateLine = (localId: string, field: 'quantity' | 'unitPrice', value: number) => {
    setLines(prev => prev.map(l => l.localId === localId ? { ...l, [field]: value } : l));
  };

  const removeLine = (localId: string) => {
    setLines(prev => prev.filter(l => l.localId !== localId));
  };

  const orderTotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

  const handleSubmit = async () => {
    if (!selectedSupplierId) {
      setSubmitError('Seleziona un fornitore');
      return;
    }
    if (lines.length === 0) {
      setSubmitError('Aggiungi almeno un ricambio');
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const body = {
        supplierId: selectedSupplierId,
        notes,
        items: lines.map(l => ({
          partId: l.partId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
      };
      const res = await fetch('/api/parts/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || 'Errore creazione ordine');
      }
      toast.success('Ordine fornitore creato con successo');
      router.push('/dashboard/parts');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectClass = 'w-full h-[52px] px-4 rounded-full border border-[#4e4e4e] bg-[#2f2f2f] text-sm text-white outline-none appearance-none cursor-pointer';

  return (
    <div className="bg-[#1a1a1a] min-h-screen">
      {/* Header */}
      <header className="bg-[#2f2f2f] border-b border-[#4e4e4e]">
        <div className='px-8 py-5'>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Ricambi', href: '/dashboard/parts' },
              { label: 'Nuovo Ordine Fornitore' },
            ]}
          />
          <div className='flex items-center gap-3 mt-2'>
            <div className='w-10 h-10 rounded-xl bg-[#383838] flex items-center justify-center'>
              <Truck className='h-5 w-5 text-white' />
            </div>
            <h1 className='text-2xl font-bold text-white'>Ordine Fornitore</h1>
          </div>
        </div>
      </header>

      <motion.div
        className='p-8 max-w-5xl mx-auto space-y-6'
        initial='hidden'
        animate='visible'
        variants={containerVariants}
      >
        {/* Supplier */}
        <motion.div variants={cardVariants}>
          <div className="rounded-2xl border border-[#4e4e4e] bg-[#2f2f2f] shadow-[0_0_60px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="px-6 py-5 border-b border-[#4e4e4e]">
              <h2 className='text-base font-semibold text-white'>
                Fornitore
              </h2>
            </div>
            <div className="p-6">
              <select
                value={selectedSupplierId}
                onChange={e => setSelectedSupplierId(e.target.value)}
                className={selectClass}
              >
                <option value=''>Seleziona fornitore...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Parts */}
        <motion.div variants={cardVariants}>
          <div className="rounded-2xl border border-[#4e4e4e] bg-[#2f2f2f] shadow-[0_0_60px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="px-6 py-5 border-b border-[#4e4e4e] flex items-center justify-between">
              <h2 className='text-base font-semibold text-white flex items-center gap-2'>
                <Package className='h-5 w-5 text-[#888]' />
                Ricambi da Ordinare
              </h2>
            </div>
            <div className="p-6">
              {/* Search */}
              <div className='relative mb-4'>
                <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#888]' />
                <Input
                  placeholder='Cerca ricambio per nome o SKU...'
                  aria-label='Cerca ricambio'
                  value={partSearch}
                  onChange={e => searchParts(e.target.value)}
                  onFocus={() => partResults.length > 0 && setShowPartDropdown(true)}
                  className='w-full h-[52px] rounded-full border border-[#4e4e4e] bg-[#2f2f2f] text-white placeholder-[#888] outline-none pl-10 pr-4 text-sm'
                />
                {showPartDropdown && partResults.length > 0 && (
                  <div className='absolute z-10 top-full mt-1 w-full bg-[#2f2f2f] rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.5)] border border-[#4e4e4e] max-h-60 overflow-y-auto'>
                    {partResults.map(p => (
                      <button
                        key={p.id}
                        className='w-full text-left px-4 py-3 hover:bg-white/5 transition-colors text-sm flex items-center justify-between'
                        onClick={() => addPart(p)}
                      >
                        <div>
                          <span className='font-medium text-white'>{p.name}</span>
                          <span className='ml-2 text-[#888] font-mono text-xs'>{p.sku}</span>
                        </div>
                        <div className='text-right'>
                          <span className='text-xs text-[#888]'>Stock: {p.currentStock}</span>
                          <span className='ml-3 text-xs font-medium text-white'>{formatCurrency(p.costPrice)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Header */}
              {lines.length > 0 && (
                <div className='hidden md:grid grid-cols-12 gap-2 pb-2 border-b border-[#4e4e4e] mb-3'>
                  <div className='col-span-4 text-xs font-medium uppercase text-[#888]'>Ricambio</div>
                  <div className='col-span-2 text-xs font-medium uppercase text-[#888] text-right'>Stock</div>
                  <div className='col-span-2 text-xs font-medium uppercase text-[#888] text-right'>Quantità</div>
                  <div className='col-span-2 text-xs font-medium uppercase text-[#888] text-right'>Prezzo Unit.</div>
                  <div className='col-span-1 text-xs font-medium uppercase text-[#888] text-right'>Totale</div>
                  <div className='col-span-1' />
                </div>
              )}

              {lines.length === 0 ? (
                <div className='text-center py-8'>
                  <Package className='h-12 w-12 text-[#888]/40 mx-auto mb-3' />
                  <p className='text-sm text-[#888]'>
                    Cerca e aggiungi ricambi da ordinare
                  </p>
                </div>
              ) : (
                <div className='space-y-2'>
                  {lines.map(line => (
                    <div
                      key={line.localId}
                      className='grid grid-cols-12 gap-2 items-center p-3 rounded-2xl bg-[#383838]'
                    >
                      <div className='col-span-12 md:col-span-4'>
                        <p className='text-sm font-medium text-white'>{line.partName}</p>
                        <p className='text-xs text-[#888] font-mono'>{line.partSku}</p>
                      </div>
                      <div className='col-span-4 md:col-span-2 text-right'>
                        <span className='text-sm text-[#888]'>{line.currentStock}</span>
                      </div>
                      <div className='col-span-4 md:col-span-2'>
                        <Input
                          type='number'
                          value={line.quantity || ''}
                          onChange={e => updateLine(line.localId, 'quantity', Number(e.target.value))}
                          min={1}
                          className='h-9 text-sm text-right rounded-full border border-[#4e4e4e] bg-[#2f2f2f] text-white outline-none px-3'
                        />
                      </div>
                      <div className='col-span-4 md:col-span-2'>
                        <Input
                          type='number'
                          value={line.unitPrice || ''}
                          onChange={e => updateLine(line.localId, 'unitPrice', Number(e.target.value))}
                          min={0}
                          step={0.01}
                          className='h-9 text-sm text-right rounded-full border border-[#4e4e4e] bg-[#2f2f2f] text-white outline-none px-3'
                        />
                      </div>
                      <div className='col-span-6 md:col-span-1 text-right'>
                        <span className='text-sm font-medium text-white'>
                          {formatCurrency(line.quantity * line.unitPrice)}
                        </span>
                      </div>
                      <div className='col-span-6 md:col-span-1 flex justify-end'>
                        <button
                          onClick={() => removeLine(line.localId)}
                          className='p-2 rounded-full hover:bg-red-900/20 text-[#888] hover:text-red-500 transition-colors'
                          aria-label='Rimuovi'
                        >
                          <Trash2 className='h-4 w-4' />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {lines.length > 0 && (
              <div className="px-6 py-4 border-t border-[#4e4e4e] bg-[#383838]">
                <div className='flex justify-end'>
                  <div className='space-y-2 w-full max-w-xs'>
                    <div className='flex justify-between border-t border-[#4e4e4e] pt-2'>
                      <span className='text-base font-semibold text-white'>
                        Totale Ordine
                      </span>
                      <span className='text-base font-bold text-white'>
                        {formatCurrency(orderTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Notes */}
        <motion.div variants={cardVariants}>
          <div className="rounded-2xl border border-[#4e4e4e] bg-[#2f2f2f] shadow-[0_0_60px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="px-6 py-5 border-b border-[#4e4e4e]">
              <h2 className='text-base font-semibold text-white'>
                Note Ordine
              </h2>
            </div>
            <div className="p-6">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder='Note per il fornitore...'
                className='w-full rounded-2xl border border-[#4e4e4e] bg-[#2f2f2f] text-white placeholder-[#888] px-5 py-3 outline-none text-sm resize-none'
              />
            </div>
          </div>
        </motion.div>

        {/* Error */}
        {submitError && (
          <div className='flex items-center gap-2 p-3 rounded-2xl bg-red-900/20 border border-red-700/30'>
            <AlertCircle className='h-4 w-4 text-red-500 flex-shrink-0' />
            <p className='text-xs text-red-300'>{submitError}</p>
          </div>
        )}

        {/* Submit */}
        <div className='flex justify-end'>
          <button
            disabled={submitting}
            onClick={handleSubmit}
            className='inline-flex items-center justify-center gap-2 rounded-full h-[52px] px-6 bg-white text-[#0d0d0d] hover:bg-[#e5e5e5] font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {submitting ? (
              <svg className='animate-spin h-4 w-4' viewBox='0 0 24 24'>
                <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' fill='none' />
                <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' />
              </svg>
            ) : (
              <Send className='h-4 w-4' />
            )}
            Invia Ordine
          </button>
        </div>
      </motion.div>
    </div>
  );
}
