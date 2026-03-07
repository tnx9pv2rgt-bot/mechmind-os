import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationsGateway } from '../gateways/notifications.gateway';

export interface NotificationPayload {
  tenantId: string;
  userId: string;
  type: 'booking_created' | 'booking_updated' | 'inspection_completed' | 'reminder';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  email?: {
    to: string;
    subject: string;
    template: string;
    variables: Record<string, unknown>;
  };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly gateway: NotificationsGateway,
    @InjectQueue('email-queue') private readonly emailQueue: Queue,
  ) {}

  async sendNotification(payload: NotificationPayload): Promise<void> {
    this.logger.log(`Sending notification: ${payload.type} to user ${payload.userId}`);

    // Send real-time notification via WebSocket
    this.gateway.sendToUser(payload.userId, 'notification:new', {
      id: this.generateId(),
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data,
      timestamp: new Date().toISOString(),
      isRead: false,
    });

    // Broadcast to tenant for dashboard updates
    this.gateway.broadcastToTenant(payload.tenantId, 'tenant:update', {
      type: payload.type,
      data: payload.data,
    });

    // Queue email if provided
    if (payload.email) {
      await this.enqueueEmail({
        tenantId: payload.tenantId,
        userId: payload.userId,
        ...payload.email,
      });
    }
  }

  async enqueueEmail(emailData: {
    tenantId: string;
    userId: string;
    to: string;
    subject: string;
    template: string;
    variables: Record<string, unknown>;
  }): Promise<void> {
    await this.emailQueue.add('send-email', emailData, {
      jobId: `email-${emailData.userId}-${Date.now()}`,
    });
    this.logger.log(`Email queued for ${emailData.to}`);
  }

  async broadcastToMechanics(tenantId: string, payload: Omit<NotificationPayload, 'userId'>): Promise<void> {
    this.gateway.broadcastToTenant(tenantId, 'mechanic:notification', {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  private generateId(): string {
    return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
