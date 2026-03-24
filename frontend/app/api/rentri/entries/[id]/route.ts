export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const qp = getQueryParams(req)
  return proxyToNestJS({ backendPath: `v1/rentri/entries/${id}`, params: qp })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json()
  return proxyToNestJS({ backendPath: `v1/rentri/entries/${id}`, method: 'PATCH', body })
}
