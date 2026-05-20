/**
 * POST /api/stripe/checkout-session
 * Create a Stripe checkout session for subscription — proxied to NestJS backend
 */

export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToNestJS({
    backendPath: 'v1/subscription/checkout-session',
    method: 'POST',
    body,
  });
}
