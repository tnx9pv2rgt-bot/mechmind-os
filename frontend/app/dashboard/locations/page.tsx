'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/pagination';
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

const colors = {
  bg: '#1a1a1a',
  surface: '#2f2f2f',
  surfaceHover: '#383838',
  border: '#4e4e4e',
  borderSubtle: '#3a3a3a',
  textPrimary: '#ffffff',
  textSecondary: '#b4b4b4',
  textTertiary: '#888888',
  textMuted: '#666666',
  accent: '#ffffff',
  success: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
  info: '#60a5fa',
  purple: '#a78bfa',
  glow: 'rgba(255,255,255,0.03)',
  glowStrong: 'rgba(255,255,255,0.06)',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
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
    <div className='min-h-screen' style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <header
        className='sticky top-0 z-30 backdrop-blur-xl border-b'
        style={{
          backgroundColor: `${colors.bg}cc`,
          borderColor: colors.borderSubtle,
        }}
      >
        <div className='px-8 py-5 flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <Link href='/dashboard'>
              <button
                className='w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:bg-white/5'
                style={{ color: colors.textSecondary }}
              >
                <ArrowLeft className='h-5 w-5' />
              </button>
            </Link>
            <div>
              <h1 className='text-[28px] font-light' style={{ color: colors.textPrimary }}>
                Sedi
              </h1>
              <p className='text-[13px]' style={{ color: colors.textTertiary }}>
                Gestisci le tue sedi
              </p>
            </div>
          </div>
          <button
            onClick={() => openDialog()}
            className='h-10 px-4 rounded-full flex items-center gap-2 text-sm font-medium'
            style={{ backgroundColor: colors.accent, color: colors.bg }}
          >
            <Plus className='h-4 w-4' />
            Nuova Sede
          </button>
        </div>
      </header>

      <motion.div className='p-8 space-y-6' initial='hidden' animate='visible' variants={containerVariants}>
        {/* Stats Overview */}
        <motion.div className='grid grid-cols-1 sm:grid-cols-4 gap-4' variants={containerVariants}>
          {[
            { label: 'Sedi Totali', value: String(locations.length), icon: Building2, color: colors.info },
            {
              label: 'Fatturato Totale',
              value: `${(locations.reduce((s, l) => s + l.revenue.month, 0) / 1000).toFixed(1)}k`,
              icon: Euro,
              color: colors.success,
            },
            {
              label: 'Tecnici',
              value: String(locations.reduce((s, l) => s + l.technicians, 0)),
              icon: Users,
              color: colors.purple,
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
              color: colors.warning,
            },
          ].map(stat => (
            <motion.div key={stat.label} variants={itemVariants}>
              <div
                className='rounded-2xl border h-[120px] flex flex-col justify-center px-6'
                style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
              >
                <div className='flex items-center gap-3 mb-2'>
                  <stat.icon className='h-5 w-5' style={{ color: stat.color }} />
                  <span className='text-[13px]' style={{ color: colors.textTertiary }}>
                    {stat.label}
                  </span>
                </div>
                <p
                  className='text-[32px] font-light'
                  style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}
                >
                  {stat.label === 'Fatturato Totale' ? `\u20AC${stat.value}` : stat.value}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Tabs */}
        <motion.div variants={itemVariants}>
          <div className='flex justify-center flex-wrap gap-2'>
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className='h-10 px-4 rounded-full text-sm font-medium transition-colors'
                style={
                  activeTab === tab.key
                    ? { backgroundColor: colors.accent, color: colors.bg }
                    : { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border, color: colors.textPrimary }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tab: Locations */}
        {activeTab === 'locations' && (
          <>
            {/* Search */}
            <motion.div variants={itemVariants}>
              <div
                className='rounded-2xl border p-4'
                style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
              >
                <div className='relative'>
                  <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5' style={{ color: colors.textMuted }} />
                  <input
                    placeholder='Cerca sede per nome o citta...'
                    aria-label='Cerca sedi'
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className='w-full pl-12 h-12 rounded-xl border text-[14px] outline-none transition-colors focus:border-white/30'
                    style={{
                      backgroundColor: colors.glowStrong,
                      borderColor: colors.borderSubtle,
                      color: colors.textPrimary,
                    }}
                  />
                </div>
              </div>
            </motion.div>

            {/* Locations Grid */}
            {isLoading ? (
              <div className='flex items-center justify-center py-12'>
                <Loader2 className='h-8 w-8 animate-spin' style={{ color: colors.textTertiary }} />
              </div>
            ) : loadError ? (
              <div
                className='rounded-2xl border flex flex-col items-center justify-center py-12 text-center'
                style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
              >
                <AlertCircle className='h-12 w-12 mb-4' style={{ color: colors.textMuted }} />
                <p className='text-[14px]' style={{ color: colors.textTertiary }}>
                  Impossibile caricare le sedi
                </p>
                <button
                  className='mt-4 h-10 px-4 rounded-full text-sm transition-colors hover:bg-white/5'
                  style={{ color: colors.textPrimary }}
                  onClick={() => fetchLocations()}
                >
                  Riprova
                </button>
              </div>
            ) : filteredLocations.length === 0 ? (
              <div
                className='rounded-2xl border flex flex-col items-center justify-center py-12 text-center'
                style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
              >
                <Building2 className='h-12 w-12 mb-4' style={{ color: colors.textMuted }} />
                <p className='text-[14px]' style={{ color: colors.textTertiary }}>
                  Nessuna sede trovata. Aggiungi la prima sede per iniziare.
                </p>
              </div>
            ) : (
              <motion.div
                className='grid grid-cols-1 lg:grid-cols-3 gap-4'
                variants={containerVariants}
                initial='hidden'
                animate='visible'
              >
                {filteredLocations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(location => (
                  <motion.div key={location.id} variants={itemVariants}>
                    <div
                      className='rounded-2xl border p-5 transition-colors cursor-pointer'
                      style={{
                        backgroundColor: colors.surface,
                        borderColor: selectedLocation?.id === location.id ? colors.accent : colors.borderSubtle,
                      }}
                      onClick={() => setSelectedLocation(location)}
                    >
                      <div className='flex items-start justify-between mb-4'>
                        <div className='flex items-center gap-3'>
                          <div
                            className='w-12 h-12 rounded-2xl flex items-center justify-center'
                            style={{ backgroundColor: `${colors.info}15` }}
                          >
                            <Building2 className='h-6 w-6' style={{ color: colors.info }} />
                          </div>
                          <div>
                            <h3 className='text-[15px] font-medium' style={{ color: colors.textPrimary }}>
                              {location.name}
                            </h3>
                            <p className='text-[12px] flex items-center gap-1' style={{ color: colors.textTertiary }}>
                              <MapPin className='h-3 w-3' />
                              {location.city}
                            </p>
                          </div>
                        </div>
                        <div
                          className='w-2 h-2 rounded-full'
                          style={{ backgroundColor: location.isActive ? colors.success : colors.textMuted }}
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
                            className='text-center p-2 rounded-xl'
                            style={{ backgroundColor: colors.glowStrong }}
                          >
                            <p className='text-[10px]' style={{ color: colors.textTertiary }}>{rev.label}</p>
                            <p
                              className='text-[14px] font-medium'
                              style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}
                            >
                              {rev.value}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Car Count */}
                      <div className='flex items-center gap-4 mb-4'>
                        <div className='flex items-center gap-2'>
                          <Car className='h-4 w-4' style={{ color: colors.info }} />
                          <span className='text-[12px]' style={{ color: colors.textSecondary }}>
                            {location.carCount.inService} in servizio
                          </span>
                        </div>
                        <div className='flex items-center gap-2'>
                          <Star className='h-4 w-4' style={{ color: colors.warning }} />
                          <span
                            className='text-[12px]'
                            style={{ color: colors.textSecondary, fontVariantNumeric: 'tabular-nums' }}
                          >
                            {location.satisfaction} &#9733;
                          </span>
                        </div>
                      </div>

                      <div className='pt-4 border-t flex gap-2' style={{ borderColor: colors.borderSubtle }}>
                        <button
                          className='flex-1 h-9 rounded-full border text-[13px] transition-colors hover:bg-white/5'
                          style={{ borderColor: colors.border, color: colors.textPrimary }}
                          onClick={e => {
                            e.stopPropagation();
                            router.push(`/dashboard/locations/${location.id}`);
                          }}
                        >
                          Vedi
                        </button>
                        <button
                          className='flex-1 h-9 rounded-full text-[13px] transition-colors hover:bg-white/5'
                          style={{ color: colors.textSecondary }}
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedLocation(location);
                          }}
                        >
                          Seleziona
                        </button>
                      </div>
                    </div>
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
                <div
                  className='rounded-2xl border p-6'
                  style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
                >
                  <div className='flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6'>
                    <div className='flex items-center gap-4'>
                      <div
                        className='w-16 h-16 rounded-2xl flex items-center justify-center'
                        style={{ backgroundColor: `${colors.info}15` }}
                      >
                        <Building2 className='h-8 w-8' style={{ color: colors.info }} />
                      </div>
                      <div>
                        <h2 className='text-[20px] font-medium' style={{ color: colors.textPrimary }}>
                          {selectedLocation.name}
                        </h2>
                        <p className='text-[13px]' style={{ color: colors.textTertiary }}>
                          {selectedLocation.address}
                        </p>
                      </div>
                    </div>
                    <button
                      className='h-10 px-4 rounded-full flex items-center gap-2 text-sm font-medium'
                      style={{ backgroundColor: colors.accent, color: colors.bg }}
                    >
                      Modifica Sede
                    </button>
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
                        className='p-4 rounded-2xl text-center'
                        style={{ backgroundColor: colors.glowStrong }}
                      >
                        <p className='text-[11px] mb-1' style={{ color: colors.textTertiary }}>
                          {item.label}
                        </p>
                        <p
                          className='text-[20px] font-medium'
                          style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}
                        >
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* Tab: Comparison */}
        {activeTab === 'comparison' && (
          <motion.div variants={itemVariants}>
            <div
              className='rounded-2xl border'
              style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
            >
              <div className='px-6 py-4 border-b' style={{ borderColor: colors.borderSubtle }}>
                <h2 className='text-[17px] font-medium' style={{ color: colors.textPrimary }}>
                  Confronto Performance
                </h2>
              </div>
              <div className='p-6 space-y-4'>
                {locations.map(location => (
                  <div
                    key={location.id}
                    className='p-4 rounded-2xl'
                    style={{ backgroundColor: colors.glowStrong }}
                  >
                    <div className='flex items-center justify-between mb-3'>
                      <h3 className='text-[15px] font-medium' style={{ color: colors.textPrimary }}>
                        {location.name}
                      </h3>
                      <span
                        className='text-[15px] font-medium'
                        style={{ color: colors.info, fontVariantNumeric: 'tabular-nums' }}
                      >
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
                          <p className='text-[11px]' style={{ color: colors.textTertiary }}>
                            {stat.label}
                          </p>
                          <p
                            className='text-[14px] font-medium'
                            style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}
                          >
                            {stat.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab: Inventory */}
        {activeTab === 'inventory' && (
          <motion.div variants={itemVariants}>
            <div
              className='rounded-2xl border'
              style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
            >
              <div className='px-6 py-4 border-b' style={{ borderColor: colors.borderSubtle }}>
                <h2 className='text-[17px] font-medium' style={{ color: colors.textPrimary }}>
                  Magazzino Condiviso
                </h2>
              </div>
              <div className='p-6'>
                <div className='text-center py-12'>
                  <div
                    className='w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4'
                    style={{ backgroundColor: colors.glowStrong }}
                  >
                    <Wrench className='h-10 w-10' style={{ color: colors.textTertiary }} />
                  </div>
                  <h3 className='text-[17px] font-medium mb-2' style={{ color: colors.textPrimary }}>
                    Gestione Magazzino
                  </h3>
                  <p className='text-[13px] max-w-md mx-auto' style={{ color: colors.textTertiary }}>
                    Visualizza e trasferisci ricambi tra le tue sedi in tempo reale.
                  </p>
                  <button
                    className='mt-6 h-10 px-4 rounded-full text-sm font-medium'
                    style={{ backgroundColor: colors.accent, color: colors.bg }}
                  >
                    Visualizza Magazzino
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      <LocationDialog onSuccess={fetchLocations} />
    </div>
  );
}
