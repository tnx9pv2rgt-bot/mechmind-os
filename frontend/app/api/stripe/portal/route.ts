/**
 * POST /api/stripe/portal
 * Create a Stripe customer portal session
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createPortalSession } from '@/lib/stripe/server';
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
    const { returnUrl } = body;

    // Get tenant from database
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant?.stripeCustomerId) {
      return NextResponse.json({ error: 'No subscription found for this tenant' }, { status: 404 });
    }

    // Create portal session
    const session = await createPortalSession(
      tenant.stripeCustomerId,
      returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`
    );

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('Portal session error:', error);

    return NextResponse.json(
      {
        error: 'Failed to create portal session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
