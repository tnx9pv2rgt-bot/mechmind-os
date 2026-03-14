import { type NextRequest } from 'next/server'
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy'

export const dynamic = 'force-dynamic'

/** GET /api/dashboard → GET /v1/analytics/dashboard */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/analytics/dashboard',
    params: getQueryParams(request),
  })
}
