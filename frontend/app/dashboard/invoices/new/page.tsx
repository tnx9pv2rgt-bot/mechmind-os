'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AppleCard,
  AppleCardContent,
  AppleCardHeader,
  AppleCardFooter,
} from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

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

  const handleSubmit = async () => {
    setError('');

    if (!customerId) {
      setError('Seleziona un cliente');
      return;
    }
    if (lineItems.some(item => !item.description.trim())) {
      setError('Compila la descrizione di tutte le righe');
      return;
    }
    if (lineItems.some(item => item.quantity <= 0 || item.unitPrice <= 0)) {
      setError('Quantita e prezzo devono essere maggiori di zero');
      return;
    }

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
    <div>
      {/* Header */}
      <header className='bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-b border-apple-border/20 dark:border-[#424242]/50'>
        <div className='px-8 py-5 flex items-center gap-4'>
          <AppleButton
            variant='ghost'
            size='sm'
            icon={<ArrowLeft className='h-4 w-4' />}
            onClick={() => router.push('/dashboard/invoices')}
          >
            Indietro
          </AppleButton>
          <div>
            <h1 className='text-headline text-apple-dark dark:text-[#ececec]'>Nuova Fattura</h1>
            <p className='text-apple-gray dark:text-[#636366] text-body mt-1'>
              Compila i dettagli della fattura
            </p>
          </div>
        </div>
      </header>

      <motion.div
        className='p-8 max-w-4xl mx-auto space-y-6'
        initial='hidden'
        animate='visible'
        variants={containerVariants}
      >
        {/* Error Banner */}
        {error && (
          <motion.div
            variants={itemVariants}
            className='flex items-center gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          >
            <AlertCircle className='h-5 w-5 text-red-500 flex-shrink-0' />
            <p className='text-sm text-red-700 dark:text-red-300'>{error}</p>
          </motion.div>
        )}

        {/* Customer */}
        <motion.div variants={itemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
                Cliente
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              <Label className='mb-2 block text-sm font-medium text-gray-900 dark:text-gray-100'>
                Seleziona cliente
              </Label>
              {loadingCustomers ? (
                <div className='flex items-center gap-2 text-apple-gray'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  <span className='text-sm'>Caricamento clienti...</span>
                </div>
              ) : (
                <select
                  value={customerId}
                  onChange={e => setCustomerId(e.target.value)}
                  className='h-10 w-full rounded-md border border-gray-300 dark:border-[#424242] bg-white dark:bg-[#2f2f2f] px-3 text-sm text-gray-900 dark:text-[#ececec] focus:outline-none focus:ring-2 focus:ring-brand-500'
                >
                  <option value=''>-- Seleziona un cliente --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.companyName || `${c.firstName} ${c.lastName}`}
                    </option>
                  ))}
                </select>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Line Items */}
        <motion.div variants={itemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <div className='flex items-center justify-between'>
                <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
                  Righe Fattura
                </h2>
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
            <AppleCardContent className='space-y-4'>
              {lineItems.map((item, idx) => (
                <motion.div
                  key={item.id}
                  className='grid grid-cols-12 gap-3 items-end p-4 rounded-2xl bg-apple-light-gray/30 dark:bg-[#353535]'
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className='col-span-5'>
                    <Label className='mb-1.5 block text-xs text-apple-gray dark:text-[#636366]'>
                      Descrizione
                    </Label>
                    <Input
                      placeholder='es. Cambio olio motore'
                      value={item.description}
                      onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                    />
                  </div>
                  <div className='col-span-2'>
                    <Label className='mb-1.5 block text-xs text-apple-gray dark:text-[#636366]'>
                      Quantita
                    </Label>
                    <Input
                      type='number'
                      min={1}
                      value={item.quantity}
                      onChange={e => updateLineItem(item.id, 'quantity', Number(e.target.value))}
                    />
                  </div>
                  <div className='col-span-2'>
                    <Label className='mb-1.5 block text-xs text-apple-gray dark:text-[#636366]'>
                      Prezzo Unitario
                    </Label>
                    <Input
                      type='number'
                      min={0}
                      step={0.01}
                      value={item.unitPrice}
                      onChange={e => updateLineItem(item.id, 'unitPrice', Number(e.target.value))}
                    />
                  </div>
                  <div className='col-span-2 text-right'>
                    <Label className='mb-1.5 block text-xs text-apple-gray dark:text-[#636366]'>
                      Totale Riga
                    </Label>
                    <p className='h-10 flex items-center justify-end text-sm font-semibold text-apple-dark dark:text-[#ececec]'>
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </p>
                  </div>
                  <div className='col-span-1 flex justify-center'>
                    <AppleButton
                      variant='ghost'
                      size='sm'
                      disabled={lineItems.length <= 1}
                      onClick={() => removeLineItem(item.id)}
                      className='text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                    >
                      <Trash2 className='h-4 w-4' />
                    </AppleButton>
                  </div>
                </motion.div>
              ))}
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Tax, Due Date, Notes + Totals */}
        <motion.div variants={itemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
                Dettagli e Totali
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='space-y-4'>
                  <div>
                    <Label className='mb-1.5 block text-sm font-medium text-gray-900 dark:text-gray-100'>
                      Aliquota IVA (%)
                    </Label>
                    <Input
                      type='number'
                      min={0}
                      max={100}
                      value={taxRate}
                      onChange={e => setTaxRate(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label className='mb-1.5 block text-sm font-medium text-gray-900 dark:text-gray-100'>
                      Data Scadenza
                    </Label>
                    <Input type='date' value={dueDate} onChange={e => setDueDate(e.target.value)} />
                  </div>
                  <div>
                    <Label className='mb-1.5 block text-sm font-medium text-gray-900 dark:text-gray-100'>
                      Note
                    </Label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={3}
                      placeholder='Note aggiuntive per il cliente...'
                      className='w-full rounded-md border border-gray-300 dark:border-[#424242] bg-white dark:bg-[#2f2f2f] px-3 py-2 text-sm text-gray-900 dark:text-[#ececec] placeholder:text-gray-400 dark:placeholder:text-[#6e6e6e] focus:outline-none focus:ring-2 focus:ring-brand-500'
                    />
                  </div>
                </div>

                <div className='flex flex-col justify-end'>
                  <div className='p-6 rounded-2xl bg-apple-light-gray/30 dark:bg-[#353535] space-y-3'>
                    <div className='flex justify-between text-sm'>
                      <span className='text-apple-gray dark:text-[#636366]'>Subtotale</span>
                      <span className='font-medium text-apple-dark dark:text-[#ececec]'>
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                    <div className='flex justify-between text-sm'>
                      <span className='text-apple-gray dark:text-[#636366]'>IVA ({taxRate}%)</span>
                      <span className='font-medium text-apple-dark dark:text-[#ececec]'>
                        {formatCurrency(taxAmount)}
                      </span>
                    </div>
                    <div className='border-t border-apple-border/30 dark:border-[#424242] pt-3'>
                      <div className='flex justify-between'>
                        <span className='text-base font-semibold text-apple-dark dark:text-[#ececec]'>
                          Totale
                        </span>
                        <span className='text-base font-bold text-apple-dark dark:text-[#ececec]'>
                          {formatCurrency(total)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AppleCardContent>
            <AppleCardFooter>
              <div className='flex justify-end gap-3'>
                <AppleButton variant='secondary' onClick={() => router.push('/dashboard/invoices')}>
                  Annulla
                </AppleButton>
                <AppleButton loading={isSubmitting} onClick={handleSubmit}>
                  Crea Fattura
                </AppleButton>
              </div>
            </AppleCardFooter>
          </AppleCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
