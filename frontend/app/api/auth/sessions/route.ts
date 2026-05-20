import { NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export async function GET(req: NextRequest) {
  return proxyToNestJS({ backendPath: 'v1/auth/sessions' });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Route based on action
  if (body.sessionId) {
    // Revoke specific session
    return proxyToNestJS({
      backendPath: `v1/auth/sessions/${body.sessionId}/revoke`,
      method: 'POST',
      body,
    });
  }

  if (body.currentSessionId !== undefined) {
    // Revoke all other sessions
    return proxyToNestJS({
      backendPath: 'v1/auth/sessions/revoke-others',
      method: 'POST',
      body,
    });
  }

  return proxyToNestJS({ backendPath: 'v1/auth/sessions', method: 'POST', body });
}
