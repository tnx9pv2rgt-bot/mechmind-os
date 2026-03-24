import { NextRequest, NextResponse } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || '';
const APPLE_REDIRECT_URI = process.env.APPLE_REDIRECT_URI || '';

export async function GET(): Promise<Response> {
  if (!APPLE_CLIENT_ID || !APPLE_REDIRECT_URI) {
    return NextResponse.redirect(new URL('/auth?error=apple_not_configured', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'));
  }

  const params = new URLSearchParams({
    client_id: APPLE_CLIENT_ID,
    redirect_uri: APPLE_REDIRECT_URI,
    response_type: 'code id_token',
    scope: 'name email',
    response_mode: 'form_post',
    state: crypto.randomUUID(),
  });

  return NextResponse.redirect(`https://appleid.apple.com/auth/authorize?${params.toString()}`);
}

export async function POST(req: NextRequest): Promise<Response> {
  const body = await req.json();
  return proxyToNestJS({ backendPath: 'v1/auth/oauth/apple', method: 'POST', body });
}
