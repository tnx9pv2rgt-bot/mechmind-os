import { type NextRequest } from 'next/server'
import { proxyToNestJS } from '@/lib/auth/api-proxy'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/** POST /api/gdpr/customers/:id/delete → POST /v1/gdpr/customers/:id/delete */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  return proxyToNestJS({ backendPath: `v1/gdpr/customers/${id}/delete`, method: 'POST' })
}
