export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

/** POST /api/work-orders/:id/start -> POST /v1/work-orders/:id/start */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToNestJS({ backendPath: `v1/work-orders/${id}/start`, method: 'POST' });
}
