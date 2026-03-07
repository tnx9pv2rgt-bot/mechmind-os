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
    color: 'text-apple-blue',
    bgColor: 'bg-blue-50',
  },
  receipt: {
    label: 'Ricevuta',
    icon: FileText,
    color: 'text-apple-green',
    bgColor: 'bg-green-50',
  },
  inspection_report: {
    label: 'Report Ispezione',
    icon: FileCheck,
    color: 'text-apple-purple',
    bgColor: 'bg-purple-50',
  },
  warranty_claim: {
    label: 'Reclamo Garanzia',
    icon: Shield,
    color: 'text-apple-orange',
    bgColor: 'bg-orange-50',
  },
  maintenance_record: {
    label: 'Registro Manutenzione',
    icon: FileSpreadsheet,
    color: 'text-apple-gray',
    bgColor: 'bg-gray-100',
  },
}

// ============================================
// STATUS CONFIG
// ============================================

const statusConfig = {
  draft: {
    label: 'Bozza',
    color: 'text-apple-gray',
    bgColor: 'bg-gray-100',
    icon: Clock,
  },
  issued: {
    label: 'Emesso',
    color: 'text-apple-blue',
    bgColor: 'bg-blue-50',
    icon: FileText,
  },
  paid: {
    label: 'Pagato',
    color: 'text-apple-green',
    bgColor: 'bg-green-50',
    icon: CheckCircle,
  },
  overdue: {
    label: 'Scaduto',
    color: 'text-apple-red',
    bgColor: 'bg-red-50',
    icon: AlertCircle,
  },
  cancelled: {
    label: 'Annullato',
    color: 'text-apple-gray',
    bgColor: 'bg-gray-100',
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
                <p className="font-medium text-apple-dark text-sm truncate">
                  {document.title}
                </p>
                <p className="text-xs text-apple-gray">
                  {document.documentNumber} • {formattedDate}
                </p>
              </div>

              {document.amount !== undefined && (
                <div className="text-right">
                  <p className="font-semibold text-apple-dark text-sm">
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
                  <h3 className="font-semibold text-apple-dark">
                    {document.title}
                  </h3>
                  <p className="text-sm text-apple-gray">{document.documentNumber}</p>
                </div>

                {document.amount !== undefined && (
                  <div className="text-right">
                    <p className="text-sm text-apple-gray">Importo</p>
                    <p className="font-semibold text-apple-dark text-lg">
                      €{document.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              {document.description && (
                <p className="text-sm text-apple-gray mb-3">
                  {document.description}
                </p>
              )}

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-apple-gray mb-4">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Emesso: {formattedDate}
                </span>
                <span className="px-2 py-0.5 bg-apple-light-gray rounded text-xs">
                  {formatFileType(document.fileType)}
                </span>
                <span className="text-xs">
                  {formatFileSize(document.fileSize)}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-apple-border/30">
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
        <FileText className="h-12 w-12 mx-auto text-apple-gray/30 mb-4" />
        <p className="text-apple-gray">{emptyMessage}</p>
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
