/**
 * GET /api/stripe/verify-session?session_id=xxx
 * Verify a checkout session status
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import Stripe from 'stripe'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    })

    const subscription = session.subscription as Stripe.Subscription | null
    const customer = session.customer as Stripe.Customer | null

    return NextResponse.json({
      status: session.status,
      paymentStatus: session.payment_status,
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
      } : null,
      customer: customer ? {
        id: customer.id,
        email: customer.email,
      } : null,
    })
  } catch (error: unknown) {
    console.error('Verify session error:', error)

    return NextResponse.json(
      {
        error: 'Failed to verify session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
