'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/pagination';
import { AppleButton } from '@/components/ui/apple-button';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import {
  Building2,
  MapPin,
  TrendingUp,
  Users,
  Car,
  Star,
  Plus,
  Search,
  ArrowRight,
  ArrowLeft,
  MoreHorizontal,
  CheckCircle2,
  Euro,
  Wrench,
  AlertCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocationDialog } from '@/components/locations/location-dialog';
import Link from 'next/link';

interface LocationData {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  isActive: boolean;
  revenue: { today: number; week: number; month: number };
  carCount: { inService: number; waiting: number; ready: number };
  aro: number;
  satisfaction: number;
  technicians: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const statsCardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const listItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export default function LocationsPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'locations' | 'comparison' | 'inventory'>('locations');
  const PAGE_SIZE = 20;
  const { openDialog, LocationDialog } = useLocationDialog();

  const fetchLocations = useCallback(() => {
    setIsLoading(true);
    api
      .get<Record<string, unknown>[] | { data: Record<string, unknown>[] }>('/locations')
      .then(res => {
        const raw = res.data;
        const data = Array.isArray(raw)
          ? raw
          : (raw as { data: Record<string, unknown>[] }).data || [];
        const mapped: LocationData[] = Array.isArray(data)
          ? data.map((loc: Record<string, unknown>) => ({
              id: (loc.id as string) || '',
              name: (loc.name as string) || '',
              address: (loc.address as string) || '',
              city: (loc.city as string) || '',
              phone: (loc.phone as string) || '',
              isActive: loc.isActive !== false,
              revenue: { today: 0, week: 0, month: 0 },
              carCount: { inService: 0, waiting: 0, ready: 0 },
              aro: 0,
              satisfaction: 0,
              technicians: 0,
            }))
          : [];
        setLocations(mapped);
        setLoadError(false);
        if (mapped.length > 0) setSelectedLocation(mapped[0]);
      })
      .catch(() => {
        setLocations([]);
        setLoadError(true);
        toast.error('Impossibile caricare le sedi');
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const filteredLocations = locations.filter(
    loc =>
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs = [
    { key: 'locations' as const, label: 'Sedi' },
    { key: 'comparison' as const, label: 'Confronto' },
    { key: 'inventory' as const, label: 'Magazzino' },
  ];

  return (
    <div>
      {/* Header */}
      <header>
        <div className='px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <div>
            <h1 className='text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Sedi</h1>
            <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1'>Gestisci le tue sedi</p>
          </div>
          <div className='flex items-center gap-3'>
            <AppleButton variant='primary' icon={<Plus className='h-4 w-4' />} onClick={() => openDialog()}>
              Nuova Sede
            </AppleButton>
          </div>
        </div>
      </header>

      <motion.div className='p-4 sm:p-8 space-y-6' initial='hidden' animate='visible' variants={containerVariants}>
        {/* Stats Overview */}
        <motion.div className='grid grid-cols-2 lg:grid-cols-4 gap-bento' variants={containerVariants}>
          {[
            { label: 'Sedi Totali', value: String(locations.length), icon: Building2, color: 'bg-[var(--brand)]' },
            {
              label: 'Fatturato Totale',
              value: `\u20AC${(locations.reduce((s, l) => s + l.revenue.month, 0) / 1000).toFixed(1)}k`,
              icon: Euro,
              color: 'bg-[var(--status-success)]',
            },
            {
              label: 'Tecnici',
              value: String(locations.reduce((s, l) => s + l.technicians, 0)),
              icon: Users,
              color: 'bg-[var(--brand)]',
            },
            {
              label: 'Veicoli/gg',
              value: String(
                locations.reduce(
                  (s, l) => s + l.carCount.inService + l.carCount.waiting + l.carCount.ready,
                  0
                )
              ),
              icon: Car,
              color: 'bg-[var(--status-warning)]',
            },
          ].map(stat => (
            <motion.div key={stat.label} variants={statsCardVariants}>
              <AppleCard hover={false}>
                <AppleCardContent>
                  <div className='flex items-center justify-between mb-3'>
                    <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                      <stat.icon className='h-5 w-5 text-[var(--text-on-brand)]' />
                    </div>
                  </div>
                  <p className='text-title-1 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    {stat.value}
                  </p>
                  <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>{stat.label}</p>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Tabs */}
        <motion.div variants={listItemVariants} className='flex justify-center flex-wrap gap-2'>
          {tabs.map(tab => (
            <AppleButton
              key={tab.key}
              variant={activeTab === tab.key ? 'primary' : 'ghost'}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </AppleButton>
          ))}
        </motion.div>

        {/* Tab: Locations */}
        {activeTab === 'locations' && (
          <>
            {/* Search */}
            <motion.div variants={listItemVariants}>
              <AppleCard hover={false}>
                <AppleCardContent>
                  <div className='relative'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]' />
                    <input
                      placeholder='Cerca sede per nome o citta...'
                      aria-label='Cerca sedi'
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className='w-full pl-10 pr-4 h-10 rounded-md border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue'
                    />
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Locations Grid */}
            {isLoading ? (
              <div className='flex items-center justify-center py-12'>
                <Loader2 className='h-8 w-8 animate-spin text-[var(--brand)]' />
              </div>
            ) : loadError ? (
              <AppleCard hover={false}>
                <AppleCardContent>
                  <div className='flex flex-col items-center justify-center py-12 text-center'>
                    <AlertCircle className='h-12 w-12 text-[var(--status-error)]/40 mb-4' />
                    <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                      Impossibile caricare le sedi
                    </p>
                    <AppleButton
                      variant='ghost'
                      className='mt-4'
                      onClick={() => fetchLocations()}
                    >
                      Riprova
                    </AppleButton>
                  </div>
                </AppleCardContent>
              </AppleCard>
            ) : filteredLocations.length === 0 ? (
              <AppleCard hover={false}>
                <AppleCardContent>
                  <div className='flex flex-col items-center justify-center py-12 text-center'>
                    <Building2 className='h-12 w-12 text-[var(--text-tertiary)]/40 mb-4' />
                    <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                      Nessuna sede trovata. Aggiungi la prima sede per iniziare.
                    </p>
                  </div>
                </AppleCardContent>
              </AppleCard>
            ) : (
              <motion.div
                className='grid grid-cols-1 lg:grid-cols-3 gap-4'
                variants={containerVariants}
                initial='hidden'
                animate='visible'
              >
                {filteredLocations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((location, index) => (
                  <motion.div
                    key={location.id}
                    variants={listItemVariants}
                    custom={index}
                    whileHover={{ scale: 1.005, x: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AppleCard hover={false}>
                      <AppleCardContent>
                        <div
                          className='cursor-pointer'
                          onClick={() => setSelectedLocation(location)}
                        >
                          <div className='flex items-start justify-between mb-4'>
                            <div className='flex items-center gap-3'>
                              <div className='w-12 h-12 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center'>
                                <Building2 className='h-6 w-6 text-[var(--brand)]' />
                              </div>
                              <div>
                                <h3 className='text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                                  {location.name}
                                </h3>
                                <p className='text-footnote flex items-center gap-1 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                                  <MapPin className='h-3 w-3' />
                                  {location.city}
                                </p>
                              </div>
                            </div>
                            <div
                              className={`w-2 h-2 rounded-full ${location.isActive ? 'bg-[var(--status-success)]' : 'bg-[var(--text-tertiary)]'}`}
                            />
                          </div>

                          {/* Revenue Mini Stats */}
                          <div className='grid grid-cols-3 gap-2 mb-4'>
                            {[
                              { label: 'Oggi', value: `\u20AC${location.revenue.today.toLocaleString()}` },
                              { label: 'Sett.', value: `\u20AC${(location.revenue.week / 1000).toFixed(1)}k` },
                              { label: 'Mese', value: `\u20AC${(location.revenue.month / 1000).toFixed(1)}k` },
                            ].map(rev => (
                              <div
                                key={rev.label}
                                className='text-center p-2 rounded-xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)]'
                              >
                                <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>{rev.label}</p>
                                <p className='text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                                  {rev.value}
                                </p>
                              </div>
                            ))}
                          </div>

                          {/* Car Count */}
                          <div className='flex items-center gap-4 mb-4'>
                            <div className='flex items-center gap-2'>
                              <Car className='h-4 w-4 text-[var(--brand)]' />
                              <span className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                                {location.carCount.inService} in servizio
                              </span>
                            </div>
                            <div className='flex items-center gap-2'>
                              <Star className='h-4 w-4 text-[var(--status-warning)]' />
                              <span className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                                {location.satisfaction} &#9733;
                              </span>
                            </div>
                          </div>

                          <div className='pt-4 border-t border-[var(--border-default)]/20 dark:border-[var(--border-default)]/50 flex gap-2'>
                            <AppleButton
                              variant='ghost'
                              size='sm'
                              className='flex-1'
                              onClick={e => {
                                e.stopPropagation();
                                router.push(`/dashboard/locations/${location.id}`);
                              }}
                            >
                              Vedi
                            </AppleButton>
                            <AppleButton
                              variant='ghost'
                              size='sm'
                              className='flex-1'
                              onClick={e => {
                                e.stopPropagation();
                                setSelectedLocation(location);
                              }}
                            >
                              Seleziona
                            </AppleButton>
                          </div>
                        </div>
                      </AppleCardContent>
                    </AppleCard>
                  </motion.div>
                ))}
              </motion.div>
            )}
            <Pagination page={page} totalPages={Math.ceil(filteredLocations.length / PAGE_SIZE)} onPageChange={setPage} />

            {/* Selected Location Detail */}
            {selectedLocation && (
              <motion.div
                key={selectedLocation.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AppleCard hover={false}>
                  <AppleCardContent>
                    <div className='flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6'>
                      <div className='flex items-center gap-4'>
                        <div className='w-16 h-16 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center'>
                          <Building2 className='h-8 w-8 text-[var(--brand)]' />
                        </div>
                        <div>
                          <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                            {selectedLocation.name}
                          </h2>
                          <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                            {selectedLocation.address}
                          </p>
                        </div>
                      </div>
                      <AppleButton variant='primary'>
                        Modifica Sede
                      </AppleButton>
                    </div>

                    <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                      {[
                        { label: 'ARO Medio', value: `\u20AC${selectedLocation.aro}` },
                        { label: 'Soddisfazione', value: `${selectedLocation.satisfaction} \u2605` },
                        { label: 'Tecnici', value: selectedLocation.technicians.toString() },
                        { label: 'Pronti', value: selectedLocation.carCount.ready.toString() },
                      ].map(item => (
                        <div
                          key={item.label}
                          className='p-4 rounded-2xl text-center bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)]'
                        >
                          <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-1'>
                            {item.label}
                          </p>
                          <p className='text-title-1 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </AppleCardContent>
                </AppleCard>
              </motion.div>
            )}
          </>
        )}

        {/* Tab: Comparison */}
        {activeTab === 'comparison' && (
          <motion.div variants={listItemVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                  Confronto Performance
                </h2>
              </AppleCardHeader>
              <AppleCardContent>
                <motion.div className='space-y-3' variants={containerVariants} initial='hidden' animate='visible'>
                  {locations.map((location, index) => (
                    <motion.div
                      key={location.id}
                      className='p-4 rounded-2xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-active)] hover:shadow-apple transition-all duration-300'
                      variants={listItemVariants}
                      custom={index}
                      whileHover={{ scale: 1.005, x: 4 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className='flex items-center justify-between mb-3'>
                        <h3 className='text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                          {location.name}
                        </h3>
                        <span className='text-body font-semibold text-[var(--brand)]'>
                          {'\u20AC'}{location.revenue.month.toLocaleString()}/mese
                        </span>
                      </div>
                      <div className='grid grid-cols-4 gap-4 text-center'>
                        {[
                          { label: 'ARO', value: `\u20AC${location.aro}` },
                          { label: 'Soddisfazione', value: location.satisfaction.toString() },
                          { label: 'Veicoli', value: location.carCount.inService.toString() },
                          { label: 'Tecnici', value: location.technicians.toString() },
                        ].map(stat => (
                          <div key={stat.label}>
                            <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                              {stat.label}
                            </p>
                            <p className='text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                              {stat.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        )}

        {/* Tab: Inventory */}
        {activeTab === 'inventory' && (
          <motion.div variants={listItemVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                  Magazzino Condiviso
                </h2>
              </AppleCardHeader>
              <AppleCardContent>
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <Wrench className='h-12 w-12 text-[var(--text-tertiary)]/40 mb-4' />
                  <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] max-w-md'>
                    Visualizza e trasferisci ricambi tra le tue sedi in tempo reale.
                  </p>
                  <AppleButton variant='ghost' className='mt-4'>
                    Visualizza Magazzino
                  </AppleButton>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        )}
      </motion.div>

      <LocationDialog onSuccess={fetchLocations} />
    </div>
  );
}
