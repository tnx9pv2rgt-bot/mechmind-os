/**
 * POST /api/stripe/subscription/resume
 * Resume a canceled subscription — proxied to NestJS backend
 */

export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export async function POST(_request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/subscription/resume',
    method: 'POST',
  });
}
