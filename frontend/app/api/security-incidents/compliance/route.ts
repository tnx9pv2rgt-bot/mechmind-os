export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

/** GET /api/security-incidents/compliance -> GET /v1/security-incidents/compliance */
export async function GET(_request: NextRequest) {
  return proxyToNestJS({ backendPath: 'v1/security-incidents/compliance' });
}
