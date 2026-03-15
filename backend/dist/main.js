"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./instrument");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_1 = require("express");
const app_module_1 = require("./app.module");
const logger_service_1 = require("./common/services/logger.service");
async function bootstrap() {
    if (!process.env.SETUP_SECRET) {
        console.error('❌ SETUP_SECRET environment variable is required. Server cannot start without it.');
        process.exit(1);
    }
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: new logger_service_1.LoggerService(),
    });
    const configService = app.get(config_1.ConfigService);
    const logger = new logger_service_1.LoggerService(configService);
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', 'https:'],
            },
        },
        crossOriginEmbedderPolicy: false,
    }));
    app.use((0, express_1.json)({ limit: '1mb' }));
    app.use((0, compression_1.default)());
    const corsOrigin = configService.get('CORS_ORIGIN');
    if (!corsOrigin) {
        logger.warn('CORS_ORIGIN not configured - defaulting to localhost + Vercel');
    }
    const corsOrigins = corsOrigin
        ? corsOrigin.split(',').map(o => o.trim())
        : ['http://localhost:3001', 'https://mechmind-os.vercel.app'];
    app.enableCors({
        origin: corsOrigins,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
    });
    const apiVersion = configService.get('API_VERSION', 'v1');
    app.setGlobalPrefix(apiVersion, {
        exclude: ['health', 'liveness', 'readiness'],
    });
    const swaggerConfig = new swagger_1.DocumentBuilder()
        .setTitle('MechMind OS API')
        .setDescription('Multi-tenant SaaS for automotive repair shops with AI voice booking')
        .setVersion('10.0.0')
        .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
    }, 'JWT-auth')
        .addTag('Authentication', 'User authentication and authorization')
        .addTag('Bookings', 'Booking management')
        .addTag('Customers', 'Customer management with PII encryption')
        .addTag('Voice Webhooks', 'Vapi AI voice integration')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
    swagger_1.SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
            docExpansion: 'none',
            filter: true,
            showRequestDuration: true,
        },
    });
    app.enableShutdownHooks();
    const port = configService.get('PORT', 3000);
    await app.listen(port);
    logger.log(`🚀 MechMind OS v10 API running on port ${port}`);
    logger.log(`📚 Swagger documentation available at /api/docs`);
    logger.log(`🔒 Environment: ${configService.get('NODE_ENV', 'development')}`);
}
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', error => {
    console.error('Uncaught Exception:', error);
    setTimeout(() => process.exit(1), 1000);
});
bootstrap().catch(error => {
    console.error('Failed to start application:', error);
    process.exit(1);
});
