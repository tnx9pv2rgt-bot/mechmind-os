"use client"

import * as React from "react"
import { AlertTriangle, X, Clock, ChevronRight, Bell } from "lucide-react"

import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { WarrantyWithClaims } from "@/lib/services/warrantyService"

interface ExpiringAlertProps {
  warranties: WarrantyWithClaims[]
  onViewAll?: () => void
  onViewWarranty?: (warrantyId: string) => void
  className?: string
}

function calculateDaysRemaining(expirationDate: Date | string): number {
  const now = new Date().getTime()
  const expiry = new Date(expirationDate).getTime()
  const diff = expiry - now
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function ExpiringAlert({ 
  warranties, 
  onViewAll,
  onViewWarranty,
  className 
}: ExpiringAlertProps) {
  const [dismissed, setDismissed] = React.useState(false)

  if (dismissed || warranties.length === 0) {
    return null
  }

  // Sort by days remaining
  const sortedWarranties = [...warranties].sort((a, b) => {
    const daysA = calculateDaysRemaining(a.expirationDate)
    const daysB = calculateDaysRemaining(b.expirationDate)
    return daysA - daysB
  })

  const mostUrgent = sortedWarranties[0]
  const daysRemaining = calculateDaysRemaining(mostUrgent.expirationDate)
  
  const isCritical = daysRemaining <= 7
  const isWarning = daysRemaining <= 30

  return (
    <Alert 
      className={cn(
        "relative",
        isCritical 
          ? "border-red-200 bg-red-50" 
          : isWarning 
            ? "border-amber-200 bg-amber-50" 
            : "border-blue-200 bg-blue-50",
        className
      )}
    >
      <Bell className={cn(
        "h-4 w-4",
        isCritical ? "text-red-600" : isWarning ? "text-amber-600" : "text-blue-600"
      )} />
      <AlertTitle className={cn(
        "flex items-center gap-2",
        isCritical ? "text-red-800" : isWarning ? "text-amber-800" : "text-blue-800"
      )}>
        <AlertTriangle className="h-4 w-4" />
        {warranties.length === 1 
          ? "Warranty Expiring Soon" 
          : `${warranties.length} Warranties Expiring Soon`
        }
      </AlertTitle>
      <AlertDescription className={cn(
        "mt-2",
        isCritical ? "text-red-700" : isWarning ? "text-amber-700" : "text-blue-700"
      )}>
        <div className="space-y-3">
          {/* Most urgent warranty */}
          {warranties.length === 1 ? (
            <p>
              The warranty for {mostUrgent.vehicle?.make} {mostUrgent.vehicle?.model} expires in{" "}
              <span className={cn(
                "font-semibold",
                isCritical ? "text-red-800" : "text-amber-800"
              )}>
                {daysRemaining} days
              </span>
              .
            </p>
          ) : (
            <>
              <p>
                The most urgent warranty expires in{" "}
                <span className={cn(
                  "font-semibold",
                  isCritical ? "text-red-800" : "text-amber-800"
                )}>
                  {daysRemaining} days
                </span>
                .
              </p>
              
              {/* List of expiring warranties */}
              <div className="space-y-2 mt-3">
                {sortedWarranties.slice(0, 3).map((warranty) => {
                  const days = calculateDaysRemaining(warranty.expirationDate)
                  return (
                    <div 
                      key={warranty.id}
                      className={cn(
                        "flex items-center justify-between p-2 rounded cursor-pointer transition-colors",
                        isCritical 
                          ? "bg-red-100 hover:bg-red-200" 
                          : "bg-white/50 hover:bg-white/80"
                      )}
                      onClick={() => onViewWarranty?.(warranty.id)}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span className="text-sm font-medium">
                          {warranty.vehicle?.make} {warranty.vehicle?.model}
                        </span>
                      </div>
                      <span className={cn(
                        "text-sm font-semibold",
                        days <= 7 ? "text-red-700" : days <= 30 ? "text-amber-700" : "text-blue-700"
                      )}>
                        {days}d
                      </span>
                    </div>
                  )
                })}
                {sortedWarranties.length > 3 && (
                  <p className="text-sm text-center py-1">
                    and {sortedWarranties.length - 3} more...
                  </p>
                )}
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            {onViewAll && (
              <Button 
                variant="outline" 
                size="sm"
                className={cn(
                  "flex-1",
                  isCritical 
                    ? "border-red-200 hover:bg-red-100" 
                    : "border-amber-200 hover:bg-amber-100"
                )}
                onClick={onViewAll}
              >
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {onViewWarranty && warranties.length === 1 && (
              <Button 
                size="sm"
                className={cn(
                  "flex-1",
                  isCritical 
                    ? "bg-red-600 hover:bg-red-700" 
                    : "bg-amber-600 hover:bg-amber-700"
                )}
                onClick={() => onViewWarranty(mostUrgent.id)}
              >
                View Details
              </Button>
            )}
          </div>
        </div>
      </AlertDescription>

      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        className={cn(
          "absolute top-2 right-2 p-1 rounded-full transition-colors",
          isCritical 
            ? "hover:bg-red-200 text-red-600" 
            : isWarning 
              ? "hover:bg-amber-200 text-amber-600" 
              : "hover:bg-blue-200 text-blue-600"
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </Alert>
  )
}

export default ExpiringAlert
