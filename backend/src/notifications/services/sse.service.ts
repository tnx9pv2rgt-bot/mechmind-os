import { Injectable, Logger } from '@nestjs/common';
import { Observable, Observer } from 'rxjs';
import { RedisPubSubService } from './redis-pubsub.service';
import { NotificationEventData, SseMessageEvent } from '../dto/notification-event.dto';

interface SseClient {
  id: string;
  tenantId: string;
  userId?: string;
  observer: Observer<SseMessageEvent>;
  heartbeatInterval?: NodeJS.Timeout;
}

@Injectable()
export class SseService {
  private readonly logger = new Logger(SseService.name);
  private readonly clients = new Map<string, SseClient>();
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds

  constructor(private readonly redisPubSub: RedisPubSubService) {}

  /**
   * Create an SSE stream for a client
   */
  createEventStream(
    clientId: string,
    tenantId: string,
    userId?: string,
  ): Observable<SseMessageEvent> {
    return new Observable<SseMessageEvent>((observer) => {
      // Register client
      const client: SseClient = {
        id: clientId,
        tenantId,
        userId,
        observer,
      };

      this.clients.set(clientId, client);
      this.logger.log(`SSE client connected: ${clientId} (tenant: ${tenantId})`);

      // Subscribe to Redis channel for this tenant
      this.subscribeToTenant(tenantId);

      // Setup Redis message handler
      const redisSub = this.redisPubSub.getTenantObservable(tenantId);
      if (redisSub) {
        const subscription = redisSub.subscribe({
          next: (data) => {
            this.handleNotification(client, data);
          },
          error: (err) => {
            this.logger.error(`Redis subscription error for ${tenantId}:`, err);
          },
        });

        // Store subscription for cleanup
        (client as any).redisSubscription = subscription;
      }

      // Send initial connection event
      observer.next({
        event: 'connected',
        data: JSON.stringify({
          clientId,
          timestamp: new Date().toISOString(),
          message: 'Connected to notification stream',
        }),
      });

      // Setup heartbeat to keep connection alive
      client.heartbeatInterval = setInterval(() => {
        observer.next({
          event: 'heartbeat',
          data: JSON.stringify({ timestamp: new Date().toISOString() }),
        });
      }, this.HEARTBEAT_INTERVAL);

      // Cleanup on unsubscribe
      return () => {
        this.cleanupClient(clientId);
      };
    });
  }

  /**
   * Handle incoming notification from Redis
   */
  private handleNotification(client: SseClient, data: NotificationEventData): void {
    // Filter by user if specified
    if (data.userId && client.userId && data.userId !== client.userId) {
      return; // Skip notifications for other users
    }

    // Send notification to client
    client.observer.next({
      id: `notif-${Date.now()}`,
      event: data.type,
      data: JSON.stringify({
        ...data,
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      }),
    });
  }

  /**
   * Subscribe to tenant channel in Redis
   */
  private async subscribeToTenant(tenantId: string): Promise<void> {
    // Check if we already have clients for this tenant
    const hasExistingClients = Array.from(this.clients.values()).some(
      (c) => c.tenantId === tenantId,
    );

    if (!hasExistingClients) {
      await this.redisPubSub.subscribeToTenant(tenantId);
    }
  }

  /**
   * Cleanup client resources
   */
  private async cleanupClient(clientId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Clear heartbeat
    if (client.heartbeatInterval) {
      clearInterval(client.heartbeatInterval);
    }

    // Unsubscribe from Redis
    const redisSub = (client as any).redisSubscription;
    if (redisSub) {
      redisSub.unsubscribe();
    }

    // Check if this was the last client for the tenant
    const remainingClients = Array.from(this.clients.values()).filter(
      (c) => c.tenantId === client.tenantId && c.id !== clientId,
    );

    if (remainingClients.length === 0) {
      await this.redisPubSub.unsubscribeFromTenant(client.tenantId);
    }

    this.clients.delete(clientId);
    this.logger.log(`SSE client disconnected: ${clientId}`);
  }

  /**
   * Broadcast notification to all clients in a tenant
   */
  async broadcastToTenant(
    tenantId: string,
    data: NotificationEventData,
  ): Promise<void> {
    await this.redisPubSub.publishToTenant(tenantId, data);
  }

  /**
   * Send notification to specific user
   */
  async sendToUser(
    tenantId: string,
    userId: string,
    data: NotificationEventData,
  ): Promise<void> {
    await this.redisPubSub.publishToTenant(tenantId, {
      ...data,
      userId,
    });
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  /**
   * Get connected clients count for a tenant
   */
  getTenantClientsCount(tenantId: string): number {
    return Array.from(this.clients.values()).filter((c) => c.tenantId === tenantId).length;
  }

  /**
   * Disconnect all clients (for shutdown)
   */
  async disconnectAll(): Promise<void> {
    for (const [clientId, client] of this.clients) {
      client.observer.complete();
      await this.cleanupClient(clientId);
    }
  }
}
