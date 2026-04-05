export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

/** GET /api/ai-scheduling → GET /v1/ai-scheduling/capacity
 *  Backend expects: from (ISO date), to (ISO date).
 *  Map legacy `date` param → from/to (single day).
 *  Default to next 7 days when neither from/to nor date are provided.
 */
export async function GET(request: NextRequest) {
  const params = getQueryParams(request);

  // Remove action param (not needed by backend)
  delete params.action;

  // Translate `date` → `from` + `to` (backend does not accept `date`)
  if (params.date && !params.from) {
    params.from = params.date;
    if (!params.to) {
      params.to = params.date;
    }
    delete params.date;
  }

  // Default to next 7 days if no range specified
  if (!params.from || !params.to) {
    const today = new Date();
    params.from = today.toISOString().slice(0, 10);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    params.to = nextWeek.toISOString().slice(0, 10);
  }

  return proxyToNestJS({
    backendPath: 'v1/ai-scheduling/capacity',
    params,
  });
}

/** POST /api/ai-scheduling → POST /v1/ai-scheduling/suggest-slots */
export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToNestJS({ backendPath: 'v1/ai-scheduling/suggest-slots', method: 'POST', body });
}
