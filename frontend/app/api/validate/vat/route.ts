/**
 * VAT Validation API Route
 * Proxy verso il backend VIES con rate limiting client-side
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 ore in ms

// In-memory cache per il frontend
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

function normalizeVatNumber(vat: string): string {
  return vat.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

function extractCountryCode(vat: string): string | null {
  if (vat.length < 2) return null;
  const code = vat.substring(0, 2);
  return /^[A-Z]{2}$/i.test(code) ? code.toUpperCase() : null;
}

function validateItalianLuhn(vatNumber: string): boolean {
  if (!/^\d{11}$/.test(vatNumber)) return false;

  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let digit = parseInt(vatNumber.charAt(i), 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(vatNumber.charAt(10), 10);
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  
  // Rate limiting
  if (!checkRateLimit(clientIp)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429 }
    );
  }

  let body: { vat?: string; countryCode?: string };
  
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { vat, countryCode: providedCountryCode } = body;

  if (!vat || typeof vat !== 'string') {
    return NextResponse.json(
      { error: 'VAT number is required' },
      { status: 400 }
    );
  }

  const normalizedVat = normalizeVatNumber(vat);
  const countryCode = providedCountryCode?.toUpperCase() || extractCountryCode(normalizedVat) || 'IT';
  
  // Estrai il numero senza country code
  const cleanVat = normalizedVat.startsWith(countryCode) 
    ? normalizedVat.substring(2) 
    : normalizedVat;

  const fullVat = `${countryCode}${cleanVat}`;

  // Validazione formato italiano
  const isValidFormat = countryCode === 'IT' ? /^\d{11}$/.test(cleanVat) : /^[A-Z0-9]{8,12}$/.test(cleanVat);
  const luhnValid = countryCode === 'IT' ? validateItalianLuhn(cleanVat) : true;

  if (!isValidFormat) {
    return NextResponse.json({
      valid: false,
      countryCode,
      vatNumber: cleanVat,
      requestDate: new Date().toISOString(),
      isValidFormat: false,
      luhnValid: false,
    });
  }

  // Check cache
  const cacheKey = `vat:${fullVat}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json(cached.data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/validation/vat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': clientIp,
      },
      body: JSON.stringify({ vatNumber: fullVat, countryCode }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      // Fallback: trust Luhn validation se l'API fallisce
      if (response.status >= 500) {
        const fallbackResult = {
          valid: luhnValid,
          countryCode,
          vatNumber: cleanVat,
          requestDate: new Date().toISOString(),
          isValidFormat,
          luhnValid,
          companyName: undefined,
          address: undefined,
          _fallback: true,
        };
        return NextResponse.json(fallbackResult);
      }
      
      return NextResponse.json(
        { error: errorData.error || 'Validation failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Cache il risultato
    cache.set(cacheKey, { data, timestamp: Date.now() });

    return NextResponse.json(data);
  } catch (error) {
    console.error('VAT validation error:', error);
    
    // Fallback su errore di rete
    const fallbackResult = {
      valid: luhnValid,
      countryCode,
      vatNumber: cleanVat,
      requestDate: new Date().toISOString(),
      isValidFormat,
      luhnValid,
      _fallback: true,
    };
    
    return NextResponse.json(fallbackResult);
  }
}
