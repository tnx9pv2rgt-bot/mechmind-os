import { type NextRequest } from 'next/server'
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy'

export const dynamic = 'force-dynamic'

/** GET /api/declined-services → GET /v1/declined-services */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/declined-services',
    params: getQueryParams(request),
  })
}

/** POST /api/declined-services → POST /v1/declined-services */
export async function POST(request: NextRequest) {
  const body = await request.json()
  return proxyToNestJS({
    backendPath: 'v1/declined-services',
    method: 'POST',
    body,
  })
}
