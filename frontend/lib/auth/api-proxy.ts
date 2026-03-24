/**
 * API Proxy Helper — reads HttpOnly auth_token cookie and forwards
 * requests to the NestJS backend with Bearer authorization.
 *
 * Used by Next.js API route handlers under /api/dashboard/*, /api/bookings/*, etc.
 */

import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { BACKEND_BASE } from '@/lib/config';

// Callers pass full paths like 'v1/bookings' — BACKEND_URL is the base without /v1
const BACKEND_URL = BACKEND_BASE;
const TIMEOUT_MS = 30_000;

interface ProxyConfig {
  /** NestJS path without leading slash, e.g. 'v1/bookings' */
  backendPath: string;
  method?: string;
  body?: unknown;
  /** Extra query params to forward */
  params?: Record<string, string>;
}

/**
 * Proxy a request from a Next.js API route to the NestJS backend.
 * Automatically attaches the auth_token and tenant headers.
 * Always calls the real backend — no mock data.
 */
export async function proxyToNestJS(config: ProxyConfig): Promise<NextResponse> {
  const { backendPath, method = 'GET', body, params } = config;
  const cookieStore = await cookies();

  const token = cookieStore.get('auth_token')?.value;
  let tenantId = cookieStore.get('tenant_id')?.value;
  let tenantSlug = cookieStore.get('tenant_slug')?.value;

  // Fallback: extract tenant info from JWT if cookies are missing
  if (token && (!tenantId || !tenantSlug)) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8')) as {
          tenantId?: string;
          sub?: string;
        };
        if (!tenantId) {
          tenantId = payload.tenantId || '';
          if (!tenantId && payload.sub) {
            const subParts = payload.sub.split(':');
            if (subParts.length >= 2) tenantId = subParts[1];
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  let url = `${BACKEND_URL}/${backendPath}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (tenantId) {
    headers['x-tenant-id'] = tenantId;
  }
  if (tenantSlug) {
    headers['x-tenant-slug'] = tenantSlug;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    // Auto-refresh on 401: use refresh_token to get a new access token
    if (res.status === 401 && token) {
      const refreshToken = cookieStore.get('refresh_token')?.value;
      if (refreshToken) {
        const refreshRes = await fetch(`${BACKEND_URL}/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        }).catch(() => null);

        if (refreshRes?.ok) {
          const refreshData = (await refreshRes.json()) as {
            data?: { accessToken?: string; refreshToken?: string; expiresIn?: number };
          };
          const newToken = refreshData.data?.accessToken;
          if (newToken) {
            // Retry original request with new token
            headers['Authorization'] = `Bearer ${newToken}`;
            res = await fetch(url, {
              method,
              headers,
              body: body ? JSON.stringify(body) : undefined,
            });

            // Set updated cookies in response
            const data: unknown = await res
              .json()
              .catch(() => ({ error: 'Invalid JSON response' }));
            const response = NextResponse.json(data, { status: res.status });
            const isProduction = process.env.NODE_ENV === 'production';
            response.cookies.set('auth_token', newToken, {
              httpOnly: true,
              secure: isProduction,
              sameSite: 'lax',
              path: '/',
              maxAge: refreshData.data?.expiresIn || 900,
            });
            if (refreshData.data?.refreshToken) {
              response.cookies.set('refresh_token', refreshData.data.refreshToken, {
                httpOnly: true,
                secure: isProduction,
                sameSite: 'lax',
                path: '/',
                maxAge: 7 * 24 * 60 * 60,
              });
            }
            return response;
          }
        }
      }
    }

    const data: unknown = await res.json().catch(() => ({ error: 'Invalid JSON response' }));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json(
        { error: { code: 'BACKEND_COLD_START', message: 'Server in avvio, riprova...' } },
        { status: 503 },
      );
    }
    console.error(`[api-proxy] ${method} ${url}:`, error);
    return NextResponse.json(
      { error: { code: 'BACKEND_UNAVAILABLE', message: 'Backend non raggiungibile' } },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Helper to extract query params from a NextRequest.
 */
export function getQueryParams(request: NextRequest): Record<string, string> {
  const params: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}
