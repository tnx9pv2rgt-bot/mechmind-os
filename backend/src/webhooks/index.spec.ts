import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { createHmac } from 'crypto';
import {
  WebhookController,
  SegmentWebhookService,
  ZapierWebhookService,
  SlackWebhookService,
  CRMWebhookService,
  SegmentEvent,
  ZapierPayload,
  SlackEvent,
  SlackSlashCommand,
  CRMEvent,
} from './index';

// ==================== SEGMENT WEBHOOK TESTS ====================

describe('SegmentWebhookService', () => {
  let service: SegmentWebhookService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mockConfig = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SegmentWebhookService, { provide: ConfigService, useValue: mockConfig }],
    }).compile();

    service = module.get<SegmentWebhookService>(SegmentWebhookService);
  });

  describe('handleEvent', () => {
    it('processes track event successfully', async () => {
      const event: SegmentEvent = {
        type: 'track',
        event: 'Booking Created',
        userId: 'user-123',
        properties: { bookingId: 'booking-456' },
      };

      const result = await service.handleEvent(event);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toContain('track');
      expect(result.processedAt).toBeInstanceOf(Date);
    });

    it('processes identify event successfully', async () => {
      const event: SegmentEvent = {
        type: 'identify',
        userId: 'user-123',
        traits: { email: 'user@example.com', name: 'John' },
      };

      const result = await service.handleEvent(event);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toContain('identify');
    });

    it('processes page event successfully', async () => {
      const event: SegmentEvent = {
        type: 'page',
        userId: 'user-123',
        properties: { pageUrl: '/booking' },
      };

      const result = await service.handleEvent(event);

      expect(result.success).toBe(true);
      expect(result.message).toContain('page');
    });

    it('logs warning for unhandled event types', async () => {
      const event: SegmentEvent = {
        type: 'screen',
        userId: 'user-123',
      };

      const result = await service.handleEvent(event);

      expect(result.success).toBe(true);
    });

    it('throws error on unexpected exception', async () => {
      const event: SegmentEvent = { type: 'track', event: 'Test' };

      jest.spyOn(service as any, 'handleTrackEvent').mockRejectedValueOnce(new Error('DB error'));

      await expect(service.handleEvent(event)).rejects.toThrow();
    });

    it('maps Segment track events to internal events', async () => {
      const event: SegmentEvent = {
        type: 'track',
        event: 'Customer Registered',
        userId: 'user-123',
      };

      const result = await service.handleEvent(event);

      expect(result.success).toBe(true);
      expect(result.message).toContain('track');
    });
  });

  describe('verifySignature', () => {
    const secret = 'test-secret';
    const payload = 'test-payload';

    it('verifies valid hex signature', () => {
      const expectedSig = createHmac('sha1', secret).update(payload).digest('hex');

      const result = service.verifySignature(payload, expectedSig, secret);

      expect(result).toBe(true);
    });

    it('verifies valid sha1= prefixed signature', () => {
      const expectedSig = createHmac('sha1', secret).update(payload).digest('hex');
      const prefixedSig = `sha1=${expectedSig}`;

      const result = service.verifySignature(payload, prefixedSig, secret);

      expect(result).toBe(true);
    });

    it('rejects invalid signature', () => {
      const result = service.verifySignature(payload, 'invalid-sig', secret);

      expect(result).toBe(false);
    });

    it('returns false on timing error', () => {
      const result = service.verifySignature(payload, 'short', secret);

      expect(result).toBe(false);
    });
  });
});

// ==================== ZAPIER WEBHOOK TESTS ====================

describe('ZapierWebhookService', () => {
  let service: ZapierWebhookService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mockConfig = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ZapierWebhookService, { provide: ConfigService, useValue: mockConfig }],
    }).compile();

    service = module.get<ZapierWebhookService>(ZapierWebhookService);
  });

  describe('handleIncoming', () => {
    it('processes create_booking automation', async () => {
      const payload: ZapierPayload = {
        hookUrl: 'https://zapier.example.com/hook',
        event: 'create_booking',
        data: { customerId: 'cust-123' },
      };

      const result = await service.handleIncoming(payload);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toContain('create_booking');
      expect(result.processedAt).toBeInstanceOf(Date);
    });

    it('processes update_customer automation', async () => {
      const payload: ZapierPayload = {
        hookUrl: 'https://zapier.example.com/hook',
        event: 'update_customer',
        data: { customerId: 'cust-456' },
      };

      const result = await service.handleIncoming(payload);

      expect(result.success).toBe(true);
      expect(result.message).toContain('update_customer');
    });

    it('processes send_notification automation', async () => {
      const payload: ZapierPayload = {
        hookUrl: 'https://zapier.example.com/hook',
        event: 'send_notification',
        data: { userId: 'user-123' },
      };

      const result = await service.handleIncoming(payload);

      expect(result.success).toBe(true);
      expect(result.message).toContain('send_notification');
    });

    it('throws error for unknown automation', async () => {
      const payload: ZapierPayload = {
        hookUrl: 'https://zapier.example.com/hook',
        event: 'unknown_event',
        data: {},
      };

      await expect(service.handleIncoming(payload)).rejects.toThrow(BadRequestException);
    });
  });

  describe('triggerZap', () => {
    it('triggers zap successfully', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' }),
      });

      const result = await service.triggerZap('https://hooks.zapier.com/test', { data: 'test' });

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://hooks.zapier.com/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    it('returns false on fetch error', async () => {
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'));

      const result = await service.triggerZap('https://hooks.zapier.com/test', {});

      expect(result).toBe(false);
    });

    it('returns false when response not ok', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      const result = await service.triggerZap('https://hooks.zapier.com/test', {});

      expect(result).toBe(false);
    });
  });
});

// ==================== SLACK WEBHOOK TESTS ====================

describe('SlackWebhookService', () => {
  let service: SlackWebhookService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mockConfig = { get: jest.fn().mockReturnValueOnce('xoxb-test-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SlackWebhookService, { provide: ConfigService, useValue: mockConfig }],
    }).compile();

    service = module.get<SlackWebhookService>(SlackWebhookService);
  });

  describe('handleEvent', () => {
    it('returns challenge for url_verification', async () => {
      const event: SlackEvent = {
        type: 'url_verification',
        challenge: 'test-challenge-123',
      };

      const result = await service.handleEvent(event);

      expect(result.challenge).toBe('test-challenge-123');
    });

    it('processes message_changed event', async () => {
      const event: SlackEvent = {
        type: 'event_callback',
        event: {
          type: 'message',
          user: 'U123',
          channel: 'C123',
          text: 'urgent: help needed',
          ts: '1234567890.123456',
        },
      };

      const result = await service.handleEvent(event);

      expect(result.ok).toBe(true);
    });

    it('processes app_mention event', async () => {
      const event: SlackEvent = {
        type: 'event_callback',
        event: {
          type: 'app_mention',
          user: 'U123',
          channel: 'C123',
          text: '@app help',
        },
      };

      const result = await service.handleEvent(event);

      expect(result.ok).toBe(true);
    });

    it('processes regular message without urgent keyword', async () => {
      const event: SlackEvent = {
        type: 'event_callback',
        event: {
          type: 'message',
          user: 'U123',
          channel: 'C123',
          text: 'regular message',
          ts: '1234567890.123456',
        },
      };

      const result = await service.handleEvent(event);

      expect(result.ok).toBe(true);
    });

    it('returns ok for event without event field', async () => {
      const event: SlackEvent = {
        type: 'event_callback',
      };

      const result = await service.handleEvent(event);

      expect(result.ok).toBe(true);
    });

    it('handles unhandled event type', async () => {
      const event: SlackEvent = {
        type: 'event_callback',
        event: {
          type: 'unknown_event_type',
          user: 'U123',
          channel: 'C123',
        },
      };

      const result = await service.handleEvent(event);

      expect(result.ok).toBe(true);
    });
  });

  describe('handleSlashCommand', () => {
    it('handles mechmind status command', async () => {
      const command: SlackSlashCommand = {
        token: 'verification_token',
        team_id: 'T123',
        team_domain: 'test-team',
        channel_id: 'C123',
        channel_name: 'general',
        user_id: 'U123',
        user_name: 'testuser',
        command: '/mechmind',
        text: 'status',
        response_url: 'https://hooks.slack.com/commands',
        trigger_id: 'trigger_id',
      };

      const result = await service.handleSlashCommand(command);

      expect(result.response_type).toBe('ephemeral');
      expect(result.blocks).toBeDefined();
    });

    it('handles mechmind help command', async () => {
      const command: SlackSlashCommand = {
        token: 'verification_token',
        team_id: 'T123',
        team_domain: 'test-team',
        channel_id: 'C123',
        channel_name: 'general',
        user_id: 'U123',
        user_name: 'testuser',
        command: '/mechmind',
        text: 'help',
        response_url: 'https://hooks.slack.com/commands',
        trigger_id: 'trigger_id',
      };

      const result = await service.handleSlashCommand(command);

      expect(result.response_type).toBe('ephemeral');
      expect(result.text).toContain('Available commands');
    });

    it('handles booking command', async () => {
      const command: SlackSlashCommand = {
        token: 'verification_token',
        team_id: 'T123',
        team_domain: 'test-team',
        channel_id: 'C123',
        channel_name: 'general',
        user_id: 'U123',
        user_name: 'testuser',
        command: '/booking',
        text: 'list',
        response_url: 'https://hooks.slack.com/commands',
        trigger_id: 'trigger_id',
      };

      const result = await service.handleSlashCommand(command);

      expect(result.response_type).toBe('ephemeral');
      expect(result.text).toContain('Booking command');
    });

    it('handles customer command', async () => {
      const command: SlackSlashCommand = {
        token: 'verification_token',
        team_id: 'T123',
        team_domain: 'test-team',
        channel_id: 'C123',
        channel_name: 'general',
        user_id: 'U123',
        user_name: 'testuser',
        command: '/customer',
        text: 'search',
        response_url: 'https://hooks.slack.com/commands',
        trigger_id: 'trigger_id',
      };

      const result = await service.handleSlashCommand(command);

      expect(result.response_type).toBe('ephemeral');
      expect(result.text).toContain('Customer command');
    });

    it('returns error for unknown command', async () => {
      const command: SlackSlashCommand = {
        token: 'verification_token',
        team_id: 'T123',
        team_domain: 'test-team',
        channel_id: 'C123',
        channel_name: 'general',
        user_id: 'U123',
        user_name: 'testuser',
        command: '/unknown',
        text: '',
        response_url: 'https://hooks.slack.com/commands',
        trigger_id: 'trigger_id',
      };

      const result = await service.handleSlashCommand(command);

      expect(result.text).toContain('Unknown command');
    });
  });

  describe('sendMessage', () => {
    it('sends Slack message successfully', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        json: async () => ({ ok: true }),
      });

      const result = await service.sendMessage('C123', { text: 'Hello' });

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://slack.com/api/chat.postMessage',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer xoxb-test-token',
          }),
        }),
      );
    });

    it('returns false when bot token not configured', async () => {
      const mockConfig = { get: jest.fn().mockReturnValueOnce(undefined) };
      const module = await Test.createTestingModule({
        providers: [SlackWebhookService, { provide: ConfigService, useValue: mockConfig }],
      }).compile();

      const newService = module.get<SlackWebhookService>(SlackWebhookService);
      const result = await newService.sendMessage('C123', { text: 'Hello' });

      expect(result).toBe(false);
    });

    it('returns false on fetch error', async () => {
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'));

      const result = await service.sendMessage('C123', { text: 'Hello' });

      expect(result).toBe(false);
    });

    it('returns false when API response not ok', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        json: async () => ({ ok: false, error: 'channel_not_found' }),
      });

      const result = await service.sendMessage('C999', { text: 'Hello' });

      expect(result).toBe(false);
    });
  });

  describe('verifySignature', () => {
    const secret = 'test-secret';
    const body = 'test-body';
    const timestamp = Math.floor(Date.now() / 1000).toString();

    it('verifies valid Slack signature', () => {
      const basestring = `v0:${timestamp}:${body}`;
      const signature = 'v0=' + createHmac('sha256', secret).update(basestring).digest('hex');

      const result = service.verifySignature(body, signature, timestamp, secret);

      expect(result).toBe(true);
    });

    it('rejects invalid Slack signature', () => {
      const result = service.verifySignature(body, 'v0=invalid', timestamp, secret);

      expect(result).toBe(false);
    });

    it('returns false on timing error', () => {
      const result = service.verifySignature(body, 'short-sig', timestamp, secret);

      expect(result).toBe(false);
    });
  });
});

// ==================== CRM WEBHOOK TESTS ====================

describe('CRMWebhookService', () => {
  let service: CRMWebhookService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mockConfig = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CRMWebhookService, { provide: ConfigService, useValue: mockConfig }],
    }).compile();

    service = module.get<CRMWebhookService>(CRMWebhookService);
  });

  describe('handleEvent', () => {
    it('processes Salesforce Contact event', async () => {
      const event: CRMEvent = {
        provider: 'salesforce',
        event: 'created',
        objectType: 'Contact',
        objectId: 'sf-123',
        properties: { Email: 'contact@example.com' },
        timestamp: new Date(),
      };

      const result = await service.handleEvent(event);

      expect(result.success).toBe(true);
      expect(result.message).toContain('salesforce');
    });

    it('processes Salesforce Lead event', async () => {
      const event: CRMEvent = {
        provider: 'salesforce',
        event: 'created',
        objectType: 'Lead',
        objectId: 'sf-456',
        properties: { Email: 'lead@example.com' },
        timestamp: new Date(),
      };

      const result = await service.handleEvent(event);

      expect(result.success).toBe(true);
    });

    it('processes Salesforce Opportunity event', async () => {
      const event: CRMEvent = {
        provider: 'salesforce',
        event: 'updated',
        objectType: 'Opportunity',
        objectId: 'sf-789',
        properties: { Name: 'Big Deal', Amount: 50000 },
        timestamp: new Date(),
      };

      const result = await service.handleEvent(event);

      expect(result.success).toBe(true);
    });

    it('processes HubSpot event successfully', async () => {
      const event: CRMEvent = {
        provider: 'hubspot',
        event: 'contact.creation',
        objectType: 'Contact',
        objectId: 'hs-456',
        properties: { email: 'hubspot@example.com' },
        timestamp: new Date(),
      };

      const result = await service.handleEvent(event);

      expect(result.success).toBe(true);
      expect(result.message).toContain('hubspot');
    });

    it('processes Pipedrive event successfully', async () => {
      const event: CRMEvent = {
        provider: 'pipedrive',
        event: 'added.person',
        objectType: 'person',
        objectId: 'pd-789',
        properties: { name: 'John Doe' },
        timestamp: new Date(),
      };

      const result = await service.handleEvent(event);

      expect(result.success).toBe(true);
      expect(result.message).toContain('pipedrive');
    });

    it('throws error on unexpected exception', async () => {
      const event: CRMEvent = {
        provider: 'salesforce',
        event: 'created',
        objectType: 'Contact',
        objectId: 'sf-123',
        properties: {},
        timestamp: new Date(),
      };

      jest
        .spyOn(service as any, 'handleSalesforceEvent')
        .mockRejectedValueOnce(new Error('DB error'));

      await expect(service.handleEvent(event)).rejects.toThrow();
    });
  });

  describe('syncToCRM', () => {
    it('returns false when Salesforce not configured', async () => {
      const mockConfig = { get: jest.fn().mockReturnValueOnce(undefined) };
      const module = await Test.createTestingModule({
        providers: [CRMWebhookService, { provide: ConfigService, useValue: mockConfig }],
      }).compile();

      const newService = module.get<CRMWebhookService>(CRMWebhookService);
      const result = await newService.syncToCRM('salesforce', { name: 'Test' });

      expect(result).toBe(false);
    });

    it('returns false when HubSpot not configured', async () => {
      const mockConfig = { get: jest.fn().mockReturnValueOnce(undefined) };
      const module = await Test.createTestingModule({
        providers: [CRMWebhookService, { provide: ConfigService, useValue: mockConfig }],
      }).compile();

      const newService = module.get<CRMWebhookService>(CRMWebhookService);
      const result = await newService.syncToCRM('hubspot', { name: 'Test' });

      expect(result).toBe(false);
    });

    it('syncs to configured Salesforce', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'SALESFORCE_API_URL') return 'https://salesforce.example.com';
          if (key === 'SALESFORCE_ACCESS_TOKEN') return 'sf-token';
          return undefined;
        }),
      };
      const module = await Test.createTestingModule({
        providers: [CRMWebhookService, { provide: ConfigService, useValue: mockConfig }],
      }).compile();

      const newService = module.get<CRMWebhookService>(CRMWebhookService);
      const result = await newService.syncToCRM('salesforce', { name: 'John' });

      expect(result).toBe(true);
    });
  });

  describe('verifySignature', () => {
    const secret = 'test-secret';
    const payload = 'test-payload';

    it('verifies valid CRM signature', () => {
      const expectedSig = createHmac('sha256', secret).update(payload).digest('hex');

      const result = service.verifySignature(payload, expectedSig, secret);

      expect(result).toBe(true);
    });

    it('rejects invalid CRM signature', () => {
      const result = service.verifySignature(payload, 'invalid-sig', secret);

      expect(result).toBe(false);
    });

    it('returns false on length mismatch', () => {
      const result = service.verifySignature(payload, 'short', secret);

      expect(result).toBe(false);
    });
  });
});

// ==================== WEBHOOK CONTROLLER TESTS ====================

describe('WebhookController', () => {
  let controller: WebhookController;
  let crmService: CRMWebhookService;

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe('POST /webhooks/segment', () => {
    it('handles Segment webhook with valid signature', async () => {
      const mockConfig = { get: jest.fn().mockReturnValueOnce('segment-secret') };
      const module = await Test.createTestingModule({
        controllers: [WebhookController],
        providers: [
          SegmentWebhookService,
          ZapierWebhookService,
          SlackWebhookService,
          CRMWebhookService,
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      controller = module.get<WebhookController>(WebhookController);
      const segmentService = module.get<SegmentWebhookService>(SegmentWebhookService);

      const payload: SegmentEvent = {
        type: 'track',
        event: 'Booking Created',
        userId: 'user-123',
        properties: { id: 'booking-456' },
      };

      const secret = 'segment-secret';
      const body = JSON.stringify(payload);
      const signature = createHmac('sha1', secret).update(body).digest('hex');

      const mockRequest = {
        body: payload,
      } as any;

      jest.spyOn(segmentService, 'handleEvent').mockResolvedValueOnce({
        success: true,
        message: 'Event processed',
        processedAt: new Date(),
      });

      const result = await controller.handleSegment(payload, signature, mockRequest);

      expect(result.success).toBe(true);
      expect(segmentService.handleEvent).toHaveBeenCalledWith(payload);
    });

    it('rejects Segment webhook with invalid signature', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'SEGMENT_WEBHOOK_SECRET') return 'segment-secret';
          return undefined;
        }),
      };
      const module = await Test.createTestingModule({
        controllers: [WebhookController],
        providers: [
          SegmentWebhookService,
          ZapierWebhookService,
          SlackWebhookService,
          CRMWebhookService,
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      controller = module.get<WebhookController>(WebhookController);

      const payload: SegmentEvent = {
        type: 'track',
        event: 'Test',
        userId: 'user-123',
      };

      const mockRequest = { body: payload } as any;

      await expect(controller.handleSegment(payload, 'invalid-sig', mockRequest)).rejects.toThrow(
        HttpException,
      );
    });

    it('allows Segment webhook without secret configured', async () => {
      const mockConfig = { get: jest.fn().mockReturnValueOnce(undefined) };
      const module = await Test.createTestingModule({
        controllers: [WebhookController],
        providers: [
          SegmentWebhookService,
          ZapierWebhookService,
          SlackWebhookService,
          CRMWebhookService,
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      controller = module.get<WebhookController>(WebhookController);
      const segmentService = module.get<SegmentWebhookService>(SegmentWebhookService);

      const payload: SegmentEvent = {
        type: 'track',
        event: 'Test',
        userId: 'user-123',
      };

      const mockRequest = { body: payload } as any;

      jest.spyOn(segmentService, 'handleEvent').mockResolvedValueOnce({
        success: true,
        message: 'Event processed',
        processedAt: new Date(),
      });

      const result = await controller.handleSegment(payload, '', mockRequest);

      expect(result.success).toBe(true);
    });
  });

  describe('POST /webhooks/zapier', () => {
    it('handles Zapier webhook with valid secret', async () => {
      const mockConfig = { get: jest.fn().mockReturnValueOnce('zapier-secret') };
      const module = await Test.createTestingModule({
        controllers: [WebhookController],
        providers: [
          SegmentWebhookService,
          ZapierWebhookService,
          SlackWebhookService,
          CRMWebhookService,
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      controller = module.get<WebhookController>(WebhookController);
      const zapierService = module.get<ZapierWebhookService>(ZapierWebhookService);

      const payload: ZapierPayload = {
        hookUrl: 'https://hooks.zapier.com/test',
        event: 'create_booking',
        data: { customerId: 'cust-123' },
      };

      jest.spyOn(zapierService, 'handleIncoming').mockResolvedValueOnce({
        success: true,
        message: 'Automation executed',
        processedAt: new Date(),
      });

      const result = await controller.handleZapier(payload, 'zapier-secret');

      expect(result.success).toBe(true);
    });

    it('rejects Zapier webhook with invalid secret', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'ZAPIER_WEBHOOK_SECRET') return 'zapier-secret';
          return undefined;
        }),
      };
      const module = await Test.createTestingModule({
        controllers: [WebhookController],
        providers: [
          SegmentWebhookService,
          ZapierWebhookService,
          SlackWebhookService,
          CRMWebhookService,
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      controller = module.get<WebhookController>(WebhookController);

      const payload: ZapierPayload = {
        hookUrl: 'https://hooks.zapier.com/test',
        event: 'create_booking',
        data: {},
      };

      await expect(controller.handleZapier(payload, 'invalid-secret')).rejects.toThrow(
        HttpException,
      );
    });

    it('allows Zapier webhook without secret configured', async () => {
      const mockConfig = { get: jest.fn().mockReturnValueOnce(undefined) };
      const module = await Test.createTestingModule({
        controllers: [WebhookController],
        providers: [
          SegmentWebhookService,
          ZapierWebhookService,
          SlackWebhookService,
          CRMWebhookService,
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      controller = module.get<WebhookController>(WebhookController);
      const zapierService = module.get<ZapierWebhookService>(ZapierWebhookService);

      const payload: ZapierPayload = {
        hookUrl: 'https://hooks.zapier.com/test',
        event: 'create_booking',
        data: {},
      };

      jest.spyOn(zapierService, 'handleIncoming').mockResolvedValueOnce({
        success: true,
        message: 'Automation executed',
        processedAt: new Date(),
      });

      const result = await controller.handleZapier(payload, '');

      expect(result.success).toBe(true);
    });
  });

  describe('POST /webhooks/slack/events', () => {
    it('handles Slack event with valid signature', async () => {
      const mockConfig = { get: jest.fn().mockReturnValueOnce('slack-secret') };
      const module = await Test.createTestingModule({
        controllers: [WebhookController],
        providers: [
          SegmentWebhookService,
          ZapierWebhookService,
          SlackWebhookService,
          CRMWebhookService,
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      controller = module.get<WebhookController>(WebhookController);

      const payload: SlackEvent = {
        type: 'url_verification',
        challenge: 'challenge-123',
      };

      const secret = 'slack-secret';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = JSON.stringify(payload);
      const basestring = `v0:${timestamp}:${body}`;
      const signature = 'v0=' + createHmac('sha256', secret).update(basestring).digest('hex');

      const mockRequest = {
        body: payload,
        rawBody: body,
      } as any;

      const result = await controller.handleSlackEvents(payload, signature, timestamp, mockRequest);

      expect(result.challenge).toBe('challenge-123');
    });

    it('rejects Slack event with old timestamp (replay attack)', async () => {
      const mockConfig = {
        get: jest.fn(key => {
          if (key === 'SLACK_SIGNING_SECRET') return 'slack-secret';
          return undefined;
        }),
      };
      const module = await Test.createTestingModule({
        controllers: [WebhookController],
        providers: [
          SegmentWebhookService,
          ZapierWebhookService,
          SlackWebhookService,
          CRMWebhookService,
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      controller = module.get<WebhookController>(WebhookController);

      const payload: SlackEvent = { type: 'event_callback' };
      const oldTimestamp = (Math.floor(Date.now() / 1000) - 600).toString();

      const mockRequest = {
        body: payload,
        rawBody: JSON.stringify(payload),
      } as any;

      await expect(
        controller.handleSlackEvents(payload, 'v0=any', oldTimestamp, mockRequest),
      ).rejects.toThrow(HttpException);
    });

    it('rejects Slack event with invalid signature when secret configured', async () => {
      const mockConfig = {
        get: jest.fn(key => {
          if (key === 'SLACK_SIGNING_SECRET') return 'slack-secret';
          return undefined;
        }),
      };
      const module = await Test.createTestingModule({
        controllers: [WebhookController],
        providers: [
          SegmentWebhookService,
          ZapierWebhookService,
          SlackWebhookService,
          CRMWebhookService,
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      controller = module.get<WebhookController>(WebhookController);

      const payload: SlackEvent = { type: 'event_callback' };
      const timestamp = Math.floor(Date.now() / 1000).toString();

      const mockRequest = {
        body: payload,
        rawBody: JSON.stringify(payload),
      } as any;

      await expect(
        controller.handleSlackEvents(payload, 'v0=invalid', timestamp, mockRequest),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('POST /webhooks/slack/commands', () => {
    it('handles Slack command with valid signature', async () => {
      const mockConfig = { get: jest.fn().mockReturnValueOnce('slack-secret') };
      const module = await Test.createTestingModule({
        controllers: [WebhookController],
        providers: [
          SegmentWebhookService,
          ZapierWebhookService,
          SlackWebhookService,
          CRMWebhookService,
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      controller = module.get<WebhookController>(WebhookController);

      const payload: SlackSlashCommand = {
        token: 'verification_token',
        team_id: 'T123',
        team_domain: 'test-team',
        channel_id: 'C123',
        channel_name: 'general',
        user_id: 'U123',
        user_name: 'testuser',
        command: '/mechmind',
        text: 'status',
        response_url: 'https://hooks.slack.com/commands',
        trigger_id: 'trigger_id',
      };

      const secret = 'slack-secret';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = JSON.stringify(payload);
      const basestring = `v0:${timestamp}:${body}`;
      const signature = 'v0=' + createHmac('sha256', secret).update(basestring).digest('hex');

      const mockRequest = {
        body: payload,
        rawBody: body,
      } as any;

      const result = await controller.handleSlackCommands(
        payload,
        signature,
        timestamp,
        mockRequest,
      );

      expect(result.response_type).toBe('ephemeral');
    });

    it('rejects Slack command with invalid signature when secret configured', async () => {
      const mockConfig = {
        get: jest.fn(key => {
          if (key === 'SLACK_SIGNING_SECRET') return 'slack-secret';
          return undefined;
        }),
      };
      const module = await Test.createTestingModule({
        controllers: [WebhookController],
        providers: [
          SegmentWebhookService,
          ZapierWebhookService,
          SlackWebhookService,
          CRMWebhookService,
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      controller = module.get<WebhookController>(WebhookController);

      const payload: SlackSlashCommand = {
        token: 'verification_token',
        team_id: 'T123',
        team_domain: 'test-team',
        channel_id: 'C123',
        channel_name: 'general',
        user_id: 'U123',
        user_name: 'testuser',
        command: '/mechmind',
        text: 'status',
        response_url: 'https://hooks.slack.com/commands',
        trigger_id: 'trigger_id',
      };

      const timestamp = Math.floor(Date.now() / 1000).toString();

      const mockRequest = {
        body: payload,
        rawBody: JSON.stringify(payload),
      } as any;

      await expect(
        controller.handleSlackCommands(payload, 'v0=invalid', timestamp, mockRequest),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('POST /webhooks/crm/:provider', () => {
    it('handles Salesforce CRM webhook with valid signature', async () => {
      const mockConfig = { get: jest.fn().mockReturnValueOnce('salesforce-secret') };
      const module = await Test.createTestingModule({
        controllers: [WebhookController],
        providers: [
          SegmentWebhookService,
          ZapierWebhookService,
          SlackWebhookService,
          CRMWebhookService,
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      controller = module.get<WebhookController>(WebhookController);
      crmService = module.get<CRMWebhookService>(CRMWebhookService);

      const payload: any = {
        event: { type: 'created' },
        sobjectType: 'Contact',
        id: 'sf-123',
      };

      const secret = 'salesforce-secret';
      const body = JSON.stringify(payload);
      const signature = createHmac('sha256', secret).update(body).digest('hex');

      const mockRequest = { body: payload } as any;

      jest.spyOn(crmService, 'handleEvent').mockResolvedValueOnce({
        success: true,
        message: 'salesforce event processed',
        processedAt: new Date(),
      });

      const result = await controller.handleCRM(payload, 'salesforce', signature, mockRequest);

      expect(result.success).toBe(true);
    });

    it('rejects invalid CRM provider', async () => {
      const mockConfig = { get: jest.fn() };
      const module = await Test.createTestingModule({
        controllers: [WebhookController],
        providers: [
          SegmentWebhookService,
          ZapierWebhookService,
          SlackWebhookService,
          CRMWebhookService,
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      controller = module.get<WebhookController>(WebhookController);

      const payload: any = { id: 'test-123' };
      const mockRequest = { body: payload } as any;

      await expect(
        controller.handleCRM(payload, 'invalid-crm', 'sig', mockRequest),
      ).rejects.toThrow(HttpException);
    });

    it('rejects CRM webhook with invalid signature when secret configured', async () => {
      const mockConfig = {
        get: jest.fn(key => {
          if (key === 'SALESFORCE_WEBHOOK_SECRET') return 'salesforce-secret';
          return undefined;
        }),
      };
      const module = await Test.createTestingModule({
        controllers: [WebhookController],
        providers: [
          SegmentWebhookService,
          ZapierWebhookService,
          SlackWebhookService,
          CRMWebhookService,
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      controller = module.get<WebhookController>(WebhookController);

      const payload: any = {
        sobjectType: 'Contact',
        id: 'sf-123',
      };

      const mockRequest = { body: payload } as any;

      await expect(
        controller.handleCRM(payload, 'salesforce', 'invalid-sig', mockRequest),
      ).rejects.toThrow(HttpException);
    });

    it('handles HubSpot CRM webhook', async () => {
      const mockConfig = { get: jest.fn().mockReturnValueOnce('hubspot-secret') };
      const module = await Test.createTestingModule({
        controllers: [WebhookController],
        providers: [
          SegmentWebhookService,
          ZapierWebhookService,
          SlackWebhookService,
          CRMWebhookService,
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      controller = module.get<WebhookController>(WebhookController);
      crmService = module.get<CRMWebhookService>(CRMWebhookService);

      const payload: any = {
        subscriptionType: 'contact.creation',
        objectType: 'contact',
        objectId: 'hs-456',
        properties: { email: 'test@example.com' },
      };

      const secret = 'hubspot-secret';
      const body = JSON.stringify(payload);
      const signature = createHmac('sha256', secret).update(body).digest('hex');
      const mockRequest = { body: payload } as any;

      jest.spyOn(crmService, 'handleEvent').mockResolvedValueOnce({
        success: true,
        message: 'hubspot event processed',
        processedAt: new Date(),
      });

      const result = await controller.handleCRM(payload, 'hubspot', signature, mockRequest);

      expect(result.success).toBe(true);
    });

    it('handles Pipedrive CRM webhook', async () => {
      const mockConfig = { get: jest.fn().mockReturnValueOnce('pipedrive-secret') };
      const module = await Test.createTestingModule({
        controllers: [WebhookController],
        providers: [
          SegmentWebhookService,
          ZapierWebhookService,
          SlackWebhookService,
          CRMWebhookService,
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      controller = module.get<WebhookController>(WebhookController);
      crmService = module.get<CRMWebhookService>(CRMWebhookService);

      const payload: any = {
        event: 'added.person',
        meta: { object: 'person' },
        data: { id: 'pd-789' },
      };

      const secret = 'pipedrive-secret';
      const body = JSON.stringify(payload);
      const signature = createHmac('sha256', secret).update(body).digest('hex');
      const mockRequest = { body: payload } as any;

      jest.spyOn(crmService, 'handleEvent').mockResolvedValueOnce({
        success: true,
        message: 'pipedrive event processed',
        processedAt: new Date(),
      });

      const result = await controller.handleCRM(payload, 'pipedrive', signature, mockRequest);

      expect(result.success).toBe(true);
    });

    it('allows CRM webhook without secret configured', async () => {
      const mockConfig = { get: jest.fn().mockReturnValueOnce(undefined) };
      const module = await Test.createTestingModule({
        controllers: [WebhookController],
        providers: [
          SegmentWebhookService,
          ZapierWebhookService,
          SlackWebhookService,
          CRMWebhookService,
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      controller = module.get<WebhookController>(WebhookController);
      crmService = module.get<CRMWebhookService>(CRMWebhookService);

      const payload: any = {
        event: { type: 'created' },
        sobjectType: 'Contact',
        id: 'sf-123',
      };

      const mockRequest = { body: payload } as any;

      jest.spyOn(crmService, 'handleEvent').mockResolvedValueOnce({
        success: true,
        message: 'salesforce event processed',
        processedAt: new Date(),
      });

      const result = await controller.handleCRM(payload, 'salesforce', '', mockRequest);

      expect(result.success).toBe(true);
    });
  });
});
