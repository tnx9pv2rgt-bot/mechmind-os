import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';

@WebSocketGateway({
  namespace: 'notifications',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly configService: ConfigService) {}

  @WebSocketServer()
  server: Server;

  afterInit(): void {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl && this.server) {
      try {
        const pubClient = new Redis(redisUrl);
        const subClient = pubClient.duplicate();

        // Attach error handlers to prevent unhandled error crashes
        pubClient.on('error', err => this.logger.warn(`Socket.io Redis pub error: ${err.message}`));
        subClient.on('error', err => this.logger.warn(`Socket.io Redis sub error: ${err.message}`));

        // Access the underlying server (this.server may be a Namespace in namespaced gateways)
        const ioServer = (this.server as unknown as { server?: Server }).server || this.server;
        if (typeof ioServer.adapter === 'function') {
          ioServer.adapter(createAdapter(pubClient, subClient));
          this.logger.log('Socket.io Redis adapter configured for multi-instance support');
        } else {
          this.logger.warn(
            'Socket.io server.adapter not available — running in single-instance mode',
          );
          pubClient.disconnect();
          subClient.disconnect();
        }
      } catch (error) {
        this.logger.warn(
          `Failed to configure Redis adapter: ${error}. Running in single-instance mode.`,
        );
      }
    } else {
      this.logger.warn(
        'REDIS_URL not configured — Socket.io running without Redis adapter (single instance only)',
      );
    }
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect(true);
        return;
      }

      // Simplified auth - in production use JWT verification
      client.data.userId = 'user-' + Math.random().toString(36).substr(2, 9);
      client.data.tenantId = 'tenant-001';

      client.join(`tenant:${client.data.tenantId}`);
      client.join(`user:${client.data.userId}`);

      client.emit('connected', {
        message: 'Connected',
        userId: client.data.userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.data?.userId}`);
  }

  @SubscribeMessage('notification:read')
  handleRead(client: Socket, payload: { notificationId: string }): void {
    client.to(`user:${client.data.userId}`).emit('notification:read:sync', payload);
  }

  broadcastToTenant(tenantId: string, event: string, data: unknown): void {
    this.server.to(`tenant:${tenantId}`).emit(event, data);
  }

  sendToUser(userId: string, event: string, data: unknown): void {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  private extractToken(client: Socket): string | null {
    return (
      client.handshake.auth?.token ||
      (typeof client.handshake.query?.token === 'string' ? client.handshake.query.token : null)
    );
  }
}
