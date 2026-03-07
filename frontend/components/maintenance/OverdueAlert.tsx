'use client'

import React, { useEffect, useState } from 'react'
import { AlertTriangle, X, Wrench, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OverdueItem {
  id: string
  type: string
  vehicle: {
    make: string
    model: string
    licensePlate: string | null
  }
  daysUntilDue: number
  nextDueKm: number
}

interface OverdueAlertProps {
  className?: string
  onDismiss?: () => void
}

export function OverdueAlert({ className, onDismiss }: OverdueAlertProps) {
  const [overdueItems, setOverdueItems] = useState<OverdueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    fetchOverdueItems()
  }, [])

  const fetchOverdueItems = async () => {
    try {
      const response = await fetch('/api/maintenance/overdue')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setOverdueItems(result.data.slice(0, 3)) // Show max 3 items
        }
      }
    } catch (error) {
      console.error('Failed to fetch overdue items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  if (!isVisible || loading || overdueItems.length === 0) {
    return null
  }

  const totalOverdue = overdueItems.length

  return (
    <div
      className={cn(
        'relative rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/50',
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-2 rounded-md p-1 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/50"
        aria-label="Dismiss alert"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-red-800 dark:text-red-200">
            Manutenzione in Ritardo
          </h3>
          
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">
            {totalOverdue === 1 
              ? 'C\'è 1 intervento di manutenzione scaduto.' 
              : `Ci sono ${totalOverdue} interventi di manutenzione scaduti.`}
          </p>

          <ul className="mt-3 space-y-2">
            {overdueItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300"
              >
                <Wrench className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="font-medium">
                  {item.vehicle.make} {item.vehicle.model}
                  {item.vehicle.licensePlate && ` (${item.vehicle.licensePlate})`}
                </span>
                <span className="text-red-600 dark:text-red-400">
                  - {getMaintenanceTypeLabel(item.type)}
                </span>
                <span className="ml-auto flex items-center gap-1 text-xs font-medium">
                  <Calendar className="h-3 w-3" />
                  {Math.abs(item.daysUntilDue)} giorni fa
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-3">
            <a
              href="/dashboard/maintenance"
              className="inline-flex items-center text-sm font-medium text-red-700 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              Vedi tutti gli interventi
              <svg
                className="ml-1 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function getMaintenanceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'OIL_CHANGE': 'Cambio Olio',
    'TIRE_ROTATION': 'Rotazione Pneumatici',
    'BRAKE_CHECK': 'Controllo Freni',
    'FILTER': 'Sostituzione Filtri',
    'INSPECTION': 'Ispezione Generale',
    'BELTS': 'Controllo Cinghie',
    'BATTERY': 'Controllo Batteria'
  }
  return labels[type] || type
}
