/**
 * POST /api/stripe/subscription/resume
 * Resume a canceled subscription
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { resumeSubscription } from '@/lib/stripe/server'
import { prisma } from '@/lib/prisma'
import { SubscriptionStatus } from '@prisma/client'

/** Map Stripe subscription status to Prisma SubscriptionStatus enum */
function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  const statusMap: Record<string, SubscriptionStatus> = {
    active: SubscriptionStatus.ACTIVE,
    past_due: SubscriptionStatus.PAST_DUE,
    unpaid: SubscriptionStatus.PAST_DUE,
    canceled: SubscriptionStatus.CANCELLED,
    incomplete: SubscriptionStatus.SUSPENDED,
    incomplete_expired: SubscriptionStatus.EXPIRED,
    trialing: SubscriptionStatus.TRIAL,
    paused: SubscriptionStatus.SUSPENDED,
  }
  return statusMap[stripeStatus] ?? SubscriptionStatus.ACTIVE
}

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
        subscriptionStatus: mapStripeStatus(subscription.status),
        cancelAtPeriodEnd: false,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription resumed successfully',
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: new Date((subscription.items.data[0]?.current_period_end ?? 0) * 1000).toISOString(),
      },
    })
  } catch (error: unknown) {
    console.error('Resume subscription error:', error)

    return NextResponse.json(
      {
        error: 'Failed to resume subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
