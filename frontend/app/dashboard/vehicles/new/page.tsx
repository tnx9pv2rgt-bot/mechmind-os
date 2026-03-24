'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Car, Loader2, Search, User } from 'lucide-react';

/* ─── Schema ─── */
function validateItalianPlate(plate: string): boolean {
  if (!plate) return false;
  const cleaned = plate.toUpperCase().replace(/\s/g, '');
  const currentFormat = /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/;
  const oldFormat = /^([A-Z]{2}[0-9]{6}|[0-9]{6}[A-Z]{2}|[A-Z]{2}[0-9]{4}[A-Z]{2})$/;
  return currentFormat.test(cleaned) || oldFormat.test(cleaned);
}

const schema = z.object({
  targa: z.string().min(1, 'La targa è obbligatoria').refine(validateItalianPlate, 'Formato targa non valido (es. AB123CD)'),
  marca: z.string().min(1, 'La marca è obbligatoria'),
  modello: z.string().min(1, 'Il modello è obbligatorio'),
  anno: z.coerce.number().min(1900, 'Anno non valido').max(2030, 'Anno non valido'),
  vin: z.string().optional(),
  colore: z.string().optional(),
  carburante: z.string().min(1, 'Seleziona un tipo di carburante'),
  km: z.coerce.number().min(0, 'I km non possono essere negativi').optional(),
  customerId: z.string().min(1, 'Seleziona un proprietario'),
});

type FormValues = z.infer<typeof schema>;

const FUEL_OPTIONS = ['Benzina', 'Diesel', 'GPL', 'Metano', 'Ibrido', 'Elettrico'] as const;

interface CustomerOption {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export default function NewVehiclePage(): React.ReactElement {
  const router = useRouter();
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerOption[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      targa: '',
      marca: '',
      modello: '',
      anno: new Date().getFullYear(),
      vin: '',
      colore: '',
      carburante: '',
      km: 0,
      customerId: '',
    },
  });

  // Customer search with debounce
  const searchCustomers = useCallback(async (query: string): Promise<void> => {
    if (query.length < 2) {
      setCustomerResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Errore ricerca');
      const json = await res.json();
      const data = json.data ?? json ?? [];
      setCustomerResults(Array.isArray(data) ? data : []);
    } catch {
      setCustomerResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchCustomers(customerSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, searchCustomers]);

  const selectCustomer = (c: CustomerOption): void => {
    setSelectedCustomer(c);
    setValue('customerId', c.id, { shouldValidate: true });
    setCustomerSearch([c.firstName, c.lastName].filter(Boolean).join(' '));
    setShowDropdown(false);
  };

  const onSubmit = async (data: FormValues): Promise<void> => {
    try {
      const res = await fetch('/api/dashboard/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licensePlate: data.targa.toUpperCase().replace(/\s/g, ''),
          make: data.marca,
          model: data.modello,
          year: data.anno,
          vin: data.vin || undefined,
          color: data.colore || undefined,
          fuelType: data.carburante,
          mileage: data.km || undefined,
          customerId: data.customerId,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || json.message || 'Errore creazione veicolo');
      }
      const json = await res.json();
      const newId = json.data?.id || json.id;
      toast.success('Veicolo creato con successo', {
        description: `${data.marca} ${data.modello} (${data.targa}) registrato`,
      });
      if (newId) {
        router.push(`/dashboard/vehicles/${newId}`);
      } else {
        router.push('/dashboard/vehicles');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante la creazione');
    }
  };

  const inputClass = 'h-[52px] rounded-full border border-[#4e4e4e] bg-[#2f2f2f] text-white placeholder-[#888] outline-none px-4 text-sm w-full';
  const selectClass = `${inputClass} appearance-none cursor-pointer`;

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <header className="bg-[#2f2f2f] border-b border-[#4e4e4e]">
        <div className="px-4 sm:px-8 py-5">
          <Breadcrumb items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Veicoli', href: '/dashboard/vehicles' },
            { label: 'Nuovo Veicolo' },
          ]} />
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-xl bg-[#383838] flex items-center justify-center">
              <Car className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Nuovo Veicolo</h1>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-8 max-w-3xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Vehicle Info */}
          <div className="rounded-2xl border border-[#4e4e4e] bg-[#2f2f2f] shadow-[0_0_60px_rgba(0,0,0,0.5)] p-6 space-y-4">
            <h2 className="text-base font-semibold text-white mb-2">Dati Veicolo</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="targa" className="text-sm font-medium text-white">Targa *</Label>
                <Input id="targa" {...register('targa')} placeholder="AB123CD" className={inputClass} />
                {errors.targa && <p className="text-xs text-red-500 mt-1">{errors.targa.message}</p>}
              </div>
              <div>
                <Label htmlFor="vin" className="text-sm font-medium text-white">VIN</Label>
                <Input id="vin" {...register('vin')} placeholder="17 caratteri" className={inputClass} />
                {errors.vin && <p className="text-xs text-red-500 mt-1">{errors.vin.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="marca" className="text-sm font-medium text-white">Marca *</Label>
                <Input id="marca" {...register('marca')} placeholder="es. Fiat" className={inputClass} />
                {errors.marca && <p className="text-xs text-red-500 mt-1">{errors.marca.message}</p>}
              </div>
              <div>
                <Label htmlFor="modello" className="text-sm font-medium text-white">Modello *</Label>
                <Input id="modello" {...register('modello')} placeholder="es. Panda" className={inputClass} />
                {errors.modello && <p className="text-xs text-red-500 mt-1">{errors.modello.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="anno" className="text-sm font-medium text-white">Anno *</Label>
                <Input id="anno" type="number" {...register('anno')} className={inputClass} />
                {errors.anno && <p className="text-xs text-red-500 mt-1">{errors.anno.message}</p>}
              </div>
              <div>
                <Label htmlFor="colore" className="text-sm font-medium text-white">Colore</Label>
                <Input id="colore" {...register('colore')} placeholder="es. Bianco" className={inputClass} />
              </div>
              <div>
                <Label htmlFor="carburante" className="text-sm font-medium text-white">Carburante *</Label>
                <select id="carburante" {...register('carburante')} className={selectClass}>
                  <option value="">Seleziona...</option>
                  {FUEL_OPTIONS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                {errors.carburante && <p className="text-xs text-red-500 mt-1">{errors.carburante.message}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="km" className="text-sm font-medium text-white">Chilometraggio</Label>
              <Input id="km" type="number" {...register('km')} placeholder="es. 85000" className={inputClass} />
              {errors.km && <p className="text-xs text-red-500 mt-1">{errors.km.message}</p>}
            </div>
          </div>

          {/* Customer */}
          <div className="rounded-2xl border border-[#4e4e4e] bg-[#2f2f2f] shadow-[0_0_60px_rgba(0,0,0,0.5)] p-6">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-[#888]" />
              Proprietario *
            </h2>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#888]" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowDropdown(true);
                  if (selectedCustomer) {
                    setSelectedCustomer(null);
                    setValue('customerId', '', { shouldValidate: true });
                  }
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Cerca per nome o email..."
                className="w-full h-[52px] rounded-full border border-[#4e4e4e] bg-[#2f2f2f] text-white placeholder-[#888] outline-none pl-10 pr-4 text-sm"
                autoComplete="off"
              />
              {searchLoading && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[#888]" />
              )}

              {/* Dropdown */}
              {showDropdown && customerResults.length > 0 && !selectedCustomer && (
                <div className="absolute z-50 w-full mt-1 bg-[#2f2f2f] border border-[#4e4e4e] rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.5)] max-h-48 overflow-y-auto">
                  {customerResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectCustomer(c)}
                      className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors min-h-[44px]"
                    >
                      <p className="text-sm font-medium text-white">
                        {[c.firstName, c.lastName].filter(Boolean).join(' ') || 'Cliente senza nome'}
                      </p>
                      {c.email && <p className="text-xs text-[#888]">{c.email}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedCustomer && (
              <p className="text-xs text-green-400 mt-2">
                Proprietario selezionato: {[selectedCustomer.firstName, selectedCustomer.lastName].filter(Boolean).join(' ')}
              </p>
            )}
            {errors.customerId && <p className="text-xs text-red-500 mt-1">{errors.customerId.message}</p>}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/vehicles')}
              className="rounded-full h-[52px] border border-[#4e4e4e] bg-transparent text-white hover:bg-white/5"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full h-[52px] bg-white text-[#0d0d0d] hover:bg-[#e5e5e5]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                'Salva Veicolo'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
