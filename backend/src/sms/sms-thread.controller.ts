import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../auth/decorators/current-user.decorator';
import { SmsThreadService } from './sms-thread.service';
import { SendSmsDto, InboundSmsDto } from './dto/sms.dto';
import { RedisService } from '../common/services/redis.service';

@ApiTags('SMS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sms')
export class SmsThreadController {
  constructor(private readonly smsThreadService: SmsThreadService) {}

  @Get('threads')
  @ApiOperation({ summary: 'List SMS threads' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Threads retrieved successfully' })
  async getThreads(
    @CurrentTenant() tenantId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{ success: boolean; data: unknown[]; meta: { total: number } }> {
    const result = await this.smsThreadService.getThreads(tenantId, limit, offset);
    return {
      success: true,
      data: result.threads,
      meta: { total: result.total },
    };
  }

  @Get('threads/:id/messages')
  @ApiOperation({ summary: 'Get messages for a thread' })
  @ApiParam({ name: 'id', description: 'Thread ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  async getMessages(
    @CurrentTenant() tenantId: string,
    @Param('id') threadId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{ success: boolean; data: unknown[]; meta: { total: number } }> {
    const result = await this.smsThreadService.getMessages(tenantId, threadId, limit, offset);
    return {
      success: true,
      data: result.messages,
      meta: { total: result.total },
    };
  }

  @Post('threads/:id/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send SMS message in a thread' })
  @ApiParam({ name: 'id', description: 'Thread ID' })
  @ApiResponse({ status: 200, description: 'Message sent successfully' })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  async sendMessage(
    @CurrentTenant() tenantId: string,
    @Param('id') threadId: string,
    @Body() dto: SendSmsDto,
  ): Promise<{ success: boolean; data: unknown }> {
    const message = await this.smsThreadService.sendMessage(tenantId, threadId, dto.body);
    return {
      success: true,
      data: message,
    };
  }
}

/**
 * Twilio inbound webhook controller — no auth guard.
 * Verifies Twilio request signature using HMAC-SHA1 (X-Twilio-Signature header).
 */
@ApiTags('SMS Webhooks')
@Controller('sms/webhook')
export class SmsWebhookController {
  private readonly logger = new Logger(SmsWebhookController.name);

  constructor(
    private readonly smsThreadService: SmsThreadService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {}

  @Post('inbound')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Twilio inbound SMS webhook' })
  @ApiResponse({ status: 200, description: 'Inbound message received' })
  @ApiResponse({ status: 401, description: 'Invalid Twilio signature' })
  async receiveInbound(
    @Body() dto: InboundSmsDto,
    @Headers('x-twilio-signature') twilioSignature: string,
    @Headers('x-twilio-timestamp') twilioTimestamp: string,
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: Request,
  ): Promise<{ success: boolean; data: unknown }> {
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');

    if (!tenantId) {
      this.logger.error('Missing X-Tenant-Id header in Twilio webhook');
      throw new UnauthorizedException('Missing X-Tenant-Id header');
    }

    if (authToken) {
      if (!twilioSignature) {
        throw new UnauthorizedException('Missing X-Twilio-Signature header');
      }

      this.validateTwilioTimestamp(twilioTimestamp);

      const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      const params = req.body as Record<string, string>;
      const data =
        url +
        Object.keys(params)
          .sort()
          // eslint-disable-next-line security/detect-object-injection
          .reduce((acc, key) => acc + key + params[key], '');
      const expectedSignature = crypto
        .createHmac('sha1', authToken)
        .update(Buffer.from(data, 'utf-8'))
        .digest('base64');

      if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(twilioSignature))) {
        this.logger.warn('Invalid Twilio webhook signature');
        throw new UnauthorizedException('Invalid Twilio signature');
      }
    } else {
      this.logger.warn(
        'TWILIO_AUTH_TOKEN not configured — skipping webhook signature verification',
      );
    }

    // Replay attack prevention — RFC best practice: nonce (MessageSid) with TTL
    if (this.redis.isAvailable && dto.twilioSid) {
      const nonceKey = `sms:nonce:${dto.twilioSid}`;
      const already = await this.redis.get(nonceKey);
      if (already) {
        this.logger.warn(`Replay attack blocked: duplicate MessageSid ${dto.twilioSid}`);
        throw new UnauthorizedException('Duplicate request');
      }
      await this.redis.set(nonceKey, '1', 86400); // 24h — Twilio SID è globalmente unico
    } else if (!this.redis.isAvailable) {
      this.logger.warn('Redis unavailable — replay protection disabled');
    }

    const message = await this.smsThreadService.receiveInbound(
      tenantId,
      dto.phoneHash,
      dto.body,
      dto.twilioSid,
    );
    return {
      success: true,
      data: message,
    };
  }

  private validateTwilioTimestamp(twilioTimestamp: string): void {
    if (!twilioTimestamp) {
      throw new UnauthorizedException('Missing X-Twilio-Timestamp header');
    }
    const timestampSeconds = parseInt(twilioTimestamp, 10);
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (isNaN(timestampSeconds) || Math.abs(nowSeconds - timestampSeconds) > 300) {
      this.logger.warn('Twilio webhook timestamp too old or invalid');
      throw new UnauthorizedException('Webhook timestamp too old or invalid');
    }
  }
}
