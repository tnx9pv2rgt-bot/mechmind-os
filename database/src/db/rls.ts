// ============================================================================
// MechMind OS v10 - Row Level Security (RLS) Utilities
// Middleware and helpers for multi-tenant isolation
// ============================================================================
//
// This module provides:
// - RLS context management
// - Prisma middleware for automatic tenant injection
// - Helper functions for cross-tenant operations
// - Connection pooling with tenant isolation
//
// ============================================================================

import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface TenantContext {
  tenantId: string;
  userId?: string;
  bypassRLS?: boolean;
  requestId?: string;
}

export interface RLSConfig {
  enableLogging?: boolean;
  enableQueryLogging?: boolean;
  defaultBypassRLS?: boolean;
}

export interface AuditContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  action?: string;
}

// ============================================================================
// ASYNC LOCAL STORAGE FOR CONTEXT PROPAGATION
// ============================================================================

const tenantContextStorage = new AsyncLocalStorage<TenantContext>();

// ============================================================================
// RLS MANAGER CLASS
// ============================================================================

export class RLSManager {
  private prisma: PrismaClient;
  private config: RLSConfig;

  constructor(prisma: PrismaClient, config: RLSConfig = {}) {
    this.prisma = prisma;
    this.config = {
      enableLogging: false,
      enableQueryLogging: false,
      defaultBypassRLS: false,
      ...config,
    };
  }

  // ========================================================================
  // CONTEXT MANAGEMENT
  // ========================================================================

  /**
   * Set the tenant context for the current session
   */
  async setTenantContext(tenantId: string): Promise<void> {
    await this.prisma.$executeRaw`SET app.current_tenant = ${tenantId}`;
    
    if (this.config.enableLogging) {
      console.log(`[RLS] Tenant context set: ${tenantId}`);
    }
  }

  /**
   * Clear the tenant context
   */
  async clearTenantContext(): Promise<void> {
    await this.prisma.$executeRaw`SET app.current_tenant = ''`;
    
    if (this.config.enableLogging) {
      console.log('[RLS] Tenant context cleared');
    }
  }

  /**
   * Enable RLS bypass for admin operations
   */
  async enableRLSBypass(): Promise<void> {
    await this.prisma.$executeRaw`SET app.bypass_rls = 'true'`;
    
    if (this.config.enableLogging) {
      console.log('[RLS] RLS bypass enabled');
    }
  }

  /**
   * Disable RLS bypass
   */
  async disableRLSBypass(): Promise<void> {
    await this.prisma.$executeRaw`SET app.bypass_rls = 'false'`;
    
    if (this.config.enableLogging) {
      console.log('[RLS] RLS bypass disabled');
    }
  }

  /**
   * Get current tenant from session
   */
  async getCurrentTenant(): Promise<string | null> {
    const result = await this.prisma.$queryRaw<{ get_current_tenant: string | null }[]>`
      SELECT get_current_tenant()
    `;
    return result?.[0]?.get_current_tenant ?? null;
  }

  /**
   * Check if RLS is bypassed
   */
  async isRLSBypassed(): Promise<boolean> {
    const result = await this.prisma.$queryRaw<{ should_bypass_rls: boolean }[]>`
      SELECT should_bypass_rls()
    `;
    return result?.[0]?.should_bypass_rls ?? false;
  }

  // ========================================================================
  // TRANSACTION WRAPPERS WITH CONTEXT
  // ========================================================================

  /**
   * Execute a function within a tenant context
   */
  async withTenant<T>(
    tenantId: string,
    fn: () => Promise<T>,
    options?: { bypassRLS?: boolean }
  ): Promise<T> {
    const context: TenantContext = {
      tenantId,
      bypassRLS: options?.bypassRLS ?? false,
    };

    return tenantContextStorage.run(context, async () => {
      try {
        // Set tenant context in database
        await this.setTenantContext(tenantId);
        
        if (options?.bypassRLS) {
          await this.enableRLSBypass();
        }

        // Execute the function
        const result = await fn();

        return result;
      } finally {
        // Always clean up context
        if (options?.bypassRLS) {
          await this.disableRLSBypass();
        }
        await this.clearTenantContext();
      }
    });
  }

  /**
   * Execute a cross-tenant admin operation
   */
  async withAdminAccess<T>(fn: () => Promise<T>): Promise<T> {
    await this.enableRLSBypass();
    
    try {
      return await fn();
    } finally {
      await this.disableRLSBypass();
    }
  }

  // ========================================================================
  // MIDDLEWARE FACTORY
  // ========================================================================

  /**
   * Create Prisma middleware for automatic RLS context injection
   */
  createMiddleware() {
    return async (params: any, next: any) => {
      const context = tenantContextStorage.getStore();
      
      if (!context) {
        // No tenant context set - queries will fail RLS checks
        if (this.config.enableLogging) {
          console.warn(`[RLS] Query without tenant context: ${params.model}.${params.action}`);
        }
        return next(params);
      }

      // Log query if enabled
      if (this.config.enableQueryLogging) {
        console.log(`[RLS] ${context.tenantId} - ${params.model}.${params.action}`);
      }

      return next(params);
    };
  }

  // ========================================================================
  // TENANT VALIDATION
  // ========================================================================

  /**
   * Validate that a tenant exists and is active
   */
  async validateTenant(tenantId: string): Promise<boolean> {
    // Use admin access to check tenant
    return this.withAdminAccess(async () => {
      const result = await this.prisma.$queryRaw<{ exists: boolean }[]>`
        SELECT EXISTS(
          SELECT 1 FROM tenants
          WHERE id = ${tenantId}::uuid
        ) as exists
      `;
      return result?.[0]?.exists ?? false;
    });
  }

  /**
   * Get tenant subscription tier
   */
  async getTenantTier(tenantId: string): Promise<string | null> {
    return this.withAdminAccess(async () => {
      const result = await this.prisma.$queryRaw<{ tier: string }[]>`
        SELECT subscription_tier as tier
        FROM tenants
        WHERE id = ${tenantId}::uuid
      `;
      return result?.[0]?.tier ?? null;
    });
  }
}

// ============================================================================
// PRISMA CLIENT EXTENSION FOR RLS
// ============================================================================

export function extendPrismaWithRLS(
  prisma: PrismaClient,
  config?: RLSConfig
): PrismaClient {
  const rlsManager = new RLSManager(prisma, config);

  // Apply middleware
  (prisma as any).$use(rlsManager.createMiddleware());

  // Attach RLS manager to prisma instance
  (prisma as any).$rls = rlsManager;

  return prisma;
}

// ============================================================================
// DECORATORS / HIGHER-ORDER FUNCTIONS
// ============================================================================

/**
 * Decorator/wrapper for tenant-scoped service methods
 */
export function withTenantScope<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  getTenantId: (...args: Parameters<T>) => string
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const tenantId = getTenantId(...args);
    const prisma = (global as any).prisma as PrismaClient;
    const rlsManager = (prisma as any).$rls as RLSManager;

    if (!rlsManager) {
      throw new Error('RLS manager not initialized. Call extendPrismaWithRLS first.');
    }

    return rlsManager.withTenant(tenantId, () => fn(...args));
  }) as T;
}

/**
 * Decorator for admin-only operations
 */
export function withAdminScope<T extends (...args: any[]) => Promise<any>>(
  fn: T
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const prisma = (global as any).prisma as PrismaClient;
    const rlsManager = (prisma as any).$rls as RLSManager;

    if (!rlsManager) {
      throw new Error('RLS manager not initialized. Call extendPrismaWithRLS first.');
    }

    return rlsManager.withAdminAccess(() => fn(...args));
  }) as T;
}

// ============================================================================
// AUDIT LOGGING INTEGRATION
// ============================================================================

export class AuditLogger {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Log an action to the audit log
   */
  async log(
    tenantId: string,
    action: string,
    tableName: string,
    recordId?: string,
    options?: {
      oldValues?: Record<string, any>;
      newValues?: Record<string, any>;
      userId?: string;
      ipAddress?: string;
    }
  ): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO audit_log (
        tenant_id,
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        ip_address,
        created_at
      ) VALUES (
        ${tenantId}::uuid,
        ${options?.userId ? options.userId + '::uuid' : null},
        ${action},
        ${tableName},
        ${recordId ? recordId + '::uuid' : null},
        ${options?.oldValues ? JSON.stringify(options.oldValues) : null}::jsonb,
        ${options?.newValues ? JSON.stringify(options.newValues) : null}::jsonb,
        ${options?.ipAddress ? options.ipAddress : null}::inet,
        NOW()
      )
    `;
  }

  /**
   * Create audit trigger for a table
   */
  async createAuditTrigger(tableName: string): Promise<void> {
    await this.prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION audit_${tableName}_trigger()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          INSERT INTO audit_log (tenant_id, action, table_name, record_id, new_values)
          VALUES (
            NEW.tenant_id,
            'CREATE',
            '${tableName}',
            NEW.id,
            to_jsonb(NEW)
          );
          RETURN NEW;
        ELSIF TG_OP = 'UPDATE' THEN
          INSERT INTO audit_log (tenant_id, action, table_name, record_id, old_values, new_values)
          VALUES (
            NEW.tenant_id,
            'UPDATE',
            '${tableName}',
            NEW.id,
            to_jsonb(OLD),
            to_jsonb(NEW)
          );
          RETURN NEW;
        ELSIF TG_OP = 'DELETE' THEN
          INSERT INTO audit_log (tenant_id, action, table_name, record_id, old_values)
          VALUES (
            OLD.tenant_id,
            'DELETE',
            '${tableName}',
            OLD.id,
            to_jsonb(OLD)
          );
          RETURN OLD;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS ${tableName}_audit ON ${tableName};
      
      CREATE TRIGGER ${tableName}_audit
        AFTER INSERT OR UPDATE OR DELETE ON ${tableName}
        FOR EACH ROW
        EXECUTE FUNCTION audit_${tableName}_trigger();
    `);
  }
}

// ============================================================================
// CONNECTION POOLING WITH TENANT ISOLATION
// ============================================================================

export interface PooledConnection {
  tenantId: string;
  acquiredAt: number;
  release: () => Promise<void>;
}

export class TenantConnectionPool {
  private prisma: PrismaClient;
  private maxConnectionsPerTenant: number;
  private activeConnections: Map<string, PooledConnection[]> = new Map();

  constructor(prisma: PrismaClient, maxConnectionsPerTenant: number = 10) {
    this.prisma = prisma;
    this.maxConnectionsPerTenant = maxConnectionsPerTenant;
  }

  /**
   * Acquire a connection for a tenant
   */
  async acquire(tenantId: string): Promise<PooledConnection> {
    const tenantConnections = this.activeConnections.get(tenantId) || [];
    
    if (tenantConnections.length >= this.maxConnectionsPerTenant) {
      throw new Error(`Max connections reached for tenant ${tenantId}`);
    }

    // Set tenant context
    await this.prisma.$executeRaw`SET app.current_tenant = ${tenantId}`;

    const connection: PooledConnection = {
      tenantId,
      acquiredAt: Date.now(),
      release: async () => {
        await this.release(connection);
      },
    };

    tenantConnections.push(connection);
    this.activeConnections.set(tenantId, tenantConnections);

    return connection;
  }

  /**
   * Release a connection
   */
  async release(connection: PooledConnection): Promise<void> {
    // Clear tenant context
    await this.prisma.$executeRaw`SET app.current_tenant = ''`;

    const tenantConnections = this.activeConnections.get(connection.tenantId) || [];
    const index = tenantConnections.indexOf(connection);
    
    if (index > -1) {
      tenantConnections.splice(index, 1);
      this.activeConnections.set(connection.tenantId, tenantConnections);
    }
  }

  /**
   * Get connection stats
   */
  getStats(): { tenantId: string; connections: number }[] {
    return Array.from(this.activeConnections.entries()).map(
      ([tenantId, connections]) => ({
        tenantId,
        connections: connections.length,
      })
    );
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get current tenant context from async storage
 */
export function getCurrentTenantContext(): TenantContext | undefined {
  return tenantContextStorage.getStore();
}

/**
 * Run a function with tenant context
 */
export function runWithTenantContext<T>(
  context: TenantContext,
  fn: () => Promise<T>
): Promise<T> {
  return tenantContextStorage.run(context, fn);
}

/**
 * Middleware for Express/Fastify to set tenant context from request
 */
export function tenantContextMiddleware(
  getTenantId: (req: any) => string | undefined
) {
  return async (req: any, res: any, next: any) => {
    const tenantId = getTenantId(req);
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const context: TenantContext = {
      tenantId,
      userId: req.user?.id,
      requestId: req.id,
    };

    return runWithTenantContext(context, async () => {
      // Set tenant context in database
      const prisma = (global as any).prisma as PrismaClient;
      if (prisma) {
        await prisma.$executeRaw`SET app.current_tenant = ${tenantId}`;
      }
      
      return next();
    });
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  RLSManager,
  AuditLogger,
  TenantConnectionPool,
  extendPrismaWithRLS,
  withTenantScope,
  withAdminScope,
  getCurrentTenantContext,
  runWithTenantContext,
  tenantContextMiddleware,
};
