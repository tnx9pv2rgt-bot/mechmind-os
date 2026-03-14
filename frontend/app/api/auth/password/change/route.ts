import { type NextRequest } from 'next/server'
import { proxyToNestJS } from '@/lib/auth/api-proxy'

export const dynamic = 'force-dynamic'

/** POST /api/auth/password/change → POST /v1/auth/password/change */
export async function POST(request: NextRequest) {
  const body = await request.json()
  return proxyToNestJS({ backendPath: 'v1/auth/password/change', method: 'POST', body })
}
