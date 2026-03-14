/**
 * Webhooks Module
 * Gestione webhook per integrazioni con servizi esterni
 */

import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigModule } from '@nestjs/config';
import {
  WebhookController,
  SegmentWebhookService,
  ZapierWebhookService,
  SlackWebhookService,
  CRMWebhookService,
} from './index';

@Module({
  imports: [ConfigModule],
  controllers: [WebhookController],
  providers: [SegmentWebhookService, ZapierWebhookService, SlackWebhookService, CRMWebhookService],
  exports: [SegmentWebhookService, ZapierWebhookService, SlackWebhookService, CRMWebhookService],
})
export class WebhooksModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply raw body middleware for Slack signature verification
    consumer
      .apply((req: Request, _res: Response, next: NextFunction) => {
        let data = '';
        req.setEncoding('utf8');
        req.on('data', (chunk: string) => {
          data += chunk;
        });
        req.on('end', () => {
          (req as Request & { rawBody: string }).rawBody = data;
          next();
        });
      })
      .forRoutes('webhooks/slack');
  }
}
