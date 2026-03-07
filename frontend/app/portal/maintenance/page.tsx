'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Wrench, Plus, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { AppleButton } from '@/components/ui/apple-button'
import { PortalPageWrapper } from '@/components/portal'
import { MaintenanceList } from '@/components/portal'
import { portalAuth } from '@/lib/auth/portal-auth'
import { MaintenanceSchedule, Customer } from '@/lib/types/portal'

// ============================================
// MOCK DATA
// ============================================

const mockMaintenance: MaintenanceSchedule[] = [
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
    description: 'Sostituzione olio, filtri aria/olio/abitacolo, controllo freni, sospensioni e livelli',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    dueMileage: 50000,
    estimatedCost: 350,
    priority: 'medium',
    status: 'due',
  },
  {
    id: 'm2',
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
    serviceType: 'Sostituzione gomme',
    description: 'Gomme anteriori usurate al 30%, necessaria sostituzione',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    estimatedCost: 480,
    priority: 'high',
    status: 'upcoming',
  },
  {
    id: 'm3',
    customerId: '1',
    vehicleId: 'v1',
    vehicle: {
      id: 'v1',
      customerId: '1',
      make: 'Volkswagen',
      model: 'Golf',
      year: 2020,
      licensePlate: 'AB123CD',
      mileage: 38000,
      fuelType: 'diesel',
    },
    serviceType: 'Cambio freni posteriori',
    description: 'Pastiglie freni posteriori al 20%',
    dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    dueMileage: 48000,
    estimatedCost: 220,
    priority: 'high',
    status: 'overdue',
  },
  {
    id: 'm4',
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
    serviceType: 'Tagliando 30.000 km',
    description: 'Tagliando ordinario completato',
    dueDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    dueMileage: 30000,
    estimatedCost: 280,
    priority: 'low',
    status: 'completed',
    completedAt: new Date(Date.now() - 182 * 24 * 60 * 60 * 1000),
    completedMileage: 29950,
  },
]

// ============================================
// MAIN COMPONENT
// ============================================

export default function PortalMaintenancePage() {
  const [maintenance, setMaintenance] = useState<MaintenanceSchedule[]>([])
  const [filteredMaintenance, setFilteredMaintenance] = useState<MaintenanceSchedule[]>([])
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'overdue'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [customer, setCustomer] = useState<Customer | null>(null)

  useEffect(() => {
    const loadData = async () => {
      const currentCustomer = null // TODO: Get from auth context
      setCustomer(currentCustomer)

      setTimeout(() => {
        setMaintenance(mockMaintenance)
        setFilteredMaintenance(mockMaintenance.filter(m => m.status !== 'completed'))
        setIsLoading(false)
      }, 500)
    }

    loadData()
  }, [])

  useEffect(() => {
    let filtered = maintenance
    if (filter !== 'all') {
      filtered = maintenance.filter(m => m.status === filter)
    }
    setFilteredMaintenance(filtered)
  }, [filter, maintenance])

  const stats = {
    upcoming: maintenance.filter(m => ['upcoming', 'due'].includes(m.status)).length,
    overdue: maintenance.filter(m => m.status === 'overdue').length,
    completed: maintenance.filter(m => m.status === 'completed').length,
  }

  const handleBookService = (id: string) => {
    console.log('Book service:', id)
  }

  const handleViewDetails = (id: string) => {
    console.log('View maintenance details:', id)
  }

  if (isLoading) {
    return (
      <PortalPageWrapper title="Manutenzione" customer={customer || undefined}>
        <div className="flex items-center justify-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-apple-blue border-t-transparent rounded-full"
          />
        </div>
      </PortalPageWrapper>
    )
  }

  return (
    <PortalPageWrapper 
      title="Manutenzione Programmata"
      subtitle="Gestisci le scadenze di manutenzione dei tuoi veicoli"
      customer={customer || undefined}
      action={
        <Link href="/portal/bookings/new">
          <AppleButton icon={<Plus className="h-4 w-4" />}>
            Prenota Servizio
          </AppleButton>
        </Link>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded-2xl">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-5 w-5 text-apple-blue" />
            <span className="text-2xl font-bold text-apple-blue">{stats.upcoming}</span>
          </div>
          <p className="text-sm text-apple-gray">In programma</p>
        </div>
        <div className="p-4 bg-red-50 rounded-2xl">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-5 w-5 text-apple-red" />
            <span className="text-2xl font-bold text-apple-red">{stats.overdue}</span>
          </div>
          <p className="text-sm text-apple-gray">In ritardo</p>
        </div>
        <div className="p-4 bg-green-50 rounded-2xl">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-5 w-5 text-apple-green" />
            <span className="text-2xl font-bold text-apple-green">{stats.completed}</span>
          </div>
          <p className="text-sm text-apple-gray">Completate</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 p-1 bg-white rounded-xl shadow-apple">
          {(['upcoming', 'all', 'completed', 'overdue'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${filter === f 
                  ? 'bg-apple-blue text-white shadow-sm' 
                  : 'text-apple-gray hover:text-apple-dark'
                }
              `}
            >
              {f === 'all' && 'Tutte'}
              {f === 'upcoming' && 'In programma'}
              {f === 'completed' && 'Completate'}
              {f === 'overdue' && 'In ritardo'}
            </button>
          ))}
        </div>
      </div>

      {/* Overdue Alert */}
      {stats.overdue > 0 && filter !== 'completed' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3"
        >
          <AlertTriangle className="h-5 w-5 text-apple-red flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-apple-red">
              Hai {stats.overdue} manutenzion{stats.overdue === 1 ? 'e' : 'i'} in ritardo
            </p>
            <p className="text-sm text-apple-red/80">
              Prenota al più presto per garantire la sicurezza del tuo veicolo
            </p>
          </div>
          <Link href="/portal/bookings/new">
            <AppleButton size="sm">Prenota Ora</AppleButton>
          </Link>
        </motion.div>
      )}

      {/* Maintenance List */}
      <MaintenanceList
        maintenances={filteredMaintenance}
        onBookService={handleBookService}
        onViewDetails={handleViewDetails}
      />
    </PortalPageWrapper>
  )
}
