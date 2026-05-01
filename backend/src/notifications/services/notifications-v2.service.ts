import { Injectable, Logger } from '@nestjs/common';
import { RedisPubSubService } from './redis-pubsub.service';
import { SseService } from './sse.service';
import { NotificationEventType, NotificationEventData } from '../dto/notification-event.dto';

export interface NotificationPayloadV2 {
  tenantId: string;
  userId?: string;
  type: NotificationEventType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * NotificationsV2Service
 *
 * Real-time notification dispatcher that pushes events through
 * SSE (via SseService) and Redis Pub/Sub (via RedisPubSubService).
 * Used by controllers and event handlers to deliver instant
 * updates to connected dashboard clients.
 */
@Injectable()
export class NotificationsV2Service {
  private readonly logger = new Logger(NotificationsV2Service.name);

  constructor(
    private readonly redisPubSub: RedisPubSubService,
    private readonly sseService: SseService,
  ) {}

  /**
   * Send a notification through all channels (SSE + Redis Pub/Sub)
   */
  async sendNotification(payload: NotificationPayloadV2): Promise<void> {
    this.logger.log(
      // eslint-disable-next-line sonarjs/no-nested-template-literals
      `Sending notification [${payload.type}] to tenant ${payload.tenantId}${payload.userId ? ` (user: ${payload.userId})` : ''}`,
    );

    const notificationData: NotificationEventData = {
      type: payload.type,
      tenantId: payload.tenantId,
      userId: payload.userId,
      title: payload.title,
      message: payload.message,
      data: payload.data,
      timestamp: new Date().toISOString(),
    };

    // Publish to Redis for multi-instance scaling
    await this.redisPubSub.publishToTenant(payload.tenantId, notificationData);

    // Also directly broadcast via SSE (for same-instance clients)
    await this.sseService.broadcastToTenant(payload.tenantId, notificationData);
  }

  /**
   * Send notification to specific user
   */
  async sendToUser(
    tenantId: string,
    userId: string,
    type: NotificationEventType,
    title: string,
    message: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    await this.sendNotification({
      tenantId,
      userId,
      type,
      title,
      message,
      data,
    });
  }

  /**
   * Broadcast to all users in a tenant
   */
  async broadcastToTenant(
    tenantId: string,
    type: NotificationEventType,
    title: string,
    message: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    await this.sendNotification({
      tenantId,
      type,
      title,
      message,
      data,
    });
  }

  // Convenience methods for specific event types

  async notifyBookingCreated(
    tenantId: string,
    bookingId: string,
    customerName: string,
    userId?: string,
  ): Promise<void> {
    await this.sendNotification({
      tenantId,
      userId,
      type: 'booking_created',
      title: 'Nuova Prenotazione',
      message: `Nuova prenotazione da ${customerName}`,
      data: { bookingId, customerName },
    });
  }

  async notifyBookingConfirmed(
    tenantId: string,
    bookingId: string,
    customerName: string,
    userId?: string,
  ): Promise<void> {
    await this.sendNotification({
      tenantId,
      userId,
      type: 'booking_confirmed',
      title: 'Prenotazione Confermata',
      message: `La prenotazione di ${customerName} è stata confermata`,
      data: { bookingId, customerName, status: 'confirmed' },
    });
  }

  async notifyBookingCancelled(
    tenantId: string,
    bookingId: string,
    customerName: string,
    reason?: string,
    userId?: string,
  ): Promise<void> {
    await this.sendNotification({
      tenantId,
      userId,
      type: 'booking_cancelled',
      title: 'Prenotazione Cancellata',
      // eslint-disable-next-line sonarjs/no-nested-template-literals
      message: `La prenotazione di ${customerName} è stata cancellata${reason ? `: ${reason}` : ''}`,
      data: { bookingId, customerName, reason },
    });
  }

  async notifyInvoicePaid(
    tenantId: string,
    invoiceId: string,
    amount: number,
    customerName: string,
    userId?: string,
  ): Promise<void> {
    await this.sendNotification({
      tenantId,
      userId,
      type: 'invoice_paid',
      title: 'Pagamento Ricevuto',
      message: `Pagamento di €${amount.toFixed(2)} ricevuto da ${customerName}`,
      data: { invoiceId, amount, customerName },
    });
  }

  async notifyGdprDeletionScheduled(
    tenantId: string,
    customerId: string,
    customerName: string,
    scheduledDate: Date,
    userId?: string,
  ): Promise<void> {
    await this.sendNotification({
      tenantId,
      userId,
      type: 'gdpr_deletion_scheduled',
      title: 'Cancellazione GDPR Programmata',
      message: `I dati di ${customerName} saranno cancellati il ${scheduledDate.toLocaleDateString('it-IT')}`,
      data: {
        customerId,
        customerName,
        scheduledDate: scheduledDate.toISOString(),
      },
    });
  }

  /**
   * Get notification statistics
   */
  getStats(): {
    connectedClients: number;
    redisConnected: boolean;
  } {
    return {
      connectedClients: this.sseService.getConnectedClientsCount(),
      redisConnected: this.redisPubSub.getConnectionStatus(),
    };
  }
}
