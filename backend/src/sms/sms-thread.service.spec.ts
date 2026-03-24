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
      prisma.smsThread.findMany.mockResolvedValue(threads);
      prisma.smsThread.count.mockResolvedValue(1);

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
      prisma.smsThread.findMany.mockResolvedValue([]);
      prisma.smsThread.count.mockResolvedValue(0);

      await service.getThreads(TENANT_ID, 10, 5);

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
      prisma.smsThread.findFirst.mockResolvedValue(thread);
      prisma.smsThread.update.mockResolvedValue({ ...thread, unreadCount: 0 });
      prisma.smsMessage.findMany.mockResolvedValue(messages);
      prisma.smsMessage.count.mockResolvedValue(1);

      const result = await service.getMessages(TENANT_ID, THREAD_ID);

      expect(result).toEqual({ messages, total: 1 });
      expect(prisma.smsThread.update).toHaveBeenCalledWith({
        where: { id: THREAD_ID },
        data: { unreadCount: 0 },
      });
    });

    it('should throw NotFoundException if thread not found', async () => {
      prisma.smsThread.findFirst.mockResolvedValue(null);

      await expect(service.getMessages(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // sendMessage
  // =========================================================================

  describe('sendMessage', () => {
    it('should create OUTBOUND message and update lastMessageAt', async () => {
      const thread = makeMockThread();
      const msg = makeMockMessage({ direction: 'OUTBOUND', body: 'Test' });
      prisma.smsThread.findFirst.mockResolvedValue(thread);
      prisma.smsMessage.create.mockResolvedValue(msg);
      prisma.smsThread.update.mockResolvedValue(thread);

      const result = await service.sendMessage(TENANT_ID, THREAD_ID, 'Test');

      expect(result).toEqual(msg);
      expect(prisma.smsMessage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          threadId: THREAD_ID,
          direction: 'OUTBOUND',
          body: 'Test',
          status: 'SENT',
        }),
      });
      expect(prisma.smsThread.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: THREAD_ID },
          data: expect.objectContaining({ lastMessageAt: expect.any(Date) }),
        }),
      );
    });

    it('should throw NotFoundException if thread not found', async () => {
      prisma.smsThread.findFirst.mockResolvedValue(null);

      await expect(service.sendMessage(TENANT_ID, 'bad-id', 'Hi')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // receiveInbound
  // =========================================================================

  describe('receiveInbound', () => {
    it('should create INBOUND message and increment unreadCount', async () => {
      const thread = makeMockThread();
      const msg = makeMockMessage({ direction: 'INBOUND', body: 'Incoming' });
      prisma.smsThread.findFirst.mockResolvedValue(thread);
      prisma.smsMessage.create.mockResolvedValue(msg);
      prisma.smsThread.update.mockResolvedValue(thread);

      const result = await service.receiveInbound(PHONE_HASH, 'Incoming', 'SM123');

      expect(result).toEqual(msg);
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
      prisma.smsThread.findFirst.mockResolvedValue(null);

      await expect(service.receiveInbound('unknown', 'Hi')).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // getOrCreateThread
  // =========================================================================

  describe('getOrCreateThread', () => {
    it('should return existing thread if found', async () => {
      const thread = makeMockThread();
      prisma.smsThread.findFirst.mockResolvedValue(thread);

      const result = await service.getOrCreateThread(TENANT_ID, CUSTOMER_ID, PHONE_HASH);

      expect(result).toEqual(thread);
      expect(prisma.smsThread.create).not.toHaveBeenCalled();
    });

    it('should create a new thread if not found', async () => {
      const newThread = makeMockThread();
      prisma.smsThread.findFirst.mockResolvedValue(null);
      prisma.smsThread.create.mockResolvedValue(newThread);

      const result = await service.getOrCreateThread(TENANT_ID, CUSTOMER_ID, PHONE_HASH);

      expect(result).toEqual(newThread);
      expect(prisma.smsThread.create).toHaveBeenCalledWith({
        data: { tenantId: TENANT_ID, customerId: CUSTOMER_ID, phoneHash: PHONE_HASH },
      });
    });
  });
});
