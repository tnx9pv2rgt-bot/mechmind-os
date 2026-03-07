import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  BadRequestException,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import * as crypto from 'crypto';

// Resend webhook event types
interface ResendWebhookEvent {
  type: 'email.sent' | 'email.delivered' | 'email.delivery_delayed' | 'email.complained' | 'email.bounced' | 'email.opened' | 'email.clicked';
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    status?: string;
  };
}

// Twilio webhook payload
interface TwilioWebhookPayload {
  MessageSid: string;
  MessageStatus: 'accepted' | 'queued' | 'sending' | 'sent' | 'failed' | 'delivered' | 'undelivered' | 'receiving' | 'received' | 'read';
  To: string;
  From: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

@ApiTags('Notifications - Webhooks')
@Controller('webhooks/notifications')
export class NotificationWebhookController {
  private readonly logger = new Logger(NotificationWebhookController.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Resend webhook handler for email delivery events
   */
  @Post('resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Resend email webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload' })
  async handleResendWebhook(
    @Body() payload: ResendWebhookEvent,
    @Headers('resend-signature') signature: string,
    @Headers('resend-timestamp') timestamp: string,
  ): Promise<{ received: boolean }> {
    // Verify webhook signature
    if (!this.verifyResendSignature(payload, signature, timestamp)) {
      this.logger.warn('Invalid Resend webhook signature');
      throw new UnauthorizedException('Invalid signature');
    }

    this.logger.log(`Resend webhook received: ${payload.type} for email ${payload.data.email_id}`);

    try {
      switch (payload.type) {
        case 'email.sent':
          await this.handleEmailSent(payload.data);
          break;
        case 'email.delivered':
          await this.handleEmailDelivered(payload.data);
          break;
        case 'email.delivery_delayed':
          await this.handleEmailDelayed(payload.data);
          break;
        case 'email.bounced':
          await this.handleEmailBounced(payload.data);
          break;
        case 'email.complained':
          await this.handleEmailComplained(payload.data);
          break;
        case 'email.opened':
          await this.handleEmailOpened(payload.data);
          break;
        case 'email.clicked':
          await this.handleEmailClicked(payload.data);
          break;
        default:
          this.logger.warn(`Unknown Resend event type: ${payload.type}`);
      }

      return { received: true };
    } catch (error) {
      this.logger.error(`Error processing Resend webhook: ${error.message}`);
      throw new BadRequestException('Failed to process webhook');
    }
  }

  /**
   * Twilio webhook handler for SMS delivery status
   */
  @Post('twilio')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Twilio SMS webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload' })
  async handleTwilioWebhook(
    @Body() payload: TwilioWebhookPayload,
    @Headers('x-twilio-signature') signature: string,
  ): Promise<{ received: boolean }> {
    this.logger.log(`Twilio webhook received: ${payload.MessageStatus} for message ${payload.MessageSid}`);

    try {
      switch (payload.MessageStatus) {
        case 'sent':
          await this.handleSmsSent(payload);
          break;
        case 'delivered':
          await this.handleSmsDelivered(payload);
          break;
        case 'failed':
          await this.handleSmsFailed(payload);
          break;
        case 'undelivered':
          await this.handleSmsUndelivered(payload);
          break;
        case 'read':
          await this.handleSmsRead(payload);
          break;
        default:
          this.logger.debug(`Twilio status update: ${payload.MessageStatus} for ${payload.MessageSid}`);
      }

      return { received: true };
    } catch (error) {
      this.logger.error(`Error processing Twilio webhook: ${error.message}`);
      // Twilio expects 200 even on error for delivery status callbacks
      return { received: true };
    }
  }

  /**
   * Twilio incoming SMS webhook (for replies)
   */
  @Post('twilio/incoming')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle incoming SMS replies' })
  async handleTwilioIncoming(
    @Body() payload: {
      From: string;
      To: string;
      Body: string;
      MessageSid: string;
    },
  ): Promise<string> {
    this.logger.log(`Incoming SMS from ${payload.From}: ${payload.Body}`);

    try {
      // Process the reply (e.g., handle STOP, INFO, etc.)
      await this.processIncomingSms(payload.From, payload.Body, payload.MessageSid);

      // Return empty TwiML response
      return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
    } catch (error) {
      this.logger.error(`Error processing incoming SMS: ${error.message}`);
      return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
    }
  }

  // Resend event handlers

  private async handleEmailSent(data: ResendWebhookEvent['data']): Promise<void> {
    this.logger.log(`Email ${data.email_id} sent to ${data.to.join(', ')}`);
    // Update notification status in database
    // await this.updateNotificationStatus(data.email_id, 'sent');
  }

  private async handleEmailDelivered(data: ResendWebhookEvent['data']): Promise<void> {
    this.logger.log(`Email ${data.email_id} delivered to ${data.to.join(', ')}`);
    // Update notification status
    // await this.updateNotificationStatus(data.email_id, 'delivered', new Date());
  }

  private async handleEmailDelayed(data: ResendWebhookEvent['data']): Promise<void> {
    this.logger.warn(`Email ${data.email_id} delivery delayed`);
    // Log for monitoring
    // Potentially trigger retry or alert
  }

  private async handleEmailBounced(data: ResendWebhookEvent['data']): Promise<void> {
    this.logger.error(`Email ${data.email_id} bounced from ${data.to.join(', ')}`);
    
    // Mark email as bounced in database
    // await this.updateNotificationStatus(data.email_id, 'bounced');
    
    // Potentially update customer record with invalid email flag
    // Potentially trigger fallback to SMS if available
  }

  private async handleEmailComplained(data: ResendWebhookEvent['data']): Promise<void> {
    this.logger.error(`Email ${data.email_id} marked as spam by ${data.to.join(', ')}`);
    
    // Log complaint
    // Update customer preferences to disable email
    // Alert admin
  }

  private async handleEmailOpened(data: ResendWebhookEvent['data']): Promise<void> {
    this.logger.debug(`Email ${data.email_id} opened`);
    // Track engagement
    // await this.trackEmailEngagement(data.email_id, 'opened');
  }

  private async handleEmailClicked(data: ResendWebhookEvent['data']): Promise<void> {
    this.logger.debug(`Email ${data.email_id} clicked`);
    // Track engagement
    // await this.trackEmailEngagement(data.email_id, 'clicked');
  }

  // Twilio event handlers

  private async handleSmsSent(payload: TwilioWebhookPayload): Promise<void> {
    this.logger.log(`SMS ${payload.MessageSid} sent to ${payload.To}`);
    // Update notification status
  }

  private async handleSmsDelivered(payload: TwilioWebhookPayload): Promise<void> {
    this.logger.log(`SMS ${payload.MessageSid} delivered to ${payload.To}`);
    // Update notification status
    // Calculate delivery time for analytics
  }

  private async handleSmsFailed(payload: TwilioWebhookPayload): Promise<void> {
    this.logger.error(`SMS ${payload.MessageSid} failed: ${payload.ErrorCode} - ${payload.ErrorMessage}`);
    
    // Update notification status
    // Trigger email fallback if appropriate
    // Alert if persistent failures
  }

  private async handleSmsUndelivered(payload: TwilioWebhookPayload): Promise<void> {
    this.logger.warn(`SMS ${payload.MessageSid} undelivered: ${payload.ErrorCode}`);
    
    // Similar to failed but temporary
    // May retry or fallback
  }

  private async handleSmsRead(payload: TwilioWebhookPayload): Promise<void> {
    this.logger.debug(`SMS ${payload.MessageSid} read by ${payload.To}`);
    // Track engagement (WhatsApp only)
  }

  private async processIncomingSms(
    from: string,
    body: string,
    messageSid: string,
  ): Promise<void> {
    const normalizedBody = body.trim().toUpperCase();

    switch (normalizedBody) {
      case 'STOP':
      case 'ARRESTA':
      case 'DISISCRIVIMI':
        await this.handleOptOut(from);
        break;
      case 'START':
      case 'AVVIA':
      case 'ISCRIVIMI':
        await this.handleOptIn(from);
        break;
      case 'INFO':
      case 'AIUTO':
        await this.sendHelpMessage(from);
        break;
      default:
        // Forward to customer service or process with AI
        this.logger.log(`Incoming SMS from ${from}: "${body}"`);
    }
  }

  private async handleOptOut(phone: string): Promise<void> {
    this.logger.log(`Opt-out received from ${phone}`);
    // Update customer preferences
    // Stop all promotional messages
  }

  private async handleOptIn(phone: string): Promise<void> {
    this.logger.log(`Opt-in received from ${phone}`);
    // Update customer preferences
    // Resume promotional messages
  }

  private async sendHelpMessage(phone: string): Promise<void> {
    this.logger.log(`Help requested by ${phone}`);
    // Send help instructions
  }

  // Security

  private verifyResendSignature(
    payload: ResendWebhookEvent,
    signature: string,
    timestamp: string,
  ): boolean {
    // Resend webhook verification
    // In production, implement proper signature verification
    // See: https://resend.com/docs/dashboard/webhooks
    
    const webhookSecret = this.configService.get<string>('RESEND_WEBHOOK_SECRET');
    if (!webhookSecret) {
      this.logger.warn('RESEND_WEBHOOK_SECRET not configured, skipping verification');
      return true;
    }

    try {
      const signedContent = `${timestamp}.${JSON.stringify(payload)}`;
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(signedContent)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch (error) {
      this.logger.error(`Signature verification failed: ${error.message}`);
      return false;
    }
  }

  // Database operations (placeholders)

  private async updateNotificationStatus(
    notificationId: string,
    status: string,
    timestamp?: Date,
  ): Promise<void> {
    // Implementation would update database
    this.logger.debug(`Update ${notificationId} status to ${status}`);
  }

  private async trackEmailEngagement(
    notificationId: string,
    action: 'opened' | 'clicked',
  ): Promise<void> {
    // Implementation would update analytics
    this.logger.debug(`Track ${action} for ${notificationId}`);
  }
}
