'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  MoreHorizontal,
  CheckCircle2,
  Euro,
  Wrench,
} from 'lucide-react';

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

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const fadeInDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const cardVariants = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
  },
  hover: {
    scale: 1.02,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
};

const statsCardVariants = {
  initial: { opacity: 0, y: 20, scale: 0.9 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
  },
};

const detailCardVariants = {
  initial: { opacity: 0, scale: 0.95, y: 30 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 80,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -20,
    transition: {
      duration: 0.2,
    },
  },
};

const comparisonItemVariants = {
  initial: { opacity: 0, x: -20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
  },
};

export default function LocationsPage() {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/locations')
      .then(res => res.json())
      .then(json => {
        const data = json.data || json || [];
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
        if (mapped.length > 0) setSelectedLocation(mapped[0]);
      })
      .catch(() => setLocations([]))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredLocations = locations.filter(
    loc =>
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <header className='bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-b border-apple-border/20 dark:border-[#424242]/50'>
        <div className='px-8 py-5 flex items-center justify-between'>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <h1 className='text-headline text-apple-dark dark:text-[#ececec]'>Location</h1>
            <p className='text-apple-gray dark:text-[#636366] text-body mt-1'>
              Gestisci le tue sedi
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <AppleButton icon={<Plus className='h-4 w-4' />}>Nuova Sede</AppleButton>
          </motion.div>
        </div>
      </header>

      <div className='p-8 space-y-6'>
        {/* Stats Overview */}
        <motion.div
          className='grid grid-cols-1 sm:grid-cols-4 gap-bento'
          variants={staggerContainer}
          initial='initial'
          animate='animate'
        >
          {[
            {
              label: 'Sedi Totali',
              value: String(locations.length),
              icon: Building2,
              color: 'bg-apple-blue',
            },
            {
              label: 'Fatturato Totale',
              value: `€${(locations.reduce((s, l) => s + l.revenue.month, 0) / 1000).toFixed(1)}k`,
              icon: Euro,
              color: 'bg-apple-green',
            },
            {
              label: 'Tecnici',
              value: String(locations.reduce((s, l) => s + l.technicians, 0)),
              icon: Users,
              color: 'bg-apple-purple',
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
              color: 'bg-apple-orange',
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              variants={statsCardVariants}
              custom={index}
              whileHover={{
                scale: 1.03,
                transition: { type: 'spring', stiffness: 400, damping: 25 },
              }}
            >
              <AppleCard>
                <AppleCardContent className='flex items-center gap-4'>
                  <motion.div
                    className={`w-12 h-12 rounded-2xl ${stat.color} flex items-center justify-center`}
                    whileHover={{ rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <stat.icon className='h-6 w-6 text-white' />
                  </motion.div>
                  <div>
                    <p className='text-title-1 font-semibold text-apple-dark dark:text-[#ececec]'>
                      {stat.value}
                    </p>
                    <p className='text-apple-gray dark:text-[#636366] text-sm'>{stat.label}</p>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          ))}
        </motion.div>

        <Tabs defaultValue='locations' className='w-full'>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <TabsList className='mb-6 bg-white dark:bg-[#2f2f2f] p-1 rounded-2xl border border-apple-border/30 dark:border-[#424242] w-fit'>
              <TabsTrigger
                value='locations'
                className='rounded-xl data-[state=active]:bg-apple-blue data-[state=active]:text-white px-6'
              >
                Sedi
              </TabsTrigger>
              <TabsTrigger
                value='comparison'
                className='rounded-xl data-[state=active]:bg-apple-blue data-[state=active]:text-white px-6'
              >
                Confronto
              </TabsTrigger>
              <TabsTrigger
                value='inventory'
                className='rounded-xl data-[state=active]:bg-apple-blue data-[state=active]:text-white px-6'
              >
                Magazzino
              </TabsTrigger>
            </TabsList>
          </motion.div>

          <TabsContent value='locations' className='mt-0 space-y-6'>
            {/* Search */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <AppleCard>
                <AppleCardContent>
                  <div className='relative'>
                    <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-apple-gray' />
                    <Input
                      placeholder='Cerca sede per nome o città...'
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className='pl-12 h-12 rounded-xl border-2 border-black dark:border-[#424242] bg-white dark:bg-[#2f2f2f] text-gray-900 dark:text-[#ececec] placeholder:text-gray-400 dark:placeholder:text-[#6e6e6e] focus:border-black dark:focus:border-[#ececec] focus:ring-2 focus:ring-gray-200 dark:focus:ring-[#424242]'
                    />
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Locations Grid */}
            <motion.div
              className='grid grid-cols-1 lg:grid-cols-3 gap-bento'
              variants={staggerContainer}
              initial='initial'
              animate='animate'
            >
              {filteredLocations.map((location, index) => (
                <motion.div
                  key={location.id}
                  variants={cardVariants}
                  custom={index}
                  whileHover='hover'
                  layoutId={`location-${location.id}`}
                >
                  <AppleCard
                    hover
                    className={selectedLocation?.id === location.id ? 'ring-2 ring-apple-blue' : ''}
                  >
                    <AppleCardContent>
                      <div className='flex items-start justify-between mb-4'>
                        <div className='flex items-center gap-3'>
                          <motion.div
                            className='w-12 h-12 rounded-2xl bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center'
                            whileHover={{ rotate: 5, scale: 1.1 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                          >
                            <Building2 className='h-6 w-6 text-white' />
                          </motion.div>
                          <div>
                            <h3 className='text-body font-semibold text-apple-dark dark:text-[#ececec]'>
                              {location.name}
                            </h3>
                            <p className='text-footnote text-apple-gray dark:text-[#636366] flex items-center gap-1'>
                              <MapPin className='h-3 w-3' />
                              {location.city}
                            </p>
                          </div>
                        </div>
                        <motion.div
                          className={`w-2 h-2 rounded-full ${location.isActive ? 'bg-apple-green' : 'bg-apple-gray'}`}
                          animate={
                            location.isActive
                              ? {
                                  scale: [1, 1.2, 1],
                                  opacity: [1, 0.7, 1],
                                }
                              : {}
                          }
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      </div>

                      {/* Revenue Mini Stats */}
                      <div className='grid grid-cols-3 gap-2 mb-4'>
                        <motion.div
                          className='text-center p-2 bg-apple-light-gray/50 dark:bg-[#353535] rounded-xl'
                          whileHover={{ scale: 1.05 }}
                        >
                          <p className='text-caption text-apple-gray dark:text-[#636366]'>Oggi</p>
                          <p className='text-callout font-semibold text-apple-dark dark:text-[#ececec]'>
                            €{location.revenue.today.toLocaleString()}
                          </p>
                        </motion.div>
                        <motion.div
                          className='text-center p-2 bg-apple-light-gray/50 dark:bg-[#353535] rounded-xl'
                          whileHover={{ scale: 1.05 }}
                        >
                          <p className='text-caption text-apple-gray dark:text-[#636366]'>Sett.</p>
                          <p className='text-callout font-semibold text-apple-dark dark:text-[#ececec]'>
                            €{(location.revenue.week / 1000).toFixed(1)}k
                          </p>
                        </motion.div>
                        <motion.div
                          className='text-center p-2 bg-apple-light-gray/50 dark:bg-[#353535] rounded-xl'
                          whileHover={{ scale: 1.05 }}
                        >
                          <p className='text-caption text-apple-gray dark:text-[#636366]'>Mese</p>
                          <p className='text-callout font-semibold text-apple-dark dark:text-[#ececec]'>
                            €{(location.revenue.month / 1000).toFixed(1)}k
                          </p>
                        </motion.div>
                      </div>

                      {/* Car Count */}
                      <div className='flex items-center gap-4 mb-4'>
                        <div className='flex items-center gap-2'>
                          <Car className='h-4 w-4 text-apple-blue' />
                          <span className='text-footnote text-apple-dark dark:text-[#ececec]'>
                            {location.carCount.inService} in servizio
                          </span>
                        </div>
                        <div className='flex items-center gap-2'>
                          <Star className='h-4 w-4 text-apple-orange' />
                          <span className='text-footnote text-apple-dark dark:text-[#ececec]'>
                            {location.satisfaction} ★
                          </span>
                        </div>
                      </div>

                      <div className='pt-4 border-t border-apple-border/20 dark:border-[#424242]'>
                        <AppleButton
                          variant='secondary'
                          fullWidth
                          onClick={() => setSelectedLocation(location)}
                        >
                          {selectedLocation?.id === location.id ? 'Selezionata' : 'Seleziona'}
                        </AppleButton>
                      </div>
                    </AppleCardContent>
                  </AppleCard>
                </motion.div>
              ))}
            </motion.div>

            {/* Selected Location Detail */}
            {selectedLocation && (
              <motion.div
                key={selectedLocation.id}
                variants={detailCardVariants}
                initial='initial'
                animate='animate'
                exit='exit'
                layoutId={`detail-${selectedLocation.id}`}
              >
                <AppleCard featured>
                  <AppleCardContent>
                    <div className='flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6'>
                      <motion.div
                        className='flex items-center gap-4'
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2, duration: 0.4 }}
                      >
                        <motion.div
                          className='w-16 h-16 rounded-2xl bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center'
                          whileHover={{ rotate: 10, scale: 1.1 }}
                          transition={{ type: 'spring', stiffness: 200 }}
                        >
                          <Building2 className='h-8 w-8 text-white' />
                        </motion.div>
                        <div>
                          <h2 className='text-title-1 font-semibold text-apple-dark dark:text-[#ececec]'>
                            {selectedLocation.name}
                          </h2>
                          <p className='text-body text-apple-gray dark:text-[#636366]'>
                            {selectedLocation.address}
                          </p>
                        </div>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                      >
                        <AppleButton>Modifica Sede</AppleButton>
                      </motion.div>
                    </div>

                    <motion.div
                      className='grid grid-cols-2 md:grid-cols-4 gap-4'
                      variants={staggerContainer}
                      initial='initial'
                      animate='animate'
                    >
                      {[
                        { label: 'ARO Medio', value: `€${selectedLocation.aro}` },
                        { label: 'Soddisfazione', value: `${selectedLocation.satisfaction} ★` },
                        { label: 'Tecnici', value: selectedLocation.technicians.toString() },
                        { label: 'Pronti', value: selectedLocation.carCount.ready.toString() },
                      ].map((item, index) => (
                        <motion.div
                          key={item.label}
                          className='p-4 bg-apple-light-gray/50 dark:bg-[#353535] rounded-2xl text-center'
                          variants={statsCardVariants}
                          custom={index}
                          whileHover={{ scale: 1.05 }}
                        >
                          <p className='text-caption text-apple-gray dark:text-[#636366] mb-1'>
                            {item.label}
                          </p>
                          <p className='text-title-2 font-bold text-apple-dark dark:text-[#ececec]'>
                            {item.value}
                          </p>
                        </motion.div>
                      ))}
                    </motion.div>
                  </AppleCardContent>
                </AppleCard>
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value='comparison' className='mt-0'>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <AppleCard>
                <AppleCardHeader>
                  <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
                    Confronto Performance
                  </h2>
                </AppleCardHeader>
                <AppleCardContent>
                  <motion.div
                    className='space-y-4'
                    variants={staggerContainer}
                    initial='initial'
                    animate='animate'
                  >
                    {locations.map((location, index) => (
                      <motion.div
                        key={location.id}
                        className='p-4 rounded-2xl bg-apple-light-gray/30 dark:bg-[#353535]'
                        variants={comparisonItemVariants}
                        custom={index}
                        whileHover={{ scale: 1.01 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <div className='flex items-center justify-between mb-3'>
                          <h3 className='text-body font-semibold text-apple-dark dark:text-[#ececec]'>
                            {location.name}
                          </h3>
                          <motion.span
                            className='text-title-3 font-bold text-apple-blue'
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 + index * 0.1, duration: 0.3 }}
                          >
                            €{location.revenue.month.toLocaleString()}/mese
                          </motion.span>
                        </div>
                        <div className='grid grid-cols-4 gap-4 text-center'>
                          {[
                            { label: 'ARO', value: `€${location.aro}` },
                            { label: 'Soddisfazione', value: location.satisfaction.toString() },
                            { label: 'Veicoli', value: location.carCount.inService.toString() },
                            { label: 'Tecnici', value: location.technicians.toString() },
                          ].map((stat, statIndex) => (
                            <motion.div
                              key={stat.label}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.4 + index * 0.1 + statIndex * 0.05 }}
                            >
                              <p className='text-caption text-apple-gray dark:text-[#636366]'>
                                {stat.label}
                              </p>
                              <p className='text-callout font-semibold text-apple-dark dark:text-[#ececec]'>
                                {stat.value}
                              </p>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </TabsContent>

          <TabsContent value='inventory' className='mt-0'>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <AppleCard>
                <AppleCardHeader>
                  <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
                    Magazzino Condiviso
                  </h2>
                </AppleCardHeader>
                <AppleCardContent>
                  <motion.div
                    className='text-center py-12'
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                  >
                    <motion.div
                      className='w-20 h-20 rounded-2xl bg-apple-light-gray dark:bg-[#353535] flex items-center justify-center mx-auto mb-4'
                      animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Wrench className='h-10 w-10 text-apple-gray' />
                    </motion.div>
                    <motion.h3
                      className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec] mb-2'
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      Gestione Magazzino
                    </motion.h3>
                    <motion.p
                      className='text-body text-apple-gray dark:text-[#636366] max-w-md mx-auto'
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      Visualizza e trasferisci ricambi tra le tue sedi in tempo reale.
                    </motion.p>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <AppleButton className='mt-6'>Visualizza Magazzino</AppleButton>
                    </motion.div>
                  </motion.div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
