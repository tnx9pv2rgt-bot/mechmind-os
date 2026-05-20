import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RawBodyRequest } from '@nestjs/common/interfaces';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import * as crypto from 'crypto';
import { BnplService } from '../services/bnpl.service';

@ApiTags('Webhook Scalapay')
@Controller('webhooks/scalapay')
export class BnplWebhookController {
  private readonly logger = new Logger(BnplWebhookController.name);

  constructor(
    private readonly bnplService: BnplService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle Scalapay BNPL webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processato' })
  @ApiResponse({ status: 400, description: 'Firma non valida' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-scalapay-hmac-sha256') hmacSignature: string,
  ): Promise<{ received: true }> {
    const secret = this.configService.get<string>('SCALAPAY_WEBHOOK_SECRET');

    if (!secret) {
      throw new InternalServerErrorException('SCALAPAY_WEBHOOK_SECRET non configurato');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Raw body non disponibile');
    }

    if (!hmacSignature) {
      throw new BadRequestException('Missing x-scalapay-hmac-sha256 header');
    }

    // Verify HMAC signature
    const computedHmac = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');

    try {
      const isValid = crypto.timingSafeEqual(Buffer.from(computedHmac), Buffer.from(hmacSignature));
      if (!isValid) {
        throw new BadRequestException('Firma Scalapay non valida');
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error('Scalapay webhook signature verification failed');
      throw new BadRequestException('Firma Scalapay non valida');
    }

    const event = JSON.parse(rawBody.toString()) as {
      orderId: string;
      status: 'APPROVED' | 'DECLINED' | 'COMPLETED';
    };

    await this.bnplService.handleBnplWebhook(event.orderId, event.status);
    this.logger.log(`Scalapay webhook processed: order ${event.orderId}, status ${event.status}`);

    return { received: true };
  }
}
