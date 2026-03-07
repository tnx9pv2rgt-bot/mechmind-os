'use client'

import { FinancialDashboard } from '@/components/invoices/financial-dashboard'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function FinancialPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 p-6 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2"
            onClick={() => router.push('/dashboard/invoices')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna alle Fatture
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Report Finanziari
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Analisi dettagliata delle performance finanziarie
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Report IVA
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Esporta
          </Button>
        </div>
      </div>

      <FinancialDashboard />
    </div>
  )
}
