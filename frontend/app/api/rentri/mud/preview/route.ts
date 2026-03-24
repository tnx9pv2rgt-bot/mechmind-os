import { type NextRequest } from 'next/server'
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy'

export const dynamic = 'force-dynamic'

/** GET /api/rentri/mud/preview → GET /v1/rentri/mud/preview */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/rentri/mud/preview',
    params: getQueryParams(request),
  })
}
