import { proxyToNestJS } from '@/lib/auth/api-proxy'

export const dynamic = 'force-dynamic'

/** GET /api/auth/mfa/status → GET /v1/auth/mfa/status */
export async function GET() {
  return proxyToNestJS({ backendPath: 'v1/auth/mfa/status' })
}
