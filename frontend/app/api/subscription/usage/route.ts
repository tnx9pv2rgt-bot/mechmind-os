export const dynamic = 'force-dynamic'

import { proxyToNestJS } from '@/lib/auth/api-proxy'

export async function GET() {
  return proxyToNestJS({ backendPath: 'v1/subscription/usage' })
}
