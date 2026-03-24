'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ChevronLeft,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  FileText,
  Package,
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  companyName?: string;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

/* ------------------------------------------------------------------ */
/*  Schema                                                             */
/* ------------------------------------------------------------------ */

const invoiceFormSchema = z.object({
  customerId: z.string({ required_error: 'Seleziona un cliente' }).min(1, 'Seleziona un cliente'),
  invoiceNumber: z.string().optional(),
  issueDate: z.string().min(1, 'Data emissione obbligatoria'),
  dueDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
}

function createEmptyLine(): LineItem {
  return {
    id: crypto.randomUUID(),
    description: '',
    quantity: 1,
    unitPrice: 0,
    vatRate: 22,
  };
}

function getDefaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

const VAT_RATES = [
  { value: 22, label: '22%' },
  { value: 10, label: '10%' },
  { value: 4, label: '4%' },
  { value: 0, label: '0% (Esente)' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workOrderId = searchParams.get('workOrderId');
  const estimateId = searchParams.get('estimateId');

  const [lineItems, setLineItems] = useState<LineItem[]>([createEmptyLine()]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Fetch customers
  const { data: customersRaw, isLoading: loadingCustomers } = useSWR('/api/customers', fetcher);
  const customers: Customer[] = (() => {
    if (!customersRaw) return [];
    const list = (customersRaw as { data?: Customer[] }).data || customersRaw;
    return Array.isArray(list) ? list : [];
  })();

  const filteredCustomers = customers.filter(c => {
    if (!customerSearch) return true;
    const name = c.companyName || `${c.firstName} ${c.lastName}`;
    return name.toLowerCase().includes(customerSearch.toLowerCase());
  });

  const {
    register,
    setValue,
    watch,
    formState: { errors: formErrors },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      customerId: '',
      invoiceNumber: '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: getDefaultDueDate(),
      paymentMethod: 'BANK_TRANSFER',
      notes: '',
    },
  });

  const customerId = watch('customerId');
  const issueDate = watch('issueDate');
  const dueDate = watch('dueDate') ?? '';
  const notes = watch('notes') ?? '';
  const paymentMethod = watch('paymentMethod') ?? '';
  const invoiceNumber = watch('invoiceNumber') ?? '';

  // Pre-fill from work order
  useEffect(() => {
    if (workOrderId) {
      fetch(`/api/dashboard/work-orders/${workOrderId}`)
        .then(r => r.json())
        .then(res => {
          const wo = res.data || res;
          if (wo.customerId) setValue('customerId', wo.customerId);
          if (wo.items && Array.isArray(wo.items)) {
            setLineItems(
              wo.items.map((item: { description?: string; quantity?: number; unitPrice?: number }) => ({
                id: crypto.randomUUID(),
                description: item.description || '',
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice || 0,
                vatRate: 22,
              })),
            );
          }
        })
        .catch(() => {});
    }
  }, [workOrderId, setValue]);

  // Pre-fill from estimate
  useEffect(() => {
    if (estimateId) {
      fetch(`/api/estimates/${estimateId}`)
        .then(r => r.json())
        .then(res => {
          const est = res.data || res;
          if (est.customerId) setValue('customerId', est.customerId);
          if (est.items && Array.isArray(est.items)) {
            setLineItems(
              est.items.map((item: { description?: string; quantity?: number; unitPrice?: number }) => ({
                id: crypto.randomUUID(),
                description: item.description || '',
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice || 0,
                vatRate: 22,
              })),
            );
          }
        })
        .catch(() => {});
    }
  }, [estimateId, setValue]);

  /* ------------------------------------------------------------------ */
  /*  Computed                                                           */
  /* ------------------------------------------------------------------ */

  const subtotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [lineItems],
  );

  const ivaBreakdown: Record<number, number> = useMemo(() => {
    const breakdown: Record<number, number> = {};
    for (const item of lineItems) {
      if (!breakdown[item.vatRate]) breakdown[item.vatRate] = 0;
      breakdown[item.vatRate] += item.quantity * item.unitPrice * (item.vatRate / 100);
    }
    return breakdown;
  }, [lineItems]);

  const totalIva = useMemo(
    () => Object.values(ivaBreakdown).reduce((s, v) => s + v, 0),
    [ivaBreakdown],
  );

  const bolloAmount = useMemo(() => {
    // Bollo of 2 EUR if total > 77.47 and exempt IVA
    const hasExempt = lineItems.some(i => i.vatRate === 0);
    if (hasExempt && subtotal > 77.47) return 2;
    return 0;
  }, [lineItems, subtotal]);

  const total = subtotal + totalIva + bolloAmount;

  /* ------------------------------------------------------------------ */
  /*  Line Item CRUD                                                     */
  /* ------------------------------------------------------------------ */

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(prev => prev.map(item => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const addLineItem = () => setLineItems(prev => [...prev, createEmptyLine()]);

  const removeLineItem = (id: string) => {
    if (lineItems.length <= 1) return;
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  /* ------------------------------------------------------------------ */
  /*  Submit                                                             */
  /* ------------------------------------------------------------------ */

  const handleSubmit = async (asDraft: boolean) => {
    setError('');
    setFieldErrors({});

    if (!customerId) {
      setError('Seleziona un cliente');
      setFieldErrors({ customerId: 'Seleziona un cliente' });
      return;
    }

    const hasEmptyDescription = lineItems.some(i => !i.description.trim());
    if (hasEmptyDescription) {
      setError('Compila la descrizione di tutte le righe');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          invoiceNumber: invoiceNumber || undefined,
          issueDate,
          dueDate: dueDate || undefined,
          paymentMethod: paymentMethod || undefined,
          notes: notes || undefined,
          status: asDraft ? 'DRAFT' : 'SENT',
          items: lineItems.map(({ description, quantity, unitPrice, vatRate }) => ({
            description,
            qty: quantity,
            price: unitPrice,
            vatRate,
          })),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error?.message || 'Errore nella creazione della fattura');
      }

      const data = await res.json();
      const newId = data.data?.id || data.id;
      toast.success(asDraft ? 'Fattura salvata come bozza' : 'Fattura creata e inviata');
      router.push(`/dashboard/invoices/${newId}`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Errore nella creazione della fattura';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="fixed inset-0 bg-[#1a1a1a] flex items-center justify-center p-4 overflow-hidden">
      <div className="relative w-[min(960px,95vw)] h-[min(900px,95vh)]">
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
                { label: 'Nuova Fattura' },
              ]}
            />
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                  Nuova Fattura
                </h1>
                <p className="text-[#888] mt-1">
                  Compila i dettagli della fattura
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                <FileText className="w-6 h-6 text-[#0d0d0d]" />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 px-6 sm:px-10 pb-28 overflow-y-auto space-y-6">
            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-900/20 border border-red-800">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Dettagli Fattura */}
            <div className="bg-[#2f2f2f] rounded-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.5)] border border-[#4e4e4e]">
              <h3 className="text-lg font-semibold text-white mb-4">
                Dettagli Fattura
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="mb-1.5 block text-sm font-medium text-white">
                    Numero Fattura
                  </Label>
                  <Input
                    {...register('invoiceNumber')}
                    placeholder="Auto-generato"
                    className="h-[52px] rounded-full border border-[#4e4e4e] bg-[#2f2f2f] text-white placeholder-[#888] outline-none"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block text-sm font-medium text-white">
                    Data Emissione
                  </Label>
                  <Input type="date" {...register('issueDate')} className="rounded-full border border-[#4e4e4e] bg-[#2f2f2f] text-white" />
                  {formErrors.issueDate && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.issueDate.message}</p>
                  )}
                </div>
                <div>
                  <Label className="mb-1.5 block text-sm font-medium text-white">
                    Data Scadenza
                  </Label>
                  <Input type="date" {...register('dueDate')} className="rounded-full border border-[#4e4e4e] bg-[#2f2f2f] text-white" />
                </div>
                <div>
                  <Label className="mb-1.5 block text-sm font-medium text-white">
                    Metodo Pagamento
                  </Label>
                  <select
                    value={paymentMethod}
                    onChange={e => setValue('paymentMethod', e.target.value)}
                    className="h-[52px] w-full rounded-full border border-[#4e4e4e] bg-[#2f2f2f] px-4 text-sm text-white outline-none"
                  >
                    <option value="CASH">Contanti</option>
                    <option value="BANK_TRANSFER">Bonifico</option>
                    <option value="CARD">Carta</option>
                    <option value="CHECK">Assegno</option>
                    <option value="RIBA">RiBa</option>
                    <option value="SCALAPAY">Scalapay</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Cliente */}
            <div className="bg-[#2f2f2f] rounded-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.5)] border border-[#4e4e4e]">
              <h3 className="text-lg font-semibold text-white mb-4">
                Cliente
              </h3>
              {loadingCustomers ? (
                <div className="flex items-center gap-2 text-[#888]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Caricamento clienti...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="Cerca cliente per nome..."
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    className="h-[52px] rounded-full border border-[#4e4e4e] bg-[#2f2f2f] text-white placeholder-[#888] outline-none"
                  />
                  <select
                    value={customerId}
                    onChange={e => setValue('customerId', e.target.value, { shouldValidate: true })}
                    className="h-[52px] w-full rounded-full border border-[#4e4e4e] bg-[#2f2f2f] px-4 text-sm text-white outline-none"
                  >
                    <option value="">-- Seleziona un cliente --</option>
                    {filteredCustomers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.companyName || `${c.firstName} ${c.lastName}`}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.customerId && (
                    <p className="text-xs text-red-500">{fieldErrors.customerId}</p>
                  )}
                </div>
              )}
            </div>

            {/* Righe Fattura */}
            <div className="bg-[#2f2f2f] rounded-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.5)] border border-[#4e4e4e]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Righe Fattura
                </h3>
                <div className="flex items-center gap-2">
                  {workOrderId && (
                    <span className="text-xs text-[#888] flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      Da OdL #{workOrderId.slice(0, 8)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="flex items-center gap-1 text-sm font-medium text-white hover:opacity-70 transition-opacity min-h-[44px] px-3"
                  >
                    <Plus className="h-4 w-4" />
                    Aggiungi Riga
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {lineItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 gap-2 sm:gap-3 items-end p-3 sm:p-4 rounded-2xl bg-[#383838]"
                  >
                    <div className="col-span-12 sm:col-span-4">
                      <Label className="mb-1.5 block text-xs text-[#888]">
                        Descrizione
                      </Label>
                      <Input
                        placeholder="es. Cambio olio motore"
                        value={item.description}
                        onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-2">
                      <Label className="mb-1.5 block text-xs text-[#888]">
                        Quantita
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={e => updateLineItem(item.id, 'quantity', Number(e.target.value))}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-2">
                      <Label className="mb-1.5 block text-xs text-[#888]">
                        Prezzo Unitario
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unitPrice}
                        onChange={e => updateLineItem(item.id, 'unitPrice', Number(e.target.value))}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-2">
                      <Label className="mb-1.5 block text-xs text-[#888]">
                        IVA %
                      </Label>
                      <select
                        value={item.vatRate}
                        onChange={e => updateLineItem(item.id, 'vatRate', Number(e.target.value))}
                        className="h-[52px] w-full rounded-full border border-[#4e4e4e] bg-[#2f2f2f] px-2 text-sm text-white outline-none"
                      >
                        {VAT_RATES.map(r => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2 sm:col-span-1 text-right">
                      <Label className="mb-1.5 block text-xs text-[#888]">
                        Totale
                      </Label>
                      <p className="h-10 flex items-center justify-end text-sm font-semibold text-white">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </p>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button
                        type="button"
                        disabled={lineItems.length <= 1}
                        onClick={() => removeLineItem(item.id)}
                        className="p-2 rounded-xl text-red-500 hover:bg-red-900/20 disabled:opacity-30 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="Rimuovi riga fattura"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totali + Note */}
            <div className="bg-[#2f2f2f] rounded-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.5)] border border-[#4e4e4e]">
              <h3 className="text-lg font-semibold text-white mb-4">
                Riepilogo e Note
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="mb-1.5 block text-sm font-medium text-white">
                    Note / Condizioni
                  </Label>
                  <textarea
                    {...register('notes')}
                    rows={4}
                    placeholder="Note aggiuntive, condizioni di pagamento..."
                    className="w-full rounded-2xl border border-[#4e4e4e] bg-[#2f2f2f] px-5 py-3 text-sm text-white placeholder-[#888] outline-none"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <div className="p-6 rounded-2xl bg-[#383838] space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#888]">Subtotale</span>
                      <span className="font-medium text-white">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                    {Object.entries(ivaBreakdown).map(([rate, amount]) => (
                      <div key={rate} className="flex justify-between text-sm">
                        <span className="text-[#888]">IVA {rate}%</span>
                        <span className="font-medium text-white">
                          {formatCurrency(amount)}
                        </span>
                      </div>
                    ))}
                    {bolloAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[#888]">Bollo</span>
                        <span className="font-medium text-white">
                          {formatCurrency(bolloAmount)}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-[#4e4e4e] pt-3">
                      <div className="flex justify-between">
                        <span className="text-base font-semibold text-white">
                          Totale
                        </span>
                        <span className="text-base font-bold text-white">
                          {formatCurrency(total)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 px-6 sm:px-10 py-6 bg-[#2f2f2f] border-t border-[#4e4e4e] z-50">
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                onClick={() => router.push('/dashboard/invoices')}
                className="rounded-full px-6 h-[52px] border border-[#4e4e4e] bg-transparent text-white hover:bg-white/5 transition-all"
              >
                <ChevronLeft className="w-5 h-5 mr-2" />
                Annulla
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  disabled={submitting}
                  className="rounded-full px-6 h-[52px] border border-[#4e4e4e] bg-transparent text-white hover:bg-white/5 transition-all"
                >
                  {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                  Salva come Bozza
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                  className="rounded-full px-8 h-[52px] bg-white text-[#0d0d0d] hover:bg-[#e5e5e5] transition-all border-0"
                >
                  {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                  Salva e Invia
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
