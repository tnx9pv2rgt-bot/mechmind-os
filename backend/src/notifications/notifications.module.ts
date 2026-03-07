import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';

// Services
import { NotificationsService } from './services/notifications.service';
import { NotificationOrchestratorService } from './services/notification.service';
import { NotificationV2Service } from './services/notification-v2.service';
import { NotificationTriggersService } from './services/notification-triggers.service';
import { EmailService } from './email/email.service';
import { SmsService } from './sms/sms.service';

// Controllers
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationsApiController } from './controllers/notifications-api.controller';
import { NotificationsV2Controller } from './controllers/notifications-v2.controller';
import { NotificationWebhookController } from './controllers/webhook.controller';
import { SesWebhookController } from './controllers/ses-webhook.controller';

// Gateways
import { NotificationsGateway } from './gateways/notifications.gateway';

// Processors
import { EmailProcessor } from './processors/email.processor';
import { NotificationProcessor } from './processors/notification.processor';

@Module({
  imports: [
    ConfigModule,
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
    ),
  ],
  controllers: [
    NotificationsController,
    NotificationsApiController,
    NotificationsV2Controller,
    NotificationWebhookController,
    SesWebhookController,
  ],
  providers: [
    // Services
    NotificationsService,
    NotificationOrchestratorService,
    NotificationV2Service,
    NotificationTriggersService,
    EmailService,
    SmsService,
    
    // Gateways
    NotificationsGateway,
    
    // Processors
    EmailProcessor,
    NotificationProcessor,
  ],
  exports: [
    NotificationsService,
    NotificationOrchestratorService,
    NotificationV2Service,
    NotificationTriggersService,
    EmailService,
    SmsService,
  ],
})
export class NotificationsModule {}
