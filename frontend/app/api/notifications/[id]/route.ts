/**
 * Notification Detail API Route
 * GET: Get notification details
 * PATCH: Mark as read / update status
 * DELETE: Delete notification
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET /api/notifications/:id -> GET /v1/notifications/:id */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  return proxyToNestJS({ backendPath: `v1/notifications/${id}` });
}

/** PATCH /api/notifications/:id -> PATCH /v1/notifications/:id */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();
  return proxyToNestJS({ backendPath: `v1/notifications/${id}`, method: 'PATCH', body });
}

/** DELETE /api/notifications/:id -> DELETE /v1/notifications/:id */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  return proxyToNestJS({ backendPath: `v1/notifications/${id}`, method: 'DELETE' });
}
