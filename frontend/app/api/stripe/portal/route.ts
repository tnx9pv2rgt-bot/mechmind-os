/**
 * POST /api/stripe/portal
 * Create a Stripe customer portal session
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { createPortalSession } from '@/lib/stripe/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { returnUrl } = body

    // Get tenant ID from session/auth
    // TODO: Replace with actual auth
    const tenantId = request.headers.get('x-tenant-id') || 'default-tenant'

    // Get tenant from database
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    })

    if (!tenant?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No subscription found for this tenant' },
        { status: 404 }
      )
    }

    // Create portal session
    const session = await createPortalSession(
      tenant.stripeCustomerId,
      returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`
    )

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Portal session error:', error)

    return NextResponse.json(
      { 
        error: 'Failed to create portal session',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
