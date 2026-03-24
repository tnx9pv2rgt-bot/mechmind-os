import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SmsService, SmsResult } from '../sms/sms.service';

export interface SmsJobData {
  to: string;
  body: string;
  category: string;
  notificationId?: string;
  tenantId?: string;
  templateType?: string;
  templateData?: Record<string, string>;
}

@Processor('sms-queue')
export class SmsProcessor extends WorkerHost {
  private readonly logger = new Logger(SmsProcessor.name);

  constructor(private readonly smsService: SmsService) {
    super();
  }

  async process(job: Job<SmsJobData>): Promise<SmsResult> {
    this.logger.log(
      `Processing SMS job ${job.id} to ${job.data.to.slice(0, 4)}*** [${job.data.category}]`,
    );

    const { to, body, category, templateType, templateData } = job.data;

    try {
      let result: SmsResult;

      // Use typed template methods when available, otherwise send custom
      if (templateType && templateData) {
        result = await this.sendWithTemplate(to, templateType, templateData);
      } else {
        result = await this.smsService.sendCustom(to, body, category);
      }

      if (!result.success) {
        throw new Error(result.error || 'SMS send failed');
      }

      this.logger.log(`SMS job ${job.id} sent successfully: ${result.messageId}`);
      return result;
    } catch (error) {
      this.logger.error(
        `SMS job ${job.id} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error; // Trigger BullMQ retry
    }
  }

  private async sendWithTemplate(
    to: string,
    templateType: string,
    data: Record<string, string>,
  ): Promise<SmsResult> {
    switch (templateType) {
      case 'booking_confirmation':
        return this.smsService.sendBookingConfirmation(to, {
          date: data.date,
          time: data.time,
          service: data.service,
          workshopName: data.workshopName,
          bookingCode: data.bookingCode,
        });

      case 'booking_reminder':
        return this.smsService.sendBookingReminder(to, {
          date: data.date,
          time: data.time,
          service: data.service,
          workshopName: data.workshopName,
          bookingCode: data.bookingCode,
        });

      case 'booking_cancelled':
        return this.smsService.sendBookingCancelled(to, {
          date: data.date,
          service: data.service,
          workshopName: data.workshopName,
          bookingCode: data.bookingCode,
          cancellationReason: data.cancellationReason,
        });

      case 'invoice_ready':
        return this.smsService.sendInvoiceReady(to, {
          invoiceNumber: data.invoiceNumber,
          amount: data.amount,
          downloadUrl: data.downloadUrl,
          workshopName: data.workshopName,
        });

      default:
        return this.smsService.sendCustom(to, data.body || '', templateType);
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.log(`SMS job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `SMS job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string): void {
    this.logger.warn(`SMS job ${jobId} stalled`);
  }
}
