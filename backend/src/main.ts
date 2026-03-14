import './instrument';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { json } from 'express';
import { AppModule } from './app.module';
import { LoggerService } from './common/services/logger.service';

async function bootstrap() {
  // Validate required secrets before starting
  if (!process.env.SETUP_SECRET) {
    console.error(
      '❌ SETUP_SECRET environment variable is required. Server cannot start without it.',
    );
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule, {
    logger: new LoggerService(),
  });

  const configService = app.get(ConfigService);
  const logger = new LoggerService(configService);

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Body size limit
  app.use(json({ limit: '1mb' }));

  // Compression
  app.use(compression());

  // CORS - require explicit origin, no wildcard with credentials
  const corsOrigin = configService.get<string>('CORS_ORIGIN');
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

  // Global prefix (exclude health check endpoints)
  const apiVersion = configService.get('API_VERSION', 'v1');
  app.setGlobalPrefix(apiVersion, {
    exclude: ['health', 'liveness', 'readiness'],
  });

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

  // Enable graceful shutdown hooks (Prisma disconnect, BullMQ cleanup, etc.)
  app.enableShutdownHooks();

  // Start server
  const port = configService.get<number>('PORT', 3000);

  await app.listen(port);

  logger.log(`🚀 MechMind OS v10 API running on port ${port}`);
  logger.log(`📚 Swagger documentation available at /api/docs`);
  logger.log(`🔒 Environment: ${configService.get('NODE_ENV', 'development')}`);
}

bootstrap().catch(error => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
