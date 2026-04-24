'use client'

import { motion } from 'framer-motion'
import { 
  FileText,
  Download,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  FileSpreadsheet,
  FileCheck,
  Receipt,
  Shield
} from 'lucide-react'
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card'
import { AppleButton } from '@/components/ui/apple-button'
import { Document, DocumentType } from '@/lib/types/portal'

// ============================================
// DOCUMENT TYPE CONFIG
// ============================================

const documentTypeConfig: Record<DocumentType, { 
  label: string
  icon: React.ElementType
  color: string
  bgColor: string
}> = {
  invoice: {
    label: 'Fattura',
    icon: Receipt,
    color: 'text-[var(--brand)]',
    bgColor: 'bg-[var(--status-info-subtle)]',
  },
  receipt: {
    label: 'Ricevuta',
    icon: FileText,
    color: 'text-[var(--status-success)]',
    bgColor: 'bg-[var(--status-success-subtle)]',
  },
  inspection_report: {
    label: 'Report Ispezione',
    icon: FileCheck,
    color: 'text-[var(--brand)]',
    bgColor: 'bg-[var(--brand-subtle)]',
  },
  warranty_claim: {
    label: 'Reclamo Garanzia',
    icon: Shield,
    color: 'text-[var(--status-warning)]',
    bgColor: 'bg-[var(--status-warning)]/5',
  },
  maintenance_record: {
    label: 'Registro Manutenzione',
    icon: FileSpreadsheet,
    color: 'text-[var(--text-tertiary)]',
    bgColor: 'bg-[var(--surface-secondary)]',
  },
}

// ============================================
// STATUS CONFIG
// ============================================

const statusConfig = {
  draft: {
    label: 'Bozza',
    color: 'text-[var(--text-tertiary)]',
    bgColor: 'bg-[var(--surface-secondary)]',
    icon: Clock,
  },
  issued: {
    label: 'Emesso',
    color: 'text-[var(--brand)]',
    bgColor: 'bg-[var(--status-info-subtle)]',
    icon: FileText,
  },
  paid: {
    label: 'Pagato',
    color: 'text-[var(--status-success)]',
    bgColor: 'bg-[var(--status-success-subtle)]',
    icon: CheckCircle,
  },
  overdue: {
    label: 'Scaduto',
    color: 'text-[var(--status-error)]',
    bgColor: 'bg-[var(--status-error-subtle)]',
    icon: AlertCircle,
  },
  cancelled: {
    label: 'Annullato',
    color: 'text-[var(--text-tertiary)]',
    bgColor: 'bg-[var(--surface-secondary)]',
    icon: XCircle,
  },
}

// ============================================
// FORMATTING UTILS
// ============================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatFileType(mimeType: string): string {
  const types: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
  }
  return types[mimeType] || mimeType.split('/')[1]?.toUpperCase() || 'File'
}

// ============================================
// PROPS
// ============================================

interface DocumentCardProps {
  document: Document
  onDownload?: (id: string) => void
  onView?: (id: string) => void
  compact?: boolean
}

// ============================================
// MAIN COMPONENT
// ============================================

export function DocumentCard({ 
  document, 
  onDownload,
  onView,
  compact = false 
}: DocumentCardProps) {
  const typeConfig = documentTypeConfig[document.type]
  const status = statusConfig[document.status]
  const TypeIcon = typeConfig.icon
  const StatusIcon = status.icon

  const formattedDate = new Date(document.issueDate).toLocaleDateString('it-IT', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="cursor-pointer"
      >
        <AppleCard>
          <AppleCardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${typeConfig.bgColor} flex items-center justify-center`}>
                <TypeIcon className={`h-6 w-6 ${typeConfig.color}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-medium ${typeConfig.color}`}>
                    {typeConfig.label}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${status.bgColor} ${status.color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </span>
                </div>
                <p className="font-medium text-[var(--text-primary)] text-sm truncate">
                  {document.title}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {document.documentNumber} • {formattedDate}
                </p>
              </div>

              {document.amount !== undefined && (
                <div className="text-right">
                  <p className="font-semibold text-[var(--text-primary)] text-sm">
                    €{document.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
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
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`flex-shrink-0 w-14 h-14 rounded-2xl ${typeConfig.bgColor} flex items-center justify-center`}>
              <TypeIcon className={`h-7 w-7 ${typeConfig.color}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium ${typeConfig.color}`}>
                      {typeConfig.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </span>
                  </div>
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    {document.title}
                  </h3>
                  <p className="text-sm text-[var(--text-tertiary)]">{document.documentNumber}</p>
                </div>

                {document.amount !== undefined && (
                  <div className="text-right">
                    <p className="text-sm text-[var(--text-tertiary)]">Importo</p>
                    <p className="font-semibold text-[var(--text-primary)] text-lg">
                      €{document.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              {document.description && (
                <p className="text-sm text-[var(--text-tertiary)] mb-3">
                  {document.description}
                </p>
              )}

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-tertiary)] mb-4">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Emesso: {formattedDate}
                </span>
                <span className="px-2 py-0.5 bg-[var(--surface-secondary)] rounded text-xs">
                  {formatFileType(document.fileType)}
                </span>
                <span className="text-xs">
                  {formatFileSize(document.fileSize)}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-[var(--border-default)]/30">
                <AppleButton
                  variant="primary"
                  size="sm"
                  icon={<Download className="h-4 w-4" />}
                  onClick={() => onDownload?.(document.id)}
                >
                  Scarica
                </AppleButton>

                {document.fileType === 'application/pdf' && (
                  <AppleButton
                    variant="secondary"
                    size="sm"
                    onClick={() => onView?.(document.id)}
                  >
                    Visualizza
                  </AppleButton>
                )}
              </div>
            </div>
          </div>
        </AppleCardContent>
      </AppleCard>
    </motion.div>
  )
}

// ============================================
// DOCUMENT LIST COMPONENT
// ============================================

interface DocumentListProps {
  documents: Document[]
  onDownload?: (id: string) => void
  onView?: (id: string) => void
  emptyMessage?: string
}

export function DocumentList({ 
  documents,
  onDownload,
  onView,
  emptyMessage = 'Nessun documento trovato'
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-[var(--text-tertiary)]/30 mb-4" />
        <p className="text-[var(--text-tertiary)]">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {documents.map((document) => (
        <DocumentCard
          key={document.id}
          document={document}
          onDownload={onDownload}
          onView={onView}
        />
      ))}
    </div>
  )
}
