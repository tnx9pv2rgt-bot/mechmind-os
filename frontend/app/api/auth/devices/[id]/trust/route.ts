import { NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return proxyToNestJS({ backendPath: `v1/auth/devices/${id}/trust`, method: 'POST' });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return proxyToNestJS({ backendPath: `v1/auth/devices/${id}/trust`, method: 'DELETE' });
}
