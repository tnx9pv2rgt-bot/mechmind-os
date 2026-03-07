"use client"

import * as React from "react"
import { 
  Shield, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Car,
  Gauge,
  Euro,
  ChevronRight
} from "lucide-react"

import { cn, formatCurrency, formatDate } from "@/lib/utils"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Warranty, WarrantyStatus, WarrantyType, WarrantyClaim } from "@/lib/services/warrantyService"

interface WarrantyCardProps {
  warranty: any
  onClick?: () => void
  className?: string
}

const statusConfig: Record<WarrantyStatus, { label: string; color: string; icon: React.ReactNode }> = {
  ACTIVE: {
    label: "Active",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  EXPIRING_SOON: {
    label: "Expiring Soon",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  EXPIRED: {
    label: "Expired",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: <XCircle className="h-4 w-4" />,
  },
  VOID: {
    label: "Void",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: <XCircle className="h-4 w-4" />,
  },
}

const typeConfig: Record<WarrantyType, { label: string; color: string }> = {
  MANUFACTURER: {
    label: "Manufacturer",
    color: "bg-blue-100 text-blue-800",
  },
  EXTENDED: {
    label: "Extended",
    color: "bg-purple-100 text-purple-800",
  },
  DEALER: {
    label: "Dealer",
    color: "bg-teal-100 text-teal-800",
  },
  AS_IS: {
    label: "As-Is",
    color: "bg-gray-100 text-gray-800",
  },
}

function calculateProgress(startDate: Date | string, expirationDate: Date | string): number {
  const start = new Date(startDate).getTime()
  const end = new Date(expirationDate).getTime()
  const now = new Date().getTime()

  if (now >= end) return 100
  if (now <= start) return 0

  const total = end - start
  const elapsed = now - start
  return Math.round((elapsed / total) * 100)
}

function calculateDaysRemaining(expirationDate: Date | string): number {
  const now = new Date().getTime()
  const expiry = new Date(expirationDate).getTime()
  const diff = expiry - now
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function WarrantyCard({ warranty, onClick, className }: WarrantyCardProps) {
  const status = statusConfig[warranty.status]
  const type = typeConfig[warranty.type]
  const progress = calculateProgress(warranty.startDate, warranty.expirationDate)
  const daysRemaining = calculateDaysRemaining(warranty.expirationDate)
  
  const totalClaims = warranty.claims?.length || 0
  const approvedClaims = warranty.claims?.filter(c => c.status === 'APPROVED' || c.status === 'PAID').length || 0
  const totalClaimed = warranty.claims?.reduce((sum, c) => sum + (c.approvedAmount || 0), 0) || 0
  const remainingCoverage = warranty.maxCoverage - totalClaimed

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-gray-300",
        onClick && "hover:translate-y-[-2px]",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              warranty.status === WarrantyStatus.ACTIVE ? "bg-green-50" :
              warranty.status === WarrantyStatus.EXPIRING_SOON ? "bg-amber-50" :
              warranty.status === WarrantyStatus.EXPIRED ? "bg-red-50" : "bg-gray-50"
            )}>
              <Shield className={cn(
                "h-5 w-5",
                warranty.status === WarrantyStatus.ACTIVE ? "text-green-600" :
                warranty.status === WarrantyStatus.EXPIRING_SOON ? "text-amber-600" :
                warranty.status === WarrantyStatus.EXPIRED ? "text-red-600" : "text-gray-600"
              )} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {warranty.vehicle ? 
                  `${warranty.vehicle.make} ${warranty.vehicle.model} ${warranty.vehicle.year}` :
                  "Vehicle Warranty"
                }
              </h3>
              <p className="text-sm text-gray-500">{warranty.provider}</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("flex items-center gap-1", status.color)}>
            {status.icon}
            {status.label}
          </Badge>
          <Badge className={cn(type.color, "border-0")}>
            {type.label}
          </Badge>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Coverage Period</span>
            <span className="font-medium text-gray-900">{progress}% elapsed</span>
          </div>
          <Progress 
            value={progress} 
            className="h-2"
          />
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{formatDate(warranty.startDate)}</span>
            <span>{formatDate(warranty.expirationDate)}</span>
          </div>
        </div>

        {/* Days Remaining */}
        {warranty.status !== WarrantyStatus.EXPIRED && warranty.status !== WarrantyStatus.VOID && (
          <div className={cn(
            "flex items-center gap-2 p-3 rounded-lg text-sm",
            daysRemaining <= 30 ? "bg-red-50 text-red-700" :
            daysRemaining <= 60 ? "bg-amber-50 text-amber-700" :
            "bg-green-50 text-green-700"
          )}>
            <Calendar className="h-4 w-4" />
            <span className="font-medium">
              {daysRemaining > 0 ? `${daysRemaining} days remaining` : "Expires today"}
            </span>
          </div>
        )}

        {/* Coverage Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
              <Euro className="h-3 w-3" />
              <span>Remaining</span>
            </div>
            <div className="font-semibold text-gray-900">
              {formatCurrency(remainingCoverage)}
            </div>
            <div className="text-xs text-gray-500">
              of {formatCurrency(warranty.maxCoverage)}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
              <Gauge className="h-3 w-3" />
              <span>Coverage</span>
            </div>
            <div className="font-semibold text-gray-900">
              {warranty.coverageKm ? `${warranty.coverageKm.toLocaleString()} km` : "Unlimited"}
            </div>
            <div className="text-xs text-gray-500">
              Deductible: {formatCurrency(warranty.deductible)}
            </div>
          </div>
        </div>

        {/* Claims Summary */}
        {totalClaims > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-sm text-gray-600">
              {totalClaims} claim{totalClaims !== 1 ? 's' : ''} filed
            </span>
            <span className="text-sm text-gray-900">
              {approvedClaims} approved
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default WarrantyCard
