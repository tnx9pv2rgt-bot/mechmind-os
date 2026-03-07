/**
 * Portal Dashboard API Route
 * Returns aggregated dashboard data for the customer
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.PORTAL_JWT_SECRET || 'portal-secret-key-change-in-production')

// Helper to verify token and get customer ID
async function verifyAuth(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    const { payload } = await jwtVerify(token, JWT_SECRET)
    
    return payload.customerId as string
  } catch {
    return null
  }
}

// Mock data - replace with database queries
const mockDashboardData = {
  customer: {
    id: '1',
    email: 'demo@mechmind.com',
    firstName: 'Mario',
    lastName: 'Rossi',
    phone: '+39 333 1234567',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    emailVerified: true,
    phoneVerified: true,
    marketingConsent: true,
    gdprConsent: true,
  },
  upcomingBooking: {
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
  maintenanceDue: [
    {
      id: 'm1',
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
      serviceType: 'Tagliando completo',
      description: 'Sostituzione olio, filtri e controllo generale',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      dueMileage: 50000,
      estimatedCost: 350,
      priority: 'medium',
      status: 'due',
    },
  ],
  recentInspection: {
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
  },
  warrantyStatus: {
    total: 2,
    active: 1,
    expiringSoon: 1,
    expired: 0,
  },
  recentDocuments: [],
  unreadNotifications: 3,
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const customerId = await verifyAuth(request)
    
    if (!customerId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // In production, fetch data from database filtered by customerId
    // Ensure customer can only access their own data
    if (mockDashboardData.customer.id !== customerId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: mockDashboardData,
    })

  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to load dashboard data' } },
      { status: 500 }
    )
  }
}
