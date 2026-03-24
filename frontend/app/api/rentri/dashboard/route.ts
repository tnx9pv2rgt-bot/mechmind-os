import { type NextRequest } from 'next/server'
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy'

export const dynamic = 'force-dynamic'

/** GET /api/rentri/dashboard → GET /v1/rentri/dashboard */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/rentri/dashboard',
    params: getQueryParams(request),
  })
}
