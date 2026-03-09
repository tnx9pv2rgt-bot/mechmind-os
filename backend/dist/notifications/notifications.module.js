"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const config_1 = require("@nestjs/config");
const notifications_service_1 = require("./services/notifications.service");
const notification_service_1 = require("./services/notification.service");
const notification_v2_service_1 = require("./services/notification-v2.service");
const notification_triggers_service_1 = require("./services/notification-triggers.service");
const email_service_1 = require("./email/email.service");
const sms_service_1 = require("./sms/sms.service");
const notifications_controller_1 = require("./controllers/notifications.controller");
const notifications_api_controller_1 = require("./controllers/notifications-api.controller");
const notifications_v2_controller_1 = require("./controllers/notifications-v2.controller");
const webhook_controller_1 = require("./controllers/webhook.controller");
const ses_webhook_controller_1 = require("./controllers/ses-webhook.controller");
const sse_controller_1 = require("./controllers/sse.controller");
const sse_service_1 = require("./services/sse.service");
const redis_pubsub_service_1 = require("./services/redis-pubsub.service");
const notifications_gateway_1 = require("./gateways/notifications.gateway");
const email_processor_1 = require("./processors/email.processor");
const notification_processor_1 = require("./processors/notification.processor");
let NotificationsModule = class NotificationsModule {
};
exports.NotificationsModule = NotificationsModule;
exports.NotificationsModule = NotificationsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            bullmq_1.BullModule.registerQueue({
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
            }, {
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
            }),
        ],
        controllers: [
            notifications_controller_1.NotificationsController,
            notifications_api_controller_1.NotificationsApiController,
            notifications_v2_controller_1.NotificationsV2Controller,
            webhook_controller_1.NotificationWebhookController,
            ses_webhook_controller_1.SesWebhookController,
            sse_controller_1.SseController,
        ],
        providers: [
            notifications_service_1.NotificationsService,
            notification_service_1.NotificationOrchestratorService,
            notification_v2_service_1.NotificationV2Service,
            notification_triggers_service_1.NotificationTriggersService,
            email_service_1.EmailService,
            sms_service_1.SmsService,
            sse_service_1.SseService,
            redis_pubsub_service_1.RedisPubSubService,
            notifications_gateway_1.NotificationsGateway,
            email_processor_1.EmailProcessor,
            notification_processor_1.NotificationProcessor,
        ],
        exports: [
            notifications_service_1.NotificationsService,
            notification_service_1.NotificationOrchestratorService,
            notification_v2_service_1.NotificationV2Service,
            notification_triggers_service_1.NotificationTriggersService,
            email_service_1.EmailService,
            sms_service_1.SmsService,
            sse_service_1.SseService,
        ],
    })
], NotificationsModule);
