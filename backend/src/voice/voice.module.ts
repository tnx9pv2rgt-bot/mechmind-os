import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VoiceWebhookController } from './controllers/voice-webhook.controller';
import { VapiWebhookService } from './services/vapi-webhook.service';
import { IntentHandlerService } from './services/intent-handler.service';
import { EscalationService } from './services/escalation.service';
import { VoiceEventListener } from './listeners/voice-event.listener';
import { CommonModule } from '@common/common.module';
import { CustomerModule } from '@customer/customer.module';
import { BookingModule } from '@booking/booking.module';

@Module({
  imports: [ConfigModule, CommonModule, CustomerModule, BookingModule],
  controllers: [VoiceWebhookController],
  providers: [VapiWebhookService, IntentHandlerService, EscalationService, VoiceEventListener],
  exports: [VapiWebhookService, IntentHandlerService, EscalationService],
})
export class VoiceModule {}
