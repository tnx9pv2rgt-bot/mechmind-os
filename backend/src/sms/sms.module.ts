import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { SmsThreadService } from './sms-thread.service';
import { SmsThreadController, SmsWebhookController } from './sms-thread.controller';

@Module({
  imports: [CommonModule],
  controllers: [SmsThreadController, SmsWebhookController],
  providers: [SmsThreadService],
  exports: [SmsThreadService],
})
export class SmsModule {}
