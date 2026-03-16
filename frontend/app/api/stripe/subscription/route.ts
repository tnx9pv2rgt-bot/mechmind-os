/**
 * PATCH /api/stripe/subscription - Update subscription plan
 * DELETE /api/stripe/subscription - Cancel subscription
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { updateSubscription, cancelSubscription, PLAN_TO_PRICE_ID } from '@/lib/stripe/server';
import { prisma } from '@/lib/prisma';

/** Verify auth token and extract tenantId from JWT cookie */
async function authenticateRequest(): Promise<{ tenantId: string } | NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let tenantId: string | undefined;
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8')) as {
        tenantId?: string;
        sub?: string;
      };
      tenantId = payload.tenantId;
      if (!tenantId && payload.sub) {
        const subParts = payload.sub.split(':');
        if (subParts.length >= 2) tenantId = subParts[1];
      }
    }
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  if (!tenantId) {
    return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
  }

  return { tenantId };
}

// PATCH: Update subscription plan
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await authenticateRequest();
    if (authResult instanceof NextResponse) return authResult;
    const { tenantId } = authResult;

    const body = await request.json();
    const { plan } = body;

    if (!plan || !PLAN_TO_PRICE_ID[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Get tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant?.stripeSubscriptionId) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    // Update subscription in Stripe
    const subscription = await updateSubscription(tenant.stripeSubscriptionId, plan);

    // Update tenant in database
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionPlan: plan,
      },
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        plan,
        status: subscription.status,
      },
    });
  } catch (error: unknown) {
    console.error('Update subscription error:', error);

    return NextResponse.json(
      {
        error: 'Failed to update subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE: Cancel subscription
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authenticateRequest();
    if (authResult instanceof NextResponse) return authResult;
    const { tenantId } = authResult;

    // Get tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant?.stripeSubscriptionId) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    // Cancel subscription in Stripe (at period end)
    const subscription = await cancelSubscription(tenant.stripeSubscriptionId);

    // Update tenant in database
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionStatus: 'CANCELLED',
        cancelAtPeriodEnd: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription will be canceled at the end of the current period',
      cancelAt: new Date(
        (subscription.items.data[0]?.current_period_end ?? 0) * 1000
      ).toISOString(),
    });
  } catch (error: unknown) {
    console.error('Cancel subscription error:', error);

    return NextResponse.json(
      {
        error: 'Failed to cancel subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
