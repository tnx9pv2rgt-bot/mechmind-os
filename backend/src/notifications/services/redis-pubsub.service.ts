import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Subject } from 'rxjs';
import { NotificationEventData } from '../dto/notification-event.dto';

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  tls?: boolean;
}

@Injectable()
export class RedisPubSubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisPubSubService.name);
  private publisher: Redis;
  private subscriber: Redis;
  private readonly channels = new Map<string, Subject<NotificationEventData>>();
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  private getRedisConfig(): RedisConfig {
    return {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_PUBSUB_DB', 2),
      tls: this.configService.get<string>('REDIS_TLS') === 'true',
    };
  }

  private async connect(): Promise<void> {
    try {
      const config = this.getRedisConfig();
      const redisOptions: any = {
        host: config.host,
        port: config.port,
        password: config.password,
        db: config.db,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          this.logger.warn(`Redis reconnection attempt ${times}, retrying in ${delay}ms`);
          return delay;
        },
        maxRetriesPerRequest: 3,
      };

      if (config.tls) {
        redisOptions.tls = {};
      }

      // Create separate connections for pub/sub
      this.publisher = new Redis(redisOptions);
      this.subscriber = new Redis(redisOptions);

      // Handle connection events
      this.publisher.on('connect', () => {
        this.logger.log('Redis publisher connected');
      });

      this.subscriber.on('connect', () => {
        this.logger.log('Redis subscriber connected');
        this.isConnected = true;
      });

      this.publisher.on('error', (err) => {
        this.logger.error('Redis publisher error:', err.message);
      });

      this.subscriber.on('error', (err) => {
        this.logger.error('Redis subscriber error:', err.message);
        this.isConnected = false;
      });

      // Handle incoming messages
      this.subscriber.on('message', (channel, message) => {
        this.handleMessage(channel, message);
      });

      this.logger.log('Redis Pub/Sub service initialized');
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error.message);
      throw error;
    }
  }

  private async disconnect(): Promise<void> {
    this.logger.log('Disconnecting Redis Pub/Sub...');
    
    // Unsubscribe from all channels
    if (this.subscriber) {
      await this.subscriber.unsubscribe();
      this.subscriber.removeAllListeners();
      await this.subscriber.quit();
    }

    if (this.publisher) {
      this.publisher.removeAllListeners();
      await this.publisher.quit();
    }

    this.channels.clear();
    this.isConnected = false;
    this.logger.log('Redis Pub/Sub disconnected');
  }

  private handleMessage(channel: string, message: string): void {
    try {
      const data: NotificationEventData = JSON.parse(message);
      const subject = this.channels.get(channel);
      
      if (subject) {
        subject.next(data);
      }
    } catch (error) {
      this.logger.error('Failed to parse Redis message:', error.message);
    }
  }

  /**
   * Subscribe to a tenant channel
   */
  async subscribeToTenant(tenantId: string): Promise<Subject<NotificationEventData>> {
    const channel = `notifications:${tenantId}`;
    
    if (this.channels.has(channel)) {
      return this.channels.get(channel)!;
    }

    const subject = new Subject<NotificationEventData>();
    this.channels.set(channel, subject);

    await this.subscriber.subscribe(channel);
    this.logger.log(`Subscribed to channel: ${channel}`);

    return subject;
  }

  /**
   * Unsubscribe from a tenant channel
   */
  async unsubscribeFromTenant(tenantId: string): Promise<void> {
    const channel = `notifications:${tenantId}`;
    
    if (this.channels.has(channel)) {
      const subject = this.channels.get(channel);
      subject?.complete();
      this.channels.delete(channel);
      
      await this.subscriber.unsubscribe(channel);
      this.logger.log(`Unsubscribed from channel: ${channel}`);
    }
  }

  /**
   * Publish a notification to a tenant channel
   */
  async publishToTenant(
    tenantId: string,
    data: NotificationEventData,
  ): Promise<number> {
    const channel = `notifications:${tenantId}`;
    const message = JSON.stringify(data);
    
    try {
      const result = await this.publisher.publish(channel, message);
      this.logger.debug(`Published to ${channel}: ${result} subscribers`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to publish to ${channel}:`, error.message);
      throw error;
    }
  }

  /**
   * Get observable for tenant notifications
   */
  getTenantObservable(tenantId: string): Subject<NotificationEventData> | undefined {
    return this.channels.get(`notifications:${tenantId}`);
  }

  /**
   * Check if connected to Redis
   */
  getConnectionStatus(): boolean {
    return this.isConnected && this.publisher?.status === 'ready';
  }
}
