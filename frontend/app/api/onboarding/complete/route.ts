/**
 * POST /api/onboarding/complete — Complete onboarding
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export async function POST(req: NextRequest) {
  const body = await req.json();
  return proxyToNestJS({ backendPath: 'v1/settings/onboarding/complete', method: 'POST', body });
}
