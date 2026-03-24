import { type NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** POST /api/dashboard/settings/team/invite → POST /v1/users/invite */
export async function POST(request: NextRequest) {
  const body: unknown = await request.json();
  return proxyToNestJS({
    backendPath: 'v1/users/invite',
    method: 'POST',
    body,
  });
}
