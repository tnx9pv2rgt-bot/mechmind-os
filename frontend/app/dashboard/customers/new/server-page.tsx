import { Suspense } from 'react'
import { headers } from 'next/headers'
import { cookies } from 'next/headers'

// Server Component (zero JS bundle)
export const runtime = 'nodejs'

// Revalidate every hour
export const revalidate = 3600

// Force dynamic for geolocation
export const dynamic = 'force-dynamic'

interface GeoData {
  country: string
  countryName?: string
  city?: string
  region?: string
  latitude?: number
  longitude?: number
  timezone?: string
  currency: string
  isEU: boolean
}

/**
 * Fetch geolocation data from Edge API
 * This runs on the server - zero client JavaScript
 */
async function getGeoData(): Promise<GeoData> {
  try {
    // In production, this would call your edge API
    // For now, we simulate with headers
    const headersList = await headers()
    const cookiesList = await cookies()
    
    // Extract geolocation from headers (Cloudflare/Vercel)
    const country = headersList.get('cf-ipcountry') || headersList.get('x-vercel-ip-country') || 'IT'
    const city = headersList.get('cf-ipcity') || headersList.get('x-vercel-ip-city') || undefined
    const region = headersList.get('cf-region') || headersList.get('x-vercel-ip-region') || undefined
    const latitude = headersList.get('cf-iplatitude') || headersList.get('x-vercel-ip-latitude') 
      ? parseFloat(headersList.get('cf-iplatitude') || headersList.get('x-vercel-ip-latitude') || '0')
      : undefined
    const longitude = headersList.get('cf-iplongitude') || headersList.get('x-vercel-ip-longitude')
      ? parseFloat(headersList.get('cf-iplongitude') || headersList.get('x-vercel-ip-longitude') || '0')
      : undefined
    const timezone = headersList.get('cf-timezone') || headersList.get('x-vercel-ip-timezone') || 'Europe/Rome'
    
    // Determine currency
    const currency = getCurrencyByCountry(country)
    const isEU = isEuropeanCountry(country)
    
    return {
      country,
      city: city || undefined,
      region: region || undefined,
      latitude,
      longitude,
      timezone: timezone || 'Europe/Rome',
      currency,
      isEU,
    }
  } catch (error) {
    console.error('Failed to get geo data:', error)
    // Return default values
    return {
      country: 'IT',
      currency: 'EUR',
      isEU: true,
      timezone: 'Europe/Rome',
    }
  }
}

/**
 * Server Component: FormSkeleton
 * Rendered on server - no client JS
 */
function FormSkeleton() {
  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-1/3 bg-[var(--border-default)] dark:bg-[var(--border-default)] rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-[var(--border-default)] dark:bg-[var(--border-default)] rounded animate-pulse" />
      </div>
      
      {/* Form fields skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 bg-[var(--border-default)] dark:bg-[var(--border-default)] rounded animate-pulse" />
            <div className="h-10 w-full bg-[var(--border-default)] dark:bg-[var(--border-default)] rounded animate-pulse" />
          </div>
        ))}
      </div>
      
      {/* Submit button skeleton */}
      <div className="flex justify-end pt-4">
        <div className="h-12 w-32 bg-[var(--border-default)] dark:bg-[var(--border-default)] rounded animate-pulse" />
      </div>
    </div>
  )
}

/**
 * Server Component: CustomerFormServer
 * Pre-fetches data and passes to client component
 */
async function CustomerFormServer({ geoData }: { geoData: GeoData }) {
  // Pre-fetch any required data here
  // This runs on the server, so no client JS for this part
  
  return (
    <div 
      className="w-full max-w-4xl mx-auto p-6"
      data-geo-country={geoData.country}
      data-geo-currency={geoData.currency}
      data-geo-is-eu={geoData.isEU}
    >
      {/* Server-rendered form header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
          Nuovo Cliente
        </h1>
        <p className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
          Inserisci i dati del nuovo cliente. 
          {geoData.isEU && (
            <span className="ml-1 text-[var(--status-info)] dark:text-[var(--status-info)]">
              I dati saranno trattati in conformità al GDPR.
            </span>
          )}
        </p>
        {geoData.city && (
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            Località rilevata: {geoData.city}, {geoData.country}
          </p>
        )}
      </div>
      
      {/* Client component will be loaded here with pre-fetched data */}
      {/* This is just the shell - actual form is client-side */}
      <div id="customer-form-container">
        {/* Placeholder for client component */}
      </div>
    </div>
  )
}

/**
 * Server Component: NewCustomerServerPage
 * 
 * This is a React Server Component that:
 * - Pre-fetches geolocation data
 * - Renders initial HTML on the server
 * - Sends zero JavaScript for the initial render
 * - Suspense boundaries for progressive enhancement
 */
export default async function NewCustomerServerPage() {
  // Pre-fetch geolocation on server
  const geoData = await getGeoData()
  
  return (
    <main className="min-h-screen bg-gradient-to-br from-[var(--surface-secondary)] to-[var(--surface-secondary)] dark:from-[var(--surface-primary)] dark:to-[var(--surface-primary)]">
      {/* Skip Link for accessibility */}
      <a 
        href="#main-form-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-[var(--status-info)] text-[var(--text-on-brand)] px-4 py-2 rounded z-50"
      >
        Vai al contenuto principale
      </a>
      
      <div id="main-form-content" className="container mx-auto py-8">
        <Suspense fallback={<FormSkeleton />}>
          <CustomerFormServer geoData={geoData} />
        </Suspense>
      </div>
      
      {/* SEO-friendly footer content */}
      <footer className="mt-auto py-6 text-center text-sm text-[var(--text-tertiary)]">
        <p>
          MechMind OS v10 - Gestionale Automotive Professionale
          {geoData.timezone && ` • ${geoData.timezone}`}
        </p>
      </footer>
    </main>
  )
}

// Helper functions
function getCurrencyByCountry(countryCode: string): string {
  const currencyMap: Record<string, string> = {
    'IT': 'EUR', 'DE': 'EUR', 'FR': 'EUR', 'ES': 'EUR', 'NL': 'EUR',
    'BE': 'EUR', 'AT': 'EUR', 'PT': 'EUR', 'IE': 'EUR', 'FI': 'EUR',
    'GR': 'EUR', 'US': 'USD', 'GB': 'GBP', 'JP': 'JPY', 'CH': 'CHF',
    'CA': 'CAD', 'AU': 'AUD', 'CN': 'CNY', 'IN': 'INR', 'BR': 'BRL',
  }
  return currencyMap[countryCode] || 'EUR'
}

function isEuropeanCountry(countryCode: string): boolean {
  const euCountries = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
  ]
  return euCountries.includes(countryCode)
}
