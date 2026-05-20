import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { LoggerService } from './logger.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;
  private _isAvailable = false;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  get isAvailable(): boolean {
    return this._isAvailable;
  }

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('REDIS_URL');

    if (!url) {
      this.logger.error(
        'RedisService: REDIS_URL is required. ' +
          'Redis-dependent features (MFA sessions, rate limiting, queues) will be unavailable.',
      );
      this._isAvailable = false;
      return;
    }

    try {
      this.client = new Redis(url, {
        maxRetriesPerRequest: 3,
        retryStrategy(times: number): number | null {
          if (times > 3) return null;
          return Math.min(times * 200, 2000);
        },
        lazyConnect: false,
      });

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Redis connection timeout (5s)'));
        }, 5000);

        this.client!.once('ready', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.client!.once('error', (err: Error) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      this._isAvailable = true;
      this.logger.log('RedisService: ioredis client connected');
    } catch (error) {
      this.logger.error(
        // eslint-disable-next-line sonarjs/no-duplicate-string
        `RedisService: Failed to connect - ${error instanceof Error ? error.message : 'Unknown error'}. ` +
          'App will start but Redis-dependent features will be unavailable.',
      );
      this.client?.disconnect();
      this.client = null;
      this._isAvailable = false;
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) {
      this.logger.warn('RedisService: get() called but Redis is not available');
      return null;
    }

    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(
        `RedisService: get(${key}) failed - ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client) {
      this.logger.warn('RedisService: set() called but Redis is not available');
      return;
    }

    try {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      this.logger.error(
        `RedisService: set(${key}) failed - ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) {
      this.logger.warn('RedisService: del() called but Redis is not available');
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(
        `RedisService: del(${key}) failed - ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
    this.logger.log('RedisService: disconnected');
  }
}
