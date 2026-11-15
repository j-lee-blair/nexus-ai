import type { KeyValueStore } from "@/server/store";

export const SEARCH_TTL_SECONDS = 7 * 24 * 60 * 60;
export const AVAILABILITY_TTL_SECONDS = 24 * 60 * 60;

interface StoredValue<T> {
  value: T;
  // Kept as "storedAt" in the store, so values cached before the rename still read correctly.
  storedAt: string;
}

export interface Remembered<T> {
  value: T;
  /** True when the value came from the cache rather than from `load`. */
  cached: boolean;
  /** When the value was originally loaded. Shown to users as "checked … ago". */
  checkedAt: string;
}

/**
 * Read-through cache: returns a stored value when there is one, otherwise loads, stores and
 * returns it. Identical requests that arrive while a load is running share that one load, so a
 * burst of the same search costs one provider call.
 *
 * The cache only makes answers faster, so a failing store never stops an answer: a failed read
 * counts as "not cached", and a failed write still returns the value that was just paid for.
 */
export function createCache(store: KeyValueStore, now: () => Date = () => new Date()) {
  const loadsInProgress = new Map<string, Promise<Remembered<unknown>>>();

  async function loadAndStore<T>(key: string, ttlSeconds: number, load: () => Promise<T>) {
    const value = await load();
    const storedAt = now().toISOString();
    const stored: StoredValue<T> = { value, storedAt };
    try {
      await store.set(key, stored, ttlSeconds);
    } catch (error) {
      console.error("cache.write_failed", key, error);
    }
    return { value, cached: false, checkedAt: storedAt };
  }

  async function remember<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<Remembered<T>> {
    let stored: StoredValue<T> | null = null;
    try {
      stored = await store.get<StoredValue<T>>(key);
    } catch (error) {
      console.error("cache.read_failed", key, error);
    }
    if (stored !== null) {
      return { value: stored.value, cached: true, checkedAt: stored.storedAt };
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
