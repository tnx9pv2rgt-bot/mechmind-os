import { type NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/vehicles/[id]/documents → GET /v1/vehicles/:id/documents */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return proxyToNestJS({ backendPath: `v1/vehicles/${id}/documents` });
}

/** POST /api/dashboard/vehicles/[id]/documents → POST /v1/vehicles/:id/documents (multipart) */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const formData = await request.formData();
  return proxyToNestJS({
    backendPath: `v1/vehicles/${id}/documents`,
    method: 'POST',
    formData,
  });
}
