import { NextRequest, NextResponse } from 'next/server'

// Edge runtime for geolocation API
export const runtime = 'edge'

// Revalidation interval (1 hour)
export const revalidate = 3600
export const dynamic = 'force-dynamic';

// Edge regions for optimal performance
export const preferredRegion = ['iad1', 'fra1', 'hkg1', 'syd1']

interface GeoData {
  country: string
  countryName?: string
  city?: string
  region?: string
  latitude?: number
  longitude?: number
  timezone?: string
  currency?: string
  postalCode?: string
  continent?: string
}

/**
 * Edge Geolocation API
 * Returns geolocation data based on the request's IP address
 * Cached at the edge for optimal performance
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  // Extract Cloudflare/Vercel geolocation headers
  const cf = (request as any).cf || {}
  const geo = (request as any).geo || {}
  
  // Build geolocation response
  const geoData: GeoData = {
    // Country code (ISO 3166-1 alpha-2)
    country: cf?.country || geo?.country || request.headers.get('cf-ipcountry') || 'IT',
    
    // Country name
    countryName: cf?.countryName || geo?.countryName,
    
    // City name
    city: cf?.city || geo?.city,
    
    // Region/state
    region: cf?.region || geo?.region,
    
    // Coordinates
    latitude: cf?.latitude || geo?.latitude,
    longitude: cf?.longitude || geo?.longitude,
    
    // Timezone
    timezone: cf?.timezone || geo?.timezone,
    
    // Currency
    currency: getCurrencyByCountry(cf?.country || geo?.country || 'IT'),
    
    // Postal code (if available)
    postalCode: cf?.postalCode || geo?.postalCode,
    
    // Continent
    continent: cf?.continent || geo?.continent,
  }
  
  // Add EU flag for GDPR compliance
  const isEU = isEuropeanCountry(geoData.country)
  
  const response = {
    ...geoData,
    isEU,
    processingTime: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  }
  
  return NextResponse.json(response, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      // Cache at edge for 1 hour
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'Vary': 'Accept-Language, CF-IPCountry',
      'CDN-Cache-Control': 'max-age=3600',
      'Vercel-CDN-Cache-Control': 'max-age=3600',
    },
  })
}

/**
 * Helper: Get currency by country code
 */
function getCurrencyByCountry(countryCode: string): string {
  const currencyMap: Record<string, string> = {
    'IT': 'EUR',
    'DE': 'EUR',
    'FR': 'EUR',
    'ES': 'EUR',
    'NL': 'EUR',
    'BE': 'EUR',
    'AT': 'EUR',
    'PT': 'EUR',
    'IE': 'EUR',
    'FI': 'EUR',
    'GR': 'EUR',
    'US': 'USD',
    'GB': 'GBP',
    'JP': 'JPY',
    'CH': 'CHF',
    'CA': 'CAD',
    'AU': 'AUD',
    'CN': 'CNY',
    'IN': 'INR',
    'BR': 'BRL',
    'MX': 'MXN',
    'RU': 'RUB',
    'KR': 'KRW',
    'SE': 'SEK',
    'NO': 'NOK',
    'DK': 'DKK',
    'PL': 'PLN',
    'CZ': 'CZK',
    'HU': 'HUF',
    'RO': 'RON',
    'BG': 'BGN',
    'HR': 'HRK',
    'RS': 'RSD',
    'UA': 'UAH',
  }
  
  return currencyMap[countryCode] || 'EUR'
}

/**
 * Helper: Check if country is in EU
 */
function isEuropeanCountry(countryCode: string): boolean {
  const euCountries = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
  ]
  return euCountries.includes(countryCode)
}
