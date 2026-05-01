import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SmsThreadService } from './sms-thread.service';
import { PrismaService } from '../common/services/prisma.service';

// ---------------------------------------------------------------------------
// Mock types
// ---------------------------------------------------------------------------

interface MockSmsThreadDelegate {
  findFirst: jest.Mock;
  findMany: jest.Mock;
  count: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
}

interface MockSmsMessageDelegate {
  findMany: jest.Mock;
  count: jest.Mock;
  create: jest.Mock;
}

interface MockPrisma {
  smsThread: MockSmsThreadDelegate;
  smsMessage: MockSmsMessageDelegate;
}

// ---------------------------------------------------------------------------
// Constants & factories
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const THREAD_ID = 'thread-001';
const CUSTOMER_ID = 'customer-001';
const PHONE_HASH = 'abc123hash';

function makeMockThread(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: THREAD_ID,
    tenantId: TENANT_ID,
    customerId: CUSTOMER_ID,
    phoneHash: PHONE_HASH,
    unreadCount: 0,
    lastMessageAt: new Date('2026-03-15T10:00:00Z'),
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-15'),
    ...overrides,
  };
}

function makeMockMessage(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'msg-001',
    threadId: THREAD_ID,
    direction: 'OUTBOUND',
    body: 'Hello!',
    status: 'SENT',
    twilioSid: null,
    createdAt: new Date('2026-03-15T10:00:00Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('SmsThreadService', () => {
  let service: SmsThreadService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = {
      smsThread: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      smsMessage: {
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SmsThreadService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<SmsThreadService>(SmsThreadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // getThreads
  // =========================================================================

  describe('getThreads', () => {
    it('should return threads with total count', async () => {
      const threads = [makeMockThread()];
      prisma.smsThread.findMany.mockResolvedValueOnce(threads);
      prisma.smsThread.count.mockResolvedValueOnce(1);

      const result = await service.getThreads(TENANT_ID);

      expect(result).toEqual({ threads, total: 1 });
      expect(prisma.smsThread.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
          orderBy: { lastMessageAt: 'desc' },
          take: 20,
          skip: 0,
        }),
      );
    });

    it('should apply limit and offset', async () => {
      prisma.smsThread.findMany.mockResolvedValueOnce([]);
      prisma.smsThread.count.mockResolvedValueOnce(0);

      const result = await service.getThreads(TENANT_ID, 10, 5);

      expect(result).toEqual({ threads: [], total: 0 });
      expect(prisma.smsThread.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 5 }),
      );
    });
  });

  // =========================================================================
  // getMessages
  // =========================================================================

  describe('getMessages', () => {
    it('should return messages and mark thread as read', async () => {
      const thread = makeMockThread();
      const messages = [makeMockMessage()];
      prisma.smsThread.findFirst.mockResolvedValueOnce(thread);
      prisma.smsThread.update.mockResolvedValueOnce({ ...thread, unreadCount: 0 });
      prisma.smsMessage.findMany.mockResolvedValueOnce(messages);
      prisma.smsMessage.count.mockResolvedValueOnce(1);

      const result = await service.getMessages(TENANT_ID, THREAD_ID);

      expect(result).toEqual({ messages, total: 1 });
      expect(prisma.smsThread.update).toHaveBeenCalledWith({
        where: { id: THREAD_ID },
        data: { unreadCount: 0 },
      });
    });

    it('should throw NotFoundException if thread not found', async () => {
      prisma.smsThread.findFirst.mockResolvedValueOnce(null);

      await expect(service.getMessages(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
      expect(prisma.smsThread.findFirst).toHaveBeenCalledWith({
        where: { id: 'bad-id', tenantId: TENANT_ID },
      });
    });
  });

  // =========================================================================
  // sendMessage
  // =========================================================================

  describe('sendMessage', () => {
    it('should create OUTBOUND message and update lastMessageAt', async () => {
      const thread = makeMockThread();
      const msg = makeMockMessage({ direction: 'OUTBOUND', body: 'Test' });
      prisma.smsThread.findFirst.mockResolvedValueOnce(thread);
      prisma.smsMessage.create.mockResolvedValueOnce(msg);
      prisma.smsThread.update.mockResolvedValueOnce(thread);

      const result = await service.sendMessage(TENANT_ID, THREAD_ID, 'Test');

      expect(result).toEqual(msg);
      expect(prisma.smsThread.findFirst).toHaveBeenCalledWith({
        where: { id: THREAD_ID, tenantId: TENANT_ID },
      });
      expect(prisma.smsMessage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          threadId: THREAD_ID,
          direction: 'OUTBOUND',
          body: 'Test',
          status: 'SENT',
        }),
      });
      expect(prisma.smsThread.update).toHaveBeenCalledWith({
        where: { id: THREAD_ID },
        data: expect.objectContaining({ lastMessageAt: expect.any(Date) }),
      });
    });

    it('should throw NotFoundException if thread not found (tenantId isolation)', async () => {
      prisma.smsThread.findFirst.mockResolvedValueOnce(null);

      await expect(service.sendMessage(TENANT_ID, 'bad-id', 'Hi')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.smsThread.findFirst).toHaveBeenCalledWith({
        where: { id: 'bad-id', tenantId: TENANT_ID },
      });
    });

    it('should create message with empty body', async () => {
      const thread = makeMockThread();
      const msg = makeMockMessage({ direction: 'OUTBOUND', body: '' });
      prisma.smsThread.findFirst.mockResolvedValueOnce(thread);
      prisma.smsMessage.create.mockResolvedValueOnce(msg);
      prisma.smsThread.update.mockResolvedValueOnce(thread);

      const result = await service.sendMessage(TENANT_ID, THREAD_ID, '');

      expect(result).toEqual(msg);
      expect(prisma.smsMessage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ body: '' }),
      });
    });
  });

  // =========================================================================
  // receiveInbound
  // =========================================================================

  describe('receiveInbound', () => {
    it('should create INBOUND message and increment unreadCount', async () => {
      const thread = makeMockThread();
      const msg = makeMockMessage({ direction: 'INBOUND', body: 'Incoming' });
      prisma.smsThread.findFirst.mockResolvedValueOnce(thread);
      prisma.smsMessage.create.mockResolvedValueOnce(msg);
      prisma.smsThread.update.mockResolvedValueOnce(thread);

      const result = await service.receiveInbound(TENANT_ID, PHONE_HASH, 'Incoming', 'SM123');

      expect(result).toEqual(msg);
      expect(prisma.smsThread.findFirst).toHaveBeenCalledWith({
        where: { phoneHash: PHONE_HASH, tenantId: TENANT_ID },
      });
      expect(prisma.smsMessage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          direction: 'INBOUND',
          body: 'Incoming',
          status: 'DELIVERED',
          twilioSid: 'SM123',
        }),
      });
      expect(prisma.smsThread.update).toHaveBeenCalledWith({
        where: { id: THREAD_ID },
        data: {
          unreadCount: { increment: 1 },
          lastMessageAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException if no thread for phoneHash', async () => {
      prisma.smsThread.findFirst.mockResolvedValueOnce(null);

      await expect(service.receiveInbound(TENANT_ID, 'unknown', 'Hi')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.smsThread.findFirst).toHaveBeenCalledWith({
        where: { phoneHash: 'unknown', tenantId: TENANT_ID },
      });
    });

    it('cross-tenant isolation — should not find thread with wrong tenantId', async () => {
      prisma.smsThread.findFirst.mockResolvedValueOnce(null);

      await expect(service.receiveInbound('other-tenant', PHONE_HASH, 'Hi')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.smsThread.findFirst).toHaveBeenCalledWith({
        where: { phoneHash: PHONE_HASH, tenantId: 'other-tenant' },
      });
    });
  });

  // =========================================================================
  // getOrCreateThread
  // =========================================================================

  describe('getOrCreateThread', () => {
    it('should return existing thread if found', async () => {
      const thread = makeMockThread();
      prisma.smsThread.findFirst.mockResolvedValueOnce(thread);

      const result = await service.getOrCreateThread(TENANT_ID, CUSTOMER_ID, PHONE_HASH);

      expect(result).toEqual(thread);
      expect(prisma.smsThread.create).not.toHaveBeenCalled();
    });

    it('should create a new thread if not found', async () => {
      const newThread = makeMockThread();
      prisma.smsThread.findFirst.mockResolvedValueOnce(null);
      prisma.smsThread.create.mockResolvedValueOnce(newThread);

      const result = await service.getOrCreateThread(TENANT_ID, CUSTOMER_ID, PHONE_HASH);

      expect(result).toEqual(newThread);
      expect(prisma.smsThread.create).toHaveBeenCalledWith({
        data: { tenantId: TENANT_ID, customerId: CUSTOMER_ID, phoneHash: PHONE_HASH },
      });
    });
  });

  // =========================================================================
  // Edge cases and error branches
  // =========================================================================

  describe('error handling - receiveInbound without twilioSid', () => {
    it('should handle receiveInbound where twilioSid is undefined', async () => {
      const thread = makeMockThread();
      const msg = makeMockMessage({ direction: 'INBOUND', twilioSid: null });
      prisma.smsThread.findFirst.mockResolvedValueOnce(thread);
      prisma.smsMessage.create.mockResolvedValueOnce(msg);
      prisma.smsThread.update.mockResolvedValueOnce(thread);

      const result = await service.receiveInbound(TENANT_ID, PHONE_HASH, 'Incoming', undefined);

      expect(result).toEqual(msg);
      expect(prisma.smsMessage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          direction: 'INBOUND',
          body: 'Incoming',
        }),
      });
    });
  });

  describe('error handling - sendMessage with special characters', () => {
    it('should handle message body with special characters', async () => {
      const thread = makeMockThread();
      const specialBody = 'Hello! @#$%^&*() émojis 🚀';
      const msg = makeMockMessage({ direction: 'OUTBOUND', body: specialBody });
      prisma.smsThread.findFirst.mockResolvedValueOnce(thread);
      prisma.smsMessage.create.mockResolvedValueOnce(msg);
      prisma.smsThread.update.mockResolvedValueOnce(thread);

      const result = await service.sendMessage(TENANT_ID, THREAD_ID, specialBody);

      expect(result).toEqual(msg);
      expect(prisma.smsMessage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          body: specialBody,
        }),
      });
    });
  });

  describe('error handling - getMessages with no results', () => {
    it('should return empty list when no messages exist', async () => {
      const thread = makeMockThread();
      prisma.smsThread.findFirst.mockResolvedValueOnce(thread);
      prisma.smsThread.update.mockResolvedValueOnce(thread);
      prisma.smsMessage.findMany.mockResolvedValueOnce([]);
      prisma.smsMessage.count.mockResolvedValueOnce(0);

      const result = await service.getMessages(TENANT_ID, THREAD_ID);

      expect(result).toEqual({ messages: [], total: 0 });
      expect(prisma.smsMessage.findMany).toHaveBeenCalled();
    });
  });

  describe('error handling - getThreads with pagination edge cases', () => {
    it('should handle getThreads with limit=0 (returns empty list)', async () => {
      prisma.smsThread.findMany.mockResolvedValueOnce([]);
      prisma.smsThread.count.mockResolvedValueOnce(100);

      const result = await service.getThreads(TENANT_ID, 0, 0);

      expect(result.threads).toEqual([]);
      expect(result.total).toBe(100);
      expect(prisma.smsThread.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 0 }));
    });

    it('should handle getThreads with large offset beyond total', async () => {
      prisma.smsThread.findMany.mockResolvedValueOnce([]);
      prisma.smsThread.count.mockResolvedValueOnce(5);

      const result = await service.getThreads(TENANT_ID, 20, 1000);

      expect(result.threads).toEqual([]);
      expect(result.total).toBe(5);
    });
  });

  describe('error handling - getMessages with pagination', () => {
    it('should apply limit and offset to getMessages query', async () => {
      const thread = makeMockThread();
      const messages = [makeMockMessage(), makeMockMessage()];
      prisma.smsThread.findFirst.mockResolvedValueOnce(thread);
      prisma.smsThread.update.mockResolvedValueOnce(thread);
      prisma.smsMessage.findMany.mockResolvedValueOnce(messages);
      prisma.smsMessage.count.mockResolvedValueOnce(100);

      const result = await service.getMessages(TENANT_ID, THREAD_ID, 10, 30);

      expect(result.messages).toHaveLength(2);
      expect(result.total).toBe(100);
      expect(prisma.smsMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 30,
        }),
      );
    });
  });

  describe('state consistency - unreadCount increment', () => {
    it('should increment unreadCount correctly on receiveInbound', async () => {
      const thread = makeMockThread({ unreadCount: 5 });
      const msg = makeMockMessage({ direction: 'INBOUND' });
      prisma.smsThread.findFirst.mockResolvedValueOnce(thread);
      prisma.smsMessage.create.mockResolvedValueOnce(msg);
      prisma.smsThread.update.mockResolvedValueOnce({ ...thread, unreadCount: 6 });

      const result = await service.receiveInbound(TENANT_ID, PHONE_HASH, 'New msg', 'SM999');

      expect(result).toEqual(msg);
      expect(prisma.smsThread.update).toHaveBeenCalledWith({
        where: { id: THREAD_ID },
        data: {
          unreadCount: { increment: 1 },
          lastMessageAt: expect.any(Date),
        },
      });
    });
  });

  describe('state consistency - lastMessageAt timestamp', () => {
    it('should update lastMessageAt on sendMessage', async () => {
      const thread = makeMockThread();
      const msg = makeMockMessage();
      const beforeTime = new Date();
      prisma.smsThread.findFirst.mockResolvedValueOnce(thread);
      prisma.smsMessage.create.mockResolvedValueOnce(msg);
      prisma.smsThread.update.mockResolvedValueOnce(thread);

      await service.sendMessage(TENANT_ID, THREAD_ID, 'Test');

      const afterTime = new Date();
      const callArgs = prisma.smsThread.update.mock.calls[0][0];
      const capturedTime = callArgs.data.lastMessageAt as Date;

      expect(capturedTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(capturedTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });
});
