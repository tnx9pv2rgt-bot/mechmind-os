import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/logout
 * Clears the HttpOnly auth cookies.
 */
export async function POST(): Promise<NextResponse> {
  const cookieStore = await cookies()

  cookieStore.delete('auth_token')
  cookieStore.delete('refresh_token')

  return NextResponse.json({ success: true })
}
