/**
 * GET /api/stripe/verify-session?session_id=xxx
 * Verify a checkout session status
 */

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'

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

    return NextResponse.json({
      status: session.status,
      paymentStatus: session.payment_status,
      subscription: session.subscription ? {
        id: (session.subscription as any).id,
        status: (session.subscription as any).status,
      } : null,
      customer: session.customer ? {
        id: (session.customer as any).id,
        email: (session.customer as any).email,
      } : null,
    })
  } catch (error: any) {
    console.error('Verify session error:', error)

    return NextResponse.json(
      { 
        error: 'Failed to verify session',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
