import { type NextRequest } from 'next/server'
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy'

export const dynamic = 'force-dynamic'

/** GET /api/rentri/fir → GET /v1/rentri/fir */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/rentri/fir',
    params: getQueryParams(request),
  })
}

/** POST /api/rentri/fir → POST /v1/rentri/fir */
export async function POST(request: NextRequest) {
  const body = await request.json()
  return proxyToNestJS({
    backendPath: 'v1/rentri/fir',
    method: 'POST',
    body,
  })
}
