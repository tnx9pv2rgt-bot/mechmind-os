import { type NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/customers/:id/vehicles → GET /v1/customers/:id/vehicles */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToNestJS({
    backendPath: `v1/customers/${id}/vehicles`,
  });
}
