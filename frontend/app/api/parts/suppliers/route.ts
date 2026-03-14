import { type NextRequest } from 'next/server'
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy'

export const dynamic = 'force-dynamic'

/** GET /api/parts/suppliers → GET /v1/parts/suppliers/list */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/parts/suppliers/list',
    params: getQueryParams(request),
  })
}

/** POST /api/parts/suppliers → POST /v1/parts/suppliers */
export async function POST(request: NextRequest) {
  const body = await request.json()
  return proxyToNestJS({
    backendPath: 'v1/parts/suppliers',
    method: 'POST',
    body,
  })
}
