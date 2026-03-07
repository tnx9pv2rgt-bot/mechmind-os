"use client"

import * as React from "react"
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  DollarSign, 
  FileText,
  User,
  Calendar,
  MessageSquare,
  ChevronRight,
  Eye
} from "lucide-react"

import { cn, formatCurrency, formatDate } from "@/lib/utils"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { WarrantyClaim, ClaimStatus } from "@/lib/services/warrantyService"

interface ClaimCardProps {
  claim: WarrantyClaim & { warranty?: { vehicle?: { make: string; model: string } } }
  onClick?: () => void
  onReview?: () => void
  onPay?: () => void
  showVehicle?: boolean
  className?: string
}

const statusConfig: Record<ClaimStatus, { 
  label: string; 
  color: string; 
  icon: React.ReactNode;
  bgColor: string;
}> = {
  SUBMITTED: {
    label: "Submitted",
    color: "text-blue-700",
    icon: <FileText className="h-4 w-4" />,
    bgColor: "bg-blue-50 border-blue-200",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    color: "text-amber-700",
    icon: <Clock className="h-4 w-4" />,
    bgColor: "bg-amber-50 border-amber-200",
  },
  APPROVED: {
    label: "Approved",
    color: "text-green-700",
    icon: <CheckCircle2 className="h-4 w-4" />,
    bgColor: "bg-green-50 border-green-200",
  },
  REJECTED: {
    label: "Rejected",
    color: "text-red-700",
    icon: <XCircle className="h-4 w-4" />,
    bgColor: "bg-red-50 border-red-200",
  },
  PAID: {
    label: "Paid",
    color: "text-purple-700",
    icon: <DollarSign className="h-4 w-4" />,
    bgColor: "bg-purple-50 border-purple-200",
  },
}

export function ClaimCard({ 
  claim, 
  onClick, 
  onReview,
  onPay,
  showVehicle = false,
  className 
}: ClaimCardProps) {
  const status = statusConfig[claim.status]

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        onClick && "hover:border-gray-300",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", status.bgColor)}>
              <span className={status.color}>{status.icon}</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {showVehicle && claim.warranty?.vehicle 
                  ? `${claim.warranty.vehicle.make} ${claim.warranty.vehicle.model}`
                  : "Warranty Claim"
                }
              </h3>
              <p className="text-sm text-gray-500">
                Submitted {formatDate(claim.submittedAt)}
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Badge */}
        <Badge variant="outline" className={cn("flex items-center gap-1 w-fit", status.bgColor, status.color)}>
          {status.icon}
          {status.label}
        </Badge>

        {/* Amounts */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Estimated Cost</div>
            <div className="font-semibold text-gray-900">
              {formatCurrency(claim.estimatedCost)}
            </div>
          </div>
          {claim.approvedAmount !== null && claim.approvedAmount !== undefined && (
            <div className={cn(
              "rounded-lg p-3",
              claim.status === ClaimStatus.REJECTED ? "bg-red-50" : "bg-green-50"
            )}>
              <div className="text-xs text-gray-600 mb-1">
                {claim.status === ClaimStatus.REJECTED ? "Rejected" : "Approved Amount"}
              </div>
              <div className={cn(
                "font-semibold",
                claim.status === ClaimStatus.REJECTED ? "text-red-700" : "text-green-700"
              )}>
                {claim.status === ClaimStatus.REJECTED 
                  ? "—" 
                  : formatCurrency(claim.approvedAmount)
                }
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <MessageSquare className="h-3 w-3" />
            <span>Description</span>
          </div>
          <p className="text-sm text-gray-800 line-clamp-2 bg-gray-50 p-2 rounded">
            {claim.issueDescription}
          </p>
        </div>

        {/* Evidence Count */}
        {claim.evidence && claim.evidence.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Eye className="h-4 w-4" />
            <span>{claim.evidence.length} photo{claim.evidence.length !== 1 ? 's' : ''} attached</span>
          </div>
        )}

        {/* Review Info */}
        {claim.reviewedAt && (
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <User className="h-3 w-3" />
              <span>Reviewed by {claim.reviewedBy || "Admin"}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Calendar className="h-3 w-3" />
              <span>Reviewed on {formatDate(claim.reviewedAt)}</span>
            </div>
            {claim.reviewNotes && (
              <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                <span className="font-medium">Notes:</span> {claim.reviewNotes}
              </p>
            )}
          </div>
        )}

        {/* Payment Date */}
        {claim.paidAt && (
          <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 p-2 rounded">
            <DollarSign className="h-3 w-3" />
            <span>Paid on {formatDate(claim.paidAt)}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          {claim.status === ClaimStatus.SUBMITTED && onReview && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation()
                onReview()
              }}
            >
              Review Claim
            </Button>
          )}
          {claim.status === ClaimStatus.APPROVED && onPay && (
            <Button 
              size="sm" 
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation()
                onPay()
              }}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Mark as Paid
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default ClaimCard
