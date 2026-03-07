'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Filter, TrendingUp } from 'lucide-react'
import { PortalPageWrapper } from '@/components/portal'
import { InspectionList } from '@/components/portal'
import { portalAuth } from '@/lib/auth/portal-auth'
import { CustomerInspection, Customer } from '@/lib/types/portal'

// ============================================
// MOCK DATA
// ============================================

const mockInspections: CustomerInspection[] = [
  {
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
      { 
        id: 'f1', 
        category: 'Tires', 
        severity: 'needs_attention', 
        description: 'Gomme anteriori usurate',
        recommendation: 'Sostituzione consigliata',
        estimatedCost: 400
      },
      { 
        id: 'f2', 
        category: 'Brakes', 
        severity: 'fair', 
        description: 'Freni posteriori da monitorare',
        recommendation: 'Controllo alla prossima visita'
      },
    ],
    photos: [
      { id: 'p1', url: '/photos/1.jpg', thumbnailUrl: '/photos/1-thumb.jpg', takenAt: new Date() },
      { id: 'p2', url: '/photos/2.jpg', thumbnailUrl: '/photos/2-thumb.jpg', takenAt: new Date() },
    ],
    pdfUrl: '/reports/inspection-1.pdf',
  },
  {
    id: 'i2',
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
    bookingId: 'b4',
    score: 9.2,
    status: 'approved',
    completedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    approvedAt: new Date(Date.now() - 179 * 24 * 60 * 60 * 1000),
    technicianName: 'Marco Verdi',
    summary: 'Veicolo in eccellenti condizioni. Tutti i sistemi funzionanti correttamente.',
    findings: [
      { 
        id: 'f3', 
        category: 'Engine', 
        severity: 'good', 
        description: 'Motore in perfette condizioni' 
      },
    ],
    photos: [],
    pdfUrl: '/reports/inspection-2.pdf',
  },
]

// ============================================
// MAIN COMPONENT
// ============================================

export default function PortalInspectionsPage() {
  const [inspections, setInspections] = useState<CustomerInspection[]>([])
  const [filteredInspections, setFilteredInspections] = useState<CustomerInspection[]>([])
  const [filter, setFilter] = useState<'all' | 'completed' | 'approved'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [customer, setCustomer] = useState<Customer | null>(null)

  useEffect(() => {
    const loadData = async () => {
      const currentCustomer = null // TODO: Get from auth context
      setCustomer(currentCustomer)

      setTimeout(() => {
        setInspections(mockInspections)
        setFilteredInspections(mockInspections)
        setIsLoading(false)
      }, 500)
    }

    loadData()
  }, [])

  useEffect(() => {
    let filtered = inspections
    if (filter !== 'all') {
      filtered = inspections.filter(i => i.status === filter)
    }
    setFilteredInspections(filtered)
  }, [filter, inspections])

  const averageScore = inspections.length > 0
    ? inspections.reduce((sum, i) => sum + i.score, 0) / inspections.length
    : 0

  const handleDownloadPDF = (id: string) => {
    console.log('Download PDF:', id)
  }

  const handleViewPhotos = (id: string) => {
    console.log('View photos:', id)
  }

  const handleShare = (id: string) => {
    console.log('Share:', id)
  }

  const handleViewDetails = (id: string) => {
    console.log('View details:', id)
  }

  if (isLoading) {
    return (
      <PortalPageWrapper title="Ispezioni" customer={customer || undefined}>
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
      title="Report di Ispezione"
      subtitle="Visualizza e scarica i report delle ispezioni effettuate"
      customer={customer || undefined}
    >
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-white rounded-2xl shadow-apple">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <FileText className="h-6 w-6 text-apple-blue" />
            </div>
            <div>
              <p className="text-2xl font-bold text-apple-dark">{inspections.length}</p>
              <p className="text-sm text-apple-gray">Ispezioni totali</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white rounded-2xl shadow-apple">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-apple-green" />
            </div>
            <div>
              <p className="text-2xl font-bold text-apple-dark">{averageScore.toFixed(1)}</p>
              <p className="text-sm text-apple-gray">Punteggio medio</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white rounded-2xl shadow-apple">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
              <Filter className="h-6 w-6 text-apple-purple" />
            </div>
            <div>
              <p className="text-2xl font-bold text-apple-dark">
                {inspections.filter(i => i.status === 'approved').length}
              </p>
              <p className="text-sm text-apple-gray">Approvate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2 p-1 bg-white rounded-xl shadow-apple">
          {(['all', 'completed', 'approved'] as const).map((f) => (
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
              {f === 'completed' && 'Completate'}
              {f === 'approved' && 'Approvate'}
            </button>
          ))}
        </div>
      </div>

      {/* Inspections List */}
      <InspectionList
        inspections={filteredInspections}
        onDownloadPDF={handleDownloadPDF}
        onViewPhotos={handleViewPhotos}
        onShare={handleShare}
        onViewDetails={handleViewDetails}
      />
    </PortalPageWrapper>
  )
}
