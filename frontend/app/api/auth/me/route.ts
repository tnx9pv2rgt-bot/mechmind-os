import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const DEMO_USER = {
  id: 'demo-user',
  email: 'demo@mechmind.it',
  name: 'Utente Demo',
  role: 'OWNER',
  tenantId: 'demo-tenant',
  tenantName: 'Officina Demo',
}

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
 * 1. If demo_session cookie → return demo user (no backend call)
 * 2. If auth_token cookie → decode JWT and return user info
 * 3. Otherwise → { user: null }
 */
export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies()

  // Demo session — return fake user instantly
  if (cookieStore.get('demo_session')?.value === '1') {
    return NextResponse.json({ user: DEMO_USER })
  }

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
