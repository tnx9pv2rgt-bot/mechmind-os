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
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

// ==================== INTERFACES ====================

export interface RequestWithRawBody extends Request {
  rawBody?: string;
}

export interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
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

export interface SlackResponse {
  response_type?: 'ephemeral' | 'in_channel';
  text?: string;
  blocks?: Array<Record<string, unknown>>;
  challenge?: string;
  ok?: boolean;
}

// ==================== SEGMENT WEBHOOK ====================

export interface SegmentEvent {
  type: 'track' | 'identify' | 'page' | 'screen' | 'group' | 'alias';
  event?: string;
  userId?: string;
  anonymousId?: string;
  properties?: Record<string, unknown>;
  traits?: Record<string, unknown>;
  context?: Record<string, unknown>;
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Segment webhook error:', message);
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

    // Analytics events are logged; integration with EventEmitter2 can be added when AnalyticsModule needs real-time events
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
  data: Record<string, unknown>;
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Zapier webhook error:', message);
      throw error;
    }
  }

  async triggerZap(hookUrl: string, data: Record<string, unknown>): Promise<boolean> {
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Trigger Zap error:', message);
      return false;
    }
  }

  private async executeAutomation(event: string, _data: Record<string, unknown>): Promise<string> {
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
      throw new BadRequestException(`Unknown automation: ${event}`);
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

export interface SlackMessage {
  text?: string;
  blocks?: Array<Record<string, unknown>>;
  attachments?: Array<Record<string, unknown>>;
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

  async handleSlashCommand(command: SlackSlashCommand): Promise<SlackResponse> {
    this.logger.debug(`Slack command received: ${command.command}`);

    const handlers: Record<string, (cmd: SlackSlashCommand) => Promise<SlackResponse>> = {
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

  async sendMessage(channel: string, message: SlackMessage): Promise<boolean> {
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

      const data: { ok: boolean } = await response.json();
      return data.ok;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Send Slack message error:', message);
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

  private async handleMechMindCommand(command: SlackSlashCommand): Promise<SlackResponse> {
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

  private async handleBookingCommand(command: SlackSlashCommand): Promise<SlackResponse> {
    return {
      response_type: 'ephemeral',
      text: `Booking command received: ${command.text}`,
    };
  }

  private async handleCustomerCommand(command: SlackSlashCommand): Promise<SlackResponse> {
    return {
      response_type: 'ephemeral',
      text: `Customer command received: ${command.text}`,
    };
  }

  verifySignature(body: string, signature: string, timestamp: string, secret: string): boolean {
    const basestring = `v0:${timestamp}:${body}`;
    const mySignature = 'v0=' + createHmac('sha256', secret).update(basestring).digest('hex');

    try {
      const sigBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(mySignature);
      if (sigBuffer.length !== expectedBuffer.length) return false;
      return timingSafeEqual(sigBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }
}

// ==================== CRM WEBHOOK (Salesforce/HubSpot) ====================

interface SalesforcePayload {
  event?: { type?: string };
  sobjectType?: string;
  id: string;
  [key: string]: unknown;
}

interface HubSpotPayload {
  subscriptionType?: string;
  objectType?: string;
  objectId: string;
  properties?: Record<string, unknown>;
  timestamp?: number;
  [key: string]: unknown;
}

interface PipedrivePayload {
  event?: string;
  meta?: { object?: string };
  data?: { id?: string; [key: string]: unknown };
  [key: string]: unknown;
}

type CRMProviderPayload = SalesforcePayload | HubSpotPayload | PipedrivePayload;

export interface CRMEvent {
  provider: 'salesforce' | 'hubspot' | 'pipedrive';
  event: string;
  objectType: string;
  objectId: string;
  properties: Record<string, unknown>;
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('CRM webhook error:', message);
      throw error;
    }
  }

  private async handleSalesforceEvent(event: CRMEvent): Promise<void> {
    const { objectType, properties } = event;

    if (objectType === 'Contact' || objectType === 'Lead') {
      const rawEmail = String(properties['Email'] ?? '');
      const maskedEmail = rawEmail.length > 3 ? rawEmail.slice(0, 3) + '***@***' : '***';
      this.logger.log(`Syncing Salesforce ${objectType}: ${maskedEmail}`);
    } else if (objectType === 'Opportunity') {
      this.logger.log(`Syncing Salesforce Opportunity: ${String(properties['Name'] ?? '')}`);
    }
  }

  private async handleHubSpotEvent(event: CRMEvent): Promise<void> {
    const { event: eventName, objectType, properties } = event;

    this.logger.log(`HubSpot ${objectType} ${eventName}`, properties);
  }

  private async handlePipedriveEvent(event: CRMEvent): Promise<void> {
    const { event: eventName, objectType, properties } = event;

    this.logger.log(`Pipedrive ${objectType} ${eventName}`, properties);
  }

  async syncToCRM(
    provider: 'salesforce' | 'hubspot' | 'pipedrive',
    data: Record<string, unknown>,
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
      this.logger.log(`Syncing to ${provider}`, data);
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Sync to ${provider} failed:`, message);
      return false;
    }
  }

  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = createHmac('sha256', secret).update(payload).digest('hex');
    try {
      const sigBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedSignature);
      if (sigBuffer.length !== expectedBuffer.length) return false;
      return timingSafeEqual(sigBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }
}

// ==================== WEBHOOK CONTROLLER ====================

const VALID_CRM_PROVIDERS = ['salesforce', 'hubspot', 'pipedrive'] as const;
type CRMProvider = (typeof VALID_CRM_PROVIDERS)[number];

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
    @Req() req: RequestWithRawBody,
  ): Promise<{ challenge?: string; ok?: boolean }> {
    // Verify Slack signature
    const secret = this.configService.get('SLACK_SIGNING_SECRET');
    if (secret && signature && timestamp) {
      const body = req.rawBody || JSON.stringify(req.body);

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
    @Req() req: RequestWithRawBody,
  ): Promise<SlackResponse> {
    // Verify signature
    const secret = this.configService.get('SLACK_SIGNING_SECRET');
    if (secret && signature && timestamp) {
      const body = req.rawBody || JSON.stringify(req.body);
      if (!this.slackService.verifySignature(body, signature, timestamp, secret)) {
        throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
      }
    }

    return this.slackService.handleSlashCommand(payload);
  }

  @Post('crm/:provider')
  async handleCRM(
    @Body() payload: CRMProviderPayload,
    @Param('provider') provider: string,
    @Headers('x-crm-signature') signature: string,
    @Req() req: Request,
  ): Promise<WebhookResponse> {
    if (!VALID_CRM_PROVIDERS.includes(provider as CRMProvider)) {
      throw new HttpException('Invalid provider', HttpStatus.BAD_REQUEST);
    }

    const validProvider = provider as CRMProvider;

    // Verify CRM webhook signature
    const secretKey = `${validProvider.toUpperCase()}_WEBHOOK_SECRET`;
    const secret = this.configService.get<string>(secretKey);
    if (secret && signature) {
      const body = JSON.stringify(req.body);
      if (!this.crmService.verifySignature(body, signature, secret)) {
        throw new HttpException('Invalid CRM signature', HttpStatus.UNAUTHORIZED);
      }
    }

    // Normalize payload based on provider
    const event: CRMEvent = this.normalizeCRMEvent(validProvider, payload);

    return this.crmService.handleEvent(event);
  }

  private normalizeCRMEvent(provider: CRMProvider, payload: CRMProviderPayload): CRMEvent {
    // Normalize different CRM webhook formats to common structure
    switch (provider) {
      case 'salesforce': {
        const sf = payload as SalesforcePayload;
        return {
          provider,
          event: sf.event?.type || 'unknown',
          objectType: sf.sobjectType || 'Unknown',
          objectId: sf.id,
          properties: sf as unknown as Record<string, unknown>,
          timestamp: new Date(),
        };
      }
      case 'hubspot': {
        const hs = payload as HubSpotPayload;
        return {
          provider,
          event: hs.subscriptionType || 'unknown',
          objectType: hs.objectType || 'Unknown',
          objectId: hs.objectId,
          properties: hs.properties || (hs as unknown as Record<string, unknown>),
          timestamp: hs.timestamp ? new Date(hs.timestamp) : new Date(),
        };
      }
      case 'pipedrive': {
        const pd = payload as PipedrivePayload;
        return {
          provider,
          event: pd.event || 'unknown',
          objectType: pd.meta?.object || 'Unknown',
          objectId: pd.data?.id || '',
          properties:
            (pd.data as Record<string, unknown>) || (pd as unknown as Record<string, unknown>),
          timestamp: new Date(),
        };
      }
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
