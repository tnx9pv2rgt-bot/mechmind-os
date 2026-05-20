export const dynamic = 'force-dynamic'

import { type NextRequest } from 'next/server'
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy'

export async function GET(request: NextRequest) {
  const params = getQueryParams(request)
  return proxyToNestJS({ backendPath: 'v1/subscription/current', params })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  return proxyToNestJS({ backendPath: 'v1/subscription/upgrade', method: 'POST', body })
}
