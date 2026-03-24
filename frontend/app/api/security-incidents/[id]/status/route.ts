export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

/** PATCH /api/security-incidents/:id/status -> PATCH /v1/security-incidents/:id/status */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  return proxyToNestJS({
    backendPath: `v1/security-incidents/${id}/status`,
    method: 'PATCH',
    body,
  });
}
