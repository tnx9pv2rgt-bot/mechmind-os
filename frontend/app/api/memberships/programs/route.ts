import { type NextRequest } from 'next/server'
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy'

export const dynamic = 'force-dynamic'

/** GET /api/memberships/programs → GET /v1/memberships/programs */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/memberships/programs',
    params: getQueryParams(request),
  })
}

/** POST /api/memberships/programs → POST /v1/memberships/programs */
export async function POST(request: NextRequest) {
  const body = await request.json()
  return proxyToNestJS({
    backendPath: 'v1/memberships/programs',
    method: 'POST',
    body,
  })
}

/** PUT /api/memberships/programs → PUT /v1/memberships/programs */
export async function PUT(request: NextRequest) {
  const body = await request.json()
  return proxyToNestJS({
    backendPath: 'v1/memberships/programs',
    method: 'PUT',
    body,
  })
}

/** DELETE /api/memberships/programs → DELETE /v1/memberships/programs */
export async function DELETE(request: NextRequest) {
  const body = await request.json()
  return proxyToNestJS({
    backendPath: 'v1/memberships/programs',
    method: 'DELETE',
    body,
  })
}
