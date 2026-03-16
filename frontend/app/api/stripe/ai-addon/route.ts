/**
 * POST /api/stripe/ai-addon
 * Toggle AI addon on/off
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { toggleAiAddon } from '@/lib/stripe/server';
import { prisma } from '@/lib/prisma';

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

    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Enabled parameter is required' }, { status: 400 });
    }

    // Get tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant?.stripeSubscriptionId) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    // Toggle AI addon in Stripe
    const subscription = await toggleAiAddon(tenant.stripeSubscriptionId, enabled);

    // Update tenant in database
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        aiAddon: enabled,
      },
    });

    return NextResponse.json({
      success: true,
      aiAddon: enabled,
      subscription: {
        id: subscription.id,
        status: subscription.status,
      },
    });
  } catch (error: unknown) {
    console.error('AI addon toggle error:', error);

    return NextResponse.json(
      {
        error: 'Failed to toggle AI addon',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
