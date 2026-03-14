export const dynamic = 'force-dynamic'

import { type NextRequest } from 'next/server'
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy'

export async function GET(request: NextRequest) {
  const params = getQueryParams(request)
  return proxyToNestJS({ backendPath: 'v1/subscription/pricing', params })
}
