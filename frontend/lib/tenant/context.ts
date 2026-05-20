// Simplified tenant context for build
export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  subdomain?: string;
  customDomain?: string;
  userId?: string;
  userRole?: string;
  permissions: string[];
  subscriptionTier: string;
  subscriptionStatus: string;
  features: string[];
}

let _currentTenantContext: TenantContext | null = null;

export function setTenantContext(ctx: TenantContext): void {
  _currentTenantContext = ctx;
}

export function clearTenantContext(): void {
  _currentTenantContext = null;
}

export const getTenantContext = async (): Promise<TenantContext | null> => {
  return _currentTenantContext;
};

export const requireTenantId = async (): Promise<string> => {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) {
    throw new NoTenantContextError();
  }
  return ctx.tenantId;
};

export const tryGetTenantContext = async (): Promise<TenantContext | null> => {
  // First check module-level cache
  if (_currentTenantContext) {
    return _currentTenantContext;
  }

  // On the server side, try to read from cookies
  if (typeof window === 'undefined') {
    try {
      // Dynamic import to avoid bundling next/headers on client
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const tenantId = cookieStore.get('tenant_id')?.value;
      const tenantSlug = cookieStore.get('tenant_slug')?.value;
      const authToken = cookieStore.get('auth_token')?.value;

      if (!tenantId && !authToken) {
        return null;
      }

      // Try to extract tenant info from JWT if tenantId cookie is missing
      let extractedTenantId = tenantId || '';
      if (!extractedTenantId && authToken) {
        try {
          const parts = authToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8')) as {
              tenantId?: string;
              sub?: string;
              userId?: string;
              userRole?: string;
            };
            extractedTenantId = payload.tenantId || '';
            if (!extractedTenantId && payload.sub) {
              const subParts = payload.sub.split(':');
              if (subParts.length >= 2) extractedTenantId = subParts[1];
            }
          }
        } catch {
          /* ignore JWT decode errors */
        }
      }

      if (!extractedTenantId) {
        return null;
      }

      return {
        tenantId: extractedTenantId,
        tenantSlug: tenantSlug || '',
        permissions: [],
        subscriptionTier: 'PROFESSIONAL',
        subscriptionStatus: 'ACTIVE',
        features: [],
      };
    } catch {
      // cookies() may throw outside of request context
      return null;
    }
  }

  // On the client side, try to read from document cookies
  try {
    const cookieString = document.cookie;
    const tenantIdMatch = cookieString.match(/(?:^|;\s*)tenant_id=([^;]*)/);
    const tenantSlugMatch = cookieString.match(/(?:^|;\s*)tenant_slug=([^;]*)/);
    const tenantId = tenantIdMatch ? decodeURIComponent(tenantIdMatch[1]) : '';
    const tenantSlug = tenantSlugMatch ? decodeURIComponent(tenantSlugMatch[1]) : '';

    if (!tenantId) {
      return null;
    }

    return {
      tenantId,
      tenantSlug: tenantSlug || '',
      permissions: [],
      subscriptionTier: 'PROFESSIONAL',
      subscriptionStatus: 'ACTIVE',
      features: [],
    };
  } catch {
    return null;
  }
};

export class NoTenantContextError extends Error {
  constructor() {
    super('No tenant context available');
  }
}

export class TenantNotFoundError extends Error {
  constructor(slug: string) {
    super(`Tenant not found: ${slug}`);
  }
}

export class TenantExpiredError extends Error {
  constructor() {
    super('Tenant subscription expired');
  }
}

export class TenantSuspendedError extends Error {
  constructor() {
    super('Tenant suspended');
  }
}

/**
 * Extracts tenant identifier from a Next.js request.
 * Checks subdomain, custom domain header, query param, and cookie.
 */
export async function extractTenantFromRequest(request: {
  headers: { get(name: string): string | null };
  nextUrl?: { hostname: string; searchParams: { get(name: string): string | null } };
  cookies?: { get(name: string): { value: string } | undefined };
}): Promise<{
  value: string;
  type: 'subdomain' | 'domain' | 'header' | 'cookie' | 'param';
} | null> {
  // 1. Check x-tenant-id header
  const headerTenantId = request.headers.get('x-tenant-id');
  if (headerTenantId) {
    return { value: headerTenantId, type: 'header' };
  }

  // 2. Check subdomain
  const hostname = request.nextUrl?.hostname;
  if (hostname && !hostname.startsWith('localhost') && !hostname.startsWith('127.')) {
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      return { value: parts[0], type: 'subdomain' };
    }
  }

  // 3. Check query param
  const queryTenant = request.nextUrl?.searchParams.get('tenant');
  if (queryTenant) {
    return { value: queryTenant, type: 'param' };
  }

  // 4. Check cookie
  const cookieTenant = request.cookies?.get('tenant_id');
  if (cookieTenant?.value) {
    return { value: cookieTenant.value, type: 'cookie' };
  }

  return null;
}

export function buildTenantQuery<T extends Record<string, unknown>>(
  tenantId: string,
  additionalFilters?: T
): { tenantId: string } & Partial<T> {
  return {
    tenantId,
    ...additionalFilters,
  } as { tenantId: string } & Partial<T>;
}
