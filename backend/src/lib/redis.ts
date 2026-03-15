import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Fallback for development
if (!process.env.UPSTASH_REDIS_REST_URL) {
  console.warn('Redis not configured, using in-memory fallback');
}

// In-memory fallback for development
const memoryStore = new Map<string, { value: string; expiresAt: number }>();

export const redisFallback = {
  async get(key: string): Promise<string | null> {
    const item = memoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt < Date.now()) {
      memoryStore.delete(key);
      return null;
    }
    return item.value;
  },

  async set(key: string, value: string, options?: { ex?: number }): Promise<void> {
    const expiresAt = options?.ex ? Date.now() + options.ex * 1000 : Number.MAX_SAFE_INTEGER;
    memoryStore.set(key, { value, expiresAt });
  },

  async del(key: string): Promise<void> {
    memoryStore.delete(key);
  },

  async expire(key: string, seconds: number): Promise<void> {
    const item = memoryStore.get(key);
    if (item) {
      item.expiresAt = Date.now() + seconds * 1000;
    }
  },
};

// Export a unified client that falls back to memory store
export const cache = process.env.UPSTASH_REDIS_REST_URL ? redis : redisFallback;

export default cache;
