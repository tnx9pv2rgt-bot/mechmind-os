import { Injectable } from '@nestjs/common';
import { AuditLog } from '@prisma/client';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';

/**
 * Audit log entry data
 */
export interface AuditLogEntry {
  id: string;
  tenantId: string;
  action: string;
  tableName: string;
  recordId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  performedBy?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

/**
 * Query filters for audit log retrieval
 */
export interface AuditLogQuery {
  tenantId?: string;
  action?: string;
  tableName?: string;
  recordId?: string;
  startDate?: Date;
  endDate?: Date;
  performedBy?: string;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  limit: number;
}

/**
 * Paginated audit log result
 */
export interface PaginatedAuditLogResult {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Audit log statistics
 */
export interface AuditLogStats {
  totalEntries: number;
  entriesByAction: Record<string, number>;
  entriesByTable: Record<string, number>;
  recentActivity: AuditLogEntry[];
}

/**
 * GDPR Audit Log Service
 *
 * Manages audit trail for GDPR compliance operations.
 * Provides methods for recording, querying, and preserving audit logs.
 *
 * @see GDPR Article 30 - Records of processing activities
 */
@Injectable()
export class AuditLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loggerService: LoggerService,
  ) {}

  /**
   * Create a new audit log entry
   *
   * @param data - Audit log entry data
   * @returns Created audit log entry
   */
  async createEntry(data: {
    tenantId: string;
    action: string;
    tableName: string;
    recordId: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    performedBy?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLogEntry> {
    const entry = await this.prisma.withTenant(data.tenantId, async prisma => {
      return prisma.auditLog.create({
        data: {
          tenantId: data.tenantId,
          action: data.action,
          tableName: data.tableName,
          recordId: data.recordId,
          oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
          newValues: data.newValues ? JSON.stringify(data.newValues) : null,
          performedBy: data.performedBy,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          createdAt: new Date(),
        },
      });
    });

    this.loggerService.log(
      `Audit log created: ${data.action} on ${data.tableName}:${data.recordId}`,
      'AuditLogService',
    );

    return this.mapToEntry(entry);
  }

  /**
   * Get audit log entries with filtering and pagination
   *
   * @param query - Query filters
   * @param pagination - Pagination options
   * @returns Paginated audit log entries
   */
  async getEntries(
    query: AuditLogQuery,
    pagination: PaginationOptions = { page: 1, limit: 50 },
  ): Promise<PaginatedAuditLogResult> {
    const where: Record<string, unknown> = {};

    if (query.tenantId) {
      where.tenantId = query.tenantId;
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.tableName) {
      where.tableName = query.tableName;
    }

    if (query.recordId) {
      where.recordId = query.recordId;
    }

    if (query.performedBy) {
      where.performedBy = query.performedBy;
    }

    if (query.startDate || query.endDate) {
      const createdAt: Record<string, Date> = {};
      if (query.startDate) {
        createdAt.gte = query.startDate;
      }
      if (query.endDate) {
        createdAt.lte = query.endDate;
      }
      where.createdAt = createdAt;
    }

    const skip = (pagination.page - 1) * pagination.limit;

    const [entries, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pagination.limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      entries: entries.map((e: AuditLog) => this.mapToEntry(e)),
      total,
      page: pagination.page,
      totalPages,
    };
  }

  /**
   * Get audit trail for a specific record
   *
   * @param tableName - Table name
   * @param recordId - Record UUID
   * @param tenantId - Tenant ID
   * @returns Audit trail entries
   */
  async getRecordTrail(
    tableName: string,
    recordId: string,
    tenantId: string,
  ): Promise<AuditLogEntry[]> {
    const entries = await this.prisma.withTenant(tenantId, async prisma => {
      return prisma.auditLog.findMany({
        where: {
          tableName,
          recordId,
          tenantId,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    return entries.map((e: AuditLog) => this.mapToEntry(e));
  }

  /**
   * Get audit entries for GDPR-related actions
   * Preserved after customer deletion for compliance
   *
   * @param customerId - Customer UUID
   * @param tenantId - Tenant ID
   * @returns GDPR audit entries
   */
  async getGdprAuditTrail(customerId: string, tenantId: string): Promise<AuditLogEntry[]> {
    const gdprActions = [
      'CUSTOMER_ANONYMIZED',
      'IDENTITY_VERIFICATION',
      'DELETION_SNAPSHOT_CREATED',
      'CALL_RECORDINGS_DELETED',
      'DATA_EXPORTED',
      'DSR_CREATED',
      'CONSENT_RECORDED',
      'CONSENT_REVOKED',
    ];

    const entries = await this.prisma.withTenant(tenantId, async prisma => {
      return prisma.auditLog.findMany({
        where: {
          tenantId,
          action: { in: gdprActions },
          OR: [
            { recordId: customerId },
            // Note: JSON path queries are database-specific, using simple approach
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    return entries.map((e: AuditLog) => this.mapToEntry(e));
  }

  /**
   * Get audit log statistics
   *
   * @param tenantId - Optional tenant filter
   * @returns Audit statistics
   */
  async getStats(tenantId?: string): Promise<AuditLogStats> {
    const where: Record<string, unknown> = {};
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const [total, byAction, byTable, recentActivity] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { action: true },
      }),
      this.prisma.auditLog.groupBy({
        by: ['tableName'],
        where,
        _count: { tableName: true },
      }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const entriesByAction: Record<string, number> = {};
    for (const item of byAction) {
      entriesByAction[item.action] = item._count.action;
    }

    const entriesByTable: Record<string, number> = {};
    for (const item of byTable) {
      entriesByTable[item.tableName] = item._count.tableName;
    }

    return {
      totalEntries: total,
      entriesByAction,
      entriesByTable,
      recentActivity: recentActivity.map((e: AuditLog) => this.mapToEntry(e)),
    };
  }

  /**
   * Preserve audit logs during customer deletion
   * Creates a summary entry that survives anonymization
   *
   * @param customerId - Customer being deleted
   * @param tenantId - Tenant ID
   * @param requestId - Data subject request ID
   */
  async preserveAuditTrail(customerId: string, tenantId: string, requestId: string): Promise<void> {
    // Get count of audit entries for this customer
    const count = await this.prisma.withTenant(tenantId, async prisma => {
      return prisma.auditLog.count({
        where: {
          tenantId,
          recordId: customerId,
        },
      });
    });

    // Create preservation record
    await this.prisma.withTenant(tenantId, async prisma => {
      await prisma.auditLog.create({
        data: {
          tenantId,
          action: 'AUDIT_TRAIL_PRESERVED',
          tableName: 'audit_log',
          recordId: customerId,
          newValues: {
            preservedEntries: count,
            dataSubjectRequestId: requestId,
            retentionDays: 2555, // 7 years legal retention
            anonymizedAtValue: new Date().toISOString(),
          } as unknown as string,
          createdAt: new Date(),
        },
      });
    });

    this.loggerService.log(
      `Audit trail preserved for customer ${customerId}: ${count} entries`,
      'AuditLogService',
    );
  }

  /**
   * Archive old audit logs
   * Moves entries older than retention period to archive
   *
   * @param retentionDays - Days to keep before archiving
   * @param tenantId - Optional tenant filter
   * @returns Archive result
   */
  async archiveOldEntries(
    retentionDays: number,
    tenantId?: string,
  ): Promise<{
    archivedCount: number;
    archivedUpTo: Date;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const where: Record<string, unknown> = {
      createdAt: {
        lt: cutoffDate,
      },
    };

    if (tenantId) {
      where.tenantId = tenantId;
    }

    // Get count of entries to archive
    const count = await this.prisma.auditLog.count({ where });

    // In production, this would move to cold storage (S3 Glacier, etc.)
    // For now, we just mark them as archived
    await this.prisma.auditLog.updateMany({
      where,
      data: {
        archived: true,
        archivedAt: new Date(),
      },
    });

    this.loggerService.log(
      `Archived ${count} audit log entries older than ${retentionDays} days`,
      'AuditLogService',
    );

    return {
      archivedCount: count,
      archivedUpTo: cutoffDate,
    };
  }

  /**
   * Export audit logs for compliance reporting
   *
   * @param query - Query filters
   * @returns Export data
   */
  async exportForCompliance(query: AuditLogQuery): Promise<{
    entries: AuditLogEntry[];
    generatedAt: Date;
    retentionPeriod: string;
  }> {
    const result = await this.getEntries(query, { page: 1, limit: 10000 });

    return {
      entries: result.entries,
      generatedAt: new Date(),
      retentionPeriod: '7 years',
    };
  }

  /**
   * Map database record to AuditLogEntry interface
   */
  private mapToEntry(record: AuditLog): AuditLogEntry {
    return {
      id: record.id,
      tenantId: record.tenantId,
      action: record.action,
      tableName: record.tableName,
      recordId: record.recordId,
      oldValues: record.oldValues ? JSON.parse(record.oldValues) : undefined,
      newValues: record.newValues ? JSON.parse(record.newValues) : undefined,
      performedBy: record.performedBy || undefined,
      ipAddress: record.ipAddress || undefined,
      userAgent: record.userAgent || undefined,
      createdAt: record.createdAt,
    };
  }
}
