'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Car, User, Wrench, Users, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
};

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

  // Load customers on mount
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

  // Load vehicles filtered by customer
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
    'w-full h-12 rounded-xl border-2 border-black dark:border-[#424242] bg-white dark:bg-[#2f2f2f] text-gray-900 dark:text-[#ececec] px-4 focus:border-black dark:focus:border-[#ececec] focus:ring-2 focus:ring-gray-200 dark:focus:ring-[#424242] focus:outline-none';

  const textareaClass =
    'w-full rounded-xl border-2 border-black dark:border-[#424242] bg-white dark:bg-[#2f2f2f] text-gray-900 dark:text-[#ececec] px-4 py-3 placeholder:text-gray-400 dark:placeholder:text-[#6e6e6e] focus:border-black dark:focus:border-[#ececec] focus:ring-2 focus:ring-gray-200 dark:focus:ring-[#424242] focus:outline-none resize-none';

  return (
    <div>
      <header className='bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-b border-apple-border/20 dark:border-[#424242]/50'>
        <div className='px-8 py-5'>
          <Link
            href='/dashboard/work-orders'
            className='flex items-center gap-2 text-apple-gray dark:text-[#636366] hover:text-apple-dark transition-colors mb-3'
          >
            <ArrowLeft className='h-4 w-4' />
            <span className='text-sm'>Torna agli ordini di lavoro</span>
          </Link>
          <h1 className='text-headline text-apple-dark dark:text-[#ececec]'>
            Nuovo Ordine di Lavoro
          </h1>
          <p className='text-apple-gray dark:text-[#636366] text-body mt-1'>
            Compila i dati per creare un nuovo ordine
          </p>
        </div>
      </header>

      <div className='p-8 max-w-3xl mx-auto'>
        <motion.div
          variants={containerVariants}
          initial='hidden'
          animate='visible'
          className='space-y-6'
        >
          {/* Customer Selector */}
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <AppleCardContent>
                <div className='flex items-center gap-3 mb-4'>
                  <div className='w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center'>
                    <User className='h-5 w-5 text-purple-500' />
                  </div>
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec]'>
                    Cliente
                  </h2>
                </div>
                <label
                  htmlFor='customerId'
                  className='text-sm text-apple-gray dark:text-[#636366] mb-2 block'
                >
                  Seleziona il cliente
                </label>
                <select
                  id='customerId'
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
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          {/* Vehicle Selector */}
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <AppleCardContent>
                <div className='flex items-center gap-3 mb-4'>
                  <div className='w-10 h-10 rounded-xl bg-apple-blue/10 flex items-center justify-center'>
                    <Car className='h-5 w-5 text-apple-blue' />
                  </div>
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec]'>
                    Veicolo
                  </h2>
                </div>
                <label
                  htmlFor='vehicleId'
                  className='text-sm text-apple-gray dark:text-[#636366] mb-2 block'
                >
                  Seleziona il veicolo
                </label>
                <select
                  id='vehicleId'
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
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          {/* Technician Selector */}
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <AppleCardContent>
                <div className='flex items-center gap-3 mb-4'>
                  <div className='w-10 h-10 rounded-xl bg-apple-green/10 flex items-center justify-center'>
                    <Users className='h-5 w-5 text-apple-green' />
                  </div>
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec]'>
                    Tecnico (opzionale)
                  </h2>
                </div>
                <label
                  htmlFor='technicianId'
                  className='text-sm text-apple-gray dark:text-[#636366] mb-2 block'
                >
                  Assegna un tecnico
                </label>
                <select
                  id='technicianId'
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
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          {/* Details */}
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <AppleCardContent>
                <div className='flex items-center gap-3 mb-4'>
                  <div className='w-10 h-10 rounded-xl bg-apple-orange/10 flex items-center justify-center'>
                    <Wrench className='h-5 w-5 text-apple-orange' />
                  </div>
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec]'>
                    Dettagli
                  </h2>
                </div>
                <div className='space-y-4'>
                  <div>
                    <label
                      htmlFor='diagnosis'
                      className='text-sm text-apple-gray dark:text-[#636366] mb-2 block'
                    >
                      Diagnosi
                    </label>
                    <textarea
                      id='diagnosis'
                      value={diagnosis}
                      onChange={e => setDiagnosis(e.target.value)}
                      rows={3}
                      placeholder='Descrivi la diagnosi iniziale...'
                      className={textareaClass}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor='customerRequest'
                      className='text-sm text-apple-gray dark:text-[#636366] mb-2 block'
                    >
                      Richiesta del cliente
                    </label>
                    <textarea
                      id='customerRequest'
                      value={customerRequest}
                      onChange={e => setCustomerRequest(e.target.value)}
                      rows={3}
                      placeholder='Cosa richiede il cliente...'
                      className={textareaClass}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor='mileageIn'
                      className='text-sm text-apple-gray dark:text-[#636366] mb-2 block'
                    >
                      Chilometraggio ingresso
                    </label>
                    <Input
                      id='mileageIn'
                      type='number'
                      value={mileageIn}
                      onChange={e => setMileageIn(e.target.value)}
                      placeholder='es. 85000'
                      className='h-12 rounded-xl border-2 border-black dark:border-[#424242] bg-white dark:bg-[#2f2f2f] text-gray-900 dark:text-[#ececec] placeholder:text-gray-400 dark:placeholder:text-[#6e6e6e] focus:border-black dark:focus:border-[#ececec] focus:ring-2 focus:ring-gray-200 dark:focus:ring-[#424242]'
                    />
                  </div>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          {/* Error */}
          {submitError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className='flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30'
            >
              <AlertCircle className='h-5 w-5 text-red-500 flex-shrink-0' />
              <p className='text-sm text-red-700 dark:text-red-300'>{submitError}</p>
            </motion.div>
          )}

          {/* Submit */}
          <motion.div variants={cardVariants}>
            <AppleButton
              size='lg'
              fullWidth
              loading={isSubmitting}
              onClick={handleSubmit}
              icon={<Wrench className='h-5 w-5' />}
            >
              Crea Ordine di Lavoro
            </AppleButton>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
