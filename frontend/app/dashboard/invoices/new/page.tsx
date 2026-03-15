'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Plus, Trash2, Loader2, AlertCircle, FileText } from 'lucide-react';

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
}

const invoiceSchema = z.object({
  customerId: z.string().min(1, 'Seleziona un cliente'),
  items: z
    .array(
      z.object({
        description: z.string().min(1, 'Descrizione obbligatoria'),
        quantity: z.number().gt(0, 'La quantita deve essere maggiore di 0'),
        unitPrice: z.number().min(0, 'Il prezzo non puo essere negativo'),
      })
    )
    .min(1, 'Aggiungi almeno una riga'),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
});

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
}

function createEmptyLine(): LineItem {
  return {
    id: crypto.randomUUID(),
    description: '',
    quantity: 1,
    unitPrice: 0,
  };
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([createEmptyLine()]);
  const [taxRate, setTaxRate] = useState(22);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  useEffect(() => {
    fetch('/api/customers')
      .then(r => r.json())
      .then(res => {
        const list = res.data || res || [];
        setCustomers(Array.isArray(list) ? list : []);
      })
      .catch(() => setCustomers([]))
      .finally(() => setLoadingCustomers(false));
  }, []);

  const subtotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [lineItems]
  );
  const taxAmount = useMemo(() => subtotal * (taxRate / 100), [subtotal, taxRate]);
  const total = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount]);

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(prev => prev.map(item => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const addLineItem = () => {
    setLineItems(prev => [...prev, createEmptyLine()]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length <= 1) return;
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    setError('');

    const result = invoiceSchema.safeParse({
      customerId,
      items: lineItems.map(i => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      notes: notes || undefined,
      dueDate: dueDate || undefined,
    });

    if (!result.success) {
      const flat = result.error.flatten();
      const errs: Record<string, string> = {};
      for (const [key, msgs] of Object.entries(flat.fieldErrors)) {
        if (msgs && msgs.length > 0) errs[key] = msgs[0];
      }
      // Check nested item errors
      result.error.issues.forEach(issue => {
        if (issue.path[0] === 'items' && typeof issue.path[1] === 'number') {
          const idx = issue.path[1];
          const field = issue.path[2] as string;
          errs[`items.${idx}.${field}`] = issue.message;
        }
      });
      setFieldErrors(errs);
      if (errs.customerId) setError(errs.customerId);
      else if (errs.items) setError(errs.items);
      else setError('Correggi gli errori nei campi evidenziati');
      return;
    }
    setFieldErrors({});

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          items: lineItems.map(({ description, quantity, unitPrice }) => ({
            description,
            qty: quantity,
            price: unitPrice,
          })),
          taxRate,
          dueDate: dueDate || undefined,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Errore nella creazione della fattura');
      }

      const data = await res.json();
      const newId = data.data?.id || data.id;
      router.push(`/dashboard/invoices/${newId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nella creazione della fattura');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='fixed inset-0 bg-white dark:bg-[#212121] flex items-center justify-center p-4 overflow-hidden'>
      <div className='relative w-[min(900px,95vw)] h-[min(900px,95vh)]'>
        <motion.div
          className='relative z-10 w-full h-full bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple rounded-[40px] shadow-2xl border border-apple-border/20 dark:border-[#424242]/50 overflow-hidden flex flex-col'
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className='px-10 pt-8 pb-4'>
            <div className='flex items-center justify-between mb-4'>
              <div>
                <h1 className='text-3xl font-semibold text-gray-900 dark:text-[#ececec] tracking-tight'>
                  Nuova Fattura
                </h1>
                <p className='text-gray-500 dark:text-[#636366] mt-1'>
                  Compila i dettagli della fattura
                </p>
              </div>
              <div className='w-12 h-12 rounded-full bg-black dark:bg-[#ececec] flex items-center justify-center'>
                <FileText className='w-6 h-6 text-white dark:text-[#212121]' />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className='flex-1 px-10 pb-24 overflow-y-auto space-y-6'>
            {/* Error */}
            {error && (
              <div className='flex items-center gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'>
                <AlertCircle className='h-5 w-5 text-red-500 flex-shrink-0' />
                <p className='text-sm text-red-700 dark:text-red-300'>{error}</p>
              </div>
            )}

            {/* Cliente */}
            <div className='bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-[#424242]'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-[#ececec] mb-4'>
                Cliente
              </h3>
              <Label
                htmlFor='customer-id'
                className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300'
              >
                Seleziona cliente
              </Label>
              {loadingCustomers ? (
                <div className='flex items-center gap-2 text-gray-500'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  <span className='text-sm'>Caricamento clienti...</span>
                </div>
              ) : (
                <select
                  id='customer-id'
                  value={customerId}
                  onChange={e => setCustomerId(e.target.value)}
                  autoComplete='off'
                  className='h-12 w-full rounded-xl border border-gray-200 dark:border-[#424242] bg-white dark:bg-[#353535] px-4 text-sm text-gray-900 dark:text-[#ececec] focus:outline-none focus:ring-2 focus:ring-black/20'
                >
                  <option value=''>-- Seleziona un cliente --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.companyName || `${c.firstName} ${c.lastName}`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Righe Fattura */}
            <div className='bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-[#424242]'>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-[#ececec]'>
                  Righe Fattura
                </h3>
                <button
                  type='button'
                  onClick={addLineItem}
                  className='flex items-center gap-1 text-sm font-medium text-black dark:text-[#ececec] hover:opacity-70 transition-opacity'
                >
                  <Plus className='h-4 w-4' />
                  Aggiungi Riga
                </button>
              </div>
              <div className='space-y-3'>
                {lineItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className='grid grid-cols-12 gap-3 items-end p-4 rounded-2xl bg-gray-50/80 dark:bg-[#353535]'
                  >
                    <div className='col-span-5'>
                      <Label
                        htmlFor={`description-${item.id}`}
                        className='mb-1.5 block text-xs text-gray-500 dark:text-[#636366]'
                      >
                        Descrizione
                      </Label>
                      <Input
                        id={`description-${item.id}`}
                        placeholder='es. Cambio olio motore'
                        value={item.description}
                        onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                        className='rounded-xl'
                      />
                      {fieldErrors[`items.${idx}.description`] && (
                        <p className='text-xs text-red-500 mt-1'>
                          {fieldErrors[`items.${idx}.description`]}
                        </p>
                      )}
                    </div>
                    <div className='col-span-2'>
                      <Label
                        htmlFor={`quantity-${item.id}`}
                        className='mb-1.5 block text-xs text-gray-500 dark:text-[#636366]'
                      >
                        Quantita
                      </Label>
                      <Input
                        id={`quantity-${item.id}`}
                        type='number'
                        min={1}
                        value={item.quantity}
                        onChange={e => updateLineItem(item.id, 'quantity', Number(e.target.value))}
                        autoComplete='off'
                        className='rounded-xl'
                      />
                      {fieldErrors[`items.${idx}.quantity`] && (
                        <p className='text-xs text-red-500 mt-1'>
                          {fieldErrors[`items.${idx}.quantity`]}
                        </p>
                      )}
                    </div>
                    <div className='col-span-2'>
                      <Label
                        htmlFor={`unit-price-${item.id}`}
                        className='mb-1.5 block text-xs text-gray-500 dark:text-[#636366]'
                      >
                        Prezzo Unitario
                      </Label>
                      <Input
                        id={`unit-price-${item.id}`}
                        type='number'
                        min={0}
                        step={0.01}
                        value={item.unitPrice}
                        onChange={e => updateLineItem(item.id, 'unitPrice', Number(e.target.value))}
                        autoComplete='off'
                        className='rounded-xl'
                      />
                      {fieldErrors[`items.${idx}.unitPrice`] && (
                        <p className='text-xs text-red-500 mt-1'>
                          {fieldErrors[`items.${idx}.unitPrice`]}
                        </p>
                      )}
                    </div>
                    <div className='col-span-2 text-right'>
                      <Label className='mb-1.5 block text-xs text-gray-500 dark:text-[#636366]'>
                        Totale Riga
                      </Label>
                      <p className='h-10 flex items-center justify-end text-sm font-semibold text-gray-900 dark:text-[#ececec]'>
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </p>
                    </div>
                    <div className='col-span-1 flex justify-center'>
                      <button
                        type='button'
                        disabled={lineItems.length <= 1}
                        onClick={() => removeLineItem(item.id)}
                        className='p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 transition-colors'
                      >
                        <Trash2 className='h-4 w-4' />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dettagli e Totali */}
            <div className='bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-[#424242]'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-[#ececec] mb-4'>
                Dettagli e Totali
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='space-y-4'>
                  <div>
                    <Label
                      htmlFor='tax-rate'
                      className='mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300'
                    >
                      Aliquota IVA (%)
                    </Label>
                    <Input
                      id='tax-rate'
                      type='number'
                      min={0}
                      max={100}
                      value={taxRate}
                      onChange={e => setTaxRate(Number(e.target.value))}
                      autoComplete='off'
                      className='rounded-xl'
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor='due-date'
                      className='mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300'
                    >
                      Data Scadenza
                    </Label>
                    <Input
                      id='due-date'
                      type='date'
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      className='rounded-xl'
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor='notes'
                      className='mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300'
                    >
                      Note
                    </Label>
                    <textarea
                      id='notes'
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={3}
                      placeholder='Note aggiuntive per il cliente...'
                      className='w-full rounded-xl border border-gray-200 dark:border-[#424242] bg-white dark:bg-[#353535] px-4 py-3 text-sm text-gray-900 dark:text-[#ececec] placeholder:text-gray-400 dark:placeholder:text-[#6e6e6e] focus:outline-none focus:ring-2 focus:ring-black/20'
                    />
                  </div>
                </div>

                <div className='flex flex-col justify-end'>
                  <div className='p-6 rounded-2xl bg-gray-50/80 dark:bg-[#353535] space-y-3'>
                    <div className='flex justify-between text-sm'>
                      <span className='text-gray-500 dark:text-[#636366]'>Subtotale</span>
                      <span className='font-medium text-gray-900 dark:text-[#ececec]'>
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                    <div className='flex justify-between text-sm'>
                      <span className='text-gray-500 dark:text-[#636366]'>IVA ({taxRate}%)</span>
                      <span className='font-medium text-gray-900 dark:text-[#ececec]'>
                        {formatCurrency(taxAmount)}
                      </span>
                    </div>
                    <div className='border-t border-gray-200 dark:border-[#424242] pt-3'>
                      <div className='flex justify-between'>
                        <span className='text-base font-semibold text-gray-900 dark:text-[#ececec]'>
                          Totale
                        </span>
                        <span className='text-base font-bold text-gray-900 dark:text-[#ececec]'>
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
          <div className='absolute bottom-0 left-0 right-0 px-10 py-6 bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-t border-apple-border/20 dark:border-[#424242]/50 z-50'>
            <div className='flex items-center justify-between'>
              <Button
                type='button'
                onClick={() => router.push('/dashboard/invoices')}
                className='rounded-full px-6 h-12 border-2 border-black dark:border-[#424242] bg-white dark:bg-[#2f2f2f] text-black dark:text-[#ececec] hover:bg-gray-100 dark:hover:bg-[#424242] transition-all'
              >
                <ChevronLeft className='w-5 h-5 mr-2' />
                Annulla
              </Button>
              <Button
                type='button'
                onClick={handleSubmit}
                disabled={isSubmitting}
                className='rounded-full px-8 h-12 bg-apple-green hover:bg-green-600 text-white shadow-lg hover:shadow-xl transition-all border-0'
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className='w-5 h-5 mr-2 animate-spin' />
                    Creazione...
                  </>
                ) : (
                  'Crea Fattura'
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
