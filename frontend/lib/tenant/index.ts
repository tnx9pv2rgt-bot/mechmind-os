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
  type TenantContext,

  // Context functions
  getTenantContext,
  tryGetTenantContext,
  requireTenantId,

  // Errors
  TenantNotFoundError,
  TenantSuspendedError,
  TenantExpiredError,
  NoTenantContextError,
} from './context'
