'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2, AlertCircle, Wrench, Car, User, Users } from 'lucide-react';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  plate: string;
  year: number | null;
}

interface Technician {
  id: string;
  firstName: string;
  lastName: string;
}

export default function NewWorkOrderPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [techniciansLoading, setTechniciansLoading] = useState(true);

  const [customerId, setCustomerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [customerRequest, setCustomerRequest] = useState('');
  const [mileageIn, setMileageIn] = useState('');

  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await fetch('/api/customers');
        if (!res.ok) throw new Error('Errore caricamento clienti');
        const json = await res.json();
        setCustomers(json.data ?? json ?? []);
      } catch {
        setCustomers([]);
      } finally {
        setCustomersLoading(false);
      }
    }

    async function loadTechnicians() {
      try {
        const res = await fetch('/api/technicians');
        if (!res.ok) throw new Error('Errore caricamento tecnici');
        const json = await res.json();
        setTechnicians(json.data ?? json ?? []);
      } catch {
        setTechnicians([]);
      } finally {
        setTechniciansLoading(false);
      }
    }

    loadCustomers();
    loadTechnicians();
  }, []);

  useEffect(() => {
    if (!customerId) {
      setVehicles([]);
      setVehicleId('');
      return;
    }

    async function loadVehicles() {
      setVehiclesLoading(true);
      try {
        const res = await fetch(`/api/vehicles?customerId=${customerId}`);
        if (!res.ok) throw new Error('Errore caricamento veicoli');
        const json = await res.json();
        setVehicles(json.data ?? json ?? []);
      } catch {
        setVehicles([]);
      } finally {
        setVehiclesLoading(false);
      }
    }

    loadVehicles();
    setVehicleId('');
  }, [customerId]);

  const handleSubmit = async () => {
    if (!customerId || !vehicleId) {
      setSubmitError('Seleziona un cliente e un veicolo.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          vehicleId,
          technicianId: technicianId || undefined,
          diagnosis: diagnosis || undefined,
          customerRequest: customerRequest || undefined,
          mileageIn: mileageIn ? Number(mileageIn) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || json.message || 'Errore creazione ordine di lavoro');
      const newId = json.data?.id || json.id;
      router.push(`/dashboard/work-orders/${newId}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Errore durante il salvataggio');
      setIsSubmitting(false);
    }
  };

  const selectClass =
    'w-full h-12 rounded-xl border border-gray-200 dark:border-[#424242] bg-white dark:bg-[#353535] text-sm text-gray-900 dark:text-[#ececec] px-4 focus:outline-none focus:ring-2 focus:ring-black/20';

  const textareaClass =
    'w-full rounded-xl border border-gray-200 dark:border-[#424242] bg-white dark:bg-[#353535] text-sm text-gray-900 dark:text-[#ececec] px-4 py-3 placeholder:text-gray-400 dark:placeholder:text-[#6e6e6e] focus:outline-none focus:ring-2 focus:ring-black/20 resize-none';

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
                  Nuovo Ordine di Lavoro
                </h1>
                <p className='text-gray-500 dark:text-[#636366] mt-1'>
                  Compila i dati per creare un nuovo ordine
                </p>
              </div>
              <div className='w-12 h-12 rounded-full bg-black dark:bg-[#ececec] flex items-center justify-center'>
                <Wrench className='w-6 h-6 text-white dark:text-[#212121]' />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className='flex-1 px-10 pb-24 overflow-y-auto space-y-6'>
            {/* Error */}
            {submitError && (
              <div className='flex items-center gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'>
                <AlertCircle className='h-5 w-5 text-red-500 flex-shrink-0' />
                <p className='text-sm text-red-700 dark:text-red-300'>{submitError}</p>
              </div>
            )}

            {/* Cliente */}
            <div className='bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-apple-border/50 dark:border-[#424242]'>
              <div className='flex items-center gap-3 mb-4'>
                <div className='w-10 h-10 rounded-xl bg-black dark:bg-[#ececec] flex items-center justify-center'>
                  <User className='h-5 w-5 text-white dark:text-[#212121]' />
                </div>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-[#ececec]'>Cliente</h3>
              </div>
              <Label className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                Seleziona il cliente
              </Label>
              <select
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                disabled={customersLoading}
                className={selectClass}
              >
                <option value=''>
                  {customersLoading ? 'Caricamento...' : 'Seleziona un cliente'}
                </option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                    {c.companyName ? ` — ${c.companyName}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Veicolo */}
            <div className='bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-apple-border/50 dark:border-[#424242]'>
              <div className='flex items-center gap-3 mb-4'>
                <div className='w-10 h-10 rounded-xl bg-black dark:bg-[#ececec] flex items-center justify-center'>
                  <Car className='h-5 w-5 text-white dark:text-[#212121]' />
                </div>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-[#ececec]'>Veicolo</h3>
              </div>
              <Label className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                Seleziona il veicolo
              </Label>
              <select
                value={vehicleId}
                onChange={e => setVehicleId(e.target.value)}
                disabled={!customerId || vehiclesLoading}
                className={selectClass}
              >
                <option value=''>
                  {!customerId
                    ? 'Seleziona prima un cliente'
                    : vehiclesLoading
                      ? 'Caricamento...'
                      : 'Seleziona un veicolo'}
                </option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.make} {v.model} — {v.plate}
                    {v.year ? ` (${v.year})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Tecnico */}
            <div className='bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-apple-border/50 dark:border-[#424242]'>
              <div className='flex items-center gap-3 mb-4'>
                <div className='w-10 h-10 rounded-xl bg-black dark:bg-[#ececec] flex items-center justify-center'>
                  <Users className='h-5 w-5 text-white dark:text-[#212121]' />
                </div>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-[#ececec]'>
                  Tecnico (opzionale)
                </h3>
              </div>
              <Label className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                Assegna un tecnico
              </Label>
              <select
                value={technicianId}
                onChange={e => setTechnicianId(e.target.value)}
                disabled={techniciansLoading}
                className={selectClass}
              >
                <option value=''>
                  {techniciansLoading ? 'Caricamento...' : 'Nessun tecnico assegnato'}
                </option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* Dettagli */}
            <div className='bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-apple-border/50 dark:border-[#424242]'>
              <div className='flex items-center gap-3 mb-4'>
                <div className='w-10 h-10 rounded-xl bg-black dark:bg-[#ececec] flex items-center justify-center'>
                  <Wrench className='h-5 w-5 text-white dark:text-[#212121]' />
                </div>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-[#ececec]'>
                  Dettagli
                </h3>
              </div>
              <div className='space-y-4'>
                <div>
                  <Label className='mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                    Diagnosi
                  </Label>
                  <textarea
                    value={diagnosis}
                    onChange={e => setDiagnosis(e.target.value)}
                    rows={3}
                    placeholder='Descrivi la diagnosi iniziale...'
                    className={textareaClass}
                  />
                </div>
                <div>
                  <Label className='mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                    Richiesta del cliente
                  </Label>
                  <textarea
                    value={customerRequest}
                    onChange={e => setCustomerRequest(e.target.value)}
                    rows={3}
                    placeholder='Cosa richiede il cliente...'
                    className={textareaClass}
                  />
                </div>
                <div>
                  <Label className='mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                    Chilometraggio ingresso
                  </Label>
                  <Input
                    type='number'
                    value={mileageIn}
                    onChange={e => setMileageIn(e.target.value)}
                    placeholder='es. 85000'
                    className='rounded-xl'
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className='absolute bottom-0 left-0 right-0 px-10 py-6 bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-t border-apple-border/20 dark:border-[#424242]/50 z-50'>
            <div className='flex items-center justify-between'>
              <Button
                type='button'
                onClick={() => router.push('/dashboard/work-orders')}
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
                  'Crea Ordine di Lavoro'
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
