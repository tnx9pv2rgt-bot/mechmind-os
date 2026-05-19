import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@common/services/prisma.service';
import type { DpaAcceptance as PrismaDpaAcceptance } from '@prisma/client';

export interface RecordDpaAcceptanceInput {
  tenantId: string;
  version: string;
  ipAddress: string;
  userAgent?: string;
  signerName?: string;
  signerEmail?: string;
  documentUrl?: string;
}

export interface DpaAcceptanceRecord {
  id: string;
  tenantId: string;
  version: string;
  acceptedAt: Date;
  ipAddress: string | null;
  userAgent?: string | null;
}

@Injectable()
export class DpaAcceptanceService {
  private readonly logger = new Logger(DpaAcceptanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get dpaAcceptance() {
    return this.prisma.dpaAcceptance;
  }

  // Prisma stores `dpaVersion`; service API exposes `version`
  private mapResult(r: PrismaDpaAcceptance): DpaAcceptanceRecord {
    return {
      id: r.id,
      tenantId: r.tenantId,
      version: r.dpaVersion,
      acceptedAt: r.acceptedAt,
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
    };
  }

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

    const r = await this.dpaAcceptance.create({
      data: {
        tenantId: input.tenantId,
        dpaVersion: input.version,
        signerName: input.signerName ?? 'DPA Click Acceptance',
        signerEmail: input.signerEmail ?? '',
        documentUrl: input.documentUrl ?? '',
        acceptedAt: new Date(),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent || null,
      },
    });
    return this.mapResult(r);
  }

  async getLatestAcceptance(tenantId: string): Promise<DpaAcceptanceRecord | null> {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    const r = await this.dpaAcceptance.findFirst({
      where: { tenantId },
      orderBy: { acceptedAt: 'desc' },
    });
    return r ? this.mapResult(r) : null;
  }

  async hasAcceptedVersion(tenantId: string, version: string): Promise<boolean> {
    if (!tenantId || !version) {
      throw new BadRequestException('tenantId and version are required');
    }

    const acceptance = await this.dpaAcceptance.findFirst({
      where: {
        tenantId,
        dpaVersion: version,
      },
    });

    return !!acceptance;
  }

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

    return { data: data.map(r => this.mapResult(r)), total, page, limit };
  }
}
