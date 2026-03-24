import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../common/services/prisma.service';
import { LoggerService } from '../../common/services/logger.service';
import { AccountingProvider, AccountingSyncStatus, AccountingSync, Prisma } from '@prisma/client';
import { AccountingSyncFilterDto } from '../dto/accounting.dto';

// ==================== PROVIDER INTERFACE ====================

export interface AccountingProviderInterface {
  syncInvoice(
    tenantId: string,
    invoiceId: string,
    payload: Record<string, unknown>,
  ): Promise<AccountingProviderResult>;
  syncCustomer(
    tenantId: string,
    customerId: string,
    payload: Record<string, unknown>,
  ): Promise<AccountingProviderResult>;
}

export interface AccountingProviderResult {
  success: boolean;
  externalId?: string;
  response?: Record<string, unknown>;
  error?: string;
}

// ==================== PLACEHOLDER PROVIDERS ====================

class QuickBooksProvider implements AccountingProviderInterface {
  async syncInvoice(
    _tenantId: string,
    _invoiceId: string,
    _payload: Record<string, unknown>,
  ): Promise<AccountingProviderResult> {
    throw new BadRequestException(
      'QuickBooks integration not yet connected. Configure API credentials in tenant settings.',
    );
  }

  async syncCustomer(
    _tenantId: string,
    _customerId: string,
    _payload: Record<string, unknown>,
  ): Promise<AccountingProviderResult> {
    throw new BadRequestException(
      'QuickBooks integration not yet connected. Configure API credentials in tenant settings.',
    );
  }
}

class XeroProvider implements AccountingProviderInterface {
  async syncInvoice(
    _tenantId: string,
    _invoiceId: string,
    _payload: Record<string, unknown>,
  ): Promise<AccountingProviderResult> {
    throw new BadRequestException(
      'Xero integration not yet connected. Configure API credentials in tenant settings.',
    );
  }

  async syncCustomer(
    _tenantId: string,
    _customerId: string,
    _payload: Record<string, unknown>,
  ): Promise<AccountingProviderResult> {
    throw new BadRequestException(
      'Xero integration not yet connected. Configure API credentials in tenant settings.',
    );
  }
}

class FattureInCloudProvider implements AccountingProviderInterface {
  async syncInvoice(
    _tenantId: string,
    _invoiceId: string,
    _payload: Record<string, unknown>,
  ): Promise<AccountingProviderResult> {
    throw new BadRequestException(
      'FattureInCloud integration not yet connected. Configure API credentials in tenant settings.',
    );
  }

  async syncCustomer(
    _tenantId: string,
    _customerId: string,
    _payload: Record<string, unknown>,
  ): Promise<AccountingProviderResult> {
    throw new BadRequestException(
      'FattureInCloud integration not yet connected. Configure API credentials in tenant settings.',
    );
  }
}

// ==================== SERVICE ====================

@Injectable()
export class AccountingService {
  private readonly providers: Map<AccountingProvider, AccountingProviderInterface>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.providers = new Map<AccountingProvider, AccountingProviderInterface>([
      [AccountingProvider.QUICKBOOKS, new QuickBooksProvider()],
      [AccountingProvider.XERO, new XeroProvider()],
      [AccountingProvider.FATTUREINCLOUD, new FattureInCloudProvider()],
    ]);
  }

  /**
   * Queue an invoice sync to an external accounting provider
   */
  async syncInvoice(
    tenantId: string,
    invoiceId: string,
    provider: AccountingProvider,
  ): Promise<AccountingSync> {
    const syncRecord = await this.prisma.accountingSync.create({
      data: {
        tenantId,
        provider,
        entityType: 'INVOICE',
        entityId: invoiceId,
        status: AccountingSyncStatus.PENDING,
        direction: 'OUTBOUND',
        payload: { invoiceId } as Prisma.InputJsonValue,
      },
    });

    this.logger.log(
      `Queued invoice sync: ${syncRecord.id} (invoice=${invoiceId}, provider=${provider})`,
    );

    this.eventEmitter.emit('accounting.sync.queued', {
      tenantId,
      syncId: syncRecord.id,
      entityType: 'INVOICE',
      entityId: invoiceId,
      provider,
    });

    // Attempt sync immediately
    return this.executeSyncRecord(tenantId, syncRecord);
  }

  /**
   * Queue a customer sync to an external accounting provider
   */
  async syncCustomer(
    tenantId: string,
    customerId: string,
    provider: AccountingProvider,
  ): Promise<AccountingSync> {
    const syncRecord = await this.prisma.accountingSync.create({
      data: {
        tenantId,
        provider,
        entityType: 'CUSTOMER',
        entityId: customerId,
        status: AccountingSyncStatus.PENDING,
        direction: 'OUTBOUND',
        payload: { customerId } as Prisma.InputJsonValue,
      },
    });

    this.logger.log(
      `Queued customer sync: ${syncRecord.id} (customer=${customerId}, provider=${provider})`,
    );

    this.eventEmitter.emit('accounting.sync.queued', {
      tenantId,
      syncId: syncRecord.id,
      entityType: 'CUSTOMER',
      entityId: customerId,
      provider,
    });

    return this.executeSyncRecord(tenantId, syncRecord);
  }

  /**
   * List sync records with optional filters
   */
  async findAll(
    tenantId: string,
    filters: AccountingSyncFilterDto,
  ): Promise<{ records: AccountingSync[]; total: number }> {
    const where = {
      tenantId,
      ...(filters.provider && { provider: filters.provider }),
      ...(filters.status && { status: filters.status }),
      ...(filters.entityType && { entityType: filters.entityType }),
    };

    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    const [records, total] = await Promise.all([
      this.prisma.accountingSync.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.accountingSync.count({ where }),
    ]);

    return { records, total };
  }

  /**
   * Get a single sync record by ID
   */
  async findById(tenantId: string, id: string): Promise<AccountingSync> {
    const record = await this.prisma.accountingSync.findFirst({
      where: { id, tenantId },
    });

    if (!record) {
      throw new NotFoundException(`Accounting sync record ${id} not found`);
    }

    return record;
  }

  /**
   * Retry a failed sync record
   */
  async retry(tenantId: string, id: string): Promise<AccountingSync> {
    const record = await this.findById(tenantId, id);

    if (record.status !== AccountingSyncStatus.FAILED) {
      throw new BadRequestException(
        `Cannot retry sync record with status ${record.status}. Only FAILED records can be retried.`,
      );
    }

    const updated = await this.prisma.accountingSync.update({
      where: { id },
      data: {
        status: AccountingSyncStatus.PENDING,
        retryCount: { increment: 1 },
        lastRetryAt: new Date(),
        error: null,
      },
    });

    this.logger.log(`Retrying sync record: ${id} (attempt=${updated.retryCount})`);

    this.eventEmitter.emit('accounting.sync.retried', {
      tenantId,
      syncId: id,
      retryCount: updated.retryCount,
    });

    return this.executeSyncRecord(tenantId, updated);
  }

  /**
   * Get sync status for a specific entity
   */
  async getStatus(
    tenantId: string,
    entityType: string,
    entityId: string,
  ): Promise<AccountingSync[]> {
    // Internal: bounded query — sync records scoped to single entity
    return this.prisma.accountingSync.findMany({
      where: {
        tenantId,
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Execute a sync record against the appropriate provider
   */
  private async executeSyncRecord(
    tenantId: string,
    syncRecord: AccountingSync,
  ): Promise<AccountingSync> {
    const providerImpl = this.providers.get(syncRecord.provider);

    if (!providerImpl) {
      return this.prisma.accountingSync.update({
        where: { id: syncRecord.id },
        data: {
          status: AccountingSyncStatus.FAILED,
          error: `Unknown provider: ${syncRecord.provider}`,
        },
      });
    }

    // Mark as syncing
    await this.prisma.accountingSync.update({
      where: { id: syncRecord.id },
      data: { status: AccountingSyncStatus.SYNCING },
    });

    try {
      const payload = (syncRecord.payload as Record<string, unknown>) ?? {};
      let result: AccountingProviderResult;

      if (syncRecord.entityType === 'INVOICE') {
        result = await providerImpl.syncInvoice(tenantId, syncRecord.entityId, payload);
      } else if (syncRecord.entityType === 'CUSTOMER') {
        result = await providerImpl.syncCustomer(tenantId, syncRecord.entityId, payload);
      } else {
        result = {
          success: false,
          error: `Unsupported entity type: ${syncRecord.entityType}`,
        };
      }

      const updated = await this.prisma.accountingSync.update({
        where: { id: syncRecord.id },
        data: {
          status: result.success ? AccountingSyncStatus.SYNCED : AccountingSyncStatus.FAILED,
          externalId: result.externalId ?? syncRecord.externalId,
          syncedAt: result.success ? new Date() : undefined,
          error: result.error ?? null,
          response: (result.response as Prisma.InputJsonValue) ?? undefined,
        },
      });

      if (result.success) {
        this.eventEmitter.emit('accounting.sync.completed', {
          tenantId,
          syncId: syncRecord.id,
          externalId: result.externalId,
        });
      }

      return updated;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during sync';

      const updated = await this.prisma.accountingSync.update({
        where: { id: syncRecord.id },
        data: {
          status: AccountingSyncStatus.FAILED,
          error: errorMessage,
        },
      });

      this.eventEmitter.emit('accounting.sync.failed', {
        tenantId,
        syncId: syncRecord.id,
        error: errorMessage,
      });

      return updated;
    }
  }
}
