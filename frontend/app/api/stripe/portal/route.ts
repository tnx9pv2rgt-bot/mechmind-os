/**
 * POST /api/stripe/portal
 * Create a Stripe customer portal session — proxied to NestJS backend
 */

export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToNestJS({
    backendPath: 'v1/subscription/portal-session',
    method: 'POST',
    body,
  });
}
