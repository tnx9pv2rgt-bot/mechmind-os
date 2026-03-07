'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Send,
  FileCheck,
  FileX,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileClock,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
// Types
export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'

export interface Quote {
  id: string
  number: string
  customer: {
    id: string
    name: string
    email: string
    phone?: string
  }
  vehicle?: {
    make: string
    model: string
    licensePlate: string
  }
  date: string
  expiryDate: string
  amount: number
  status: QuoteStatus
  items: QuoteItem[]
  notes?: string
  validForDays: number
  convertedToInvoiceId?: string
}

export interface QuoteItem {
  id: string
  description: string
  type: 'service' | 'parts' | 'labor'
  quantity: number
  unitPrice: number
  taxRate: number
}

// Mock data
const mockQuotes: Quote[] = [
  {
    id: 'quote-1',
    number: 'PREV-2024-001',
    customer: {
      id: 'cust-1',
      name: 'Mario Rossi',
      email: 'mario.rossi@email.it',
      phone: '+39 333 1234567',
    },
    vehicle: {
      make: 'Fiat',
      model: 'Panda',
      licensePlate: 'AB123CD',
    },
    date: '2024-03-15',
    expiryDate: '2024-04-15',
    amount: 450.0,
    status: 'approved',
    validForDays: 30,
    convertedToInvoiceId: 'inv-1',
    items: [
      { id: 'item-1', description: 'Tagliando completo', type: 'service', quantity: 1, unitPrice: 250, taxRate: 22 },
      { id: 'item-2', description: 'Filtro olio', type: 'parts', quantity: 1, unitPrice: 25, taxRate: 22 },
      { id: 'item-3', description: 'Olio motore 5W30', type: 'parts', quantity: 4, unitPrice: 35, taxRate: 22 },
    ],
  },
  {
    id: 'quote-2',
    number: 'PREV-2024-002',
    customer: {
      id: 'cust-2',
      name: 'Laura Bianchi',
      email: 'laura.bianchi@email.it',
      phone: '+39 333 7654321',
    },
    vehicle: {
      make: 'Ford',
      model: 'Fiesta',
      licensePlate: 'EF456GH',
    },
    date: '2024-03-18',
    expiryDate: '2024-04-17',
    amount: 890.5,
    status: 'sent',
    validForDays: 30,
    items: [
      { id: 'item-4', description: 'Sostituzione pastiglie freni anteriori', type: 'service', quantity: 1, unitPrice: 120, taxRate: 22 },
      { id: 'item-5', description: 'Pastiglie freni Brembo', type: 'parts', quantity: 1, unitPrice: 85, taxRate: 22 },
      { id: 'item-6', description: 'Dischi freno', type: 'parts', quantity: 2, unitPrice: 145, taxRate: 22 },
      { id: 'item-7', description: 'Manodopera', type: 'labor', quantity: 2.5, unitPrice: 50, taxRate: 22 },
    ],
  },
  {
    id: 'quote-3',
    number: 'PREV-2024-003',
    customer: {
      id: 'cust-4',
      name: 'Anna Neri',
      email: 'anna.neri@email.it',
    },
    vehicle: {
      make: 'Volkswagen',
      model: 'Golf',
      licensePlate: 'IJ789KL',
    },
    date: '2024-02-20',
    expiryDate: '2024-03-21',
    amount: 2100.0,
    status: 'expired',
    validForDays: 30,
    items: [
      { id: 'item-8', description: 'Sostituzione frizione completa', type: 'service', quantity: 1, unitPrice: 450, taxRate: 22 },
      { id: 'item-9', description: 'Kit frizione Valeo', type: 'parts', quantity: 1, unitPrice: 850, taxRate: 22 },
      { id: 'item-10', description: 'Volano bimassa', type: 'parts', quantity: 1, unitPrice: 420, taxRate: 22 },
      { id: 'item-11', description: 'Manodopera specialistica', type: 'labor', quantity: 6, unitPrice: 55, taxRate: 22 },
    ],
  },
  {
    id: 'quote-4',
    number: 'PREV-2024-004',
    customer: {
      id: 'cust-7',
      name: 'Roberto Blu',
      email: 'roberto.blu@email.it',
    },
    vehicle: {
      make: 'BMW',
      model: 'X3',
      licensePlate: 'MN012OP',
    },
    date: '2024-03-20',
    expiryDate: '2024-04-19',
    amount: 3200.0,
    status: 'draft',
    validForDays: 30,
    items: [
      { id: 'item-12', description: 'Revisione impianto frenante completo', type: 'service', quantity: 1, unitPrice: 350, taxRate: 22 },
      { id: 'item-13', description: 'Kit freni anteriori originali BMW', type: 'parts', quantity: 1, unitPrice: 680, taxRate: 22 },
      { id: 'item-14', description: 'Kit freni posteriori originali BMW', type: 'parts', quantity: 1, unitPrice: 520, taxRate: 22 },
      { id: 'item-15', description: 'Liquido freni DOT 4', type: 'parts', quantity: 2, unitPrice: 25, taxRate: 22 },
      { id: 'item-16', description: 'Manodopera', type: 'labor', quantity: 8, unitPrice: 65, taxRate: 22 },
    ],
  },
  {
    id: 'quote-5',
    number: 'PREV-2024-005',
    customer: {
      id: 'cust-8',
      name: 'Sofia Viola',
      email: 'sofia.viola@email.it',
    },
    vehicle: {
      make: 'Audi',
      model: 'A4',
      licensePlate: 'QR345ST',
    },
    date: '2024-03-10',
    expiryDate: '2024-04-09',
    amount: 580.0,
    status: 'rejected',
    validForDays: 30,
    notes: 'Cliente ha deciso di rimandare l\'intervento',
    items: [
      { id: 'item-17', description: 'Sostituzione ammortizzatori anteriori', type: 'service', quantity: 1, unitPrice: 180, taxRate: 22 },
      { id: 'item-18', description: 'Coppia ammortizzatori Bilstein', type: 'parts', quantity: 2, unitPrice: 145, taxRate: 22 },
      { id: 'item-19', description: 'Manodopera', type: 'labor', quantity: 2, unitPrice: 45, taxRate: 22 },
    ],
  },
  {
    id: 'quote-6',
    number: 'PREV-2024-006',
    customer: {
      id: 'cust-3',
      name: 'Giuseppe Verdi',
      email: 'g.verdi@email.it',
    },
    vehicle: {
      make: 'Mercedes',
      model: 'Classe C',
      licensePlate: 'UV678WX',
    },
    date: '2024-03-22',
    expiryDate: '2024-04-21',
    amount: 1450.0,
    status: 'sent',
    validForDays: 30,
    items: [
      { id: 'item-20', description: 'Tagliando 60.000 km', type: 'service', quantity: 1, unitPrice: 320, taxRate: 22 },
      { id: 'item-21', description: 'Filtri originali Mercedes (olio, aria, abitacolo)', type: 'parts', quantity: 1, unitPrice: 180, taxRate: 22 },
      { id: 'item-22', description: 'Olio motore sintetico 0W40', type: 'parts', quantity: 6, unitPrice: 35, taxRate: 22 },
      { id: 'item-23', description: 'Candele accensione', type: 'parts', quantity: 4, unitPrice: 45, taxRate: 22 },
      { id: 'item-24', description: 'Manodopera', type: 'labor', quantity: 3, unitPrice: 55, taxRate: 22 },
    ],
  },
]

// Status Badge Component
function StatusBadge({ status }: { status: QuoteStatus }) {
  const config = {
    draft: {
      label: 'Bozza',
      icon: FileClock,
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    },
    sent: {
      label: 'Inviato',
      icon: Send,
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    },
    approved: {
      label: 'Approvato',
      icon: FileCheck,
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    },
    rejected: {
      label: 'Rifiutato',
      icon: FileX,
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    },
    expired: {
      label: 'Scaduto',
      icon: AlertCircle,
      className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    },
  }

  const { label, icon: Icon, className } = config[status]

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  )
}

// Expiry Badge Component
function ExpiryBadge({ expiryDate, status }: { expiryDate: string; status: QuoteStatus }) {
  if (status === 'approved' || status === 'rejected') {
    return null
  }

  const daysUntilExpiry = Math.ceil(
    (new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  if (daysUntilExpiry < 0) {
    return (
      <span className="text-xs text-red-600 dark:text-red-400 font-medium">
        Scaduto
      </span>
    )
  }

  if (daysUntilExpiry <= 3) {
    return (
      <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
        Scade tra {daysUntilExpiry} gg
      </span>
    )
  }

  return (
    <span className="text-xs text-gray-500 dark:text-gray-400">
      Valido ancora {daysUntilExpiry} gg
    </span>
  )
}

// Stats Card Component
function StatsCard({
  title,
  amount,
  count,
  icon: Icon,
  color,
}: {
  title: string
  amount?: number
  count: number
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          {amount !== undefined && (
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(amount)}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {count} preventivi
          </p>
        </div>
        <div className={`rounded-lg p-3 ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  )
}

export default function QuotesPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  // Calculate stats
  const stats = useMemo(() => {
    const totalPending = mockQuotes
      .filter((q) => q.status === 'sent' || q.status === 'draft')
      .reduce((sum, q) => sum + q.amount, 0)

    const approved = mockQuotes
      .filter((q) => q.status === 'approved')
      .reduce((sum, q) => sum + q.amount, 0)

    return {
      totalPending,
      approved,
      draftCount: mockQuotes.filter((q) => q.status === 'draft').length,
      sentCount: mockQuotes.filter((q) => q.status === 'sent').length,
      approvedCount: mockQuotes.filter((q) => q.status === 'approved').length,
      rejectedCount: mockQuotes.filter((q) => q.status === 'rejected').length,
      expiredCount: mockQuotes.filter((q) => q.status === 'expired').length,
    }
  }, [])

  // Filter quotes
  const filteredQuotes = useMemo(() => {
    return mockQuotes.filter((quote) => {
      if (statusFilter !== 'all' && quote.status !== statusFilter) {
        return false
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          quote.number.toLowerCase().includes(query) ||
          quote.customer.name.toLowerCase().includes(query) ||
          quote.customer.email.toLowerCase().includes(query) ||
          quote.vehicle?.licensePlate.toLowerCase().includes(query) ||
          quote.vehicle?.make.toLowerCase().includes(query)
        )
      }

      return true
    })
  }, [searchQuery, statusFilter])

  const handleConvertToInvoice = (quoteId: string) => {
    console.log('Converting quote to invoice:', quoteId)
    // In production: call API to convert quote to invoice
  }

  const handleCreateQuote = (data: any) => {
    console.log('Creating quote:', data)
    setIsCreateDialogOpen(false)
    // In production: call API to create quote
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 -ml-2"
          onClick={() => router.push('/dashboard/invoices')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna alle Fatture
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Preventivi</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Gestisci preventivi e trasformali in fatture
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title="In Bozza"
          count={stats.draftCount}
          icon={FileClock}
          color="bg-gray-500"
        />
        <StatsCard
          title="Inviati"
          amount={stats.totalPending}
          count={stats.sentCount}
          icon={Send}
          color="bg-blue-500"
        />
        <StatsCard
          title="Approvati"
          amount={stats.approved}
          count={stats.approvedCount}
          icon={FileCheck}
          color="bg-green-500"
        />
        <StatsCard
          title="Rifiutati"
          count={stats.rejectedCount}
          icon={FileX}
          color="bg-red-500"
        />
        <StatsCard
          title="Scaduti"
          count={stats.expiredCount}
          icon={AlertCircle}
          color="bg-orange-500"
        />
      </div>

      {/* Actions Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Cerca preventivo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-10"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as QuoteStatus | 'all')}>
            <SelectTrigger className="w-40">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="draft">Bozza</SelectItem>
              <SelectItem value="sent">Inviato</SelectItem>
              <SelectItem value="approved">Approvato</SelectItem>
              <SelectItem value="rejected">Rifiutato</SelectItem>
              <SelectItem value="expired">Scaduto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuovo Preventivo
        </Button>
      </div>

      {/* Quotes Table */}
      <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">Numero</th>
                <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">Cliente</th>
                <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">Veicolo</th>
                <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">Data</th>
                <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">Scadenza</th>
                <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300 text-right">Importo</th>
                <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">Stato</th>
                <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300 text-center">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredQuotes.map((quote) => (
                <tr
                  key={quote.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {quote.number}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {quote.customer.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {quote.customer.email}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {quote.vehicle ? (
                      <div>
                        <p className="text-gray-900 dark:text-white">
                          {quote.vehicle.make} {quote.vehicle.model}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {quote.vehicle.licensePlate}
                        </p>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                    {formatDate(quote.date)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`text-gray-600 dark:text-gray-400 ${
                        quote.status === 'expired' ? 'text-red-600 dark:text-red-400' : ''
                      }`}>
                        {formatDate(quote.expiryDate)}
                      </span>
                      <ExpiryBadge expiryDate={quote.expiryDate} status={quote.status} />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(quote.amount)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={quote.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="ghost" size="icon-sm" title="Visualizza">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" title="Scarica PDF">
                        <Download className="h-4 w-4" />
                      </Button>
                      {quote.status === 'sent' && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Converti in fattura"
                          onClick={() => handleConvertToInvoice(quote.id)}
                        >
                          <FileCheck className="h-4 w-4" />
                        </Button>
                      )}
                      {quote.status === 'draft' && (
                        <Button variant="ghost" size="icon-sm" title="Invia">
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon-sm" title="Altro">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredQuotes.length === 0 && (
          <div className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="mt-4 text-gray-500 dark:text-gray-400">Nessun preventivo trovato</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Prova a modificare i filtri o crea un nuovo preventivo
            </p>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Mostrando {filteredQuotes.length} di {mockQuotes.length} preventivi
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
