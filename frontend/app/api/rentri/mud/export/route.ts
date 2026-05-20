import { type NextRequest } from 'next/server'
import { proxyToNestJS } from '@/lib/auth/api-proxy'

export const dynamic = 'force-dynamic'

/** POST /api/rentri/mud/export → POST /v1/rentri/mud/export */
export async function POST(request: NextRequest) {
  const body = await request.json()
  return proxyToNestJS({
    backendPath: 'v1/rentri/mud/export',
    method: 'POST',
    body,
  })
}
