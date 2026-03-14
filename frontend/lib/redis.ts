/**
 * Redis Client for WebAuthn Challenge Storage
 *
 * In-memory store with TTL for temporary challenges.
 * Backend handles persistent Redis operations via RedisService (ioredis).
 *
 * @module lib/redis
 */

// In-memory store with expiration
const memoryStore = new Map<string, { value: string; expires: number }>();

// Cleanup expired entries every 60 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      if (now > entry.expires) {
        memoryStore.delete(key);
      }
    }
  }, 60000);
}

export const redis = {
  async get(key: string): Promise<string | null> {
    const item = memoryStore.get(key);
    if (!item) return null;
    if (Date.now() > item.expires) {
      memoryStore.delete(key);
      return null;
    }
    return item.value;
  },
  async setex(key: string, seconds: number, value: string): Promise<string> {
    memoryStore.set(key, { value, expires: Date.now() + seconds * 1000 });
    return 'OK';
  },
  async del(key: string): Promise<number> {
    memoryStore.delete(key);
    return 1;
  },
  async set(key: string, value: string, options?: { ex?: number }): Promise<string> {
    const expires = options?.ex ? Date.now() + options.ex * 1000 : Date.now() + 86400000;
    memoryStore.set(key, { value, expires });
    return 'OK';
  },
};

export default redis;
