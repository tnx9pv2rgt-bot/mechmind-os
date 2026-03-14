import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const DEMO_MAX_AGE = 30 * 60 // 30 minutes

/**
 * POST /api/auth/demo-session
 * Sets HttpOnly demo_session cookie + tenant cookies, then 302 → /dashboard.
 * The browser processes Set-Cookie BEFORE following the redirect,
 * so the cookie is guaranteed present on the first /dashboard request.
 *
 * DELETE /api/auth/demo-session — Destroy the demo session
 */
export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ success: true, demo: true })

  response.cookies.set('demo_session', '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DEMO_MAX_AGE,
  })

  response.cookies.set('tenant_id', 'demo-tenant', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DEMO_MAX_AGE,
  })

  response.cookies.set('tenant_slug', 'demo', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DEMO_MAX_AGE,
  })

  return response
}

export async function DELETE(): Promise<NextResponse> {
  const response = NextResponse.json({ success: true })

  response.cookies.set('demo_session', '', { path: '/', maxAge: 0 })
  response.cookies.set('tenant_id', '', { path: '/', maxAge: 0 })
  response.cookies.set('tenant_slug', '', { path: '/', maxAge: 0 })

  return response
}
