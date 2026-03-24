'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Wrench,
  Loader2,
  Search,
  User,
  Car,
  Plus,
  Trash2,
  ClipboardList,
} from 'lucide-react';

/* ─── Schema ─── */
const lineItemSchema = z.object({
  description: z.string().min(1, 'Descrizione obbligatoria'),
  estimatedHours: z.coerce.number().min(0, 'Valore non valido').optional(),
  estimatedCost: z.coerce.number().min(0, 'Valore non valido').optional(),
});

const schema = z.object({
  customerId: z.string().min(1, 'Seleziona un cliente'),
  vehicleId: z.string().min(1, 'Seleziona un veicolo'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
  technicianId: z.string().optional(),
  estimatedHours: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema),
});

type FormValues = z.infer<typeof schema>;

interface CustomerOption {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  companyName?: string;
}

interface VehicleOption {
  id: string;
  make: string;
  model: string;
  licensePlate?: string;
  plate?: string;
  year?: number;
}

interface TechnicianOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface CannedJob {
  id: string;
  name: string;
  description?: string;
  estimatedHours?: number;
  estimatedCost?: number;
}

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Bassa' },
  { value: 'NORMAL', label: 'Normale' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
] as const;

export default function NewWorkOrderPage(): React.ReactElement {
  const router = useRouter();

  // Customer search
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerOption[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);

  // Vehicle list (loaded when customer changes)
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);

  // Technicians
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [techniciansLoading, setTechniciansLoading] = useState(true);

  // Canned jobs
  const [cannedJobs, setCannedJobs] = useState<CannedJob[]>([]);
  const [cannedJobsDialogOpen, setCannedJobsDialogOpen] = useState(false);
  const [cannedJobsLoading, setCannedJobsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: '',
      vehicleId: '',
      description: '',
      priority: 'NORMAL',
      technicianId: '',
      estimatedHours: undefined,
      notes: '',
      lineItems: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });
  const customerId = watch('customerId');

  /* ─── Customer Search ─── */
  const searchCustomers = useCallback(async (query: string): Promise<void> => {
    if (query.length < 2) {
      setCustomerResults([]);
      return;
    }
    setCustomerSearchLoading(true);
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Errore');
      const json = await res.json();
      const data = json.data ?? json ?? [];
      setCustomerResults(Array.isArray(data) ? data : []);
    } catch {
      setCustomerResults([]);
    } finally {
      setCustomerSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchCustomers(customerSearch), 300);
    return () => clearTimeout(timer);
  }, [customerSearch, searchCustomers]);

  const selectCustomer = (c: CustomerOption): void => {
    setSelectedCustomer(c);
    setValue('customerId', c.id, { shouldValidate: true });
    setCustomerSearch([c.firstName, c.lastName].filter(Boolean).join(' ') || c.companyName || '');
    setShowCustomerDropdown(false);
    setValue('vehicleId', '');
  };

  /* ─── Load Vehicles ─── */
  useEffect(() => {
    if (!customerId) {
      setVehicles([]);
      return;
    }
    async function loadVehicles(): Promise<void> {
      setVehiclesLoading(true);
      try {
        const res = await fetch(`/api/vehicles?customerId=${customerId}`);
        if (!res.ok) throw new Error('Errore');
        const json = await res.json();
        setVehicles(json.data ?? json ?? []);
      } catch {
        setVehicles([]);
      } finally {
        setVehiclesLoading(false);
      }
    }
    loadVehicles();
  }, [customerId]);

  /* ─── Load Technicians ─── */
  useEffect(() => {
    async function loadTechnicians(): Promise<void> {
      try {
        const res = await fetch('/api/technicians');
        if (!res.ok) throw new Error('Errore');
        const json = await res.json();
        setTechnicians(json.data ?? json ?? []);
      } catch {
        setTechnicians([]);
      } finally {
        setTechniciansLoading(false);
      }
    }
    loadTechnicians();
  }, []);

  /* ─── Load Canned Jobs ─── */
  const openCannedJobsDialog = async (): Promise<void> => {
    setCannedJobsDialogOpen(true);
    if (cannedJobs.length === 0) {
      setCannedJobsLoading(true);
      try {
        const res = await fetch('/api/canned-jobs');
        if (!res.ok) throw new Error('Errore');
        const json = await res.json();
        setCannedJobs(json.data ?? json ?? []);
      } catch {
        setCannedJobs([]);
      } finally {
        setCannedJobsLoading(false);
      }
    }
  };

  const addCannedJob = (job: CannedJob): void => {
    append({
      description: job.name + (job.description ? ` - ${job.description}` : ''),
      estimatedHours: job.estimatedHours || 0,
      estimatedCost: job.estimatedCost || 0,
    });
    toast.success(`Lavoro standard "${job.name}" aggiunto`);
  };

  /* ─── Submit ─── */
  const onSubmit = async (data: FormValues): Promise<void> => {
    try {
      const res = await fetch('/api/dashboard/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: data.customerId,
          vehicleId: data.vehicleId,
          diagnosis: data.description || undefined,
          priority: data.priority,
          technicianId: data.technicianId || undefined,
          estimatedHours: data.estimatedHours || undefined,
          notes: data.notes || undefined,
          lineItems: data.lineItems.length > 0 ? data.lineItems : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || 'Errore creazione ordine di lavoro');
      }
      const newId = json.data?.id || json.id;
      toast.success('Ordine di lavoro creato con successo');
      router.push(`/dashboard/work-orders/${newId || ''}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante il salvataggio');
    }
  };

  const inputClass = 'h-[52px] rounded-full border border-[#4e4e4e] bg-[#2f2f2f] text-sm text-white placeholder:text-[#888] outline-none px-4';
  const selectClass = `h-[52px] rounded-full border border-[#4e4e4e] bg-[#2f2f2f] text-sm text-white outline-none px-4 appearance-none cursor-pointer`;
  const textareaClass = `w-full rounded-2xl border border-[#4e4e4e] bg-[#2f2f2f] text-sm text-white placeholder-[#888] outline-none px-5 py-3 resize-none`;

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <header className="bg-[#1a1a1a] border-b border-[#4e4e4e]">
        <div className="px-4 sm:px-8 py-5">
          <Breadcrumb items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'OdL', href: '/dashboard/work-orders' },
            { label: 'Nuovo Ordine' },
          ]} />
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-xl bg-[#2f2f2f] flex items-center justify-center">
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Nuovo Ordine di Lavoro</h1>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-8 max-w-3xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* Customer */}
          <div className="rounded-2xl border border-[#4e4e4e] bg-[#2f2f2f] shadow-[0_0_60px_rgba(0,0,0,0.5)] p-6">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-[#888]" />
              Cliente *
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#888]" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerDropdown(true);
                  if (selectedCustomer) {
                    setSelectedCustomer(null);
                    setValue('customerId', '', { shouldValidate: true });
                  }
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="Cerca per nome o email..."
                className={`w-full ${inputClass} pl-10`}
                autoComplete="off"
              />
              {customerSearchLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[#888]" />
              )}
              {showCustomerDropdown && customerResults.length > 0 && !selectedCustomer && (
                <div className="absolute z-50 w-full mt-1 bg-[#2f2f2f] border border-[#4e4e4e] rounded-2xl shadow-lg max-h-48 overflow-y-auto">
                  {customerResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectCustomer(c)}
                      className="w-full text-left px-4 py-3 hover:bg-[#383838] transition-colors min-h-[44px]"
                    >
                      <p className="text-sm font-medium text-white">
                        {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.companyName || 'Cliente'}
                      </p>
                      {c.email && <p className="text-xs text-[#888]">{c.email}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedCustomer && (
              <p className="text-xs text-green-400 mt-2">
                Cliente: {[selectedCustomer.firstName, selectedCustomer.lastName].filter(Boolean).join(' ')}
              </p>
            )}
            {errors.customerId && <p className="text-xs text-red-500 mt-1">{errors.customerId.message}</p>}
          </div>

          {/* Vehicle */}
          <div className="rounded-2xl border border-[#4e4e4e] bg-[#2f2f2f] shadow-[0_0_60px_rgba(0,0,0,0.5)] p-6">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <Car className="h-4 w-4 text-[#888]" />
              Veicolo *
            </h2>
            <select
              value={watch('vehicleId')}
              onChange={(e) => setValue('vehicleId', e.target.value, { shouldValidate: true })}
              disabled={!customerId || vehiclesLoading}
              className={`w-full ${selectClass}`}
            >
              <option value="">
                {!customerId ? 'Seleziona prima un cliente' : vehiclesLoading ? 'Caricamento...' : 'Seleziona un veicolo'}
              </option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.make} {v.model} — {v.licensePlate || v.plate} {v.year ? `(${v.year})` : ''}
                </option>
              ))}
            </select>
            {errors.vehicleId && <p className="text-xs text-red-500 mt-1">{errors.vehicleId.message}</p>}
          </div>

          {/* Details */}
          <div className="rounded-2xl border border-[#4e4e4e] bg-[#2f2f2f] shadow-[0_0_60px_rgba(0,0,0,0.5)] p-6 space-y-4">
            <h2 className="text-base font-semibold text-white mb-2">Dettagli</h2>

            <div>
              <Label htmlFor="description" className="text-sm font-medium text-white">Descrizione / Diagnosi</Label>
              <textarea
                id="description"
                {...register('description')}
                rows={3}
                placeholder="Descrivi il problema o la lavorazione richiesta..."
                className={textareaClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-white">Priorità</Label>
                <div className="flex gap-2 mt-2">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center">
                      <input
                        type="radio"
                        value={opt.value}
                        {...register('priority')}
                        className="sr-only peer"
                      />
                      <span className={`px-3 py-2 rounded-full text-xs font-medium border cursor-pointer transition-colors min-h-[36px] flex items-center peer-checked:border-[#ececec] peer-checked:bg-[#383838] peer-checked:text-white border-[#4e4e4e] text-[#888] hover:bg-white/5`}>
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="estimatedHours" className="text-sm font-medium text-white">Ore stimate</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  step="0.5"
                  {...register('estimatedHours')}
                  placeholder="es. 4"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="technicianId" className="text-sm font-medium text-white">Tecnico assegnato</Label>
              <select
                id="technicianId"
                {...register('technicianId')}
                disabled={techniciansLoading}
                className={`w-full ${selectClass}`}
              >
                <option value="">{techniciansLoading ? 'Caricamento...' : 'Nessun tecnico assegnato'}</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="notes" className="text-sm font-medium text-white">Note</Label>
              <textarea
                id="notes"
                {...register('notes')}
                rows={2}
                placeholder="Note aggiuntive..."
                className={textareaClass}
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="rounded-2xl border border-[#4e4e4e] bg-[#2f2f2f] shadow-[0_0_60px_rgba(0,0,0,0.5)] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Lavorazioni</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openCannedJobsDialog}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/5 rounded-full transition-colors border border-[#4e4e4e] min-h-[32px]"
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  Lavori Standard
                </button>
                <button
                  type="button"
                  onClick={() => append({ description: '', estimatedHours: 0, estimatedCost: 0 })}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/5 rounded-full transition-colors min-h-[32px]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Aggiungi
                </button>
              </div>
            </div>

            {fields.length === 0 ? (
              <p className="text-sm text-[#888] text-center py-6">
                Nessuna lavorazione aggiunta. Usa &ldquo;Lavori Standard&rdquo; o &ldquo;Aggiungi&rdquo; per inserire voci.
              </p>
            ) : (
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 rounded-2xl bg-[#1a1a1a] border border-[#4e4e4e]">
                    <Input
                      {...register(`lineItems.${index}.description`)}
                      placeholder="Descrizione lavorazione"
                      className="flex-1 h-9 text-sm"
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.5"
                        {...register(`lineItems.${index}.estimatedHours`)}
                        placeholder="Ore"
                        className="w-20 h-9 text-sm text-center"
                      />
                      <Input
                        type="number"
                        {...register(`lineItems.${index}.estimatedCost`)}
                        placeholder="EUR"
                        className="w-24 h-9 text-sm text-center"
                      />
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="p-1.5 rounded-full hover:bg-white/5 text-[#888] hover:text-red-400 transition-colors"
                        aria-label="Rimuovi lavorazione"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <Button
              type="button"
              onClick={() => router.push('/dashboard/work-orders')}
              className="rounded-full h-[52px] border border-[#4e4e4e] bg-transparent text-white hover:bg-white/5 min-h-[44px]"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full h-[52px] bg-white text-[#0d0d0d] hover:bg-[#e5e5e5] min-h-[44px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creazione...
                </>
              ) : (
                'Crea OdL'
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Canned Jobs Dialog */}
      <Dialog open={cannedJobsDialogOpen} onOpenChange={setCannedJobsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Lavori Standard</DialogTitle>
            <DialogDescription>
              Seleziona un lavoro standard per aggiungerlo all&apos;ordine di lavoro.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2 mt-2">
            {cannedJobsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#888]" />
              </div>
            ) : cannedJobs.length === 0 ? (
              <p className="text-sm text-[#888] text-center py-8">
                Nessun lavoro standard configurato.
              </p>
            ) : (
              cannedJobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => addCannedJob(job)}
                  className="w-full text-left p-3 rounded-2xl border border-[#4e4e4e] hover:bg-[#383838] transition-colors"
                >
                  <p className="text-sm font-medium text-white">{job.name}</p>
                  {job.description && (
                    <p className="text-xs text-[#888] mt-0.5">{job.description}</p>
                  )}
                  <div className="flex gap-3 mt-1">
                    {job.estimatedHours != null && (
                      <span className="text-xs text-[#888]">{job.estimatedHours} ore</span>
                    )}
                    {job.estimatedCost != null && (
                      <span className="text-xs text-[#888]">{job.estimatedCost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
