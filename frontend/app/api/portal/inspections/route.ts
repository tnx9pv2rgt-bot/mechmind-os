/**
 * Portal Inspections API Route
 * GET: List customer inspections
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.PORTAL_JWT_SECRET || process.env.JWT_SECRET || 'portal-secret-key-change-in-production')

async function verifyAuth(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return null

    const token = authHeader.substring(7)
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload.customerId as string
  } catch {
    return null
  }
}

const mockInspections = [
  {
    id: 'i1',
    customerId: '1',
    vehicleId: 'v1',
    vehicle: {
      id: 'v1',
      customerId: '1',
      make: 'Volkswagen',
      model: 'Golf',
      year: 2020,
      licensePlate: 'AB123CD',
      mileage: 45000,
      fuelType: 'diesel',
    },
    bookingId: 'b2',
    score: 8.5,
    status: 'completed',
    completedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    technicianName: 'Luca Bianchi',
    summary: 'Veicolo in buone condizioni generali.',
    findings: [],
    photos: [],
    pdfUrl: '/reports/inspection-1.pdf',
  },
]

export async function GET(request: NextRequest) {
  try {
    const customerId = await verifyAuth(request)
    
    if (!customerId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Filter by customer ID (data isolation)
    const customerInspections = mockInspections.filter(i => i.customerId === customerId)

    return NextResponse.json({
      success: true,
      data: customerInspections,
      meta: {
        total: customerInspections.length,
      },
    })

  } catch (error) {
    console.error('Inspections API error:', error)
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to load inspections' } },
      { status: 500 }
    )
  }
}
