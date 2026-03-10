import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';

/**
 * Consent Audit Log entry from Prisma
 */
interface ConsentAuditLog {
  id: string;
  consentType: string;
  granted: boolean;
  timestamp: Date;
  ipSource?: string | null;
  userAgent?: string | null;
  collectionMethod?: string | null;
  revokedAt?: Date | null;
  customerId: string;
  tenantId: string;
}

/**
 * Consent tracking record
 */
export interface ConsentRecord {
  id: string;
  customerId: string;
  tenantId: string;
  consentType:
    | 'GDPR'
    | 'MARKETING'
    | 'CALL_RECORDING'
    | 'DATA_SHARING'
    | 'THIRD_PARTY'
    | 'ANALYTICS';
  granted: boolean;
  timestamp: Date;
  ipSource?: string;
  userAgent?: string;
  collectionMethod?: string;
  legalBasis?: string;
}

/**
 * Consent audit trail entry
 */
export interface ConsentAuditEntry {
  type: string;
  consent: boolean;
  timestamp: Date;
  ipSource?: string;
  userAgent?: string;
  method?: string;
  revoked?: boolean;
  revokedAt?: Date;
}

/**
 * Customer consent status
 */
export interface CustomerConsentStatus {
  customerId: string;
  gdprConsent: boolean;
  gdprConsentDate?: Date;
  marketingConsent: boolean;
  marketingConsentDate?: Date;
  callRecordingConsent: boolean;
  lastUpdated: Date;
}

/**
 * GDPR Consent Service
 *
 * Manages consent tracking and audit logging for GDPR compliance.
 * Provides methods for recording, updating, and querying consent.
 *
 * @see GDPR Article 7 - Conditions for consent
 */
@Injectable()
export class GdprConsentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loggerService: LoggerService,
  ) {}

  /**
   * Record consent for a customer
   *
   * @param customerId - Customer UUID
   * @param tenantId - Tenant ID
   * @param consentType - Type of consent
   * @param granted - Whether consent is granted or revoked
   * @param context - Contextual information (IP, user agent, etc.)
   * @returns The created consent record
   */
  async recordConsent(
    customerId: string,
    tenantId: string,
    consentType: ConsentRecord['consentType'],
    granted: boolean,
    context?: {
      ipAddress?: string;
      userAgent?: string;
      collectionMethod?: string;
      collectionPoint?: string;
      legalBasis?: string;
      verifiedIdentity?: boolean;
      metadata?: Record<string, any>;
    },
  ): Promise<ConsentRecord> {
    // Verify customer exists
    const customer = await this.prisma.withTenant(tenantId, async prisma => {
      return prisma.customerEncrypted.findFirst({
        where: { id: customerId, tenantId },
      });
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    // Create audit log entry
    const auditLog = await this.prisma.withTenant(tenantId, async prisma => {
      return prisma.consentAuditLog.create({
        data: {
          tenantId,
          customerId,
          consentType,
          granted,
          timestamp: new Date(),
          ipSource: context?.ipAddress ? context.ipAddress : null,
          userAgent: context?.userAgent,
          collectionMethod: context?.collectionMethod,
          collectionPoint: context?.collectionPoint,
          legalBasis: context?.legalBasis,
          verifiedIdentity: context?.verifiedIdentity ?? false,
          metadata: context?.metadata ? JSON.stringify(context.metadata) : undefined,
        },
      });
    });

    // Update customer record with latest consent status
    await this.updateCustomerConsentStatus(customerId, tenantId, consentType, granted);

    this.loggerService.log(
      `Consent recorded: customer=${customerId}, type=${consentType}, granted=${granted}`,
      'GdprConsentService',
    );

    return {
      id: auditLog.id.toString(),
      customerId,
      tenantId,
      consentType,
      granted,
      timestamp: auditLog.timestamp,
      ipSource: context?.ipAddress,
      userAgent: context?.userAgent,
      collectionMethod: context?.collectionMethod,
      legalBasis: context?.legalBasis,
    };
  }

  /**
   * Revoke previously given consent
   *
   * @param customerId - Customer UUID
   * @param tenantId - Tenant ID
   * @param consentType - Type of consent to revoke
   * @param reason - Reason for revocation
   * @param revokedBy - User who performed the revocation
   */
  async revokeConsent(
    customerId: string,
    tenantId: string,
    consentType: ConsentRecord['consentType'],
    reason?: string,
    revokedBy?: string,
  ): Promise<void> {
    // Find the most recent active consent
    const latestConsent = await this.prisma.withTenant(tenantId, async prisma => {
      return prisma.consentAuditLog.findFirst({
        where: {
          customerId,
          tenantId,
          consentType,
          granted: true,
          revokedAt: null,
        },
        orderBy: { timestamp: 'desc' },
      });
    });

    if (!latestConsent) {
      throw new NotFoundException(
        `No active ${consentType} consent found for customer ${customerId}`,
      );
    }

    // Mark as revoked
    await this.prisma.withTenant(tenantId, async prisma => {
      await prisma.consentAuditLog.update({
        where: { id: latestConsent.id },
        data: {
          revokedAt: new Date(),
          revokedBy: revokedBy || null,
          revocationReason: reason,
        },
      });
    });

    // Update customer record
    await this.updateCustomerConsentStatus(customerId, tenantId, consentType, false);

    // Record the revocation as a new event
    await this.recordConsent(customerId, tenantId, consentType, false, {
      collectionMethod: 'REVOKE_API',
      legalBasis: 'WITHDRAWAL',
      metadata: { revocationReason: reason, originalConsentId: latestConsent.id },
    });

    this.loggerService.log(
      `Consent revoked: customer=${customerId}, type=${consentType}, reason=${reason}`,
      'GdprConsentService',
    );
  }

  /**
   * Get consent audit trail for a customer
   *
   * @param customerId - Customer UUID
   * @param tenantId - Tenant ID
   * @returns Array of consent audit entries
   */
  async getConsentAuditTrail(customerId: string, tenantId: string): Promise<ConsentAuditEntry[]> {
    const logs = await this.prisma.withTenant(tenantId, async prisma => {
      return prisma.consentAuditLog.findMany({
        where: {
          customerId,
          tenantId,
        },
        orderBy: { timestamp: 'desc' },
      });
    });

    return logs.map((log: ConsentAuditLog) => ({
      type: log.consentType,
      consent: log.granted,
      timestamp: log.timestamp,
      ipSource: log.ipSource || undefined,
      userAgent: log.userAgent || undefined,
      method: log.collectionMethod || undefined,
      revoked: log.revokedAt !== null,
      revokedAt: log.revokedAt || undefined,
    }));
  }

  /**
   * Get current consent status for a customer
   *
   * @param customerId - Customer UUID
   * @param tenantId - Tenant ID
   * @returns Current consent status
   */
  async getCustomerConsentStatus(
    customerId: string,
    tenantId: string,
  ): Promise<CustomerConsentStatus> {
    const customer = await this.prisma.withTenant(tenantId, async prisma => {
      return prisma.customerEncrypted.findFirst({
        where: { id: customerId, tenantId },
        select: {
          id: true,
          gdprConsent: true,
          gdprConsentDate: true,
          marketingConsent: true,
          marketingConsentDate: true,
          callRecordingConsent: true,
          updatedAt: true,
        },
      });
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    return {
      customerId: customer.id,
      gdprConsent: customer.gdprConsent,
      gdprConsentDate: customer.gdprConsentDate || undefined,
      marketingConsent: customer.marketingConsent,
      marketingConsentDate: customer.marketingConsentDate || undefined,
      callRecordingConsent: customer.callRecordingConsent,
      lastUpdated: customer.updatedAt,
    };
  }

  /**
   * Check if customer has given specific consent
   *
   * @param customerId - Customer UUID
   * @param tenantId - Tenant ID
   * @param consentType - Type of consent to check
   * @returns True if consent is active
   */
  async hasConsent(
    customerId: string,
    tenantId: string,
    consentType: ConsentRecord['consentType'],
  ): Promise<boolean> {
    const customer = await this.prisma.withTenant(tenantId, async prisma => {
      return prisma.customerEncrypted.findFirst({
        where: { id: customerId, tenantId },
        select: {
          gdprConsent: true,
          marketingConsent: true,
          callRecordingConsent: true,
        },
      });
    });

    if (!customer) {
      return false;
    }

    switch (consentType) {
      case 'GDPR':
        return customer.gdprConsent;
      case 'MARKETING':
        return customer.marketingConsent;
      case 'CALL_RECORDING':
        return customer.callRecordingConsent;
      default:
        // For other types, check the audit log
        const latestConsent = await this.prisma.withTenant(tenantId, async prisma => {
          return prisma.consentAuditLog.findFirst({
            where: {
              customerId,
              tenantId,
              consentType,
              revokedAt: null,
            },
            orderBy: { timestamp: 'desc' },
          });
        });
        return latestConsent?.granted ?? false;
    }
  }

  /**
   * Bulk check consent for multiple customers
   *
   * @param customerIds - Array of customer UUIDs
   * @param tenantId - Tenant ID
   * @param consentType - Type of consent to check
   * @returns Map of customerId to consent status
   */
  async bulkCheckConsent(
    customerIds: string[],
    tenantId: string,
    consentType: ConsentRecord['consentType'],
  ): Promise<Map<string, boolean>> {
    const customers = await this.prisma.withTenant(tenantId, async prisma => {
      return prisma.customerEncrypted.findMany({
        where: {
          id: { in: customerIds },
          tenantId,
        },
        select: {
          id: true,
          gdprConsent: true,
          marketingConsent: true,
          callRecordingConsent: true,
        },
      });
    });

    const result = new Map<string, boolean>();

    for (const customer of customers) {
      let hasConsent = false;
      switch (consentType) {
        case 'GDPR':
          hasConsent = customer.gdprConsent;
          break;
        case 'MARKETING':
          hasConsent = customer.marketingConsent;
          break;
        case 'CALL_RECORDING':
          hasConsent = customer.callRecordingConsent;
          break;
      }
      result.set(customer.id, hasConsent);
    }

    // Set false for any customers not found
    for (const customerId of customerIds) {
      if (!result.has(customerId)) {
        result.set(customerId, false);
      }
    }

    return result;
  }

  /**
   * Update customer record with latest consent status
   */
  private async updateCustomerConsentStatus(
    customerId: string,
    tenantId: string,
    consentType: ConsentRecord['consentType'],
    granted: boolean,
  ): Promise<void> {
    const updateData: any = {};

    switch (consentType) {
      case 'GDPR':
        updateData.gdprConsent = granted;
        updateData.gdprConsentDate = granted ? new Date() : null;
        break;
      case 'MARKETING':
        updateData.marketingConsent = granted;
        updateData.marketingConsentDate = granted ? new Date() : null;
        break;
      case 'CALL_RECORDING':
        updateData.callRecordingConsent = granted;
        break;
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.withTenant(tenantId, async prisma => {
        await prisma.customerEncrypted.update({
          where: { id: customerId },
          data: updateData,
        });
      });
    }
  }
}
