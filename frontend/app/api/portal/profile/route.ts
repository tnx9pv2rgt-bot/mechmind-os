/**
 * Portal Profile API Route
 * GET: Get customer profile
 * PUT: Update customer profile
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

const mockCustomers = new Map([
  ['1', {
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
    avatarUrl: null,
  }],
])

// GET - Get profile
export async function GET(request: NextRequest) {
  try {
    const customerId = await verifyAuth(request)
    
    if (!customerId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const customer = mockCustomers.get(customerId)
    
    if (!customer) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Customer not found' } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: customer,
    })

  } catch (error) {
    console.error('Profile API error:', error)
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to load profile' } },
      { status: 500 }
    )
  }
}

// PUT - Update profile
export async function PUT(request: NextRequest) {
  try {
    const customerId = await verifyAuth(request)
    
    if (!customerId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { firstName, lastName, phone, avatarUrl } = body

    const customer = mockCustomers.get(customerId)
    
    if (!customer) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Customer not found' } },
        { status: 404 }
      )
    }

    // Update fields
    const updatedCustomer = {
      ...customer,
      firstName: firstName ?? customer.firstName,
      lastName: lastName ?? customer.lastName,
      phone: phone ?? customer.phone,
      avatarUrl: avatarUrl ?? customer.avatarUrl,
      updatedAt: new Date().toISOString(),
    }

    mockCustomers.set(customerId, updatedCustomer)

    return NextResponse.json({
      success: true,
      data: updatedCustomer,
    })

  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to update profile' } },
      { status: 500 }
    )
  }
}
