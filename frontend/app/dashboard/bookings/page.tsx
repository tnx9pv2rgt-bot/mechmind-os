'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card'
import { AppleButton } from '@/components/ui/apple-button'
import { Input } from '@/components/ui/input'
import { Calendar, Clock, Search, Plus, Car, Wrench, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useBookings } from '@/hooks/useApi'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }
  }
}

const headerVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
}

const statusColors: Record<string, string> = {
  'confirmed': 'bg-apple-green',
  'in_progress': 'bg-apple-blue',
  'in-progress': 'bg-apple-blue',
  'pending': 'bg-apple-orange',
  'cancelled': 'bg-apple-red',
  'completed': 'bg-apple-green',
}

const statusLabels: Record<string, string> = {
  'confirmed': 'Confermato',
  'in_progress': 'In corso',
  'in-progress': 'In corso',
  'pending': 'In attesa',
  'cancelled': 'Annullato',
  'completed': 'Completato',
}

function formatCurrency(value: number | undefined): string {
  if (!value) return '—'
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value)
}

export default function BookingsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const { data: bookingsData, isLoading, error } = useBookings({ search: searchQuery || undefined, date: selectedDate || undefined })

  const bookings = bookingsData?.data ?? []
  const total = bookingsData?.total ?? 0

  const today = bookings.filter(b => {
    const d = new Date(b.scheduledAt)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  }).length

  const pending = bookings.filter(b => b.status === 'pending').length
  const completed = bookings.filter(b => b.status === 'completed').length

  return (
    <div>
      <header
        className="bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-b border-apple-border/20 dark:border-[#424242]/50"
      >
        <div className="px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-headline text-apple-dark dark:text-[#ececec]">Prenotazioni</h1>
            <p className="text-apple-gray dark:text-[#636366] text-body mt-1">Gestisci gli appuntamenti della tua officina</p>
          </div>
          <Link href="/dashboard/bookings/new">
            <AppleButton icon={<Plus className="h-4 w-4" />}>
              Nuova Prenotazione
            </AppleButton>
          </Link>
        </div>
      </header>

      <div className="p-8 space-y-6">
        {/* Stats */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-4 gap-bento"
        >
          {[
            { label: 'Oggi', value: isLoading ? '—' : String(today), icon: Calendar, color: 'bg-apple-blue' },
            { label: 'Questa settimana', value: isLoading ? '—' : String(total), icon: Calendar, color: 'bg-apple-purple' },
            { label: 'In attesa', value: isLoading ? '—' : String(pending), icon: Clock, color: 'bg-apple-orange' },
            { label: 'Completate', value: isLoading ? '—' : String(completed), icon: Calendar, color: 'bg-apple-green' },
          ].map((stat) => (
            <motion.div key={stat.label} variants={cardVariants}>
              <AppleCard>
                <AppleCardContent className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-apple-gray dark:text-[#636366] text-sm">{stat.label}</p>
                    <p className="text-title-1 font-semibold text-apple-dark dark:text-[#ececec]">{stat.value}</p>
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
                    className="pl-12 h-12 rounded-xl border-2 border-black dark:border-[#424242] bg-white dark:bg-[#2f2f2f] text-gray-900 dark:text-[#ececec] placeholder:text-gray-400 dark:placeholder:text-[#6e6e6e] focus:border-black dark:focus:border-[#ececec] focus:ring-2 focus:ring-gray-200 dark:focus:ring-[#424242]"
                  />
                </div>
                <div className="flex gap-3">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="h-12 rounded-xl border-2 border-black dark:border-[#424242] bg-white dark:bg-[#2f2f2f] text-gray-900 dark:text-[#ececec] focus:border-black dark:focus:border-[#ececec] focus:ring-2 focus:ring-gray-200 dark:focus:ring-[#424242]"
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
              <h2 className="text-title-2 font-semibold text-apple-dark dark:text-[#ececec]">Lista Prenotazioni</h2>
            </AppleCardHeader>
            <AppleCardContent>
              <div className="space-y-3">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-apple-light-gray/30 dark:bg-[#353535] animate-pulse">
                      <div className="flex items-center gap-5">
                        <div className="w-1 h-14 rounded-full bg-gray-200 dark:bg-[#424242]" />
                        <div>
                          <div className="w-32 h-4 bg-gray-200 dark:bg-[#424242] rounded mb-2" />
                          <div className="w-48 h-3 bg-gray-200 dark:bg-[#424242] rounded" />
                        </div>
                      </div>
                      <div className="w-20 h-4 bg-gray-200 dark:bg-[#424242] rounded" />
                    </div>
                  ))
                ) : error ? (
                  <div className="text-center py-8 text-apple-gray dark:text-[#636366]">
                    <p>Impossibile caricare le prenotazioni. Riprova.</p>
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="text-center py-8 text-apple-gray dark:text-[#636366]">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nessuna prenotazione trovata</p>
                  </div>
                ) : (
                  bookings.map((booking) => (
                    <Link href={`/dashboard/bookings/${booking.id}`} key={booking.id}>
                      <motion.div
                        whileHover={{ x: 4 }}
                        className="group flex items-center justify-between p-5 rounded-2xl bg-apple-light-gray/30 dark:bg-[#353535] hover:bg-white dark:hover:bg-[#353535] hover:shadow-apple transition-all duration-300 cursor-pointer"
                      >
                        <div className="flex items-center gap-5">
                          <div className={`w-1 h-14 rounded-full ${statusColors[booking.status] || 'bg-apple-gray'}`} />
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <p className="text-body font-semibold text-apple-dark dark:text-[#ececec]">{booking.customerName}</p>
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white ${statusColors[booking.status] || 'bg-apple-gray'}`}>
                                {statusLabels[booking.status] || booking.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-footnote text-apple-gray dark:text-[#636366]">
                              <span className="flex items-center gap-1">
                                <Car className="h-3.5 w-3.5" /> {booking.vehiclePlate} {booking.vehicleBrand && `${booking.vehicleBrand} ${booking.vehicleModel || ''}`}
                              </span>
                              <span className="flex items-center gap-1">
                                <Wrench className="h-3.5 w-3.5" /> {booking.serviceName || booking.serviceCategory}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-8">
                          <div className="text-right">
                            <p className="text-callout font-medium text-apple-dark dark:text-[#ececec]">
                              {new Date(booking.scheduledAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-footnote text-apple-gray dark:text-[#636366]">
                              {new Date(booking.scheduledAt).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                          <div className="text-right min-w-[80px]">
                            <p className="text-body font-semibold text-apple-dark dark:text-[#ececec]">{formatCurrency(booking.estimatedCost)}</p>
                          </div>
                          <AppleButton variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight className="h-5 w-5" />
                          </AppleButton>
                        </div>
                      </motion.div>
                    </Link>
                  ))
                )}
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </div>
    </div>
  )
}
