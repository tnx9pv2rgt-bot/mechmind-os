"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const throttler_storage_redis_1 = require("@nest-lab/throttler-storage-redis");
const ioredis_1 = require("ioredis");
const common_module_1 = require("./common/common.module");
const auth_module_1 = require("./auth/auth.module");
const booking_module_1 = require("./booking/booking.module");
const voice_module_1 = require("./voice/voice.module");
const customer_module_1 = require("./customer/customer.module");
const gdpr_module_1 = require("./gdpr/gdpr.module");
const analytics_module_1 = require("./analytics/analytics.module");
const notifications_module_1 = require("./notifications/notifications.module");
const dvi_module_1 = require("./dvi/dvi.module");
const obd_module_1 = require("./obd/obd.module");
const parts_module_1 = require("./parts/parts.module");
const subscription_module_1 = require("./subscription/subscription.module");
const iot_module_1 = require("./iot/iot.module");
const logger_interceptor_1 = require("./common/interceptors/logger.interceptor");
const transform_interceptor_1 = require("./common/interceptors/transform.interceptor");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env', '.env.local'],
            }),
            throttler_1.ThrottlerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => {
                    const redisHost = config.get('REDIS_HOST', 'localhost');
                    const redisPort = config.get('REDIS_PORT', 6379);
                    const redisPassword = config.get('REDIS_PASSWORD');
                    const redisTls = config.get('REDIS_TLS') === 'true';
                    const redisOptions = {
                        host: redisHost,
                        port: redisPort,
                        password: redisPassword,
                        db: config.get('REDIS_THROTTLE_DB', 1),
                    };
                    if (redisTls) {
                        redisOptions.tls = {};
                    }
                    return {
                        throttlers: [
                            {
                                name: 'default',
                                ttl: 60000,
                                limit: 100,
                            },
                            {
                                name: 'auth',
                                ttl: 60000,
                                limit: 5,
                            },
                            {
                                name: 'api',
                                ttl: 60000,
                                limit: 200,
                            },
                            {
                                name: 'webhook',
                                ttl: 60000,
                                limit: 1000,
                            },
                        ],
                        storage: new throttler_storage_redis_1.ThrottlerStorageRedisService(new ioredis_1.Redis(redisOptions)),
                    };
                },
            }),
            common_module_1.CommonModule,
            auth_module_1.AuthModule,
            booking_module_1.BookingModule,
            voice_module_1.VoiceModule,
            customer_module_1.CustomerModule,
            gdpr_module_1.GdprModule,
            analytics_module_1.AnalyticsModule,
            notifications_module_1.NotificationsModule,
            dvi_module_1.DviModule,
            obd_module_1.ObdModule,
            parts_module_1.PartsModule,
            subscription_module_1.SubscriptionModule,
            iot_module_1.IotModule,
        ],
        providers: [
            {
                provide: core_1.APP_PIPE,
                useFactory: () => new common_1.ValidationPipe({
                    whitelist: true,
                    forbidNonWhitelisted: true,
                    transform: true,
                    transformOptions: {
                        enableImplicitConversion: true,
                    },
                }),
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: logger_interceptor_1.LoggerInterceptor,
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: transform_interceptor_1.TransformInterceptor,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
        ],
    })
], AppModule);
