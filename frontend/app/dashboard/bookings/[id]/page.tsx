'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card'
import { AppleButton } from '@/components/ui/apple-button'
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Car,
  Wrench,
  CheckCircle2,
  X,
  Edit3,
  Printer,
  MoreVertical,
  AlertCircle,
  Clock3,
  CheckCircle,
  FileText,
  History
} from 'lucide-react'

// Mock booking data
const bookingData = {
  id: 'BK-001',
  status: 'in_progress',
  date: '2026-03-04',
  time: '14:30',
  duration: '1h 30m',
  service: 'Tagliando completo',
  serviceType: 'Manutenzione',
  priority: 'normal',
  notes: 'Cliente segnala rumore anomalo sospensione anteriore. Verificare ammortizzatori.',
  customer: {
    name: 'Mario Rossi',
    phone: '+39 333 123 4567',
    email: 'mario.rossi@email.it',
    address: 'Via Roma 45, 20121 Milano',
    customerSince: '2023',
    totalVisits: 12
  },
  vehicle: {
    make: 'Fiat',
    model: 'Panda',
    year: '2020',
    plate: 'AB123CD',
    vin: 'ZFA31200000012345',
    mileage: '45.230 km',
    lastService: '15/08/2025',
    color: 'Bianco'
  },
  financial: {
    estimated: 280,
    parts: 150,
    labor: 130,
    status: 'not_invoiced'
  },
  timeline: [
    { time: '14:30', event: 'Lavorazione iniziata', type: 'status', user: 'Tecnico Marco' },
    { time: '14:15', event: 'Veicolo posizionato in officina', type: 'system' },
    { time: '14:00', event: 'Cliente consegnato chiavi', type: 'checkin' },
    { time: '13:45', event: 'Promemoria inviato via SMS', type: 'notification' },
    { time: 'Ieri', event: 'Appuntamento confermato', type: 'system' },
    { time: '3 giorni fa', event: 'Prenotazione creata', type: 'system' }
  ]
}

const statusConfig = {
  pending: { label: 'In attesa', color: 'bg-amber-500', icon: Clock3, textColor: 'text-amber-600' },
  confirmed: { label: 'Confermato', color: 'bg-blue-500', icon: CheckCircle, textColor: 'text-blue-600' },
  in_progress: { label: 'In lavorazione', color: 'bg-green-500', icon: Wrench, textColor: 'text-green-600' },
  completed: { label: 'Completato', color: 'bg-zinc-500', icon: CheckCircle2, textColor: 'text-zinc-600' },
  cancelled: { label: 'Cancellato', color: 'bg-red-500', icon: X, textColor: 'text-red-600' }
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 30 }
  }
}

export default function BookingDetailPage() {
  const params = useParams()
  const bookingId = params.id as string
  const [activeTab, setActiveTab] = useState('details')
  
  const status = statusConfig[bookingData.status as keyof typeof statusConfig]
  const StatusIcon = status.icon

  return (
    <div className="min-h-screen bg-apple-light-gray">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-apple sticky top-0 z-40 border-b border-apple-border/20"
      >
        <div className="px-6 py-4">
          {/* Breadcrumb */}
          <Link href="/dashboard/bookings" className="flex items-center gap-2 text-apple-gray hover:text-apple-dark transition-colors mb-3">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Torna alle prenotazioni</span>
          </Link>

          {/* Title Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-headline text-apple-dark">{bookingData.service}</h1>
                <p className="text-apple-gray text-body mt-0.5">
                  {bookingData.id} • {bookingData.vehicle.make} {bookingData.vehicle.model}
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${status.color} text-white font-medium`}>
              <StatusIcon className="h-4 w-4" />
              <span>{status.label}</span>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="p-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* LEFT COLUMN - Customer & Vehicle */}
          <div className="lg:col-span-3 space-y-6">
            {/* Customer Card */}
            <motion.div variants={cardVariants}>
              <AppleCard>
                <AppleCardContent>
                  <h2 className="text-title-3 font-semibold text-apple-dark mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-apple-blue/10 flex items-center justify-center">
                      <span className="text-apple-blue font-bold text-sm">
                        {bookingData.customer.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    Cliente
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-title-2 text-apple-dark">{bookingData.customer.name}</p>
                      <p className="text-footnote text-apple-gray">Cliente dal {bookingData.customer.customerSince}</p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-apple-border/20">
                      <a href={`tel:${bookingData.customer.phone}`} className="flex items-center gap-3 text-body text-apple-dark hover:text-apple-blue transition-colors">
                        <Phone className="h-4 w-4 text-apple-gray" />
                        {bookingData.customer.phone}
                      </a>
                      <a href={`mailto:${bookingData.customer.email}`} className="flex items-center gap-3 text-body text-apple-dark hover:text-apple-blue transition-colors">
                        <Mail className="h-4 w-4 text-apple-gray" />
                        {bookingData.customer.email}
                      </a>
                      <div className="flex items-start gap-3 text-body text-apple-dark">
                        <MapPin className="h-4 w-4 text-apple-gray mt-0.5" />
                        <span className="text-sm">{bookingData.customer.address}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-apple-border/20">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-apple-gray">Visite totali</span>
                        <span className="font-semibold text-apple-dark">{bookingData.customer.totalVisits}</span>
                      </div>
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Vehicle Card */}
            <motion.div variants={cardVariants}>
              <AppleCard>
                <AppleCardContent>
                  <h2 className="text-title-3 font-semibold text-apple-dark mb-4 flex items-center gap-2">
                    <Car className="h-5 w-5 text-apple-gray" />
                    Veicolo
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-title-2 text-apple-dark">
                        {bookingData.vehicle.make} {bookingData.vehicle.model}
                      </p>
                      <p className="text-footnote text-apple-gray">
                        {bookingData.vehicle.year} • {bookingData.vehicle.color}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-apple-border/20">
                      <div>
                        <p className="text-caption text-apple-gray uppercase tracking-wider">Targa</p>
                        <p className="text-body font-mono text-apple-dark">{bookingData.vehicle.plate}</p>
                      </div>
                      <div>
                        <p className="text-caption text-apple-gray uppercase tracking-wider">KM</p>
                        <p className="text-body text-apple-dark">{bookingData.vehicle.mileage}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-caption text-apple-gray uppercase tracking-wider">VIN</p>
                        <p className="text-body font-mono text-xs text-apple-dark">{bookingData.vehicle.vin}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-apple-border/20">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-apple-gray">Ultimo tagliando</span>
                        <span className="text-apple-dark">{bookingData.vehicle.lastService}</span>
                      </div>
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </div>

          {/* CENTER COLUMN - Details & Timeline */}
          <div className="lg:col-span-6 space-y-6">
            {/* Appointment Details */}
            <motion.div variants={cardVariants}>
              <AppleCard>
                <AppleCardContent>
                  <h2 className="text-title-3 font-semibold text-apple-dark mb-4">Dettagli Appuntamento</h2>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center gap-3 p-3 bg-apple-light-gray/50 rounded-xl">
                      <div className="w-10 h-10 rounded-xl bg-apple-blue/10 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-apple-blue" />
                      </div>
                      <div>
                        <p className="text-caption text-apple-gray">Data</p>
                        <p className="text-body font-medium text-apple-dark">4 Marzo 2026</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-apple-light-gray/50 rounded-xl">
                      <div className="w-10 h-10 rounded-xl bg-apple-purple/10 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-apple-purple" />
                      </div>
                      <div>
                        <p className="text-caption text-apple-gray">Orario</p>
                        <p className="text-body font-medium text-apple-dark">{bookingData.time}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-caption text-apple-gray uppercase tracking-wider mb-1">Tipo Servizio</p>
                      <p className="text-body text-apple-dark">{bookingData.serviceType}</p>
                    </div>
                    
                    <div>
                      <p className="text-caption text-apple-gray uppercase tracking-wider mb-1">Note</p>
                      <p className="text-body text-apple-dark bg-amber-50 border border-amber-200 p-3 rounded-xl">
                        {bookingData.notes}
                      </p>
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Timeline */}
            <motion.div variants={cardVariants}>
              <AppleCard>
                <AppleCardContent>
                  <h2 className="text-title-3 font-semibold text-apple-dark mb-4 flex items-center gap-2">
                    <History className="h-5 w-5 text-apple-gray" />
                    Cronologia
                  </h2>
                  
                  <div className="relative">
                    {/* Timeline Line */}
                    <div className="absolute left-[19px] top-2 bottom-0 w-0.5 bg-apple-border/30" />
                    
                    <div className="space-y-4">
                      {bookingData.timeline.map((item, index) => (
                        <div key={index} className="flex items-start gap-4 relative">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                            item.type === 'status' ? 'bg-green-100' :
                            item.type === 'checkin' ? 'bg-blue-100' :
                            item.type === 'notification' ? 'bg-purple-100' :
                            'bg-zinc-100'
                          }`}>
                            {item.type === 'status' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                            {item.type === 'checkin' && <CheckCircle className="h-5 w-5 text-blue-600" />}
                            {item.type === 'notification' && <MessageCircle className="h-5 w-5 text-purple-600" />}
                            {item.type === 'system' && <Clock className="h-5 w-5 text-zinc-500" />}
                          </div>
                          <div className="flex-1 pt-1">
                            <p className="text-body text-apple-dark">{item.event}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-footnote text-apple-gray">{item.time}</span>
                              {item.user && (
                                <span className="text-footnote text-apple-blue">• {item.user}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </div>

          {/* RIGHT COLUMN - Actions & Financial */}
          <div className="lg:col-span-3 space-y-6">
            {/* Quick Actions */}
            <motion.div variants={cardVariants}>
              <AppleCard>
                <AppleCardContent>
                  <h2 className="text-title-3 font-semibold text-apple-dark mb-4">Azioni Rapide</h2>
                  
                  <div className="space-y-3">
                    <a href={`https://wa.me/${bookingData.customer.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                      <AppleButton variant="secondary" className="w-full justify-start gap-3">
                        <MessageCircle className="h-5 w-5 text-green-500" />
                        WhatsApp Cliente
                      </AppleButton>
                    </a>
                    
                    <AppleButton variant="secondary" className="w-full justify-start gap-3">
                      <Edit3 className="h-5 w-5" />
                      Modifica Prenotazione
                    </AppleButton>
                    
                    <AppleButton variant="secondary" className="w-full justify-start gap-3">
                      <Printer className="h-5 w-5" />
                      Stampa Ordine
                    </AppleButton>
                    
                    <AppleButton variant="secondary" className="w-full justify-start gap-3">
                      <FileText className="h-5 w-5" />
                      Aggiungi Nota
                    </AppleButton>
                  </div>

                  <div className="pt-4 mt-4 border-t border-apple-border/20 space-y-2">
                    <AppleButton className="w-full">
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Completa Lavoro
                    </AppleButton>
                    
                    <AppleButton variant="ghost" className="w-full text-apple-red hover:text-apple-red hover:bg-red-50">
                      <X className="h-5 w-5 mr-2" />
                      Annulla Prenotazione
                    </AppleButton>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Financial Summary */}
            <motion.div variants={cardVariants}>
              <AppleCard>
                <AppleCardContent>
                  <h2 className="text-title-3 font-semibold text-apple-dark mb-4">Preventivo</h2>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-body text-apple-gray">Ricambi</span>
                      <span className="text-body text-apple-dark">€{bookingData.financial.parts}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-body text-apple-gray">Manodopera</span>
                      <span className="text-body text-apple-dark">€{bookingData.financial.labor}</span>
                    </div>
                    <div className="pt-3 border-t border-apple-border/20 flex items-center justify-between">
                      <span className="text-title-3 font-semibold text-apple-dark">Totale Stimato</span>
                      <span className="text-title-2 font-bold text-apple-dark">€{bookingData.financial.estimated}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-apple-border/20">
                    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-xl">
                      <AlertCircle className="h-4 w-4" />
                      <span>Non ancora fatturato</span>
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
