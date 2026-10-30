import type { KeyValueStore } from "@/server/store";

export const SEARCH_TTL_SECONDS = 7 * 24 * 60 * 60;
export const AVAILABILITY_TTL_SECONDS = 24 * 60 * 60;

interface StoredValue<T> {
  value: T;
  storedAt: string;
}

export interface Remembered<T> {
  value: T;
  /** True when the value came from the cache rather than from `load`. */
  cached: boolean;
  /** When the value was originally loaded. Shown to users as "checked … ago". */
  storedAt: string;
}

/**
 * Read-through cache: returns a stored value when there is one, otherwise loads, stores and
 * returns it. Identical requests that arrive while a load is running share that one load, so a
 * burst of the same search costs one provider call.
 */
export function createCache(store: KeyValueStore, now: () => Date = () => new Date()) {
  const loadsInProgress = new Map<string, Promise<Remembered<unknown>>>();

  async function loadAndStore<T>(key: string, ttlSeconds: number, load: () => Promise<T>) {
    const value = await load();
    const storedAt = now().toISOString();
    const stored: StoredValue<T> = { value, storedAt };
    await store.set(key, stored, ttlSeconds);
    return { value, cached: false, storedAt };
  }

  async function remember<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<Remembered<T>> {
    const stored = await store.get<StoredValue<T>>(key);
    if (stored !== null) {
      return { value: stored.value, cached: true, storedAt: stored.storedAt };
    }

    const running = loadsInProgress.get(key);
    if (running !== undefined) {
      return running as Promise<Remembered<T>>;
    }

    const loading = loadAndStore(key, ttlSeconds, load);
    loadsInProgress.set(key, loading);
    try {
      return await loading;
    } finally {
      loadsInProgress.delete(key);
    }
  }

  return { remember };
}

export type Cache = ReturnType<typeof createCache>;
