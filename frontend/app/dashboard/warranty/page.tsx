"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { 
  Shield, 
  Plus, 
  FileText, 
  AlertTriangle,
  Calendar,
  TrendingUp,
  Car
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { WarrantyCard, ClaimsList, ExpiringAlert, WarrantyForm } from "@/components/warranty"
import { 
  warrantyService, 
  Warranty, 
  WarrantyClaim, 
  WarrantyStatus,
  WarrantyWithClaims 
} from "@/lib/services/warrantyService"

export default function WarrantyDashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [warranties, setWarranties] = React.useState<WarrantyWithClaims[]>([])
  const [claims, setClaims] = React.useState<(WarrantyClaim & { warranty?: { vehicle?: { make: string; model: string } } })[]>([])
  const [expiringWarranties, setExpiringWarranties] = React.useState<WarrantyWithClaims[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isCreating, setIsCreating] = React.useState(false)
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)

  // Load data
  React.useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [allWarranties, allClaims, expiring] = await Promise.all([
        warrantyService.listWarranties(),
        warrantyService.getClaims(),
        warrantyService.getExpiringWarranties(60),
      ])
      setWarranties(allWarranties)
      setClaims(allClaims)
      setExpiringWarranties(expiring)
    } catch (error) {
      toast({
        title: "Error loading data",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateWarranty = async (data: any) => {
    try {
      setIsCreating(true)
      await warrantyService.createWarranty(data)
      toast({
        title: "Warranty created",
        description: "The warranty has been created successfully",
      })
      setCreateDialogOpen(false)
      loadData()
    } catch (error) {
      toast({
        title: "Error creating warranty",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "error",
      })
    } finally {
      setIsCreating(false)
    }
  }

  // Calculate stats
  const stats = React.useMemo(() => {
    const active = warranties.filter(w => w.status === WarrantyStatus.ACTIVE).length
    const expiringSoon = warranties.filter(w => w.status === WarrantyStatus.EXPIRING_SOON).length
    const expired = warranties.filter(w => w.status === WarrantyStatus.EXPIRED).length
    const pendingClaims = claims.filter(c => c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW').length

    return { active, expiringSoon, expired, pendingClaims }
  }, [warranties, claims])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warranty Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track warranties and manage claims
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Warranty
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Warranty</DialogTitle>
              <DialogDescription>
                Add a new warranty for a vehicle
              </DialogDescription>
            </DialogHeader>
            <WarrantyForm
              onSubmit={handleCreateWarranty}
              onCancel={() => setCreateDialogOpen(false)}
              isLoading={isCreating}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Expiring Alert */}
      {expiringWarranties.length > 0 && (
        <ExpiringAlert 
          warranties={expiringWarranties}
          onViewAll={() => router.push('/dashboard/warranty?tab=expiring')}
          onViewWarranty={(id) => router.push(`/dashboard/warranty/${id}`)}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              Active Warranties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-600" />
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.expiringSoon}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Expired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.expired}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Pending Claims
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.pendingClaims}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="warranties" className="space-y-4">
        <TabsList>
          <TabsTrigger value="warranties">Warranties</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
        </TabsList>

        <TabsContent value="warranties" className="space-y-4">
          {warranties.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No warranties yet</h3>
              <p className="text-sm text-gray-500 mt-1">
                Create a warranty to start tracking coverage
              </p>
              <Button 
                className="mt-4" 
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Warranty
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {warranties.map((warranty) => (
                <WarrantyCard
                  key={warranty.id}
                  warranty={warranty}
                  onClick={() => router.push(`/dashboard/warranty/${warranty.id}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="claims">
          <ClaimsList
            claims={claims}
            showVehicle
            onClaimClick={(claim) => router.push(`/dashboard/warranty/claims/${claim.id}`)}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
