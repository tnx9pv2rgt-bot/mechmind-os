import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface JwtPayload {
  sub: string
  email: string
  role: string
  tenantId: string
  iat: number
  exp: number
}

/**
 * Decode a JWT payload without verification (signature was already
 * verified by the backend when the token was issued).
 * We only need the claims to populate the UI — every API call
 * still sends the full token to the backend for verification.
 */
function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8'),
    ) as JwtPayload
    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

/**
 * GET /api/auth/me
 * Decode JWT from auth_token cookie and return user info.
 * Demo sessions use a real token from backend auth, so no special handling needed.
 */
export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies()

  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return NextResponse.json({ user: null })
  }

  const payload = decodeJwtPayload(token)

  if (!payload) {
    return NextResponse.json({ user: null })
  }

  // sub format is "userId:tenantId"
  const userId = payload.sub.split(':')[0]

  return NextResponse.json({
    user: {
      id: userId,
      email: payload.email,
      name: payload.email.split('@')[0],
      role: payload.role,
      tenantId: payload.tenantId,
    },
  })
}
