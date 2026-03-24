/**
 * GET /api/estimates/:id — Get estimate
 * PATCH /api/estimates/:id — Update estimate
 * DELETE /api/estimates/:id — Delete estimate
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToNestJS({ backendPath: `v1/estimates/${id}` });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  return proxyToNestJS({ backendPath: `v1/estimates/${id}`, method: 'PATCH', body });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToNestJS({ backendPath: `v1/estimates/${id}`, method: 'DELETE' });
}
