/**
 * POST /api/tenant/register
 * Register a new tenant (auto-repair shop)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const registerSchema = z.object({
  name: z.string().min(2, 'Shop name must be at least 2 characters'),
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(30, 'Slug must be at most 30 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  subdomain: z.string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(5),
  address: z.string().min(5),
  city: z.string().min(2),
  postalCode: z.string().min(3),
  country: z.string().default('IT'),
  vatNumber: z.string().optional(),
  adminFirstName: z.string().min(1),
  adminLastName: z.string().min(1),
  adminPassword: z.string().min(8),
  tier: z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).default('FREE'),
  createDemoData: z.boolean().default(true),
  acceptTerms: z.boolean().refine(v => v === true, 'You must accept the terms'),
})

const RESERVED_SLUGS = ['api', 'app', 'admin', 'www', 'mail', 'demo', 'test', 'mechmind', 'tenant', 'auth']

function generateSubdomainFromSlug(slug: string): string {
  return slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')
}

function generateWarrantyNumber(tenantId: string): string {
  return `W-${Date.now().toString(36).toUpperCase()}`
}

async function createSampleData(tenantId: string, adminUserId: string) {
  const vehicles = await Promise.all([
    prisma.vehicle.create({
      data: {
        tenantId,
        vin: `SAMPLE${Date.now()}1`,
        licensePlate: 'AA000AA',
        make: 'Fiat',
        model: '500',
        year: 2020,
        mileage: 25000,
        color: 'Red',
        fuelType: 'Petrol',
        ownerName: 'Mario Rossi',
        ownerEmail: 'mario.rossi@example.com',
      }
    }),
    prisma.vehicle.create({
      data: {
        tenantId,
        vin: `SAMPLE${Date.now()}2`,
        licensePlate: 'BB111BB',
        make: 'Volkswagen',
        model: 'Golf',
        year: 2019,
        mileage: 45000,
        color: 'Blue',
        fuelType: 'Diesel',
        ownerName: 'Luigi Bianchi',
        ownerEmail: 'luigi.bianchi@example.com',
      }
    }),
  ])

  const inspector = await prisma.inspector.create({
    data: {
      tenantId,
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      licenseNumber: `MECH-${Date.now()}`,
      isActive: true,
    }
  })

  const now = new Date()
  await Promise.all(vehicles.map(vehicle => 
    prisma.maintenanceSchedule.create({
      data: {
        tenantId,
        vehicleId: vehicle.id,
        type: 'OIL_CHANGE',
        intervalKm: 15000,
        intervalMonths: 12,
        lastServiceDate: new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000),
        lastServiceKm: (vehicle.mileage || 0) - 5000,
        nextDueDate: new Date(now.getTime() + 6 * 30 * 24 * 60 * 60 * 1000),
        nextDueKm: (vehicle.mileage || 0) + 10000,
        daysUntilDue: 180,
        kmUntilDue: 10000,
        isOverdue: false,
        notificationLevel: 'ALERT',
      }
    })
  ))

  await Promise.all(vehicles.map(vehicle =>
    prisma.warranty.create({
      data: {
        tenantId,
        vehicleId: vehicle.id,
        warrantyNumber: generateWarrantyNumber(tenantId),
        coverageType: 'BUMPER_TO_BUMPER',
        startDate: new Date(vehicle.year, 0, 1),
        expirationDate: new Date(vehicle.year + 2, 0, 1),
        mileageLimit: 100000,
        maxClaimAmount: 5000,
        deductibleAmount: 200,
        status: 'ACTIVE',
        vehicleVin: vehicle.vin,
        alertsSent: [],
      }
    })
  ))

  await Promise.all(vehicles.map(vehicle =>
    prisma.inspection.create({
      data: {
        tenantId,
        inspectionNumber: `INSP-${Date.now()}-${vehicle.id.slice(-4)}`,
        type: 'PERIODIC',
        status: 'COMPLETED',
        scheduledDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        completedDate: new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000),
        vehicleId: vehicle.id,
        inspectorId: inspector.id,
        overallScore: 85,
        isPassed: true,
        notes: 'Sample inspection for demo purposes',
      }
    })
  ))

  await Promise.all([
    prisma.customer.create({
      data: {
        tenantId,
        externalId: randomUUID(),
        firstName: 'Mario',
        lastName: 'Rossi',
        email: 'mario.rossi@example.com',
        phone: '+39 333 1234567',
        city: 'Roma',
        gdprConsent: true,
        gdprConsentAt: new Date(),
      }
    }),
    prisma.customer.create({
      data: {
        tenantId,
        externalId: randomUUID(),
        firstName: 'Luigi',
        lastName: 'Bianchi',
        email: 'luigi.bianchi@example.com',
        phone: '+39 333 7654321',
        city: 'Milano',
        gdprConsent: true,
        gdprConsentAt: new Date(),
      }
    }),
  ])
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const result = registerSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: result.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      )
    }
    
    const data = result.data
    
    if (RESERVED_SLUGS.includes(data.slug.toLowerCase())) {
      return NextResponse.json(
        { error: 'This slug is reserved and cannot be used' },
        { status: 400 }
      )
    }
    
    const subdomain = data.subdomain || generateSubdomainFromSlug(data.slug)
    
    const existingSlug = await prisma.tenant.findUnique({
      where: { slug: data.slug },
    })
    
    if (existingSlug) {
      return NextResponse.json(
        { error: 'This shop name is already taken', field: 'slug' },
        { status: 409 }
      )
    }
    
    const existingSubdomain = await prisma.tenant.findUnique({
      where: { subdomain },
    })
    
    if (existingSubdomain) {
      return NextResponse.json(
        { error: 'This subdomain is already taken', field: 'subdomain' },
        { status: 409 }
      )
    }
    
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14)
    
    const tierLimits: Record<string, { maxUsers: number; maxVehicles: number; maxCustomers: number; features: string[] }> = {
      FREE: { maxUsers: 2, maxVehicles: 10, maxCustomers: 50, features: ['basic_inspections', 'basic_warranty'] },
      STARTER: { maxUsers: 5, maxVehicles: 50, maxCustomers: 200, features: ['basic_inspections', 'basic_warranty', 'maintenance'] },
      PROFESSIONAL: { maxUsers: 20, maxVehicles: 500, maxCustomers: 2000, features: ['basic_inspections', 'basic_warranty', 'maintenance', 'advanced_analytics', 'portal'] },
      ENTERPRISE: { maxUsers: 100, maxVehicles: 10000, maxCustomers: 50000, features: ['*'] },
    }
    
    const limits = tierLimits[data.tier]
    
    const tenant = await prisma.tenant.create({
      data: {
        name: data.name,
        slug: data.slug,
        subdomain,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        country: data.country,
        vatNumber: data.vatNumber,
        subscriptionTier: data.tier,
        subscriptionStatus: 'TRIAL',
        trialEndsAt,
        maxUsers: limits.maxUsers,
        maxVehicles: limits.maxVehicles,
        maxCustomers: limits.maxCustomers,
        features: limits.features,
        status: 'PENDING_SETUP',
        settings: {
          timezone: 'Europe/Rome',
          currency: 'EUR',
          language: 'it',
          dateFormat: 'DD/MM/YYYY',
        },
      },
    })
    
    const adminUserId = randomUUID()
    await prisma.tenantUser.create({
      data: {
        tenantId: tenant.id,
        userId: adminUserId,
        email: data.email,
        role: 'ADMIN',
        permissions: ['*'],
        isActive: true,
      },
    })
    
    if (data.createDemoData) {
      await createSampleData(tenant.id, adminUserId)
    }
    
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { status: 'ACTIVE' },
    })
    
    const setupToken = randomUUID()
    
    return NextResponse.json(
      {
        success: true,
        message: 'Tenant registered successfully',
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          subdomain: tenant.subdomain,
          status: tenant.status,
          subscriptionTier: tenant.subscriptionTier,
          trialEndsAt: tenant.trialEndsAt,
        },
        urls: {
          dashboard: `https://${subdomain}.mechmind.com/dashboard`,
          setup: `https://${subdomain}.mechmind.com/setup?token=${setupToken}`,
        },
      },
      { status: 201 }
    )
    
  } catch (error) {
    console.error('Tenant registration error:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to register tenant',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
