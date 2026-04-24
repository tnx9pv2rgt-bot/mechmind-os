'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { motion } from 'framer-motion';
import {
  AppleCard,
  AppleCardContent,
  AppleCardHeader,
} from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  FileText,
  Package,
  Save,
  Send,
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
};

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
    <div>
      {/* Header */}
      <header>
        <div className='px-8 py-5'>
          <Breadcrumb
            items={[
              { label: 'Fatture', href: '/dashboard/invoices' },
              { label: 'Nuova Fattura' },
            ]}
          />
          <div className='flex items-center justify-between mt-2'>
            <div>
              <h1 className='text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Nuova Fattura
              </h1>
              <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-1'>
                Compila i dettagli della fattura
              </p>
            </div>
            <div className='flex items-center gap-3'>
              <div className='w-12 h-12 rounded-2xl bg-[var(--brand)]/10 flex items-center justify-center'>
                <FileText className='w-6 h-6 text-[var(--brand)]' />
              </div>
              <AppleButton
                variant='ghost'
                icon={<ArrowLeft className='h-4 w-4' />}
                onClick={() => router.push('/dashboard/invoices')}
              >
                Torna alle Fatture
              </AppleButton>
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
        {/* Error */}
        {error && (
          <div className='flex items-center gap-3 p-4 rounded-2xl bg-[var(--status-error)]/5 dark:bg-[var(--status-error)]/10 border border-[var(--status-error)]/20'>
            <AlertCircle className='h-5 w-5 text-[var(--status-error)] flex-shrink-0' />
            <p className='text-body text-[var(--status-error)]'>{error}</p>
          </div>
        )}

        {/* Dettagli Fattura */}
        <motion.div variants={cardVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Dettagli Fattura
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
                <div>
                  <label className='mb-1.5 block text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    Numero Fattura
                  </label>
                  <Input
                    {...register('invoiceNumber')}
                    placeholder='Auto-generato'
                  />
                </div>
                <div>
                  <label className='mb-1.5 block text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    Data Emissione
                  </label>
                  <Input type='date' {...register('issueDate')} />
                  {formErrors.issueDate && (
                    <p className='text-footnote text-[var(--status-error)] mt-1'>{formErrors.issueDate.message}</p>
                  )}
                </div>
                <div>
                  <label className='mb-1.5 block text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    Data Scadenza
                  </label>
                  <Input type='date' {...register('dueDate')} />
                </div>
                <div>
                  <label className='mb-1.5 block text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    Metodo Pagamento
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={e => setValue('paymentMethod', e.target.value)}
                    className='h-10 w-full rounded-md border border-[var(--border-default)] dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] px-3 text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue appearance-none cursor-pointer'
                  >
                    <option value='CASH'>Contanti</option>
                    <option value='BANK_TRANSFER'>Bonifico</option>
                    <option value='CARD'>Carta</option>
                    <option value='CHECK'>Assegno</option>
                    <option value='RIBA'>RiBa</option>
                    <option value='SCALAPAY'>Scalapay</option>
                  </select>
                </div>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Cliente */}
        <motion.div variants={cardVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Cliente
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              {loadingCustomers ? (
                <div className='flex items-center gap-2 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  <span className='text-body'>Caricamento clienti...</span>
                </div>
              ) : (
                <div className='space-y-2'>
                  <Input
                    placeholder='Cerca cliente per nome...'
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                  />
                  <select
                    value={customerId}
                    onChange={e => setValue('customerId', e.target.value, { shouldValidate: true })}
                    className='h-10 w-full rounded-md border border-[var(--border-default)] dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] px-3 text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue appearance-none cursor-pointer'
                  >
                    <option value=''>-- Seleziona un cliente --</option>
                    {filteredCustomers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.companyName || `${c.firstName} ${c.lastName}`}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.customerId && (
                    <p className='text-footnote text-[var(--status-error)]'>{fieldErrors.customerId}</p>
                  )}
                </div>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Righe Fattura */}
        <motion.div variants={cardVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader className='flex items-center justify-between'>
              <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Righe Fattura
              </h2>
              <div className='flex items-center gap-2'>
                {workOrderId && (
                  <span className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] flex items-center gap-1'>
                    <Package className='h-3 w-3' />
                    Da OdL #{workOrderId.slice(0, 8)}
                  </span>
                )}
                <AppleButton
                  variant='ghost'
                  size='sm'
                  icon={<Plus className='h-4 w-4' />}
                  onClick={addLineItem}
                >
                  Aggiungi Riga
                </AppleButton>
              </div>
            </AppleCardHeader>
            <AppleCardContent>
              <div className='space-y-3'>
                {lineItems.map((item) => (
                  <div
                    key={item.id}
                    className='grid grid-cols-12 gap-2 sm:gap-3 items-end p-3 sm:p-4 rounded-2xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)]'
                  >
                    <div className='col-span-12 sm:col-span-4'>
                      <label className='mb-1.5 block text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                        Descrizione
                      </label>
                      <Input
                        placeholder='es. Cambio olio motore'
                        value={item.description}
                        onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                      />
                    </div>
                    <div className='col-span-3 sm:col-span-2'>
                      <label className='mb-1.5 block text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                        Quantita
                      </label>
                      <Input
                        type='number'
                        min={1}
                        value={item.quantity}
                        onChange={e => updateLineItem(item.id, 'quantity', Number(e.target.value))}
                      />
                    </div>
                    <div className='col-span-3 sm:col-span-2'>
                      <label className='mb-1.5 block text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                        Prezzo Unitario
                      </label>
                      <Input
                        type='number'
                        min={0}
                        step={0.01}
                        value={item.unitPrice}
                        onChange={e => updateLineItem(item.id, 'unitPrice', Number(e.target.value))}
                      />
                    </div>
                    <div className='col-span-3 sm:col-span-2'>
                      <label className='mb-1.5 block text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                        IVA %
                      </label>
                      <select
                        value={item.vatRate}
                        onChange={e => updateLineItem(item.id, 'vatRate', Number(e.target.value))}
                        className='h-10 w-full rounded-md border border-[var(--border-default)] dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] px-2 text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none appearance-none cursor-pointer'
                      >
                        {VAT_RATES.map(r => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className='col-span-2 sm:col-span-1 text-right'>
                      <label className='mb-1.5 block text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                        Totale
                      </label>
                      <p className='h-10 flex items-center justify-end text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </p>
                    </div>
                    <div className='col-span-1 flex justify-center'>
                      <AppleButton
                        variant='ghost'
                        size='sm'
                        disabled={lineItems.length <= 1}
                        onClick={() => removeLineItem(item.id)}
                        aria-label='Rimuovi riga fattura'
                        className='text-[var(--status-error)] hover:opacity-80'
                      >
                        <Trash2 className='h-4 w-4' />
                      </AppleButton>
                    </div>
                  </div>
                ))}
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Totali + Note */}
        <motion.div variants={cardVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Riepilogo e Note
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div>
                  <label className='mb-1.5 block text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    Note / Condizioni
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={4}
                    placeholder='Note aggiuntive, condizioni di pagamento...'
                    className='w-full rounded-xl border border-[var(--border-default)] dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] px-4 py-3 text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] dark:placeholder:text-[var(--text-secondary)] outline-none focus:ring-2 focus:ring-apple-blue resize-none'
                  />
                </div>

                <div className='flex flex-col justify-end'>
                  <div className='p-6 rounded-2xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)] space-y-3'>
                    <div className='flex justify-between text-body'>
                      <span className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Subtotale</span>
                      <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                    {Object.entries(ivaBreakdown).map(([rate, amount]) => (
                      <div key={rate} className='flex justify-between text-body'>
                        <span className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>IVA {rate}%</span>
                        <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                          {formatCurrency(amount)}
                        </span>
                      </div>
                    ))}
                    {bolloAmount > 0 && (
                      <div className='flex justify-between text-body'>
                        <span className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Bollo</span>
                        <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                          {formatCurrency(bolloAmount)}
                        </span>
                      </div>
                    )}
                    <div className='border-t border-[var(--border-default)]/20 dark:border-[var(--border-default)] pt-3'>
                      <div className='flex justify-between'>
                        <span className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                          Totale
                        </span>
                        <span className='text-title-2 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                          {formatCurrency(total)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Actions */}
        <div className='flex items-center justify-between'>
          <AppleButton
            variant='ghost'
            icon={<ArrowLeft className='h-4 w-4' />}
            onClick={() => router.push('/dashboard/invoices')}
          >
            Annulla
          </AppleButton>
          <div className='flex gap-3'>
            <AppleButton
              variant='secondary'
              icon={<Save className='h-4 w-4' />}
              onClick={() => handleSubmit(true)}
              loading={submitting}
              disabled={submitting}
            >
              Salva come Bozza
            </AppleButton>
            <AppleButton
              icon={<Send className='h-4 w-4' />}
              onClick={() => handleSubmit(false)}
              loading={submitting}
              disabled={submitting}
            >
              Salva e Invia
            </AppleButton>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
