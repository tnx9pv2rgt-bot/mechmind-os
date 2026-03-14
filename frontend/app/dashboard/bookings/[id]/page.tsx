'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card'
import { AppleButton } from '@/components/ui/apple-button'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Phone,
  Mail,
  MessageCircle,
  Car,
  Wrench,
  CheckCircle2,
  X,
  Edit3,
  Printer,
  AlertCircle,
  Clock3,
  CheckCircle,
  FileText,
  History,
} from 'lucide-react'
import { useBooking, useUpdateBooking } from '@/hooks/useApi'

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }>; textColor: string }> = {
  pending: { label: 'In attesa', color: 'bg-amber-500', icon: Clock3, textColor: 'text-amber-600' },
  confirmed: { label: 'Confermato', color: 'bg-blue-500', icon: CheckCircle, textColor: 'text-blue-600' },
  in_progress: { label: 'In lavorazione', color: 'bg-green-500', icon: Wrench, textColor: 'text-green-600' },
  completed: { label: 'Completato', color: 'bg-zinc-500', icon: CheckCircle2, textColor: 'text-zinc-600' },
  cancelled: { label: 'Cancellato', color: 'bg-red-500', icon: X, textColor: 'text-red-600' },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } }
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-200 dark:bg-[#424242] rounded animate-pulse ${className}`} />
}

export default function BookingDetailPage() {
  const params = useParams()
  const bookingId = params.id as string
  const { data: booking, isLoading, error } = useBooking(bookingId)
  const updateBooking = useUpdateBooking()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-apple-light-gray dark:bg-[#353535] p-6 space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
          <div className="lg:col-span-6 space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
          <div className="lg:col-span-3 space-y-6">
            <Skeleton className="h-56" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-apple-light-gray dark:bg-[#353535] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-apple-gray dark:text-[#636366] mx-auto mb-4" />
          <h2 className="text-title-2 text-apple-dark dark:text-[#ececec] mb-2">Prenotazione non trovata</h2>
          <Link href="/dashboard/bookings">
            <AppleButton variant="secondary">Torna alle prenotazioni</AppleButton>
          </Link>
        </div>
      </div>
    )
  }

  const status = statusConfig[booking.status] || statusConfig.pending
  const StatusIcon = status.icon
  const scheduledDate = new Date(booking.scheduledAt)

  return (
    <div className="min-h-screen bg-apple-light-gray dark:bg-[#353535]">
      <header className="bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-b border-apple-border/20 dark:border-[#424242]/50">
        <div className="px-6 py-4">
          <Link href="/dashboard/bookings" className="flex items-center gap-2 text-apple-gray dark:text-[#636366] hover:text-apple-dark transition-colors mb-3">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Torna alle prenotazioni</span>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-headline text-apple-dark dark:text-[#ececec]">{booking.serviceName || booking.serviceCategory}</h1>
              <p className="text-apple-gray dark:text-[#636366] text-body mt-0.5">
                {booking.id.slice(0, 8)} • {booking.vehiclePlate} {booking.vehicleBrand || ''}
              </p>
            </div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${status.color} text-white font-medium`}>
              <StatusIcon className="h-4 w-4" />
              <span>{status.label}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* LEFT - Customer */}
          <div className="lg:col-span-3 space-y-6">
            <motion.div variants={cardVariants}>
              <AppleCard>
                <AppleCardContent>
                  <h2 className="text-title-3 font-semibold text-apple-dark dark:text-[#ececec] mb-4">Cliente</h2>
                  <div className="space-y-4">
                    <p className="text-title-2 text-apple-dark dark:text-[#ececec]">{booking.customerName}</p>
                    {booking.customerPhone && (
                      <div className="space-y-2 pt-2 border-t border-apple-border/20 dark:border-[#424242]">
                        <a href={`tel:${booking.customerPhone}`} className="flex items-center gap-3 text-body text-apple-dark dark:text-[#ececec] hover:text-apple-blue transition-colors">
                          <Phone className="h-4 w-4 text-apple-gray dark:text-[#636366]" />
                          {booking.customerPhone}
                        </a>
                      </div>
                    )}
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            <motion.div variants={cardVariants}>
              <AppleCard>
                <AppleCardContent>
                  <h2 className="text-title-3 font-semibold text-apple-dark dark:text-[#ececec] mb-4 flex items-center gap-2">
                    <Car className="h-5 w-5 text-apple-gray dark:text-[#636366]" />
                    Veicolo
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <p className="text-title-2 text-apple-dark dark:text-[#ececec]">
                        {booking.vehicleBrand || ''} {booking.vehicleModel || ''}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-apple-border/20 dark:border-[#424242]">
                      <div>
                        <p className="text-caption text-apple-gray dark:text-[#636366] uppercase tracking-wider">Targa</p>
                        <p className="text-body font-mono text-apple-dark dark:text-[#ececec]">{booking.vehiclePlate}</p>
                      </div>
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </div>

          {/* CENTER - Details */}
          <div className="lg:col-span-6 space-y-6">
            <motion.div variants={cardVariants}>
              <AppleCard>
                <AppleCardContent>
                  <h2 className="text-title-3 font-semibold text-apple-dark dark:text-[#ececec] mb-4">Dettagli Appuntamento</h2>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center gap-3 p-3 bg-apple-light-gray/50 dark:bg-[#353535] rounded-xl">
                      <div className="w-10 h-10 rounded-xl bg-apple-blue/10 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-apple-blue" />
                      </div>
                      <div>
                        <p className="text-caption text-apple-gray dark:text-[#636366]">Data</p>
                        <p className="text-body font-medium text-apple-dark dark:text-[#ececec]">
                          {scheduledDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-apple-light-gray/50 dark:bg-[#353535] rounded-xl">
                      <div className="w-10 h-10 rounded-xl bg-apple-purple/10 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-apple-purple" />
                      </div>
                      <div>
                        <p className="text-caption text-apple-gray dark:text-[#636366]">Orario</p>
                        <p className="text-body font-medium text-apple-dark dark:text-[#ececec]">
                          {scheduledDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-caption text-apple-gray dark:text-[#636366] uppercase tracking-wider mb-1">Servizio</p>
                      <p className="text-body text-apple-dark dark:text-[#ececec]">{booking.serviceName || booking.serviceCategory}</p>
                    </div>
                    {booking.notes && (
                      <div>
                        <p className="text-caption text-apple-gray dark:text-[#636366] uppercase tracking-wider mb-1">Note</p>
                        <p className="text-body text-apple-dark dark:text-[#ececec] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 p-3 rounded-xl">
                          {booking.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            <motion.div variants={cardVariants}>
              <AppleCard>
                <AppleCardContent>
                  <h2 className="text-title-3 font-semibold text-apple-dark dark:text-[#ececec] mb-4 flex items-center gap-2">
                    <History className="h-5 w-5 text-apple-gray dark:text-[#636366]" />
                    Cronologia
                  </h2>
                  <div className="relative">
                    <div className="absolute left-[19px] top-2 bottom-0 w-0.5 bg-apple-border/30 dark:bg-[#424242]" />
                    <div className="space-y-4">
                      <div className="flex items-start gap-4 relative">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 bg-green-100 dark:bg-green-900/30">
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="text-body text-apple-dark dark:text-[#ececec]">Prenotazione creata</p>
                          <span className="text-footnote text-apple-gray dark:text-[#636366]">
                            {new Date(booking.createdAt).toLocaleDateString('it-IT')} {new Date(booking.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      {booking.updatedAt !== booking.createdAt && (
                        <div className="flex items-start gap-4 relative">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 bg-blue-100 dark:bg-blue-900/30">
                            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 pt-1">
                            <p className="text-body text-apple-dark dark:text-[#ececec]">Ultimo aggiornamento</p>
                            <span className="text-footnote text-apple-gray dark:text-[#636366]">
                              {new Date(booking.updatedAt).toLocaleDateString('it-IT')} {new Date(booking.updatedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </div>

          {/* RIGHT - Actions */}
          <div className="lg:col-span-3 space-y-6">
            <motion.div variants={cardVariants}>
              <AppleCard>
                <AppleCardContent>
                  <h2 className="text-title-3 font-semibold text-apple-dark dark:text-[#ececec] mb-4">Azioni Rapide</h2>
                  <div className="space-y-3">
                    {booking.customerPhone && (
                      <a href={`https://wa.me/${booking.customerPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                        <AppleButton variant="secondary" className="w-full justify-start gap-3">
                          <MessageCircle className="h-5 w-5 text-green-500" />
                          WhatsApp Cliente
                        </AppleButton>
                      </a>
                    )}
                    <AppleButton variant="secondary" className="w-full justify-start gap-3">
                      <Edit3 className="h-5 w-5" />
                      Modifica Prenotazione
                    </AppleButton>
                    <AppleButton variant="secondary" className="w-full justify-start gap-3">
                      <Printer className="h-5 w-5" />
                      Stampa Ordine
                    </AppleButton>
                  </div>
                  <div className="pt-4 mt-4 border-t border-apple-border/20 dark:border-[#424242] space-y-2">
                    <AppleButton
                      className="w-full"
                      onClick={() => updateBooking.mutate({ id: bookingId, status: 'completed' })}
                      disabled={booking.status === 'completed' || updateBooking.isPending}
                    >
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Completa Lavoro
                    </AppleButton>
                    <AppleButton
                      variant="ghost"
                      className="w-full text-apple-red hover:text-apple-red hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => updateBooking.mutate({ id: bookingId, status: 'cancelled' })}
                      disabled={booking.status === 'cancelled' || updateBooking.isPending}
                    >
                      <X className="h-5 w-5 mr-2" />
                      Annulla Prenotazione
                    </AppleButton>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            <motion.div variants={cardVariants}>
              <AppleCard>
                <AppleCardContent>
                  <h2 className="text-title-3 font-semibold text-apple-dark dark:text-[#ececec] mb-4">Preventivo</h2>
                  <div className="space-y-3">
                    <div className="pt-3 flex items-center justify-between">
                      <span className="text-title-3 font-semibold text-apple-dark dark:text-[#ececec]">Costo Stimato</span>
                      <span className="text-title-2 font-bold text-apple-dark dark:text-[#ececec]">
                        {booking.estimatedCost
                          ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(booking.estimatedCost)
                          : '—'}
                      </span>
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
