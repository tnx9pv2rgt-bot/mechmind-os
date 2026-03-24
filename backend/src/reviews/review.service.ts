import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { NotificationV2Service } from '../notifications/services/notification-v2.service';
import { NotificationType, NotificationChannel } from '@prisma/client';
import { NOTIFICATION_EVENTS } from '../notifications/constants/notification-events';

export interface ReviewStats {
  sentThisMonth: number;
  sentLastMonth: number;
  totalSent: number;
}

export interface ReviewNotificationRecord {
  id: string;
  customerId: string;
  status: string;
  sentAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationV2Service,
  ) {}

  /**
   * Send review request SMS to a customer.
   */
  async requestReview(
    customerId: string,
    tenantId: string,
  ): Promise<{ success: boolean; message: string }> {
    // Verify customer exists and belongs to tenant
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });

    if (!customer) {
      throw new NotFoundException(`Cliente ${customerId} non trovato`);
    }

    await this.notificationService.sendImmediate({
      customerId,
      tenantId,
      type: NotificationType.STATUS_UPDATE,
      channel: NotificationChannel.SMS,
      message: `Ciao! Grazie per averci scelto. Lascia una recensione: https://app.mechmind.io/review/${tenantId}`,
      metadata: {
        template: NOTIFICATION_EVENTS.REVIEW_REQUEST.template,
        subject: NOTIFICATION_EVENTS.REVIEW_REQUEST.subject,
        reviewLink: `https://app.mechmind.io/review/${tenantId}`,
      },
    });

    this.logger.log(`Review request sent to customer ${customerId} for tenant ${tenantId}`);

    return {
      success: true,
      message: 'Richiesta di recensione inviata',
    };
  }

  /**
   * Get review request stats for the tenant.
   */
  async getStats(tenantId: string): Promise<ReviewStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const reviewRequestFilter = {
      tenantId,
      type: NotificationType.STATUS_UPDATE as NotificationType,
      metadata: {
        path: ['template'],
        equals: NOTIFICATION_EVENTS.REVIEW_REQUEST.template,
      },
    };

    const [sentThisMonth, sentLastMonth, totalSent] = await Promise.all([
      this.prisma.notification.count({
        where: {
          ...reviewRequestFilter,
          createdAt: { gte: startOfMonth },
        },
      }),
      this.prisma.notification.count({
        where: {
          ...reviewRequestFilter,
          createdAt: { gte: startOfLastMonth, lt: startOfMonth },
        },
      }),
      this.prisma.notification.count({
        where: reviewRequestFilter,
      }),
    ]);

    return { sentThisMonth, sentLastMonth, totalSent };
  }

  /**
   * List all review request notifications for the tenant.
   */
  async findAll(
    tenantId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{ data: ReviewNotificationRecord[]; total: number; page: number; limit: number }> {
    const page = options?.page ?? 1;
    const limit = Math.min(options?.limit ?? 20, 100);

    const where = {
      tenantId,
      type: NotificationType.STATUS_UPDATE as NotificationType,
      metadata: {
        path: ['template'],
        equals: NOTIFICATION_EVENTS.REVIEW_REQUEST.template,
      },
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          customerId: true,
          status: true,
          sentAt: true,
          createdAt: true,
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications.map(n => ({
        id: n.id,
        customerId: n.customerId,
        status: n.status as string,
        sentAt: n.sentAt,
        createdAt: n.createdAt,
      })),
      total,
      page,
      limit,
    };
  }
}
