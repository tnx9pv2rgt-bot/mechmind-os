'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card'
import { AppleButton } from '@/components/ui/apple-button'
import { Input } from '@/components/ui/input'
import { Calendar, Clock, Search, Plus, Car, User, Wrench, ChevronRight } from 'lucide-react'
import Link from 'next/link'

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

const mockBookings = [
  { id: 'BK-001', customer: 'Mario Rossi', vehicle: 'Fiat Panda AB123CD', service: 'Tagliando', date: '2026-03-02', time: '14:30', status: 'confirmed', price: '€150' },
  { id: 'BK-002', customer: 'Laura Bianchi', vehicle: 'Ford Fiesta CD456EF', service: 'Cambio freni', date: '2026-03-02', time: '15:00', status: 'in-progress', price: '€280' },
  { id: 'BK-003', customer: 'Giuseppe Verdi', vehicle: 'BMW X3 GH789IJ', service: 'Diagnosi elettronica', date: '2026-03-02', time: '16:00', status: 'pending', price: '€80' },
  { id: 'BK-004', customer: 'Anna Neri', vehicle: 'Audi A4 KL012MN', service: 'Sostituzione olio', date: '2026-03-03', time: '09:00', status: 'confirmed', price: '€65' },
  { id: 'BK-005', customer: 'Roberto Marino', vehicle: 'VW Golf AB987CD', service: 'Cambio gomme', date: '2026-03-03', time: '10:30', status: 'confirmed', price: '€120' },
]

const statusColors: any = {
  'confirmed': 'bg-apple-green',
  'in-progress': 'bg-apple-blue',
  'pending': 'bg-apple-orange',
  'cancelled': 'bg-apple-red',
}

const statusLabels: any = {
  'confirmed': 'Confermato',
  'in-progress': 'In corso',
  'pending': 'In attesa',
  'cancelled': 'Annullato',
}

export default function BookingsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState('')

  const filteredBookings = mockBookings.filter(booking => 
    booking.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    booking.vehicle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    booking.service.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen">
      {/* Header */}
      <motion.header 
        variants={headerVariants} 
        initial="hidden" 
        animate="visible"
        className="bg-white/80 backdrop-blur-apple sticky top-0 z-40 border-b border-apple-border/20"
      >
        <div className="px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-headline text-apple-dark">Prenotazioni</h1>
            <p className="text-apple-gray text-body mt-1">Gestisci gli appuntamenti della tua officina</p>
          </div>
          <Link href="/dashboard/bookings/new">
            <AppleButton icon={<Plus className="h-4 w-4" />}>
              Nuova Prenotazione
            </AppleButton>
          </Link>
        </div>
      </motion.header>

      <div className="p-8 space-y-6">
        {/* Stats */}
        <motion.div 
          variants={containerVariants} 
          initial="hidden" 
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-4 gap-bento"
        >
          {[
            { label: 'Oggi', value: '12', icon: Calendar, color: 'bg-apple-blue' },
            { label: 'Questa settimana', value: '48', icon: Calendar, color: 'bg-apple-purple' },
            { label: 'In attesa', value: '5', icon: Clock, color: 'bg-apple-orange' },
            { label: 'Completate', value: '156', icon: Calendar, color: 'bg-apple-green' },
          ].map((stat) => (
            <motion.div key={stat.label} variants={cardVariants}>
              <AppleCard>
                <AppleCardContent className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-apple-gray text-sm">{stat.label}</p>
                    <p className="text-title-1 font-semibold text-apple-dark">{stat.value}</p>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Search and Filter */}
        <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.5 }}>
          <AppleCard>
            <AppleCardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-apple-gray" />
                  <Input
                    placeholder="Cerca per cliente, veicolo o servizio..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 rounded-xl border-2 border-black bg-white text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-gray-200"
                  />
                </div>
                <div className="flex gap-3">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="h-12 rounded-xl border-2 border-black bg-white text-gray-900 focus:border-black focus:ring-2 focus:ring-gray-200"
                  />
                  <AppleButton variant="secondary">Filtra</AppleButton>
                </div>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Bookings List */}
        <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.6 }}>
          <AppleCard>
            <AppleCardHeader>
              <h2 className="text-title-2 font-semibold text-apple-dark">Lista Prenotazioni</h2>
            </AppleCardHeader>
            <AppleCardContent>
              <div className="space-y-3">
                {filteredBookings.map((booking, index) => (
                  <motion.div 
                    key={booking.id}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className="group flex items-center justify-between p-5 rounded-2xl bg-apple-light-gray/30 hover:bg-white hover:shadow-apple transition-all duration-300"
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-1 h-14 rounded-full ${statusColors[booking.status]}`} />
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <p className="text-body font-semibold text-apple-dark">{booking.customer}</p>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white ${statusColors[booking.status]}`}>
                            {statusLabels[booking.status]}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-footnote text-apple-gray">
                          <span className="flex items-center gap-1">
                            <Car className="h-3.5 w-3.5" /> {booking.vehicle}
                          </span>
                          <span className="flex items-center gap-1">
                            <Wrench className="h-3.5 w-3.5" /> {booking.service}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-callout font-medium text-apple-dark">{booking.time}</p>
                        <p className="text-footnote text-apple-gray">{booking.date}</p>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <p className="text-body font-semibold text-apple-dark">{booking.price}</p>
                      </div>
                      <AppleButton variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="h-5 w-5" />
                      </AppleButton>
                    </div>
                  </motion.div>
                ))}
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </div>
    </div>
  )
}
