import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { BACKEND_BASE } from '@/lib/config'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/logout
 * 1. Call backend to blacklist access token + revoke refresh family
 * 2. Clear HttpOnly auth cookies
 *
 * Big tech pattern: logout must invalidate tokens server-side,
 * not just clear cookies (prevents stolen token reuse).
 */
export async function POST(): Promise<NextResponse> {
  const cookieStore = await cookies()

  const authToken = cookieStore.get('auth_token')?.value
  const refreshToken = cookieStore.get('refresh_token')?.value

  // Call backend to blacklist tokens + revoke session
  if (authToken) {
    try {
      await fetch(`${BACKEND_BASE}/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ refreshToken: refreshToken || undefined }),
        signal: AbortSignal.timeout(5000),
      })
    } catch {
      // Backend unreachable — still clear cookies locally
    }
  }

  // Always clear cookies regardless of backend response
  cookieStore.delete('auth_token')
  cookieStore.delete('refresh_token')
  cookieStore.delete('tenant_id')
  cookieStore.delete('tenant_slug')
  cookieStore.delete('demo_session')
  cookieStore.delete('csrf-token')

  return NextResponse.json({ success: true })
}
