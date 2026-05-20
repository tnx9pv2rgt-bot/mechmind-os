import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';

export interface AIVoiceDecision {
  callId: string;
  tenantId: string;
  decisionType: 'ai_generated' | 'human_escalated' | 'ai_offer_escalation';
  confidence?: number;
  humanOverride: boolean;
  escalationReason?: string;
  transcriptMarkers?: TranscriptMarker[];
}

export interface TranscriptMarker {
  timestamp: number;
  speaker: 'ai' | 'human';
  text: string;
  confidence?: number;
}

export interface AIInteractionAuditLog {
  callId: string;
  tenantId: string;
  decisionType: string;
  confidence?: number;
  humanOverride: boolean;
  escalationReason?: string;
  transcriptMarkers?: TranscriptMarker[];
  createdAt: Date;
}

@Injectable()
export class AIVoiceTransparencyService {
  private readonly logger = new Logger(AIVoiceTransparencyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly loggerService: LoggerService,
  ) {}

  async markVoiceCallAIGenerated(callId: string, tenantId: string): Promise<void> {
    if (!callId || !tenantId) {
      // eslint-disable-next-line sonarjs/no-duplicate-string
      throw new BadRequestException('callId and tenantId are required');
    }

    this.logger.log(
      `Marking call ${callId} as AI-generated with EU AI Act disclosure`,
      'AIVoiceTransparencyService',
    );

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new BadRequestException(`Tenant ${tenantId} not found`);
    }

    try {
      await this.logAIDecision({
        callId,
        tenantId,
        decisionType: 'ai_generated',
        confidence: 1.0,
        humanOverride: false,
      });

      this.loggerService.log(
        `AI disclosure logged for call ${callId}`,
        'AIVoiceTransparencyService',
      );
    } catch (error) {
      this.logger.error(
        // eslint-disable-next-line sonarjs/no-duplicate-string
        `Failed to mark call as AI-generated: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async logVoiceDecision(decision: AIVoiceDecision): Promise<void> {
    if (!decision.callId || !decision.tenantId) {
      throw new BadRequestException('callId and tenantId are required in decision object');
    }

    this.logger.debug(
      `Logging voice decision for call ${decision.callId}: ${decision.decisionType}`,
    );

    try {
      await this.logAIDecision(decision);

      if (decision.humanOverride) {
        this.logger.log(
          `Human override detected for call ${decision.callId}. Reason: ${decision.escalationReason || 'None provided'}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to log voice decision: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async handleOptOutRequest(
    callId: string,
    tenantId: string,
    reason?: string,
  ): Promise<{
    escalationInitiated: boolean;
    message: string;
  }> {
    if (!callId || !tenantId) {
      throw new BadRequestException('callId and tenantId are required');
    }

    this.logger.log(
      `Opt-out request received for call ${callId}. Reason: ${reason || 'Customer requested human'}`,
    );

    try {
      await this.logAIDecision({
        callId,
        tenantId,
        decisionType: 'ai_offer_escalation',
        confidence: 1.0,
        humanOverride: true,
        escalationReason: reason || 'Customer requested to speak with human',
      });

      return {
        escalationInitiated: true,
        message:
          'Your request to speak with a human has been logged. An agent will be with you shortly.',
      };
    } catch (error) {
      this.logger.error(
        `Failed to handle opt-out: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getCallAuditLog(callId: string, tenantId: string): Promise<AIInteractionAuditLog[]> {
    if (!callId || !tenantId) {
      throw new BadRequestException('callId and tenantId are required');
    }

    this.logger.debug(`Retrieving audit log for call ${callId}`);

    const where: Prisma.AIVoiceInteractionLogWhereInput = {
      callId,
      tenantId,
    };

    const logs = await this.prisma.aIVoiceInteractionLog.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return logs.map(log => ({
      callId: log.callId,
      tenantId: log.tenantId,
      decisionType: log.decisionType,
      confidence: log.confidence || undefined,
      humanOverride: log.humanOverride,
      escalationReason: log.escalationReason || undefined,
      transcriptMarkers: (log.transcriptMarkers as unknown as TranscriptMarker[]) || undefined,
      createdAt: log.createdAt,
    }));
  }

  async getCustomerAIInteractions(
    tenantId: string,
    customerPhone: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<AIInteractionAuditLog[]> {
    if (!tenantId || !customerPhone) {
      throw new BadRequestException('tenantId and customerPhone are required');
    }

    this.logger.log(
      `Retrieving AI interactions for customer ${customerPhone.slice(0, 4)}*** in tenant ${tenantId}`,
    );

    const where: Prisma.AIVoiceInteractionLogWhereInput = {
      tenantId,
      customerPhone,
      ...(fromDate &&
        toDate && {
          createdAt: {
            gte: fromDate,
            lte: toDate,
          },
        }),
    };

    const logs = await this.prisma.aIVoiceInteractionLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return logs.map(log => ({
      callId: log.callId,
      tenantId: log.tenantId,
      decisionType: log.decisionType,
      confidence: log.confidence || undefined,
      humanOverride: log.humanOverride,
      escalationReason: log.escalationReason || undefined,
      transcriptMarkers: (log.transcriptMarkers as unknown as TranscriptMarker[]) || undefined,
      createdAt: log.createdAt,
    }));
  }

  async getComplianceReport(
    tenantId: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<{
    totalCalls: number;
    aiGeneratedCalls: number;
    humanEscalations: number;
    optOutRate: number;
    uniqueCustomers: number;
    period: { from: Date; to: Date };
  }> {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    const where: Prisma.AIVoiceInteractionLogWhereInput = {
      tenantId,
      ...(fromDate &&
        toDate && {
          createdAt: {
            gte: fromDate,
            lte: toDate,
          },
        }),
    };

    const [total, aiGenerated, escalations, uniqueCustomers] = await Promise.all([
      this.prisma.aIVoiceInteractionLog.findMany({
        where,
        distinct: ['callId'],
      }),
      this.prisma.aIVoiceInteractionLog.count({
        where: {
          ...where,
          decisionType: 'ai_generated',
        },
      }),
      this.prisma.aIVoiceInteractionLog.count({
        where: {
          ...where,
          humanOverride: true,
        },
      }),
      this.prisma.aIVoiceInteractionLog.findMany({
        where,
        distinct: ['customerPhone'],
        select: { customerPhone: true },
      }),
    ]);

    const totalCalls = new Set(total.map(log => log.callId)).size;
    const optOutRate = totalCalls > 0 ? escalations / totalCalls : 0;

    return {
      totalCalls,
      aiGeneratedCalls: aiGenerated,
      humanEscalations: escalations,
      optOutRate: parseFloat((optOutRate * 100).toFixed(2)),
      uniqueCustomers: uniqueCustomers.length,
      period: {
        from: fromDate || new Date(0),
        to: toDate || new Date(),
      },
    };
  }

  private async logAIDecision(decision: AIVoiceDecision): Promise<void> {
    if (!decision.tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    const webhook = await this.prisma.voiceWebhookEvent.findFirst({
      where: {
        callId: decision.callId,
        tenantId: decision.tenantId,
      },
      select: { customerPhone: true },
    });

    const customerPhone = webhook?.customerPhone;

    try {
      await this.prisma.aIVoiceInteractionLog.create({
        data: {
          callId: decision.callId,
          tenantId: decision.tenantId,
          customerPhone: customerPhone || null,
          decisionType: decision.decisionType,
          confidence: decision.confidence || null,
          humanOverride: decision.humanOverride,
          escalationReason: decision.escalationReason || null,
          transcriptMarkers: decision.transcriptMarkers
            ? (decision.transcriptMarkers as unknown as Prisma.InputJsonValue)
            : undefined,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to log AI decision: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
