import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBody } from '@nestjs/swagger';
import { VapiWebhookService } from '../services/vapi-webhook.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  VapiWebhookDto,
  VoiceWebhookResponseDto,
  TransferRequestDto,
} from '../dto/vapi-webhook.dto';

@ApiTags('Voice Webhooks')
@Controller('webhooks/vapi')
export class VoiceWebhookController {
  constructor(
    private readonly vapiWebhookService: VapiWebhookService,
    private readonly configService: ConfigService,
  ) {}

  @Post('call-event')
  @ApiOperation({
    summary: 'Handle Vapi call events',
    description: 'Receives call events from Vapi AI voice assistant',
  })
  @ApiHeader({
    name: 'X-Vapi-Signature',
    description: 'HMAC-SHA256 signature for webhook verification',
    required: true,
  })
  @ApiBody({ type: VapiWebhookDto })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    type: VoiceWebhookResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  async handleCallEvent(
    @Body() payload: VapiWebhookDto,
    @Headers('X-Vapi-Signature') signature: string,
    @Headers('X-Vapi-Timestamp') timestamp: string,
  ): Promise<VoiceWebhookResponseDto> {
    // Verify webhook signature
    if (!this.verifySignature(payload, signature, timestamp)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Validate timestamp (prevent replay attacks)
    if (!this.validateTimestamp(timestamp)) {
      throw new UnauthorizedException('Webhook timestamp too old');
    }

    // Process the webhook
    try {
      const result = await this.vapiWebhookService.processWebhook(payload);
      return {
        success: true,
        message: 'Webhook processed successfully',
        ...result,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to process webhook: ${error.message}`);
    }
  }

  @Post('transfer')
  @ApiOperation({
    summary: 'Handle transfer requests',
    description: 'Receives transfer requests when customer wants to speak to human',
  })
  @ApiHeader({
    name: 'X-Vapi-Signature',
    description: 'HMAC-SHA256 signature for webhook verification',
    required: true,
  })
  @ApiBody({ type: TransferRequestDto })
  async handleTransfer(
    @Body() payload: TransferRequestDto,
    @Headers('X-Vapi-Signature') signature: string,
  ): Promise<VoiceWebhookResponseDto> {
    // Verify signature
    if (!this.verifySignature(payload, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const result = await this.vapiWebhookService.handleTransfer(payload);

    return {
      success: true,
      message: 'Transfer handled successfully',
      escalation: result,
    };
  }

  @Post('health')
  @ApiOperation({
    summary: 'Health check endpoint',
    description: 'Simple endpoint for Vapi to verify webhook URL is accessible',
  })
  async healthCheck(): Promise<{ status: string }> {
    return { status: 'ok' };
  }

  /**
   * Verify HMAC-SHA256 signature
   */
  private verifySignature(payload: any, signature: string, timestamp?: string): boolean {
    const secret = this.configService.get<string>('VAPI_WEBHOOK_SECRET');

    if (!secret) {
      console.error('VAPI_WEBHOOK_SECRET not configured - rejecting all webhooks');
      return false;
    }

    if (!signature) {
      return false;
    }

    // Construct the signed payload
    const signedPayload = timestamp
      ? `${timestamp}.${JSON.stringify(payload)}`
      : JSON.stringify(payload);

    // Compute HMAC
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    // Use timing-safe comparison
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    } catch {
      return false;
    }
  }

  /**
   * Validate timestamp to prevent replay attacks
   */
  private validateTimestamp(timestamp: string): boolean {
    if (!timestamp) {
      return true; // Allow if no timestamp (backward compatibility)
    }

    const timestampMs = parseInt(timestamp, 10);
    if (isNaN(timestampMs)) {
      return false;
    }

    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    // Timestamp should be within 5 minutes of current time
    return Math.abs(now - timestampMs) < fiveMinutes;
  }
}
