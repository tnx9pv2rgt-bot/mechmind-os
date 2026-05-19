import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@common/services/prisma.service';

export interface RecordDpaAcceptanceInput {
  tenantId: string;
  version: string;
  ipAddress: string;
  userAgent?: string;
}

export interface DpaAcceptanceRecord {
  id: string;
  tenantId: string;
  version: string;
  acceptedAt: Date;
  ipAddress: string;
  userAgent?: string | null;
}

/**
 * Service to track DPA (Data Processing Agreement) acceptance for GDPR compliance
 */
@Injectable()
export class DpaAcceptanceService {
  private readonly logger = new Logger(DpaAcceptanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get dpaAcceptance() {
    return this.prisma.dpaAcceptance;
  }

  /**
   * Record DPA acceptance for a tenant
   */
  async recordAcceptance(input: RecordDpaAcceptanceInput): Promise<DpaAcceptanceRecord> {
    if (!input.tenantId || !input.version || !input.ipAddress) {
      throw new BadRequestException('tenantId, version, and ipAddress are required');
    }

    if (input.version.length === 0) {
      throw new BadRequestException('DPA version cannot be empty');
    }

    this.logger.log(
      `Recording DPA acceptance for tenant ${input.tenantId} version ${input.version}`,
    );

    return this.dpaAcceptance.create({
      data: {
        tenantId: input.tenantId,
        version: input.version,
        acceptedAt: new Date(),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent || null,
      },
    });
  }

  /**
   * Get the latest DPA acceptance for a tenant
   */
  async getLatestAcceptance(tenantId: string): Promise<DpaAcceptanceRecord | null> {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    return this.dpaAcceptance.findFirst({
      where: { tenantId },
      orderBy: { acceptedAt: 'desc' },
    });
  }

  /**
   * Check if tenant has accepted DPA for a specific version
   */
  async hasAcceptedVersion(tenantId: string, version: string): Promise<boolean> {
    if (!tenantId || !version) {
      throw new BadRequestException('tenantId and version are required');
    }

    const acceptance = await this.dpaAcceptance.findFirst({
      where: {
        tenantId,
        version,
      },
    });

    return !!acceptance;
  }

  /**
   * List all DPA acceptances for a tenant with pagination
   */
  async listAcceptances(
    tenantId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: DpaAcceptanceRecord[]; total: number; page: number; limit: number }> {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.dpaAcceptance.findMany({
        where: { tenantId },
        orderBy: { acceptedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.dpaAcceptance.count({ where: { tenantId } }),
    ]);

    return { data, total, page, limit };
  }
}
