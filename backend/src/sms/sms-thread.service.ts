import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { SmsDirection, SmsStatus } from '@prisma/client';

@Injectable()
export class SmsThreadService {
  private readonly logger = new Logger(SmsThreadService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List threads with last message, ordered by lastMessageAt desc.
   */
  async getThreads(
    tenantId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ threads: unknown[]; total: number }> {
    const where = { tenantId };

    const [threads, total] = await Promise.all([
      this.prisma.smsThread.findMany({
        where,
        include: {
          customer: true,
          messages: {
            orderBy: { createdAt: 'desc' as const },
            take: 1,
          },
        },
        orderBy: { lastMessageAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.smsThread.count({ where }),
    ]);

    return { threads, total };
  }

  /**
   * Get messages for a thread, mark thread as read (unreadCount = 0).
   */
  async getMessages(
    tenantId: string,
    threadId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ messages: unknown[]; total: number }> {
    const thread = await this.prisma.smsThread.findFirst({
      where: { id: threadId, tenantId },
    });

    if (!thread) {
      throw new NotFoundException(`SMS thread ${threadId} not found`);
    }

    // Mark as read
    await this.prisma.smsThread.update({
      where: { id: threadId },
      data: { unreadCount: 0 },
    });

    const where = { threadId, thread: { tenantId } };

    const [messages, total] = await Promise.all([
      this.prisma.smsMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.smsMessage.count({ where }),
    ]);

    return { messages, total };
  }

  /**
   * Send an outbound SMS message in an existing thread.
   */
  async sendMessage(tenantId: string, threadId: string, body: string): Promise<unknown> {
    const thread = await this.prisma.smsThread.findFirst({
      where: { id: threadId, tenantId },
    });

    if (!thread) {
      throw new NotFoundException(`SMS thread ${threadId} not found`);
    }

    const message = await this.prisma.smsMessage.create({
      data: {
        threadId,
        direction: SmsDirection.OUTBOUND,
        body,
        status: SmsStatus.SENT,
      },
    });

    await this.prisma.smsThread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date() },
    });

    this.logger.log(`Outbound SMS sent in thread ${threadId}`);
    return message;
  }

  /**
   * Receive an inbound SMS. Finds thread by phoneHash + tenantId, creates INBOUND message,
   * increments unreadCount.
   */
  async receiveInbound(
    tenantId: string,
    phoneHash: string,
    body: string,
    twilioSid?: string,
  ): Promise<unknown> {
    const thread = await this.prisma.smsThread.findFirst({
      where: { phoneHash, tenantId },
    });

    if (!thread) {
      this.logger.warn(`No thread found for phoneHash ${phoneHash.slice(0, 8)}...`);
      throw new NotFoundException(`No SMS thread found for the given phone`);
    }

    const message = await this.prisma.smsMessage.create({
      data: {
        threadId: thread.id,
        direction: SmsDirection.INBOUND,
        body,
        status: SmsStatus.DELIVERED,
        twilioSid: twilioSid ?? null,
      },
    });

    await this.prisma.smsThread.update({
      where: { id: thread.id },
      data: {
        unreadCount: { increment: 1 },
        lastMessageAt: new Date(),
      },
    });

    this.logger.log(`Inbound SMS received in thread ${thread.id}`);
    return message;
  }

  /**
   * Find or create an SMS thread for a customer.
   */
  async getOrCreateThread(
    tenantId: string,
    customerId: string,
    phoneHash: string,
  ): Promise<unknown> {
    const existing = await this.prisma.smsThread.findFirst({
      where: { tenantId, customerId, phoneHash },
    });

    if (existing) {
      return existing;
    }

    const thread = await this.prisma.smsThread.create({
      data: {
        tenantId,
        customerId,
        phoneHash,
      },
    });

    this.logger.log(`Created SMS thread ${thread.id} for customer ${customerId}`);
    return thread;
  }
}
