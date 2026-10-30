import { Redis } from "@upstash/redis";
import type { KeyValueStore } from "./types";

/** Upstash Redis over HTTPS, so it works from Vercel functions without a persistent connection. */
export function createUpstashStore(url: string, token: string): KeyValueStore {
  const redis = new Redis({ url, token });

  return {
    async get<T>(key: string) {
      const value = await redis.get<T>(key);
      return value ?? null;
    },

    async set(key, value, ttlSeconds) {
      await redis.set(key, value, { ex: ttlSeconds });
    },

    async incrementBy(key, amount, ttlSeconds) {
      const total = await redis.incrby(key, amount);
      // Only a brand-new counter needs an expiry; later increments keep the original one.
      if (total === amount) {
        await redis.expire(key, ttlSeconds);
      }
      return total;
    },
  };
}
