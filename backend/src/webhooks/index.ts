/**
 * Webhooks Module
 * Endpoint per integrazioni con servizi esterni
 */

import {
  Injectable,
  Logger,
  Controller,
  Post,
  Body,
  Headers,
  HttpException,
  HttpStatus,
  Req,
  Param,
} from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

// ==================== INTERFACES ====================

export interface WebhookPayload {
  event: string;
  data: Record<string, any>;
  timestamp: Date;
  source: string;
}

export interface WebhookResponse {
  success: boolean;
  message: string;
  processedAt: Date;
}

export interface WebhookConfig {
  secret: string;
  verifySignature?: boolean;
  allowedEvents?: string[];
  retryAttempts?: number;
}

// ==================== SEGMENT WEBHOOK ====================

export interface SegmentEvent {
  type: 'track' | 'identify' | 'page' | 'screen' | 'group' | 'alias';
  event?: string;
  userId?: string;
  anonymousId?: string;
  properties?: Record<string, any>;
  traits?: Record<string, any>;
  context?: Record<string, any>;
  timestamp?: string;
  integrations?: Record<string, boolean>;
}

@Injectable()
export class SegmentWebhookService {
  private readonly logger = new Logger(SegmentWebhookService.name);

  constructor(private readonly configService: ConfigService) {}

  async handleEvent(event: SegmentEvent): Promise<WebhookResponse> {
    this.logger.debug(`Processing Segment event: ${event.type}`, event.event);

    try {
      switch (event.type) {
        case 'track':
          await this.handleTrackEvent(event);
          break;
        case 'identify':
          await this.handleIdentifyEvent(event);
          break;
        case 'page':
          await this.handlePageEvent(event);
          break;
        default:
          this.logger.warn(`Unhandled Segment event type: ${event.type}`);
      }

      return {
        success: true,
        message: `Event ${event.type} processed successfully`,
        processedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Segment webhook error:', error.message);
      throw error;
    }
  }

  private async handleTrackEvent(event: SegmentEvent): Promise<void> {
    const { event: eventName, userId, properties } = event;

    // Map Segment events to internal analytics
    const eventMap: Record<string, string> = {
      'Booking Created': 'booking.created',
      'Booking Cancelled': 'booking.cancelled',
      'Customer Registered': 'customer.registered',
      'Invoice Paid': 'invoice.paid',
      'Vehicle Added': 'vehicle.added',
    };

    const internalEvent = (eventName && eventMap[eventName]) || eventName || 'unknown';

    // TODO: Emit to internal event bus or analytics service
    this.logger.log(`Analytics event: ${internalEvent}`, { userId, properties });
  }

  private async handleIdentifyEvent(event: SegmentEvent): Promise<void> {
    const { userId, traits } = event;

    // Update user profile in internal systems
    this.logger.log(`User identified: ${userId}`, traits);
  }

  private async handlePageEvent(event: SegmentEvent): Promise<void> {
    const { userId, properties } = event;

    this.logger.log(`Page viewed by ${userId}`, properties);
  }

  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = createHmac('sha1', secret).update(payload).digest('hex');

    return signature === expectedSignature || signature === `sha1=${expectedSignature}`;
  }
}

// ==================== ZAPIER WEBHOOK ====================

export interface ZapierPayload {
  hookUrl: string;
  event: string;
  data: Record<string, any>;
  auth?: Record<string, string>;
}

@Injectable()
export class ZapierWebhookService {
  private readonly logger = new Logger(ZapierWebhookService.name);

  constructor(private readonly configService: ConfigService) {}

  async handleIncoming(payload: ZapierPayload): Promise<WebhookResponse> {
    this.logger.debug(`Processing Zapier event: ${payload.event}`);

    try {
      // Execute automation workflow
      const result = await this.executeAutomation(payload.event, payload.data);

      return {
        success: true,
        message: `Automation ${payload.event} executed: ${result}`,
        processedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Zapier webhook error:', error.message);
      throw error;
    }
  }

  async triggerZap(hookUrl: string, data: Record<string, any>): Promise<boolean> {
    try {
      const response = await fetch(hookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          timestamp: new Date().toISOString(),
          source: 'mechmind-os',
        }),
      });

      return response.ok;
    } catch (error) {
      this.logger.error('Trigger Zap error:', error.message);
      return false;
    }
  }

  private async executeAutomation(event: string, data: Record<string, any>): Promise<string> {
    const automations: Record<string, () => Promise<string>> = {
      create_booking: async () => {
        // Create booking from external trigger
        return 'booking_created';
      },
      update_customer: async () => {
        // Update customer from external trigger
        return 'customer_updated';
      },
      send_notification: async () => {
        // Send notification
        return 'notification_sent';
      },
    };

    const automation = automations[event];
    if (!automation) {
      throw new Error(`Unknown automation: ${event}`);
    }

    return automation();
  }
}

// ==================== SLACK WEBHOOK ====================

export interface SlackEvent {
  type: string;
  challenge?: string;
  team_id?: string;
  api_app_id?: string;
  event?: {
    type: string;
    user?: string;
    channel?: string;
    text?: string;
    ts?: string;
    thread_ts?: string;
  };
  event_id?: string;
  event_time?: number;
}

export interface SlackSlashCommand {
  token: string;
  team_id: string;
  team_domain: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string;
  response_url: string;
  trigger_id: string;
}

@Injectable()
export class SlackWebhookService {
  private readonly logger = new Logger(SlackWebhookService.name);
  private readonly botToken: string;

  constructor(private readonly configService: ConfigService) {
    this.botToken = this.configService.get('SLACK_BOT_TOKEN') || '';
  }

  async handleEvent(event: SlackEvent): Promise<{ challenge?: string; ok?: boolean }> {
    // URL verification challenge
    if (event.type === 'url_verification' && event.challenge) {
      return { challenge: event.challenge };
    }

    // Process event
    if (event.event) {
      await this.processSlackEvent(event.event);
    }

    return { ok: true };
  }

  async handleSlashCommand(command: SlackSlashCommand): Promise<any> {
    this.logger.debug(`Slack command received: ${command.command}`);

    const handlers: Record<string, (cmd: SlackSlashCommand) => Promise<any>> = {
      '/mechmind': async cmd => this.handleMechMindCommand(cmd),
      '/booking': async cmd => this.handleBookingCommand(cmd),
      '/customer': async cmd => this.handleCustomerCommand(cmd),
    };

    const handler = handlers[command.command];
    if (!handler) {
      return {
        response_type: 'ephemeral',
        text: `Unknown command: ${command.command}`,
      };
    }

    return handler(command);
  }

  async sendMessage(channel: string, message: any): Promise<boolean> {
    if (!this.botToken) {
      this.logger.warn('Slack bot token not configured');
      return false;
    }

    try {
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel,
          ...message,
        }),
      });

      const data = await response.json();
      return data.ok;
    } catch (error) {
      this.logger.error('Send Slack message error:', error.message);
      return false;
    }
  }

  private async processSlackEvent(event: SlackEvent['event']): Promise<void> {
    if (!event) return;

    switch (event.type) {
      case 'app_mention':
        await this.handleAppMention(event);
        break;
      case 'message':
        if (event.text?.includes('urgent')) {
          await this.handleUrgentMessage(event);
        }
        break;
      default:
        this.logger.debug(`Unhandled Slack event: ${event.type}`);
    }
  }

  private async handleAppMention(event: SlackEvent['event']): Promise<void> {
    // Respond to app mention
    this.logger.log(`App mentioned in channel ${event?.channel}`);
  }

  private async handleUrgentMessage(event: SlackEvent['event']): Promise<void> {
    // Handle urgent messages
    this.logger.log(`Urgent message detected in channel ${event?.channel}`);
  }

  private async handleMechMindCommand(command: SlackSlashCommand): Promise<any> {
    const args = command.text.split(' ');
    const subcommand = args[0];

    switch (subcommand) {
      case 'status':
        return {
          response_type: 'ephemeral',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*MechMind OS Status*\n✅ All systems operational',
              },
            },
          ],
        };
      case 'help':
        return {
          response_type: 'ephemeral',
          text: 'Available commands:\n• `/mechmind status` - System status\n• `/mechmind help` - Show this help',
        };
      default:
        return {
          response_type: 'ephemeral',
          text: 'Use `/mechmind help` for available commands',
        };
    }
  }

  private async handleBookingCommand(command: SlackSlashCommand): Promise<any> {
    return {
      response_type: 'ephemeral',
      text: `Booking command received: ${command.text}`,
    };
  }

  private async handleCustomerCommand(command: SlackSlashCommand): Promise<any> {
    return {
      response_type: 'ephemeral',
      text: `Customer command received: ${command.text}`,
    };
  }

  verifySignature(body: string, signature: string, timestamp: string, secret: string): boolean {
    const basestring = `v0:${timestamp}:${body}`;
    const mySignature = 'v0=' + createHmac('sha256', secret).update(basestring).digest('hex');

    try {
      return mySignature === signature;
    } catch {
      return false;
    }
  }
}

// ==================== CRM WEBHOOK (Salesforce/HubSpot) ====================

export interface CRMEvent {
  provider: 'salesforce' | 'hubspot' | 'pipedrive';
  event: string;
  objectType: string;
  objectId: string;
  properties: Record<string, any>;
  timestamp: Date;
}

@Injectable()
export class CRMWebhookService {
  private readonly logger = new Logger(CRMWebhookService.name);

  constructor(private readonly configService: ConfigService) {}

  async handleEvent(event: CRMEvent): Promise<WebhookResponse> {
    this.logger.debug(`Processing ${event.provider} event: ${event.event}`);

    try {
      switch (event.provider) {
        case 'salesforce':
          await this.handleSalesforceEvent(event);
          break;
        case 'hubspot':
          await this.handleHubSpotEvent(event);
          break;
        case 'pipedrive':
          await this.handlePipedriveEvent(event);
          break;
      }

      return {
        success: true,
        message: `${event.provider} event processed`,
        processedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('CRM webhook error:', error.message);
      throw error;
    }
  }

  private async handleSalesforceEvent(event: CRMEvent): Promise<void> {
    const { event: eventType, objectType, properties } = event;

    if (objectType === 'Contact' || objectType === 'Lead') {
      // Sync customer data
      this.logger.log(`Syncing Salesforce ${objectType}: ${properties.Email}`);
    } else if (objectType === 'Opportunity') {
      // Sync booking/opportunity
      this.logger.log(`Syncing Salesforce Opportunity: ${properties.Name}`);
    }
  }

  private async handleHubSpotEvent(event: CRMEvent): Promise<void> {
    const { event: eventType, objectType, properties } = event;

    // HubSpot webhook format
    this.logger.log(`HubSpot ${objectType} ${eventType}`, properties);
  }

  private async handlePipedriveEvent(event: CRMEvent): Promise<void> {
    const { event: eventType, objectType, properties } = event;

    this.logger.log(`Pipedrive ${objectType} ${eventType}`, properties);
  }

  async syncToCRM(
    provider: 'salesforce' | 'hubspot' | 'pipedrive',
    data: Record<string, any>,
  ): Promise<boolean> {
    const configs = {
      salesforce: {
        url: this.configService.get('SALESFORCE_API_URL'),
        token: this.configService.get('SALESFORCE_ACCESS_TOKEN'),
      },
      hubspot: {
        url: 'https://api.hubapi.com',
        token: this.configService.get('HUBSPOT_API_KEY'),
      },
      pipedrive: {
        url: this.configService.get('PIPEDRIVE_API_URL'),
        token: this.configService.get('PIPEDRIVE_API_TOKEN'),
      },
    };

    const config = configs[provider];
    if (!config.token) {
      this.logger.warn(`${provider} not configured`);
      return false;
    }

    try {
      // Implementation depends on CRM
      this.logger.log(`Syncing to ${provider}`, data);
      return true;
    } catch (error) {
      this.logger.error(`Sync to ${provider} failed:`, error.message);
      return false;
    }
  }
}

// ==================== WEBHOOK CONTROLLER ====================

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly segmentService: SegmentWebhookService,
    private readonly zapierService: ZapierWebhookService,
    private readonly slackService: SlackWebhookService,
    private readonly crmService: CRMWebhookService,
    private readonly configService: ConfigService,
  ) {}

  @Post('segment')
  async handleSegment(
    @Body() payload: SegmentEvent,
    @Headers('x-signature') signature: string,
    @Req() req: Request,
  ): Promise<WebhookResponse> {
    // Verify signature if configured
    const secret = this.configService.get('SEGMENT_WEBHOOK_SECRET');
    if (secret && signature) {
      const body = JSON.stringify(req.body);
      if (!this.segmentService.verifySignature(body, signature, secret)) {
        throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
      }
    }

    return this.segmentService.handleEvent(payload);
  }

  @Post('zapier')
  async handleZapier(
    @Body() payload: ZapierPayload,
    @Headers('x-zapier-secret') secret: string,
  ): Promise<WebhookResponse> {
    const expectedSecret = this.configService.get('ZAPIER_WEBHOOK_SECRET');
    if (expectedSecret && secret !== expectedSecret) {
      throw new HttpException('Invalid secret', HttpStatus.UNAUTHORIZED);
    }

    return this.zapierService.handleIncoming(payload);
  }

  @Post('slack/events')
  async handleSlackEvents(
    @Body() payload: SlackEvent,
    @Headers('x-slack-signature') signature: string,
    @Headers('x-slack-request-timestamp') timestamp: string,
    @Req() req: Request,
  ): Promise<any> {
    // Verify Slack signature
    const secret = this.configService.get('SLACK_SIGNING_SECRET');
    if (secret && signature && timestamp) {
      const body = (req as any).rawBody || JSON.stringify(req.body);

      // Check timestamp (prevent replay attacks)
      const requestTimestamp = parseInt(timestamp, 10);
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - requestTimestamp) > 300) {
        throw new HttpException('Request too old', HttpStatus.UNAUTHORIZED);
      }

      if (!this.slackService.verifySignature(body, signature, timestamp, secret)) {
        throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
      }
    }

    return this.slackService.handleEvent(payload);
  }

  @Post('slack/commands')
  async handleSlackCommands(
    @Body() payload: SlackSlashCommand,
    @Headers('x-slack-signature') signature: string,
    @Headers('x-slack-request-timestamp') timestamp: string,
    @Req() req: Request,
  ): Promise<any> {
    // Verify signature
    const secret = this.configService.get('SLACK_SIGNING_SECRET');
    if (secret && signature && timestamp) {
      const body = (req as any).rawBody || JSON.stringify(req.body);
      if (!this.slackService.verifySignature(body, signature, timestamp, secret)) {
        throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
      }
    }

    return this.slackService.handleSlashCommand(payload);
  }

  @Post('crm/:provider')
  async handleCRM(
    @Body() payload: CRMEvent | any,
    @Param('provider') provider: string,
    @Headers('x-crm-signature') signature: string,
  ): Promise<WebhookResponse> {
    const validProviders = ['salesforce', 'hubspot', 'pipedrive'];
    if (!validProviders.includes(provider)) {
      throw new HttpException('Invalid provider', HttpStatus.BAD_REQUEST);
    }

    // Normalize payload based on provider
    const event: CRMEvent = this.normalizeCRMEvent(provider as any, payload);

    return this.crmService.handleEvent(event);
  }

  private normalizeCRMEvent(
    provider: 'salesforce' | 'hubspot' | 'pipedrive',
    payload: any,
  ): CRMEvent {
    // Normalize different CRM webhook formats to common structure
    switch (provider) {
      case 'salesforce':
        return {
          provider,
          event: payload.event?.type || 'unknown',
          objectType: payload.sobjectType || 'Unknown',
          objectId: payload.id,
          properties: payload,
          timestamp: new Date(),
        };
      case 'hubspot':
        return {
          provider,
          event: payload.subscriptionType || 'unknown',
          objectType: payload.objectType || 'Unknown',
          objectId: payload.objectId,
          properties: payload.properties || payload,
          timestamp: new Date(payload.timestamp) || new Date(),
        };
      case 'pipedrive':
        return {
          provider,
          event: payload.event || 'unknown',
          objectType: payload.meta?.object || 'Unknown',
          objectId: payload.data?.id,
          properties: payload.data || payload,
          timestamp: new Date(),
        };
    }
  }
}

// Export all services
export const WebhookServices = [
  SegmentWebhookService,
  ZapierWebhookService,
  SlackWebhookService,
  CRMWebhookService,
];
