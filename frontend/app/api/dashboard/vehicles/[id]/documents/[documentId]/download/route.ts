import { type NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/vehicles/[id]/documents/[documentId]/download */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> },
): Promise<Response> {
  const { id, documentId } = await params;
  return proxyToNestJS({ backendPath: `v1/vehicles/${id}/documents/${documentId}/download` });
}
