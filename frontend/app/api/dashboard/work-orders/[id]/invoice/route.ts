import { type NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** POST /api/dashboard/work-orders/[id]/invoice → POST /v1/work-orders/:id/invoice */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return proxyToNestJS({ backendPath: `v1/work-orders/${id}/invoice`, method: 'POST' });
}
