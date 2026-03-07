'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Wrench, 
  AlertTriangle, 
  Calendar, 
  Clock,
  TrendingUp,
  Car,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MaintenanceSummary {
  total: number
  overdue: number
  dueSoon: number
  upcoming: number
  byVehicle: Record<string, {
    vehicleInfo: string
    total: number
    overdue: number
    upcoming: number
  }>
}

interface MaintenanceWidgetProps {
  className?: string
}

export function MaintenanceWidget({ className }: MaintenanceWidgetProps) {
  const [summary, setSummary] = useState<MaintenanceSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSummary()
  }, [])

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/maintenance?summary=true')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setSummary(result.data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch maintenance summary:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Wrench className="h-5 w-5" />
            Manutenzione
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
            <div className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!summary) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Wrench className="h-5 w-5" />
            Manutenzione
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Impossibile caricare i dati di manutenzione.
          </p>
        </CardContent>
      </Card>
    )
  }

  const vehicleEntries = Object.entries(summary.byVehicle).slice(0, 3)
  const hasIssues = summary.overdue > 0 || summary.dueSoon > 0

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Wrench className="h-5 w-5" />
            Manutenzione
          </CardTitle>
          {hasIssues && (
            <Badge 
              variant={summary.overdue > 0 ? 'destructive' : 'default'}
              className="text-xs"
            >
              {summary.overdue > 0 ? `${summary.overdue} in ritardo` : `${summary.dueSoon} a breve`}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats Grid */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <StatCard
            icon={AlertTriangle}
            value={summary.overdue}
            label="In ritardo"
            color="red"
          />
          <StatCard
            icon={Clock}
            value={summary.dueSoon}
            label="Entro 7gg"
            color="yellow"
          />
          <StatCard
            icon={Calendar}
            value={summary.upcoming}
            label="Entro 30gg"
            color="blue"
          />
        </div>

        {/* Vehicle List */}
        {vehicleEntries.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Per Veicolo
            </h4>
            {vehicleEntries.map(([vehicleId, vehicle]) => (
              <a
                key={vehicleId}
                href={`/dashboard/maintenance?vehicleId=${vehicleId}`}
                className="flex items-center gap-3 rounded-lg border border-gray-100 p-2 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <Car className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {vehicle.vehicleInfo}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {vehicle.total} manutenzioni
                  </p>
                </div>
                {vehicle.overdue > 0 && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0">
                    {vehicle.overdue}
                  </Badge>
                )}
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </a>
            ))}
          </div>
        )}

        {/* View All Link */}
        <a
          href="/dashboard/maintenance"
          className="mt-4 flex items-center justify-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Gestisci manutenzioni
          <ChevronRight className="h-4 w-4" />
        </a>
      </CardContent>
    </Card>
  )
}

interface StatCardProps {
  icon: React.ElementType
  value: number
  label: string
  color: 'red' | 'yellow' | 'blue' | 'green' | 'gray'
}

function StatCard({ icon: Icon, value, label, color }: StatCardProps) {
  const colorClasses = {
    red: 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950/50 dark:text-yellow-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-950/50 dark:text-green-400',
    gray: 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  }

  return (
    <div className={cn('rounded-lg p-2 text-center', colorClasses[color])}>
      <Icon className="mx-auto h-4 w-4 mb-1" />
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wide opacity-80">{label}</p>
    </div>
  )
}
