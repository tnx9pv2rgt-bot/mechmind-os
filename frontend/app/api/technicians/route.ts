/**
 * GET /api/technicians — List technicians (users with role=TECHNICIAN)
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export async function GET(req: NextRequest) {
  const params = getQueryParams(req);
  params['role'] = 'TECHNICIAN';
  return proxyToNestJS({ backendPath: 'v1/users', params });
}
