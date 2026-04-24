'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  Truck,
  Search,
  Trash2,
  Send,
  AlertCircle,
  Package,
  ArrowLeft,
  Loader2,
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

  return (
    <div>
      {/* Header */}
      <header>
        <div className='px-8 py-5'>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Ricambi', href: '/dashboard/parts' },
              { label: 'Nuovo Ordine Fornitore' },
            ]}
          />
          <div className='flex items-center gap-3 mt-2'>
            <AppleButton
              variant='ghost'
              size='sm'
              onClick={() => router.push('/dashboard/parts')}
              icon={<ArrowLeft className='h-4 w-4' />}
              aria-label='Torna ai ricambi'
              className='min-w-[44px]'
            />
            <div>
              <h1 className='text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Ordine Fornitore</h1>
              <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1'>
                Crea un nuovo ordine di acquisto ricambi
              </p>
            </div>
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
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Fornitore
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              <select
                value={selectedSupplierId}
                onChange={e => setSelectedSupplierId(e.target.value)}
                className='w-full h-10 px-3 rounded-md border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue appearance-none cursor-pointer'
              >
                <option value=''>Seleziona fornitore...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Parts */}
        <motion.div variants={cardVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2'>
                <Package className='h-5 w-5 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]' />
                Ricambi da Ordinare
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              {/* Search */}
              <div className='relative mb-4'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]' />
                <Input
                  placeholder='Cerca ricambio per nome o SKU...'
                  aria-label='Cerca ricambio'
                  value={partSearch}
                  onChange={e => searchParts(e.target.value)}
                  onFocus={() => partResults.length > 0 && setShowPartDropdown(true)}
                  className='pl-10'
                />
                {showPartDropdown && partResults.length > 0 && (
                  <div className='absolute z-10 top-full mt-1 w-full bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] rounded-xl shadow-apple dark:shadow-[var(--shadow-xl)] border border-[var(--border-default)]/30 dark:border-[var(--border-default)] max-h-60 overflow-y-auto'>
                    {partResults.map(p => (
                      <button
                        key={p.id}
                        className='w-full text-left px-4 py-3 hover:bg-[var(--surface-secondary)]/50 dark:hover:bg-[var(--surface-hover)] transition-colors text-sm flex items-center justify-between'
                        onClick={() => addPart(p)}
                      >
                        <div>
                          <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>{p.name}</span>
                          <span className='ml-2 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] font-mono text-xs'>{p.sku}</span>
                        </div>
                        <div className='text-right'>
                          <span className='text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Stock: {p.currentStock}</span>
                          <span className='ml-3 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>{formatCurrency(p.costPrice)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Header */}
              {lines.length > 0 && (
                <div className='hidden md:grid grid-cols-12 gap-2 pb-2 border-b border-[var(--border-default)]/30 dark:border-[var(--border-default)] mb-3'>
                  <div className='col-span-4 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Ricambio</div>
                  <div className='col-span-2 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] text-right'>Stock</div>
                  <div className='col-span-2 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] text-right'>Quantità</div>
                  <div className='col-span-2 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] text-right'>Prezzo Unit.</div>
                  <div className='col-span-1 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] text-right'>Totale</div>
                  <div className='col-span-1' />
                </div>
              )}

              {lines.length === 0 ? (
                <div className='text-center py-8'>
                  <Package className='h-12 w-12 text-[var(--text-tertiary)]/40 dark:text-[var(--text-secondary)]/40 mx-auto mb-3' />
                  <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                    Cerca e aggiungi ricambi da ordinare
                  </p>
                </div>
              ) : (
                <div className='space-y-2'>
                  {lines.map(line => (
                    <div
                      key={line.localId}
                      className='grid grid-cols-12 gap-2 items-center p-3 rounded-2xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)]'
                    >
                      <div className='col-span-12 md:col-span-4'>
                        <p className='text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>{line.partName}</p>
                        <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] font-mono'>{line.partSku}</p>
                      </div>
                      <div className='col-span-4 md:col-span-2 text-right'>
                        <span className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>{line.currentStock}</span>
                      </div>
                      <div className='col-span-4 md:col-span-2'>
                        <Input
                          type='number'
                          value={line.quantity || ''}
                          onChange={e => updateLine(line.localId, 'quantity', Number(e.target.value))}
                          min={1}
                          className='h-9 text-sm text-right'
                        />
                      </div>
                      <div className='col-span-4 md:col-span-2'>
                        <Input
                          type='number'
                          value={line.unitPrice || ''}
                          onChange={e => updateLine(line.localId, 'unitPrice', Number(e.target.value))}
                          min={0}
                          step={0.01}
                          className='h-9 text-sm text-right'
                        />
                      </div>
                      <div className='col-span-6 md:col-span-1 text-right'>
                        <span className='text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                          {formatCurrency(line.quantity * line.unitPrice)}
                        </span>
                      </div>
                      <div className='col-span-6 md:col-span-1 flex justify-end'>
                        <AppleButton
                          variant='ghost'
                          size='sm'
                          onClick={() => removeLine(line.localId)}
                          icon={<Trash2 className='h-4 w-4' />}
                          aria-label='Rimuovi'
                          className='text-[var(--text-tertiary)] hover:text-[var(--status-error)] dark:text-[var(--text-secondary)]'
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AppleCardContent>
            {lines.length > 0 && (
              <div className='px-6 py-4 border-t border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)]/20 dark:bg-[var(--surface-hover)] rounded-b-2xl'>
                <div className='flex justify-end'>
                  <div className='space-y-2 w-full max-w-xs'>
                    <div className='flex justify-between border-t border-[var(--border-default)]/30 dark:border-[var(--border-default)] pt-2'>
                      <span className='text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                        Totale Ordine
                      </span>
                      <span className='text-body font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                        {formatCurrency(orderTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </AppleCard>
        </motion.div>

        {/* Notes */}
        <motion.div variants={cardVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Note Ordine
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder='Note per il fornitore...'
                className='w-full rounded-xl border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-[var(--text-primary)] dark:text-[var(--text-primary)] placeholder-apple-gray/60 dark:placeholder-[var(--text-tertiary)] px-4 py-3 outline-none text-body resize-none focus:ring-2 focus:ring-apple-blue'
              />
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Error */}
        {submitError && (
          <div className='flex items-center gap-2 p-3 rounded-xl bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)] border border-[var(--status-error)]/30 dark:border-[var(--status-error)]/30'>
            <AlertCircle className='h-4 w-4 text-[var(--status-error)] flex-shrink-0' />
            <p className='text-footnote text-[var(--status-error)] dark:text-[var(--status-error)]'>{submitError}</p>
          </div>
        )}

        {/* Submit */}
        <div className='flex justify-end gap-3'>
          <AppleButton
            type='button'
            variant='ghost'
            onClick={() => router.push('/dashboard/parts')}
          >
            Annulla
          </AppleButton>
          <AppleButton
            disabled={submitting}
            onClick={handleSubmit}
            loading={submitting}
            icon={<Send className='h-4 w-4' />}
          >
            Invia Ordine
          </AppleButton>
        </div>
      </motion.div>
    </div>
  );
}
