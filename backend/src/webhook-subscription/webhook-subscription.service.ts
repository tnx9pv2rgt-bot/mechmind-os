import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import { PrismaService } from '@common/services/prisma.service';
import {
  CreateWebhookSubscriptionDto,
  UpdateWebhookSubscriptionDto,
  WebhookSubscriptionQueryDto,
  WebhookEvent,
  WEBHOOK_EVENTS,
} from './dto/webhook-subscription.dto';

export interface WebhookDispatchResult {
  dispatched: number;
  failed: number;
  details: Array<{ subscriptionId: string; success: boolean; error?: string }>;
}

@Injectable()
export class WebhookSubscriptionService {
  private readonly logger = new Logger(WebhookSubscriptionService.name);
  private readonly WEBHOOK_TIMEOUT_MS = 10000;
  private readonly MAX_FAIL_COUNT = 5;

  constructor(private readonly prisma: PrismaService) {}

  /** Create a new webhook subscription */
  async create(
    tenantId: string,
    dto: CreateWebhookSubscriptionDto,
  ): Promise<ReturnType<typeof this.prisma.webhookSubscription.create>> {
    this.validateHttpsUrl(dto.url);
    this.validateEventsArray(dto.events);
    this.validateSecret(dto.secret);

    this.logger.log(`Creating webhook subscription for tenant ${tenantId}: ${dto.url}`);

    return this.prisma.webhookSubscription.create({
      data: {
        tenantId,
        url: dto.url,
        events: dto.events,
        secret: dto.secret,
        isActive: true,
        failCount: 0,
      },
    });
  }

  /** List webhook subscriptions with pagination and filters */
  async findAll(
    tenantId: string,
    query: WebhookSubscriptionQueryDto,
  ): Promise<{ data: unknown[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };
    if (query.isActive !== undefined) where.isActive = query.isActive;

    // Filter by event using array contains
    if (query.event) {
      where.events = { has: query.event };
    }

    const [data, total] = await Promise.all([
      this.prisma.webhookSubscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.webhookSubscription.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /** Get single webhook subscription by ID */
  async findOne(
    tenantId: string,
    id: string,
  ): Promise<ReturnType<typeof this.prisma.webhookSubscription.findUnique>> {
    const subscription = await this.prisma.webhookSubscription.findUnique({
      where: { id },
    });

    if (!subscription || subscription.tenantId !== tenantId) {
      throw new NotFoundException(`Sottoscrizione webhook ${id} non trovata`);
    }

    return subscription;
  }

  /** Update webhook subscription */
  async update(
    tenantId: string,
    id: string,
    dto: UpdateWebhookSubscriptionDto,
  ): Promise<ReturnType<typeof this.prisma.webhookSubscription.update>> {
    await this.findOne(tenantId, id);

    if (dto.url) this.validateHttpsUrl(dto.url);
    if (dto.events) this.validateEventsArray(dto.events);
    if (dto.secret) this.validateSecret(dto.secret);

    return this.prisma.webhookSubscription.update({
      where: { id },
      data: {
        ...(dto.url !== undefined && { url: dto.url }),
        ...(dto.events !== undefined && { events: dto.events }),
        ...(dto.secret !== undefined && { secret: dto.secret }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  /** Soft delete (disable) webhook subscription */
  async remove(
    tenantId: string,
    id: string,
  ): Promise<ReturnType<typeof this.prisma.webhookSubscription.update>> {
    await this.findOne(tenantId, id);

    this.logger.log(`Disabling webhook subscription ${id} for tenant ${tenantId}`);

    return this.prisma.webhookSubscription.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /** Dispatch webhook event to all active subscriptions listening to that event */
  async dispatch(
    tenantId: string,
    event: WebhookEvent,
    payload: Record<string, unknown>,
  ): Promise<WebhookDispatchResult> {
    if (!WEBHOOK_EVENTS.includes(event)) {
      throw new BadRequestException(`Evento webhook non supportato: ${event}`);
    }

    const subscriptions = await this.prisma.webhookSubscription.findMany({
      where: {
        tenantId,
        isActive: true,
        events: { has: event },
      },
    });

    this.logger.log(
      `Dispatching event ${event} to ${subscriptions.length} subscriptions for tenant ${tenantId}`,
    );

    const details: WebhookDispatchResult['details'] = [];
    let dispatchedCount = 0;
    let failedCount = 0;

    for (const subscription of subscriptions) {
      const success = await this.sendWebhook(
        subscription.id,
        subscription.url,
        subscription.secret,
        event,
        payload,
      );

      if (success) {
        dispatchedCount++;
        details.push({ subscriptionId: subscription.id, success: true });
      } else {
        failedCount++;
        details.push({ subscriptionId: subscription.id, success: false });

        // Increment fail count and disable if max reached
        const newFailCount = subscription.failCount + 1;
        await this.prisma.webhookSubscription.update({
          where: { id: subscription.id },
          data: {
            failCount: newFailCount,
            isActive: newFailCount < this.MAX_FAIL_COUNT,
          },
        });

        if (newFailCount >= this.MAX_FAIL_COUNT) {
          this.logger.warn(
            `Webhook subscription ${subscription.id} disabled after ${newFailCount} failures`,
          );
        }
      }
    }

    return { dispatched: dispatchedCount, failed: failedCount, details };
  }

  /** Send a test webhook payload to a subscription */
  async sendTest(tenantId: string, subscriptionId: string, event: WebhookEvent): Promise<boolean> {
    const subscription = await this.findOne(tenantId, subscriptionId);

    if (!subscription) {
      return false;
    }

    const testPayload = {
      event,
      timestamp: new Date().toISOString(),
      test: true,
      data: { message: 'Test payload' },
    };

    return this.sendWebhook(
      subscriptionId,
      subscription.url,
      subscription.secret,
      event,
      testPayload,
    );
  }

  /** Internal: send HTTP POST request to webhook URL with signature */
  private async sendWebhook(
    subscriptionId: string,
    url: string,
    secret: string,
    event: WebhookEvent,
    payload: Record<string, unknown>,
  ): Promise<boolean> {
    const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });
    const signature = this.computeHmacSignature(body, secret);

    try {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), this.WEBHOOK_TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MechMind-Signature': `sha256=${signature}`,
          'X-MechMind-Event': event,
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutHandle);

      if (!response.ok) {
        this.logger.warn(
          `Webhook ${subscriptionId} returned status ${response.status} for event ${event}`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send webhook ${subscriptionId} to ${url} for event ${event}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /** Compute HMAC-SHA256 signature for webhook payload */
  private computeHmacSignature(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  /** Validate that URL is HTTPS */
  private validateHttpsUrl(url: string): void {
    if (!url.startsWith('https://')) {
      throw new BadRequestException(
        'Webhook URL deve essere HTTPS. URL non sicuri non sono consentiti per la protezione dei dati.',
      );
    }
  }

  /** Validate events array is not empty */
  private validateEventsArray(events: string[]): void {
    if (!Array.isArray(events) || events.length === 0) {
      throw new BadRequestException('Almeno un evento deve essere sottoscritto');
    }
  }

  /** Validate secret meets minimum length requirement */
  private validateSecret(secret: string): void {
    if (!secret || secret.length < 16) {
      throw new BadRequestException(
        'Il segreto HMAC deve essere lungo almeno 16 caratteri per la sicurezza',
      );
    }
  }
}
