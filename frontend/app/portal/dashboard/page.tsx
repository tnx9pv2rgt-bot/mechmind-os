'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Calendar,
  Wrench,
  FileText,
  Shield,
  ChevronRight,
  Plus,
  Car,
  Phone,
  MessageCircle,
  FileCheck,
  ArrowRight
} from 'lucide-react'
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card'
import { AppleButton } from '@/components/ui/apple-button'
import { PortalLayout } from '@/components/portal'
import { BookingCard, InspectionCard, MaintenanceItem, WarrantySummary } from '@/components/portal'
import { portalAuth } from '@/lib/auth/portal-auth'
import { DashboardData, Customer, Booking, CustomerInspection, MaintenanceSchedule, WarrantyInfo } from '@/lib/types/portal'

// ============================================
// MOCK DATA
// ============================================

const mockDashboardData: DashboardData = {
  customer: {
    id: '1',
    email: 'mario.rossi@email.it',
    firstName: 'Mario',
    lastName: 'Rossi',
    phone: '+39 333 1234567',
    createdAt: new Date(),
    updatedAt: new Date(),
    emailVerified: true,
    phoneVerified: true,
    marketingConsent: true,
    gdprConsent: true,
  },
  upcomingBooking: {
    id: 'b1',
    customerId: '1',
    vehicleId: 'v1',
    vehicle: {
      id: 'v1',
      customerId: '1',
      make: 'Volkswagen',
      model: 'Golf',
      year: 2020,
      licensePlate: 'AB123CD',
      mileage: 45000,
      fuelType: 'diesel',
    },
    status: 'confirmed',
    type: 'maintenance',
    scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    scheduledTime: '09:30',
    duration: 120,
    notes: 'Tagliando ordinario',
    createdAt: new Date(),
    updatedAt: new Date(),
    location: 'MechMind Milano - Via Roma 123',
  },
  maintenanceDue: [
    {
      id: 'm1',
      customerId: '1',
      vehicleId: 'v1',
      vehicle: {
        id: 'v1',
        customerId: '1',
        make: 'Volkswagen',
        model: 'Golf',
        year: 2020,
        licensePlate: 'AB123CD',
        mileage: 45000,
        fuelType: 'diesel',
      },
      serviceType: 'Tagliando completo',
      description: 'Sostituzione olio, filtri e controllo generale',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      dueMileage: 50000,
      estimatedCost: 350,
      priority: 'medium',
      status: 'due',
    },
  ],
  recentInspection: {
    id: 'i1',
    customerId: '1',
    vehicleId: 'v1',
    vehicle: {
      id: 'v1',
      customerId: '1',
      make: 'Volkswagen',
      model: 'Golf',
      year: 2020,
      licensePlate: 'AB123CD',
      mileage: 45000,
      fuelType: 'diesel',
    },
    bookingId: 'b2',
    score: 8.5,
    status: 'completed',
    completedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    technicianName: 'Luca Bianchi',
    summary: 'Veicolo in buone condizioni generali. Gomme anteriori al 30%, consigliata sostituzione entro 5,000 km. Freni posteriori da monitorare.',
    findings: [
      { id: 'f1', category: 'Tires', severity: 'needs_attention', description: 'Gomme anteriori usurate' },
      { id: 'f2', category: 'Brakes', severity: 'fair', description: 'Freni posteriori da monitorare' },
    ],
    photos: [],
  },
  warrantyStatus: {
    total: 2,
    active: 1,
    expiringSoon: 1,
    expired: 0,
  },
  recentDocuments: [],
  unreadNotifications: 3,
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function PortalDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [customer, setCustomer] = useState<Customer | null>(null)

  useEffect(() => {
    const loadDashboard = async () => {
      const auth = portalAuth
      const currentCustomer = null // TODO: Get from auth context
      setCustomer(currentCustomer)

      // In a real app, fetch from API
      // const response = await fetch('/api/portal/dashboard', {
      //   headers: auth.getAuthHeaders()
      // })
      // const data = await response.json()

      // Using mock data for now
      setTimeout(() => {
        setData(mockDashboardData)
        setIsLoading(false)
      }, 500)
    }

    loadDashboard()
  }, [])

  if (isLoading || !data) {
    return (
      <PortalLayout customer={customer || undefined}>
        <div className="p-8 flex items-center justify-center min-h-screen">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-apple-blue border-t-transparent rounded-full"
          />
        </div>
      </PortalLayout>
    )
  }

  const welcomeMessage = `Ciao, ${data.customer.firstName}!`
  const hasUpcomingBooking = !!data.upcomingBooking
  const hasMaintenanceDue = data.maintenanceDue.length > 0

  return (
    <PortalLayout customer={data.customer}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-apple-dark">{welcomeMessage}</h1>
          <p className="text-apple-gray mt-1">Ecco cosa c&apos;è di nuovo con i tuoi veicoli</p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 sm:mb-8"
        >
          <Link href="/portal/bookings/new">
            <div className="p-4 bg-apple-blue text-white rounded-2xl hover:shadow-apple-lg transition-all cursor-pointer group">
              <Calendar className="h-6 w-6 mb-2 opacity-80" />
              <p className="font-medium text-sm">Prenota</p>
              <p className="text-xs opacity-70">Appuntamento</p>
              <ArrowRight className="h-4 w-4 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
          
          <Link href="/portal/documents">
            <div className="p-4 bg-white rounded-2xl shadow-apple hover:shadow-apple-hover transition-all cursor-pointer group">
              <FileText className="h-6 w-6 mb-2 text-apple-blue" />
              <p className="font-medium text-sm text-apple-dark">Documenti</p>
              <p className="text-xs text-apple-gray">Fatture e report</p>
              <ArrowRight className="h-4 w-4 mt-2 text-apple-blue opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
          
          <Link href="/portal/maintenance">
            <div className="p-4 bg-white rounded-2xl shadow-apple hover:shadow-apple-hover transition-all cursor-pointer group">
              <Wrench className="h-6 w-6 mb-2 text-apple-orange" />
              <p className="font-medium text-sm text-apple-dark">Manutenzione</p>
              <p className="text-xs text-apple-gray">Scadenze</p>
              <ArrowRight className="h-4 w-4 mt-2 text-apple-orange opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
          
          <a href="tel:+390212345678" className="block">
            <div className="p-4 bg-white rounded-2xl shadow-apple hover:shadow-apple-hover transition-all cursor-pointer group">
              <Phone className="h-6 w-6 mb-2 text-apple-green" />
              <p className="font-medium text-sm text-apple-dark">Contatta</p>
              <p className="text-xs text-apple-gray">Assistenza</p>
              <ArrowRight className="h-4 w-4 mt-2 text-apple-green opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </a>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Upcoming Booking */}
            {hasUpcomingBooking && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-apple-dark">Prossima Prenotazione</h2>
                  <Link href="/portal/bookings" className="text-sm text-apple-blue hover:underline flex items-center gap-1">
                    Tutte <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
                <BookingCard booking={data.upcomingBooking!} compact />
              </motion.div>
            )}

            {/* Maintenance Due */}
            {hasMaintenanceDue && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-apple-dark">Manutenzione in Scadenza</h2>
                  <Link href="/portal/maintenance" className="text-sm text-apple-blue hover:underline flex items-center gap-1">
                    Tutte <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
                <MaintenanceItem maintenance={data.maintenanceDue[0]} compact />
              </motion.div>
            )}

            {/* Recent Inspection */}
            {data.recentInspection && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-apple-dark">Ultima Ispezione</h2>
                  <Link href="/portal/inspections" className="text-sm text-apple-blue hover:underline flex items-center gap-1">
                    Tutte <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
                <InspectionCard inspection={data.recentInspection} compact />
              </motion.div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Warranty Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <AppleCard>
                <AppleCardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
                        <Shield className="h-6 w-6 text-apple-green" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-apple-dark">Garanzie Attive</h2>
                        <p className="text-sm text-apple-gray">{data.warrantyStatus.total} polizze totali</p>
                      </div>
                    </div>
                    <Link href="/portal/warranty">
                      <AppleButton variant="ghost" size="sm">
                        Gestisci
                      </AppleButton>
                    </Link>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-green-50 rounded-xl">
                      <p className="text-2xl font-bold text-apple-green">{data.warrantyStatus.active}</p>
                      <p className="text-xs text-apple-gray">Attive</p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-xl">
                      <p className="text-2xl font-bold text-apple-orange">{data.warrantyStatus.expiringSoon}</p>
                      <p className="text-xs text-apple-gray">In scadenza</p>
                    </div>
                    <div className="text-center p-3 bg-gray-100 rounded-xl">
                      <p className="text-2xl font-bold text-apple-gray">{data.warrantyStatus.expired}</p>
                      <p className="text-xs text-apple-gray">Scadute</p>
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Vehicles Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <AppleCard>
                <AppleCardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                        <Car className="h-6 w-6 text-apple-blue" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-apple-dark">I tuoi veicoli</h2>
                        <p className="text-sm text-apple-gray">1 veicolo registrato</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-apple-light-gray/50 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center shadow-sm">
                        <Car className="h-7 w-7 text-apple-gray" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-apple-dark">Volkswagen Golf</p>
                        <p className="text-sm text-apple-gray">AB123CD • 45,000 km</p>
                      </div>
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Contact Support */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <AppleCard className="bg-gradient-to-br from-apple-blue to-apple-purple">
                <AppleCardContent className="p-5 text-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-semibold text-lg mb-1">Serve aiuto?</h2>
                      <p className="text-white/80 text-sm mb-4">
                        Il nostro team è disponibile per assisterti
                      </p>
                      <div className="flex gap-2">
                        <a 
                          href="tel:+390212345678"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-xl text-sm font-medium hover:bg-white/30 transition-colors"
                        >
                          <Phone className="h-4 w-4" />
                          Chiama
                        </a>
                        <a 
                          href="https://wa.me/390212345678"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-xl text-sm font-medium hover:bg-white/30 transition-colors"
                        >
                          <MessageCircle className="h-4 w-4" />
                          WhatsApp
                        </a>
                      </div>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                      <MessageCircle className="h-8 w-8" />
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}
