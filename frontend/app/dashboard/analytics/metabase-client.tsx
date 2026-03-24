'use client'

/**
 * MechMind OS - Metabase Embedded Dashboard Client Component
 * 
 * Client-side component for embedding Metabase dashboards via iframe.
 * Handles URL generation, loading states, and error handling.
 * 
 * @module MetabaseClient
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Loader2, 
  RefreshCw, 
  AlertCircle, 
  ExternalLink,
  Maximize2,
  Settings,
  BarChart3
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

// Dashboard type definitions
export type DashboardType = 
  | 'overview' 
  | 'revenue' 
  | 'customers' 
  | 'mechanics' 
  | 'vehicles' 
  | 'executive'

interface DashboardConfig {
  id: DashboardType
  name: string
  description: string
  icon: React.ElementType
  defaultHeight: number
}

const DASHBOARDS: Record<DashboardType, DashboardConfig> = {
  overview: {
    id: 'overview',
    name: 'Panoramica Prenotazioni',
    description: 'Prenotazioni giornaliere, tasso completamento',
    icon: BarChart3,
    defaultHeight: 800,
  },
  revenue: {
    id: 'revenue',
    name: 'Analisi Ricavi',
    description: 'Fatturato mensile, trend anno/anno',
    icon: BarChart3,
    defaultHeight: 800,
  },
  customers: {
    id: 'customers',
    name: 'Insight Clienti',
    description: 'Nuovi clienti, retention rate',
    icon: BarChart3,
    defaultHeight: 800,
  },
  mechanics: {
    id: 'mechanics',
    name: 'Performance Tecnici',
    description: 'Ore lavorate, efficienza',
    icon: BarChart3,
    defaultHeight: 800,
  },
  vehicles: {
    id: 'vehicles',
    name: 'Analisi Veicoli',
    description: 'Servizi per marca/modello',
    icon: BarChart3,
    defaultHeight: 800,
  },
  executive: {
    id: 'executive',
    name: 'Riepilogo Esecutivo',
    description: 'KPI principali riepilogativi',
    icon: BarChart3,
    defaultHeight: 800,
  },
}

interface MetabaseUrlResponse {
  success: boolean
  data: {
    url: string
    expiresAt: string
    dashboardId: number
  }
}

interface MetabaseConfigResponse {
  success: boolean
  data: {
    enabled: boolean
    url: string
    dashboards: Record<string, number>
  }
}

// API client functions
async function fetchDashboardUrl(dashboard: DashboardType, expiryMinutes = 10): Promise<MetabaseUrlResponse> {
  const response = await fetch(
    `/api/analytics/metabase/dashboard-url?dashboard=${dashboard}&expiryMinutes=${expiryMinutes}`
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Errore sconosciuto' }))
    throw new Error(error.message || `Errore nel recupero URL dashboard: ${response.status}`)
  }
  
  return response.json()
}

async function fetchMetabaseConfig(): Promise<MetabaseConfigResponse> {
  const response = await fetch('/api/analytics/metabase/config')
  
  if (!response.ok) {
    throw new Error('Errore nel recupero configurazione Metabase')
  }
  
  return response.json()
}

// Loading skeleton component
function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-apple-light-gray/50 rounded-lg w-1/3" />
      <div className="h-64 bg-apple-light-gray/50 rounded-2xl" />
      <div className="grid grid-cols-3 gap-4">
        <div className="h-32 bg-apple-light-gray/50 rounded-xl" />
        <div className="h-32 bg-apple-light-gray/50 rounded-xl" />
        <div className="h-32 bg-apple-light-gray/50 rounded-xl" />
      </div>
    </div>
  )
}

// Error display component
interface ErrorDisplayProps {
  error: Error
  onRetry: () => void
}

function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  return (
    <Alert variant="destructive" className="border-red-200 bg-red-50/50">
      <AlertCircle className="h-5 w-5 text-red-500" />
      <AlertTitle className="text-red-700">Errore caricamento dashboard</AlertTitle>
      <AlertDescription className="text-red-600">
        <p className="mb-4">{error.message}</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRetry}
          className="border-red-200 hover:bg-red-100"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Riprova
        </Button>
      </AlertDescription>
    </Alert>
  )
}

// Not configured display
function NotConfiguredDisplay() {
  return (
    <Alert className="border-amber-200 bg-amber-50/50">
      <Settings className="h-5 w-5 text-amber-500" />
      <AlertTitle className="text-amber-700">Metabase non configurato</AlertTitle>
      <AlertDescription className="text-amber-600">
        <p className="mb-4">
          Il sistema di Business Intelligence Metabase non è ancora configurato. 
          Contatta l&apos;amministratore per abilitare i dashboard analytics.
        </p>
        <div className="text-sm space-y-2">
          <p>Per configurare Metabase:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Avvia il container Metabase con Docker Compose</li>
            <li>Configura le variabili d&apos;ambiente METABASE_URL e METABASE_SECRET_KEY</li>
            <li>Crea i dashboard in Metabase e configura l&apos;embedding</li>
          </ol>
        </div>
      </AlertDescription>
    </Alert>
  )
}

// Main component props
interface MetabaseClientProps {
  dashboard: DashboardType
  height?: number
  showHeader?: boolean
}

/**
 * Metabase Embedded Dashboard Component
 * 
 * Embeds a Metabase dashboard via iframe with automatic signed URL generation.
 * Handles URL refresh before expiry and provides error boundaries.
 */
export function MetabaseClient({ 
  dashboard, 
  height = 800,
  showHeader = true 
}: MetabaseClientProps) {
  const queryClient = useQueryClient()
  const [iframeUrl, setIframeUrl] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Fetch Metabase configuration
  const { data: config, isLoading: configLoading, error: configError } = useQuery({
    queryKey: ['metabase-config'],
    queryFn: fetchMetabaseConfig,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  })

  // Fetch dashboard URL
  const { 
    data: urlData, 
    isLoading: urlLoading, 
    error: urlError,
    refetch: refetchUrl 
  } = useQuery({
    queryKey: ['metabase-url', dashboard],
    queryFn: () => fetchDashboardUrl(dashboard),
    enabled: !!config?.data.enabled,
    staleTime: 8 * 60 * 1000, // 8 minutes (URLs expire in 10)
  })

  // Update iframe URL when data changes
  useEffect(() => {
    if (urlData?.data?.url) {
      setIframeUrl(urlData.data.url)
      setIsLoading(true)
      setLoadError(null)
    }
  }, [urlData])

  // Auto-refresh URL before expiry
  useEffect(() => {
    if (!urlData?.data?.expiresAt) return

    const expiryTime = new Date(urlData.data.expiresAt).getTime()
    const refreshTime = expiryTime - 2 * 60 * 1000 // Refresh 2 minutes before expiry
    const now = Date.now()
    const delay = Math.max(0, refreshTime - now)

    const timeout = setTimeout(() => {
      refetchUrl()
    }, delay)

    return () => clearTimeout(timeout)
  }, [urlData, refetchUrl])

  // Handle iframe load events
  const handleIframeLoad = useCallback(() => {
    setIsLoading(false)
    setLoadError(null)
  }, [])

  const handleIframeError = useCallback(() => {
    setIsLoading(false)
    setLoadError('Impossibile caricare la dashboard')
  }, [])

  // Manual refresh handler
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['metabase-url', dashboard] })
    refetchUrl()
  }, [queryClient, dashboard, refetchUrl])

  // Open in new tab
  const handleOpenExternal = useCallback(() => {
    if (iframeUrl) {
      window.open(iframeUrl, '_blank', 'noopener,noreferrer')
    }
  }, [iframeUrl])

  // Determine error state
  const error = configError || urlError
  const isEnabled = config?.data.enabled ?? false
  const dashboardConfig = DASHBOARDS[dashboard]

  // Loading state
  if (configLoading || (isEnabled && urlLoading && !iframeUrl)) {
    return (
      <AppleCard>
        <AppleCardContent className="p-6">
          <DashboardSkeleton />
        </AppleCardContent>
      </AppleCard>
    )
  }

  // Not configured state or config fetch failed (Metabase not available)
  if (!isEnabled || configError) {
    return <NotConfiguredDisplay />
  }

  // Error state
  if (error) {
    return (
      <AppleCard>
        <AppleCardContent className="p-6">
          <ErrorDisplay error={error as Error} onRetry={handleRefresh} />
        </AppleCardContent>
      </AppleCard>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      {showHeader && (
        <AppleCard>
          <AppleCardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center">
                  <dashboardConfig.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-title-2 font-semibold text-apple-dark">
                    {dashboardConfig.name}
                  </h3>
                  <p className="text-footnote text-apple-gray">
                    {dashboardConfig.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="border-apple-border hover:bg-apple-light-gray"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenExternal}
                  className="border-apple-border hover:bg-apple-light-gray"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const elem = document.getElementById('metabase-iframe-container')
                    elem?.requestFullscreen()
                  }}
                  className="border-apple-border hover:bg-apple-light-gray"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </AppleCardHeader>
        </AppleCard>
      )}

      <AppleCard className="relative">
        <AnimatePresence>
          {(isLoading || !iframeUrl) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 bg-white flex items-center justify-center rounded-2xl"
            >
              <div className="text-center">
                <Loader2 className="h-10 w-10 text-apple-blue animate-spin mx-auto mb-4" />
                <p className="text-body text-apple-gray">Caricamento dashboard...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loadError && (
          <div className="absolute inset-0 z-10 bg-white flex items-center justify-center rounded-2xl">
            <ErrorDisplay 
              error={new Error(loadError)} 
              onRetry={handleRefresh} 
            />
          </div>
        )}

        <div className="rounded-2xl overflow-hidden bg-white">
          {iframeUrl && (
            <iframe
              src={iframeUrl}
              width="100%"
              height={height}
              frameBorder="0"
              allowTransparency
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              style={{ 
                display: isLoading ? 'none' : 'block',
                minHeight: height,
              }}
              title={`Metabase Dashboard: ${dashboardConfig.name}`}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          )}
        </div>
      </AppleCard>
    </motion.div>
  )
}

// Tabbed dashboard selector
interface MetabaseDashboardSelectorProps {
  defaultDashboard?: DashboardType
}

export function MetabaseDashboardSelector({ 
  defaultDashboard = 'overview' 
}: MetabaseDashboardSelectorProps) {
  const [activeDashboard, setActiveDashboard] = useState<DashboardType>(defaultDashboard)

  return (
    <div className="space-y-6">
      {/* Dashboard tabs */}
      <AppleCard>
        <AppleCardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(DASHBOARDS) as DashboardType[]).map((key) => {
              const config = DASHBOARDS[key]
              const isActive = activeDashboard === key
              
              return (
                <button
                  key={key}
                  onClick={() => setActiveDashboard(key)}
                  className={`
                    px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                    ${isActive 
                      ? 'bg-apple-blue text-white shadow-lg shadow-apple-blue/25' 
                      : 'bg-apple-light-gray/50 text-apple-gray hover:bg-apple-light-gray hover:text-apple-dark'
                    }
                  `}
                >
                  <span className="flex items-center gap-2">
                    <config.icon className="h-4 w-4" />
                    {config.name}
                  </span>
                </button>
              )
            })}
          </div>
        </AppleCardContent>
      </AppleCard>

      {/* Active dashboard */}
      <MetabaseClient 
        dashboard={activeDashboard} 
        showHeader={false}
      />
    </div>
  )
}

export default MetabaseClient
