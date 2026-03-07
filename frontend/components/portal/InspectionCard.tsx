'use client'

import { motion } from 'framer-motion'
import { 
  FileText,
  Calendar,
  Car,
  Download,
  Eye,
  Share2,
  Camera,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card'
import { AppleButton } from '@/components/ui/apple-button'
import { CustomerInspection } from '@/lib/types/portal'
import { useState } from 'react'

// ============================================
// SCORE COLOR HELPER
// ============================================

function getScoreColor(score: number): string {
  if (score >= 9) return 'text-apple-green'
  if (score >= 7) return 'text-apple-blue'
  if (score >= 5) return 'text-apple-orange'
  return 'text-apple-red'
}

function getScoreBg(score: number): string {
  if (score >= 9) return 'bg-green-50'
  if (score >= 7) return 'bg-blue-50'
  if (score >= 5) return 'bg-orange-50'
  return 'bg-red-50'
}

function getScoreLabel(score: number): string {
  if (score >= 9) return 'Eccellente'
  if (score >= 7) return 'Buono'
  if (score >= 5) return 'Discreto'
  return 'Necessita attenzione'
}

// ============================================
// STATUS CONFIG
// ============================================

const statusConfig = {
  pending: {
    label: 'In elaborazione',
    color: 'text-apple-orange',
    bgColor: 'bg-orange-50',
    icon: Clock,
  },
  completed: {
    label: 'Completata',
    color: 'text-apple-blue',
    bgColor: 'bg-blue-50',
    icon: CheckCircle,
  },
  approved: {
    label: 'Approvata',
    color: 'text-apple-green',
    bgColor: 'bg-green-50',
    icon: CheckCircle,
  },
  declined: {
    label: 'Rifiutata',
    color: 'text-apple-red',
    bgColor: 'bg-red-50',
    icon: XCircle,
  },
}

// ============================================
// PROPS
// ============================================

interface InspectionCardProps {
  inspection: CustomerInspection
  onDownloadPDF?: (id: string) => void
  onViewPhotos?: (id: string) => void
  onShare?: (id: string) => void
  onViewDetails?: (id: string) => void
  compact?: boolean
}

// ============================================
// MAIN COMPONENT
// ============================================

export function InspectionCard({ 
  inspection, 
  onDownloadPDF,
  onViewPhotos,
  onShare,
  onViewDetails,
  compact = false
}: InspectionCardProps) {
  const [imageError, setImageError] = useState(false)
  const status = statusConfig[inspection.status]
  const StatusIcon = status.icon
  const scoreColor = getScoreColor(inspection.score)
  const scoreBg = getScoreBg(inspection.score)

  const formattedDate = new Date(inspection.completedAt).toLocaleDateString('it-IT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => onViewDetails?.(inspection.id)}
        className="cursor-pointer"
      >
        <AppleCard>
          <AppleCardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* Score Circle */}
              <div className={`flex-shrink-0 w-16 h-16 rounded-2xl ${scoreBg} flex flex-col items-center justify-center`}>
                <span className={`text-2xl font-bold ${scoreColor}`}>
                  {inspection.score.toFixed(1)}
                </span>
                <span className="text-[10px] text-apple-gray uppercase tracking-wider">Score</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </span>
                </div>
                <p className="font-medium text-apple-dark truncate">
                  {inspection.vehicle?.make} {inspection.vehicle?.model}
                </p>
                <p className="text-xs text-apple-gray">
                  {formattedDate} • {inspection.technicianName}
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
      <AppleCard>
        <AppleCardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              {/* Score */}
              <div className={`flex-shrink-0 w-20 h-20 rounded-3xl ${scoreBg} flex flex-col items-center justify-center`}>
                <span className={`text-3xl font-bold ${scoreColor}`}>
                  {inspection.score.toFixed(1)}
                </span>
                <span className="text-xs text-apple-gray mt-0.5">/ 10</span>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {status.label}
                  </span>
                </div>
                <h3 className="font-semibold text-apple-dark text-lg">
                  {inspection.vehicle?.make} {inspection.vehicle?.model}
                </h3>
                <p className="text-sm text-apple-gray">
                  {inspection.vehicle?.licensePlate} • {inspection.vehicle?.year}
                </p>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <p className="text-sm text-apple-gray">{getScoreLabel(inspection.score)}</p>
            </div>
          </div>

          {/* Summary */}
          <div className="mb-4 p-4 bg-apple-light-gray/50 rounded-2xl">
            <p className="text-sm text-apple-dark leading-relaxed">
              {inspection.summary}
            </p>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
            <div className="flex items-center gap-2 text-apple-dark">
              <Calendar className="h-4 w-4 text-apple-blue" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-2 text-apple-dark">
              <FileText className="h-4 w-4 text-apple-blue" />
              <span>{inspection.findings?.length || 0} risultanze</span>
            </div>
          </div>

          {/* Photo Preview */}
          {inspection.photos && inspection.photos.length > 0 && !imageError && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Camera className="h-4 w-4 text-apple-gray" />
                <span className="text-sm text-apple-gray">{inspection.photos.length} foto</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {inspection.photos.slice(0, 4).map((photo, index) => (
                  <div 
                    key={photo.id} 
                    className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-gray-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.thumbnailUrl}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={() => setImageError(true)}
                    />
                    {index === 3 && inspection.photos.length > 4 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-medium">+{inspection.photos.length - 4}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-apple-border/30">
            <AppleButton
              variant="primary"
              size="sm"
              icon={<Eye className="h-4 w-4" />}
              onClick={() => onViewDetails?.(inspection.id)}
            >
              Visualizza
            </AppleButton>

            {inspection.pdfUrl && (
              <AppleButton
                variant="secondary"
                size="sm"
                icon={<Download className="h-4 w-4" />}
                onClick={() => onDownloadPDF?.(inspection.id)}
              >
                PDF
              </AppleButton>
            )}

            {inspection.photos && inspection.photos.length > 0 && (
              <AppleButton
                variant="secondary"
                size="sm"
                icon={<Camera className="h-4 w-4" />}
                onClick={() => onViewPhotos?.(inspection.id)}
              >
                Foto
              </AppleButton>
            )}

            <AppleButton
              variant="ghost"
              size="sm"
              icon={<Share2 className="h-4 w-4" />}
              onClick={() => onShare?.(inspection.id)}
            >
              Condividi
            </AppleButton>
          </div>
        </AppleCardContent>
      </AppleCard>
    </motion.div>
  )
}

// ============================================
// INSPECTION LIST COMPONENT
// ============================================

interface InspectionListProps {
  inspections: CustomerInspection[]
  onDownloadPDF?: (id: string) => void
  onViewPhotos?: (id: string) => void
  onShare?: (id: string) => void
  onViewDetails?: (id: string) => void
  emptyMessage?: string
}

export function InspectionList({ 
  inspections,
  onDownloadPDF,
  onViewPhotos,
  onShare,
  onViewDetails,
  emptyMessage = 'Nessuna ispezione trovata'
}: InspectionListProps) {
  if (inspections.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-apple-gray/30 mb-4" />
        <p className="text-apple-gray">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {inspections.map((inspection) => (
        <InspectionCard
          key={inspection.id}
          inspection={inspection}
          onDownloadPDF={onDownloadPDF}
          onViewPhotos={onViewPhotos}
          onShare={onShare}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  )
}
