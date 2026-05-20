/**
 * GET /api/sms/threads — List SMS threads (proxy to backend)
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export async function GET(request: NextRequest) {
  const params = getQueryParams(request);

  // Provide pagination defaults
  if (!params.limit) params.limit = '20';
  if (!params.offset) params.offset = '0';

  return proxyToNestJS({ backendPath: 'v1/sms/threads', params });
}
