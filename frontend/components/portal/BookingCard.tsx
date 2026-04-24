'use client'

import { motion } from 'framer-motion'
import { 
  Calendar,
  Clock,
  Car,
  MapPin,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card'
import { AppleButton } from '@/components/ui/apple-button'
import { Booking, BookingStatus, BookingType } from '@/lib/types/portal'

// ============================================
// STATUS CONFIG
// ============================================

const statusConfig: Record<BookingStatus, { 
  label: string
  color: string
  bgColor: string
  icon: React.ElementType
}> = {
  pending: {
    label: 'In attesa',
    color: 'text-[var(--status-warning)]',
    bgColor: 'bg-[var(--status-warning)]/5',
    icon: AlertCircle,
  },
  confirmed: {
    label: 'Confermata',
    color: 'text-[var(--brand)]',
    bgColor: 'bg-[var(--status-info-subtle)]',
    icon: CheckCircle,
  },
  in_progress: {
    label: 'In corso',
    color: 'text-[var(--brand)]',
    bgColor: 'bg-[var(--brand-subtle)]',
    icon: Loader2,
  },
  completed: {
    label: 'Completata',
    color: 'text-[var(--status-success)]',
    bgColor: 'bg-[var(--status-success-subtle)]',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Cancellata',
    color: 'text-[var(--status-error)]',
    bgColor: 'bg-[var(--status-error-subtle)]',
    icon: XCircle,
  },
  no_show: {
    label: 'Non presentato',
    color: 'text-[var(--text-tertiary)]',
    bgColor: 'bg-[var(--surface-secondary)]',
    icon: XCircle,
  },
}

const typeLabels: Record<BookingType, string> = {
  maintenance: 'Manutenzione',
  repair: 'Riparazione',
  inspection: 'Ispezione',
  warranty: 'Garanzia',
  consultation: 'Consulenza',
  emergency: 'Emergenza',
}

// ============================================
// PROPS
// ============================================

interface BookingCardProps {
  booking: Booking
  onCancel?: (id: string) => void
  onReschedule?: (id: string) => void
  onViewDetails?: (id: string) => void
  compact?: boolean
}

// ============================================
// MAIN COMPONENT
// ============================================

export function BookingCard({ 
  booking, 
  onCancel, 
  onReschedule,
  onViewDetails,
  compact = false 
}: BookingCardProps) {
  const status = statusConfig[booking.status]
  const StatusIcon = status.icon
  const isUpcoming = ['pending', 'confirmed'].includes(booking.status)
  const isPast = ['completed', 'cancelled', 'no_show'].includes(booking.status)

  const formattedDate = new Date(booking.scheduledDate).toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => onViewDetails?.(booking.id)}
        className="cursor-pointer"
      >
        <AppleCard className="border-l-4 border-l-apple-blue">
          <AppleCardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {typeLabels[booking.type]}
                  </span>
                </div>
                <p className="font-medium text-[var(--text-primary)] truncate">
                  {booking.vehicle?.make} {booking.vehicle?.model}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-tertiary)]">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formattedDate}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {booking.scheduledTime}
                  </span>
                </div>
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
      <AppleCard>
        <AppleCardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                  <StatusIcon className={`h-3.5 w-3.5 ${booking.status === 'in_progress' ? 'animate-spin' : ''}`} />
                  {status.label}
                </span>
                <span className="text-sm text-[var(--text-tertiary)]">
                  {typeLabels[booking.type]}
                </span>
              </div>
              <h3 className="font-semibold text-[var(--text-primary)] text-lg">
                {booking.vehicle?.make} {booking.vehicle?.model}
              </h3>
              <p className="text-sm text-[var(--text-tertiary)]">
                {booking.vehicle?.licensePlate}
              </p>
            </div>

            {booking.estimatedCost && (
              <div className="text-right">
                <p className="text-sm text-[var(--text-tertiary)]">Stima</p>
                <p className="font-semibold text-[var(--text-primary)]">
                  €{booking.estimatedCost.toLocaleString('it-IT')}
                </p>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
              <Calendar className="h-4 w-4 text-[var(--brand)]" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
              <Clock className="h-4 w-4 text-[var(--brand)]" />
              <span>{booking.scheduledTime}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
              <MapPin className="h-4 w-4 text-[var(--brand)]" />
              <span className="truncate">{booking.location}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
              <Car className="h-4 w-4 text-[var(--brand)]" />
              <span>{booking.vehicle?.year}</span>
            </div>
          </div>

          {booking.notes && (
            <div className="mb-4 p-3 bg-[var(--surface-secondary)]/50 rounded-xl">
              <p className="text-sm text-[var(--text-tertiary)]">{booking.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-[var(--border-default)]/30">
            <AppleButton
              variant="primary"
              size="sm"
              onClick={() => onViewDetails?.(booking.id)}
            >
              Dettagli
            </AppleButton>

            {isUpcoming && (
              <>
                <AppleButton
                  variant="secondary"
                  size="sm"
                  onClick={() => onReschedule?.(booking.id)}
                >
                  Riprogramma
                </AppleButton>
                <AppleButton
                  variant="ghost"
                  size="sm"
                  onClick={() => onCancel?.(booking.id)}
                >
                  Annulla
                </AppleButton>
              </>
            )}
          </div>
        </AppleCardContent>
      </AppleCard>
    </motion.div>
  )
}

// ============================================
// BOOKING LIST COMPONENT
// ============================================

interface BookingListProps {
  bookings: Booking[]
  onCancel?: (id: string) => void
  onReschedule?: (id: string) => void
  onViewDetails?: (id: string) => void
  emptyMessage?: string
}

export function BookingList({ 
  bookings, 
  onCancel, 
  onReschedule,
  onViewDetails,
  emptyMessage = 'Nessuna prenotazione trovata'
}: BookingListProps) {
  if (bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 mx-auto text-[var(--text-tertiary)]/30 mb-4" />
        <p className="text-[var(--text-tertiary)]">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <BookingCard
          key={booking.id}
          booking={booking}
          onCancel={onCancel}
          onReschedule={onReschedule}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  )
}
