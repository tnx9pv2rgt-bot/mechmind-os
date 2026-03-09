import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, Prisma } from '@prisma/client';
import { LoggerService } from './logger.service';

export interface TenantContext {
  tenantId: string;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private currentTenantContext: TenantContext | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    const databaseUrl = configService.get<string>('DATABASE_URL') || '';
    const connectionLimit = configService.get<number>('DATABASE_CONNECTION_LIMIT', 10);

    // Append connection_limit if not already in the URL
    const separator = databaseUrl.includes('?') ? '&' : '?';
    const urlWithPooling = databaseUrl.includes('connection_limit')
      ? databaseUrl
      : `${databaseUrl}${separator}connection_limit=${connectionLimit}`;

    super({
      datasources: {
        db: {
          url: urlWithPooling,
        },
      },
      transactionOptions: {
        maxWait: 5000,
        timeout: 15000,
      },
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected to database');

    // Setup query logging in development
    if (this.configService.get<string>('NODE_ENV') === 'development') {
      this.$on('query' as never, (e: Prisma.QueryEvent) => {
        this.logger.debug(`Query: ${e.query}, Duration: ${e.duration}ms`);
      });
    }

    // Setup RLS for multi-tenancy
    await this.setupRLS();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected from database');
  }

  /**
   * Setup Row Level Security context for PostgreSQL
   * This sets the app.current_tenant variable for RLS policies
   */
  async setTenantContext(tenantId: string): Promise<void> {
    this.currentTenantContext = { tenantId };
    await this.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, true)`;
  }

  /**
   * Clear tenant context
   */
  async clearTenantContext(): Promise<void> {
    this.currentTenantContext = null;
    await this.$executeRaw`SELECT set_config('app.current_tenant', '', true)`;
  }

  /**
   * Get current tenant context
   */
  getCurrentTenantContext(): TenantContext | null {
    return this.currentTenantContext;
  }

  /**
   * Execute a query within a specific tenant context
   */
  async withTenant<T>(tenantId: string, callback: (prisma: PrismaService) => Promise<T>): Promise<T> {
    const previousContext = this.currentTenantContext;
    try {
      await this.setTenantContext(tenantId);
      return await callback(this);
    } finally {
      if (previousContext) {
        await this.setTenantContext(previousContext.tenantId);
      } else {
        await this.clearTenantContext();
      }
    }
  }

  /**
   * Execute with SERIALIZABLE isolation level for race condition prevention
   */
  async withSerializableTransaction<T>(
    callback: (prisma: PrismaService) => Promise<T>,
    options?: { maxRetries?: number; retryDelay?: number },
  ): Promise<T> {
    const maxRetries = options?.maxRetries ?? 3;
    const retryDelay = options?.retryDelay ?? 100;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.$transaction(
          async (tx) => {
            // Cast to PrismaService for compatibility
            return await callback(tx as unknown as PrismaService);
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            maxWait: 5000,
            timeout: 10000,
          },
        );
      } catch (error) {
        lastError = error as Error;
        
        // Check if it's a serialization failure
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2034') {
            this.logger.warn(`Transaction serialization failure, attempt ${attempt}/${maxRetries}`);
            if (attempt < maxRetries) {
              await this.delay(retryDelay * attempt);
              continue;
            }
          }
        }
        
        throw error;
      }
    }

    throw lastError || new Error('Transaction failed after max retries');
  }

  /**
   * Acquire PostgreSQL advisory lock
   * Returns true if lock was acquired, false otherwise
   */
  async acquireAdvisoryLock(tenantId: string, resourceId: string): Promise<boolean> {
    // Create a unique lock ID from tenantId and resourceId
    const lockId = this.generateLockId(tenantId, resourceId);
    
    const result = await this.$queryRaw<{ acquired: boolean }[]>`
      SELECT pg_try_advisory_lock(${lockId}::bigint) as acquired
    `;
    
    return result?.[0]?.acquired ?? false;
  }

  /**
   * Release PostgreSQL advisory lock
   */
  async releaseAdvisoryLock(tenantId: string, resourceId: string): Promise<void> {
    const lockId = this.generateLockId(tenantId, resourceId);
    
    await this.$queryRaw`SELECT pg_advisory_unlock(${lockId}::bigint)`;
  }

  /**
   * Generate a unique lock ID from tenant and resource
   * Uses bit-shifting to prevent collisions: lock_id = (tenant_id << 32) | slot_id
   * This ensures no accidental collisions between tenants and makes debugging easier
   */
  private generateLockId(tenantId: string, resourceId: string): string {
    // Convert UUID strings to numeric hashes
    const tenantHash = this.hashUUID(tenantId);
    const resourceHash = this.hashUUID(resourceId);
    
    // Combine using bit-shifting: (tenant << 32) | resource
    // This creates a unique 64-bit identifier
    const lockId = (BigInt.asUintN(64, BigInt(tenantHash) << BigInt(32)) | 
                    BigInt.asUintN(64, BigInt(resourceHash)));
    
    return lockId.toString();
  }

  /**
   * Hash UUID to 32-bit integer
   */
  private hashUUID(uuid: string): number {
    // Remove hyphens and take first 8 chars for hashing
    const clean = uuid.replace(/-/g, '').substring(0, 8);
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      const char = clean.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & 0xFFFFFFFF; // Keep 32-bit
    }
    return Math.abs(hash);
  }

  /**
   * Setup RLS policies (run migrations)
   */
  private async setupRLS(): Promise<void> {
    // Enable RLS on tenant-scoped tables
    const tables = ['users', 'customers', 'vehicles', 'bookings', 'booking_slots', 'services'];
    
    for (const table of tables) {
      try {
        await this.$executeRawUnsafe(`
          ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
        `);
        
        // Create policy if not exists
        await this.$executeRawUnsafe(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_policies 
              WHERE tablename = '${table}' AND policyname = '${table}_tenant_isolation'
            ) THEN
              CREATE POLICY ${table}_tenant_isolation ON ${table}
                USING (tenant_id = current_setting('app.current_tenant', true)::text);
            END IF;
          END
          $$;
        `);
      } catch (error) {
        this.logger.warn(`RLS setup for ${table}: ${error.message}`);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
