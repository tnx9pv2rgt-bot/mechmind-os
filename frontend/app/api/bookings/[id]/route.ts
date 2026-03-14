import { type NextRequest } from 'next/server'
import { proxyToNestJS } from '@/lib/auth/api-proxy'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/** GET /api/bookings/:id → GET /v1/bookings/:id */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  return proxyToNestJS({ backendPath: `v1/bookings/${id}` })
}

/** PATCH /api/bookings/:id → PATCH /v1/bookings/:id */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const body = await request.json()
  return proxyToNestJS({ backendPath: `v1/bookings/${id}`, method: 'PATCH', body })
}

/** DELETE /api/bookings/:id → DELETE /v1/bookings/:id */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  return proxyToNestJS({ backendPath: `v1/bookings/${id}`, method: 'DELETE' })
}
