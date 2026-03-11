/**
 * POST /api/stripe/subscription/resume
 * Resume a canceled subscription
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { resumeSubscription } from '@/lib/stripe/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Get tenant ID from session/auth
    const tenantId = request.headers.get('x-tenant-id') || 'default-tenant'

    // Get tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    })

    if (!tenant?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      )
    }

    // Resume subscription in Stripe
    const subscription = await resumeSubscription(tenant.stripeSubscriptionId)

    // Update tenant in database
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionStatus: subscription.status.toUpperCase() as any,
        cancelAtPeriodEnd: false,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription resumed successfully',
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000).toISOString(),
      },
    })
  } catch (error: any) {
    console.error('Resume subscription error:', error)

    return NextResponse.json(
      { 
        error: 'Failed to resume subscription',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
