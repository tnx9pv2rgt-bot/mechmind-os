import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

export interface TenantContext {
  tenantId: string;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private currentTenantContext: TenantContext | null = null;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL || '';
    const isProduction = process.env.NODE_ENV === 'production';
    const defaultPoolSize = isProduction ? 2 : 10;
    const connectionLimit =
      parseInt(process.env.DATABASE_CONNECTION_LIMIT || '', 10) || defaultPoolSize;

    const separator = databaseUrl.includes('?') ? '&' : '?';
    const poolTimeout = isProduction ? 20 : 30;
    const connectTimeout = isProduction ? 20 : 30;
    const urlWithPooling = databaseUrl.includes('connection_limit')
      ? databaseUrl
      : `${databaseUrl}${separator}connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}&connect_timeout=${connectTimeout}`;

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
      log: isProduction
        ? [{ emit: 'event', level: 'error' }]
        : [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'info' },
            { emit: 'event', level: 'warn' },
          ],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connected to database');

    if (process.env.NODE_ENV === 'development') {
      this.$on('query' as never, (e: Prisma.QueryEvent) => {
        this.logger.debug(`Query: ${e.query}, Duration: ${e.duration}ms`);
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Prisma disconnected from database');
  }

  async setTenantContext(tenantId: string): Promise<void> {
    this.currentTenantContext = { tenantId };
    await this.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, true)`;
  }

  async clearTenantContext(): Promise<void> {
    this.currentTenantContext = null;
    await this.$executeRaw`SELECT set_config('app.current_tenant', '', true)`;
  }

  getCurrentTenantContext(): TenantContext | null {
    return this.currentTenantContext;
  }

  async withTenant<T>(
    tenantId: string,
    callback: (prisma: PrismaService) => Promise<T>,
  ): Promise<T> {
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
          async tx => {
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

  async acquireAdvisoryLock(tenantId: string, resourceId: string): Promise<boolean> {
    const lockId = this.generateLockId(tenantId, resourceId);

    const result = await this.$queryRaw<{ acquired: boolean }[]>`
      SELECT pg_try_advisory_lock(${lockId}::bigint) as acquired
    `;

    return result?.[0]?.acquired ?? false;
  }

  async releaseAdvisoryLock(tenantId: string, resourceId: string): Promise<void> {
    const lockId = this.generateLockId(tenantId, resourceId);

    await this.$queryRaw`SELECT pg_advisory_unlock(${lockId}::bigint)`;
  }

  private generateLockId(tenantId: string, resourceId: string): string {
    const tenantHash = this.hashUUID(tenantId);
    const resourceHash = this.hashUUID(resourceId);

    const lockId =
      BigInt.asUintN(64, BigInt(tenantHash) << BigInt(32)) |
      BigInt.asUintN(64, BigInt(resourceHash));

    return lockId.toString();
  }

  private hashUUID(uuid: string): number {
    const clean = uuid.replace(/-/g, '').substring(0, 8);
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      const char = clean.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & 0xffffffff;
    }
    return Math.abs(hash);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
