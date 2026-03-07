'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card'
import { AppleButton } from '@/components/ui/apple-button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Wrench
} from 'lucide-react'

const locations = [
  {
    id: 'LOC-001',
    name: 'Officina Milano Centro',
    address: 'Via Roma 123, 20121 Milano',
    city: 'Milano',
    phone: '+39 02 1234 5678',
    isActive: true,
    revenue: { today: 2450, week: 15200, month: 58400 },
    carCount: { inService: 8, waiting: 3, ready: 5 },
    aro: 186,
    satisfaction: 4.7,
    technicians: 5,
  },
  {
    id: 'LOC-002',
    name: 'Officina Roma Est',
    address: 'Via Napoli 456, 00100 Roma',
    city: 'Roma',
    phone: '+39 06 8765 4321',
    isActive: true,
    revenue: { today: 3200, week: 18500, month: 72300 },
    carCount: { inService: 12, waiting: 2, ready: 7 },
    aro: 201,
    satisfaction: 4.5,
    technicians: 8,
  },
  {
    id: 'LOC-003',
    name: 'Officina Torino',
    address: 'Via Torino 789, 10100 Torino',
    city: 'Torino',
    phone: '+39 011 1234 567',
    isActive: true,
    revenue: { today: 1850, week: 12300, month: 45600 },
    carCount: { inService: 6, waiting: 4, ready: 3 },
    aro: 165,
    satisfaction: 4.8,
    technicians: 4,
  },
]

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

const fadeInDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
}

const cardVariants = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  },
  hover: {
    scale: 1.02,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  }
}

const statsCardVariants = {
  initial: { opacity: 0, y: 20, scale: 0.9 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
}

const detailCardVariants = {
  initial: { opacity: 0, scale: 0.95, y: 30 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 80,
      damping: 20
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: -20,
    transition: {
      duration: 0.2
    }
  }
}

const comparisonItemVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
}

export default function LocationsPage() {
  const [selectedLocation, setSelectedLocation] = useState(locations[0])
  const [searchQuery, setSearchQuery] = useState('')

  const filteredLocations = locations.filter(loc =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.city.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen">
      {/* Header with animation */}
      <motion.header 
        className="bg-white/80 backdrop-blur-apple sticky top-0 z-40 border-b border-apple-border/20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          type: "spring",
          stiffness: 100,
          damping: 20
        }}
      >
        <div className="px-8 py-5 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <h1 className="text-headline text-apple-dark">Location</h1>
            <p className="text-apple-gray text-body mt-1">Gestisci le tue sedi</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <AppleButton icon={<Plus className="h-4 w-4" />}>
              Nuova Sede
            </AppleButton>
          </motion.div>
        </div>
      </motion.header>

      <div className="p-8 space-y-6">
        {/* Stats Overview with stagger animation */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-4 gap-bento"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {[
            { label: 'Sedi Totali', value: '4', icon: Building2, color: 'bg-apple-blue' },
            { label: 'Fatturato Totale', value: '€208.7k', icon: Euro, color: 'bg-apple-green' },
            { label: 'Tecnici', value: '17', icon: Users, color: 'bg-apple-purple' },
            { label: 'Veicoli/gg', value: '156', icon: Car, color: 'bg-apple-orange' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              variants={statsCardVariants}
              custom={index}
              whileHover={{ 
                scale: 1.03,
                transition: { type: "spring", stiffness: 400, damping: 25 }
              }}
            >
              <AppleCard>
                <AppleCardContent className="flex items-center gap-4">
                  <motion.div 
                    className={`w-12 h-12 rounded-2xl ${stat.color} flex items-center justify-center`}
                    whileHover={{ rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <stat.icon className="h-6 w-6 text-white" />
                  </motion.div>
                  <div>
                    <p className="text-title-1 font-semibold text-apple-dark">{stat.value}</p>
                    <p className="text-apple-gray text-sm">{stat.label}</p>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          ))}
        </motion.div>

        <Tabs defaultValue="locations" className="w-full">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <TabsList className="mb-6 bg-white p-1 rounded-2xl border border-apple-border/30 w-fit">
              <TabsTrigger value="locations" className="rounded-xl data-[state=active]:bg-apple-blue data-[state=active]:text-white px-6">
                Sedi
              </TabsTrigger>
              <TabsTrigger value="comparison" className="rounded-xl data-[state=active]:bg-apple-blue data-[state=active]:text-white px-6">
                Confronto
              </TabsTrigger>
              <TabsTrigger value="inventory" className="rounded-xl data-[state=active]:bg-apple-blue data-[state=active]:text-white px-6">
                Magazzino
              </TabsTrigger>
            </TabsList>
          </motion.div>

          <TabsContent value="locations" className="mt-0 space-y-6">
            {/* Search with animation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <AppleCard>
                <AppleCardContent>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-apple-gray" />
                    <Input
                      placeholder="Cerca sede per nome o città..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 h-12 rounded-xl border-2 border-black bg-white text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-gray-200"
                    />
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Locations Grid with stagger animation */}
            <motion.div 
              className="grid grid-cols-1 lg:grid-cols-3 gap-bento"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {filteredLocations.map((location, index) => (
                <motion.div
                  key={location.id}
                  variants={cardVariants}
                  custom={index}
                  whileHover="hover"
                  layoutId={`location-${location.id}`}
                >
                  <AppleCard 
                    hover 
                    className={selectedLocation?.id === location.id ? 'ring-2 ring-apple-blue' : ''}
                  >
                    <AppleCardContent>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <motion.div 
                            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center"
                            whileHover={{ rotate: 5, scale: 1.1 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <Building2 className="h-6 w-6 text-white" />
                          </motion.div>
                          <div>
                            <h3 className="text-body font-semibold text-apple-dark">{location.name}</h3>
                            <p className="text-footnote text-apple-gray flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {location.city}
                            </p>
                          </div>
                        </div>
                        <motion.div 
                          className={`w-2 h-2 rounded-full ${location.isActive ? 'bg-apple-green' : 'bg-apple-gray'}`}
                          animate={location.isActive ? {
                            scale: [1, 1.2, 1],
                            opacity: [1, 0.7, 1]
                          } : {}}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                      </div>

                      {/* Revenue Mini Stats */}
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <motion.div 
                          className="text-center p-2 bg-apple-light-gray/50 rounded-xl"
                          whileHover={{ scale: 1.05, backgroundColor: "rgba(0,0,0,0.05)" }}
                        >
                          <p className="text-caption text-apple-gray">Oggi</p>
                          <p className="text-callout font-semibold text-apple-dark">€{location.revenue.today.toLocaleString()}</p>
                        </motion.div>
                        <motion.div 
                          className="text-center p-2 bg-apple-light-gray/50 rounded-xl"
                          whileHover={{ scale: 1.05, backgroundColor: "rgba(0,0,0,0.05)" }}
                        >
                          <p className="text-caption text-apple-gray">Sett.</p>
                          <p className="text-callout font-semibold text-apple-dark">€{(location.revenue.week / 1000).toFixed(1)}k</p>
                        </motion.div>
                        <motion.div 
                          className="text-center p-2 bg-apple-light-gray/50 rounded-xl"
                          whileHover={{ scale: 1.05, backgroundColor: "rgba(0,0,0,0.05)" }}
                        >
                          <p className="text-caption text-apple-gray">Mese</p>
                          <p className="text-callout font-semibold text-apple-dark">€{(location.revenue.month / 1000).toFixed(1)}k</p>
                        </motion.div>
                      </div>

                      {/* Car Count */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-apple-blue" />
                          <span className="text-footnote text-apple-dark">{location.carCount.inService} in servizio</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-apple-orange" />
                          <span className="text-footnote text-apple-dark">{location.satisfaction} ★</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-apple-border/20">
                        <AppleButton 
                          variant="secondary" 
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

            {/* Selected Location Detail with animation */}
            {selectedLocation && (
              <motion.div
                key={selectedLocation.id}
                variants={detailCardVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                layoutId={`detail-${selectedLocation.id}`}
              >
                <AppleCard featured>
                  <AppleCardContent>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                      <motion.div 
                        className="flex items-center gap-4"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2, duration: 0.4 }}
                      >
                        <motion.div 
                          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center"
                          whileHover={{ rotate: 10, scale: 1.1 }}
                          transition={{ type: "spring", stiffness: 200 }}
                        >
                          <Building2 className="h-8 w-8 text-white" />
                        </motion.div>
                        <div>
                          <h2 className="text-title-1 font-semibold text-apple-dark">{selectedLocation.name}</h2>
                          <p className="text-body text-apple-gray">{selectedLocation.address}</p>
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
                      className="grid grid-cols-2 md:grid-cols-4 gap-4"
                      variants={staggerContainer}
                      initial="initial"
                      animate="animate"
                    >
                      {[
                        { label: 'ARO Medio', value: `€${selectedLocation.aro}` },
                        { label: 'Soddisfazione', value: `${selectedLocation.satisfaction} ★` },
                        { label: 'Tecnici', value: selectedLocation.technicians.toString() },
                        { label: 'Pronti', value: selectedLocation.carCount.ready.toString() },
                      ].map((item, index) => (
                        <motion.div 
                          key={item.label}
                          className="p-4 bg-apple-light-gray/50 rounded-2xl text-center"
                          variants={statsCardVariants}
                          custom={index}
                          whileHover={{ 
                            scale: 1.05,
                            backgroundColor: "rgba(0,0,0,0.06)"
                          }}
                        >
                          <p className="text-caption text-apple-gray mb-1">{item.label}</p>
                          <p className="text-title-2 font-bold text-apple-dark">{item.value}</p>
                        </motion.div>
                      ))}
                    </motion.div>
                  </AppleCardContent>
                </AppleCard>
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="comparison" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <AppleCard>
                <AppleCardHeader>
                  <h2 className="text-title-2 font-semibold text-apple-dark">Confronto Performance</h2>
                </AppleCardHeader>
                <AppleCardContent>
                  <motion.div 
                    className="space-y-4"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                  >
                    {locations.map((location, index) => (
                      <motion.div 
                        key={location.id} 
                        className="p-4 rounded-2xl bg-apple-light-gray/30"
                        variants={comparisonItemVariants}
                        custom={index}
                        whileHover={{ 
                          scale: 1.01,
                          backgroundColor: "rgba(0,0,0,0.05)"
                        }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-body font-semibold text-apple-dark">{location.name}</h3>
                          <motion.span 
                            className="text-title-3 font-bold text-apple-blue"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 + index * 0.1, duration: 0.3 }}
                          >
                            €{location.revenue.month.toLocaleString()}/mese
                          </motion.span>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-center">
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
                              <p className="text-caption text-apple-gray">{stat.label}</p>
                              <p className="text-callout font-semibold text-apple-dark">{stat.value}</p>
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

          <TabsContent value="inventory" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <AppleCard>
                <AppleCardHeader>
                  <h2 className="text-title-2 font-semibold text-apple-dark">Magazzino Condiviso</h2>
                </AppleCardHeader>
                <AppleCardContent>
                  <motion.div 
                    className="text-center py-12"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                  >
                    <motion.div 
                      className="w-20 h-20 rounded-2xl bg-apple-light-gray flex items-center justify-center mx-auto mb-4"
                      animate={{ 
                        rotate: [0, 5, -5, 0],
                        scale: [1, 1.05, 1]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <Wrench className="h-10 w-10 text-apple-gray" />
                    </motion.div>
                    <motion.h3 
                      className="text-title-2 font-semibold text-apple-dark mb-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      Gestione Magazzino
                    </motion.h3>
                    <motion.p 
                      className="text-body text-apple-gray max-w-md mx-auto"
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
                      <AppleButton className="mt-6">Visualizza Magazzino</AppleButton>
                    </motion.div>
                  </motion.div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
