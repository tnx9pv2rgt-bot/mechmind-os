import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/messaging/conversations → GET /v1/sms/threads
 *  Backend accepts: limit (number), offset (number).
 *  Strip frontend-only params (channel, unread) that the backend does not accept.
 */
export async function GET(req: NextRequest) {
  const params = getQueryParams(req);

  // Only forward params the backend accepts
  const backendParams: Record<string, string> = {};
  if (params.limit) backendParams.limit = params.limit;
  if (params.offset) backendParams.offset = params.offset;

  return proxyToNestJS({ backendPath: 'v1/sms/threads', params: backendParams });
}

export async function POST(req: NextRequest) {
  const body: unknown = await req.json();
  return proxyToNestJS({ backendPath: 'v1/sms/threads', method: 'POST', body });
}
