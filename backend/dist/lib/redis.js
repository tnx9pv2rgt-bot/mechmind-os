"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cache = exports.redisFallback = exports.redis = void 0;
const redis_1 = require("@upstash/redis");
exports.redis = new redis_1.Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});
if (!process.env.UPSTASH_REDIS_REST_URL) {
    console.warn('Redis not configured, using in-memory fallback');
}
const memoryStore = new Map();
exports.redisFallback = {
    async get(key) {
        const item = memoryStore.get(key);
        if (!item)
            return null;
        if (item.expiresAt < Date.now()) {
            memoryStore.delete(key);
            return null;
        }
        return item.value;
    },
    async set(key, value, options) {
        const expiresAt = options?.ex
            ? Date.now() + options.ex * 1000
            : Number.MAX_SAFE_INTEGER;
        memoryStore.set(key, { value, expiresAt });
    },
    async del(key) {
        memoryStore.delete(key);
    },
    async expire(key, seconds) {
        const item = memoryStore.get(key);
        if (item) {
            item.expiresAt = Date.now() + seconds * 1000;
        }
    },
};
exports.cache = process.env.UPSTASH_REDIS_REST_URL ? exports.redis : exports.redisFallback;
exports.default = exports.cache;
