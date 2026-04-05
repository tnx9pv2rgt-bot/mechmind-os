export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

/** POST /api/ai-diagnostic → POST /v1/ai-diagnostic/analyze-symptoms */
export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToNestJS({ backendPath: 'v1/ai-diagnostic/analyze-symptoms', method: 'POST', body });
}
