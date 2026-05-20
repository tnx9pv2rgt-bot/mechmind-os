import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Services
import { NotificationsService } from './services/notifications.service';
import { NotificationOrchestratorService } from './services/notification.service';
import { NotificationV2Service } from './services/notification-v2.service';
import { NotificationTriggersService } from './services/notification-triggers.service';
import { EmailService } from './email/email.service';
import { SmsService } from './sms/sms.service';
import { PecService } from './pec/pec.service';

// Controllers
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationsApiController } from './controllers/notifications-api.controller';
import { NotificationsV2Controller } from './controllers/notifications-v2.controller';
import { NotificationWebhookController } from './controllers/webhook.controller';
import { SesWebhookController } from './controllers/ses-webhook.controller';
import { SseController } from './controllers/sse.controller';

// Services (SSE)
import { SseService } from './services/sse.service';
import { RedisPubSubService } from './services/redis-pubsub.service';

// Gateways
import { NotificationsGateway } from './gateways/notifications.gateway';

// Processors
import { EmailProcessor } from './processors/email.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { SmsProcessor } from './processors/sms.processor';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    BullModule.registerQueue(
      {
        name: 'email-queue',
        defaultJobOptions: {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      },
      {
        name: 'notification-queue',
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 200,
          removeOnFail: 100,
        },
      },
      {
        name: 'sms-queue',
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 30000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      },
    ),
  ],
  controllers: [
    NotificationsController,
    NotificationsApiController,
    NotificationsV2Controller,
    NotificationWebhookController,
    SesWebhookController,
    SseController,
  ],
  providers: [
    // Services
    NotificationsService,
    NotificationOrchestratorService,
    NotificationV2Service,
    NotificationTriggersService,
    EmailService,
    SmsService,
    PecService,
    SseService,
    RedisPubSubService,

    // Gateways
    NotificationsGateway,

    // Processors
    EmailProcessor,
    NotificationProcessor,
    SmsProcessor,
  ],
  exports: [
    NotificationsService,
    NotificationOrchestratorService,
    NotificationV2Service,
    NotificationTriggersService,
    EmailService,
    SmsService,
    PecService,
    SseService,
  ],
})
export class NotificationsModule {}
