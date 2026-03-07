/**
 * Portal Bookings API Route
 * GET: List customer bookings
 * POST: Create new booking
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.PORTAL_JWT_SECRET || 'portal-secret-key-change-in-production')

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

// Mock bookings database
const mockBookings = [
  {
    id: 'b1',
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
    status: 'confirmed',
    type: 'maintenance',
    scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    scheduledTime: '09:30',
    duration: 120,
    notes: 'Tagliando ordinario',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    location: 'MechMind Milano - Via Roma 123',
    estimatedCost: 350,
  },
]

// GET - List bookings
export async function GET(request: NextRequest) {
  try {
    const customerId = await verifyAuth(request)
    
    if (!customerId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Filter bookings by customer ID (data isolation)
    const customerBookings = mockBookings.filter(b => b.customerId === customerId)

    return NextResponse.json({
      success: true,
      data: customerBookings,
      meta: {
        total: customerBookings.length,
      },
    })

  } catch (error) {
    console.error('Bookings API error:', error)
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to load bookings' } },
      { status: 500 }
    )
  }
}

// POST - Create booking
export async function POST(request: NextRequest) {
  try {
    const customerId = await verifyAuth(request)
    
    if (!customerId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { vehicleId, type, scheduledDate, scheduledTime, notes } = body

    // Validation
    if (!vehicleId || !type || !scheduledDate || !scheduledTime) {
      return NextResponse.json(
        { 
          error: { 
            code: 'MISSING_FIELDS', 
            message: 'Required fields are missing' 
          } 
        },
        { status: 400 }
      )
    }

    // Create booking
    const newBooking = {
      id: `b${Date.now()}`,
      customerId,
      vehicleId,
      vehicle: {
        id: vehicleId,
        customerId,
        make: 'Volkswagen',
        model: 'Golf',
        year: 2020,
        licensePlate: 'AB123CD',
        mileage: 45000,
        fuelType: 'diesel',
      },
      status: 'pending',
      type,
      scheduledDate,
      scheduledTime,
      duration: 120,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      location: 'MechMind Milano - Via Roma 123',
      estimatedCost: 0,
    }

    mockBookings.push(newBooking)

    return NextResponse.json({
      success: true,
      data: newBooking,
    }, { status: 201 })

  } catch (error) {
    console.error('Create booking error:', error)
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to create booking' } },
      { status: 500 }
    )
  }
}
