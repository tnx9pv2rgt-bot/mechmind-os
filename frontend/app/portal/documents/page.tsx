'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Search, Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { PortalPageWrapper } from '@/components/portal'
import { DocumentList } from '@/components/portal'
import { portalAuth } from '@/lib/auth/portal-auth'
import { Document, Customer } from '@/lib/types/portal'

// ============================================
// MOCK DATA
// ============================================

const mockDocuments: Document[] = [
  {
    id: 'd1',
    customerId: '1',
    vehicleId: 'v1',
    type: 'invoice',
    documentNumber: 'FAT-2024-001',
    title: 'Fattura Tagliando Gennaio',
    description: 'Tagliando ordinario e sostituzione filtri',
    amount: 350.00,
    issueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    paidAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    fileUrl: '/docs/invoice-001.pdf',
    fileSize: 245760,
    fileType: 'application/pdf',
    status: 'paid',
  },
  {
    id: 'd2',
    customerId: '1',
    vehicleId: 'v1',
    type: 'inspection_report',
    documentNumber: 'ISP-2024-001',
    title: 'Report Ispezione Periodica',
    description: 'Ispezione completa del veicolo',
    issueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    fileUrl: '/docs/inspection-001.pdf',
    fileSize: 1843200,
    fileType: 'application/pdf',
    status: 'issued',
  },
  {
    id: 'd3',
    customerId: '1',
    type: 'maintenance_record',
    documentNumber: 'MAN-2024-001',
    title: 'Registro Manutenzione 2024',
    description: 'Storico interventi di manutenzione',
    issueDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    fileUrl: '/docs/maintenance-001.pdf',
    fileSize: 512000,
    fileType: 'application/pdf',
    status: 'issued',
  },
  {
    id: 'd4',
    customerId: '1',
    vehicleId: 'v1',
    type: 'warranty_claim',
    documentNumber: 'GAR-2024-001',
    title: 'Reclamo Garanzia Cambio',
    description: 'Intervento in garanzia sul cambio',
    amount: 0,
    issueDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    fileUrl: '/docs/warranty-001.pdf',
    fileSize: 368640,
    fileType: 'application/pdf',
    status: 'paid',
  },
]

// ============================================
// MAIN COMPONENT
// ============================================

export default function PortalDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'invoices' | 'maintenance' | 'inspections'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [customer, setCustomer] = useState<Customer | null>(null)

  useEffect(() => {
    const loadData = async () => {
      const currentCustomer = null // TODO: Get from auth context
      setCustomer(currentCustomer)

      setTimeout(() => {
        setDocuments(mockDocuments)
        setFilteredDocuments(mockDocuments)
        setIsLoading(false)
      }, 500)
    }

    loadData()
  }, [])

  useEffect(() => {
    let filtered = documents

    // Filter by tab
    if (activeTab !== 'all') {
      const typeMap = {
        invoices: ['invoice', 'receipt'],
        maintenance: ['maintenance_record'],
        inspections: ['inspection_report', 'warranty_claim'],
      }
      filtered = filtered.filter(d => typeMap[activeTab].includes(d.type))
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(d =>
        d.title.toLowerCase().includes(query) ||
        d.documentNumber.toLowerCase().includes(query)
      )
    }

    setFilteredDocuments(filtered)
  }, [activeTab, searchQuery, documents])

  const handleDownload = (id: string) => {
    console.log('Download document:', id)
  }

  const handleView = (id: string) => {
    console.log('View document:', id)
  }

  if (isLoading) {
    return (
      <PortalPageWrapper title="Documenti" customer={customer || undefined}>
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
      title="Documenti"
      subtitle="Fatture, ricevute e report di ispezione"
      customer={customer || undefined}
    >
      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-apple-gray" />
          <Input
            placeholder="Cerca per numero documento o titolo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-xl bg-white"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {[
          { key: 'all', label: 'Tutti' },
          { key: 'invoices', label: 'Fatture' },
          { key: 'maintenance', label: 'Manutenzione' },
          { key: 'inspections', label: 'Ispezioni' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`
              px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${activeTab === tab.key
                ? 'bg-apple-blue text-white shadow-apple'
                : 'bg-white text-apple-gray hover:text-apple-dark shadow-apple'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Documents List */}
      <DocumentList
        documents={filteredDocuments}
        onDownload={handleDownload}
        onView={handleView}
      />
    </PortalPageWrapper>
  )
}
