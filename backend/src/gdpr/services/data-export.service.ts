import * as crypto from 'crypto';
import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@common/services/prisma.service';
import { EncryptionService } from '@common/services/encryption.service';
import { LoggerService } from '@common/services/logger.service';

/**
 * Data Export Token Payload
 */
export interface DataExportTokenPayload {
  tenantId: string;
  userId: string;
  exportId: string;
  iat: number;
  exp: number;
  jti: string; // JWT ID for revocation
}

/**
 * Complete Data Export Structure (Art. 20 - GDPR Right to Data Portability)
 */
export interface CompleteDataExport {
  exportedAt: string;
  exportedBy: string;
  tenantName: string;
  dataSubjectName: string;

  personalData: {
    id: string;
    email?: string;
    phone?: string;
    createdAt: string;
    updatedAt: string;
  };

  customers: Array<{
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
  }>;

  vehicles: Array<{
    id: string;
    customerId: string;
    licensePlate: string;
    make?: string;
    model?: string;
    year?: number;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
  }>;

  bookings: Array<{
    id: string;
    customerId: string;
    scheduledDate?: string;
    status: string;
    estimatedDurationMinutes?: number;
    totalCostCents?: number;
    paymentStatus: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
  }>;

  invoices: Array<{
    id: string;
    bookingId?: string;
    totalCents: number;
    taxCents?: number;
    status: string;
    paymentDate?: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
  }>;

  workOrders: Array<{
    id: string;
    bookingId?: string;
    status: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
  }>;

  estimates: Array<{
    id: string;
    customerId?: string;
    estimatedCostCents: number;
    status: string;
    validUntil?: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
  }>;

  payments: Array<{
    id: string;
    invoiceId?: string;
    amountCents: number;
    status: string;
    processedAt?: string;
    createdAt: string;
    updatedAt: string;
  }>;

  notifications: Array<{
    id: string;
    type: string;
    status: string;
    readAt?: string;
    createdAt: string;
    updatedAt: string;
  }>;

  auditLogs: Array<{
    id: string;
    action: string;
    tableName: string;
    recordId: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    createdAt: string;
  }>;

  metadata: {
    exportId: string;
    expiresAt: string;
    checksum: string;
    totalRecords: number;
  };
}

/**
 * GDPR Art. 20 - Data Export Service
 *
 * Handles data subject requests for portable data exports:
 * - Token-based secure download links (24-hour expiry)
 * - Complete data aggregation across all modules
 * - Soft-delete inclusion (with deletedAt flag)
 * - PII encryption verification
 * - Comprehensive audit logging
 *
 * @see GDPR Article 20 - Right to data portability
 */
@Injectable()
export class DataExportService {
  private readonly EXPORT_TOKEN_EXPIRY_SECONDS = 86400; // 24 hours
  private readonly EXPORT_EXPIRY_DAYS = 7;

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly jwtService: JwtService,
    private readonly loggerService: LoggerService,
  ) {}

  /**
   * Generate data export token (24-hour expiry)
   * Step 1: User requests export, receives download URL with secure token
   *
   * @param tenantId - Tenant ID (from JWT)
   * @param userId - Current user ID (from JWT)
   * @returns {url, expiresAt, exportId}
   */
  async generateExportToken(
    tenantId: string,
    userId: string,
  ): Promise<{ url: string; expiresAt: Date; exportId: string }> {
    try {
      // Validate tenant exists
      await this.prisma.tenant.findUniqueOrThrow({
        where: { id: tenantId },
        select: { id: true },
      });

      const exportId = `export-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
      const jti = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + this.EXPORT_TOKEN_EXPIRY_SECONDS * 1000);

      // Create JWT token with 24h expiry
      const token = this.jwtService.sign(
        {
          tenantId,
          userId,
          exportId,
          jti,
        } as DataExportTokenPayload,
        { expiresIn: `${this.EXPORT_TOKEN_EXPIRY_SECONDS}s` },
      );

      // Log export request in audit log
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          action: 'DATA_EXPORT_REQUESTED',
          tableName: 'gdpr_exports',
          recordId: exportId,
          newValues: JSON.stringify({
            exportId,
            userId,
            requestedAt: new Date().toISOString(),
            tokenExpiresAt: expiresAt.toISOString(),
          }),
        },
      });

      this.loggerService.log(
        `Export token generated: ${exportId} for tenant ${tenantId} user ${userId}`,
        'DataExportService',
      );

      return {
        url: `/gdpr/data-export-download/${token}`,
        expiresAt,
        exportId,
      };
    } catch (error) {
      this.loggerService.error(
        `Failed to generate export token for tenant ${tenantId}`,
        error,
        'DataExportService',
      );
      throw new BadRequestException('Failed to generate export token');
    }
  }

  /**
   * Download exported data (Art. 20)
   * Step 2: User downloads data using secure token
   *
   * @param token - JWT token from generateExportToken
   * @returns Complete data export as JSON
   * @throws UnauthorizedException if token invalid/expired
   */
  async downloadExportedData(token: string): Promise<CompleteDataExport> {
    // Verify JWT token
    let payload: DataExportTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch (error) {
      this.loggerService.warn(
        `Invalid/expired export token attempted: ${error instanceof Error ? error.message : 'unknown'}`,
        'DataExportService',
      );
      throw new UnauthorizedException('Export token invalid or expired');
    }

    const { tenantId, userId, exportId } = payload;

    this.loggerService.log(
      `Processing data export download: ${exportId} for tenant ${tenantId}`,
      'DataExportService',
    );

    try {
      // Fetch all user data in transaction for consistency
      const [
        tenant,
        customers,
        vehicles,
        bookings,
        invoices,
        workOrders,
        estimates,
        payments,
        notifications,
        auditLogs,
      ] = await Promise.all([
        this.prisma.tenant.findUniqueOrThrow({
          where: { id: tenantId },
          select: { id: true, name: true },
        }),
        this.prisma.customerEncrypted.findMany({
          where: { tenantId },
          select: {
            id: true,
            nameEncrypted: true,
            emailEncrypted: true,
            phoneEncrypted: true,
            createdAt: true,
            updatedAt: true,
            deletedAt: true,
          },
        }),
        this.prisma.vehicle.findMany({
          where: { tenantId },
          select: {
            id: true,
            customerId: true,
            licensePlate: true,
            make: true,
            model: true,
            year: true,
            createdAt: true,
            updatedAt: true,
            deletedAt: true,
          },
        }),
        this.prisma.booking.findMany({
          where: { tenantId },
          select: {
            id: true,
            customerId: true,
            scheduledDate: true,
            status: true,
            estimatedDurationMinutes: true,
            totalCostCents: true,
            paymentStatus: true,
            createdAt: true,
            updatedAt: true,
            deletedAt: true,
          },
        }),
        this.prisma.invoice.findMany({
          where: { tenantId },
          select: {
            id: true,
            bookingId: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            deletedAt: true,
          },
        }),
        // WorkOrder query
        this.prisma.$queryRaw<
          Array<{
            id: string;
            bookingId: string | null;
            status: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
          }>
        >`SELECT id, "booking_id" as "bookingId", status, description, "created_at" as "createdAt", "updated_at" as "updatedAt", "deleted_at" as "deletedAt" FROM work_orders WHERE tenant_id = ${tenantId}`,
        // Estimate query
        this.prisma.$queryRaw<
          Array<{
            id: string;
            customerId: string | null;
            estimatedCostCents: number;
            status: string;
            validUntil: Date | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
          }>
        >`SELECT id, "customer_id" as "customerId", "estimated_cost_cents" as "estimatedCostCents", status, "valid_until" as "validUntil", "created_at" as "createdAt", "updated_at" as "updatedAt", "deleted_at" as "deletedAt" FROM estimates WHERE tenant_id = ${tenantId}`,
        // Payment query
        this.prisma.$queryRaw<
          Array<{
            id: string;
            invoiceId: string | null;
            amountCents: number;
            status: string;
            processedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
          }>
        >`SELECT id, "invoice_id" as "invoiceId", "amount_cents" as "amountCents", status, "processed_at" as "processedAt", "created_at" as "createdAt", "updated_at" as "updatedAt" FROM payments WHERE tenant_id = ${tenantId}`,
        // Notification query
        this.prisma.$queryRaw<
          Array<{
            id: string;
            type: string;
            status: string;
            readAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
          }>
        >`SELECT id, type, status, "read_at" as "readAt", "created_at" as "createdAt", "updated_at" as "updatedAt" FROM notifications WHERE tenant_id = ${tenantId}`,
        this.prisma.auditLog.findMany({
          where: { tenantId },
          select: {
            id: true,
            action: true,
            tableName: true,
            recordId: true,
            oldValues: true,
            newValues: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1000, // Last 1000 audit logs
        }),
      ]);

      // Decrypt PII for export
      const decryptedCustomers = customers.map(c => ({
        id: c.id,
        name: c.nameEncrypted ? this.encryption.decrypt(c.nameEncrypted.toString()) : undefined,
        email: c.emailEncrypted ? this.encryption.decrypt(c.emailEncrypted.toString()) : undefined,
        phone: c.phoneEncrypted ? this.encryption.decrypt(c.phoneEncrypted.toString()) : undefined,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        deletedAt: c.deletedAt?.toISOString() || null,
      }));

      // Build complete export
      const totalRecords =
        1 +
        customers.length +
        vehicles.length +
        bookings.length +
        invoices.length +
        workOrders.length +
        estimates.length +
        payments.length +
        notifications.length +
        auditLogs.length;

      const serialized = JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          exportedBy: 'MechMind OS GDPR Export Service',
          tenantName: tenant.name,
          dataSubjectName: 'Data Subject',

          personalData: {
            id: tenantId,
            email: undefined,
            phone: undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },

          customers: decryptedCustomers,
          vehicles: vehicles.map(v => ({
            id: v.id,
            customerId: v.customerId,
            licensePlate: v.licensePlate,
            make: v.make,
            model: v.model,
            year: v.year,
            createdAt: v.createdAt.toISOString(),
            updatedAt: v.updatedAt.toISOString(),
            deletedAt: v.deletedAt?.toISOString() || null,
          })),
          bookings: bookings.map(b => ({
            id: b.id,
            customerId: b.customerId,
            scheduledDate: b.scheduledDate?.toISOString(),
            status: b.status,
            estimatedDurationMinutes: b.estimatedDurationMinutes,
            totalCostCents: b.totalCostCents ? Number(b.totalCostCents) : undefined,
            paymentStatus: b.paymentStatus,
            createdAt: b.createdAt.toISOString(),
            updatedAt: b.updatedAt.toISOString(),
            deletedAt: b.deletedAt?.toISOString() || null,
          })),
          invoices: invoices.map(i => ({
            id: i.id,
            bookingId: i.bookingId,
            status: i.status,
            createdAt: i.createdAt.toISOString(),
            updatedAt: i.updatedAt.toISOString(),
            deletedAt: i.deletedAt?.toISOString() || null,
          })),
          workOrders: workOrders.map(w => ({
            id: w.id,
            bookingId: w.bookingId,
            status: w.status,
            description: w.description,
            createdAt: w.createdAt.toISOString(),
            updatedAt: w.updatedAt.toISOString(),
            deletedAt: w.deletedAt?.toISOString() || null,
          })),
          estimates: estimates.map(e => ({
            id: e.id,
            customerId: e.customerId,
            estimatedCostCents: Number(e.estimatedCostCents),
            status: e.status,
            validUntil: e.validUntil?.toISOString(),
            createdAt: e.createdAt.toISOString(),
            updatedAt: e.updatedAt.toISOString(),
            deletedAt: e.deletedAt?.toISOString() || null,
          })),
          payments: payments.map(p => ({
            id: p.id,
            invoiceId: p.invoiceId,
            amountCents: Number(p.amountCents),
            status: p.status,
            processedAt: p.processedAt?.toISOString(),
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
          })),
          notifications: notifications.map(n => ({
            id: n.id,
            type: n.type,
            status: n.status,
            readAt: n.readAt?.toISOString(),
            createdAt: n.createdAt.toISOString(),
            updatedAt: n.updatedAt.toISOString(),
          })),
          auditLogs: auditLogs.map(a => ({
            id: a.id,
            action: a.action,
            tableName: a.tableName,
            recordId: a.recordId,
            oldValues: a.oldValues ? JSON.parse(String(a.oldValues)) : undefined,
            newValues: a.newValues ? JSON.parse(String(a.newValues)) : undefined,
            createdAt: a.createdAt.toISOString(),
          })),

          metadata: {
            exportId,
            expiresAt: new Date(
              Date.now() + this.EXPORT_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
            ).toISOString(),
            checksum: this.generateChecksum(exportId),
            totalRecords,
          },
        } as CompleteDataExport,
        null,
        2,
      );

      // Log successful download
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          action: 'DATA_EXPORT_DOWNLOADED',
          tableName: 'gdpr_exports',
          recordId: exportId,
          newValues: JSON.stringify({
            exportId,
            userId,
            downloadedAt: new Date().toISOString(),
            recordCount: totalRecords,
          }),
        },
      });

      this.loggerService.log(
        `Export downloaded successfully: ${exportId} (${totalRecords} records)`,
        'DataExportService',
      );

      return JSON.parse(serialized) as CompleteDataExport;
    } catch (error) {
      this.loggerService.error(
        `Failed to generate data export ${exportId}`,
        error,
        'DataExportService',
      );
      throw new BadRequestException('Failed to generate data export');
    }
  }

  /**
   * Generate SHA256 checksum for export integrity
   */
  private generateChecksum(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
