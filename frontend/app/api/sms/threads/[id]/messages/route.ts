/**
 * GET /api/sms/threads/:id/messages — Get messages for a thread
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const query = getQueryParams(request);
  return proxyToNestJS({ backendPath: `v1/sms/threads/${id}/messages`, params: query });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  return proxyToNestJS({ backendPath: `v1/sms/threads/${id}/send`, method: 'POST', body });
}
