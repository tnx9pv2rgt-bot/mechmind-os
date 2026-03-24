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
