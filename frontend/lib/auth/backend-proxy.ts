import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1';

/**
 * Proxy a request to the backend NestJS API.
 * Strips the /api/auth prefix and forwards to /v1/auth/*.
 */
export async function proxyToBackend(
  backendPath: string,
  options: {
    method: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  },
): Promise<NextResponse> {
  const url = `${BACKEND_URL}/${backendPath}`;

  try {
    const res = await fetch(url, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await res.json();

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error(`Backend proxy error [${backendPath}]:`, error);
    return NextResponse.json(
      { error: 'Servizio temporaneamente non disponibile' },
      { status: 502 },
    );
  }
}

/**
 * Proxy a request and set auth cookie on success.
 */
export async function proxyAuthToBackend(
  backendPath: string,
  options: {
    method: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  },
): Promise<NextResponse> {
  const url = `${BACKEND_URL}/${backendPath}`;

  try {
    const res = await fetch(url, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    // If response contains tokens, set HttpOnly cookie
    if (data.accessToken) {
      const response = NextResponse.json({
        success: true,
        expiresIn: data.expiresIn,
        requiresMFA: false,
      });

      response.cookies.set('auth_token', data.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: data.expiresIn || 86400,
      });

      response.cookies.set('refresh_token', data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      return response;
    }

    // MFA required response (tempToken)
    if (data.tempToken) {
      return NextResponse.json({
        requiresMFA: true,
        tempToken: data.tempToken,
        methods: data.methods,
      });
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error(`Backend auth proxy error [${backendPath}]:`, error);
    return NextResponse.json(
      { error: 'Servizio temporaneamente non disponibile' },
      { status: 502 },
    );
  }
}
