import { type NextRequest } from 'next/server'
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy'

export const dynamic = 'force-dynamic'

/** GET /api/analytics/technicians → GET /v1/analytics/mechanics/performance */
export async function GET(request: NextRequest) {
  const params = getQueryParams(request)

  // Backend requires `year` (integer 2020-2100)
  if (!params.year) {
    params.year = String(new Date().getFullYear())
  }

  return proxyToNestJS({
    backendPath: 'v1/analytics/mechanics/performance',
    params,
  })
}
