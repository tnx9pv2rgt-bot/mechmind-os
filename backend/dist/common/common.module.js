"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommonModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("@nestjs/bullmq");
const prisma_service_1 = require("./services/prisma.service");
const encryption_service_1 = require("./services/encryption.service");
const queue_service_1 = require("./services/queue.service");
const logger_service_1 = require("./services/logger.service");
const tenant_guard_1 = require("./guard/tenant.guard");
let CommonModule = class CommonModule {
};
exports.CommonModule = CommonModule;
exports.CommonModule = CommonModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            bullmq_1.BullModule.forRootAsync({
                useFactory: () => ({
                    connection: {
                        host: process.env.REDIS_HOST || 'localhost',
                        port: parseInt(process.env.REDIS_PORT || '6379'),
                        password: process.env.REDIS_PASSWORD || undefined,
                        db: parseInt(process.env.REDIS_DB || '0'),
                    },
                    defaultJobOptions: {
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 1000,
                        },
                    },
                }),
            }),
            bullmq_1.BullModule.registerQueue({ name: 'booking' }, { name: 'voice' }, { name: 'notification' }),
        ],
        providers: [prisma_service_1.PrismaService, encryption_service_1.EncryptionService, queue_service_1.QueueService, logger_service_1.LoggerService, tenant_guard_1.TenantGuard],
        exports: [prisma_service_1.PrismaService, encryption_service_1.EncryptionService, queue_service_1.QueueService, logger_service_1.LoggerService, bullmq_1.BullModule, tenant_guard_1.TenantGuard],
    })
], CommonModule);
