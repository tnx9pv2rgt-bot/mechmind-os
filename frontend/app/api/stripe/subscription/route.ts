/**
 * PATCH /api/stripe/subscription - Update subscription plan
 * DELETE /api/stripe/subscription - Cancel subscription
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { 
  updateSubscription, 
  cancelSubscription,
  PLAN_TO_PRICE_ID 
} from '@/lib/stripe/server'
import { prisma } from '@/lib/prisma'

// PATCH: Update subscription plan
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { plan } = body

    if (!plan || !PLAN_TO_PRICE_ID[plan]) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      )
    }

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

    // Update subscription in Stripe
    const subscription = await updateSubscription(tenant.stripeSubscriptionId, plan)

    // Update tenant in database
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionPlan: plan,
      },
    })

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        plan,
        status: subscription.status,
      },
    })
  } catch (error: unknown) {
    console.error('Update subscription error:', error)

    return NextResponse.json(
      {
        error: 'Failed to update subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// DELETE: Cancel subscription
export async function DELETE(request: NextRequest) {
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

    // Cancel subscription in Stripe (at period end)
    const subscription = await cancelSubscription(tenant.stripeSubscriptionId)

    // Update tenant in database
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionStatus: 'CANCELLED',
        cancelAtPeriodEnd: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription will be canceled at the end of the current period',
      cancelAt: new Date((subscription.items.data[0]?.current_period_end ?? 0) * 1000).toISOString(),
    })
  } catch (error: unknown) {
    console.error('Cancel subscription error:', error)

    return NextResponse.json(
      {
        error: 'Failed to cancel subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
