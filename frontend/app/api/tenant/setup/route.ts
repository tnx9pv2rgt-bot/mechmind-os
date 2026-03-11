/**
 * POST /api/tenant/setup
 * Complete tenant setup after registration
 * 
 * Updates tenant configuration, logo, colors, etc.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const setupSchema = z.object({
  tenantId: z.string(),
  setupToken: z.string(),
  
  // Branding
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  
  // Settings
  timezone: z.string().default('Europe/Rome'),
  currency: z.string().default('EUR'),
  language: z.enum(['it', 'en', 'de']).default('it'),
  dateFormat: z.string().default('DD/MM/YYYY'),
  
  // Business hours
  businessHours: z.object({
    monday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    tuesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    wednesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    thursday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    friday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    saturday: z.object({ open: z.string(), close: z.string(), closed: z.boolean().default(true) }),
    sunday: z.object({ open: z.string(), close: z.string(), closed: z.boolean().default(true) }),
  }).optional(),
  
  // Notifications
  notificationSettings: z.object({
    emailNotifications: z.boolean().default(true),
    smsNotifications: z.boolean().default(false),
    warrantyAlerts: z.boolean().default(true),
    maintenanceReminders: z.boolean().default(true),
    dailyDigest: z.boolean().default(false),
  }).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const result = setupSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: result.error.errors,
        },
        { status: 400 }
      )
    }
    
    const data = result.data
    
    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: data.tenantId },
    })
    
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }
    
    // Update tenant with setup configuration
    const updatedTenant = await prisma.tenant.update({
      where: { id: data.tenantId },
      data: {
        logoUrl: data.logoUrl,
        primaryColor: data.primaryColor,
        accentColor: data.accentColor,
        timezone: data.timezone,
        currency: data.currency,
        language: data.language,
        status: 'ACTIVE',
        settings: {
          ...tenant.settings as Record<string, unknown>,
          dateFormat: data.dateFormat,
          businessHours: data.businessHours,
          notificationSettings: data.notificationSettings,
          setupCompleted: true,
          setupCompletedAt: new Date().toISOString(),
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        subdomain: true,
        status: true,
        settings: true,
      },
    })
    
    return NextResponse.json({
      success: true,
      message: 'Tenant setup completed successfully',
      tenant: updatedTenant,
    })
    
  } catch (error) {
    console.error('Tenant setup error:', error)
    
    return NextResponse.json(
      { error: 'Failed to complete tenant setup' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/tenant/setup
 * Check if tenant setup is complete
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      )
    }
    
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        status: true,
        settings: true,
      },
    })
    
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }
    
    const settings = tenant.settings as Record<string, unknown> | null
    const setupCompleted = settings?.setupCompleted === true
    
    return NextResponse.json({
      tenantId: tenant.id,
      status: tenant.status,
      setupCompleted,
      setupCompletedAt: settings?.setupCompletedAt || null,
    })
    
  } catch (error) {
    console.error('Tenant setup check error:', error)
    
    return NextResponse.json(
      { error: 'Failed to check tenant setup status' },
      { status: 500 }
    )
  }
}
