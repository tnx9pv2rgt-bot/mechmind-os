"use client"

import * as React from "react"
import { Filter, Search, SlidersHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ClaimCard } from "./ClaimCard"
import { WarrantyClaim, ClaimStatus } from "@/lib/services/warrantyService"

interface ClaimsListProps {
  claims: Array<WarrantyClaim & { warranty?: { vehicle?: { make: string; model: string } } }>
  onClaimClick?: (claim: WarrantyClaim) => void
  onReviewClaim?: (claim: WarrantyClaim) => void
  onPayClaim?: (claim: WarrantyClaim) => void
  showVehicle?: boolean
  className?: string
}

export function ClaimsList({ 
  claims, 
  onClaimClick,
  onReviewClaim,
  onPayClaim,
  showVehicle = false,
  className 
}: ClaimsListProps) {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<ClaimStatus | "ALL">("ALL")

  const filteredClaims = React.useMemo(() => {
    return claims.filter((claim) => {
      // Filter by status
      if (statusFilter !== "ALL" && claim.status !== statusFilter) {
        return false
      }

      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesDescription = claim.description.toLowerCase().includes(searchLower)
        const matchesVehicle = showVehicle && claim.warranty?.vehicle
          ? `${claim.warranty.vehicle.make} ${claim.warranty.vehicle.model}`.toLowerCase().includes(searchLower)
          : false
        
        return matchesDescription || matchesVehicle
      }

      return true
    })
  }, [claims, statusFilter, searchTerm, showVehicle])

  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = { ALL: claims.length }
    Object.values(ClaimStatus).forEach((status) => {
      counts[status] = claims.filter((c) => c.status === status).length
    })
    return counts
  }, [claims])

  return (
    <div className={cn("space-y-6", className)}>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search claims..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-gray-500" />
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as ClaimStatus | "ALL")}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">
                All Status ({statusCounts.ALL})
              </SelectItem>
              <SelectItem value={ClaimStatus.SUBMITTED}>
                Submitted ({statusCounts[ClaimStatus.SUBMITTED]})
              </SelectItem>
              <SelectItem value={ClaimStatus.UNDER_REVIEW}>
                Under Review ({statusCounts[ClaimStatus.UNDER_REVIEW]})
              </SelectItem>
              <SelectItem value={ClaimStatus.APPROVED}>
                Approved ({statusCounts[ClaimStatus.APPROVED]})
              </SelectItem>
              <SelectItem value={ClaimStatus.REJECTED}>
                Rejected ({statusCounts[ClaimStatus.REJECTED]})
              </SelectItem>
              <SelectItem value={ClaimStatus.PAID}>
                Paid ({statusCounts[ClaimStatus.PAID]})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredClaims.length} of {claims.length} claims
        </p>
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm("")
              setStatusFilter("ALL")
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Claims Grid */}
      {filteredClaims.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Filter className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No claims found</h3>
          <p className="text-sm text-gray-500 mt-1">
            {searchTerm || statusFilter !== "ALL"
              ? "Try adjusting your filters"
              : "No claims have been filed yet"
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredClaims.map((claim) => (
            <ClaimCard
              key={claim.id}
              claim={claim}
              showVehicle={showVehicle}
              onClick={() => onClaimClick?.(claim)}
              onReview={onReviewClaim ? () => onReviewClaim(claim) : undefined}
              onPay={onPayClaim ? () => onPayClaim(claim) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default ClaimsList
