"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { 
  ArrowLeft, 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  DollarSign,
  User,
  Calendar,
  MessageSquare,
  Eye,
  Check,
  X
} from "lucide-react"

import { cn, formatCurrency, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { 
  warrantyService, 
  WarrantyClaim, 
  ClaimStatus 
} from "@/lib/services/warrantyService"

const statusConfig: Record<ClaimStatus, { 
  label: string; 
  color: string; 
  icon: React.ReactNode;
  bgColor: string;
}> = {
  SUBMITTED: {
    label: "Submitted",
    color: "text-blue-700",
    icon: <FileText className="h-5 w-5" />,
    bgColor: "bg-blue-50",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    color: "text-amber-700",
    icon: <Clock className="h-5 w-5" />,
    bgColor: "bg-amber-50",
  },
  APPROVED: {
    label: "Approved",
    color: "text-green-700",
    icon: <CheckCircle2 className="h-5 w-5" />,
    bgColor: "bg-green-50",
  },
  REJECTED: {
    label: "Rejected",
    color: "text-red-700",
    icon: <XCircle className="h-5 w-5" />,
    bgColor: "bg-red-50",
  },
  PAID: {
    label: "Paid",
    color: "text-purple-700",
    icon: <DollarSign className="h-5 w-5" />,
    bgColor: "bg-purple-50",
  },
}

export default function ClaimDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const claimId = params.id as string
  const autoReview = searchParams.get('action') === 'review'

  const [claim, setClaim] = React.useState<(WarrantyClaim & { warranty?: { vehicle?: { make: string; model: string }; provider: string; maxCoverage: number } }) | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [reviewDialogOpen, setReviewDialogOpen] = React.useState(false)
  const [isReviewing, setIsReviewing] = React.useState(false)
  
  // Review form state
  const [reviewDecision, setReviewDecision] = React.useState<'APPROVE' | 'REJECT' | null>(null)
  const [approvedAmount, setApprovedAmount] = React.useState("")
  const [reviewNotes, setReviewNotes] = React.useState("")

  React.useEffect(() => {
    loadClaim()
  }, [claimId])

  React.useEffect(() => {
    if (autoReview && claim && claim.status === ClaimStatus.SUBMITTED) {
      setReviewDialogOpen(true)
    }
  }, [autoReview, claim])

  const loadClaim = async () => {
    try {
      setIsLoading(true)
      const data = await warrantyService.getClaim(claimId)
      if (!data) {
        toast({
          title: "Claim not found",
          description: "The requested claim could not be found",
          variant: "error",
        })
        router.push('/dashboard/warranty/claims')
        return
      }
      setClaim(data)
      if (data.approvedAmount) {
        setApprovedAmount(data.approvedAmount.toString())
      }
    } catch (error) {
      toast({
        title: "Error loading claim",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReview = async () => {
    if (!reviewDecision) return

    try {
      setIsReviewing(true)
      await warrantyService.reviewClaim(
        claimId,
        reviewDecision,
        reviewDecision === 'APPROVE' ? parseFloat(approvedAmount) : undefined,
        reviewNotes,
        "Current User" // In production, use actual user
      )
      toast({
        title: `Claim ${reviewDecision.toLowerCase()}ed`,
        description: `The claim has been ${reviewDecision.toLowerCase()}ed successfully`,
      })
      setReviewDialogOpen(false)
      loadClaim()
    } catch (error) {
      toast({
        title: "Error reviewing claim",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "error",
      })
    } finally {
      setIsReviewing(false)
    }
  }

  const handleMarkPaid = async () => {
    try {
      await warrantyService.markClaimPaid(claimId)
      toast({
        title: "Claim marked as paid",
        description: "The claim has been marked as paid successfully",
      })
      loadClaim()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "error",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!claim) {
    return null
  }

  const status = statusConfig[claim.status as ClaimStatus]
  const canReview = claim.status === ClaimStatus.SUBMITTED || claim.status === ClaimStatus.UNDER_REVIEW
  const canPay = claim.status === ClaimStatus.APPROVED

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/warranty/claims')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Claim Details</h1>
            <p className="text-sm text-gray-500">
              Submitted on {formatDate(claim.submittedDate)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canReview && (
            <Button onClick={() => setReviewDialogOpen(true)}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Review Claim
            </Button>
          )}
          {canPay && (
            <Button onClick={handleMarkPaid}>
              <DollarSign className="h-4 w-4 mr-2" />
              Mark as Paid
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={cn("p-3 rounded-lg", status.bgColor)}>
                  <span className={status.color}>{status.icon}</span>
                </div>
                <div>
                  <CardTitle className="text-lg">Claim Status</CardTitle>
                  <Badge className={cn("mt-1", status.bgColor, status.color)}>
                    {status.label}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Amounts */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Estimated Cost</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(claim.amount)}
                  </div>
                </div>

              </div>

              {/* Description */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <MessageSquare className="h-4 w-4" />
                  <span>Issue Description</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-800 whitespace-pre-wrap">{claim.description}</p>
                </div>
              </div>

              {/* Evidence */}
              {claim.evidencePhotos && claim.evidencePhotos.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Eye className="h-4 w-4" />
                    <span>Photo Evidence ({claim.evidencePhotos.length})</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {claim.evidencePhotos.map((url, index) => (
                      <div
                        key={index}
                        className="aspect-video rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
                      >
                        <img
                          src={url}
                          alt={`Evidence ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Review History */}
          {(claim.reviewedDate || claim.resolvedDate) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Claim History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {claim.reviewedDate && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Reviewed</p>
                      <p className="text-sm text-gray-500">
                        on {formatDate(claim.reviewedDate)}
                      </p>
                    </div>
                  </div>
                )}
                {claim.resolvedDate && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Resolved</p>
                      <p className="text-sm text-gray-500">
                        on {formatDate(claim.resolvedDate)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Warranty Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Warranty Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {claim.warranty?.vehicle && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vehicle</span>
                    <span className="font-medium">
                      {claim.warranty.vehicle.make} {claim.warranty.vehicle.model}
                    </span>
                  </div>
                  <Separator />
                </>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Provider</span>
                <span className="font-medium">{claim.warranty?.provider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Max Coverage</span>
                <span className="font-medium">
                  {formatCurrency(claim.warranty?.maxCoverage || 0)}
                </span>
              </div>
              <Separator />
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => router.push(`/dashboard/warranty/${claim.warrantyId}`)}
              >
                View Warranty
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Claim</DialogTitle>
            <DialogDescription>
              Approve or reject this warranty claim
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Decision Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setReviewDecision('APPROVE')}
                className={cn(
                  "p-4 rounded-lg border-2 text-center transition-all",
                  reviewDecision === 'APPROVE' 
                    ? "border-green-500 bg-green-50" 
                    : "border-gray-200 hover:border-green-300"
                )}
              >
                <Check className={cn(
                  "h-6 w-6 mx-auto mb-2",
                  reviewDecision === 'APPROVE' ? "text-green-600" : "text-gray-400"
                )} />
                <p className={cn(
                  "font-medium",
                  reviewDecision === 'APPROVE' ? "text-green-700" : "text-gray-700"
                )}>
                  Approve
                </p>
              </button>
              <button
                onClick={() => setReviewDecision('REJECT')}
                className={cn(
                  "p-4 rounded-lg border-2 text-center transition-all",
                  reviewDecision === 'REJECT' 
                    ? "border-red-500 bg-red-50" 
                    : "border-gray-200 hover:border-red-300"
                )}
              >
                <X className={cn(
                  "h-6 w-6 mx-auto mb-2",
                  reviewDecision === 'REJECT' ? "text-red-600" : "text-gray-400"
                )} />
                <p className={cn(
                  "font-medium",
                  reviewDecision === 'REJECT' ? "text-red-700" : "text-gray-700"
                )}>
                  Reject
                </p>
              </button>
            </div>

            {/* Approved Amount (only for approve) */}
            {reviewDecision === 'APPROVE' && (
              <div className="space-y-2">
                <Label htmlFor="approvedAmount">Approved Amount (€)</Label>
                <Input
                  id="approvedAmount"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Max: {formatCurrency(claim.warranty?.maxCoverage || 0)}
                </p>
              </div>
            )}

            {/* Review Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Review Notes</Label>
              <Textarea
                id="notes"
                placeholder={reviewDecision === 'REJECT' ? "Reason for rejection..." : "Additional notes..."}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReview}
              disabled={!reviewDecision || (reviewDecision === 'APPROVE' && !approvedAmount) || isReviewing}
              className={cn(
                reviewDecision === 'REJECT' && "bg-red-600 hover:bg-red-700"
              )}
            >
              {isReviewing ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
