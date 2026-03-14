import { type NextRequest } from 'next/server'
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy'

export const dynamic = 'force-dynamic'

/** GET /api/bookings → GET /v1/bookings */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/bookings',
    params: getQueryParams(request),
  })
}

/** POST /api/bookings → POST /v1/bookings */
export async function POST(request: NextRequest) {
  const body = await request.json()
  return proxyToNestJS({
    backendPath: 'v1/bookings',
    method: 'POST',
    body,
  })
}
