import { NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToNestJS({ backendPath: `v1/ai-compliance/decisions/${id}` });
}
