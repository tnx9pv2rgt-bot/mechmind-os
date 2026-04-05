/**
 * PATCH /api/stripe/subscription - Update subscription plan
 * DELETE /api/stripe/subscription - Cancel subscription
 * Proxied to NestJS backend
 */

export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  return proxyToNestJS({
    backendPath: 'v1/subscription/plan',
    method: 'PATCH',
    body,
  });
}

export async function DELETE() {
  return proxyToNestJS({
    backendPath: 'v1/subscription/cancel',
    method: 'POST',
  });
}
