/**
 * POST /api/analytics/marketing/send-reminder — Send marketing reminder
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToNestJS({ backendPath: 'v1/campaigns', method: 'POST', body });
}
