/**
 * Purpose: Optional Redis read-through cache for public API responses.
 */
import Redis from "ioredis";

type CacheEnvelope<T> = {
  value: T;
  cachedAtUtc: string;
};

export type ApiCache = {
  getOrSet<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<{ value: T; hit: boolean }>;
  close(): Promise<void>;
};

export function createApiCache(): ApiCache {
  const redis = createRedisClient();

  return {
    async getOrSet<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<{ value: T; hit: boolean }> {
      if (!redis || ttlSeconds <= 0 || isCacheDisabled()) {
        return { value: await loader(), hit: false };
      }

      try {
        const cached = await redis.get(key);
        if (cached) {
          const envelope = JSON.parse(cached) as CacheEnvelope<T>;
          return { value: envelope.value, hit: true };
        }
      } catch (error) {
        logCacheWarning("read", key, error);
      }

      const value = await loader();

      try {
        const envelope: CacheEnvelope<T> = {
          value,
          cachedAtUtc: new Date().toISOString()
        };
        await redis.set(key, JSON.stringify(envelope), "EX", ttlSeconds);
      } catch (error) {
        logCacheWarning("write", key, error);
      }

      return { value, hit: false };
    },

    async close(): Promise<void> {
      if (redis) {
        redis.disconnect();
      }
    }
  };
}

function createRedisClient(): Redis | null {
  const redisUrl = process.env.API_CACHE_REDIS_URL ?? process.env.REDIS_URL;
  if (!redisUrl || isCacheDisabled()) {
    return null;
  }

  const redis = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    commandTimeout: Number(process.env.API_CACHE_TIMEOUT_MS ?? 500),
    keyPrefix: process.env.API_CACHE_KEY_PREFIX ?? "api-cache:v1:",
    tls: redisUrl.startsWith("rediss://") ? {} : undefined
  });

  redis.on("error", (error) => {
    logCacheWarning("connection", "redis", error);
  });

  return redis;
}

function isCacheDisabled(): boolean {
  return process.env.API_CACHE_ENABLED === "0" || process.env.API_CACHE_ENABLED === "false";
}

function logCacheWarning(operation: string, key: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`API cache ${operation} skipped for ${key}: ${message}`);
}
