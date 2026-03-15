'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import {
  ClipboardCheck,
  Search,
  Plus,
  User,
  Car,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

interface InspectionItem {
  id: string;
  plate: string;
  vehicle: string;
  customer: string;
  type: string;
  status: string;
  date: string;
  score: number | null;
}

const statusConfig: Record<
  string,
  { color: string; icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  completed: { color: 'bg-apple-green', icon: CheckCircle2, label: 'Completata' },
  blockchain: { color: 'bg-apple-blue', icon: Shield, label: 'Blockchain' },
  in_progress: { color: 'bg-apple-orange', icon: PlayCircle, label: 'In Corso' },
  pending: { color: 'bg-apple-gray', icon: Clock, label: 'In Attesa' },
};

const typeLabels: Record<string, string> = {
  PRE_PURCHASE: 'Pre-Acquisto',
  PERIODIC: 'Periodica',
  PRE_SALE: 'Pre-Vendita',
  WARRANTY: 'Garanzia',
  ACCIDENT: 'Incidente',
};

export default function InspectionsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [inspections, setInspections] = useState<InspectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/inspections')
      .then(res => res.json())
      .then(json => {
        const data = json.data || json || [];
        const mapped = Array.isArray(data)
          ? data.map((i: Record<string, unknown>) => ({
              id: (i.id as string) || '',
              plate: (i.vehiclePlate as string) || (i.plate as string) || '',
              vehicle: (i.vehicleName as string) || (i.vehicle as string) || '',
              customer: (i.customerName as string) || (i.customer as string) || '',
              type: (i.type as string) || (i.inspectionType as string) || '',
              status: (i.status as string) || 'pending',
              date: i.createdAt ? new Date(i.createdAt as string).toLocaleDateString('it-IT') : '',
              score: (i.score as number) || null,
            }))
          : [];
        setInspections(mapped);
      })
      .catch(() => setInspections([]))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredInspections = inspections.filter(
    inspection =>
      inspection.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspection.vehicle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspection.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspection.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <header className='bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-b border-apple-border/20 dark:border-[#424242]/50'>
        <div className='px-8 py-5 flex items-center justify-between'>
          <div>
            <h1 className='text-headline text-apple-dark dark:text-[#ececec]'>Ispezioni</h1>
            <p className='text-apple-gray dark:text-[#636366] text-body mt-1'>
              Gestione ispezioni digitali AI + Blockchain
            </p>
          </div>
          <AppleButton
            icon={<Plus className='h-4 w-4' />}
            onClick={() => router.push('/dashboard/inspections/new')}
          >
            Nuova Ispezione
          </AppleButton>
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
              label: 'Totali Ispezioni',
              value: String(inspections.length),
              color: 'bg-apple-blue',
            },
            {
              label: 'In Corso',
              value: String(inspections.filter(i => i.status === 'in_progress').length),
              color: 'bg-apple-orange',
            },
            {
              label: 'Completate',
              value: String(inspections.filter(i => i.status === 'completed').length),
              color: 'bg-apple-green',
            },
            {
              label: 'Con Blockchain',
              value: String(inspections.filter(i => i.status === 'blockchain').length),
              color: 'bg-purple-500',
            },
            {
              label: 'In Attesa',
              value: String(inspections.filter(i => i.status === 'pending').length),
              color: 'bg-apple-gray',
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
                  placeholder='Cerca per targa, veicolo, cliente o ID ispezione...'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className='pl-12 h-12 rounded-xl border-2 border-black dark:border-[#424242] bg-white dark:bg-[#2f2f2f] text-gray-900 dark:text-[#ececec] placeholder:text-gray-400 dark:placeholder:text-[#6e6e6e] focus:border-black dark:focus:border-[#ececec] focus:ring-2 focus:ring-gray-200 dark:focus:ring-[#424242]'
                />
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Inspections Grid */}
        {!isLoading && filteredInspections.length === 0 ? (
          <motion.div initial='hidden' animate='visible' variants={cardVariants}>
            <AppleCard>
              <AppleCardContent className='flex flex-col items-center justify-center py-16 text-center'>
                <div className='w-16 h-16 rounded-2xl bg-apple-light-gray dark:bg-[#353535] flex items-center justify-center mb-6'>
                  <ClipboardCheck className='h-8 w-8 text-apple-gray dark:text-[#636366]' />
                </div>
                <h3 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec] mb-2'>
                  Nessuna ispezione trovata
                </h3>
                <p className='text-body text-apple-gray dark:text-[#636366] max-w-md'>
                  {searchQuery
                    ? 'Nessun risultato per la ricerca corrente. Prova con altri termini.'
                    : 'Non ci sono ispezioni registrate. Crea una nuova ispezione per iniziare.'}
                </p>
                {!searchQuery && (
                  <AppleButton
                    className='mt-6'
                    icon={<Plus className='h-4 w-4' />}
                    onClick={() => router.push('/dashboard/inspections/new')}
                  >
                    Nuova Ispezione
                  </AppleButton>
                )}
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        ) : (
          <motion.div
            initial='hidden'
            animate='visible'
            variants={containerVariants}
            className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-bento'
          >
            {filteredInspections.map(inspection => {
              const status = statusConfig[inspection.status];
              const StatusIcon = status.icon;

              return (
                <motion.div key={inspection.id} variants={cardVariants}>
                  <AppleCard hover>
                    <AppleCardContent>
                      <div className='flex items-start justify-between mb-4'>
                        <div className='flex items-center gap-3'>
                          <div className='w-12 h-12 rounded-2xl bg-apple-light-gray dark:bg-[#353535] flex items-center justify-center'>
                            <ClipboardCheck className='h-6 w-6 text-apple-blue' />
                          </div>
                          <div>
                            <h3 className='text-body font-semibold text-apple-dark dark:text-[#ececec]'>
                              {inspection.id}
                            </h3>
                            <p className='text-footnote text-apple-gray dark:text-[#636366]'>
                              {inspection.vehicle} • {inspection.plate}
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

                      <div className='flex items-center gap-2 text-footnote text-apple-gray dark:text-[#636366] mb-4'>
                        <User className='h-4 w-4' />
                        <span>{inspection.customer}</span>
                      </div>

                      <div className='grid grid-cols-2 gap-3 pt-4 border-t border-apple-border/20 dark:border-[#424242]'>
                        <div>
                          <p className='text-caption text-apple-gray dark:text-[#636366]'>Tipo</p>
                          <p className='text-callout font-medium text-apple-dark dark:text-[#ececec]'>
                            {typeLabels[inspection.type]}
                          </p>
                        </div>
                        <div>
                          <p className='text-caption text-apple-gray dark:text-[#636366]'>Data</p>
                          <p className='text-callout font-medium text-apple-dark dark:text-[#ececec]'>
                            {inspection.date}
                          </p>
                        </div>
                      </div>

                      {inspection.score && (
                        <div className='mt-4 pt-4 border-t border-apple-border/20 dark:border-[#424242]'>
                          <div className='flex items-center justify-between'>
                            <span className='text-caption text-apple-gray dark:text-[#636366]'>
                              Score
                            </span>
                            <span
                              className={`text-title-2 font-semibold ${
                                inspection.score >= 9
                                  ? 'text-apple-green'
                                  : inspection.score >= 7
                                    ? 'text-apple-orange'
                                    : 'text-apple-red'
                              }`}
                            >
                              {inspection.score}/10
                            </span>
                          </div>
                        </div>
                      )}

                      <div className='mt-4 pt-4 border-t border-apple-border/20 dark:border-[#424242]'>
                        <AppleButton variant='secondary' fullWidth>
                          Visualizza Dettagli
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
