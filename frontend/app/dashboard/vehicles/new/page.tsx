'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function NewVehiclePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-6 dark:bg-gray-900">
      <div className="mx-auto max-w-4xl px-6">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Link href="/dashboard" className="hover:text-gray-900 dark:hover:text-white">
            Dashboard
          </Link>
          <span>/</span>
          <Link href="/dashboard/vehicles" className="hover:text-gray-900 dark:hover:text-white">
            Veicoli
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">Nuovo Veicolo</span>
        </nav>

        {/* Back Button */}
        <Link href="/dashboard/vehicles">
          <Button variant="outline" size="sm" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna alla lista
          </Button>
        </Link>

        {/* Placeholder */}
        <div className="rounded-xl border bg-white p-8 text-center dark:bg-gray-800">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Nuovo Veicolo</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Form in costruzione</p>
        </div>
      </div>
    </div>
  )
}
