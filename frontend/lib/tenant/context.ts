// Simplified tenant context for build
export interface TenantContext {
  tenantId: string
  tenantSlug: string
  subdomain?: string
  customDomain?: string
  userId?: string
  userRole?: string
  permissions: string[]
  subscriptionTier: string
  subscriptionStatus: string
  features: string[]
}

export const getTenantContext = async (): Promise<TenantContext | null> => {
  return null // TODO: implement
}

export const requireTenantId = async (): Promise<string> => {
  return 'demo-tenant' // TODO: implement
}

export const tryGetTenantContext = async (): Promise<TenantContext | null> => {
  return null // TODO: implement
}

export class NoTenantContextError extends Error {
  constructor() {
    super('No tenant context available')
  }
}

export class TenantNotFoundError extends Error {
  constructor(slug: string) {
    super(`Tenant not found: ${slug}`)
  }
}

export class TenantExpiredError extends Error {
  constructor() {
    super('Tenant subscription expired')
  }
}

export class TenantSuspendedError extends Error {
  constructor() {
    super('Tenant suspended')
  }
}
