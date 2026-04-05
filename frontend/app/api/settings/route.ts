import { type NextRequest } from 'next/server'
import { proxyToNestJS } from '@/lib/auth/api-proxy'

export const dynamic = 'force-dynamic'

/** GET /api/settings → GET /v1/tenant/settings */
export async function GET() {
  return proxyToNestJS({ backendPath: 'v1/settings' })
}

/** PUT /api/settings → PUT /v1/tenant/settings */
export async function PUT(request: NextRequest) {
  const body = await request.json()
  return proxyToNestJS({ backendPath: 'v1/settings', method: 'PUT', body })
}
