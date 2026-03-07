'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card'
import { AppleButton } from '@/components/ui/apple-button'
import { Input } from '@/components/ui/input'
import { Car, Search, Plus, User, Wrench, AlertCircle, CheckCircle2 } from 'lucide-react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    }
  }
}

const cardVariants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.95
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1]
    }
  }
}

const headerVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' }
  }
}

const mockCustomers = [
  { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Mario Rossi' },
  { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Laura Bianchi' },
  { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Giuseppe Verdi' },
  { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Anna Neri' },
  { id: '550e8400-e29b-41d4-a716-446655440004', name: 'Roberto Marino' },
]

const mockVehicles = [
  { id: '1', plate: 'AB123CD', make: 'Fiat', model: 'Panda', year: 2019, owner: 'Mario Rossi', status: 'in-service', lastService: '15/02/2026', nextService: '15/08/2026' },
  { id: '2', plate: 'CD456EF', make: 'Ford', model: 'Fiesta', year: 2020, owner: 'Laura Bianchi', status: 'ready', lastService: '20/02/2026', nextService: '20/08/2026' },
  { id: '3', plate: 'GH789IJ', make: 'BMW', model: 'X3', year: 2021, owner: 'Giuseppe Verdi', status: 'waiting-parts', lastService: '10/01/2026', nextService: '10/07/2026' },
  { id: '4', plate: 'KL012MN', make: 'Audi', model: 'A4', year: 2018, owner: 'Anna Neri', status: 'ready', lastService: '25/02/2026', nextService: '25/08/2026' },
  { id: '5', plate: 'OP345QR', make: 'VW', model: 'Golf', year: 2022, owner: 'Roberto Marino', status: 'urgent', lastService: '01/12/2025', nextService: '01/03/2026' },
]

const statusConfig: any = {
  'ready': { color: 'bg-apple-green', icon: CheckCircle2, label: 'Pronto' },
  'in-service': { color: 'bg-apple-blue', icon: Wrench, label: 'In lavorazione' },
  'waiting-parts': { color: 'bg-apple-orange', icon: AlertCircle, label: 'Attesa ricambi' },
  'urgent': { color: 'bg-apple-red', icon: AlertCircle, label: 'Urgente' },
}

export default function VehiclesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [vehicles, setVehicles] = useState(mockVehicles)

  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.owner.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen">
      {/* Header */}
      <motion.header 
        initial="hidden"
        animate="visible"
        variants={headerVariants}
        className="bg-white/80 backdrop-blur-apple sticky top-0 z-40 border-b border-apple-border/20"
      >
        <div className="px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-headline text-apple-dark">Veicoli</h1>
            <p className="text-apple-gray text-body mt-1">Gestisci il parco veicoli dei tuoi clienti</p>
          </div>
          <AppleButton icon={<Plus className="h-4 w-4" />}>
            Nuovo Veicolo
          </AppleButton>
        </div>
      </motion.header>

      <div className="p-8 space-y-6">
        {/* Stats */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="grid grid-cols-1 sm:grid-cols-5 gap-bento"
        >
          {[
            { label: 'Totale Veicoli', value: '486', color: 'bg-apple-blue' },
            { label: 'In Officina', value: '18', color: 'bg-apple-orange' },
            { label: 'Pronti', value: '5', color: 'bg-apple-green' },
            { label: 'Attesa Ricambi', value: '3', color: 'bg-amber-400' },
            { label: 'Manutenzione Urgente', value: '2', color: 'bg-apple-red' },
          ].map((stat) => (
            <motion.div key={stat.label} variants={cardVariants}>
              <AppleCard>
                <AppleCardContent className="text-center">
                  <div className={`w-3 h-3 rounded-full ${stat.color} mx-auto mb-2`} />
                  <p className="text-title-1 font-semibold text-apple-dark">{stat.value}</p>
                  <p className="text-footnote text-apple-gray">{stat.label}</p>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Search */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <AppleCard>
            <AppleCardContent>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-apple-gray" />
                <Input
                  placeholder="Cerca per targa, marca, modello o proprietario..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 rounded-xl border-2 border-black bg-white text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-gray-200"
                />
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Vehicles Grid */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-bento"
        >
          {filteredVehicles.map((vehicle) => {
            const status = statusConfig[vehicle.status]
            const StatusIcon = status.icon
            
            return (
              <motion.div key={vehicle.id} variants={cardVariants}>
                <AppleCard hover>
                  <AppleCardContent>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-apple-light-gray flex items-center justify-center">
                          <Car className="h-6 w-6 text-apple-blue" />
                        </div>
                        <div>
                          <h3 className="text-body font-semibold text-apple-dark">{vehicle.plate}</h3>
                          <p className="text-footnote text-apple-gray">{vehicle.make} {vehicle.model} • {vehicle.year}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${status.color}/10`}>
                        <StatusIcon className={`h-3.5 w-3.5 ${status.color.replace('bg-', 'text-')}`} />
                        <span className={`text-[10px] font-bold uppercase ${status.color.replace('bg-', 'text-')}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-footnote text-apple-gray mb-4">
                      <User className="h-4 w-4" />
                      <span>{vehicle.owner}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-apple-border/20">
                      <div>
                        <p className="text-caption text-apple-gray">Ultimo service</p>
                        <p className="text-callout font-medium text-apple-dark">{vehicle.lastService}</p>
                      </div>
                      <div>
                        <p className="text-caption text-apple-gray">Prossimo service</p>
                        <p className="text-callout font-medium text-apple-dark">{vehicle.nextService}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-apple-border/20">
                      <AppleButton variant="secondary" fullWidth>
                        Visualizza Dettagli
                      </AppleButton>
                    </div>
                  </AppleCardContent>
                </AppleCard>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}
