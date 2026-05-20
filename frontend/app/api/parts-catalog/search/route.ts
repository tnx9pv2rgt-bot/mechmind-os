import { type NextRequest } from 'next/server'
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy'

export const dynamic = 'force-dynamic'

/** GET /api/parts-catalog/search → GET /v1/parts-catalog/search */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/parts-catalog/search',
    params: getQueryParams(request),
  })
}
