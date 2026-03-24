/**
 * GET /api/canned-jobs/:id — Get canned job
 * PATCH /api/canned-jobs/:id — Update canned job
 * DELETE /api/canned-jobs/:id — Delete canned job
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToNestJS({ backendPath: `v1/canned-jobs/${id}` });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  return proxyToNestJS({ backendPath: `v1/canned-jobs/${id}`, method: 'PATCH', body });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToNestJS({ backendPath: `v1/canned-jobs/${id}`, method: 'DELETE' });
}
