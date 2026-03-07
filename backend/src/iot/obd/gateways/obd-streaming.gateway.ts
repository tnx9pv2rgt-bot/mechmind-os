/**
 * MechMind OS - OBD Streaming WebSocket Gateway
 * 
 * Real-time OBD data streaming via WebSocket
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
import { ObdStreamingService } from '../services/obd-streaming.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import {
  AdapterType,
  ObdProtocol,
  ObdSensorData,
} from '../interfaces/obd-streaming.interface';

interface StreamingClient {
  socket: Socket;
  tenantId: string;
  userId: string;
  subscribedDevices: Set<string>;
}

@WebSocketGateway({
  namespace: 'obd-streaming',
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
@UseGuards(WsJwtGuard)
export class ObdStreamingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ObdStreamingGateway.name);
  private clients = new Map<string, StreamingClient>();
  private redisSubscriber: Redis;

  constructor(
    private readonly streamingService: ObdStreamingService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    // Create separate Redis connection for pub/sub
    this.redisSubscriber = this.redis.duplicate();
    this.setupRedisSubscription();
  }

  afterInit(server: Server) {
    this.logger.log('OBD Streaming Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const { tenantId, userId } = client.data.user;
      
      this.clients.set(client.id, {
        socket: client,
        tenantId,
        userId,
        subscribedDevices: new Set(),
      });

      this.logger.log(`Client connected: ${client.id} (tenant: ${tenantId})`);
      
      client.emit('connected', {
        message: 'Connected to OBD streaming gateway',
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
      // Unsubscribe from all device channels
      for (const deviceId of clientData.subscribedDevices) {
        this.redisSubscriber.unsubscribe(`obd:live:${deviceId}`);
      }
      
      this.clients.delete(client.id);
    }
    
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('start-streaming')
  async handleStartStreaming(
    client: Socket,
    payload: {
      deviceId: string;
      adapterType: AdapterType;
      protocol?: ObdProtocol;
      sensors?: string[];
      interval?: number;
    },
  ) {
    try {
      const clientData = this.clients.get(client.id);
      if (!clientData) return;

      // Start streaming session
      const stream = await this.streamingService.startStreaming(
        payload.deviceId,
        {
          adapterType: payload.adapterType,
          protocol: payload.protocol,
          sensors: payload.sensors,
          interval: payload.interval,
        },
      );

      // Subscribe to device updates
      clientData.subscribedDevices.add(payload.deviceId);
      await this.redisSubscriber.subscribe(`obd:live:${payload.deviceId}`);

      client.emit('streaming-started', {
        streamId: stream.id,
        deviceId: payload.deviceId,
        config: stream.config,
      });

      this.logger.log(`Streaming started: ${stream.id} for device ${payload.deviceId}`);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('stop-streaming')
  async handleStopStreaming(
    client: Socket,
    payload: { streamId: string },
  ) {
    try {
      const clientData = this.clients.get(client.id);
      if (!clientData) return;

      await this.streamingService.stopStreaming(payload.streamId);

      // Find and remove device subscription
      for (const deviceId of clientData.subscribedDevices) {
        const stream = this.streamingService.getActiveStream(deviceId);
        if (stream?.id === payload.streamId) {
          clientData.subscribedDevices.delete(deviceId);
          await this.redisSubscriber.unsubscribe(`obd:live:${deviceId}`);
          break;
        }
      }

      client.emit('streaming-stopped', { streamId: payload.streamId });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('subscribe-device')
  async handleSubscribeDevice(
    client: Socket,
    payload: { deviceId: string },
  ) {
    try {
      const clientData = this.clients.get(client.id);
      if (!clientData) return;

      clientData.subscribedDevices.add(payload.deviceId);
      await this.redisSubscriber.subscribe(`obd:live:${payload.deviceId}`);

      // Send latest reading if available
      const latestReading = await this.redis.get(`obd:latest:${payload.deviceId}`);
      if (latestReading) {
        client.emit('sensor-data', JSON.parse(latestReading));
      }

      client.emit('subscribed', { deviceId: payload.deviceId });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('unsubscribe-device')
  async handleUnsubscribeDevice(
    client: Socket,
    payload: { deviceId: string },
  ) {
    try {
      const clientData = this.clients.get(client.id);
      if (!clientData) return;

      clientData.subscribedDevices.delete(payload.deviceId);
      await this.redisSubscriber.unsubscribe(`obd:live:${payload.deviceId}`);

      client.emit('unsubscribed', { deviceId: payload.deviceId });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('sensor-data')
  async handleSensorData(
    client: Socket,
    payload: {
      streamId: string;
      data: ObdSensorData;
    },
  ) {
    try {
      await this.streamingService.processSensorData(
        payload.streamId,
        payload.data,
      );
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('capture-freeze-frame')
  async handleCaptureFreezeFrame(
    client: Socket,
    payload: { deviceId: string; dtcCode: string },
  ) {
    try {
      const freezeFrame = await this.streamingService.captureFreezeFrame(
        payload.deviceId,
        payload.dtcCode,
      );

      client.emit('freeze-frame-captured', freezeFrame);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('get-mode06-tests')
  async handleGetMode06Tests(
    client: Socket,
    payload: { deviceId: string },
  ) {
    try {
      const results = await this.streamingService.getMode06Tests(payload.deviceId);
      client.emit('mode06-results', { deviceId: payload.deviceId, results });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('execute-evap-test')
  async handleExecuteEvapTest(
    client: Socket,
    payload: { deviceId: string; testType: 'LEAK' | 'PRESSURE' | 'VACUUM' },
  ) {
    try {
      const test = await this.streamingService.executeEvapTest(
        payload.deviceId,
        payload.testType,
      );

      client.emit('evap-test-started', test);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('request-snapshot')
  async handleRequestSnapshot(
    client: Socket,
    payload: { deviceId: string },
  ) {
    try {
      // Get latest data from cache
      const snapshot = await this.redis.get(`obd:latest:${payload.deviceId}`);
      
      client.emit('snapshot', {
        deviceId: payload.deviceId,
        data: snapshot ? JSON.parse(snapshot) : null,
        timestamp: new Date(),
      });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  private setupRedisSubscription() {
    this.redisSubscriber.on('message', (channel, message) => {
      const deviceId = channel.replace('obd:live:', '');
      
      // Broadcast to all subscribed clients
      for (const clientData of this.clients.values()) {
        if (clientData.subscribedDevices.has(deviceId)) {
          clientData.socket.emit('sensor-data', JSON.parse(message));
        }
      }
    });
  }
}
