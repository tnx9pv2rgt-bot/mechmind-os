import { type NextRequest } from 'next/server'
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy'

export const dynamic = 'force-dynamic'

/** GET /api/customers → GET /v1/customers */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/customers',
    params: getQueryParams(request),
  })
}

/** POST /api/customers → POST /v1/customers */
export async function POST(request: NextRequest) {
  const body = await request.json()
  return proxyToNestJS({ backendPath: 'v1/customers', method: 'POST', body })
}
