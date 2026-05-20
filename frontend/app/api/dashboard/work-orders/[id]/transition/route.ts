import { type NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** PATCH /api/dashboard/work-orders/[id]/transition → PATCH /v1/work-orders/:id/transition */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const body = await request.json();
  return proxyToNestJS({
    backendPath: `v1/work-orders/${id}/transition`,
    method: 'PATCH',
    body,
  });
}
