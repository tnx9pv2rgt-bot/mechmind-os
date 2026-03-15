/**
 * POST /api/stripe/checkout-session
 * Create a Stripe checkout session for subscription
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createCheckoutSession, getOrCreateCustomer, PLAN_TO_PRICE_ID } from '@/lib/stripe/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Verify auth token
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract tenant ID and user info from JWT payload
    let tenantId: string | undefined;
    let userEmail: string | undefined;
    let userName: string | undefined;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8')) as {
          tenantId?: string;
          sub?: string;
          email?: string;
          name?: string;
        };
        tenantId = payload.tenantId;
        userEmail = payload.email;
        userName = payload.name;
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

    const body = await request.json();
    const { plan, aiAddon = false, successUrl, cancelUrl } = body;

    // Validate required fields
    if (!plan) {
      return NextResponse.json({ error: 'Plan is required' }, { status: 400 });
    }

    if (!PLAN_TO_PRICE_ID[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Get tenant from database
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Get or create Stripe customer
    const customer = await getOrCreateCustomer({
      tenantId: tenant.id,
      email: tenant.email || userEmail || '',
      name: tenant.name || userName || '',
      stripeCustomerId: tenant.stripeCustomerId,
    });

    // Update tenant with Stripe customer ID if new
    if (!tenant.stripeCustomerId) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { stripeCustomerId: customer.id },
      });
    }

    // Create checkout session
    const session = await createCheckoutSession({
      customerId: customer.id,
      plan,
      aiAddon,
      successUrl:
        successUrl ||
        `${process.env.NEXT_PUBLIC_APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/billing/cancel`,
      tenantId: tenant.id,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: unknown) {
    console.error('Checkout session error:', error);

    return NextResponse.json(
      {
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
