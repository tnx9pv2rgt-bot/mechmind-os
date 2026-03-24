export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

/** GET /api/security-incidents/:id -> GET /v1/security-incidents/:id */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToNestJS({ backendPath: `v1/security-incidents/${id}` });
}

/** PATCH /api/security-incidents/:id -> PATCH /v1/security-incidents/:id */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  return proxyToNestJS({ backendPath: `v1/security-incidents/${id}`, method: 'PATCH', body });
}
