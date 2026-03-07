'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { 
  AlertCircle, 
  Clock, 
  Calendar,
  Gauge,
  CheckCircle2,
  Wrench,
  Bell,
  AlertTriangle,
  Filter
} from 'lucide-react'
import { getMaintenanceAlertsByVehicleId } from '@/lib/mock/vehicles'
import { formatDate, cn } from '@/lib/utils'
import { MaintenanceAlert, MaintenanceAlertStatus, ServiceType } from '@/types/vehicles'

// Status Badge Component
function AlertStatusBadge({ status }: { status: MaintenanceAlertStatus }) {
  const config: Record<MaintenanceAlertStatus, { label: string; className: string; icon: React.ElementType }> = {
    due_soon: {
      label: 'In Scadenza',
      className: 'bg-status-pending/10 text-status-pending border-status-pending/20',
      icon: Clock,
    },
    overdue: {
      label: 'Scaduto',
      className: 'bg-status-urgent/10 text-status-urgent border-status-urgent/20',
      icon: AlertTriangle,
    },
    scheduled: {
      label: 'Programmato',
      className: 'bg-status-info/10 text-status-info border-status-info/20',
      icon: Calendar,
    },
    completed: {
      label: 'Completato',
      className: 'bg-status-ready/10 text-status-ready border-status-ready/20',
      icon: CheckCircle2,
    },
  }
  
  const { label, className, icon: Icon } = config[status]
  
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', className)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

// Priority Indicator
function PriorityIndicator({ priority }: { priority: MaintenanceAlert['priority'] }) {
  const config = {
    low: { label: 'Bassa', color: 'bg-gray-400' },
    medium: { label: 'Media', color: 'bg-status-pending' },
    high: { label: 'Alta', color: 'bg-status-warning' },
    critical: { label: 'Critica', color: 'bg-status-urgent' },
  }
  
  const { label, color } = config[priority]
  
  return (
    <div className="flex items-center gap-2">
      <div className={cn('h-2 w-2 rounded-full', color)} />
      <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
    </div>
  )
}

// Service Type Label
function ServiceTypeLabel({ type }: { type: ServiceType }) {
  const labels: Record<ServiceType, string> = {
    oil_change: 'Cambio Olio',
    tire_rotation: 'Cambio Gomme',
    brake_service: 'Freni',
    inspection: 'Controllo',
    diagnostic: 'Diagnosi',
    repair: 'Riparazione',
    maintenance: 'Manutenzione',
    other: 'Altro',
  }
  
  return (
    <span className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
      <Wrench className="h-4 w-4 text-brand-600" />
      {labels[type]}
    </span>
  )
}

// Alert Card Component
function AlertCard({ 
  alert, 
  onComplete 
}: { 
  alert: MaintenanceAlert
  onComplete: (id: string) => void 
}) {
  const isOverdue = alert.status === 'overdue'
  const isDueSoon = alert.status === 'due_soon'
  
  // Calculate progress percentage
  const progressPercent = useMemo(() => {
    if (!alert.dueKm) return null
    const progress = (alert.currentKm / alert.dueKm) * 100
    return Math.min(progress, 100)
  }, [alert.currentKm, alert.dueKm])
  
  return (
    <div 
      className={cn(
        "rounded-lg border bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800",
        isOverdue && "border-status-urgent/50 bg-status-urgent/5",
        isDueSoon && "border-status-pending/50 bg-status-pending/5"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <AlertStatusBadge status={alert.status} />
            <PriorityIndicator priority={alert.priority} />
          </div>
          
          <h4 className="mt-2 font-semibold text-gray-900 dark:text-white">
            {alert.title}
          </h4>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {alert.description}
          </p>
          
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <ServiceTypeLabel type={alert.serviceType} />
            
            {alert.dueDate && (
              <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="h-4 w-4" />
                {isOverdue ? 'Scaduto il' : 'Scade il'} {formatDate(alert.dueDate)}
              </span>
            )}
            
            {alert.dueKm && (
              <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                <Gauge className="h-4 w-4" />
                {alert.dueKm.toLocaleString()} km
                {alert.triggerType === 'both' && (
                  <span className="text-xs text-gray-400">
                    (attuale: {alert.currentKm.toLocaleString()} km)
                  </span>
                )}
              </span>
            )}
          </div>
          
          {/* Progress Bar for Mileage Alerts */}
          {progressPercent !== null && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Progresso</span>
                <span>{progressPercent.toFixed(0)}%</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all",
                    progressPercent >= 100 ? 'bg-status-urgent' : 
                    progressPercent >= 80 ? 'bg-status-pending' : 'bg-status-ready'
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
        
        <div className="ml-4 flex flex-col gap-2">
          {alert.status !== 'completed' && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onComplete(alert.id)}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Completa
            </Button>
          )}
          <Button size="sm" variant="ghost">
            Programma
          </Button>
        </div>
      </div>
    </div>
  )
}

interface MaintenanceAlertsProps {
  vehicleId: string
}

export function MaintenanceAlerts({ vehicleId }: MaintenanceAlertsProps) {
  const [filter, setFilter] = useState<'all' | MaintenanceAlertStatus>('all')
  const [completedAlerts, setCompletedAlerts] = useState<Set<string>>(new Set())
  
  const alerts = getMaintenanceAlertsByVehicleId(vehicleId)
  
  // Filter out completed alerts from the list
  const filteredAlerts = useMemo(() => {
    let filtered = alerts.filter(alert => !completedAlerts.has(alert.id))
    
    if (filter !== 'all') {
      filtered = filtered.filter(alert => alert.status === filter)
    }
    
    return filtered.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }, [alerts, filter, completedAlerts])
  
  const handleComplete = (id: string) => {
    setCompletedAlerts(prev => new Set(prev).add(id))
  }
  
  // Calculate stats
  const stats = useMemo(() => {
    const activeAlerts = alerts.filter(a => !completedAlerts.has(a.id))
    return {
      total: activeAlerts.length,
      overdue: activeAlerts.filter(a => a.status === 'overdue').length,
      dueSoon: activeAlerts.filter(a => a.status === 'due_soon').length,
      scheduled: activeAlerts.filter(a => a.status === 'scheduled').length,
    }
  }, [alerts, completedAlerts])
  
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-brand-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Totale Alert</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-status-urgent" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Scaduti</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-status-urgent">{stats.overdue}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-status-pending" />
            <span className="text-sm text-gray-600 dark:text-gray-400">In Scadenza</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-status-pending">{stats.dueSoon}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-status-info" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Programmati</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-status-info">{stats.scheduled}</p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtra:</span>
        {(['all', 'overdue', 'due_soon', 'scheduled'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              filter === status
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            )}
          >
            {status === 'all' ? 'Tutti' : (
              {
                overdue: 'Scaduti',
                due_soon: 'In Scadenza',
                scheduled: 'Programmati',
              }[status]
            )}
          </button>
        ))}
      </div>
      
      {/* Alerts List */}
      <div className="workshop-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Manutenzioni Programmate
          </h2>
          <Button size="sm">
            <Wrench className="mr-2 h-4 w-4" />
            Aggiungi Alert
          </Button>
        </div>
        
        {filteredAlerts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-status-ready" />
            <p className="text-gray-600 dark:text-gray-400">
              Nessuna manutenzione in scadenza!
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Tutti i servizi sono programmati o completati.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAlerts.map((alert) => (
              <AlertCard 
                key={alert.id} 
                alert={alert}
                onComplete={handleComplete}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Maintenance Schedule Info */}
      <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/10">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-200">
              Informazioni sulla Manutenzione
            </h4>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              Gli alert di manutenzione vengono generati automaticamente in base al chilometraggio 
              e alla data dell&apos;ultimo servizio. I tagliandi sono generalmente programmati ogni 
              15.000 km o 12 mesi, a seconda di quale condizione si verifica prima.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
