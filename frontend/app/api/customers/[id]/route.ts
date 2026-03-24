import { type NextRequest } from 'next/server'
import { proxyToNestJS } from '@/lib/auth/api-proxy'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/** GET /api/customers/:id → GET /v1/customers/:id */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  return proxyToNestJS({ backendPath: `v1/customers/${id}` })
}

/** PATCH /api/customers/:id → PATCH /v1/customers/:id */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const body = await request.json()
  return proxyToNestJS({ backendPath: `v1/customers/${id}`, method: 'PATCH', body })
}

/** DELETE /api/customers/:id → POST /v1/gdpr/customers/:id/delete */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  return proxyToNestJS({ backendPath: `v1/gdpr/customers/${id}/delete`, method: 'POST' })
}
