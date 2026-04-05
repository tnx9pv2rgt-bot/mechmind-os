/**
 * POST /api/inspections/[id]/warranty/claims
 * Create a warranty claim — proxied to NestJS backend
 */

import { type NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();
  return proxyToNestJS({
    backendPath: `v1/inspections/${id}/warranty/claims`,
    method: 'POST',
    body,
  });
}
