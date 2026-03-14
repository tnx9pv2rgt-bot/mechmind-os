export const dynamic = 'force-dynamic'

import { type NextRequest } from 'next/server'
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy'

export async function GET(request: NextRequest) {
  const path = request.nextUrl.pathname.replace('/api/subscription', 'v1/subscription')
  const params = getQueryParams(request)
  return proxyToNestJS({ backendPath: path, params })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  return proxyToNestJS({ backendPath: 'v1/subscription', method: 'POST', body })
}
