import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SmsThreadController, SmsWebhookController } from './sms-thread.controller';
import { SmsThreadService } from './sms-thread.service';
import { RedisService } from '../common/services/redis.service';

const mockRedis = {
  isAvailable: true,
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
};

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
      service.getThreads.mockResolvedValueOnce({ threads: [mockThread], total: 1 });

      const result = await controller.getThreads(TENANT_ID, 20, 0);

      expect(result).toEqual({
        success: true,
        data: [mockThread],
        meta: { total: 1 },
      });
      expect(service.getThreads).toHaveBeenCalledWith(TENANT_ID, 20, 0);
    });

    it('should pass undefined limit/offset when not provided', async () => {
      service.getThreads.mockResolvedValueOnce({ threads: [], total: 0 });

      const result = await controller.getThreads(TENANT_ID);

      expect(result.success).toBe(true);
      expect(service.getThreads).toHaveBeenCalledWith(TENANT_ID, undefined, undefined);
    });
  });

  describe('getMessages', () => {
    it('should return messages with meta', async () => {
      service.getMessages.mockResolvedValueOnce({ messages: [mockMessage], total: 1 });

      const result = await controller.getMessages(TENANT_ID, 'thread-001', 50, 0);

      expect(result).toEqual({
        success: true,
        data: [mockMessage],
        meta: { total: 1 },
      });
      expect(service.getMessages).toHaveBeenCalledWith(TENANT_ID, 'thread-001', 50, 0);
    });

    it('should return empty list when no messages', async () => {
      service.getMessages.mockResolvedValueOnce({ messages: [], total: 0 });

      const result = await controller.getMessages(TENANT_ID, 'thread-001');

      expect(result).toEqual({ success: true, data: [], meta: { total: 0 } });
      expect(service.getMessages).toHaveBeenCalledWith(
        TENANT_ID,
        'thread-001',
        undefined,
        undefined,
      );
    });

    it('should use pagination params', async () => {
      service.getMessages.mockResolvedValueOnce({ messages: [], total: 100 });

      const result = await controller.getMessages(TENANT_ID, 'thread-001', 25, 50);

      expect(result.meta.total).toBe(100);
      expect(service.getMessages).toHaveBeenCalledWith(TENANT_ID, 'thread-001', 25, 50);
    });
  });

  describe('sendMessage', () => {
    it('should delegate to service and return wrapped response', async () => {
      service.sendMessage.mockResolvedValueOnce(mockMessage);

      const result = await controller.sendMessage(TENANT_ID, 'thread-001', { body: 'Hello' });

      expect(result).toEqual({ success: true, data: mockMessage });
      expect(service.sendMessage).toHaveBeenCalledWith(TENANT_ID, 'thread-001', 'Hello');
    });

    it('should handle empty body message', async () => {
      const emptyMsg = { ...mockMessage, body: '' };
      service.sendMessage.mockResolvedValueOnce(emptyMsg);

      const result = await controller.sendMessage(TENANT_ID, 'thread-001', { body: '' });

      expect(result).toEqual({ success: true, data: emptyMsg });
      expect(service.sendMessage).toHaveBeenCalledWith(TENANT_ID, 'thread-001', '');
    });

    it('should handle very long message body', async () => {
      const longBody = 'x'.repeat(1000);
      const longMsg = { ...mockMessage, body: longBody };
      service.sendMessage.mockResolvedValueOnce(longMsg);

      const result = await controller.sendMessage(TENANT_ID, 'thread-001', { body: longBody });

      expect(result).toEqual({ success: true, data: longMsg });
      expect(service.sendMessage).toHaveBeenCalledWith(TENANT_ID, 'thread-001', longBody);
    });
  });
});

describe('SmsWebhookController', () => {
  let controller: SmsWebhookController;
  let service: jest.Mocked<SmsThreadService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue(undefined);
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
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    controller = module.get<SmsWebhookController>(SmsWebhookController);
    service = module.get(SmsThreadService) as jest.Mocked<SmsThreadService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('receiveInbound', () => {
    it('should delegate to service receiveInbound with tenantId', async () => {
      const mockMsg = { id: 'msg-002', direction: 'INBOUND', body: 'Hey' };
      service.receiveInbound.mockResolvedValueOnce(mockMsg);

      const result = await controller.receiveInbound(
        {
          phoneHash: 'hash123',
          body: 'Hey',
          twilioSid: 'SM999',
        },
        '',
        '',
        'tenant-123',
        {
          protocol: 'http',
          get: () => 'localhost:3000',
          originalUrl: '/v1/sms/webhook/inbound',
          body: {},
        } as unknown as import('express').Request,
      );

      expect(result).toEqual({ success: true, data: mockMsg });
      expect(service.receiveInbound).toHaveBeenCalledWith('tenant-123', 'hash123', 'Hey', 'SM999');
    });

    it('should throw UnauthorizedException when X-Tenant-Id header missing', async () => {
      const result = controller.receiveInbound(
        {
          phoneHash: 'hash123',
          body: 'Hey',
          twilioSid: 'SM999',
        },
        '',
        '',
        '',
        {
          protocol: 'http',
          get: () => 'localhost:3000',
          originalUrl: '/v1/sms/webhook/inbound',
          body: {},
        } as unknown as import('express').Request,
      );

      await expect(result).rejects.toThrow('Missing X-Tenant-Id header');
    });

    it('should throw UnauthorizedException when duplicate MessageSid detected (replay attack)', async () => {
      // nonce già presente in Redis → replay attack
      mockRedis.get.mockResolvedValueOnce('1');
      service.receiveInbound.mockResolvedValueOnce({ id: 'msg-x' } as never);

      const result = controller.receiveInbound(
        { phoneHash: 'hash123', body: 'Hey', twilioSid: 'SM_REPLAY' },
        '',
        '',
        'tenant-123',
        {
          protocol: 'http',
          get: () => 'localhost:3000',
          originalUrl: '/v1/sms/webhook/inbound',
          body: {},
        } as unknown as import('express').Request,
      );

      await expect(result).rejects.toThrow('Duplicate request');
      expect(service.receiveInbound).not.toHaveBeenCalled();
    });

    it('should warn and continue when Redis is unavailable', async () => {
      mockRedis.isAvailable = false;
      service.receiveInbound.mockResolvedValueOnce({ id: 'msg-y' } as never);

      const result = await controller.receiveInbound(
        { phoneHash: 'hash456', body: 'Test', twilioSid: 'SM_NORED' },
        '',
        '',
        'tenant-123',
        {
          protocol: 'http',
          get: () => 'localhost:3000',
          originalUrl: '/v1/sms/webhook/inbound',
          body: {},
        } as unknown as import('express').Request,
      );

      expect(result.success).toBe(true);
      expect(service.receiveInbound).toHaveBeenCalledWith(
        'tenant-123',
        'hash456',
        'Test',
        'SM_NORED',
      );
      mockRedis.isAvailable = true; // ripristina per test successivi
    });
  });
});

describe('SmsWebhookController — Twilio auth branches', () => {
  let controller: SmsWebhookController;
  let service: jest.Mocked<SmsThreadService>;
  let configService: jest.Mocked<ConfigService>;

  const validTs = () => Math.floor(Date.now() / 1000).toString();

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue(undefined);
    const mod: TestingModule = await Test.createTestingModule({
      controllers: [SmsWebhookController],
      providers: [
        {
          provide: SmsThreadService,
          useValue: {
            receiveInbound: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    controller = mod.get<SmsWebhookController>(SmsWebhookController);
    service = mod.get(SmsThreadService) as jest.Mocked<SmsThreadService>;
    configService = mod.get(ConfigService) as jest.Mocked<ConfigService>;
    // Default: auth token undefined (skip verification)
    configService.get.mockReturnValue(undefined);
  });

  it('should throw UnauthorizedException when X-Tenant-Id header missing', async () => {
    configService.get.mockReturnValueOnce('my-auth-token');

    const req = {
      protocol: 'https',
      get: () => 'localhost:3002',
      originalUrl: '/v1/sms/webhook/inbound',
      body: { phoneHash: 'h', body: 'msg', twilioSid: 'SM1' },
    } as unknown as import('express').Request;

    await expect(
      controller.receiveInbound({ phoneHash: 'h', body: 'msg', twilioSid: 'SM1' }, '', '', '', req),
    ).rejects.toThrow('Missing X-Tenant-Id header');
    expect(service.receiveInbound).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException when auth token set but signature missing', async () => {
    configService.get.mockReturnValueOnce('my-auth-token');

    const req = {
      protocol: 'https',
      get: () => 'localhost:3002',
      originalUrl: '/v1/sms/webhook/inbound',
      body: { phoneHash: 'h', body: 'msg', twilioSid: 'SM1' },
    } as unknown as import('express').Request;

    await expect(
      controller.receiveInbound(
        { phoneHash: 'h', body: 'msg', twilioSid: 'SM1' },
        '',
        '',
        'tenant-1',
        req,
      ),
    ).rejects.toThrow('Missing X-Twilio-Signature header');
    expect(service.receiveInbound).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException when auth token set but timestamp missing', async () => {
    configService.get.mockReturnValueOnce('my-auth-token');

    const req = {
      protocol: 'https',
      get: () => 'localhost:3002',
      originalUrl: '/v1/sms/webhook/inbound',
      body: { phoneHash: 'h', body: 'msg', twilioSid: 'SM1' },
    } as unknown as import('express').Request;

    await expect(
      controller.receiveInbound(
        { phoneHash: 'h', body: 'msg', twilioSid: 'SM1' },
        'some-sig',
        '',
        'tenant-1',
        req,
      ),
    ).rejects.toThrow('Missing X-Twilio-Timestamp header');
    expect(service.receiveInbound).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException when timestamp is not a valid number', async () => {
    configService.get.mockReturnValueOnce('my-auth-token');

    const req = {
      protocol: 'https',
      get: () => 'localhost:3002',
      originalUrl: '/v1/sms/webhook/inbound',
      body: {},
    } as unknown as import('express').Request;

    await expect(
      controller.receiveInbound(
        { phoneHash: 'h', body: 'msg', twilioSid: 'SM1' },
        'some-sig',
        'not-a-number',
        'tenant-1',
        req,
      ),
    ).rejects.toThrow('Webhook timestamp too old or invalid');
    expect(service.receiveInbound).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException when timestamp is older than 5 minutes', async () => {
    configService.get.mockReturnValueOnce('my-auth-token');

    const oldTs = (Math.floor(Date.now() / 1000) - 301).toString();

    const req = {
      protocol: 'https',
      get: () => 'localhost:3002',
      originalUrl: '/v1/sms/webhook/inbound',
      body: {},
    } as unknown as import('express').Request;

    await expect(
      controller.receiveInbound(
        { phoneHash: 'h', body: 'msg', twilioSid: 'SM1' },
        'some-sig',
        oldTs,
        'tenant-1',
        req,
      ),
    ).rejects.toThrow('Webhook timestamp too old or invalid');
    expect(service.receiveInbound).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException when timestamp is more than 5 minutes in the future', async () => {
    configService.get.mockReturnValueOnce('my-auth-token');

    const futureTs = (Math.floor(Date.now() / 1000) + 301).toString();

    const req = {
      protocol: 'https',
      get: () => 'localhost:3002',
      originalUrl: '/v1/sms/webhook/inbound',
      body: {},
    } as unknown as import('express').Request;

    await expect(
      controller.receiveInbound(
        { phoneHash: 'h', body: 'msg', twilioSid: 'SM1' },
        'some-sig',
        futureTs,
        'tenant-1',
        req,
      ),
    ).rejects.toThrow('Webhook timestamp too old or invalid');
    expect(service.receiveInbound).not.toHaveBeenCalled();
  });

  it('should throw when signature does not match (same-length base64)', async () => {
    const authToken = 'my-auth-token';
    configService.get.mockReturnValueOnce(authToken);

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
      controller.receiveInbound(
        { phoneHash: 'h', body: 'msg', twilioSid: 'SM1' },
        wrongSig,
        validTs(),
        'tenant-1',
        req,
      ),
    ).rejects.toThrow('Invalid Twilio signature');
  });

  it('should skip signature verification when TWILIO_AUTH_TOKEN is not set', async () => {
    configService.get.mockReturnValueOnce(undefined);
    service.receiveInbound.mockResolvedValueOnce({ id: 'msg-001' });

    const req = {
      protocol: 'https',
      get: () => 'localhost:3002',
      originalUrl: '/v1/sms/webhook/inbound',
      body: {},
    } as unknown as import('express').Request;

    const result = await controller.receiveInbound(
      { phoneHash: 'h', body: 'msg', twilioSid: 'SM1' },
      '',
      '',
      'tenant-1',
      req,
    );

    expect(result.success).toBe(true);
    expect(service.receiveInbound).toHaveBeenCalledWith('tenant-1', 'h', 'msg', 'SM1');
  });

  it('should accept valid Twilio signature with valid timestamp', async () => {
    const authToken = 'test-auth-token';
    configService.get.mockReturnValueOnce(authToken);
    service.receiveInbound.mockResolvedValueOnce({ id: 'msg-002' });

    const bodyParams = { body: 'msg', phoneHash: 'h', twilioSid: 'SM1' };
    const url = 'https://localhost:3002/v1/sms/webhook/inbound';

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
      validTs(),
      'tenant-1',
      req,
    );

    expect(result.success).toBe(true);
    expect(service.receiveInbound).toHaveBeenCalledWith('tenant-1', 'h', 'msg', 'SM1');
  });

  it('should handle inbound SMS with twilioSid (no auth)', async () => {
    const mockMsg = { id: 'msg-003', direction: 'INBOUND', body: 'No SID' };
    service.receiveInbound.mockResolvedValueOnce(mockMsg);

    const result = await controller.receiveInbound(
      {
        phoneHash: 'hash456',
        body: 'No SID',
        twilioSid: 'SM-test-sid-003',
      },
      '',
      '',
      'tenant-456',
      {
        protocol: 'http',
        get: () => 'localhost:3000',
        originalUrl: '/v1/sms/webhook/inbound',
        body: {},
      } as unknown as import('express').Request,
    );

    expect(result).toEqual({ success: true, data: mockMsg });
    expect(service.receiveInbound).toHaveBeenCalledWith(
      'tenant-456',
      'hash456',
      'No SID',
      'SM-test-sid-003',
    );
  });

  it('should accept request with valid signature and timestamp', async () => {
    const authToken = 'test-token';
    configService.get.mockReturnValueOnce(authToken);

    const bodyParams = { body: 'msg', phoneHash: 'h', twilioSid: 'SM1' };
    const url = 'https://localhost:3002/v1/sms/webhook/inbound';

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

    service.receiveInbound.mockResolvedValueOnce({ id: 'msg-x' });

    const result = await controller.receiveInbound(
      { phoneHash: 'h', body: 'msg', twilioSid: 'SM1' },
      expectedSig,
      validTs(),
      'tenant-1',
      req,
    );

    expect(result.success).toBe(true);
    expect(service.receiveInbound).toHaveBeenCalledTimes(1);
  });

  it('should log warning when TWILIO_AUTH_TOKEN not configured', async () => {
    const loggerSpy = jest.spyOn(controller['logger'], 'warn');
    configService.get.mockReturnValueOnce(undefined);

    const req = {
      protocol: 'https',
      get: () => 'localhost:3002',
      originalUrl: '/v1/sms/webhook/inbound',
      body: {},
    } as unknown as import('express').Request;

    service.receiveInbound.mockResolvedValueOnce({ id: 'msg-x' });

    await controller.receiveInbound(
      { phoneHash: 'h', body: 'msg', twilioSid: 'SM1' },
      '',
      '',
      'tenant-1',
      req,
    );

    expect(loggerSpy).toHaveBeenCalled();
    expect(service.receiveInbound).toHaveBeenCalledTimes(1);
  });

  it('should log error when X-Tenant-Id header missing', async () => {
    const loggerSpy = jest.spyOn(controller['logger'], 'error');
    configService.get.mockReturnValueOnce(undefined);

    const req = {
      protocol: 'https',
      get: () => 'localhost:3002',
      originalUrl: '/v1/sms/webhook/inbound',
      body: {},
    } as unknown as import('express').Request;

    const result = controller.receiveInbound(
      { phoneHash: 'h', body: 'msg', twilioSid: 'SM1' },
      '',
      '',
      '',
      req,
    );

    await expect(result).rejects.toThrow('Missing X-Tenant-Id header');
    expect(loggerSpy).toHaveBeenCalled();
  });

  it('should log warning when invalid signature detected', async () => {
    const loggerSpy = jest.spyOn(controller['logger'], 'warn');
    const authToken = 'test-token';
    configService.get.mockReturnValue(authToken);

    const bodyParams = { body: 'msg', phoneHash: 'h', twilioSid: 'SM1' };
    const url = 'https://localhost:3002/v1/sms/webhook/inbound';

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
    const realSig = crypto
      .createHmac('sha1', authToken)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64');
    const wrongSig = Buffer.from('x'.repeat(Buffer.from(realSig, 'base64').length)).toString(
      'base64',
    );

    const req = {
      protocol: 'https',
      get: () => 'localhost:3002',
      originalUrl: '/v1/sms/webhook/inbound',
      body: bodyParams,
    } as unknown as import('express').Request;

    const result = controller.receiveInbound(
      { phoneHash: 'h', body: 'msg', twilioSid: 'SM1' },
      wrongSig,
      validTs(),
      'tenant-1',
      req,
    );

    await expect(result).rejects.toThrow('Invalid Twilio signature');
    expect(loggerSpy).toHaveBeenCalled();
  });

  it('should log warning when timestamp is too old', async () => {
    const loggerSpy = jest.spyOn(controller['logger'], 'warn');
    configService.get.mockReturnValueOnce('my-auth-token');

    const oldTs = (Math.floor(Date.now() / 1000) - 600).toString();

    const req = {
      protocol: 'https',
      get: () => 'localhost:3002',
      originalUrl: '/v1/sms/webhook/inbound',
      body: {},
    } as unknown as import('express').Request;

    await expect(
      controller.receiveInbound(
        { phoneHash: 'h', body: 'msg', twilioSid: 'SM1' },
        'some-sig',
        oldTs,
        'tenant-1',
        req,
      ),
    ).rejects.toThrow('Webhook timestamp too old or invalid');
    expect(loggerSpy).toHaveBeenCalled();
  });
});
