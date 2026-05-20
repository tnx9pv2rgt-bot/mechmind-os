import { NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body: unknown = await req.json();
  return proxyToNestJS({
    backendPath: `v1/ai-compliance/decisions/${id}/review`,
    method: 'PATCH',
    body,
  });
}
