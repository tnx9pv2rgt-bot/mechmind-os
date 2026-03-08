"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GdprModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("@nestjs/bullmq");
const schedule_1 = require("@nestjs/schedule");
const common_module_1 = require("../common/common.module");
const customer_module_1 = require("../customer/customer.module");
const gdpr_deletion_service_1 = require("./services/gdpr-deletion.service");
const data_retention_service_1 = require("./services/data-retention.service");
const gdpr_consent_service_1 = require("./services/gdpr-consent.service");
const gdpr_export_service_1 = require("./services/gdpr-export.service");
const gdpr_request_service_1 = require("./services/gdpr-request.service");
const audit_log_service_1 = require("./services/audit-log.service");
const gdpr_controller_1 = require("./controllers/gdpr.controller");
const gdpr_webhook_controller_1 = require("./controllers/gdpr-webhook.controller");
const gdpr_deletion_processor_1 = require("./processors/gdpr-deletion.processor");
const data_retention_processor_1 = require("./processors/data-retention.processor");
let GdprModule = class GdprModule {
};
exports.GdprModule = GdprModule;
exports.GdprModule = GdprModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            common_module_1.CommonModule,
            customer_module_1.CustomerModule,
            schedule_1.ScheduleModule.forRoot(),
            bullmq_1.BullModule.registerQueue({
                name: 'gdpr-deletion',
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 5000,
                    },
                    removeOnComplete: 100,
                    removeOnFail: 50,
                },
            }, {
                name: 'gdpr-retention',
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 10000,
                    },
                    removeOnComplete: 50,
                    removeOnFail: 25,
                },
            }, {
                name: 'gdpr-export',
                defaultJobOptions: {
                    attempts: 2,
                    backoff: {
                        type: 'fixed',
                        delay: 5000,
                    },
                    removeOnComplete: 20,
                    removeOnFail: 10,
                },
            }),
        ],
        controllers: [
            gdpr_controller_1.GdprController,
            gdpr_webhook_controller_1.GdprWebhookController,
        ],
        providers: [
            gdpr_deletion_service_1.GdprDeletionService,
            data_retention_service_1.DataRetentionService,
            gdpr_consent_service_1.GdprConsentService,
            gdpr_export_service_1.GdprExportService,
            gdpr_request_service_1.GdprRequestService,
            audit_log_service_1.AuditLogService,
            gdpr_deletion_processor_1.GdprDeletionProcessor,
            data_retention_processor_1.DataRetentionProcessor,
        ],
        exports: [
            gdpr_deletion_service_1.GdprDeletionService,
            data_retention_service_1.DataRetentionService,
            gdpr_consent_service_1.GdprConsentService,
            gdpr_export_service_1.GdprExportService,
            gdpr_request_service_1.GdprRequestService,
            audit_log_service_1.AuditLogService,
        ],
    })
], GdprModule);
