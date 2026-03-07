import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@common/services/prisma.service';
import { QueueService } from '@common/services/queue.service';
import { LoggerService } from '@common/services/logger.service';
import { IntentHandlerService } from './intent-handler.service';
import { EscalationService } from './escalation.service';
import {
  VapiWebhookDto,
  VapiEventType,
  VoiceIntent,
  TransferRequestDto,
} from '../dto/vapi-webhook.dto';

export interface WebhookProcessingResult {
  action?: string;
  bookingId?: string;
  escalation?: {
    escalated: boolean;
    reason: string;
    agentId?: string;
  };
}

@Injectable()
export class VapiWebhookService {
  private readonly logger = new Logger(VapiWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly loggerService: LoggerService,
    private readonly intentHandler: IntentHandlerService,
    private readonly escalationService: EscalationService,
  ) {}

  /**
   * Process incoming Vapi webhook
   */
  async processWebhook(payload: VapiWebhookDto): Promise<WebhookProcessingResult> {
    const { event, callId, tenantId, customerPhone, intent, extractedData, transcript } = payload;

    this.loggerService.log(
      `Processing Vapi webhook: ${event} for call ${callId}`,
      'VapiWebhookService',
    );

    // Store webhook event for audit trail
    await this.storeWebhookEvent(payload);

    switch (event) {
      case VapiEventType.CALL_COMPLETED:
        return this.handleCallCompleted(payload);

      case VapiEventType.MESSAGE:
        return this.handleMessage(payload);

      case VapiEventType.TRANSFER_REQUESTED:
        const transferResult = await this.handleTransfer({
          callId,
          customerPhone,
          tenantId,
          reason: 'Transfer requested by customer',
        });
        return {
          action: transferResult.escalated ? 'transfer_completed' : 'transfer_queued',
          escalation: transferResult,
        };

      case VapiEventType.CALL_STARTED:
        return this.handleCallStarted(payload);

      case VapiEventType.CALL_UPDATED:
        return this.handleCallUpdated(payload);

      default:
        this.logger.warn(`Unhandled event type: ${event}`);
        return { action: 'ignored' };
    }
  }

  /**
   * Handle call completed event
   */
  private async handleCallCompleted(
    payload: VapiWebhookDto,
  ): Promise<WebhookProcessingResult> {
    const { intent, tenantId, customerPhone, extractedData, callId } = payload;

    // Process based on intent
    switch (intent) {
      case VoiceIntent.BOOKING:
        if (extractedData?.preferredDate && extractedData?.preferredTime) {
          const bookingResult = await this.intentHandler.handleBookingIntent(
            tenantId,
            customerPhone,
            extractedData,
            callId,
          );
          return {
            action: 'booking_created',
            bookingId: bookingResult.bookingId,
          };
        }
        break;

      case VoiceIntent.STATUS_CHECK:
        await this.intentHandler.handleStatusCheckIntent(
          tenantId,
          customerPhone,
          extractedData || {},
        );
        return { action: 'status_check_processed' };

      case VoiceIntent.COMPLAINT:
        await this.intentHandler.handleComplaintIntent(
          tenantId,
          customerPhone,
          payload.transcript,
          extractedData || {},
        );
        return { action: 'complaint_logged' };

      case VoiceIntent.OTHER:
      default:
        // Queue for manual review
        await this.queueForReview(payload);
        return { action: 'queued_for_review' };
    }

    return { action: 'processed' };
  }

  /**
   * Handle message event (real-time conversation updates)
   */
  private async handleMessage(payload: VapiWebhookDto): Promise<WebhookProcessingResult> {
    // Can be used for real-time monitoring or sentiment analysis
    this.logger.debug(`Message from call ${payload.callId}: ${payload.transcript?.slice(0, 100)}...`);
    return { action: 'message_logged' };
  }

  /**
   * Handle call started event
   */
  private async handleCallStarted(payload: VapiWebhookDto): Promise<WebhookProcessingResult> {
    // Log call start, can be used for analytics
    this.logger.log(`Call started: ${payload.callId} from ${payload.customerPhone}`);
    return { action: 'call_logged' };
  }

  /**
   * Handle call updated event
   */
  private async handleCallUpdated(payload: VapiWebhookDto): Promise<WebhookProcessingResult> {
    // Update call status in database
    this.logger.debug(`Call updated: ${payload.callId}`);
    return { action: 'call_updated' };
  }

  /**
   * Handle transfer request
   */
  async handleTransfer(payload: TransferRequestDto): Promise<{
    escalated: boolean;
    reason: string;
    agentId?: string;
  }> {
    const { callId, tenantId, customerPhone, reason, category } = payload;

    this.logger.log(
      `Transfer requested for call ${callId}: ${reason}`,
      'VapiWebhookService',
    );

    // Find available agent
    const agent = await this.escalationService.findAvailableAgent(tenantId, category);

    if (!agent) {
      // No agent available, queue for callback
      await this.escalationService.queueForCallback(tenantId, customerPhone, reason);
      return {
        escalated: false,
        reason: 'No agents available, queued for callback',
      };
    }

    // Transfer to agent
    await this.escalationService.transferToAgent(callId, agent.id, reason);

    return {
      escalated: true,
      reason,
      agentId: agent.id,
    };
  }

  /**
   * Store webhook event for audit trail
   */
  private async storeWebhookEvent(payload: VapiWebhookDto): Promise<void> {
    try {
      await this.prisma.voiceWebhookEvent.create({
        data: {
          callId: payload.callId,
          eventType: payload.event,
          tenantId: payload.tenantId,
          customerPhone: payload.customerPhone,
          payload: payload as any,
          processed: false,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to store webhook event: ${error.message}`);
    }
  }

  /**
   * Queue conversation for manual review
   */
  private async queueForReview(payload: VapiWebhookDto): Promise<void> {
    await this.queueService.addVoiceJob(
      'manual-review',
      {
        type: 'manual-review',
        payload: {
          callId: payload.callId,
          transcript: payload.transcript,
          customerPhone: payload.customerPhone,
        },
        tenantId: payload.tenantId,
      },
    );

    this.logger.log(`Queued call ${payload.callId} for manual review`);
  }

  /**
   * Get webhook event statistics
   */
  async getStats(tenantId: string, fromDate?: Date, toDate?: Date): Promise<any> {
    const where: any = {
      tenantId,
      ...(fromDate && toDate && {
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
      }),
    };

    const [
      totalEvents,
      eventTypeCounts,
      processedCount,
      unprocessedCount,
    ] = await Promise.all([
      this.prisma.voiceWebhookEvent.count({ where }),
      this.prisma.voiceWebhookEvent.groupBy({
        by: ['eventType'],
        where,
        _count: { eventType: true },
      }),
      this.prisma.voiceWebhookEvent.count({
        where: { ...where, processed: true },
      }),
      this.prisma.voiceWebhookEvent.count({
        where: { ...where, processed: false },
      }),
    ]);

    return {
      total: totalEvents,
      byEventType: eventTypeCounts.reduce((acc, curr) => ({
        ...acc,
        [curr.eventType]: curr._count.eventType,
      }), {}),
      processed: processedCount,
      unprocessed: unprocessedCount,
    };
  }
}
