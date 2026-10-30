/**
 * A small key-value store used for the cache (F3) and the credit counter (F1).
 * Production uses Upstash Redis; tests and local development use memory.
 */
export interface KeyValueStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  /** Adds `amount` (may be negative) and returns the new total. Starts from 0 for a new key. */
  incrementBy(key: string, amount: number, ttlSeconds: number): Promise<number>;
}
