"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SegmentWebhookService_1, ZapierWebhookService_1, SlackWebhookService_1, CRMWebhookService_1, WebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookServices = exports.WebhookController = exports.CRMWebhookService = exports.SlackWebhookService = exports.ZapierWebhookService = exports.SegmentWebhookService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
let SegmentWebhookService = SegmentWebhookService_1 = class SegmentWebhookService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(SegmentWebhookService_1.name);
    }
    async handleEvent(event) {
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error('Segment webhook error:', message);
            throw error;
        }
    }
    async handleTrackEvent(event) {
        const { event: eventName, userId, properties } = event;
        const eventMap = {
            'Booking Created': 'booking.created',
            'Booking Cancelled': 'booking.cancelled',
            'Customer Registered': 'customer.registered',
            'Invoice Paid': 'invoice.paid',
            'Vehicle Added': 'vehicle.added',
        };
        const internalEvent = (eventName && eventMap[eventName]) || eventName || 'unknown';
        this.logger.log(`Analytics event: ${internalEvent}`, { userId, properties });
    }
    async handleIdentifyEvent(event) {
        const { userId, traits } = event;
        this.logger.log(`User identified: ${userId}`, traits);
    }
    async handlePageEvent(event) {
        const { userId, properties } = event;
        this.logger.log(`Page viewed by ${userId}`, properties);
    }
    verifySignature(payload, signature, secret) {
        const expectedSignature = (0, crypto_1.createHmac)('sha1', secret).update(payload).digest('hex');
        return signature === expectedSignature || signature === `sha1=${expectedSignature}`;
    }
};
exports.SegmentWebhookService = SegmentWebhookService;
exports.SegmentWebhookService = SegmentWebhookService = SegmentWebhookService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SegmentWebhookService);
let ZapierWebhookService = ZapierWebhookService_1 = class ZapierWebhookService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(ZapierWebhookService_1.name);
    }
    async handleIncoming(payload) {
        this.logger.debug(`Processing Zapier event: ${payload.event}`);
        try {
            const result = await this.executeAutomation(payload.event, payload.data);
            return {
                success: true,
                message: `Automation ${payload.event} executed: ${result}`,
                processedAt: new Date(),
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error('Zapier webhook error:', message);
            throw error;
        }
    }
    async triggerZap(hookUrl, data) {
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error('Trigger Zap error:', message);
            return false;
        }
    }
    async executeAutomation(event, _data) {
        const automations = {
            create_booking: async () => {
                return 'booking_created';
            },
            update_customer: async () => {
                return 'customer_updated';
            },
            send_notification: async () => {
                return 'notification_sent';
            },
        };
        const automation = automations[event];
        if (!automation) {
            throw new Error(`Unknown automation: ${event}`);
        }
        return automation();
    }
};
exports.ZapierWebhookService = ZapierWebhookService;
exports.ZapierWebhookService = ZapierWebhookService = ZapierWebhookService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ZapierWebhookService);
let SlackWebhookService = SlackWebhookService_1 = class SlackWebhookService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(SlackWebhookService_1.name);
        this.botToken = this.configService.get('SLACK_BOT_TOKEN') || '';
    }
    async handleEvent(event) {
        if (event.type === 'url_verification' && event.challenge) {
            return { challenge: event.challenge };
        }
        if (event.event) {
            await this.processSlackEvent(event.event);
        }
        return { ok: true };
    }
    async handleSlashCommand(command) {
        this.logger.debug(`Slack command received: ${command.command}`);
        const handlers = {
            '/mechmind': async (cmd) => this.handleMechMindCommand(cmd),
            '/booking': async (cmd) => this.handleBookingCommand(cmd),
            '/customer': async (cmd) => this.handleCustomerCommand(cmd),
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
    async sendMessage(channel, message) {
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error('Send Slack message error:', message);
            return false;
        }
    }
    async processSlackEvent(event) {
        if (!event)
            return;
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
    async handleAppMention(event) {
        this.logger.log(`App mentioned in channel ${event?.channel}`);
    }
    async handleUrgentMessage(event) {
        this.logger.log(`Urgent message detected in channel ${event?.channel}`);
    }
    async handleMechMindCommand(command) {
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
    async handleBookingCommand(command) {
        return {
            response_type: 'ephemeral',
            text: `Booking command received: ${command.text}`,
        };
    }
    async handleCustomerCommand(command) {
        return {
            response_type: 'ephemeral',
            text: `Customer command received: ${command.text}`,
        };
    }
    verifySignature(body, signature, timestamp, secret) {
        const basestring = `v0:${timestamp}:${body}`;
        const mySignature = 'v0=' + (0, crypto_1.createHmac)('sha256', secret).update(basestring).digest('hex');
        try {
            const sigBuffer = Buffer.from(signature);
            const expectedBuffer = Buffer.from(mySignature);
            if (sigBuffer.length !== expectedBuffer.length)
                return false;
            return (0, crypto_1.timingSafeEqual)(sigBuffer, expectedBuffer);
        }
        catch {
            return false;
        }
    }
};
exports.SlackWebhookService = SlackWebhookService;
exports.SlackWebhookService = SlackWebhookService = SlackWebhookService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SlackWebhookService);
let CRMWebhookService = CRMWebhookService_1 = class CRMWebhookService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(CRMWebhookService_1.name);
    }
    async handleEvent(event) {
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error('CRM webhook error:', message);
            throw error;
        }
    }
    async handleSalesforceEvent(event) {
        const { objectType, properties } = event;
        if (objectType === 'Contact' || objectType === 'Lead') {
            this.logger.log(`Syncing Salesforce ${objectType}: ${String(properties['Email'] ?? '')}`);
        }
        else if (objectType === 'Opportunity') {
            this.logger.log(`Syncing Salesforce Opportunity: ${String(properties['Name'] ?? '')}`);
        }
    }
    async handleHubSpotEvent(event) {
        const { event: eventName, objectType, properties } = event;
        this.logger.log(`HubSpot ${objectType} ${eventName}`, properties);
    }
    async handlePipedriveEvent(event) {
        const { event: eventName, objectType, properties } = event;
        this.logger.log(`Pipedrive ${objectType} ${eventName}`, properties);
    }
    async syncToCRM(provider, data) {
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Sync to ${provider} failed:`, message);
            return false;
        }
    }
    verifySignature(payload, signature, secret) {
        const expectedSignature = (0, crypto_1.createHmac)('sha256', secret).update(payload).digest('hex');
        try {
            const sigBuffer = Buffer.from(signature);
            const expectedBuffer = Buffer.from(expectedSignature);
            if (sigBuffer.length !== expectedBuffer.length)
                return false;
            return (0, crypto_1.timingSafeEqual)(sigBuffer, expectedBuffer);
        }
        catch {
            return false;
        }
    }
};
exports.CRMWebhookService = CRMWebhookService;
exports.CRMWebhookService = CRMWebhookService = CRMWebhookService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CRMWebhookService);
const VALID_CRM_PROVIDERS = ['salesforce', 'hubspot', 'pipedrive'];
let WebhookController = WebhookController_1 = class WebhookController {
    constructor(segmentService, zapierService, slackService, crmService, configService) {
        this.segmentService = segmentService;
        this.zapierService = zapierService;
        this.slackService = slackService;
        this.crmService = crmService;
        this.configService = configService;
        this.logger = new common_1.Logger(WebhookController_1.name);
    }
    async handleSegment(payload, signature, req) {
        const secret = this.configService.get('SEGMENT_WEBHOOK_SECRET');
        if (secret && signature) {
            const body = JSON.stringify(req.body);
            if (!this.segmentService.verifySignature(body, signature, secret)) {
                throw new common_1.HttpException('Invalid signature', common_1.HttpStatus.UNAUTHORIZED);
            }
        }
        return this.segmentService.handleEvent(payload);
    }
    async handleZapier(payload, secret) {
        const expectedSecret = this.configService.get('ZAPIER_WEBHOOK_SECRET');
        if (expectedSecret && secret !== expectedSecret) {
            throw new common_1.HttpException('Invalid secret', common_1.HttpStatus.UNAUTHORIZED);
        }
        return this.zapierService.handleIncoming(payload);
    }
    async handleSlackEvents(payload, signature, timestamp, req) {
        const secret = this.configService.get('SLACK_SIGNING_SECRET');
        if (secret && signature && timestamp) {
            const body = req.rawBody || JSON.stringify(req.body);
            const requestTimestamp = parseInt(timestamp, 10);
            const now = Math.floor(Date.now() / 1000);
            if (Math.abs(now - requestTimestamp) > 300) {
                throw new common_1.HttpException('Request too old', common_1.HttpStatus.UNAUTHORIZED);
            }
            if (!this.slackService.verifySignature(body, signature, timestamp, secret)) {
                throw new common_1.HttpException('Invalid signature', common_1.HttpStatus.UNAUTHORIZED);
            }
        }
        return this.slackService.handleEvent(payload);
    }
    async handleSlackCommands(payload, signature, timestamp, req) {
        const secret = this.configService.get('SLACK_SIGNING_SECRET');
        if (secret && signature && timestamp) {
            const body = req.rawBody || JSON.stringify(req.body);
            if (!this.slackService.verifySignature(body, signature, timestamp, secret)) {
                throw new common_1.HttpException('Invalid signature', common_1.HttpStatus.UNAUTHORIZED);
            }
        }
        return this.slackService.handleSlashCommand(payload);
    }
    async handleCRM(payload, provider, signature, req) {
        if (!VALID_CRM_PROVIDERS.includes(provider)) {
            throw new common_1.HttpException('Invalid provider', common_1.HttpStatus.BAD_REQUEST);
        }
        const validProvider = provider;
        const secretKey = `${validProvider.toUpperCase()}_WEBHOOK_SECRET`;
        const secret = this.configService.get(secretKey);
        if (secret && signature) {
            const body = JSON.stringify(req.body);
            if (!this.crmService.verifySignature(body, signature, secret)) {
                throw new common_1.HttpException('Invalid CRM signature', common_1.HttpStatus.UNAUTHORIZED);
            }
        }
        const event = this.normalizeCRMEvent(validProvider, payload);
        return this.crmService.handleEvent(event);
    }
    normalizeCRMEvent(provider, payload) {
        switch (provider) {
            case 'salesforce': {
                const sf = payload;
                return {
                    provider,
                    event: sf.event?.type || 'unknown',
                    objectType: sf.sobjectType || 'Unknown',
                    objectId: sf.id,
                    properties: sf,
                    timestamp: new Date(),
                };
            }
            case 'hubspot': {
                const hs = payload;
                return {
                    provider,
                    event: hs.subscriptionType || 'unknown',
                    objectType: hs.objectType || 'Unknown',
                    objectId: hs.objectId,
                    properties: hs.properties || hs,
                    timestamp: hs.timestamp ? new Date(hs.timestamp) : new Date(),
                };
            }
            case 'pipedrive': {
                const pd = payload;
                return {
                    provider,
                    event: pd.event || 'unknown',
                    objectType: pd.meta?.object || 'Unknown',
                    objectId: pd.data?.id || '',
                    properties: pd.data || pd,
                    timestamp: new Date(),
                };
            }
        }
    }
};
exports.WebhookController = WebhookController;
__decorate([
    (0, common_1.Post)('segment'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-signature')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "handleSegment", null);
__decorate([
    (0, common_1.Post)('zapier'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-zapier-secret')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "handleZapier", null);
__decorate([
    (0, common_1.Post)('slack/events'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-slack-signature')),
    __param(2, (0, common_1.Headers)('x-slack-request-timestamp')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "handleSlackEvents", null);
__decorate([
    (0, common_1.Post)('slack/commands'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-slack-signature')),
    __param(2, (0, common_1.Headers)('x-slack-request-timestamp')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "handleSlackCommands", null);
__decorate([
    (0, common_1.Post)('crm/:provider'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Param)('provider')),
    __param(2, (0, common_1.Headers)('x-crm-signature')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "handleCRM", null);
exports.WebhookController = WebhookController = WebhookController_1 = __decorate([
    (0, common_1.Controller)('webhooks'),
    __metadata("design:paramtypes", [SegmentWebhookService,
        ZapierWebhookService,
        SlackWebhookService,
        CRMWebhookService,
        config_1.ConfigService])
], WebhookController);
exports.WebhookServices = [
    SegmentWebhookService,
    ZapierWebhookService,
    SlackWebhookService,
    CRMWebhookService,
];
