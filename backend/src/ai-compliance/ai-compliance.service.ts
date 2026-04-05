/**
 * MechMind OS - AI Compliance Service (EU AI Act)
 *
 * Provides transparency logging for all AI-assisted decisions,
 * human review/override tracking, and compliance dashboard.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { Prisma, AiDecisionLog } from '@prisma/client';
import {
  LogAiDecisionDto,
  HumanReviewDto,
  AiDecisionQueryDto,
  AiComplianceDashboardDto,
} from './dto/ai-compliance.dto';

@Injectable()
export class AiComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log an AI decision for EU AI Act compliance.
   * Called by any service that uses AI (damage analysis, diagnostics, etc.)
   */
  async logDecision(tenantId: string, dto: LogAiDecisionDto): Promise<AiDecisionLog> {
    return this.prisma.aiDecisionLog.create({
      data: {
        tenantId,
        featureName: dto.featureName,
        modelUsed: dto.modelUsed,
        inputSummary: dto.inputSummary,
        outputSummary: dto.outputSummary,
        confidence: dto.confidence != null ? new Prisma.Decimal(dto.confidence) : null,
        entityType: dto.entityType,
        entityId: dto.entityId,
        userId: dto.userId,
        processingTimeMs: dto.processingTimeMs,
      },
    });
  }

  /**
   * Record a human review/override on an AI decision.
   */
  async recordHumanReview(
    tenantId: string,
    id: string,
    dto: HumanReviewDto,
    reviewedBy: string,
  ): Promise<AiDecisionLog> {
    const existing = await this.prisma.aiDecisionLog.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Decisione IA ${id} non trovata`);
    }

    return this.prisma.aiDecisionLog.update({
      where: { id },
      data: {
        humanReviewed: true,
        humanOverridden: dto.humanOverridden,
        humanDecision: dto.humanDecision,
        reviewedBy,
        reviewedAt: new Date(),
      },
    });
  }

  /**
   * List AI decisions with filters and pagination.
   */
  async findAll(
    tenantId: string,
    query: AiDecisionQueryDto,
  ): Promise<{ data: AiDecisionLog[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AiDecisionLogWhereInput = { tenantId };

    if (query.featureName) {
      where.featureName = query.featureName;
    }

    if (query.humanReviewed !== undefined) {
      where.humanReviewed = query.humanReviewed;
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) {
        where.createdAt.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.createdAt.lte = new Date(query.dateTo);
      }
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.aiDecisionLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.aiDecisionLog.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Get a single AI decision by ID.
   */
  async findOne(tenantId: string, id: string): Promise<AiDecisionLog> {
    const record = await this.prisma.aiDecisionLog.findFirst({
      where: { id, tenantId },
    });

    if (!record) {
      throw new NotFoundException(`Decisione IA ${id} non trovata`);
    }

    return record;
  }

  /**
   * Dashboard: compliance statistics for the tenant.
   */
  async getDashboard(tenantId: string): Promise<AiComplianceDashboardDto> {
    const [totalDecisions, overriddenCount, pendingReview, avgResult, byFeatureRaw] =
      await this.prisma.$transaction([
        this.prisma.aiDecisionLog.count({ where: { tenantId } }),
        this.prisma.aiDecisionLog.count({
          where: { tenantId, humanOverridden: true },
        }),
        this.prisma.aiDecisionLog.count({
          where: { tenantId, humanReviewed: false },
        }),
        this.prisma.aiDecisionLog.aggregate({
          where: { tenantId, confidence: { not: null } },
          _avg: { confidence: true },
        }),
        this.prisma.aiDecisionLog.groupBy({
          by: ['featureName'],
          where: { tenantId },
          orderBy: { featureName: 'asc' },
          _count: true,
        }),
      ]);

    const overrideRate = totalDecisions > 0 ? overriddenCount / totalDecisions : 0;
    const avgConfidence = avgResult._avg.confidence ? Number(avgResult._avg.confidence) : 0;

    const byFeature: Record<string, number> = {};
    for (const row of byFeatureRaw) {
      byFeature[row.featureName] = Number(row._count);
    }

    return {
      totalDecisions,
      overrideRate: Math.round(overrideRate * 10000) / 10000,
      avgConfidence: Math.round(avgConfidence * 10000) / 10000,
      pendingReview,
      byFeature,
    };
  }
}
