import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';
import { LoggerService } from './logger.service';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis | null = null;
  private memoryStore = new Map<string, { value: string; expiresAt: number }>();

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {
    const url = this.config.get<string>('UPSTASH_REDIS_REST_URL');
    const token = this.config.get<string>('UPSTASH_REDIS_REST_TOKEN');

    if (url && token) {
      this.client = new Redis({ url, token });
      this.logger.log('RedisService: Upstash client initialized');
    } else {
      this.logger.warn('RedisService: Using in-memory fallback');
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.client) {
      return this.client.get<string>(key);
    }
    const item = this.memoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt < Date.now()) {
      this.memoryStore.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.client) {
      if (ttlSeconds) {
        await this.client.set(key, value, { ex: ttlSeconds });
      } else {
        await this.client.set(key, value);
      }
      return;
    }
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : Number.MAX_SAFE_INTEGER;
    this.memoryStore.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    if (this.client) {
      await this.client.del(key);
      return;
    }
    this.memoryStore.delete(key);
  }

  onModuleDestroy(): void {
    this.memoryStore.clear();
  }
}
