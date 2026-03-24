import { NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams): Promise<Response> {
  const { id } = await params;
  const body: unknown = await req.json();
  return proxyToNestJS({ backendPath: `v1/inspections/findings/${id}`, method: 'PATCH', body });
}
