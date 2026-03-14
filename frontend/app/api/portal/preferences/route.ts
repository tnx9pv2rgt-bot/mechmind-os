/**
 * Portal Preferences API Route
 * GET: Get notification preferences
 * PUT: Update notification preferences
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

interface PortalPreferences {
  email?: Record<string, boolean>
  sms?: Record<string, boolean>
  whatsapp?: Record<string, boolean>
  push?: Record<string, boolean>
}

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

// Mock preferences database
const mockPreferences = new Map<string, PortalPreferences>([
  ['1', {
    email: {
      enabled: true,
      bookingReminders: true,
      maintenanceAlerts: true,
      inspectionReports: true,
      promotions: false,
      newsletter: false,
    },
    sms: {
      enabled: true,
      bookingReminders: true,
      urgentAlerts: true,
    },
    whatsapp: {
      enabled: false,
      bookingReminders: false,
      statusUpdates: false,
    },
    push: {
      enabled: true,
      all: true,
    },
  }],
])

// GET - Get preferences
export async function GET(request: NextRequest) {
  try {
    const customerId = await verifyAuth(request)
    
    if (!customerId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const preferences = mockPreferences.get(customerId) || {
      email: { enabled: true, bookingReminders: true, maintenanceAlerts: true, inspectionReports: true, promotions: false, newsletter: false },
      sms: { enabled: true, bookingReminders: true, urgentAlerts: true },
      whatsapp: { enabled: false, bookingReminders: false, statusUpdates: false },
      push: { enabled: true, all: true },
    }

    return NextResponse.json({
      success: true,
      data: preferences,
    })

  } catch (error) {
    console.error('Preferences API error:', error)
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to load preferences' } },
      { status: 500 }
    )
  }
}

// PUT - Update preferences
export async function PUT(request: NextRequest) {
  try {
    const customerId = await verifyAuth(request)
    
    if (!customerId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const body = await request.json() as PortalPreferences
    const currentPreferences: PortalPreferences = (mockPreferences.get(customerId) || {}) as PortalPreferences

    const updatedPreferences: PortalPreferences = {
      ...currentPreferences,
      ...body,
      email: { ...(currentPreferences.email || {}), ...(body.email || {}) },
      sms: { ...(currentPreferences.sms || {}), ...(body.sms || {}) },
      whatsapp: { ...(currentPreferences.whatsapp || {}), ...(body.whatsapp || {}) },
      push: { ...(currentPreferences.push || {}), ...(body.push || {}) },
    }

    mockPreferences.set(customerId, updatedPreferences)

    return NextResponse.json({
      success: true,
      data: updatedPreferences,
    })

  } catch (error) {
    console.error('Update preferences error:', error)
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to update preferences' } },
      { status: 500 }
    )
  }
}
