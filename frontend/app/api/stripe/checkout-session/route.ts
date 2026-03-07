/**
 * POST /api/stripe/checkout-session
 * Create a Stripe checkout session for subscription
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  createCheckoutSession, 
  getOrCreateCustomer,
  PLAN_TO_PRICE_ID 
} from '@/lib/stripe/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      plan, 
      aiAddon = false, 
      successUrl, 
      cancelUrl 
    } = body

    // Validate required fields
    if (!plan) {
      return NextResponse.json(
        { error: 'Plan is required' },
        { status: 400 }
      )
    }

    if (!PLAN_TO_PRICE_ID[plan]) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      )
    }

    // Get tenant ID from session/auth
    // TODO: Replace with actual auth
    const tenantId = request.headers.get('x-tenant-id') || 'default-tenant'
    const userEmail = request.headers.get('x-user-email') || 'user@example.com'
    const userName = request.headers.get('x-user-name') || 'User'

    // Get tenant from database
    let tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    })

    // Create tenant if not exists (for demo purposes)
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          id: tenantId,
          name: 'Default Tenant',
          slug: `tenant-${tenantId.slice(0, 8)}`,
          email: userEmail,
        },
      })
    }

    // Get or create Stripe customer
    const customer = await getOrCreateCustomer({
      tenantId: tenant.id,
      email: tenant.email || userEmail,
      name: tenant.name || userName,
      stripeCustomerId: tenant.stripeCustomerId,
    })

    // Update tenant with Stripe customer ID if new
    if (!tenant.stripeCustomerId) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { stripeCustomerId: customer.id },
      })
    }

    // Create checkout session
    const session = await createCheckoutSession({
      customerId: customer.id,
      plan,
      aiAddon,
      successUrl: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/billing/cancel`,
      tenantId: tenant.id,
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error: any) {
    console.error('Checkout session error:', error)

    return NextResponse.json(
      { 
        error: 'Failed to create checkout session',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
