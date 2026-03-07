'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card'
import { AppleButton } from '@/components/ui/apple-button'
import { Input } from '@/components/ui/input'
import { ClipboardCheck, Search, Plus, User, Car, Shield, Clock, CheckCircle2, AlertCircle, PlayCircle } from 'lucide-react'

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

const mockInspections = [
  { id: 'insp_001', plate: 'AB123CD', vehicle: 'BMW X5', customer: 'Mario Rossi', type: 'PRE_PURCHASE', status: 'completed', date: '04/03/2026', score: 8.5 },
  { id: 'insp_002', plate: 'EF456GH', vehicle: 'Audi A4', customer: 'Luigi Bianchi', type: 'PERIODIC', status: 'blockchain', date: '03/03/2026', score: 9.2 },
  { id: 'insp_003', plate: 'IJ789KL', vehicle: 'Fiat Panda', customer: 'Anna Verdi', type: 'PRE_SALE', status: 'in_progress', date: '04/03/2026', score: null },
  { id: 'insp_004', plate: 'MN012OP', vehicle: 'Mercedes CLA', customer: 'Roberto Marino', type: 'WARRANTY', status: 'pending', date: '05/03/2026', score: null },
  { id: 'insp_005', plate: 'QR345ST', vehicle: 'VW Golf', customer: 'Laura Bianchi', type: 'ACCIDENT', status: 'completed', date: '02/03/2026', score: 6.8 },
]

const statusConfig: any = {
  'completed': { color: 'bg-apple-green', icon: CheckCircle2, label: 'Completata' },
  'blockchain': { color: 'bg-apple-blue', icon: Shield, label: 'Blockchain' },
  'in_progress': { color: 'bg-apple-orange', icon: PlayCircle, label: 'In Corso' },
  'pending': { color: 'bg-apple-gray', icon: Clock, label: 'In Attesa' },
}

const typeLabels: any = {
  'PRE_PURCHASE': 'Pre-Acquisto',
  'PERIODIC': 'Periodica',
  'PRE_SALE': 'Pre-Vendita',
  'WARRANTY': 'Garanzia',
  'ACCIDENT': 'Incidente',
}

export default function InspectionsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [inspections] = useState(mockInspections)

  const filteredInspections = inspections.filter(inspection =>
    inspection.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inspection.vehicle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inspection.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inspection.id.toLowerCase().includes(searchQuery.toLowerCase())
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
            <h1 className="text-headline text-apple-dark">Ispezioni</h1>
            <p className="text-apple-gray text-body mt-1">Gestione ispezioni digitali AI + Blockchain</p>
          </div>
          <AppleButton 
            icon={<Plus className="h-4 w-4" />}
            onClick={() => router.push('/dashboard/inspections/new')}
          >
            Nuova Ispezione
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
            { label: 'Totali Ispezioni', value: '486', color: 'bg-apple-blue' },
            { label: 'In Corso', value: '12', color: 'bg-apple-orange' },
            { label: 'Completate', value: '45', color: 'bg-apple-green' },
            { label: 'Con Blockchain', value: '23', color: 'bg-purple-500' },
            { label: 'In Attesa', value: '8', color: 'bg-apple-gray' },
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
                  placeholder="Cerca per targa, veicolo, cliente o ID ispezione..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 rounded-xl border-2 border-black bg-white text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-gray-200"
                />
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Inspections Grid */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-bento"
        >
          {filteredInspections.map((inspection) => {
            const status = statusConfig[inspection.status]
            const StatusIcon = status.icon
            
            return (
              <motion.div key={inspection.id} variants={cardVariants}>
                <AppleCard hover>
                  <AppleCardContent>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-apple-light-gray flex items-center justify-center">
                          <ClipboardCheck className="h-6 w-6 text-apple-blue" />
                        </div>
                        <div>
                          <h3 className="text-body font-semibold text-apple-dark">{inspection.id}</h3>
                          <p className="text-footnote text-apple-gray">{inspection.vehicle} • {inspection.plate}</p>
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
                      <span>{inspection.customer}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-apple-border/20">
                      <div>
                        <p className="text-caption text-apple-gray">Tipo</p>
                        <p className="text-callout font-medium text-apple-dark">{typeLabels[inspection.type]}</p>
                      </div>
                      <div>
                        <p className="text-caption text-apple-gray">Data</p>
                        <p className="text-callout font-medium text-apple-dark">{inspection.date}</p>
                      </div>
                    </div>

                    {inspection.score && (
                      <div className="mt-4 pt-4 border-t border-apple-border/20">
                        <div className="flex items-center justify-between">
                          <span className="text-caption text-apple-gray">Score</span>
                          <span className={`text-title-2 font-semibold ${
                            inspection.score >= 9 ? 'text-apple-green' :
                            inspection.score >= 7 ? 'text-apple-orange' :
                            'text-apple-red'
                          }`}>
                            {inspection.score}/10
                          </span>
                        </div>
                      </div>
                    )}

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
