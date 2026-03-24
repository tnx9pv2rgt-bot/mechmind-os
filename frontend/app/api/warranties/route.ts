/**
 * GET /api/warranties — List warranties (proxy to backend)
 * POST /api/warranties — Create warranty (proxy to backend)
 */

import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<Response> {
  const params = getQueryParams(req);
  return proxyToNestJS({ backendPath: 'v1/warranties', params });
}

export async function POST(req: NextRequest): Promise<Response> {
  const body: unknown = await req.json();
  return proxyToNestJS({ backendPath: 'v1/warranties', method: 'POST', body });
}
