/**
 * GDPR Delete Account API Route
 * POST: Request account deletion (proxies to backend GDPR deletion endpoint)
 */

import { type NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** POST /api/gdpr/delete-account → POST /v1/gdpr/requests (ERASURE type) */
export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToNestJS({
    backendPath: 'v1/gdpr/requests',
    method: 'POST',
    body: {
      requestType: 'ERASURE',
      reason: 'Account deletion requested by user',
      confirmation: body.confirmation,
      source: 'WEB_FORM',
    },
  });
}
