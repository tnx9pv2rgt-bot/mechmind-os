import { type NextRequest } from 'next/server'
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy'

export const dynamic = 'force-dynamic'

/** GET /api/rentri/cer-codes/search → GET /v1/rentri/cer-codes/search */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/rentri/cer-codes/search',
    params: getQueryParams(request),
  })
}
