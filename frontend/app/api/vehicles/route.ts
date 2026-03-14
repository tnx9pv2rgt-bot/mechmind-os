import { type NextRequest } from 'next/server'
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy'

export const dynamic = 'force-dynamic'

/** GET /api/vehicles → GET /v1/vehicles */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/vehicles',
    params: getQueryParams(request),
  })
}

/** POST /api/vehicles → POST /v1/vehicles */
export async function POST(request: NextRequest) {
  const body = await request.json()
  return proxyToNestJS({ backendPath: 'v1/vehicles', method: 'POST', body })
}
