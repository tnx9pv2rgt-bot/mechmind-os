import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, InternalServerErrorException } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationOrchestratorService } from '../services/notification.service';
import { NotificationType, NotificationChannel } from '../dto/send-notification.dto';

interface NotificationJobData {
  type: NotificationType;
  customerId: string;
  tenantId: string;
  data: Record<string, unknown>;
  channel?: NotificationChannel;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

@Processor('notification-queue')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly notificationService: NotificationOrchestratorService) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<{
    success: boolean;
    channel: string;
    messageId?: string;
    fallbackUsed?: boolean;
  }> {
    this.logger.log(`Processing notification job ${job.id} (${job.name})`);

    const { type, customerId, tenantId, data, channel } = job.data;

    try {
      const result = await this.notificationService.notifyCustomer(
        customerId,
        tenantId,
        type,
        data,
        channel || NotificationChannel.AUTO,
      );

      if (!result.success) {
        throw new InternalServerErrorException(result.error || 'Notification failed');
      }

      this.logger.log(`Notification job ${job.id} completed successfully via ${result.channel}`);

      return {
        success: true,
        channel: result.channel,
        messageId: result.messageId,
        fallbackUsed: result.fallbackUsed,
      };
    } catch (error) {
      this.logger.error(
        `Notification job ${job.id} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error; // Trigger retry
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.log(`✅ Notification job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(`❌ Notification job ${job.id} failed: ${error.message}`);
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string): void {
    this.logger.warn(`⚠️ Notification job ${jobId} stalled`);
  }
}
