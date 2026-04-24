'use client'

import { motion } from 'framer-motion'
import { 
  Wrench,
  Calendar,
  Gauge,
  AlertTriangle,
  CheckCircle,
  Clock,
  AlertCircle,
  Car,
  ChevronRight
} from 'lucide-react'
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card'
import { AppleButton } from '@/components/ui/apple-button'
import { MaintenanceSchedule } from '@/lib/types/portal'

// ============================================
// PRIORITY CONFIG
// ============================================

const priorityConfig = {
  low: {
    label: 'Bassa',
    color: 'text-[var(--brand)]',
    bgColor: 'bg-[var(--status-info-subtle)]',
    borderColor: 'border-[var(--status-info-subtle)]',
    icon: Clock,
  },
  medium: {
    label: 'Media',
    color: 'text-[var(--status-warning)]',
    bgColor: 'bg-[var(--status-warning)]/5',
    borderColor: 'border-[var(--status-warning)]/20',
    icon: AlertCircle,
  },
  high: {
    label: 'Alta',
    color: 'text-[var(--status-error)]',
    bgColor: 'bg-[var(--status-error-subtle)]',
    borderColor: 'border-[var(--status-error-subtle)]',
    icon: AlertTriangle,
  },
  critical: {
    label: 'Critica',
    color: 'text-[var(--text-on-brand)]',
    bgColor: 'bg-[var(--status-error)]',
    borderColor: 'border-[var(--status-error)]',
    icon: AlertTriangle,
  },
}

const statusConfig = {
  upcoming: {
    label: 'In programma',
    color: 'text-[var(--brand)]',
    bgColor: 'bg-[var(--status-info-subtle)]',
  },
  due: {
    label: 'Scaduta',
    color: 'text-[var(--status-warning)]',
    bgColor: 'bg-[var(--status-warning)]/5',
  },
  overdue: {
    label: 'In ritardo',
    color: 'text-[var(--text-on-brand)]',
    bgColor: 'bg-[var(--status-error)]',
  },
  completed: {
    label: 'Completata',
    color: 'text-[var(--status-success)]',
    bgColor: 'bg-[var(--status-success-subtle)]',
  },
}

// ============================================
// PROPS
// ============================================

interface MaintenanceItemProps {
  maintenance: MaintenanceSchedule
  onBookService?: (id: string) => void
  onViewDetails?: (id: string) => void
  compact?: boolean
}

// ============================================
// MAIN COMPONENT
// ============================================

export function MaintenanceItem({ 
  maintenance, 
  onBookService,
  onViewDetails,
  compact = false
}: MaintenanceItemProps) {
  const priority = priorityConfig[maintenance.priority]
  const status = statusConfig[maintenance.status]
  const PriorityIcon = priority.icon

  const formattedDate = new Date(maintenance.dueDate).toLocaleDateString('it-IT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Calculate days until due
  const daysUntilDue = Math.ceil((new Date(maintenance.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const isUrgent = daysUntilDue <= 7 && maintenance.status !== 'completed'

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => onViewDetails?.(maintenance.id)}
        className="cursor-pointer"
      >
        <AppleCard className={isUrgent ? `border-2 ${priority.borderColor}` : ''}>
          <AppleCardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${priority.bgColor} flex items-center justify-center`}>
                <PriorityIcon className={`h-5 w-5 ${priority.color}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-[var(--text-primary)] text-sm truncate">
                    {maintenance.serviceType}
                  </p>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${status.bgColor} ${status.color}`}>
                    {status.label}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {maintenance.vehicle?.make} {maintenance.vehicle?.model}
                </p>
              </div>

              <div className="text-right">
                <p className={`text-sm font-medium ${isUrgent ? 'text-[var(--status-error)]' : 'text-[var(--text-primary)]'}`}>
                  {daysUntilDue === 0 
                    ? 'Oggi' 
                    : daysUntilDue < 0 
                      ? `${Math.abs(daysUntilDue)}g fa` 
                      : `${daysUntilDue}g`
                  }
                </p>
              </div>
            </div>
          </AppleCardContent>
        </AppleCard>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <AppleCard className={isUrgent ? `border-2 ${priority.borderColor}` : ''}>
        <AppleCardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-12 h-12 rounded-2xl ${priority.bgColor} flex items-center justify-center`}>
                <PriorityIcon className={`h-6 w-6 ${priority.color}`} />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    {maintenance.serviceType}
                  </h3>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                    {status.label}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-tertiary)]">
                  {maintenance.vehicle?.make} {maintenance.vehicle?.model} • {maintenance.vehicle?.licensePlate}
                </p>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${priority.bgColor} ${priority.color}`}>
              Priorità {priority.label}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-[var(--text-primary)] mb-4">
            {maintenance.description}
          </p>

          {/* Details */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <div className="flex items-center gap-2 p-3 bg-[var(--surface-secondary)]/50 rounded-xl">
              <Calendar className="h-4 w-4 text-[var(--brand)]" />
              <div>
                <p className="text-xs text-[var(--text-tertiary)]">Scadenza</p>
                <p className={`text-sm font-medium ${isUrgent ? 'text-[var(--status-error)]' : 'text-[var(--text-primary)]'}`}>
                  {formattedDate}
                </p>
              </div>
            </div>

            {maintenance.dueMileage && (
              <div className="flex items-center gap-2 p-3 bg-[var(--surface-secondary)]/50 rounded-xl">
                <Gauge className="h-4 w-4 text-[var(--brand)]" />
                <div>
                  <p className="text-xs text-[var(--text-tertiary)]">Al km</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {maintenance.dueMileage.toLocaleString('it-IT')} km
                  </p>
                </div>
              </div>
            )}

            {maintenance.estimatedCost && (
              <div className="flex items-center gap-2 p-3 bg-[var(--surface-secondary)]/50 rounded-xl">
                <Wrench className="h-4 w-4 text-[var(--brand)]" />
                <div>
                  <p className="text-xs text-[var(--text-tertiary)]">Stima costo</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    €{maintenance.estimatedCost.toLocaleString('it-IT')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Urgent Alert */}
          {isUrgent && (
            <div className="mb-4 p-3 bg-[var(--status-error-subtle)] border border-[var(--status-error)]/30 rounded-xl flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[var(--status-error)] flex-shrink-0" />
              <p className="text-sm text-[var(--status-error)]">
                {daysUntilDue < 0 
                  ? `La manutenzione è scaduta da ${Math.abs(daysUntilDue)} giorni`
                  : `La manutenzione scade ${daysUntilDue === 0 ? 'oggi' : `tra ${daysUntilDue} giorni`}`
                }
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4 border-t border-[var(--border-default)]/30">
            {maintenance.status !== 'completed' && (
              <AppleButton
                variant="primary"
                size="sm"
                onClick={() => onBookService?.(maintenance.id)}
              >
                Prenota
              </AppleButton>
            )}
            
            <AppleButton
              variant="secondary"
              size="sm"
              icon={<ChevronRight className="h-4 w-4" />}
              iconPosition="right"
              onClick={() => onViewDetails?.(maintenance.id)}
            >
              Dettagli
            </AppleButton>
          </div>
        </AppleCardContent>
      </AppleCard>
    </motion.div>
  )
}

// ============================================
// MAINTENANCE LIST COMPONENT
// ============================================

interface MaintenanceListProps {
  maintenances: MaintenanceSchedule[]
  onBookService?: (id: string) => void
  onViewDetails?: (id: string) => void
  emptyMessage?: string
}

export function MaintenanceList({ 
  maintenances,
  onBookService,
  onViewDetails,
  emptyMessage = 'Nessuna manutenzione programmata'
}: MaintenanceListProps) {
  if (maintenances.length === 0) {
    return (
      <div className="text-center py-12">
        <Wrench className="h-12 w-12 mx-auto text-[var(--text-tertiary)]/30 mb-4" />
        <p className="text-[var(--text-tertiary)]">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {maintenances.map((maintenance) => (
        <MaintenanceItem
          key={maintenance.id}
          maintenance={maintenance}
          onBookService={onBookService}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  )
}
