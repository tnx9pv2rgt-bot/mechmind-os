'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  AppleCard,
  AppleCardContent,
  AppleCardHeader,
} from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  Send,
  Save,
  Search,
  AlertCircle,
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
};

interface EstimateLine {
  localId: string;
  type: 'LABOR' | 'PART';
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

interface CustomerOption {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
}

interface VehicleOption {
  id: string;
  licensePlate: string;
  make: string;
  model: string;
}

let lineCounter = 0;
function newLineId(): string {
  lineCounter += 1;
  return `line-${Date.now()}-${lineCounter}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

const estimateFormSchema = z.object({
  customerId: z.string({ required_error: 'Seleziona un cliente' }).min(1, 'Seleziona un cliente'),
  vehicleId: z.string({ required_error: 'Seleziona un veicolo' }).min(1, 'Seleziona un veicolo'),
  validUntil: z.string().optional(),
  discount: z.number().min(0, 'Lo sconto non può essere negativo').default(0),
  discountType: z.enum(['EUR', 'PERCENT']).default('EUR'),
  notes: z.string().optional(),
});

type EstimateFormValues = z.infer<typeof estimateFormSchema>;

export default function NewEstimatePage() {
  const router = useRouter();

  const defaultValidUntil = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  })();

  const {
    register,
    setValue,
    watch,
    formState: { errors: formErrors, isSubmitting },
  } = useForm<EstimateFormValues>({
    resolver: zodResolver(estimateFormSchema),
    defaultValues: {
      customerId: '',
      vehicleId: '',
      validUntil: defaultValidUntil,
      discount: 0,
      discountType: 'EUR',
      notes: '',
    },
  });

  const customerId = watch('customerId');
  const vehicleId = watch('vehicleId');
  const discount = watch('discount');
  const discountType = watch('discountType');
  const notes = watch('notes') ?? '';

  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);

  const [lines, setLines] = useState<EstimateLine[]>([
    {
      localId: newLineId(),
      type: 'LABOR',
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 22,
    },
  ]);

  const [submitError, setSubmitError] = useState<string | null>(null);

  // Customer search
  const searchCustomers = useCallback(async (query: string) => {
    setCustomerSearch(query);
    if (query.length < 2) {
      setCustomerResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(query)}`);
      const json = await res.json();
      const list = json.data || json || [];
      setCustomerResults(Array.isArray(list) ? list.slice(0, 10) : []);
      setShowCustomerDropdown(true);
    } catch {
      setCustomerResults([]);
    }
  }, []);

  const selectCustomer = async (c: CustomerOption) => {
    setSelectedCustomer(c);
    setValue('customerId', c.id, { shouldValidate: true });
    setCustomerSearch(`${c.firstName} ${c.lastName}`);
    setShowCustomerDropdown(false);
    // load vehicles
    try {
      const res = await fetch(`/api/vehicles?customerId=${c.id}`);
      const json = await res.json();
      const list = json.data || json || [];
      setVehicles(Array.isArray(list) ? list : []);
    } catch {
      setVehicles([]);
    }
  };

  // Lines
  const addLine = () => {
    setLines(prev => [
      ...prev,
      {
        localId: newLineId(),
        type: 'LABOR',
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 22,
      },
    ]);
  };

  const updateLine = (id: string, field: keyof EstimateLine, value: string | number) => {
    setLines(prev => prev.map(l => (l.localId === id ? { ...l, [field]: value } : l)));
  };

  const removeLine = (id: string) => {
    setLines(prev => prev.filter(l => l.localId !== id));
  };

  // Calculations
  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const discountAmount = discountType === 'PERCENT' ? (subtotal * discount) / 100 : discount;
  const afterDiscount = Math.max(subtotal - discountAmount, 0);

  // Group IVA by rate
  const taxByRate: Record<number, number> = {};
  lines.forEach(l => {
    const lineTotal = l.quantity * l.unitPrice;
    const share = subtotal > 0 ? lineTotal / subtotal : 0;
    const lineAfterDiscount = afterDiscount * share;
    const tax = lineAfterDiscount * (l.taxRate / 100);
    taxByRate[l.taxRate] = (taxByRate[l.taxRate] || 0) + tax;
  });
  const totalTax = Object.values(taxByRate).reduce((s, v) => s + v, 0);
  const grandTotal = afterDiscount + totalTax;

  const handleSubmit = async (sendToClient: boolean) => {
    // Validate form fields
    const formResult = estimateFormSchema.safeParse({
      customerId,
      vehicleId,
      validUntil: watch('validUntil'),
      discount,
      discountType,
      notes,
    });

    // Validate lines separately
    const linesSchema = z.array(z.object({
      description: z.string().min(1, 'Descrizione obbligatoria'),
      quantity: z.number().gt(0, 'La quantità deve essere > 0'),
      unitPrice: z.number().min(0, 'Prezzo non valido'),
    })).min(1, 'Aggiungi almeno una riga');

    const linesResult = linesSchema.safeParse(
      lines.map(l => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice })),
    );

    if (!formResult.success || !linesResult.success) {
      const firstError = (!formResult.success ? formResult.error.issues[0]?.message : undefined)
        || (!linesResult.success ? linesResult.error.issues[0]?.message : undefined)
        || 'Correggi gli errori';
      setSubmitError(firstError);
      return;
    }
    setSubmitError(null);
    try {
      const validUntilValue = watch('validUntil');
      const body = {
        customerId,
        vehicleId,
        validUntil: validUntilValue,
        discount: discountAmount,
        notes,
        status: sendToClient ? 'SENT' : 'DRAFT',
        lines: lines.map((l, i) => ({
          type: l.type,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxRate: l.taxRate,
          position: i,
        })),
      };
      const res = await fetch('/api/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || 'Errore nella creazione del preventivo');
      }
      const json = await res.json();
      const created = json.data || json;
      toast.success('Preventivo creato con successo');
      router.push(`/dashboard/estimates/${created.id}`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Errore sconosciuto';
      setSubmitError(errMsg);
      toast.error(errMsg);
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
              { label: 'Preventivi', href: '/dashboard/estimates' },
              { label: 'Nuovo Preventivo' },
            ]}
          />
          <div className='flex items-center justify-between mt-2'>
            <div>
              <h1 className='text-headline text-apple-dark dark:text-[var(--text-primary)]'>Nuovo Preventivo</h1>
              <p className='text-body text-apple-gray dark:text-[var(--text-secondary)] mt-1'>
                Crea un nuovo preventivo per il cliente
              </p>
            </div>
            <AppleButton
              variant='ghost'
              icon={<ArrowLeft className='h-4 w-4' />}
              onClick={() => router.push('/dashboard/estimates')}
            >
              Torna ai Preventivi
            </AppleButton>
          </div>
        </div>
      </header>

      <motion.div
        className='p-8 max-w-5xl mx-auto space-y-6'
        initial='hidden'
        animate='visible'
        variants={containerVariants}
      >
        {/* Customer & Vehicle */}
        <motion.div className='grid grid-cols-1 md:grid-cols-2 gap-6' variants={cardVariants}>
          {/* Customer */}
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                Cliente
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-apple-gray' />
                <Input
                  placeholder='Cerca per nome, targa o telefono...'
                  aria-label='Cerca cliente'
                  value={customerSearch}
                  onChange={e => searchCustomers(e.target.value)}
                  onFocus={() => customerResults.length > 0 && setShowCustomerDropdown(true)}
                  className='pl-10'
                />
                {showCustomerDropdown && customerResults.length > 0 && (
                  <div className='absolute z-10 top-full mt-1 w-full bg-white dark:bg-[var(--surface-elevated)] rounded-2xl shadow-apple border border-apple-border/20 dark:border-[var(--border-default)] max-h-60 overflow-y-auto'>
                    {customerResults.map(c => (
                      <button
                        key={c.id}
                        className='w-full text-left px-4 py-3 hover:bg-apple-light-gray/50 dark:hover:bg-[var(--surface-active)] transition-colors text-body'
                        onClick={() => selectCustomer(c)}
                      >
                        <span className='font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                          {c.firstName} {c.lastName}
                        </span>
                        {c.phone && (
                          <span className='ml-2 text-apple-gray dark:text-[var(--text-secondary)]'>
                            {c.phone}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedCustomer && (
                <p className='mt-2 text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                  Selezionato: {selectedCustomer.firstName} {selectedCustomer.lastName}
                </p>
              )}
              {formErrors.customerId && (
                <p className='mt-1 text-footnote text-apple-red'>{formErrors.customerId.message}</p>
              )}
            </AppleCardContent>
          </AppleCard>

          {/* Vehicle */}
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                Veicolo
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              <select
                value={vehicleId}
                onChange={e => setValue('vehicleId', e.target.value, { shouldValidate: true })}
                className='w-full h-10 px-3 rounded-md border border-apple-border dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] text-body text-apple-dark dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue appearance-none cursor-pointer'
                disabled={vehicles.length === 0}
              >
                <option value=''>
                  {vehicles.length === 0 ? 'Seleziona prima un cliente' : 'Seleziona un veicolo...'}
                </option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.licensePlate} — {v.make} {v.model}
                  </option>
                ))}
              </select>

              <div className='mt-4'>
                <label className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1 block'>
                  Validità
                </label>
                <Input
                  type='date'
                  {...register('validUntil')}
                />
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Lines */}
        <motion.div variants={cardVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader className='flex items-center justify-between'>
              <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)] flex items-center gap-2'>
                <FileText className='h-5 w-5 text-apple-gray' />
                Righe Preventivo
              </h2>
              <AppleButton
                variant='ghost'
                size='sm'
                icon={<Plus className='h-4 w-4' />}
                onClick={addLine}
              >
                Aggiungi riga
              </AppleButton>
            </AppleCardHeader>
            <AppleCardContent>
              {/* Table Header */}
              <div className='hidden md:grid grid-cols-12 gap-2 pb-2 border-b border-apple-border/20 dark:border-[var(--border-default)] mb-3'>
                <div className='col-span-1 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]'>Tipo</div>
                <div className='col-span-4 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                  Descrizione
                </div>
                <div className='col-span-1 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)] text-right'>
                  Qta
                </div>
                <div className='col-span-2 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)] text-right'>
                  Prezzo
                </div>
                <div className='col-span-1 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)] text-right'>
                  IVA %
                </div>
                <div className='col-span-2 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)] text-right'>
                  Totale
                </div>
                <div className='col-span-1' />
              </div>

              {lines.length === 0 ? (
                <p className='text-center py-6 text-apple-gray dark:text-[var(--text-secondary)] text-body'>
                  Nessuna riga. Aggiungi almeno una riga.
                </p>
              ) : (
                <div className='space-y-2'>
                  {lines.map((line) => (
                    <div
                      key={line.localId}
                      className='grid grid-cols-12 gap-2 items-center p-2 rounded-2xl bg-apple-light-gray/30 dark:bg-[var(--surface-hover)]'
                    >
                      <div className='col-span-12 md:col-span-1'>
                        <select
                          value={line.type}
                          onChange={e => updateLine(line.localId, 'type', e.target.value)}
                          className='w-full h-9 px-2 rounded-md border border-apple-border dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] text-footnote text-apple-dark dark:text-[var(--text-primary)] focus:outline-none'
                        >
                          <option value='LABOR'>Lavoro</option>
                          <option value='PART'>Ricambio</option>
                        </select>
                      </div>
                      <div className='col-span-12 md:col-span-4'>
                        <Input
                          placeholder='Descrizione'
                          value={line.description}
                          onChange={e => updateLine(line.localId, 'description', e.target.value)}
                          className='h-9 text-body'
                        />
                      </div>
                      <div className='col-span-4 md:col-span-1'>
                        <Input
                          type='number'
                          value={line.quantity || ''}
                          onChange={e =>
                            updateLine(line.localId, 'quantity', Number(e.target.value))
                          }
                          className='h-9 text-body text-right'
                          min={1}
                        />
                      </div>
                      <div className='col-span-4 md:col-span-2'>
                        <Input
                          type='number'
                          placeholder='0.00'
                          value={line.unitPrice || ''}
                          onChange={e =>
                            updateLine(line.localId, 'unitPrice', Number(e.target.value))
                          }
                          className='h-9 text-body text-right'
                          min={0}
                          step={0.01}
                        />
                      </div>
                      <div className='col-span-2 md:col-span-1'>
                        <Input
                          type='number'
                          value={line.taxRate}
                          onChange={e =>
                            updateLine(line.localId, 'taxRate', Number(e.target.value))
                          }
                          className='h-9 text-body text-right'
                          min={0}
                          max={100}
                        />
                      </div>
                      <div className='col-span-6 md:col-span-2 flex items-center justify-end'>
                        <span className='text-body font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                          {formatCurrency(line.quantity * line.unitPrice)}
                        </span>
                      </div>
                      <div className='col-span-6 md:col-span-1 flex justify-end'>
                        <AppleButton
                          variant='ghost'
                          size='sm'
                          onClick={() => removeLine(line.localId)}
                          aria-label='Rimuovi riga'
                          className='text-apple-red hover:opacity-80'
                        >
                          <Trash2 className='h-4 w-4' />
                        </AppleButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Discount & Notes */}
        <motion.div className='grid grid-cols-1 md:grid-cols-2 gap-6' variants={cardVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                Sconto
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              <div className='flex gap-2'>
                <Input
                  type='number'
                  {...register('discount', { valueAsNumber: true })}
                  min={0}
                  step={0.01}
                  className='flex-1'
                />
                <select
                  {...register('discountType')}
                  className='h-10 px-3 rounded-md border border-apple-border dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] text-body text-apple-dark dark:text-[var(--text-primary)] focus:outline-none'
                >
                  <option value='EUR'>EUR</option>
                  <option value='PERCENT'>%</option>
                </select>
              </div>
              {formErrors.discount && (
                <p className='text-footnote text-apple-red mt-1'>{formErrors.discount.message}</p>
              )}
            </AppleCardContent>
          </AppleCard>

          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                Note
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              <textarea
                {...register('notes')}
                rows={3}
                placeholder='Note aggiuntive per il cliente...'
                className='w-full rounded-xl border border-apple-border dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] px-4 py-3 text-body text-apple-dark dark:text-[var(--text-primary)] placeholder:text-apple-gray dark:placeholder:text-[var(--text-secondary)] outline-none focus:ring-2 focus:ring-apple-blue resize-none'
              />
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Summary */}
        <motion.div variants={cardVariants}>
          <AppleCard hover={false}>
            <AppleCardContent>
              <div className='flex justify-end'>
                <div className='w-full max-w-xs space-y-2'>
                  <div className='flex justify-between text-body'>
                    <span className='text-apple-gray dark:text-[var(--text-secondary)]'>Subtotale</span>
                    <span className='font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <div className='flex justify-between text-body'>
                      <span className='text-apple-gray dark:text-[var(--text-secondary)]'>Sconto</span>
                      <span className='font-medium text-apple-red'>
                        -{formatCurrency(discountAmount)}
                      </span>
                    </div>
                  )}
                  {Object.entries(taxByRate).map(([rate, amount]) => (
                    <div key={rate} className='flex justify-between text-body'>
                      <span className='text-apple-gray dark:text-[var(--text-secondary)]'>IVA {rate}%</span>
                      <span className='font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  ))}
                  <div className='border-t border-apple-border/20 dark:border-[var(--border-default)] pt-2'>
                    <div className='flex justify-between'>
                      <span className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                        Totale
                      </span>
                      <span className='text-title-2 font-bold text-apple-dark dark:text-[var(--text-primary)]'>
                        {formatCurrency(grandTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Error */}
        {submitError && (
          <div className='flex items-center gap-2 p-3 rounded-2xl bg-apple-red/5 dark:bg-apple-red/10 border border-apple-red/20'>
            <AlertCircle className='h-4 w-4 text-apple-red flex-shrink-0' />
            <p className='text-footnote text-apple-red'>{submitError}</p>
          </div>
        )}

        {/* Actions */}
        <div className='flex gap-3 justify-end'>
          <AppleButton
            variant='secondary'
            icon={<Save className='h-4 w-4' />}
            loading={isSubmitting}
            disabled={isSubmitting}
            onClick={() => handleSubmit(false)}
          >
            Salva come bozza
          </AppleButton>
          <AppleButton
            icon={<Send className='h-4 w-4' />}
            loading={isSubmitting}
            disabled={isSubmitting}
            onClick={() => handleSubmit(true)}
          >
            Salva e invia al cliente
          </AppleButton>
        </div>
      </motion.div>
    </div>
  );
}
