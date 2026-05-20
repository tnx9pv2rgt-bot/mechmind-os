import { NextRequest, NextResponse } from 'next/server';
import { proxyAuthToBackend } from '@/lib/auth/backend-proxy';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export async function GET(): Promise<Response> {
  if (!GOOGLE_CLIENT_ID) {
    // Google OAuth not configured — redirect back to auth with error
    return NextResponse.redirect(new URL('/auth?error=google_not_configured', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'));
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/auth/oauth/callback`;
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.json();

  return proxyAuthToBackend('auth/oauth/google', {
    method: 'POST',
    body,
  });
}
