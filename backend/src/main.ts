import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { json } from 'express';
import { AppModule } from './app.module';
import { LoggerService } from './common/services/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new LoggerService(),
  });

  const configService = app.get(ConfigService);
  const logger = new LoggerService(configService);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // Body size limit
  app.use(json({ limit: '1mb' }));

  // Compression
  app.use(compression());

  // CORS - require explicit origin, no wildcard with credentials
  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  if (!corsOrigin) {
    logger.warn('CORS_ORIGIN not configured - defaulting to localhost only');
  }
  app.enableCors({
    origin: corsOrigin
      ? corsOrigin.split(',').map(o => o.trim())
      : ['http://localhost:3001'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global prefix
  const apiVersion = configService.get('API_VERSION', 'v1');
  app.setGlobalPrefix(apiVersion);

  // Swagger documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MechMind OS API')
    .setDescription('Multi-tenant SaaS for automotive repair shops with AI voice booking')
    .setVersion('10.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('Bookings', 'Booking management')
    .addTag('Customers', 'Customer management with PII encryption')
    .addTag('Voice Webhooks', 'Vapi AI voice integration')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  });

  // Health check endpoint (before global prefix, no auth required)
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req: unknown, res: { json: (body: Record<string, unknown>) => void }) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Start server
  const port = configService.get<number>('PORT', 3000);

  await app.listen(port);

  logger.log(`🚀 MechMind OS v10 API running on port ${port}`);
  logger.log(`📚 Swagger documentation available at /api/docs`);
  logger.log(`🔒 Environment: ${configService.get('NODE_ENV', 'development')}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
