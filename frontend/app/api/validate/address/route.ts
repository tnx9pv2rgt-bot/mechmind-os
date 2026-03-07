/**
 * Address Validation API Route
 * Proxy verso Google Places con rate limiting e cache
 */

import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const CACHE_DURATION_AUTOCOMPLETE = 24 * 60 * 60 * 1000; // 24 ore
const CACHE_DURATION_DETAILS = 30 * 24 * 60 * 60 * 1000; // 30 giorni

// In-memory cache
const cache = new Map<string, { data: unknown; timestamp: number }>();

// Rate limiting
const rateLimits = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const RATE_LIMIT_MAX = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimits.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
}

// GET per autocomplete
export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  
  // Rate limiting
  if (!checkRateLimit(clientIp)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const input = searchParams.get('input');
  const language = searchParams.get('language') || 'it';
  const placeId = searchParams.get('placeId');

  // Se c'è placeId, restituisci i dettagli
  if (placeId) {
    return getAddressDetails(placeId, clientIp);
  }

  // Altrimenti fai autocomplete
  if (!input || input.length < 3) {
    return NextResponse.json({ predictions: [] });
  }

  // Check cache
  const cacheKey = `address:${language}:${input.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_AUTOCOMPLETE) {
    return NextResponse.json(cached.data);
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/validation/address/autocomplete?input=${encodeURIComponent(input)}&language=${language}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': clientIp,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return NextResponse.json(
        { error: errorData.error || 'Autocomplete failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Cache
    cache.set(cacheKey, { data, timestamp: Date.now() });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Address autocomplete error:', error);
    return NextResponse.json({ predictions: [] });
  }
}

// Funzione helper per dettagli indirizzo
async function getAddressDetails(placeId: string, clientIp: string) {
  // Check cache
  const cacheKey = `address:details:${placeId}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_DETAILS) {
    return NextResponse.json(cached.data);
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/validation/address/details?placeId=${encodeURIComponent(placeId)}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': clientIp,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return NextResponse.json(
        { error: errorData.error || 'Failed to fetch address details' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Cache
    cache.set(cacheKey, { data, timestamp: Date.now() });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Address details error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch address details' },
      { status: 500 }
    );
  }
}

// POST per validazione CAP
export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  
  // Rate limiting
  if (!checkRateLimit(clientIp)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429 }
    );
  }

  let body: { postalCode?: string };
  
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { postalCode } = body;

  if (!postalCode || !/^\d{5}$/.test(postalCode)) {
    return NextResponse.json({ valid: false });
  }

  // Check cache
  const cacheKey = `postal:${postalCode}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_DETAILS) {
    return NextResponse.json(cached.data);
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/validation/postalcode/validate?code=${postalCode}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': clientIp,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ valid: false });
    }

    const data = await response.json();
    
    // Cache
    cache.set(cacheKey, { data, timestamp: Date.now() });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Postal code validation error:', error);
    return NextResponse.json({ valid: false });
  }
}
