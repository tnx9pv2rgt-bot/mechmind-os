import { type NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** POST /api/dashboard/work-orders/[id]/check-in → POST /v1/work-orders/:id/check-in */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const body = await request.json();
  return proxyToNestJS({
    backendPath: `v1/work-orders/${id}/check-in`,
    method: 'POST',
    body,
  });
}
