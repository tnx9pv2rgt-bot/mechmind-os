/**
 * GET /api/sms/threads/:id — Get thread messages
 * POST /api/sms/threads/:id — Send message in thread
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToNestJS({ backendPath: `v1/sms/threads/${id}/messages` });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  return proxyToNestJS({ backendPath: `v1/sms/threads/${id}/send`, method: 'POST', body });
}
