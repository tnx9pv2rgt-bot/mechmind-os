/**
 * POST /api/stripe/subscription/resume
 * Resume a canceled subscription
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { resumeSubscription } from '@/lib/stripe/server';
import { prisma } from '@/lib/prisma';
import { SubscriptionStatus } from '@prisma/client';

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
  };
  return statusMap[stripeStatus] ?? SubscriptionStatus.ACTIVE;
}

export async function POST(request: NextRequest) {
  try {
    // Verify auth token
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract tenant ID from JWT payload
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

    // Get tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant?.stripeSubscriptionId) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    // Resume subscription in Stripe
    const subscription = await resumeSubscription(tenant.stripeSubscriptionId);

    // Update tenant in database
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionStatus: mapStripeStatus(subscription.status),
        cancelAtPeriodEnd: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription resumed successfully',
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: new Date(
          (subscription.items.data[0]?.current_period_end ?? 0) * 1000
        ).toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error('Resume subscription error:', error);

    return NextResponse.json(
      {
        error: 'Failed to resume subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
