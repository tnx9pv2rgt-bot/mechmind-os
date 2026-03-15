/**
 * Portal Warranty API Route
 * GET: List customer warranties
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.PORTAL_JWT_SECRET ||
    process.env.JWT_SECRET ||
    'portal-secret-key-change-in-production'
);

async function verifyAuth(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.substring(7);
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.customerId as string;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const customerId = await verifyAuth(request);

    if (!customerId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Proxy to backend warranty API filtered by customer
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'http://localhost:3000';

    try {
      const response = await fetch(`${backendUrl}/api/warranties?customerId=${customerId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        return NextResponse.json({
          success: true,
          data: result.data || result,
          meta: {
            total: Array.isArray(result.data) ? result.data.length : 0,
          },
        });
      }
    } catch {
      // Backend not available, return empty array
    }

    return NextResponse.json({
      success: true,
      data: [],
      meta: { total: 0 },
    });
  } catch (error) {
    console.error('Portal Warranty API error:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to load warranty data' } },
      { status: 500 }
    );
  }
}
