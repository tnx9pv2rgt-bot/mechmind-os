/**
 * POST /api/stripe/ai-addon
 * Toggle AI addon on/off
 */

import { NextRequest, NextResponse } from 'next/server'
import { toggleAiAddon } from '@/lib/stripe/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { enabled } = body

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Enabled parameter is required' },
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

    // Toggle AI addon in Stripe
    const subscription = await toggleAiAddon(tenant.stripeSubscriptionId, enabled)

    // Update tenant in database
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        aiAddon: enabled,
      },
    })

    return NextResponse.json({
      success: true,
      aiAddon: enabled,
      subscription: {
        id: subscription.id,
        status: subscription.status,
      },
    })
  } catch (error: any) {
    console.error('AI addon toggle error:', error)

    return NextResponse.json(
      { 
        error: 'Failed to toggle AI addon',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
