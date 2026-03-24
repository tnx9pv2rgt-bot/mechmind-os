import { type NextRequest } from 'next/server'
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy'

export const dynamic = 'force-dynamic'

/** GET /api/rentri/cer-codes → GET /v1/rentri/cer-codes */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/rentri/cer-codes',
    params: getQueryParams(request),
  })
}
