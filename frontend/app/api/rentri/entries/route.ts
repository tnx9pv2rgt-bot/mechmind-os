import { type NextRequest } from 'next/server'
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy'

export const dynamic = 'force-dynamic'

/** GET /api/rentri/entries → GET /v1/rentri/entries */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/rentri/entries',
    params: getQueryParams(request),
  })
}

/** POST /api/rentri/entries → POST /v1/rentri/entries */
export async function POST(request: NextRequest) {
  const body = await request.json()
  return proxyToNestJS({
    backendPath: 'v1/rentri/entries',
    method: 'POST',
    body,
  })
}
