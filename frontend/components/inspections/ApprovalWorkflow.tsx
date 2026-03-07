'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  RefreshCcw,
  Pen,
  FileText,
  CreditCard,
  Shield,
  Lock,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Printer,
  Mail,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

// ============================================
// Types
// ============================================

export type FindingSeverity = 'Critical' | 'Warning' | 'Info'
export type PaymentMethod = 'card' | 'bank_transfer' | 'cash'
export type ApprovalStatus = 'draft' | 'submitting' | 'success' | 'error'

export interface Finding {
  id: string
  photoUrl: string
  description: string
  severity: FindingSeverity
  estimatedCost: number
  category: string
  technicianNotes?: string
}

export interface FindingApproval {
  findingId: string
  approved: boolean
  rejectedReason?: string
}

export interface CustomerApproval {
  inspectionId: string
  approvedFindings: FindingApproval[]
  signature: string // base64 image
  depositAmount: number
  paymentMethod: PaymentMethod
  termsAccepted: boolean
  submittedAt: Date
  totalApproved: number
  totalRejected: number
}

export interface ApprovalWorkflowProps {
  inspectionId: string
  findings: Finding[]
  onSubmit: (approval: CustomerApproval) => Promise<void>
  customerName?: string
  vehicleInfo?: string
  shopName?: string
}

// ============================================
// Severity Configuration
// ============================================

const SEVERITY_CONFIG: Record<FindingSeverity, {
  icon: React.ElementType
  badgeClass: string
  bgClass: string
  borderClass: string
  label: string
}> = {
  Critical: {
    icon: AlertCircle,
    badgeClass: 'bg-red-100 text-red-800 border-red-300',
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
    label: 'Critico',
  },
  Warning: {
    icon: AlertTriangle,
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    label: 'Avviso',
  },
  Info: {
    icon: Info,
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    label: 'Info',
  },
}

// ============================================
// Signature Pad Component
// ============================================

interface SignaturePadProps {
  onSignatureChange: (signature: string | null) => void
  width?: number
  height?: number
}

function SignaturePad({ onSignatureChange, width = 600, height = 200 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  const getCanvasCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }, [])

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDrawing(true)
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const { x, y } = getCanvasCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }, [getCanvasCoordinates])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const { x, y } = getCanvasCoordinates(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }, [isDrawing, getCanvasCoordinates])

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return
    setIsDrawing(false)
    setHasSignature(true)

    const canvas = canvasRef.current
    if (canvas) {
      onSignatureChange(canvas.toDataURL('image/png'))
    }
  }, [isDrawing, onSignatureChange])

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    onSignatureChange(null)
  }, [onSignatureChange])

  // Initialize canvas context
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#000000'
  }, [])

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg overflow-hidden bg-white',
          hasSignature ? 'border-gray-300' : 'border-gray-200'
        )}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-gray-400">
              <Pen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <span className="text-sm">Firma qui con mouse o dito</span>
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearSignature}
          className="text-gray-600"
        >
          <RefreshCcw className="h-4 w-4 mr-2" />
          Cancella Firma
        </Button>
      </div>
    </div>
  )
}

// ============================================
// Finding Card Component
// ============================================

interface FindingCardProps {
  finding: Finding
  isApproved: boolean | null
  onApprove: () => void
  onReject: () => void
}

function FindingCard({ finding, isApproved, onApprove, onReject }: FindingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const severityConfig = SEVERITY_CONFIG[finding.severity]
  const SeverityIcon = severityConfig.icon

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all border-2',
        isApproved === true && 'border-green-400 shadow-md',
        isApproved === false && 'border-gray-300 opacity-75',
        isApproved === null && severityConfig.borderClass
      )}
    >
      <div className={cn('p-4', severityConfig.bgClass)}>
        <div className="flex gap-4">
          {/* Photo */}
          <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border bg-white">
            {finding.photoUrl ? (
              <img
                src={finding.photoUrl}
                alt={finding.description}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <AlertCircle className="h-8 w-8" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Badge variant="outline" className={cn('mb-2', severityConfig.badgeClass)}>
                  <SeverityIcon className="h-3 w-3 mr-1" />
                  {severityConfig.label}
                </Badge>
                <h4 className="font-semibold text-gray-900 line-clamp-2">{finding.description}</h4>
                <p className="text-sm text-gray-500 mt-1">{finding.category}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">{formatCurrency(finding.estimatedCost)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Expandable Details */}
        {finding.technicianNotes && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 mr-1" />
            ) : (
              <ChevronDown className="h-4 w-4 mr-1" />
            )}
            Note del tecnico
          </button>
        )}

        {isExpanded && finding.technicianNotes && (
          <div className="mt-3 p-3 bg-white/70 rounded-lg text-sm text-gray-700">
            <p className="font-medium text-gray-900 mb-1">Note del tecnico:</p>
            {finding.technicianNotes}
          </div>
        )}
      </div>

      {/* Approval Actions */}
      <div className="p-4 bg-white border-t">
        <div className="flex gap-3">
          <Button
            type="button"
            variant={isApproved === true ? 'default' : 'outline'}
            size="sm"
            onClick={onApprove}
            className={cn(
              'flex-1',
              isApproved === true && 'bg-green-600 hover:bg-green-700'
            )}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approva
          </Button>
          <Button
            type="button"
            variant={isApproved === false ? 'default' : 'outline'}
            size="sm"
            onClick={onReject}
            className={cn(
              'flex-1',
              isApproved === false && 'bg-gray-600 hover:bg-gray-700'
            )}
          >
            <X className="h-4 w-4 mr-2" />
            Rifiuta
          </Button>
        </div>
      </div>
    </Card>
  )
}

// ============================================
// Cost Summary Component
// ============================================

interface CostSummaryProps {
  findings: Finding[]
  approvals: Record<string, boolean>
}

function CostSummary({ findings, approvals }: CostSummaryProps) {
  const { totalApproved, totalRejected, totalSavings } = findings.reduce(
    (acc, finding) => {
      if (approvals[finding.id] === true) {
        acc.totalApproved += finding.estimatedCost
      } else if (approvals[finding.id] === false) {
        acc.totalRejected += finding.estimatedCost
        acc.totalSavings += finding.estimatedCost
      }
      return acc
    },
    { totalApproved: 0, totalRejected: 0, totalSavings: 0 }
  )

  const approvedCount = Object.values(approvals).filter(Boolean).length
  const rejectedCount = Object.values(approvals).filter((v) => v === false).length
  const pendingCount = findings.length - approvedCount - rejectedCount

  return (
    <Card className="bg-gradient-to-br from-gray-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Riepilogo Costi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
            <p className="text-2xl font-bold text-green-700">{approvedCount}</p>
            <p className="text-xs text-green-600">Approvati</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-2xl font-bold text-gray-700">{rejectedCount}</p>
            <p className="text-xs text-gray-600">Rifiutati</p>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
            <p className="text-xs text-amber-600">In attesa</p>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Totale approvato</span>
            <span className="font-semibold text-green-700 text-lg">
              {formatCurrency(totalApproved)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Totale rifiutato</span>
            <span className="font-semibold text-gray-500">
              {formatCurrency(totalRejected)}
            </span>
          </div>
          {totalSavings > 0 && (
            <div className="flex justify-between items-center pt-2 border-t border-dashed">
              <span className="text-amber-600 font-medium flex items-center gap-1">
                <Info className="h-4 w-4" />
                Risparmio
              </span>
              <span className="font-bold text-amber-600 text-lg">
                {formatCurrency(totalSavings)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// Success View Component
// ============================================

interface SuccessViewProps {
  approval: CustomerApproval
  findings: Finding[]
  onDownloadPDF?: () => void
  onPrint?: () => void
  onEmailReceipt?: () => void
  onClose?: () => void
}

function SuccessView({
  approval,
  findings,
  onDownloadPDF,
  onPrint,
  onEmailReceipt,
  onClose,
}: SuccessViewProps) {
  const approvedFindings = findings.filter((f) =>
    approval.approvedFindings.some((a) => a.findingId === f.id && a.approved)
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8">
      {/* Success Header */}
      <div className="text-center space-y-4">
        <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Approvazione Completata!</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          La tua approvazione è stata registrata con successo. Riceverai una conferma via email.
        </p>
      </div>

      {/* Confirmation Card */}
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="text-lg">Dettaglio Approvazione</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">ID Ispezione</p>
              <p className="font-mono font-medium">{approval.inspectionId}</p>
            </div>
            <div>
              <p className="text-gray-500">Data approvazione</p>
              <p className="font-medium">
                {approval.submittedAt.toLocaleDateString('it-IT')}
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-gray-500 mb-2">Interventi approvati ({approvedFindings.length})</p>
            <ul className="space-y-1">
              {approvedFindings.slice(0, 3).map((finding) => (
                <li key={finding.id} className="flex justify-between text-sm">
                  <span className="truncate max-w-[70%]">{finding.description}</span>
                  <span className="font-medium">{formatCurrency(finding.estimatedCost)}</span>
                </li>
              ))}
              {approvedFindings.length > 3 && (
                <li className="text-sm text-gray-500">
                  ...e altri {approvedFindings.length - 3} interventi
                </li>
              )}
            </ul>
          </div>

          <div className="border-t pt-4 flex justify-between items-center">
            <span className="text-gray-600">Totale approvato</span>
            <span className="text-2xl font-bold text-green-700">
              {formatCurrency(approval.totalApproved)}
            </span>
          </div>

          {approval.depositAmount > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Acconto versato</span>
              <span className="font-semibold text-amber-600">
                {formatCurrency(approval.depositAmount)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signature Preview */}
      {approval.signature && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Firma Digitale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-white">
              <img
                src={approval.signature}
                alt="Firma cliente"
                className="max-h-24 mx-auto"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        {onDownloadPDF && (
          <Button variant="outline" onClick={onDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            Scarica PDF
          </Button>
        )}
        {onPrint && (
          <Button variant="outline" onClick={onPrint}>
            <Printer className="h-4 w-4 mr-2" />
            Stampa
          </Button>
        )}
        {onEmailReceipt && (
          <Button variant="outline" onClick={onEmailReceipt}>
            <Mail className="h-4 w-4 mr-2" />
            Invia Email
          </Button>
        )}
        {onClose && (
          <Button onClick={onClose}>
            <Check className="h-4 w-4 mr-2" />
            Chiudi
          </Button>
        )}
      </div>
    </div>
  )
}

// ============================================
// Main Approval Workflow Component
// ============================================

export function ApprovalWorkflow({
  inspectionId,
  findings,
  onSubmit,
  customerName,
  vehicleInfo,
  shopName = 'Officina Autorizzata',
}: ApprovalWorkflowProps) {
  // State
  const [approvals, setApprovals] = useState<Record<string, boolean>>({})
  const [signature, setSignature] = useState<string | null>(null)
  const [depositAmount, setDepositAmount] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [status, setStatus] = useState<ApprovalStatus>('draft')
  const [completedApproval, setCompletedApproval] = useState<CustomerApproval | null>(null)

  // Handlers
  const handleApproveFinding = useCallback((findingId: string) => {
    setApprovals((prev) => ({ ...prev, [findingId]: true }))
  }, [])

  const handleRejectFinding = useCallback((findingId: string) => {
    setApprovals((prev) => ({ ...prev, [findingId]: false }))
  }, [])

  const calculateTotals = useCallback(() => {
    return findings.reduce(
      (acc, finding) => {
        if (approvals[finding.id] === true) {
          acc.totalApproved += finding.estimatedCost
        } else if (approvals[finding.id] === false) {
          acc.totalRejected += finding.estimatedCost
        }
        return acc
      },
      { totalApproved: 0, totalRejected: 0 }
    )
  }, [findings, approvals])

  const handleSubmit = async () => {
    setStatus('submitting')

    try {
      const { totalApproved, totalRejected } = calculateTotals()
      const approvedFindings = Object.entries(approvals).map(([findingId, approved]) => ({
        findingId,
        approved,
      }))

      const approval: CustomerApproval = {
        inspectionId,
        approvedFindings,
        signature: signature || '',
        depositAmount: parseFloat(depositAmount) || 0,
        paymentMethod,
        termsAccepted,
        submittedAt: new Date(),
        totalApproved,
        totalRejected,
      }

      await onSubmit(approval)
      setCompletedApproval(approval)
      setStatus('success')
    } catch (error) {
      setStatus('error')
    }
  }

  const handleConfirmSubmit = () => {
    setShowConfirmation(false)
    handleSubmit()
  }

  // Validation
  const hasApprovedItems = Object.values(approvals).some(Boolean)
  const allItemsDecided = findings.every((f) => approvals[f.id] !== undefined)
  const canSubmit = hasApprovedItems && termsAccepted && signature && allItemsDecided

  const { totalApproved } = calculateTotals()

  // Show success view if completed
  if (status === 'success' && completedApproval) {
    return (
      <SuccessView
        approval={completedApproval}
        findings={findings}
        onClose={() => setStatus('draft')}
      />
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">Approvazione Interventi</h1>
        {customerName && (
          <p className="text-gray-600">Cliente: <span className="font-medium">{customerName}</span></p>
        )}
        {vehicleInfo && (
          <p className="text-gray-600">Veicolo: <span className="font-medium">{vehicleInfo}</span></p>
        )}
        <p className="text-sm text-gray-500">{shopName}</p>
      </div>

      {/* Error State */}
      {status === 'error' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Si è verificato un errore</p>
            <p className="text-sm">Riprova o contatta l&apos;assistenza.</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Findings List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Problemi Rilevati
              </CardTitle>
              <CardDescription>
                Seleziona quali interventi approvare ({findings.length} elementi)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {findings.map((finding) => (
                <FindingCard
                  key={finding.id}
                  finding={finding}
                  isApproved={approvals[finding.id] ?? null}
                  onApprove={() => handleApproveFinding(finding.id)}
                  onReject={() => handleRejectFinding(finding.id)}
                />
              ))}
            </CardContent>
          </Card>

          {/* Digital Signature */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pen className="h-5 w-5" />
                Firma Digitale
              </CardTitle>
              <CardDescription>
                Firma per confermare l&apos;approvazione degli interventi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignaturePad onSignatureChange={setSignature} />
            </CardContent>
          </Card>

          {/* Payment Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Pagamento Acconto
              </CardTitle>
              <CardDescription>
                Opzionale: versa un acconto per confermare gli interventi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Deposit Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Importo acconto (€)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="pl-7"
                  />
                </div>
                {depositAmount && parseFloat(depositAmount) > totalApproved && (
                  <p className="text-sm text-amber-600 mt-1">
                    L&apos;acconto supera il totale approvato
                  </p>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Metodo di pagamento
                </label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Carta di credito/debito
                      </div>
                    </SelectItem>
                    <SelectItem value="bank_transfer">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Bonifico bancario
                      </div>
                    </SelectItem>
                    <SelectItem value="cash">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        Contanti
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Stripe Payment Placeholder */}
              {depositAmount && parseFloat(depositAmount) > 0 && paymentMethod === 'card' && (
                <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-center gap-2 text-gray-400 mb-3">
                    <Lock className="h-4 w-4" />
                    <span className="text-sm font-medium">Pagamento sicuro con Stripe</span>
                  </div>
                  <div className="h-12 bg-white border rounded flex items-center justify-center text-sm text-gray-400">
                    <Shield className="h-4 w-4 mr-2" />
                    Stripe Elements placeholder
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Terms and Submit */}
          <Card className={cn(!termsAccepted && 'border-amber-200')}
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                />
                <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer">
                  Dichiaro di aver letto e approvato il preventivo per gli interventi selezionati.
                  Autorizzo l&apos;officina ad eseguire i lavori approvati e comprendo che i costi
                  potrebbero variare in base a ulteriori problematiche riscontrate.
                </label>
              </div>

              {!allItemsDecided && (
                <p className="text-sm text-amber-600 mt-3 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Decidi per tutti gli interventi prima di procedere
                </p>
              )}

              <Button
                className="w-full mt-4"
                size="lg"
                disabled={!canSubmit || status === 'submitting'}
                onClick={() => setShowConfirmation(true)}
              >
                {status === 'submitting' ? (
                  <>
                    <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Conferma Approvazione
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-6">
            <CostSummary findings={findings} approvals={approvals} />

            {/* Help Card */}
            <Card className="bg-blue-50 border-blue-100">
              <CardHeader>
                <CardTitle className="text-sm text-blue-800">Hai dubbi?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-blue-700 mb-3">
                  Contatta il nostro team per maggiori informazioni sugli interventi.
                </p>
                <Button variant="outline" size="sm" className="w-full border-blue-200">
                  <Mail className="h-4 w-4 mr-2" />
                  Contatta Officina
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Conferma Approvazione
            </DialogTitle>
            <DialogDescription>
              Stai per approvare gli interventi selezionati. Questa azione è definitiva.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Interventi approvati</span>
                <span className="font-medium">
                  {Object.values(approvals).filter(Boolean).length} su {findings.length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Totale da pagare</span>
                <span className="font-bold text-lg">{formatCurrency(totalApproved)}</span>
              </div>
              {depositAmount && parseFloat(depositAmount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Acconto</span>
                  <span className="font-medium text-amber-600">
                    {formatCurrency(parseFloat(depositAmount))}
                  </span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              className="flex-1"
            >
              Annulla
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-2" />
              Conferma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================
// Exports
// ============================================

export { SuccessView, SignaturePad, FindingCard, CostSummary }
export default ApprovalWorkflow
