import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/services/prisma.service';

type OverrideDecision = 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';

export interface ReviewDVIAssessmentDto {
  assessmentId: string;
  reviewerEmail: string;
  reviewerUserId: string;
  decision: OverrideDecision;
  confidence: number;
  notes?: string;
}

@Injectable()
export class AIDecisionOverrideService {
  constructor(private readonly prisma: PrismaService) {}

  async reviewDVIAssessment(
    tenantId: string,
    dto: ReviewDVIAssessmentDto,
  ): Promise<void> {
    if (!tenantId || tenantId.trim().length === 0) {
      throw new BadRequestException('tenantId is required');
    }
    if (!dto.assessmentId || dto.assessmentId.trim().length === 0) {
      throw new BadRequestException('assessmentId is required');
    }
    if (dto.confidence < 0 || dto.confidence > 100) {
      throw new BadRequestException('confidence must be between 0 and 100');
    }

    await this.prisma.aIDecisionOverrideAuditLog.create({
      data: {
        assessmentId: dto.assessmentId,
        tenantId,
        reviewerUserId: dto.reviewerUserId,
        reviewerEmail: dto.reviewerEmail,
        originalDecision: 'pending',
        originalConfidence: 0,
        overrideDecision: dto.decision,
        assessorConfidence: dto.confidence,
        notes: dto.notes || null,
      },
    });
  }

  async getAssessmentOverrideHistory(
    tenantId: string,
    assessmentId: string,
  ): Promise<
    Array<{
      id: string;
      originalDecision: string;
      originalConfidence: number;
      overrideDecision: string;
      assessorConfidence: number;
      reviewerEmail: string;
      createdAt: Date;
      notes: string | null;
    }>
  > {
    if (!tenantId || tenantId.trim().length === 0) {
      throw new BadRequestException('tenantId is required');
    }
    if (!assessmentId || assessmentId.trim().length === 0) {
      throw new BadRequestException('assessmentId is required');
    }

    return this.prisma.aIDecisionOverrideAuditLog.findMany({
      where: { tenantId, assessmentId },
      select: {
        id: true,
        originalDecision: true,
        originalConfidence: true,
        overrideDecision: true,
        assessorConfidence: true,
        reviewerEmail: true,
        createdAt: true,
        notes: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
