import { Module } from '@nestjs/common';
import { CommonModule } from '@common/common.module';
import { WebhookSubscriptionController } from './webhook-subscription.controller';
import { WebhookSubscriptionService } from './webhook-subscription.service';

@Module({
  imports: [CommonModule],
  controllers: [WebhookSubscriptionController],
  providers: [WebhookSubscriptionService],
  exports: [WebhookSubscriptionService],
})
export class WebhookSubscriptionModule {}
