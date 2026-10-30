import type { KeyValueStore } from "./types";

interface Entry {
  value: unknown;
  expiresAt: number;
}

/** In-process store. Used by tests and local development; data is lost on restart. */
export function createMemoryStore(now: () => number = Date.now): KeyValueStore {
  const entries = new Map<string, Entry>();

  function readLive(key: string): Entry | undefined {
    const entry = entries.get(key);
    if (entry === undefined) {
      return undefined;
    }
    if (entry.expiresAt <= now()) {
      entries.delete(key);
      return undefined;
    }
    return entry;
  }

  return {
    async get<T>(key: string) {
      const entry = readLive(key);
      if (entry === undefined) {
        return null;
      }
      return entry.value as T;
    },

    async set(key, value, ttlSeconds) {
      entries.set(key, { value, expiresAt: now() + ttlSeconds * 1000 });
    },

    async incrementBy(key, amount, ttlSeconds) {
      const entry = readLive(key);
      let total = amount;
      let expiresAt = now() + ttlSeconds * 1000;

      if (entry !== undefined) {
        total = (entry.value as number) + amount;
        expiresAt = entry.expiresAt;
      }

      entries.set(key, { value: total, expiresAt });
      return total;
    },
  };
}
