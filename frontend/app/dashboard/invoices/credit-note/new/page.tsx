'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  ReceiptText,
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';

interface OriginalItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  total: number;
}

interface OriginalInvoice {
  id: string;
  number: string;
  customerName: string;
  items: OriginalItem[];
  total: number;
}

const REASONS = [
  { value: 'RESO_MERCE', label: 'Reso merce' },
  { value: 'SCONTO_SUCCESSIVO', label: 'Sconto successivo' },
  { value: 'ERRORE_FATTURAZIONE', label: 'Errore fatturazione' },
  { value: 'ALTRO', label: 'Altro' },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
}

export default function CreditNotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get('invoiceId');

  const { data: rawData, isLoading, error: fetchError } = useSWR(
    invoiceId ? `/api/invoices/${invoiceId}` : null,
    fetcher,
  );

  const invoice: OriginalInvoice | null = (() => {
    if (!rawData) return null;
    return (rawData as { data?: OriginalInvoice }).data || (rawData as OriginalInvoice);
  })();

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState('RESO_MERCE');
  const [reasonDetail, setReasonDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Auto-select all items when invoice loads
  useEffect(() => {
    if (invoice?.items) {
      setSelectedItems(new Set(invoice.items.map(i => i.id)));
    }
  }, [invoice]);

  const toggleItem = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const creditAmount = useMemo(() => {
    if (!invoice) return 0;
    return invoice.items
      .filter(i => selectedItems.has(i.id))
      .reduce((sum, i) => sum + (i.total || i.quantity * i.unitPrice), 0);
  }, [invoice, selectedItems]);

  const handleSubmit = async () => {
    if (selectedItems.size === 0) {
      setError('Seleziona almeno una voce da accreditare');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/invoices/credit-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalInvoiceId: invoiceId,
          itemIds: Array.from(selectedItems),
          reason,
          reasonDetail: reasonDetail || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error?.message || 'Errore nella creazione della nota di credito');
      }

      const data = await res.json();
      const newId = data.data?.id || data.id;
      toast.success('Nota di credito emessa con successo');
      router.push(newId ? `/dashboard/invoices/${newId}` : '/dashboard/invoices');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore nella creazione';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-[#1a1a1a]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (fetchError || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-[#1a1a1a] text-center p-8">
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <p className="text-[#888] mb-4">
          {!invoiceId ? 'Nessuna fattura di riferimento specificata' : 'Fattura non trovata'}
        </p>
        <Button variant="outline" onClick={() => router.push('/dashboard/invoices')}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Torna alle Fatture
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#1a1a1a] flex items-center justify-center p-4 overflow-hidden">
      <div className="relative w-[min(800px,95vw)] h-[min(850px,95vh)]">
        <motion.div
          className="relative z-10 w-full h-full bg-[#2f2f2f] rounded-[40px] shadow-[0_0_60px_rgba(0,0,0,0.5)] border border-[#4e4e4e] overflow-hidden flex flex-col"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="px-6 sm:px-10 pt-6 sm:pt-8 pb-4">
            <Breadcrumb
              items={[
                { label: 'Fatture', href: '/dashboard/invoices' },
                { label: invoice.number, href: `/dashboard/invoices/${invoiceId}` },
                { label: 'Nota di Credito' },
              ]}
            />
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                  Nota di Credito
                </h1>
                <p className="text-[#888] mt-1">
                  Rif. Fattura {invoice.number} - {invoice.customerName}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                <ReceiptText className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 px-6 sm:px-10 pb-28 overflow-y-auto space-y-6">
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-900/20 border border-red-800">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Items selection */}
            <div className="bg-[#2f2f2f] rounded-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.5)] border border-[#4e4e4e]">
              <h3 className="text-lg font-semibold text-white mb-4">
                Voci da Accreditare
              </h3>
              <div className="space-y-3">
                {invoice.items.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl transition-colors cursor-pointer ${
                      selectedItems.has(item.id)
                        ? 'border-[#ececec] bg-[#383838] border'
                        : 'bg-[#383838] border border-transparent'
                    }`}
                    onClick={() => toggleItem(item.id)}
                  >
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={() => toggleItem(item.id)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">
                        {item.description}
                      </p>
                      <p className="text-xs text-[#888]">
                        {item.quantity} x {formatCurrency(item.unitPrice)} — IVA{' '}
                        {item.vatRate ?? 22}%
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-white">
                      {formatCurrency(item.total || item.quantity * item.unitPrice)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div className="bg-[#2f2f2f] rounded-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.5)] border border-[#4e4e4e]">
              <h3 className="text-lg font-semibold text-white mb-4">
                Motivo
              </h3>
              <div className="space-y-4">
                <div>
                  <Label className="mb-1.5 block text-sm font-medium text-white">
                    Causale
                  </Label>
                  <select
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="h-[52px] w-full rounded-full border border-[#4e4e4e] bg-[#2f2f2f] px-4 text-sm text-white outline-none"
                  >
                    {REASONS.map(r => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-sm font-medium text-white">
                    Dettaglio
                  </Label>
                  <textarea
                    value={reasonDetail}
                    onChange={e => setReasonDetail(e.target.value)}
                    rows={3}
                    placeholder="Descrivi il motivo della nota di credito..."
                    className="w-full rounded-2xl border border-[#4e4e4e] bg-[#2f2f2f] px-5 py-3 text-sm text-white placeholder-[#888] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-[#2f2f2f] rounded-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.5)] border border-[#4e4e4e]">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-[#888]">
                    {selectedItems.size} voci selezionate su {invoice.items.length}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[#888]">
                    Importo Nota di Credito
                  </p>
                  <p className="text-2xl font-bold text-red-400">
                    -{formatCurrency(creditAmount)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 px-6 sm:px-10 py-6 bg-[#2f2f2f] border-t border-[#4e4e4e] z-50">
            <div className="flex items-center justify-between">
              <Button
                type="button"
                onClick={() => router.back()}
                className="rounded-full px-6 h-[52px] border border-[#4e4e4e] bg-transparent text-white hover:bg-white/5 transition-all"
              >
                <ChevronLeft className="w-5 h-5 mr-2" />
                Annulla
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || selectedItems.size === 0}
                className="rounded-full px-8 h-[52px] bg-white text-[#0d0d0d] hover:bg-[#e5e5e5] transition-all border-0"
              >
                {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                Emetti Nota di Credito
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
