import { type NextRequest } from 'next/server'
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy'

export const dynamic = 'force-dynamic'

/** GET /api/rentri/transporters → GET /v1/rentri/transporters */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/rentri/transporters',
    params: getQueryParams(request),
  })
}

/** POST /api/rentri/transporters → POST /v1/rentri/transporters */
export async function POST(request: NextRequest) {
  const body = await request.json()
  return proxyToNestJS({
    backendPath: 'v1/rentri/transporters',
    method: 'POST',
    body,
  })
}
