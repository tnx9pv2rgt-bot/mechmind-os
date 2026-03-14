'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import {
  Car,
  Search,
  Plus,
  User,
  Wrench,
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useVehicles } from '@/hooks/useApi';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const statusConfig: Record<
  string,
  { color: string; icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  ready: { color: 'bg-apple-green', icon: CheckCircle2, label: 'Pronto' },
  in_service: { color: 'bg-apple-blue', icon: Wrench, label: 'In lavorazione' },
  'in-service': { color: 'bg-apple-blue', icon: Wrench, label: 'In lavorazione' },
  waiting_parts: { color: 'bg-apple-orange', icon: AlertCircle, label: 'Attesa ricambi' },
  'waiting-parts': { color: 'bg-apple-orange', icon: AlertCircle, label: 'Attesa ricambi' },
  urgent: { color: 'bg-apple-red', icon: AlertCircle, label: 'Urgente' },
};

const defaultStatus = { color: 'bg-apple-gray', icon: Car, label: 'N/D' };

export default function VehiclesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const {
    data: vehiclesData,
    isLoading,
    error,
  } = useVehicles({ search: searchQuery || undefined });

  const vehicles = vehiclesData?.data ?? [];
  const total = vehiclesData?.total ?? 0;

  const inShop = vehicles.filter(
    v => v.status === 'in_service' || v.status === 'in-service'
  ).length;
  const ready = vehicles.filter(v => v.status === 'ready').length;
  const waitingParts = vehicles.filter(
    v => v.status === 'waiting_parts' || v.status === 'waiting-parts'
  ).length;

  return (
    <div>
      <header className='bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-b border-apple-border/20 dark:border-[#424242]/50'>
        <div className='px-8 py-5 flex items-center justify-between'>
          <div>
            <h1 className='text-headline text-apple-dark dark:text-[#ececec]'>Veicoli</h1>
            <p className='text-apple-gray dark:text-[#636366] text-body mt-1'>
              Gestisci il parco veicoli dei tuoi clienti
            </p>
          </div>
          <AppleButton icon={<Plus className='h-4 w-4' />}>Nuovo Veicolo</AppleButton>
        </div>
      </header>

      <div className='p-8 space-y-6'>
        {/* Stats */}
        <motion.div
          initial='hidden'
          animate='visible'
          variants={containerVariants}
          className='grid grid-cols-1 sm:grid-cols-5 gap-bento'
        >
          {[
            {
              label: 'Totale Veicoli',
              value: isLoading ? '—' : String(total),
              color: 'bg-apple-blue',
            },
            {
              label: 'In Officina',
              value: isLoading ? '—' : String(inShop),
              color: 'bg-apple-orange',
            },
            { label: 'Pronti', value: isLoading ? '—' : String(ready), color: 'bg-apple-green' },
            {
              label: 'Attesa Ricambi',
              value: isLoading ? '—' : String(waitingParts),
              color: 'bg-amber-400',
            },
            {
              label: 'Manutenzione Urgente',
              value: isLoading ? '—' : String(vehicles.filter(v => v.status === 'urgent').length),
              color: 'bg-apple-red',
            },
          ].map(stat => (
            <motion.div key={stat.label} variants={cardVariants}>
              <AppleCard>
                <AppleCardContent className='text-center'>
                  <div className={`w-3 h-3 rounded-full ${stat.color} mx-auto mb-2`} />
                  <p className='text-title-1 font-semibold text-apple-dark dark:text-[#ececec]'>
                    {stat.value}
                  </p>
                  <p className='text-footnote text-apple-gray dark:text-[#636366]'>{stat.label}</p>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Search */}
        <motion.div initial='hidden' animate='visible' variants={cardVariants}>
          <AppleCard>
            <AppleCardContent>
              <div className='relative'>
                <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-apple-gray' />
                <Input
                  placeholder='Cerca per targa, marca, modello o proprietario...'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className='pl-12 h-12 rounded-xl border-2 border-black dark:border-[#424242] bg-white dark:bg-[#2f2f2f] text-gray-900 dark:text-[#ececec] placeholder:text-gray-400 dark:placeholder:text-[#6e6e6e] focus:border-black dark:focus:border-[#ececec] focus:ring-2 focus:ring-gray-200 dark:focus:ring-[#424242]'
                />
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Vehicles Grid */}
        {isLoading ? (
          <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-bento'>
            {Array.from({ length: 6 }).map((_, i) => (
              <AppleCard key={i}>
                <AppleCardContent>
                  <div className='flex items-center gap-3 mb-4'>
                    <div className='w-12 h-12 rounded-2xl bg-gray-200 dark:bg-[#424242] animate-pulse' />
                    <div>
                      <div className='w-24 h-4 bg-gray-200 dark:bg-[#424242] rounded animate-pulse mb-2' />
                      <div className='w-32 h-3 bg-gray-200 dark:bg-[#424242] rounded animate-pulse' />
                    </div>
                  </div>
                  <div className='w-full h-3 bg-gray-200 dark:bg-[#424242] rounded animate-pulse mb-2' />
                  <div className='w-3/4 h-3 bg-gray-200 dark:bg-[#424242] rounded animate-pulse' />
                </AppleCardContent>
              </AppleCard>
            ))}
          </div>
        ) : error ? (
          <div className='text-center py-12 text-apple-gray dark:text-[#636366]'>
            <Car className='h-12 w-12 mx-auto mb-4 opacity-50' />
            <p>Impossibile caricare i veicoli. Riprova.</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className='text-center py-12 text-apple-gray dark:text-[#636366]'>
            <Car className='h-12 w-12 mx-auto mb-4 opacity-50' />
            <p>Nessun veicolo trovato</p>
          </div>
        ) : (
          <motion.div
            initial='hidden'
            animate='visible'
            variants={containerVariants}
            className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-bento'
          >
            {vehicles.map(vehicle => {
              const status = statusConfig[vehicle.status] || defaultStatus;
              const StatusIcon = status.icon;

              return (
                <motion.div key={vehicle.id} variants={cardVariants}>
                  <AppleCard hover>
                    <AppleCardContent>
                      <div className='flex items-start justify-between mb-4'>
                        <div className='flex items-center gap-3'>
                          <div className='w-12 h-12 rounded-2xl bg-apple-light-gray dark:bg-[#353535] flex items-center justify-center'>
                            <Car className='h-6 w-6 text-apple-blue' />
                          </div>
                          <div>
                            <h3 className='text-body font-semibold text-apple-dark dark:text-[#ececec]'>
                              {vehicle.licensePlate}
                            </h3>
                            <p className='text-footnote text-apple-gray dark:text-[#636366]'>
                              {vehicle.make} {vehicle.model}{' '}
                              {vehicle.year ? `• ${vehicle.year}` : ''}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${status.color}/10`}
                        >
                          <StatusIcon
                            className={`h-3.5 w-3.5 ${status.color.replace('bg-', 'text-')}`}
                          />
                          <span
                            className={`text-[10px] font-bold uppercase ${status.color.replace('bg-', 'text-')}`}
                          >
                            {status.label}
                          </span>
                        </div>
                      </div>

                      {vehicle.customer && (
                        <div className='flex items-center gap-2 text-footnote text-apple-gray dark:text-[#636366] mb-4'>
                          <User className='h-4 w-4' />
                          <span>
                            {[vehicle.customer.firstName, vehicle.customer.lastName]
                              .filter(Boolean)
                              .join(' ')}
                          </span>
                        </div>
                      )}

                      <div className='grid grid-cols-2 gap-3 pt-4 border-t border-apple-border/20 dark:border-[#424242]'>
                        <div>
                          <p className='text-caption text-apple-gray dark:text-[#636366]'>
                            Ultimo service
                          </p>
                          <p className='text-callout font-medium text-apple-dark dark:text-[#ececec]'>
                            {vehicle.lastServiceDate
                              ? new Date(vehicle.lastServiceDate).toLocaleDateString('it-IT')
                              : '—'}
                          </p>
                        </div>
                        <div>
                          <p className='text-caption text-apple-gray dark:text-[#636366]'>
                            Prossimo service (km)
                          </p>
                          <p className='text-callout font-medium text-apple-dark dark:text-[#ececec]'>
                            {vehicle.nextServiceDueKm
                              ? vehicle.nextServiceDueKm.toLocaleString('it-IT')
                              : '—'}
                          </p>
                        </div>
                      </div>

                      {vehicle.mileage && (
                        <div className='mt-3 text-footnote text-apple-gray dark:text-[#636366]'>
                          Km: {vehicle.mileage.toLocaleString('it-IT')}
                        </div>
                      )}

                      <div className='mt-4 pt-4 border-t border-apple-border/20 dark:border-[#424242] flex gap-2'>
                        <Link
                          href={`/dashboard/inspections?vehicle=${vehicle.id}`}
                          className='flex-1'
                        >
                          <AppleButton variant='secondary' fullWidth>
                            <ClipboardCheck className='h-4 w-4 mr-2' />
                            Storico DVI
                          </AppleButton>
                        </Link>
                        <AppleButton variant='secondary' fullWidth className='flex-1'>
                          Dettagli
                        </AppleButton>
                      </div>
                    </AppleCardContent>
                  </AppleCard>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
