import { type NextRequest } from 'next/server'
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy'

export const dynamic = 'force-dynamic'

/** GET /api/payroll → GET /v1/payroll/summary */
export async function GET(request: NextRequest) {
  const params = getQueryParams(request)

  // Backend requires `period` in YYYY-MM format
  if (!params.period) {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    params.period = `${year}-${month}`
  }

  return proxyToNestJS({
    backendPath: 'v1/payroll/summary',
    params,
  })
}

/** POST /api/payroll → POST /v1/payroll/summary */
export async function POST(request: NextRequest) {
  const body = await request.json()
  return proxyToNestJS({
    backendPath: 'v1/payroll/summary',
    method: 'POST',
    body,
  })
}
