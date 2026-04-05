import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SmsThreadController, SmsWebhookController } from './sms-thread.controller';
import { SmsThreadService } from './sms-thread.service';

describe('SmsThreadController', () => {
  let controller: SmsThreadController;
  let service: jest.Mocked<SmsThreadService>;

  const TENANT_ID = 'tenant-001';

  const mockThread = {
    id: 'thread-001',
    tenantId: TENANT_ID,
    customerId: 'cust-001',
    phoneHash: 'hash123',
    unreadCount: 2,
    lastMessageAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMessage = {
    id: 'msg-001',
    threadId: 'thread-001',
    direction: 'OUTBOUND',
    body: 'Hello',
    status: 'SENT',
    twilioSid: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SmsThreadController],
      providers: [
        {
          provide: SmsThreadService,
          useValue: {
            getThreads: jest.fn(),
            getMessages: jest.fn(),
            sendMessage: jest.fn(),
            receiveInbound: jest.fn(),
            getOrCreateThread: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SmsThreadController>(SmsThreadController);
    service = module.get(SmsThreadService) as jest.Mocked<SmsThreadService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getThreads', () => {
    it('should return threads with meta', async () => {
      service.getThreads.mockResolvedValue({ threads: [mockThread], total: 1 });

      const result = await controller.getThreads(TENANT_ID, 20, 0);

      expect(result).toEqual({
        success: true,
        data: [mockThread],
        meta: { total: 1 },
      });
      expect(service.getThreads).toHaveBeenCalledWith(TENANT_ID, 20, 0);
    });

    it('should pass undefined limit/offset when not provided', async () => {
      service.getThreads.mockResolvedValue({ threads: [], total: 0 });

      const result = await controller.getThreads(TENANT_ID);

      expect(result.success).toBe(true);
      expect(service.getThreads).toHaveBeenCalledWith(TENANT_ID, undefined, undefined);
    });
  });

  describe('getMessages', () => {
    it('should return messages with meta', async () => {
      service.getMessages.mockResolvedValue({ messages: [mockMessage], total: 1 });

      const result = await controller.getMessages(TENANT_ID, 'thread-001', 50, 0);

      expect(result).toEqual({
        success: true,
        data: [mockMessage],
        meta: { total: 1 },
      });
      expect(service.getMessages).toHaveBeenCalledWith(TENANT_ID, 'thread-001', 50, 0);
    });
  });

  describe('sendMessage', () => {
    it('should delegate to service and return wrapped response', async () => {
      service.sendMessage.mockResolvedValue(mockMessage);

      const result = await controller.sendMessage(TENANT_ID, 'thread-001', { body: 'Hello' });

      expect(result).toEqual({ success: true, data: mockMessage });
      expect(service.sendMessage).toHaveBeenCalledWith(TENANT_ID, 'thread-001', 'Hello');
    });
  });
});

describe('SmsWebhookController', () => {
  let controller: SmsWebhookController;
  let service: jest.Mocked<SmsThreadService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SmsWebhookController],
      providers: [
        {
          provide: SmsThreadService,
          useValue: {
            getThreads: jest.fn(),
            getMessages: jest.fn(),
            sendMessage: jest.fn(),
            receiveInbound: jest.fn(),
            getOrCreateThread: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(undefined) },
        },
      ],
    }).compile();

    controller = module.get<SmsWebhookController>(SmsWebhookController);
    service = module.get(SmsThreadService) as jest.Mocked<SmsThreadService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('receiveInbound', () => {
    it('should delegate to service receiveInbound', async () => {
      const mockMsg = { id: 'msg-002', direction: 'INBOUND', body: 'Hey' };
      service.receiveInbound.mockResolvedValue(mockMsg);

      const result = await controller.receiveInbound(
        {
          phoneHash: 'hash123',
          body: 'Hey',
          twilioSid: 'SM999',
        },
        '',
        {
          protocol: 'http',
          get: () => 'localhost:3000',
          originalUrl: '/v1/sms/webhook/inbound',
          body: {},
        } as unknown as import('express').Request,
      );

      expect(result).toEqual({ success: true, data: mockMsg });
      expect(service.receiveInbound).toHaveBeenCalledWith('hash123', 'Hey', 'SM999');
    });
  });
});

describe('SmsWebhookController — Twilio auth branches', () => {
  let controller: SmsWebhookController;
  let service: jest.Mocked<SmsThreadService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      controllers: [SmsWebhookController],
      providers: [
        {
          provide: SmsThreadService,
          useValue: {
            receiveInbound: jest.fn().mockResolvedValue({ id: 'msg-x' }),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    controller = mod.get<SmsWebhookController>(SmsWebhookController);
    service = mod.get(SmsThreadService) as jest.Mocked<SmsThreadService>;
    configService = mod.get(ConfigService) as jest.Mocked<ConfigService>;
  });

  it('should throw UnauthorizedException when auth token set but signature missing', async () => {
    configService.get.mockReturnValue('my-auth-token');

    const req = {
      protocol: 'https',
      get: () => 'localhost:3002',
      originalUrl: '/v1/sms/webhook/inbound',
      body: { phoneHash: 'h', body: 'msg', twilioSid: 'SM1' },
    } as unknown as import('express').Request;

    await expect(
      controller.receiveInbound({ phoneHash: 'h', body: 'msg', twilioSid: 'SM1' }, '', req),
    ).rejects.toThrow('Missing X-Twilio-Signature header');
  });

  it('should throw when signature does not match (same-length base64)', async () => {
    const authToken = 'my-auth-token';
    configService.get.mockReturnValue(authToken);

    // Compute expected signature length — SHA1 HMAC = 20 bytes = 28 chars base64
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require('crypto');
    const bodyParams = { body: 'msg', phoneHash: 'h', twilioSid: 'SM1' };
    const url = 'https://localhost:3002/v1/sms/webhook/inbound';
    const data =
      url +
      Object.keys(bodyParams)
        .sort()
        .reduce(
          (acc: string, key: string) => acc + key + bodyParams[key as keyof typeof bodyParams],
          '',
        );
    const realSig = crypto
      .createHmac('sha1', authToken)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64');
    // Create a wrong signature of the same byte-length
    const wrongSig = Buffer.from('x'.repeat(Buffer.from(realSig, 'base64').length)).toString(
      'base64',
    );

    const req = {
      protocol: 'https',
      get: () => 'localhost:3002',
      originalUrl: '/v1/sms/webhook/inbound',
      body: bodyParams,
    } as unknown as import('express').Request;

    await expect(
      controller.receiveInbound({ phoneHash: 'h', body: 'msg', twilioSid: 'SM1' }, wrongSig, req),
    ).rejects.toThrow('Invalid Twilio signature');
  });

  it('should skip signature verification when TWILIO_AUTH_TOKEN is not set', async () => {
    configService.get.mockReturnValue(undefined);

    const req = {
      protocol: 'https',
      get: () => 'localhost:3002',
      originalUrl: '/v1/sms/webhook/inbound',
      body: {},
    } as unknown as import('express').Request;

    const result = await controller.receiveInbound(
      { phoneHash: 'h', body: 'msg', twilioSid: 'SM1' },
      '',
      req,
    );

    expect(result.success).toBe(true);
    expect(service.receiveInbound).toHaveBeenCalledWith('h', 'msg', 'SM1');
  });

  it('should accept valid Twilio signature', async () => {
    const authToken = 'test-auth-token';
    configService.get.mockReturnValue(authToken);

    const bodyParams = { body: 'msg', phoneHash: 'h', twilioSid: 'SM1' };
    const url = 'https://localhost:3002/v1/sms/webhook/inbound';

    // Calculate expected signature the same way the controller does
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require('crypto');
    const data =
      url +
      Object.keys(bodyParams)
        .sort()
        .reduce(
          (acc: string, key: string) => acc + key + bodyParams[key as keyof typeof bodyParams],
          '',
        );
    const expectedSig = crypto
      .createHmac('sha1', authToken)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64');

    const req = {
      protocol: 'https',
      get: () => 'localhost:3002',
      originalUrl: '/v1/sms/webhook/inbound',
      body: bodyParams,
    } as unknown as import('express').Request;

    const result = await controller.receiveInbound(
      { phoneHash: 'h', body: 'msg', twilioSid: 'SM1' },
      expectedSig,
      req,
    );

    expect(result.success).toBe(true);
    expect(service.receiveInbound).toHaveBeenCalled();
  });
});
