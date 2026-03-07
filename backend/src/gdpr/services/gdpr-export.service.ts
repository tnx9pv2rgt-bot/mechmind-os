import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/services/prisma.service';
import { EncryptionService } from '@common/services/encryption.service';
import { LoggerService } from '@common/services/logger.service';

/**
 * Export format options
 */
export type ExportFormat = 'JSON' | 'CSV' | 'PDF';

/**
 * Customer data export structure (Art. 15 - Right of Access)
 */
export interface CustomerDataExport {
  exportId: string;
  exportDate: Date;
  format: ExportFormat;
  customerId: string;
  tenantId: string;
  
  personalData: {
    id: string;
    createdAt: Date;
    gdprConsent: boolean;
    gdprConsentDate?: Date;
    marketingConsent: boolean;
    // Note: PII is decrypted only for the export
    phone?: string;
    email?: string;
    name?: string;
  };
  
  vehicles: Array<{
    id: string;
    licensePlate: string;
    make?: string;
    model?: string;
    year?: number;
    lastServiceDate?: Date;
    nextServiceDueKm?: number;
  }>;
  
  bookings: Array<{
    id: string;
    createdAt: Date;
    scheduledDate?: Date;
    status: string;
    estimatedDurationMinutes: number;
    totalCostCents?: bigint;
    paymentStatus: string;
  }>;
  
  invoices: Array<{
    id: string;
    createdAt: Date;
    totalCents: bigint;
    taxCents?: bigint;
    status: string;
    paymentDate?: Date;
  }>;
  
  consentHistory: Array<{
    type: string;
    granted: boolean;
    timestamp: Date;
    ipSource?: string;
    method?: string;
  }>;
  
  callRecordings: Array<{
    id: string;
    recordedAt: Date;
    durationSeconds: number;
    direction: string;
    // Note: Actual recording files handled separately
  }>;
  
  metadata: {
    totalRecords: number;
    generatedBy: string;
    expiresAt: Date;
    checksum: string;
  };
}

/**
 * Machine-readable data export (Art. 20 - Right to Data Portability)
 */
export interface DataPortabilityExport {
  schemaVersion: string;
  exportDate: string;
  dataController: {
    name: string;
    contact: string;
  };
  customer: {
    id: string;
    personalData: Record<string, any>;
    vehicles: any[];
    bookings: any[];
    services: any[];
  };
}

/**
 * Export job result
 */
export interface ExportJobResult {
  exportId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  format: ExportFormat;
  downloadUrl?: string;
  expiresAt?: Date;
  fileSize?: number;
  checksum?: string;
  error?: string;
}

/**
 * GDPR Export Service
 * 
 * Handles data export requests for GDPR compliance:
 * - Art. 15: Right of Access (complete data export)
 * - Art. 20: Right to Data Portability (machine-readable format)
 * 
 * Provides secure, encrypted exports with audit logging.
 * 
 * @see GDPR Article 15 - Right of access by the data subject
 * @see GDPR Article 20 - Right to data portability
 */
@Injectable()
export class GdprExportService {
  // Export expiry time (7 days)
  private readonly EXPORT_EXPIRY_DAYS = 7;

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly loggerService: LoggerService,
  ) {}

  /**
   * Export customer data for GDPR access request (Art. 15)
   * 
   * @param customerId - Customer UUID
   * @param tenantId - Tenant ID
   * @param format - Export format (JSON, CSV, PDF)
   * @param requestId - Associated data subject request ID
   * @returns Complete customer data export
   * @throws NotFoundException if customer not found
   */
  async exportCustomerData(
    customerId: string,
    tenantId: string,
    format: ExportFormat = 'JSON',
    requestId?: string,
  ): Promise<CustomerDataExport> {
    this.loggerService.log(
      `Starting data export for customer ${customerId} in ${format} format`,
      'GdprExportService',
    );

    // Fetch customer with all related data
    const customer = await this.prisma.withTenant(tenantId, async (prisma) => {
      return prisma.customerEncrypted.findFirst({
        where: { id: customerId, tenantId },
        include: {
          vehicles: true,
          bookings: {
            include: {
              invoices: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    // Fetch consent history
    const consentHistory = await this.prisma.withTenant(tenantId, async (prisma) => {
      return prisma.consentAuditLog.findMany({
        where: { customerId, tenantId },
        orderBy: { timestamp: 'desc' },
      });
    });

    // Fetch call recordings
    const callRecordings = await this.prisma.withTenant(tenantId, async (prisma) => {
      return prisma.callRecordings.findMany({
        where: { customerId, tenantId },
        orderBy: { recordedAt: 'desc' },
      });
    });

    // Decrypt PII for export
    const decryptedPhone = this.encryption.decrypt(customer.phoneEncrypted);
    const decryptedEmail = customer.emailEncrypted 
      ? this.encryption.decrypt(customer.emailEncrypted) 
      : undefined;
    const decryptedName = customer.nameEncrypted 
      ? this.encryption.decrypt(customer.nameEncrypted) 
      : undefined;

    const exportId = `export-${Date.now()}-${customerId.substring(0, 8)}`;
    const exportDate = new Date();
    const expiresAt = new Date(exportDate.getTime() + this.EXPORT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const exportData: CustomerDataExport = {
      exportId,
      exportDate,
      format,
      customerId,
      tenantId,
      
      personalData: {
        id: customer.id,
        createdAt: customer.createdAt,
        gdprConsent: customer.gdprConsent,
        gdprConsentDate: customer.gdprConsentDate || undefined,
        marketingConsent: customer.marketingConsent,
        phone: decryptedPhone,
        email: decryptedEmail,
        name: decryptedName,
      },
      
      vehicles: customer.vehicles.map(v => ({
        id: v.id,
        licensePlate: v.licensePlate,
        make: v.make || undefined,
        model: v.model || undefined,
        year: v.year || undefined,
        lastServiceDate: v.lastServiceDate || undefined,
        nextServiceDueKm: v.nextServiceDueKm || undefined,
      })),
      
      bookings: customer.bookings.map(b => ({
        id: b.id,
        createdAt: b.createdAt,
        scheduledDate: b.scheduledDate || undefined,
        status: b.status,
        estimatedDurationMinutes: b.estimatedDurationMinutes,
        totalCostCents: b.totalCostCents || undefined,
        paymentStatus: b.paymentStatus,
      })),
      
      invoices: customer.bookings.flatMap(b => 
        b.invoices.map(i => ({
          id: i.id,
          createdAt: i.createdAt,
          totalCents: i.totalCents,
          taxCents: i.taxCents || undefined,
          status: i.status,
          paymentDate: i.paymentDate || undefined,
        }))
      ),
      
      consentHistory: consentHistory.map(c => ({
        type: c.consentType,
        granted: c.granted,
        timestamp: c.timestamp,
        ipSource: c.ipSource || undefined,
        method: c.collectionMethod || undefined,
      })),
      
      callRecordings: callRecordings.map(r => ({
        id: r.id,
        recordedAt: r.recordedAt,
        durationSeconds: r.durationSeconds,
        direction: r.direction,
      })),
      
      metadata: {
        totalRecords: 1 + customer.vehicles.length + customer.bookings.length + 
                      consentHistory.length + callRecordings.length,
        generatedBy: 'MechMind OS GDPR Export Service',
        expiresAt,
        checksum: this.generateChecksum(customerId + exportDate.toISOString()),
      },
    };

    // Log the export
    await this.prisma.withTenant(tenantId, async (prisma) => {
      await prisma.auditLog.create({
        data: {
          tenantId,
          action: 'DATA_EXPORT_CREATED',
          tableName: 'customers_encrypted',
          recordId: customerId,
          newValues: {
            exportId,
            format,
            requestId,
            recordCount: exportData.metadata.totalRecords,
          },
          createdAt: exportDate,
        },
      });
    });

    // Update request if provided
    if (requestId) {
      await this.prisma.withTenant(tenantId, async (prisma) => {
        await prisma.dataSubjectRequests.update({
          where: { id: requestId },
          data: {
            exportFormat: format,
            status: 'COMPLETED',
            completedAt: exportDate,
          },
        });
      });
    }

    this.loggerService.log(
      `Data export ${exportId} completed for customer ${customerId}`,
      'GdprExportService',
    );

    return exportData;
  }

  /**
   * Create machine-readable data export for portability (Art. 20)
   * 
   * @param customerId - Customer UUID
   * @param tenantId - Tenant ID
   * @returns Structured data in portable format
   */
  async exportPortableData(
    customerId: string,
    tenantId: string,
  ): Promise<DataPortabilityExport> {
    const customer = await this.prisma.withTenant(tenantId, async (prisma) => {
      return prisma.customerEncrypted.findFirst({
        where: { id: customerId, tenantId },
        include: {
          vehicles: true,
          bookings: true,
        },
      });
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    // Decrypt PII
    const decryptedPhone = this.encryption.decrypt(customer.phoneEncrypted);
    const decryptedEmail = customer.emailEncrypted 
      ? this.encryption.decrypt(customer.emailEncrypted) 
      : undefined;
    const decryptedName = customer.nameEncrypted 
      ? this.encryption.decrypt(customer.nameEncrypted) 
      : undefined;

    return {
      schemaVersion: '1.0',
      exportDate: new Date().toISOString(),
      dataController: {
        name: 'MechMind Technologies S.r.l.',
        contact: 'dpo@mechmind.io',
      },
      customer: {
        id: customer.id,
        personalData: {
          phone: decryptedPhone,
          email: decryptedEmail,
          name: decryptedName,
          gdprConsent: customer.gdprConsent,
          gdprConsentDate: customer.gdprConsentDate,
          marketingConsent: customer.marketingConsent,
          createdAt: customer.createdAt,
        },
        vehicles: customer.vehicles.map(v => ({
          licensePlate: v.licensePlate,
          make: v.make,
          model: v.model,
          year: v.year,
        })),
        bookings: customer.bookings.map(b => ({
          scheduledDate: b.scheduledDate,
          status: b.status,
          estimatedDurationMinutes: b.estimatedDurationMinutes,
          totalCostCents: b.totalCostCents?.toString(),
          paymentStatus: b.paymentStatus,
        })),
        services: [], // Would include service details
      },
    };
  }

  /**
   * Generate export in specified format
   * 
   * @param customerId - Customer UUID
   * @param tenantId - Tenant ID
   * @param format - Export format
   * @returns Export job result with download URL
   */
  async generateExport(
    customerId: string,
    tenantId: string,
    format: ExportFormat,
  ): Promise<ExportJobResult> {
    const exportId = `export-${Date.now()}-${customerId.substring(0, 8)}`;
    const expiresAt = new Date(Date.now() + this.EXPORT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    try {
      // Get export data
      const data = await this.exportCustomerData(customerId, tenantId, format);

      // Serialize based on format
      let serialized: string;
      let contentType: string;

      switch (format) {
        case 'JSON':
          serialized = JSON.stringify(data, null, 2);
          contentType = 'application/json';
          break;
        case 'CSV':
          serialized = this.convertToCSV(data);
          contentType = 'text/csv';
          break;
        case 'PDF':
          // PDF generation would require a PDF library
          throw new Error('PDF export not yet implemented');
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      // Calculate checksum
      const checksum = this.generateChecksum(serialized);

      // In production: Upload to secure S3 bucket
      // const uploadResult = await this.s3Client.upload({...});
      // const downloadUrl = uploadResult.Location;

      // Placeholder URL
      const downloadUrl = `https://api.mechmind.io/v1/gdpr/exports/${exportId}/download`;

      return {
        exportId,
        status: 'COMPLETED',
        format,
        downloadUrl,
        expiresAt,
        fileSize: Buffer.byteLength(serialized, 'utf8'),
        checksum,
      };

    } catch (error) {
      return {
        exportId,
        status: 'FAILED',
        format,
        error: error.message,
      };
    }
  }

  /**
   * Get export status
   * 
   * @param exportId - Export ID
   * @returns Export job status
   */
  async getExportStatus(exportId: string): Promise<ExportJobResult | null> {
    // In production: Query from database or cache
    // Placeholder implementation
    return null;
  }

  /**
   * Convert export data to CSV format
   */
  private convertToCSV(data: CustomerDataExport): string {
    const rows: string[] = [];
    
    // Header
    rows.push('Section,Field,Value');
    
    // Personal data
    rows.push(`Personal,ID,${data.personalData.id}`);
    rows.push(`Personal,Created At,${data.personalData.createdAt}`);
    rows.push(`Personal,Phone,${data.personalData.phone || ''}`);
    rows.push(`Personal,Email,${data.personalData.email || ''}`);
    rows.push(`Personal,Name,${data.personalData.name || ''}`);
    rows.push(`Personal,GDPR Consent,${data.personalData.gdprConsent}`);
    rows.push(`Personal,Marketing Consent,${data.personalData.marketingConsent}`);
    
    // Vehicles
    for (const vehicle of data.vehicles) {
      rows.push(`Vehicle,ID,${vehicle.id}`);
      rows.push(`Vehicle,License Plate,${vehicle.licensePlate}`);
      rows.push(`Vehicle,Make,${vehicle.make || ''}`);
      rows.push(`Vehicle,Model,${vehicle.model || ''}`);
    }
    
    // Bookings
    for (const booking of data.bookings) {
      rows.push(`Booking,ID,${booking.id}`);
      rows.push(`Booking,Status,${booking.status}`);
      rows.push(`Booking,Total Cost,${booking.totalCostCents || ''}`);
    }

    return rows.join('\n');
  }

  /**
   * Generate checksum for export integrity
   */
  private generateChecksum(data: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
