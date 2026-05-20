import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SmsThreadService } from './sms-thread.service';

interface SmsInboundJobData {
  tenantId: string;
  phoneHash: string;
  body: string;
  twilioSid?: string;
}

@Processor('sms-inbound')
export class SmsInboundProcessor extends WorkerHost {
  private readonly logger = new Logger(SmsInboundProcessor.name);

  constructor(private readonly smsThreadService: SmsThreadService) {
    super();
  }

  async process(job: Job<SmsInboundJobData>): Promise<void> {
    const { tenantId, phoneHash, body, twilioSid } = job.data;
    this.logger.log(`Processing inbound SMS job ${job.id} for tenant ${tenantId}`);

    await this.smsThreadService.receiveInbound(tenantId, phoneHash, body, twilioSid);
  }
}
