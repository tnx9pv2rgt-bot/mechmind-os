import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: 'notifications',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server: Server;

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
