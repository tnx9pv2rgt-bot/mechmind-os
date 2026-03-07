/**
 * GET /api/tenant/resolve
 * Resolve tenant by subdomain, domain, or ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subdomain = searchParams.get('subdomain')
    const domain = searchParams.get('domain')
    const id = searchParams.get('id')
    const slug = searchParams.get('slug')

    let tenant = null

    if (subdomain) {
      tenant = await prisma.tenant.findFirst({
        where: { subdomain },
      })
    } else if (domain) {
      tenant = await prisma.tenant.findFirst({
        where: { customDomain: domain },
      })
    } else if (id) {
      tenant = await prisma.tenant.findUnique({
        where: { id },
      })
    } else if (slug) {
      tenant = await prisma.tenant.findUnique({
        where: { slug },
      })
    }

    if (!tenant) {
      return NextResponse.json(
        { error: { code: 'TENANT_NOT_FOUND', message: 'Tenant not found' } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        status: tenant.status,
        subscriptionTier: tenant.subscriptionTier,
        subscriptionStatus: tenant.subscriptionStatus,
      },
    })
  } catch (error) {
    console.error('Tenant resolve error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to resolve tenant' } },
      { status: 500 }
    )
  }
}
