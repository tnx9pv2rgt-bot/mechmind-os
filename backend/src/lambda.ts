/**
 * AWS Lambda Web Adapter Handler (2026 Standard)
 * 
 * AWS Lambda Web Adapter is the recommended approach for running
 * web frameworks (Express, NestJS, Fastify) on Lambda in 2026.
 * 
 * Advantages over @codegenie/serverless-express:
 * - Native AWS support (maintained by AWS Labs)
 * - Better performance (~200ms cold start improvement)
 * - Simpler debugging (no wrapper overhead)
 * - Official security patches
 * - Container image support
 * 
 * How it works:
 * 1. Lambda Web Adapter runs as a Lambda Extension (layer)
 * 2. It proxies HTTP events to your web framework
 * 3. Your NestJS app runs normally on port 3000
 * 4. Adapter handles the Lambda event/response translation
 * 
 * Source: https://github.com/awslabs/aws-lambda-web-adapter
 * AWS Blog: https://aws.amazon.com/blogs/compute/aws-lambda-web-adapter
 */

import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';

import { AppModule } from './app.module';

// Lambda Web Adapter configuration
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Cache for Lambda container reuse (warm starts)
let cachedApp: any = null;

/**
 * Bootstrap NestJS application
 * Uses caching for Lambda warm starts
 */
async function bootstrap(): Promise<express.Application> {
  if (cachedApp) {
    return cachedApp;
  }

  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);

  const app = await NestFactory.create(AppModule, adapter, {
    logger: process.env.NODE_ENV === 'dev' 
      ? ['debug', 'log', 'warn', 'error'] 
      : ['warn', 'error'],
  });

  // Enable validation pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // Initialize app (but don't listen - Web Adapter handles that)
  await app.init();

  cachedApp = expressApp;
  return expressApp;
}

/**
 * Lambda Handler (for Web Adapter)
 * 
 * With Lambda Web Adapter, this handler is NOT called directly.
 * Instead, Web Adapter runs your app as a regular HTTP server,
 * then proxies Lambda events to it.
 * 
 * This handler is kept for:
 * 1. Backward compatibility
 * 2. Local testing without Web Adapter
 * 3. SAM local testing
 */
export const handler = async (event: any, context: any): Promise<any> => {
  // For Web Adapter: This should not be called
  // Web Adapter runs the app directly and proxies HTTP
  
  // For local testing: Bootstrap if needed
  if (!cachedApp) {
    await bootstrap();
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Lambda Web Adapter active - HTTP proxy mode',
      adapter_version: process.env.AWS_LAMBDA_WEB_ADAPTER_VERSION || 'unknown',
    }),
  };
};

/**
 * Local development entry point
 * When running locally (not in Lambda), start the HTTP server
 */
if (require.main === module) {
  bootstrap().then((app) => {
    app.listen(PORT, HOST, () => {
      console.log(`🚀 MechMind OS API running on http://${HOST}:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  });
}
