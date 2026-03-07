/**
 * Tenant Server Utils
 * Server-side functions for tenant resolution
 */

import { prisma } from '@/lib/prisma'

export interface TenantInfo {
  id: string
  slug: string
  name: string
  status: string
  subscriptionTier: string
  subscriptionStatus: string
  subdomain: string | null
  customDomain: string | null
}

/**
 * Get tenant by identifier (subdomain, domain, id, or slug)
 */
export async function getTenantByIdentifier(
  identifier: string,
  type: 'subdomain' | 'domain' | 'header' | 'cookie' | 'param'
): Promise<TenantInfo | null> {
  try {
    let tenant = null

    switch (type) {
      case 'subdomain':
        tenant = await prisma.tenant.findFirst({
          where: { subdomain: identifier },
        })
        break
      case 'domain':
        tenant = await prisma.tenant.findFirst({
          where: { customDomain: identifier },
        })
        break
      case 'cookie':
      case 'header':
      case 'param':
        // Try to find by ID first, then by slug
        tenant = await prisma.tenant.findUnique({
          where: { id: identifier },
        })
        if (!tenant) {
          tenant = await prisma.tenant.findUnique({
            where: { slug: identifier },
          })
        }
        break
    }

    if (!tenant) return null

    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      status: tenant.status,
      subscriptionTier: tenant.subscriptionTier,
      subscriptionStatus: tenant.subscriptionStatus,
      subdomain: tenant.subdomain,
      customDomain: tenant.customDomain,
    }
  } catch (error) {
    console.error('Error getting tenant by identifier:', error)
    return null
  }
}

/**
 * Get tenant by slug
 */
export async function getTenantBySlug(slug: string): Promise<TenantInfo | null> {
  return getTenantByIdentifier(slug, 'param')
}

/**
 * Get tenant by ID
 */
export async function getTenantById(id: string): Promise<TenantInfo | null> {
  return getTenantByIdentifier(id, 'param')
}

/**
 * Create a new tenant
 */
export async function createTenant(data: {
  name: string
  slug: string
  email: string
  subdomain?: string
  customDomain?: string
}) {
  return prisma.tenant.create({
    data: {
      name: data.name,
      slug: data.slug,
      email: data.email,
      subdomain: data.subdomain || null,
      customDomain: data.customDomain || null,
      subscriptionTier: 'TRIAL',
      subscriptionStatus: 'TRIAL',
    },
  })
}

/**
 * Check if slug is available
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const existing = await prisma.tenant.findUnique({
    where: { slug },
  })
  return !existing
}

/**
 * Check if subdomain is available
 */
export async function isSubdomainAvailable(subdomain: string): Promise<boolean> {
  const existing = await prisma.tenant.findFirst({
    where: { subdomain },
  })
  return !existing
}
