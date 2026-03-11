import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1';

/** Timeout in ms for backend requests (Render free tier cold start ~30s) */
const BACKEND_TIMEOUT_MS = 30_000;

interface ProxyOptions {
  method: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

/**
 * Execute a fetch with AbortController timeout.
 * Returns the Response or throws on timeout/network error.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = BACKEND_TIMEOUT_MS,
): Promise<globalThis.Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Proxy a request to the backend NestJS API.
 * Strips the /api/auth prefix and forwards to /v1/auth/*.
 * Includes a 30-second timeout for Render cold starts.
 */
export async function proxyToBackend(
  backendPath: string,
  options: ProxyOptions,
): Promise<NextResponse> {
  const url = `${BACKEND_URL}/${backendPath}`;

  try {
    const res = await fetchWithTimeout(url, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data: unknown = await res.json();

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error(`Backend proxy error [${backendPath}]:`, error);

    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json(
        {
          error: {
            code: 'BACKEND_COLD_START',
            message: 'Il server si sta avviando, riprova tra qualche secondo...',
          },
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'BACKEND_UNAVAILABLE',
          message: 'Servizio temporaneamente non disponibile. Riprova tra qualche secondo.',
        },
      },
      { status: 502 },
    );
  }
}

/**
 * Proxy a request and set auth cookie on success.
 * Includes a 30-second timeout for Render cold starts.
 */
export async function proxyAuthToBackend(
  backendPath: string,
  options: ProxyOptions,
): Promise<NextResponse> {
  const url = `${BACKEND_URL}/${backendPath}`;

  try {
    const res = await fetchWithTimeout(url, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = (await res.json()) as Record<string, unknown>;

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

      response.cookies.set('auth_token', data.accessToken as string, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: (data.expiresIn as number) || 86400,
      });

      response.cookies.set('refresh_token', data.refreshToken as string, {
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

    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json(
        {
          error: {
            code: 'BACKEND_COLD_START',
            message: 'Il server si sta avviando, riprova tra qualche secondo...',
          },
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'BACKEND_UNAVAILABLE',
          message: 'Servizio temporaneamente non disponibile. Riprova tra qualche secondo.',
        },
      },
      { status: 502 },
    );
  }
}
