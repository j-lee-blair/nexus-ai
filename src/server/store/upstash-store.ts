import { Redis } from "@upstash/redis";
import type { KeyValueStore } from "./types";

// A slow Redis must not hold up the answer for long: each command gives up after this time,
// with one retry, and the caller then carries on without the cache (see cache.ts).
const COMMAND_TIMEOUT_MS = 1500;

/** Upstash Redis over HTTPS, so it works from Vercel functions without a persistent connection. */
export function createUpstashStore(url: string, token: string): KeyValueStore {
  const redis = new Redis({
    url,
    token,
    signal: () => AbortSignal.timeout(COMMAND_TIMEOUT_MS),
    retry: { retries: 1 },
  });

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
