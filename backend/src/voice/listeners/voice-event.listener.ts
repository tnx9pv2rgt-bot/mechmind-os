import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LoggerService } from '@common/services/logger.service';
import { QueueService } from '@common/services/queue.service';

@Injectable()
export class VoiceEventListener {
  constructor(
    private readonly logger: LoggerService,
    private readonly queueService: QueueService,
  ) {}

  @OnEvent('voice.call.completed')
  async handleCallCompleted(event: {
    callId: string;
    tenantId: string;
    customerPhone: string;
    duration: number;
    transcript?: string;
  }) {
    this.logger.log(
      `Voice call completed: ${event.callId} for tenant ${event.tenantId}`,
      'VoiceEventListener',
    );

    // Log call analytics
    await this.queueService.addVoiceJob('log-call-analytics', {
      type: 'call-analytics',
      payload: {
        callId: event.callId,
        duration: event.duration,
        customerPhone: event.customerPhone,
      },
      tenantId: event.tenantId,
    });
  }

  @OnEvent('voice.transfer.completed')
  async handleTransferCompleted(event: {
    callId: string;
    tenantId: string;
    agentId: string;
    customerPhone: string;
  }) {
    this.logger.log(
      `Transfer completed: ${event.callId} to agent ${event.agentId}`,
      'VoiceEventListener',
    );

    // Notify agent
    await this.queueService.addNotificationJob('notify-agent-transfer', {
      type: 'agent-transfer',
      payload: {
        callId: event.callId,
        agentId: event.agentId,
        customerPhone: event.customerPhone,
      },
      tenantId: event.tenantId,
    });
  }

  @OnEvent('voice.callback.scheduled')
  async handleCallbackScheduled(event: {
    tenantId: string;
    customerPhone: string;
    scheduledAt: Date;
    reason: string;
  }) {
    this.logger.log(
      `Callback scheduled for ${event.customerPhone} at ${event.scheduledAt}`,
      'VoiceEventListener',
    );

    // Schedule the callback job
    await this.queueService.addVoiceJob(
      'execute-callback',
      {
        type: 'execute-callback',
        payload: {
          customerPhone: event.customerPhone,
          reason: event.reason,
        },
        tenantId: event.tenantId,
      },
      {
        delay: event.scheduledAt.getTime() - Date.now(),
      },
    );
  }
}
