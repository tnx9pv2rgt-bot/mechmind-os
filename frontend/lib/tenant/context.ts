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
  return null; // TODO: implement
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
