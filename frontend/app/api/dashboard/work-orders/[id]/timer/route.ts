import { type NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** POST /api/dashboard/work-orders/[id]/timer → POST /v1/work-orders/:id/timer */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const body = await request.json();
  return proxyToNestJS({
    backendPath: `v1/work-orders/${id}/timer`,
    method: 'POST',
    body,
  });
}
