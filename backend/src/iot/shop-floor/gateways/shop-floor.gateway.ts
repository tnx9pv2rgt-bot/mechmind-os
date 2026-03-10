/**
 * MechMind OS - Shop Floor WebSocket Gateway
 *
 * Real-time shop floor updates via WebSocket
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../../../auth/guards/ws-jwt.guard';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

interface ShopFloorClient {
  socket: Socket;
  tenantId: string;
  userId: string;
  subscribedBays: Set<string>;
}

@WebSocketGateway({
  namespace: 'shop-floor',
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
@UseGuards(WsJwtGuard)
export class ShopFloorGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ShopFloorGateway.name);
  private clients = new Map<string, ShopFloorClient>();
  private redisSubscriber: Redis;

  constructor(@InjectRedis() private readonly redis: Redis) {
    this.redisSubscriber = this.redis.duplicate();
    this.setupRedisSubscription();
  }

  afterInit(server: Server) {
    this.logger.log('Shop Floor Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const { tenantId, userId } = client.data.user;

      this.clients.set(client.id, {
        socket: client,
        tenantId,
        userId,
        subscribedBays: new Set(),
      });

      this.logger.log(`Shop floor client connected: ${client.id} (tenant: ${tenantId})`);

      client.emit('connected', {
        message: 'Connected to shop floor gateway',
        clientId: client.id,
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const clientData = this.clients.get(client.id);
    if (clientData) {
      // Unsubscribe from all bay channels
      for (const bayId of clientData.subscribedBays) {
        this.redisSubscriber.unsubscribe(`shopfloor:sensor:${bayId}`);
      }

      this.clients.delete(client.id);
    }

    this.logger.log(`Shop floor client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe-bay')
  async handleSubscribeBay(client: Socket, payload: { bayId: string }) {
    try {
      const clientData = this.clients.get(client.id);
      if (!clientData) return;

      clientData.subscribedBays.add(payload.bayId);
      await this.redisSubscriber.subscribe(`shopfloor:sensor:${payload.bayId}`);

      client.emit('bay-subscribed', { bayId: payload.bayId });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('unsubscribe-bay')
  async handleUnsubscribeBay(client: Socket, payload: { bayId: string }) {
    try {
      const clientData = this.clients.get(client.id);
      if (!clientData) return;

      clientData.subscribedBays.delete(payload.bayId);
      await this.redisSubscriber.unsubscribe(`shopfloor:sensor:${payload.bayId}`);

      client.emit('bay-unsubscribed', { bayId: payload.bayId });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('subscribe-technicians')
  async handleSubscribeTechnicians(client: Socket) {
    try {
      const clientData = this.clients.get(client.id);
      if (!clientData) return;

      await this.redisSubscriber.subscribe('shopfloor:technicians');
      client.emit('technicians-subscribed', {});
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('subscribe-events')
  async handleSubscribeEvents(client: Socket) {
    try {
      const clientData = this.clients.get(client.id);
      if (!clientData) return;

      await this.redisSubscriber.subscribe('shopfloor:events');
      client.emit('events-subscribed', {});
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  private setupRedisSubscription() {
    this.redisSubscriber.on('message', (channel, message) => {
      const data = JSON.parse(message);

      if (channel.startsWith('shopfloor:sensor:')) {
        const bayId = channel.replace('shopfloor:sensor:', '');

        // Broadcast to subscribed clients
        for (const clientData of this.clients.values()) {
          if (clientData.subscribedBays.has(bayId)) {
            clientData.socket.emit('sensor-reading', { bayId, data });
          }
        }
      } else if (channel === 'shopfloor:technicians') {
        // Broadcast to all clients
        for (const clientData of this.clients.values()) {
          clientData.socket.emit('technician-location', data);
        }
      } else if (channel === 'shopfloor:events') {
        // Broadcast to all clients
        for (const clientData of this.clients.values()) {
          clientData.socket.emit('shop-floor-event', data);
        }
      }
    });
  }
}
