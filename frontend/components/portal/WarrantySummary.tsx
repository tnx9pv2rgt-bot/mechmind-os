'use client'

import { motion } from 'framer-motion'
import { 
  Shield,
  Calendar,
  Gauge,
  AlertTriangle,
  CheckCircle,
  FileText,
  ChevronRight,
  Clock,
  AlertCircle
} from 'lucide-react'
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card'
import { AppleButton } from '@/components/ui/apple-button'
import { WarrantyInfo, WarrantyClaim } from '@/lib/types/portal'

// ============================================
// STATUS CONFIG
// ============================================

const statusConfig = {
  active: {
    label: 'Attiva',
    color: 'text-[var(--status-success)]',
    bgColor: 'bg-[var(--status-success-subtle)]',
    icon: CheckCircle,
  },
  expired: {
    label: 'Scaduta',
    color: 'text-[var(--text-tertiary)]',
    bgColor: 'bg-[var(--surface-secondary)]',
    icon: Clock,
  },
  expiring_soon: {
    label: 'In scadenza',
    color: 'text-[var(--status-warning)]',
    bgColor: 'bg-[var(--status-warning)]/5',
    icon: AlertTriangle,
  },
  claimed: {
    label: 'In reclamo',
    color: 'text-[var(--brand)]',
    bgColor: 'bg-[var(--status-info-subtle)]',
    icon: AlertCircle,
  },
}

const coverageLabels: Record<string, string> = {
  powertrain: 'Powertrain',
  comprehensive: 'Completa',
  corrosion: 'Corrosione',
  emissions: 'Emissioni',
  hybrid: 'Componenti Ibride',
}

// ============================================
// PROPS
// ============================================

interface WarrantySummaryProps {
  warranty: WarrantyInfo
  onViewDetails?: (id: string) => void
  onFileClaim?: (id: string) => void
  compact?: boolean
}

// ============================================
// MAIN COMPONENT
// ============================================

export function WarrantySummary({ 
  warranty, 
  onViewDetails,
  onFileClaim,
  compact = false
}: WarrantySummaryProps) {
  const status = statusConfig[warranty.status]
  const StatusIcon = status.icon

  const daysUntilExpiry = Math.ceil((new Date(warranty.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const progress = Math.min(100, Math.max(0, ((warranty.currentMileage - 0) / (warranty.maxMileage || 100000)) * 100))

  const formattedStartDate = new Date(warranty.startDate).toLocaleDateString('it-IT', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  const formattedEndDate = new Date(warranty.endDate).toLocaleDateString('it-IT', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => onViewDetails?.(warranty.id)}
        className="cursor-pointer"
      >
        <AppleCard>
          <AppleCardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${status.bgColor} flex items-center justify-center`}>
                <StatusIcon className={`h-5 w-5 ${status.color}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-[var(--text-primary)] text-sm truncate">
                    {warranty.vehicle?.make} {warranty.vehicle?.model}
                  </p>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${status.bgColor} ${status.color}`}>
                    {status.label}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {coverageLabels[warranty.coverageType]} • {warranty.provider}
                </p>
              </div>

              {warranty.status === 'active' && (
                <div className="text-right">
                  <p className={`text-xs ${daysUntilExpiry <= 30 ? 'text-[var(--status-error)]' : 'text-[var(--text-tertiary)]'}`}>
                    {daysUntilExpiry <= 0 
                      ? 'Scaduta' 
                      : `${daysUntilExpiry}g rim.`
                    }
                  </p>
                </div>
              )}
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
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-14 h-14 rounded-2xl ${status.bgColor} flex items-center justify-center`}>
                <Shield className={`h-7 w-7 ${status.color}`} />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-[var(--text-primary)] text-lg">
                    Garanzia {coverageLabels[warranty.coverageType]}
                  </h3>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {status.label}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-tertiary)]">
                  {warranty.vehicle?.make} {warranty.vehicle?.model} • Polizza #{warranty.policyNumber}
                </p>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <p className="text-sm text-[var(--text-tertiary)]">Fornitore</p>
              <p className="font-medium text-[var(--text-primary)]">{warranty.provider}</p>
            </div>
          </div>

          {/* Progress */}
          {warranty.maxMileage && warranty.status === 'active' && (
            <div className="mb-4 p-4 bg-[var(--surface-secondary)]/50 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--text-tertiary)]">Chilometraggio</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {warranty.currentMileage.toLocaleString('it-IT')} / {warranty.maxMileage.toLocaleString('it-IT')} km
                </span>
              </div>
              <div className="h-2 bg-[var(--border-default)] rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    progress > 80 ? 'bg-[var(--status-error)]' : progress > 50 ? 'bg-[var(--status-warning)]' : 'bg-[var(--status-success)]'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-3 p-3 bg-[var(--surface-secondary)]/50 rounded-xl">
              <Calendar className="h-5 w-5 text-[var(--brand)]" />
              <div>
                <p className="text-xs text-[var(--text-tertiary)]">Inizio</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">{formattedStartDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[var(--surface-secondary)]/50 rounded-xl">
              <Calendar className={`h-5 w-5 ${daysUntilExpiry <= 30 ? 'text-[var(--status-error)]' : 'text-[var(--brand)]'}`} />
              <div>
                <p className="text-xs text-[var(--text-tertiary)]">Scadenza</p>
                <p className={`text-sm font-medium ${daysUntilExpiry <= 30 ? 'text-[var(--status-error)]' : 'text-[var(--text-primary)]'}`}>
                  {formattedEndDate}
                </p>
              </div>
            </div>
          </div>

          {/* Expiry Alert */}
          {warranty.status === 'expiring_soon' && (
            <div className="mb-4 p-3 bg-[var(--status-warning)]/5 border border-[var(--status-warning)]/20 rounded-xl flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[var(--status-warning)] flex-shrink-0" />
              <p className="text-sm text-[var(--status-warning)]">
                La garanzia scade tra {daysUntilExpiry} giorni. Considera il rinnovo.
              </p>
            </div>
          )}

          {/* Claims Summary */}
          {warranty.claims && warranty.claims.length > 0 && (
            <div className="mb-4 p-4 bg-[var(--surface-secondary)]/50 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-[var(--text-tertiary)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Reclami: {warranty.claims.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {warranty.claims.slice(0, 3).map((claim) => (
                  <span 
                    key={claim.id}
                    className="px-2 py-1 bg-[var(--surface-secondary)] rounded-lg text-xs text-[var(--text-tertiary)]"
                  >
                    #{claim.claimNumber}
                  </span>
                ))}
                {warranty.claims.length > 3 && (
                  <span className="px-2 py-1 text-xs text-[var(--text-tertiary)]">
                    +{warranty.claims.length - 3} altri
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4 border-t border-[var(--border-default)]/30">
            {warranty.status === 'active' && (
              <AppleButton
                variant="primary"
                size="sm"
                onClick={() => onFileClaim?.(warranty.id)}
              >
                Nuovo Reclamo
              </AppleButton>
            )}
            
            <AppleButton
              variant="secondary"
              size="sm"
              icon={<ChevronRight className="h-4 w-4" />}
              iconPosition="right"
              onClick={() => onViewDetails?.(warranty.id)}
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
// WARRANTY STATS COMPONENT
// ============================================

interface WarrantyStatsProps {
  warranties: WarrantyInfo[]
}

export function WarrantyStats({ warranties }: WarrantyStatsProps) {
  const stats = {
    total: warranties.length,
    active: warranties.filter(w => w.status === 'active').length,
    expiringSoon: warranties.filter(w => w.status === 'expiring_soon').length,
    expired: warranties.filter(w => w.status === 'expired').length,
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="p-4 bg-[var(--surface-secondary)] rounded-2xl shadow-apple">
        <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
        <p className="text-sm text-[var(--text-tertiary)]">Totali</p>
      </div>
      <div className="p-4 bg-[var(--status-success-subtle)] rounded-2xl">
        <p className="text-2xl font-bold text-[var(--status-success)]">{stats.active}</p>
        <p className="text-sm text-[var(--text-tertiary)]">Attive</p>
      </div>
      <div className="p-4 bg-[var(--status-warning)]/5 rounded-2xl">
        <p className="text-2xl font-bold text-[var(--status-warning)]">{stats.expiringSoon}</p>
        <p className="text-sm text-[var(--text-tertiary)]">In scadenza</p>
      </div>
      <div className="p-4 bg-[var(--surface-secondary)] rounded-2xl">
        <p className="text-2xl font-bold text-[var(--text-tertiary)]">{stats.expired}</p>
        <p className="text-sm text-[var(--text-tertiary)]">Scadute</p>
      </div>
    </div>
  )
}

// ============================================
// WARRANTY LIST COMPONENT
// ============================================

interface WarrantyListProps {
  warranties: WarrantyInfo[]
  onViewDetails?: (id: string) => void
  onFileClaim?: (id: string) => void
  emptyMessage?: string
}

export function WarrantyList({ 
  warranties,
  onViewDetails,
  onFileClaim,
  emptyMessage = 'Nessuna garanzia trovata'
}: WarrantyListProps) {
  if (warranties.length === 0) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 mx-auto text-[var(--text-tertiary)]/30 mb-4" />
        <p className="text-[var(--text-tertiary)]">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {warranties.map((warranty) => (
        <WarrantySummary
          key={warranty.id}
          warranty={warranty}
          onViewDetails={onViewDetails}
          onFileClaim={onFileClaim}
        />
      ))}
    </div>
  )
}
