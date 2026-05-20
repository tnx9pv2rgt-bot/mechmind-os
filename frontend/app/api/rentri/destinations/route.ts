import { type NextRequest } from 'next/server'
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy'

export const dynamic = 'force-dynamic'

/** GET /api/rentri/destinations → GET /v1/rentri/destinations */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/rentri/destinations',
    params: getQueryParams(request),
  })
}

/** POST /api/rentri/destinations → POST /v1/rentri/destinations */
export async function POST(request: NextRequest) {
  const body = await request.json()
  return proxyToNestJS({
    backendPath: 'v1/rentri/destinations',
    method: 'POST',
    body,
  })
}
