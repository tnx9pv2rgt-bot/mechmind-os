import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * GET /api/csrf/token
 *
 * Generates a CSRF token using the double-submit cookie pattern:
 * 1. Sets the token in a non-HttpOnly cookie (readable by JS).
 * 2. Returns the token in the response body for the client to store.
 * 3. On mutating requests, the client sends the token in X-CSRF-Token header.
 * 4. Server compares cookie value vs header value.
 */
export async function GET(): Promise<NextResponse> {
  const token = randomBytes(32).toString('hex');
  const isProduction = process.env.NODE_ENV === 'production';

  const response = NextResponse.json({ csrfToken: token });

  // Non-HttpOnly cookie — must be readable by JavaScript
  response.cookies.set('csrf-token', token, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60, // 1 hour
  });

  return response;
}
