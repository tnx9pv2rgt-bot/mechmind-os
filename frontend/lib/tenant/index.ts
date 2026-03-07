/**
 * Multi-Tenant Module
 * 
 * Exports all tenant-related functionality for MechMind OS.
 * 
 * @module lib/tenant
 * @version 1.0.0
 */

// Context management
export {
  // Types
  TenantContext,
  TenantInfo,
  
  // Context functions
  setTenantContext,
  getTenantContext,
  tryGetTenantContext,
  hasTenantContext,
  clearTenantContext,
  requireTenantId,
  
  // Request resolution
  extractTenantFromRequest,
  getTenantFromRequest,
  
  // Validation
  validateTenantSubscription,
  hasFeature,
  checkFeatureAccess,
  
  // Prisma helpers
  withTenantFilter,
  tenantWhere,
  buildTenantQuery,
  
  // Errors
  TenantNotFoundError,
  TenantSuspendedError,
  TenantExpiredError,
  NoTenantContextError,
} from './context'

// Re-export middleware for convenience
export { tenantMiddleware, createTenantMiddleware } from '@/middleware/tenant'
