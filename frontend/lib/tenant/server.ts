/**
 * Tenant Server Utils
 * Server-side functions for tenant resolution via backend API
 */

import { BACKEND_BASE } from '@/lib/config';

const BACKEND_URL = BACKEND_BASE;
const TIMEOUT_MS = 10_000;

export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  status: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  subdomain: string | null;
  customDomain: string | null;
}

/**
 * Internal helper to call the backend tenant resolution endpoint.
 */
async function fetchTenant(
  identifier: string,
  type: 'subdomain' | 'domain' | 'header' | 'cookie' | 'param'
): Promise<TenantInfo | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const params = new URLSearchParams({ identifier, type });
    const res = await fetch(`${BACKEND_URL}/v1/tenant/resolve?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      console.error(`[tenant/server] Backend returned ${res.status}`);
      return null;
    }

    const body = (await res.json()) as { data?: TenantInfo };
    return body.data ?? (body as unknown as TenantInfo);
  } catch (error) {
    console.error('Error getting tenant by identifier:', error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Get tenant by identifier (subdomain, domain, id, or slug)
 */
export async function getTenantByIdentifier(
  identifier: string,
  type: 'subdomain' | 'domain' | 'header' | 'cookie' | 'param'
): Promise<TenantInfo | null> {
  return fetchTenant(identifier, type);
}

/**
 * Get tenant by slug
 */
export async function getTenantBySlug(slug: string): Promise<TenantInfo | null> {
  return fetchTenant(slug, 'param');
}

/**
 * Get tenant by ID
 */
export async function getTenantById(id: string): Promise<TenantInfo | null> {
  return fetchTenant(id, 'param');
}

/**
 * Create a new tenant
 */
export async function createTenant(data: {
  name: string;
  slug: string;
  email: string;
  subdomain?: string;
  customDomain?: string;
}): Promise<TenantInfo> {
  const res = await fetch(`${BACKEND_URL}/v1/tenant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(`Failed to create tenant: ${res.status}`);
  }

  const body = (await res.json()) as { data?: TenantInfo };
  return body.data ?? (body as unknown as TenantInfo);
}

/**
 * Check if slug is available
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const tenant = await fetchTenant(slug, 'param');
  return !tenant;
}

/**
 * Check if subdomain is available
 */
export async function isSubdomainAvailable(subdomain: string): Promise<boolean> {
  const tenant = await fetchTenant(subdomain, 'subdomain');
  return !tenant;
}
