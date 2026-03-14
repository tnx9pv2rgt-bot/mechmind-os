/**
 * Portal Login API Route
 * Proxies customer authentication to the NestJS backend
 * TODO: Create dedicated PortalAuthController in backend with customer auth endpoints
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BACKEND_URL = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:3000'
).replace(/\/+$/, '');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_CREDENTIALS',
            message: 'Email and password are required',
          },
        },
        { status: 400 }
      );
    }

    // Proxy to backend auth endpoint
    const res = await fetch(`${BACKEND_URL}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(10000),
    });

    const data: unknown = await res.json().catch(() => ({
      error: { code: 'PARSE_ERROR', message: 'Invalid response from server' },
    }));

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'SERVER_ERROR',
          message: 'An error occurred during login',
        },
      },
      { status: 500 }
    );
  }
}
