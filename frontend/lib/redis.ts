/**
 * Redis Client for WebAuthn Challenge Storage
 * 
 * Uses Upstash Redis for storing temporary WebAuthn challenges
 * with automatic expiration.
 * 
 * @module lib/redis
 */

import { Redis } from '@upstash/redis';

// =============================================================================
// Configuration
// =============================================================================

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// =============================================================================
// Redis Client
// =============================================================================

let redis: Redis;

if (REDIS_URL && REDIS_TOKEN) {
  redis = new Redis({
    url: REDIS_URL,
    token: REDIS_TOKEN,
  });
} else {
  // Fallback to in-memory store for development
  console.warn('Redis credentials not found, using in-memory store for development');
  
  const memoryStore = new Map<string, { value: string; expires: number }>();
  
  redis = {
    get: async (key: string) => {
      const item = memoryStore.get(key);
      if (!item) return null;
      if (Date.now() > item.expires) {
        memoryStore.delete(key);
        return null;
      }
      return item.value;
    },
    setex: async (key: string, seconds: number, value: string) => {
      memoryStore.set(key, { value, expires: Date.now() + seconds * 1000 });
      return 'OK';
    },
    del: async (key: string) => {
      memoryStore.delete(key);
      return 1;
    },
  } as unknown as Redis;
}

export { redis };
export default redis;
